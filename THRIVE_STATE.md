# THRIVE — Current State
*Paste this at the start of every new session. Update before ending.*

## Version: v87

## PWA icons + favicon + manifest cleanup (fixes icon/favicon 404s)
- Cause of console 404s: manifest referenced icons/icon-192.png & icon-512.png but there was NO icons/ folder; favicon.ico also missing.
- Generated (Pillow, /tmp/mkicons.py): icons/icon-512.png, icon-192.png, apple-touch-icon.png (180), favicon-32.png, and favicon.ico (16/32/48). Design: full-bleed navy #0f2d6b (maskable-safe), white "T" monogram, small orange #e8520a rising-arrow accent (Thrive growth).
- manifest.json rewritten: theme_color now #0f2d6b (was mismatched orange #e8520a), background #ffffff, icons list has both "any" and "maskable" purposes; FIXED start_url + shortcuts to be RELATIVE ("./index.html…") — were absolute "/" which under GitHub Pages /test/ would open the wrong page when installed.
- index.html head: theme-color aligned to #0f2d6b (was #1a6fdb); added <link rel="icon" favicon.ico> + favicon-32.png (apple-touch links already present).
- NEW FILES to deploy: icons/ folder (4 PNGs) + favicon.ico, plus changed manifest.json + index.html. (app.js/supabase.js unchanged this version.) Hard-refresh; may need to remove & re-add the home-screen install to pick up the new icon.
- Brand note: app primary is navy #0f2d6b (styles.css --primary); accent orange #e8520a. Earlier files had inconsistent theme colors — now unified.
- [VERIFY] No more icon-192/favicon 404s in console; installing to home screen shows the navy T icon; PWA opens to the app (not domain root).
- OPTIONAL cleanup still available: run `alter table organizations add column if not exists subscription_status text default 'active'; notify pgrst,'reload schema';` to silence the harmless subscription_status 400 on load.

## Version: v86

## Root cause of blank map: NO Google Maps API key set (window.GOOGLE_MAPS_KEY = none)
- Console on user's device: `maps loaded: false | key starts: (none)`. So google.maps never loads and there's no key → blank map. The map CODE is fine. Same key gap also disables address autocomplete / Street View / geocoding.
- googleMapsKey DOES sync via cloud profile (supabase.js: saved under profile settings.googleMapsKey ln514, read ln491; loaded to window ln924). So it's missing because it was never entered OR got cleared during the sync-debugging resets (clearSignInKeepData / replaceLocalWithCloud / DS.reset). 
- FIX (user action): Settings → API settings → "Maps API Key" (field #sp-maps-key) → paste key → save → hard-refresh. Needs Maps JavaScript API + Maps Static API + Places API enabled in Google Cloud; if key is referrer-restricted, allow shivanih06.github.io.
- v86 (app.js): dayMapBlock now degrades gracefully when no key — shows "Location captured (lat, lng). Add a Google Maps API key in Settings → API to see this on a map." instead of a blank grey box.
- Also still live in v85: running clock timer (works), map resize robustness.
- Files changed: app.js only. Deploy + hard-refresh. But the MAP only appears once the user enters a valid Maps key.
- [VERIFY] After entering key + refresh: console `maps loaded: true`; day report shows the interactive map. Before key: report shows the friendly "add a key" note (not a blank box).

## Version: v85

## Live running clock timer + blank-map robustness (resize) + map diagnosis pending
- LIVE TIMER (works): clock card now shows a ticking timer while clocked in. fmtClock(ms)→H:MM:SS / M:SS. clockCardHTML active branch renders #clock-live-timer with data-start=clockIn, data-base=today's completed ms; _tickClockTimer() updates it each second; ensureClockTimer() sets a single global setInterval (window._clockTimerWired), called after dash-ai render in renderDashboard. Counts up from clock-in (incl. earlier completed time today); no longer need to clock out to see time.
- BLANK MAP: day-report interactive map showed an empty grey box even for located punches. Added robustness: after creating google.maps.Map + markers, call google.maps.event.trigger(map,'resize') + refit at 300ms & 900ms (dynamic containers often render blank until a resize). If this DOESN'T fix it, it's a Google Cloud API/key issue (Maps JavaScript API / Maps Static API not enabled, billing off, or key referrer restriction) — need the user's console error text "Google Maps JavaScript API error: XXXX". Note: Places autocomplete works, which means maps/api/js loaded, so leaning toward a tiles/billing/referrer issue if resize doesn't help.
- Files changed: app.js only. Deploy + hard-refresh.
- [VERIFY] Clock in → timer ticks live. Open a located day → map renders (if still blank, grab console error code).

## Version: v84

## Interactive embedded map in the day report (replaces static image + external link)
- User wanted to see the clock location IN the app (pan/zoom) without an external Google Maps link.
- The app already loads the full Google Maps JS API (index.html loadGooglePlaces → maps/api/js?...&libraries=places), so google.maps.Map is available — no new API enablement.
- app.js: replaced dayPunchMap() (static img + external links) with: dayMapBlock(e) (renders a `#daymap-<id>` div placeholder + a colored legend: green=Clock-in, red=Clock-out), initDayReportMaps(day) (creates google.maps.Map per punch with green-dot/red-dot markers, fitBounds for two points or center+zoom16 for one; gestureHandling:'greedy', fullscreenControl on). openDayReport calls initDayReportMaps(day) after dynSheet. Fallback: if google.maps not ready yet, paints a Static Maps image into the div as background and retries up to ~5.6s (8×700ms) to upgrade to interactive. No more external "Open on Google Maps" links.
- Files changed: app.js only. Deploy app.js + hard-refresh.
- [VERIFY] Tap a day with a located punch → day report shows a live, draggable Google map with green (in) / red (out) pins; can pan/zoom/fullscreen in-app. Pre-location punches still show "No location recorded".

## Version: v83

## Day-report w/ map (tap a day) + fix owner duplicate card / unlinked login
- User feedback on v82 screenshot: (a) wants to TAP a day → a day report containing the map (not inline maps per row); (b) saw 5 cards incl. a "Matt (owner)" employee AND a separate "Owner (owner)" orphan card — because the owner login wasn't linked to the Matt employee record.
- ROOT of duplicate: window.MY_EMPLOYEE_ID is set by matching Auth.user.email to an employee's email (supabase.js initApp). Owner's Matt employee record email didn't match the login → MY_EMPLOYEE_ID null → myClockIdentity() falls back to id=Auth.userId → punches orphan under the uid (the v82 "Owner" card) instead of Matt.
- FIX (supabase.js): if no email match AND MY_ROLE==='admin', link to the SOLE active employee with role owner/admin (owners.length===1 → me=that). Sets MY_EMPLOYEE_ID. Then relinkOwnerPunches(Auth.userId → me.id) moves existing punches onto the employee — called BOTH at link time AND again AFTER hydrateTimeEntries (cloud copies still carry the uid; re-push fixes them). Idempotent.
- FIX (app.js): clock identity now resolves to the Matt employee → future punches file correctly; orphan card no longer appears once relinked.
- NEW day report (app.js): openDayReport(empId, ds) → dynSheet 'day-report' (z240) listing that person's punches for the day (in→out, duration, day total) with dayPunchMap(e) = larger Google Static Map (green I / red O) + "Clock-in/out on Google Maps" links; "No location recorded" when absent. Day grid cells with hours are now tappable (onclick openDayReport), and each punch row in the week list is tappable (chevron + 📍 pin indicator). Removed the inline per-row maps (moved into the report).
- Files changed: app.js + supabase.js. Deploy BOTH + hard-refresh.
- [VERIFY] After deploy: only ONE Matt card (owner orphan gone, punches moved onto Matt); tapping a day with hours (or a punch row) opens the day report; punches WITH location show the map, old pre-location punches show "No location recorded". New clock-in with setting on → map appears.
- CAVEAT: auto-link assumes a single owner/admin employee. If multiple, owner stays unlinked (no wrong link). Existing 8 test punches are pre-location → no map until a fresh clock-in.

## Version: v82

## Fix: owner/admin clock-ins were invisible (filed under login id, not an employee seat)
- Diagnosis: owner clocked in → entry.empId = their auth user id (454d80db…, = OWNER_UID), which is NOT in the active employees list, so renderTimesheets (which only mapped employees.filter(active)) had no card to show it. Sync/capture/location were all fine (cloud went 6→8, clockGeoOn true, in-week true) — purely a display-grouping gap.
- FIX (app.js renderTimesheets, non-tech branch): before rendering, compute "orphan" puncher ids = entry.empIds with punches this week that aren't an active employee; build pseudo-employee cards for them (name resolved from profile when id===Auth.userId → shown with "(owner)" tag, else "Team member"; grey avatar; not clickable into employee profile). renderEmps = active employees + orphans. Wrapped the map in an IIFE inside the template literal.
- This also robustly covers techs whose employee record email doesn't match their login (their punches would otherwise orphan too → now shown as "Team member").
- Note: time-entry pushes earlier failed twice before working — table had wrong id type (uuid) + missing loc columns; FIXED by drop/recreate with `id text` + loc columns (done in console). 8 entries now in cloud.
- Files changed: app.js only. Deploy app.js + hard-refresh. (supabase.js unchanged since v80.)
- [VERIFY] Team screen now shows an "(owner)" card with your punches; techs clocking in on their own logins show under their employee cards; punches made with location ON show a map pin.
- POSSIBLE FOLLOW-UP: if owner should appear as a named person (not just "(owner)") or be excluded from seat count intentionally — current approach is display-only, consumes no seat.

## Version: v81

## Fix: time_entries missing location columns + "This Week" hid today's punches
- Two bugs surfaced when testing v79/v80 clock locations:
  1. time_entries table existed but was MISSING in_lat/in_lng/out_lat/out_lng (PGRST204 "Could not find the 'in_lat' column"). Cause: table created earlier WITHOUT those columns; migration used `create table if not exists` which won't add columns to an existing table (same class as the jobs.confirmed bug). FIX: migration-time-entries.sql now also runs `alter table time_entries add column if not exists in_lat/in_lng/out_lat/out_lng` after the create. User given inline ALTER to run immediately. After that, push of local entries succeeds.
  2. renderTimesheets week-start `sunday` kept the CURRENT time-of-day, so punches made earlier *today* were filtered out of the "This Week" list (and its maps). FIX (app.js): `sunday.setHours(0,0,0,0)` → anchor at local midnight.
- Reminder for support: the mini maps + punch list live ON the Team screen UNDER each employee's weekly grid — NOT in the employee-name popup (openEmployeeProfile has no map). Punch rows show for admin/manager only; each punch with a location gets a Google Static Maps thumbnail (green I / red O) linking to maps.google.com.
- Old test punches made before v79 have NO location (can't backfill) → show as "no location". Only post-v79 punches with the setting ON carry a map.
- Files changed: app.js (+ migration-time-entries.sql). Deploy app.js (supabase.js unchanged since v80 but fine to redeploy). Run the ALTER (or re-run the updated migration).
- [VERIFY] After ALTER + push: cloud time_entries > 0; clock in fresh as someone → punch appears under their card on Team within ~45s with a map pin.

## Version: v80

## Discreet location requirement — generic launch gate, silent clock capture
- User wants techs REQUIRED to enable location to use the app, WITHOUT revealing that clock-in/out locations are visible to admin. So: reframe from a clock-time prompt to a generic launch-time gate; capture silently thereafter.
- app.js:
  • maybeRequireLocation() — for role tech when clockGeoOn(): checks navigator.permissions geolocation state; if not 'granted', shows showLocationGate(). Removes gate once granted.
  • showLocationGate(state) — full-screen overlay #loc-gate (z 99999), neutral copy "Location required / This app needs location access to work" (NO mention of clock tracking). If state denied → instructions to unblock in site settings; else "Enable location" button → requestLocationGate() → captureClockLoc() (triggers browser prompt); on success removes gate, on fail re-shows denied state.
  • clockIn/clockOut now capture SILENTLY (removed "Getting your location…" toast and the tech "location required" block toasts) — enforcement lives in the launch gate. captureClockLoc timeout 6s, maximumAge 120s (fast cached fix, no visible delay).
  • Gate runs at end of initApp and on visibilitychange/focus (re-gates if a tech revokes mid-session) — wired into startAutoSync's listeners.
  • Admin setting description updated to explain the tech-facing framing (clock tracking not mentioned to techs).
- No new DB/edge changes vs v79. Deploy app.js + supabase.js. (time_entries migration from v79 still required if not yet run.)
- [VERIFY] As a tech with location off + setting on: opening the app shows the generic "Location required" screen; enabling clears it; clocking in/out shows no location wording; admin still sees the punch maps. Admin/manager are not gated.
- ETHICS/LEGAL note given to user: some states/best practice require notifying employees of location tracking → suggested a generic line in employment/onboarding paperwork (not in-app). Not legal advice.

## Version: v79

## Clock-in/out LOCATION on a map + cloud-synced time entries
- User ask: admin/manager sees WHERE a tech clocked in & out, as a mini map per punch in the timesheet. Decisions: mini map per punch (not full-screen); location ALWAYS captured when the setting is on; techs are REQUIRED to allow location to clock in/out.
- Discovery: clock entries (time_entries) were LOCAL-ONLY, so admins couldn't see techs' punches at all. So this feature also adds cloud sync for time entries.
- DB: migration-time-entries.sql → time_entries table (id text PK, org_id, user_id, emp_id, date, clock_in/out timestamptz, type, in_lat/in_lng/out_lat/out_lng, created_at) + org-members RLS + index. RUN THIS ONCE.
- supabase.js: CloudDS._mapTimeEntry/getTimeEntries/saveTimeEntry (upsert). initApp hydrates org setting clock_geo (DS.set) + calls hydrateTimeEntries().
- app.js:
  • Setting: clockGeoOn()/setClockGeo() store DS 'clock_geo' + push to org settings (so all devices agree). Toggle in Settings → "Time Tracking" (admin/manager only).
  • captureClockLoc() → navigator.geolocation.getCurrentPosition (9s timeout, high accuracy) → {lat,lng}|null.
  • clockIn/clockOut now async: when clock_geo on, capture loc; TECHS blocked with a toast if location denied/unavailable; loc stored as inLat/inLng (clockIn) and outLat/outLng (clockOut).
  • saveTimeEntry() now also pushes to cloud (CloudDS.saveTimeEntry, fire-and-forget). hydrateTimeEntries() merges cloud→local (mergeById).
  • renderTimesheets (admin/manager): per-employee weekly grid now followed by this-week WORK punches, each row "⏱ Wed, Jun 25: 9:01 AM → 2:14 PM" + punchMapImg(e) = Google Static Maps thumbnail (green I = in, red O = out) linking to maps.google.com. Shows "no location" note when geo on but none captured.
  • Auto-sync: autoSyncPull also hydrateTimeEntries; _dataSignature includes time entries; rerenderCurrentScreen handles team screen (State.screen==='team').
- Uses window.GOOGLE_MAPS_KEY (already set from profile) for static maps — same key as Street View.
- ⚠️ USER SETUP: (1) run migration-time-entries.sql. (2) deploy app.js + supabase.js. (3) Admin → Settings → Time Tracking → turn "Record clock location" ON. (4) Techs must allow the browser location prompt to clock in.
- [VERIFY] With setting on: tech clocks in on phone (allows location) → admin on another device opens Team → sees that punch with a mini map pin within ~45s (or Pull). Deny location as a tech → clock-in blocked with the required-location toast.
- NOTE: time entries are TEXT ids ('te_…') — fine, time_entries.id is text (not uuid), so no UUID constraint issue.

## Version: v78

## REAL Stripe billing for the $29.99 Reports add-on (was flag-only)
- Reuses the existing create-subscription + stripe-webhook infrastructure (price IDs as Supabase secrets, webhook writes entitlement to organizations).
- edge-function-create-subscription.ts: added `reports: STRIPE_PRICE_REPORTS` to the price map; when tier==='reports' → charge immediately (NO 14-day trial), subscription+session metadata type='reports_addon', success_url `?reports=1`.
- edge-function-stripe-webhook.ts: on checkout.session.completed / customer.subscription.updated|deleted, if metadata.type==='reports_addon' → updateOrg(reports_addon = active?true:false) WITHOUT touching the main plan's subscription_status/plan. Otherwise unchanged (main-plan path).
- migration-reports-addon.sql: `alter table organizations add column if not exists reports_addon boolean default false;` (+ notify pgrst).
- supabase.js: subscription-check select now `subscription_status,reports_addon` and hydrates profile.reportsAddon from billing on load; CloudDS.getReportsAddon() reads the column; initApp tail calls handleReturnFromReports().
- app.js: activateReports() now POSTs create-subscription {tier:'reports'} and redirects to Stripe Checkout (real charge) instead of just setting the flag. handleReturnFromReports() (on ?reports=1) cleans the URL, polls CloudDS.getReportsAddon() up to 6×2s for the webhook to flip it, sets profile.reportsAddon, unlocks + renders. reportsEnabled(p) unchanged (reads p.reportsAddon, now billing-driven).
- ⚠️ USER SETUP (one-time, required for it to charge):
  1) Stripe (TEST mode) → create Product "Thrive Reports", recurring $29.99/mo Price → copy price_id.
  2) Supabase → Edge Functions → Secrets → set STRIPE_PRICE_REPORTS = that price_id.
  3) Run migration-reports-addon.sql in SQL editor.
  4) Redeploy BOTH edge functions (create-subscription, stripe-webhook) with the updated .ts in repo. stripe-webhook must keep "Verify JWT" OFF + STRIPE_WEBHOOK_SECRET set; webhook must listen for checkout.session.completed + customer.subscription.updated + customer.subscription.deleted (already does for main plan).
  5) Deploy app.js + supabase.js. Hard-refresh.
- Files changed: app.js, supabase.js, edge-function-create-subscription.ts, edge-function-stripe-webhook.ts, + new migration-reports-addon.sql.
- [VERIFY] Dashboard Reports teaser → Upgrade → Start Reports → Stripe Checkout (test card 4242…) → returns ?reports=1 → "Activating…" → unlocks within a few seconds (webhook). Cancel in Stripe → next load locks it. Entitlement now survives reinstall/other devices (it's on the org, not a local flag).
- FUTURE: "Manage/Cancel billing" button via a create-portal-session edge fn (Stripe customer portal); currently cancel is done in Stripe dashboard.

## Version: v77

## Auto-sync — devices stay current without tapping "Pull latest" (user-requested)
- New (app.js): autoSyncPull() runs hydrateCloudToLocal()+hydrateJobExtras() then re-renders the current screen ONLY if the data signature changed. Triggers: window 'focus' + document 'visibilitychange'→visible (i.e., when you return to the app/tab — covers switching devices) and a light 45s background poll while the tab is visible. startAutoSync() wires listeners once (window._autoSyncWired guard) + (re)sets the interval; called at end of initApp (supabase.js).
- GUARDS (so it never disrupts): _uiBusy() skips a pull/re-render while a .modal.open / #sched-overlay / #sync-mgr / #reassign-sheet / any [id$="-sheet"]/[id$="-picker"] is open, or while an INPUT/TEXTAREA/SELECT is focused. Also skips if offline (navigator.onLine===false) or not authed/cloud. Merge-based pull (cloud wins by id, local-only kept) so an un-pushed local job is never lost; re-render preserves screen/day via existing render fns.
- _dataSignature() = counts + per-job (id/status/date/time/price/techId/estimate-flag) + per-customer (id/name) so edits from another device are detected; rerenderCurrentScreen() handles dashboard/jobs/customers/invoices.
- Manual "Pull latest from cloud" button stays (still handy). No toast on auto-pulls (silent).
- Files changed: app.js + supabase.js. Deploy BOTH. Hard-refresh.
- [VERIFY] Open app on two devices. Create/edit a job on A → switch to B (or wait ≤45s) → it appears without tapping Pull. Open a form on B → auto-sync pauses until closed (no disruption).
- STILL TODO (optional): true realtime (Supabase websockets) for instant cross-device; pull-to-refresh gesture. Current poll is 45s + on-focus.

## Version: v76

## FIX: "undefined undefined" customer names — getCustomers wasn't mapping rows
- Symptom: synced jobs showed "undefined undefined" for the customer. Cause: CloudDS.getCustomers()/getCustomer() returned RAW Supabase rows (first_name/last_name snake_case) WITHOUT _mapCustomer, while getJobs/getInvoices/getEstimates all map. The app reads firstName/lastName (camelCase) via fullName = c.firstName+' '+c.lastName → undefined. Names were never lost — they're in the cloud (e.g. first_name:"phase", last_name:"3 test"); just not translated on read. The buggy raw pull also overwrote local DS customers with snake_case (cloud-wins merge), so the desktop showed it too.
- FIX (supabase.js): getCustomers → rows.map(this._mapCustomer); getCustomer → _mapCustomer(rows[0]). Now camelCase like the rest.
- Files changed: supabase.js. Deploy (with app.js as usual). Hard-refresh.
- RECOVERY: after deploy, on EACH device tap Sync status → "Pull latest from cloud" (or "Replace this device with cloud") — this re-pulls customers through the now-correct mapper and overwrites the bad snake_case local copies → names display. IMPORTANT: PULL, don't push, from a device currently showing "undefined" (its local customers are snake_case; a push reads firstName=undefined). Not-null first_name constraint largely protects the cloud, but pull-first is the clean path.
- [VERIFY] After deploy + Pull on desktop: 407 Red Hawk job shows "phase 3 test" not "undefined undefined". Phone Pull → same.
- NOTE: this was the last broken link in the sync chain (v68→v76). All 20 jobs + customers now sync with correct names.

## Version: v75

## RECOVERY COMPLETE (20 jobs in cloud) + upsert fix so edits sync
- All 20 desktop jobs now in cloud (CLOUD JOBS NOW: 20). The "fail:23" on the last push were 23505 duplicate-key = records ALREADY uploaded (17 prior + 3 new = 20); NOT data loss.
- ROOT of those 409s: SB.request sent `Prefer: return=representation` only, so POST upserts (on_conflict=id) threw 23505 on conflict instead of UPDATING. Meaning re-saving/editing an existing record never synced. FIX (supabase.js): `Prefer: resolution=merge-duplicates,return=representation` for POST → conflicts now UPDATE. True upsert. Edits sync going forward; re-pushes update instead of erroring.
- FULL SYNC FIX CHAIN (v70→v75) recap: token refresh/restore (v70) · job_extras table (v68) · cloud→local hydration of core entities (v72) · window.Auth/CloudDS exposure — THE big one (v73) · jobs.confirmed column + migration-fix-sync.sql · normalizeLegacyIds for non-UUID ids (v74) · merge-duplicates upsert (v75). All REQUIRE supabase.js deployed (user historically deployed only app.js → why nothing worked).
- Files changed: supabase.js (upsert fix) + app.js (v74 repair tools). Deploy BOTH. Run migration-fix-sync.sql once if not done.
- REMAINING USER STEPS: deploy v75 both files + hard-refresh both devices. Desktop already master (20 in cloud). PHONE: log in junkgeniesfl@gmail.com → Sync status → "Replace this device with cloud" (mirror, don't push). Then test: create a job on one device → other taps "Pull latest from cloud" → appears.
- [VERIFY] Edit an existing job on desktop → no 409 in console, change persists in cloud (re-open Sync, Pull on phone shows the edit). New job auto-syncs.
- STILL TODO (nice-to-have): realtime/auto pull between open devices (currently manual Pull/refresh); pull-to-refresh.

## Version: v74

## Recovery cont'd: missing `confirmed` column + legacy non-UUID ids
- After v73 (window.Auth/CloudDS exposed) the console push RAN. Two data issues surfaced:
  1. jobs table missing `confirmed` column → PGRST204 on every job save. FIX: migration-fix-sync.sql (alter table jobs add confirmed boolean default true; + ensures job_extras table; + notify pgrst reload). After running it, 17 jobs pushed.
  2. Some older records have non-UUID ids (old `prefix_timestamp_random` format, e.g. c_1781937340661_nf5m) → 22P02 invalid uuid. Postgres id/customer_id/job_id are uuid. FIX: normalizeLegacyIds() rewrites legacy-real ids → newUUID() and fixes all refs (job.customerId, invoice.job_id/customer_id, estimate.customerId, job.recurSeriesId) + migrates per-job side-store keys (sched_/discounts_/…/assignees_). Short demo seed ids (c1/j1) left alone (stay local).
- v74 (app.js): added normalizeLegacyIds(), replaceLocalWithCloud()/UI (mirror cloud onto a secondary device, NO merge — avoids dup when two devices both hold legacy copies), fixLegacyIdsUI() (normalize+push). New Sync-panel buttons: "Fix legacy IDs & push" and "Replace this device with cloud" (alongside Push / Pull latest / Sign out & clear).
- IMPORTANT dup-avoidance: do NOT normalize+push from BOTH devices (each would mint different UUIDs for the same logical record → cloud dups). Plan: DESKTOP = master → normalize + push everything. PHONE = secondary → "Replace this device with cloud" (pull-only mirror).
- Files changed: app.js (+ supabase.js from v73 — STILL must deploy supabase.js). Deploy BOTH. Run migration-fix-sync.sql once.
- USER STATE AT THIS POINT: 17 jobs in cloud; running console normalize+push to get the rest (~20). Org 968786f6, use junkgeniesfl@gmail.com.
- [VERIFY] After normalize+push on desktop: CLOUD JOBS NOW ≈20, fail:0. Deploy v73/v74 both files. Phone: Sync status → Replace this device with cloud → sees the 20. New jobs auto-sync.

## Version: v73

## THE ROOT CAUSE of all the sync failures: CloudDS/Auth were never on `window`
- app.js gates EVERY cloud read/write/sync behind `window.CloudDS` and `window.Auth` (34 `window.CloudDS` guards + many `window.Auth`). But in supabase.js both are top-level `const` (const CloudDS=…, const Auth=…), and browser top-level consts are NOT attached to window → `window.CloudDS`/`window.Auth` were `undefined`. So: every cloud WRITE from app.js (saveJobForm, pushJobExtras, pushAllLocalToCloud, hydrateCloudToLocal, hydrateJobExtras) silently no-opped, and the Sync panel's session check (`window.Auth && Auth.token`) always read false → "Valid session: Expired" even with a perfectly valid token. Reads worked because asyncGet*/initApp use BARE `CloudDS`/`Auth`, not window.* — that's why signup/reads/employees worked but job writes never reached cloud (cloud jobs table empty, local piled up). Proven live: console `Auth.signIn` OK + token true, but `pushAllLocalToCloud()` returned null (failed first guard `window.CloudDS`).
- FIX (supabase.js, 2 lines after the CloudDS definition): `window.Auth = Auth; window.CloudDS = CloudDS;`. Now all 34 guards pass → cloud writes, push, hydration, and the Sync panel all work.
- ⚠️ DEPLOY: user's habit is deploying ONLY app.js — which is ALSO why none of the v70–v72 supabase.js fixes ever took effect live. supabase.js MUST be deployed. For v73, deploy BOTH app.js + supabase.js (supabase.js is the critical one). Hard-refresh.
- IMMEDIATE RECOVERY (no wait): in console run `window.CloudDS=CloudDS; window.Auth=Auth;` then the signIn+push block → uploads the 20 stranded jobs now. OR just deploy supabase.js and use Settings→Sync status→Push.
- Account reminder: use junkgeniesfl@gmail.com (admin of org 968786f6). mattcasteel@haulnall.com is NOT a member.
- Files changed: supabase.js (the fix) + app.js (unchanged from v72 but ship together). Deploy BOTH.
- [VERIFY] After deploying supabase.js: open Settings→Sync status → "Valid session" = Yes, "Account (login)" = junkgeniesfl@gmail.com. Tap Push → jobs upload (cloud count >0). Create a job → it now auto-saves to cloud. Phone logs in → Pull latest → sees them.

## Version: v72

## ROOT-CAUSE FIX: cloud→local hydration for core entities (jobs/customers/invoices/estimates)
- DISCOVERY: the app RENDERS from local DS (jobsForDate/getJobs) but initApp only ever hydrated employees + org settings + profile — it NEVER pulled jobs/customers/invoices/estimates DOWN from cloud. So even with auth fixed + data pushed, a 2nd device would still never SEE another device's jobs. This is the actual reason cross-device sync didn't work (the expired-token bug from v70/71 also blocked writes).
- SQL CONFIRMED org 968786f6 (Junk Genies) members = junkgeniesfl@gmail.com (admin) + shivanih06@gmail.com (tech). mattcasteel@haulnall.com is NOT a member → the desktop was logged into the wrong account; its 968786f6 was stale cache. FIX: use junkgeniesfl@gmail.com on BOTH devices.
- NEW (app.js): mergeById(local,cloud) (union by id; cloud wins on conflict; local-only rows KEPT so un-pushed jobs are never wiped) + hydrateCloudToLocal() pulls jobs/customers/invoices/estimates and merges into local DS. Guarded on Auth.token + MY_ORG_ID (won't run on an expired session). Called in initApp (supabase.js) right before hydrateJobExtras.
- Sync panel: added "Pull latest from cloud" button (pullFromCloudUI → hydrateCloudToLocal + hydrateJobExtras + re-render) — manual cross-device refresh without full reload.
- Files changed: app.js + supabase.js. Deploy BOTH. Hard-refresh. (Relies on v68 job_extras SQL already run.)
- USER RECOVERY (give in order): deploy both files → on EACH device: Sync status → "Sign out & clear" → log in TYPING junkgeniesfl@gmail.com (avoid autofill→mattcasteel) → confirm Account(login)=junkgeniesfl + Valid session=Yes → "Push this device's data to cloud" (desktop has 20 jobs, phone 3) → then "Pull latest from cloud" (or refresh) on each → both see the union.
- [VERIFY] After both push + pull: desktop and phone both show all jobs/customers. New job on one device → other taps "Pull latest from cloud" → appears.
- STILL TODO: no realtime/auto pull between two already-open devices (manual "Pull latest" or refresh). Could add pull-to-refresh or Supabase realtime later. mergeById is last-write-wins by id (no timestamp merge).

## Version: v71

## Sync diagnosis contّd: split-identity device + clearer panel + clean reset
- USER'S REAL ISSUE (from screenshots): two auth accounts in play — junkgeniesfl@gmail.com (mobile; SQL-confirmed admin of org 968786f6) AND mattcasteel@haulnall.com (desktop's ACTUAL Auth.user). Desktop header showed junkgeniesfl (stale cached DS 'profile') while Auth.user was mattcasteel → split/mixed local state. BOTH devices' sessions = Expired (no valid token) → nothing syncs, cloud job count unreadable. Likely cause: browser autofilled mattcasteel on the desktop "re-login". Open Q for user (SQL sent): are BOTH emails members of org 968786f6 (same business → just need valid logins) or only one (two businesses → deeper)?
- v71 (app.js only): Sync panel now distinguishes "Account (login)" = Auth.user.email (the truth) vs "Profile shown" = getProfile().email (cached display), shows User ID, and warns when they MISMATCH (stale login). New button "Sign out & clear (keeps your jobs)" → clearSignInKeepData(): removes thrive_token/refresh/user + DS profile/employees/current_employee but KEEPS jobs/customers/invoices/extras, then showLoginScreen — for a clean re-login without losing local data to push. (Replaces the old "Re-login" button.)
- RECOVERY GIVEN TO USER: deploy BOTH app.js + supabase.js for v70 (token-refresh + restore fixes live), then on each device: Sync status → "Sign out & clear" → log in TYPING the chosen email by hand (avoid autofill) → confirm "Account (login)" shows that email + Valid session = Yes → "Push this device's data to cloud". Standardize on ONE email across devices.
- Files changed: app.js ONLY (v71). But v70's supabase.js MUST also be deployed for the auth-refresh root fix. Hard-refresh.
- [VERIFY] Panel shows login vs profile email; mismatch banner appears on the desktop; after clean re-login both match + session Yes; push uploads jobs; other device sees them on refresh.

## Version: v70

## FIX: silent cloud-write failures + auth-expiry; add Sync status/repair (user hit: phone job not on desktop)
- DIAGNOSIS: desktop showed _useCloud=true, correct org, role admin, BUT Auth.token EMPTY and 0 jobs in cloud while 20 jobs local. Cause: when the session token is missing/expired, SB.request fell back to the anon key (`Bearer ${Auth.token || SUPABASE_KEY}`), so writes were RLS-rejected and the saveJob try/catch swallowed the error → jobs stranded locally, cloud `jobs` table empty. The stale "Owner"/"Test Account" header names were just cached local profiles on top of the broken session.
- ROOT FIXES (supabase.js):
  1. SB.request now retries ONCE on 401/403 by calling Auth.refreshToken(localStorage thrive_refresh); if that fails it sets window._authBroken. Handles mid-session token expiry instead of silently degrading to anon.
  2. Auth.restore(): on invalid token + failed refresh it now CLEARS the stale token/user and returns false (→ login screen) instead of letting the app run cloud-mode with no token.
- REPAIR TOOLING (app.js): Settings → Account → "Sync status" (settingsFolder cloud-check → openSyncManager) shows email, cloud mode, valid-session yes/no, business id, local job count, cloud job count (+ any error). Buttons: "Push this device's data to cloud" (pushAllLocalToCloud → uploads customers then jobs+job_extras then estimates+invoices; guarded on Auth.token) and "Re-login" (Auth.signOut — local data is preserved). pushLocalToCloudUI wraps with toasts. Works on phone (no console needed).
- USER RECOVERY STEPS: on the device that HAS the jobs → Settings → Sync status → if "Valid session = Expired", tap Re-login & sign in → reopen Sync status → tap "Push this device's data to cloud". Then other devices hard-refresh.
- Files changed: app.js + supabase.js. Deploy BOTH. Hard-refresh. (No new SQL; still relies on v68 job_extras table.)
- [VERIFY] Sync status panel shows correct counts; after re-login the push uploads local jobs and cloud count matches; second device sees them after refresh.
- STILL TODO (pre-existing): no live/realtime sync between two open devices (needs manual refresh) — could add pull-to-refresh or Supabase realtime later. Also: jobs table was empty, so confirm push succeeds (watch for FK/RLS errors in the toast count).

## Version: v69

## Reassign techs on an existing job + "Select all techs" (user-requested)
- REASSIGN FROM JOB DETAIL: the "Assigned:" row on the job detail now always shows a Reassign/Assign button (even when empty → "No one yet" + Assign). openReassign(jobId) opens a dynSheet team picker (toggle people on/off) → saveReassign writes saveJobAssignees(jobId,ids) (local + cloud extras) AND updates j.techId = first assignee + saveJob/CloudDS.saveJob, then re-renders the detail/dashboard/schedule. Lets you swap a tech who called out without creating a new job. No new job, no SMS.
- SELECT ALL: both the job-form picker and the reassign sheet have a top "Select all techs / Clear all" row showing count (e.g. 2/5). assigneeSelectAll() (form) / reassignSelectAll(jobId) (sheet).
- Refactor: shared buildAssigneePicker(emps, sel, kind, jobId) renders the identical avatar+name+check list for both the form (kind 'form') and the reassign sheet (kind 'reassign'); initialsOf(name) helper. renderAssigneeList now just calls it.
- New fns: buildAssigneePicker, initialsOf, assigneeSelectAll, openReassign, renderReassignSheet, toggleReassign, reassignSelectAll, saveReassign. Reassign sheet uses getEmployees() (local, populated at init) so it works on the detail screen without the form open.
- Files changed: app.js ONLY. Deploy app.js. Hard-refresh. (No SQL; relies on v68 job_extras for cross-device sync of the new assignment.)
- [VERIFY] Open a job → Assigned row → Reassign → toggle people / Select all → Save assignment → chips update on detail + job cards; on another device (post v68 SQL) the new crew shows. New-job form Assigned card also has Select all.

## Version: v68

## CLOUD SYNC for all per-job extras (user-requested) — REQUIRES A SUPABASE MIGRATION
- The per-job side data that was device-local now syncs across devices: sched/recurrence, discounts, tax rate, payments, job cost items, line items, and the multi-assignee list. Stored as ONE jsonb blob per job in a new `job_extras` table (row id = job id, 1:1 with the job).
- **ACTION REQUIRED:** run `migration-job-extras.sql` in the Supabase SQL editor (creates table + index + RLS "org members access job_extras", idempotent). Until it's run, the app still works (local-first) but cloud pushes silently fail and nothing cross-device-syncs.
- supabase.js: CloudDS.getJobExtras() → {jobId:data} for the org; CloudDS.saveJobExtras(jobId,data) upserts (on_conflict=id); deleteJob now also deletes the job_extras row. initApp hydrates extras into local DS after the team loads (so synchronous getters work).
- app.js sync layer (near getJobDiscounts): gatherJobExtras(jobId) (reads the 7 local side-stores), pushJobExtras(jobId) (debounced 600ms upsert, cloud-only), pushJobExtrasNow, hydrateJobExtras(). pushJobExtras hooked into saveJobDiscounts/saveJobTaxRate/saveJobPayments/saveJobCostItems/saveJobLineItems/saveJobAssignees + after the sched_ DS.set in saveJobForm. generateRecurringJobs now also CloudDS.saveJobExtras for each generated child.
- DESIGN: local DS stays the source of truth (getters unchanged & synchronous); saves write local then debounce-push the whole blob; init pulls the blob down. Last-write-wins per job. recurkids_/recursig_ (series bookkeeping) stay local-only by design.
- Files changed: app.js + supabase.js. Deploy BOTH. Plus run the SQL. Hard-refresh.
- [VERIFY] After running SQL: on phone, add a discount + take a payment + assign 2 people + set a custom price on a job → open same account on another device (or reinstall/clear-and-reload) → those all show. Recurring children also carry their extras cross-device.
- NOTE: blob sync is last-write-wins (no field merge); two devices editing the SAME job's extras at once → last save wins. Fine for single-operator/low-contention use.

## Version: v67

## Multiple assignees per job (user-requested)
- A job can now have several people assigned. techId stays = the FIRST assignee (back-compat + the only one cloud-synced via the tech_id column); the full list is stored locally in DS 'assignees_'+jobId. (Cloud-syncing the whole list would need a jobs column / join table — deferred with the other local per-job extras.)
- Helpers: getJobAssignees(jobId) (falls back to [techId]), saveJobAssignees, assigneeNames, jobAssigneeLabel(j) → "Alice, Bob" or "Alice +2".
- FORM UI: the "Assigned To" bubble's single <select id=jf-tech> is hidden via JS and replaced by a tappable team list (loadAssigneePicker/renderAssigneeList/toggleAssignee) — avatar + name + check toggle per active employee. State in window._jobAssignees. Bubble collapsed value shows the names. Wired into new-job (seeds profile.defaultTech), edit-job (getJobAssignees), and estimate→job. index.html UNCHANGED (select kept but hidden) so deploy stays app.js-only.
- SAVE: saveJobForm reads window._jobAssignees → techId=first, then saveJobAssignees(id, list). Recurring children copy the master's assignee list in generateRecurringJobs.
- DISPLAYS updated to show all names: main job card (dashboard/Schedule list), day-schedule sheet card, and a new "Assigned:" chip row on the job detail (under the action bar). Estimates card still shows the single primary (out of scope).
- ROLE SCOPING: scopeJobsToRole now shows a tech any job where they're techId OR in the assignee list, so assigned helpers (not just the primary) see it in "my jobs".
- Files changed: app.js ONLY. Deploy app.js. Hard-refresh.
- [VERIFY] New job → Assigned To → tap 2+ people (check toggles, bubble shows "A, B") → save → job card + detail show both. Edit → both pre-checked. Recurring job → each generated visit carries the same assignees. Tech who's the 2nd assignee sees the job in their list.
- NOTE: solo owner with no employees sees "No team members yet" (assignment lists active employees only). Multi-assignee list is local per device until the queued cloud-sync of per-job extras.

## Version: v66

## Recurrence GENERATOR — creates each repeat as its own standalone job (user-requested)
- Saving a job with recurrence !== 'none' now generates a REAL separate job for every occurrence from the start date through the end date. Each is independent: own date, status 'scheduled', paid:false → needs its OWN payment. Same customer/service/price/address/tech/notes/time as the master. (Master = the first occurrence, on its start date.)
- Functions added (near recurrence helpers): recurNthDate(startISO,freq,n) — computes the nth occurrence from start; monthly preserves the start day-of-month and clamps short months (Jan31→Feb28→Mar31, no drift); generateRecurringJobs(master,opts) — loops n=1..MAX(200), creates child jobs (recurChild:true, recurSeriesId), copies master line items if any, writes each child's sched_ store (recurrence:'none' so children never re-generate), cloud-saves children; clearFutureRecurChildren(seriesId,exceptId) — deletes only PENDING future children (skips paid/done/cancelled) + their side-stores, so regeneration on edit doesn't dupe and preserves history.
- saveJobForm wiring: master tagged recurMaster:true + stable recurSeriesId (reused on edit so no dupes). After save → clearFutureRecurChildren then generateRecurringJobs; toast appends " · N repeat visits through Mon DD". If recurrence switched to 'none' on an existing series → clears its pending children.
- Open-ended ("Never"/no end date) → rolls out ~6 months from start (capped at 200) rather than infinite.
- Only the master sends a booking-confirmation SMS (children don't), so the customer isn't texted N times.
- Children inherit price only (jobPayMath falls back to job price when no line items, per v64), so e.g. a $399 dumpster recurs as $399 each visit, each separately payable.
- Files changed: app.js ONLY. Deploy app.js. Hard-refresh.
- [VERIFY] New job: dumpster $399, Recurrence Weekly, Starts Mon, Ends On date 3 months out → save → toast shows "~13 repeat visits", calendar shows a $399 job every Monday until the end, each opens independently and can take its own payment. Edit the master's price → unpaid future visits update; any already-paid ones stay.
- STILL DEFERRED: edit/delete "this vs all future" controls; weekly multi-weekday + nth-weekday-of-month builder; "ends after N"; cloud-sync of per-job side-stores. A subtle point: editing a master regenerates pending children (intended), but there's no per-occurrence "skip/reschedule one" yet.

## Version: v66

## Recurrence now GENERATES real standalone jobs across the calendar (user-confirmed intent)
- The generator (generateRecurringJobs / clearFutureRecurChildren / recurNthDate) already existed and was already wired into saveJobForm from a prior session, but (a) my v65 on-screen note wrongly said visits weren't auto-created, and (b) it had a cloud-mode duplication bug. Fixed both + hardened.
- BEHAVIOR (confirmed with user): saving a job with recurrence ≠ none creates ONE standalone job per occurrence from the start date through the end date, then stops. The job being edited = occurrence #1 (the start/anchor date); children are the subsequent dates. Each child is a full copy (customer, service, price, address, assigned tech, notes, line items) with its own jobId → its own payment/discounts/costs (those side-stores are NOT copied, so each visit bills fresh). Verified: weekly Mondays for ~3 months → 14 jobs (1 + 13), all Mondays, each its own $399.
  - daily/weekly(+7)/biweekly(+14)/monthly(same day-of-month, clamped to month length). Children get sched_ recurrence:'none' (no infinite recursion).
  - Open-ended (Ends = Never): generates ~6 months ahead, MAX 200. Disclosed on-screen.
- CLOUD DUP BUG FIXED: CloudDS._mapJob doesn't return recurChild/recurSeriesId, so after a Supabase reload the old dedup filter found no children → editing a master DUPLICATED the whole series. Now we keep a LOCAL child-id index `recurkids_<seriesId>` (localStorage, survives cloud reloads); clearFutureRecurChildren unions that index with the field-filter to find/delete pending children. Preserves paid/done/completed/cancelled/didnotgo history.
- ONLY-REGENERATE-ON-CHANGE: added signature `recursig_<seriesId>` = freq|start|end. saveJobForm regenerates only on first setup or when the pattern changes; an ordinary edit (price, notes, tech) leaves the existing series + any per-visit edits intact. Turning recurrence off clears pending future children + wipes sig/index.
- UI: Schedule sheet recurrence note now accurate ("Saving creates a separate job for every date through the end — each is its own visit with its own payment." / open-ended variant). Toast on save: "… · N repeat visits created through <date>".
- Files changed: app.js ONLY. Deploy app.js. Hard-refresh.
- [VERIFY] New $399 dumpster job → Schedule → Weekly, Ends On date 3 months out → Save → toast shows count; open the next several of that weekday on the calendar → each is its own $399 job, Pay is empty until you take payment. Re-open the master, change nothing, Save → NO duplicates. Change end date → series rebuilds to the new end.
- STILL DEFERRED: weekly multi-weekday / nth-weekday-of-month / "ends after N" builders; cloud columns for recur metadata (currently local index only); "edit this vs all future" on a child; deleting a master doesn't cascade-delete the series (each job independent).

## Version: v65

## Recurrence: start day + "ends" control (Never / On date) + plain-English summary (user-requested)
- The Schedule sheet's Recurrence section was just a freq dropdown with no start-day clarity and no end. Added, shown only when recurrence !== 'none':
  - "Starts on" row — tappable, shows weekday+date (this is the job's start date = the recurrence anchor; for weekly/biweekly the weekday comes from it). schedPick('date').
  - "Ends" segmented toggle — Never | On date. schedSetRecurEnd('never'|'date'). Picking "On date" seeds a default end ~1 month out and opens the date picker; end date can't be before the start.
  - "Ends on" row (only when an end date is set) — tappable date, schedPick('recurend').
  - Blue summary card: recurrenceSummary(S) e.g. "Repeats every week on Tuesday, starting Jun 30 — no end date" / "...until Aug 15, 2026" / monthly uses ordinal day ("on the 22nd"). Kept an honest note: future visits aren't auto-added to the calendar yet; the pattern is saved on the job.
- New state Sched.recurEnd (''=never, else ISO). New handler schedSetRecurrence (clears recurEnd when set to none). New picker case 'recurend' (+ hidden #sched-h-recurend in overlay).
- Persistence: jf-recur-end is NOT in index.html — created lazily via ensureRecurEndInput() (appended near #jf-recurrence) so this stays app.js-only. Wired through openSchedule(read)/applySchedule(write)/saveJobForm(read+DS.set recurEnd)/openEditJob load(setV)/new-job reset(clear). DS 'sched_'+jobId now also holds recurEnd.
- Helpers added: ensureRecurEndInput, recurrenceSummary, ordinal.
- Files changed: app.js ONLY. Deploy app.js. Hard-refresh.
- [VERIFY] New job → Schedule → set Recurrence = Weekly → "Starts on" shows the chosen day; tap to change. Ends = On date → picker → summary updates ("…until …"). Switch Ends = Never → summary says "no end date". Save, reopen the job → all of it persists.
- STILL DEFERRED in recurrence: actually GENERATING future visit jobs onto the calendar (still open — needs the earlier Q answered: generate visits vs store pattern). Also not yet: weekly multi-weekday picker / "nth weekday of month" builder / "ends after N occurrences".

## Version: v64

## Bug fixes: money rounding, discount color, + job-cost quantity (user-reported)
- ROOT CAUSE of "$112 instead of $112.50 / losing money": fmtMoney used maximumFractionDigits:0, which DROPPED cents and rounded every dollar amount in the app (12.5→"$13", 112.5→"$113" or "$112" depending on float). Changed fmtMoney to ALWAYS show 2 decimals: `'$'+Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})`. Now $125.00, −$12.50, $112.50 everywhere. (Underlying jobPayMath math was already correct — only the display rounded.)
- DISCOUNTS now RED (were green): renderJobDiscountsCard amount + renderJobPay discount-subtotal and per-line amounts all use var(--red).
- DISCOUNT BASE fallback: jobPayMath + renderJobDiscountsCard now use the job's price when there are NO line items: `items.length ? lineItemTotal(items) : (parseFloat(j.price)||0)`. So flat/custom-priced jobs discount correctly (previously a % discount on a no-line-item job computed off $0).
- JOB COST QUANTITY: cost item shape is now {name, price(each), qty}. Add-cost sheet has a Qty field (default 1) next to "Cost each". Each cost row shows "$X each", a −/＋ qty stepper (changeCostQty, min 1), the line subtotal (each×qty), and trash. jobCostTotal = Σ(price×qty). Missing qty treated as 1 (back-compat with v63 items). Preset quick-add inserts qty 1.
- Files changed: app.js ONLY. Deploy app.js. Hard-refresh.
- [VERIFY] $125 job + 10% "Senior" → discount shows −$12.50 (red), Pay total $112.50. Add garbage bags $1 → set qty 5 with ＋ → row shows $5.00, total cost $5.00.

## Version: v63

## Discounts on job detail + Job cost items + Settings presets (user-requested)
- Both follow the same shape: a card on the job detail + a "quick add from presets / or custom" sheet + a Settings preset manager. All app.js (dynamic overlays via dynSheet/closeDyn at z-index 230, above the detail/pay modals).
- JOB DETAIL now has two new cards (containers #job-discounts + #job-costs added to the openJobDetail template, rendered in its setTimeout, shown for both open & done jobs):
  - DISCOUNTS: renderJobDiscountsCard — lists each discount (label, $/% , computed −amount) with trash; "Add" → openAddDiscount sheet with preset quick-pick chips (getDiscountPresets) + custom (label + $/% toggle reusing setDiscType/_discType + amount). Uses the existing getJobDiscounts/saveJobDiscounts/discountAmount, so discounts flow into jobPayMath → the Pay modal's totals/amount due (unchanged engine).
  - JOB COSTS: renderJobCostsCard — lists name + price rows with trash + a "Total cost" line; "Add" → openAddCost sheet with preset chips (getCostItemPresets) + custom (name + price). Stored per job in DS 'costitems_'+jobId (getJobCostItems/saveJobCostItems). This replaces the old single "your cost" idea — it's a multi-row materials tracker (bags, tarps, supplies). Cost items are internal only (don't affect j.price or customer totals).
- SETTINGS: new "Discounts & Job Costs" folder (settingsFolder → openDiscountsCostsManager) → renderDCManager sheet manages two preset lists: Preset discounts (label/amount/type) and Job cost items (name/price). DS keys 'discount_presets' and 'cost_item_presets'. Presets show as quick-add chips on the job-detail add sheets.
- Functions: dynSheet/closeDyn, getDiscountPresets/saveDiscountPresets, getCostItemPresets/saveCostItemPresets, getJobCostItems/saveJobCostItems, jobCostTotal, renderJobDiscountsCard/openAddDiscount/addDiscountFromDetail/addPresetDiscount/removeDiscountFromDetail, renderJobCostsCard/openAddCost/addCostFromDetail/addPresetCost/removeCostFromDetail, openDiscountsCostsManager/renderDCManager/addDiscountPreset/delDiscountPreset/addCostPreset/delCostPreset.
- Files changed: app.js ONLY. Deploy app.js. Hard-refresh.
- [VERIFY] Settings → Discounts & Job Costs → add a preset discount + a cost item. Open a job → Discounts card → Add → pick the preset or enter custom (amount/percent) → shows −amount; open Pay → total reflects it. Job costs card → Add → preset or custom name+price → total updates. Both persist per job (local).
- NOTE: per-device local (not cloud-synced yet) like other per-job extras.

## STILL QUEUED
1. RECURRENCE BUILDER (full) + "ends" (never/indefinite/on date) — NEXT.
2. MULTIPLE ASSIGNEES.
3. Real Stripe billing for $29.99 Reports add-on; cloud-sync per-job extras (recurrence/arrival/anytime/discounts/payments/costitems); generate recurring visits.

## Version: v62

## Delete-on-detail + Price book item descriptions (user-requested)
- DELETE JOB ON JOB DETAIL: added a red "Delete Job" button at the bottom of #modal-job-detail (openJobDetail template). deleteJobFromDetail(jobId) confirms, calls asyncDeleteJob (cloud-aware, falls back to local), clears the per-job side-stores (sched_/discounts_/taxrate_/payments_/costitems_), closes, toasts, and re-renders dashboard/jobs/estimates.
- PRICE BOOK ITEM DESCRIPTIONS + AUTOFILL: price-book items now carry an optional `description`. Settings → Price book editor (renderPriceBookManager) shows a description input under each item + a description field in the "Add a line item" form; pbCaptureInputs captures pb-desc-<id>; pbAddItem stores description on new items. populatePriceSelect puts the description on each <option> as data-desc. In the job/estimate form, applyPriceFromSelect now autofills #jf-notes with the item's description WHEN notes is empty (won't clobber typed notes) — so picking e.g. "Half load" drops its description into the job notes.
- Files changed: app.js ONLY. Deploy app.js. Hard-refresh.
- [VERIFY] Settings → Price book → add/edit an item, give it a description, Save. New Job → Service & Price → pick that item from the dropdown → its description appears in Private notes (when notes was empty). Open a job → scroll down → Delete Job (confirm) removes it.

## STILL QUEUED (user-requested, not yet built) — running list
1. RECURRENCE BUILDER (full): weekly + which weekday(s); every N weeks starting a chosen day ("every other Tuesday"); monthly by date or nth weekday; PLUS an "ends" option — never/indefinite, on a date (or after N) [Feature 3 from this batch].
2. MULTIPLE ASSIGNEES on a job (techIds array, keep techId=first for back-compat; update displays).
3. DISCOUNTS ON JOB DETAIL: a discount section on the job-detail screen (we already have per-job discounts infra: DS 'discounts_'+jobId, $/% via setDiscType/discountAmount, shown in the Pay modal) + PRESET discounts managed in Settings.
4. JOB COST ITEMS: on job detail, a "Job costs" list of name+price rows (multiple, custom) for materials like garbage bags/tarps/cleaning supplies (DS 'costitems_'+jobId) + PRESET cost items in Settings that show up as quick-adds. (Replaces the single "your cost" concept.)
5. Real Stripe billing for the $29.99 Reports add-on; cloud-sync of per-device per-job extras (recurrence/arrival/anytime/discounts/payments/costitems); generate actual recurring visits.

## Version: v61

## Three refinements (user-requested) — custom price, notes text box, week navigation
- CUSTOM PRICE: the price-book dropdown (#jf-price-select) now ends with a "✏️ Enter custom price…" option. Choosing it reveals #jf-custom-price (number input) — typing sets #jf-price directly via setCustomPrice(). applyPriceFromSelect handles the __custom__ branch (show input + focus) vs a book item (hide input, use option value). reconcilePriceUI() runs in the edit setTimeout so a job whose saved price isn't in the book opens with the custom field shown + pre-filled. Works for jobs AND estimates (same form).
- PRIVATE NOTES: no longer a collapsible bubble — it's now a plain card with the "Private notes" label + an always-visible textarea (#jf-notes, min-height 84px). (jfb-notes-val summary removed; not needed.)
- SCHEDULE SCREEN WEEK NAVIGATION: the Schedule screen's week strip (#jobs-week-strip) now has ‹ / › arrows + a "Jun 22 – 28" range label and pages through weeks. Anchored on State.weekBase (defaults to selectedDay/today). jobsWeekShift(±1) moves a week and re-renders; selectDay now also sets State.weekBase so the strip follows the picked day. (Note: the dashboard itself shows only today's jobs — no 7-day strip there — so this was the Schedule screen the user meant.)
- Files changed: app.js, index.html. DEPLOY BOTH. Hard-refresh.
- [VERIFY] Job/Estimate → Service & Price → dropdown → "Enter custom price…" → type a price → saves. Private notes shows a text box directly. Schedule tab → ‹ › arrows page through weeks; tap a day still works.
- [STILL OWED to user from this batch — next builds] (1) RECURRENCE BUILDER: fully customizable repeat in the schedule sheet — weekly + pick weekday(s), every N weeks starting on a chosen weekday ("every other Tuesday"), monthly by date or nth weekday, with a plain-English summary. (2) MULTIPLE ASSIGNEES: Assigned To should allow picking multiple users (techIds array + keep techId=first for back-compat; update displays).

## Version: v60

## Bubble/card "New Job" layout (user-requested, HCP-style)
- The job form (#modal-job-form) is now a stack of tappable BUBBLE CARDS instead of a long form. Style block added in index.html (.jf-bubble / .jf-bubble-head / .jf-bubble-label / .jf-bubble-val / .jf-caret / .jf-bubble-body). Each card = a header button (icon + label + right-aligned summary value + caret) and a collapsible body.
- Cards in order: Customer (ti-user, open by default), Schedule (ti-calendar — header opens the v58 schedule sheet directly, no collapse), Service & Price (ti-list-details), Address (ti-map-pin), Assigned To (ti-user-check), Private notes (ti-note). Mode toggle (Job/Estimate) stays above the cards; Save/Delete stay below.
- ALL existing input IDs + handlers preserved verbatim inside the card bodies (jf-customer-search/-id/-results, jf-newcust + jf-nc-*, jf-date/-time/-time-end/-end-date/-anytime/-recurrence/-arrival, jf-service + svc-jr/svc-dr, jf-price-group/-price-select/-price, jf-address/-suggestions, jf-tech, jf-notes, jf-status). So saveJobForm, setJobFormMode (still hides #jf-price-group → now the inner Price block, leaving service buttons), the pickers, autocomplete, and estimate mode all work unchanged.
- toggleJobCard(id) toggles `.open` on #jfb-<id>. refreshJobBubbleVals() fills each card's summary value (customer name / "(new)", "Junk Removal · $X", address, assigned tech, truncated notes); Schedule's summary is the existing #jf-schedule-summary .pk-val driven by updateScheduleSummary. setBubbleVal(id,txt) helper.
- Hooks that refresh summaries: selectCustomerFromSearch, selectServiceType, applyPriceFromSelect (added calls), plus oninput/onchange on address/tech/notes/new-customer name, and refreshJobBubbleVals() at the end of both job-form open setTimeouts (new + edit).
- Files changed: app.js, index.html. DEPLOY BOTH. Hard-refresh.
- [VERIFY] + → New Job: cards shown, Customer open. Tap each header to expand. Pick a customer → Customer card shows the name + Address auto-fills its summary. Schedule card → opens the schedule sheet, summary updates. Service & Price → pick service/price → summary shows. Save works; reopen an existing job → summaries pre-filled. Estimate mode hides the Price block but keeps service buttons.
- [NEXT — agreed] Recurrence BUILDER inside the schedule sheet: weekly (every Tuesday / multiple weekdays), "every N weeks", monthly by day-of-month OR nth weekday ("every 2nd Tuesday"), with a human-readable summary. This replaces the current simple recurrence dropdown. (Requirements captured from user.)

## Version: v59

## Removals (user-requested cleanup)
- DASHBOARD: removed the "Quick Actions" section (New Job / Estimates / Add Customer / New Invoice / Messages grid) from #screen-dashboard markup. The Reports teaser is now the last block on the dashboard.
- SCHEDULE SCREEN: removed the "Route — <date>" timeline card. renderJobs now just clears #jobs-route (container left in place, empty) instead of rendering the route list/empty-state.
- TEAM SCREEN: removed the clock in/out hero (#clockin-hero markup deleted; renderTeamScreen no longer builds it — clock in/out lives only on the dashboard now). Also removed the "View Loyalty Rewards" quick-access button. renderTeamScreen is now just: clear #current-employee-banner + renderTimesheets().
- Files changed: app.js, index.html. DEPLOY BOTH. Hard-refresh.
- Note: the Rewards screen itself (renderRewards) and customer loyalty points are untouched — only the team-screen shortcut button was removed.

## Version: v58

## Unified Schedule sheet — one "Schedule" button with date+time+anytime+recurrence+arrival, live timeline on top (user-requested, HCP-style)
- JOB FORM: the separate Date / Arrival From / Arrival To fields were replaced with ONE "Schedule" button (#jf-schedule-summary) that shows a summary like "Wed, Jun 24 · 9:00–11:00 AM" (or "· Anytime"). Hidden inputs kept/added on the form: jf-date, jf-time, jf-time-end (unchanged, still what saveJobForm reads) + NEW jf-end-date, jf-anytime, jf-recurrence, jf-arrival. The old "View Schedule for This Day" peek button (jf-schedule-btn) and the jf-date-display/jf-time-display/jf-time-end-display buttons are gone.
- SCHEDULE SHEET (built dynamically in app.js as #sched-overlay, z-index 205 so the date/time pickers at 210 layer ON TOP; works with app.js alone): Cancel / Schedule / Done header; a week strip (‹ › to change weeks, tap a day to pick the date, dots mark days with jobs); the selected day's long-form label; a LIVE day timeline (schedTimelineHTML) showing that day's other jobs as blue blocks PLUS a green "This job" block for the chosen start–end (the thing the user asked for — see the schedule while scheduling, all in one place); then rows for Start [date][time], End [date][time], an Anytime toggle, Recurrence (Does not repeat/Daily/Weekly/Every 2 weeks/Monthly), and Arrival window (Default/Exact/1–4hr). Done writes everything back to the form hidden inputs + updates the summary; Cancel discards.
- setJobDateTime rewritten to drive #jf-schedule-summary via updateScheduleSummary() (no more per-field display buttons). autoFillEnd now calls updateScheduleSummary.
- Sub-pickers: Start/End time chips call openTimePicker; date chips call openDatePicker — pointed at temp hidden inputs (#sched-h-*) inside the overlay, with callbacks that update the Sched working-copy and re-render. window._inSchedSheet hides the time picker's own mini-timeline while inside the sheet (avoids a double timeline).
- PERSISTENCE: date/start/end save through the existing path (unchanged). Recurrence/arrival/anytime/endDate are stored locally per job in DS 'sched_'+jobId (written right after saveJob in saveJobForm; loaded in openEditJob; reset in openNewJobForCustomer). They are NOT cloud-synced yet (no DB columns) and recurrence does NOT auto-create future visits yet — the sheet notes "Auto-creating future visits is coming soon."
- Files changed: app.js, index.html. DEPLOY BOTH (the Schedule button markup is in index.html). Hard-refresh.
- [VERIFY] New Job → tap Schedule → sheet slides up with week strip + live day timeline (green "This job" block) + Start/End/Anytime/Recurrence/Arrival → change day/time and watch the timeline update → Done → summary button reflects it → Save → reopen the job → Schedule still shows your picks. Pick a time → time wheel opens ON TOP of the sheet, no double timeline.
- [NEXT] Bubble/card New Job layout (Customer / Schedule / Line Items / Job Fields / Job Tags / Private notes / Lead source) — this Schedule button is the first of those bubbles. Also pending: cloud-sync the per-job recurrence/arrival/anytime; actually generate recurring visits; "Select employees" + "Notify customer" inside the sheet.

## Version: v57

## Fix: live day schedule wasn't appearing (self-create the container)
- v56 put the #tp-schedule container in index.html; if only app.js was deployed (or index.html was cached), tpRenderDaySchedule found no container and bailed, so nothing showed.
- tpRenderDaySchedule() now CREATES #tp-schedule on the fly (inserts it into #modal-timepick .modal-sheet before .tp-wheels) when it's missing. So the live day timeline works with app.js alone — no dependence on the index.html change.
- WHERE IT SHOWS: open New Job (date defaults to today) → tap the Start time (or End time) field → the time-wheel modal opens with the day's booked jobs as blocks ABOVE the wheel, plus a green "this job" marker that tracks the wheel. Empty day → an hour grid + "Nothing else booked this day yet."
- Files changed: app.js (index.html already had the container from v56 but is no longer required). DEPLOY app.js. Hard-refresh after deploy.

## Version: v56

## Live day schedule while picking a job time (HCP-style, user-requested)
- When the time picker (#modal-timepick) opens from the job form, a compact day timeline now shows ABOVE the spin wheels so you can see what's already booked while choosing the time (mirrors HCP showing the live schedule above the schedule sheet).
- New markup: #tp-schedule div in #modal-timepick (index.html), before .tp-wheels.
- tpRenderDaySchedule() (app.js): reads #jf-date; renders that day's jobs (excluding the job being edited via State.editingJob, and excluding cancelled/didnotgo) as primary-colored blocks on an hourly grid (default 7AM–7PM, auto-expands to fit earlier/later jobs), 34px/hour, scrollable (max-height 168px). Each block shows time range + customer name. "Nothing else booked this day yet." when empty. Hidden entirely if #jf-date is empty (time picked before date).
- tpUpdateSelMarker() (app.js): a green dashed "this job" marker that reflects the time currently on the wheels and moves live as you scroll. buildWheel's onscroll now also calls tpUpdateSelMarker (single handler, no listener leak). openTimePicker calls tpRenderDaySchedule + an initial tpUpdateSelMarker.
- openTimePicker is only wired to the job form (jf-time / jf-time-end), so the timeline always reflects the job being scheduled. No other callers.
- Files changed: app.js, index.html. DEPLOY both. No migration.
- [VERIFY] New Job → set Date first → tap the Start time → time wheel opens with the day's existing jobs shown above; scroll the wheel and the green "this job" marker slides to the chosen time. Edit an existing job → its own block is excluded. Pick time before setting a date → no timeline (graceful).
- [NEXT, already agreed] Bubble/card "New job" layout (Customer / Schedule / Line Items / Job Fields / Job Tags / Private notes / Lead source as tappable expanding cards), keeping all existing save logic (estimate vs job, customer search, line items, v45 pickers).

## Version: v55

## Reports paywall + clock-in moved to top of dashboard (user-requested, HCP-style)
- REPORTS IS NOW A PAID ADD-ON. reportsEnabled(p) (app.js, near PLANS) = !!p.reportsAddon || plan pro/promax. Starter = locked by default. Price const REPORTS_PRICE = 29.99.
- DASHBOARD REPORTS TEASER: new #dash-reports container at the very bottom of #screen-dashboard (index.html), filled by dashReportsCard() at the end of renderDashboard. Locked → a blurred (filter:blur + 0.55 opacity) fake reports preview (revenue/jobs/close-rate cards + a bar chart) with a centered lock overlay + "Upgrade — $29.99/mo" button. Unlocked → a simple "View your reports" card linking to the reports screen.
- REPORTS SCREEN GATED: renderReports (app.js) now checks reportsEnabled() first. Locked → shows #rpt-paywall (new div at top of #screen-reports in index.html) with the blurred preview + lock overlay, and hides all other .screen-pad children; returns before building real reports. Unlocked → hides #rpt-paywall, restores children, builds reports as before.
- UPGRADE FLOW: openReportsUpgrade() builds a dynamic centered modal overlay (#reports-up-overlay, z-index 240, inline-styled so it doesn't depend on modal classes) showing the $29.99/mo Reports pitch + "Start Reports" / "Maybe later". activateReports() sets p.reportsAddon=true via persistPlan (local + cloud) and re-renders.
  - [HONEST/IMPORTANT] activateReports currently unlocks WITHOUT charging — there is no $29.99 Reports product in Stripe yet. So "Start Reports" just flips the local/cloud flag. Real billing for the add-on still needs a Stripe price + checkout (same pattern as create-subscription). Do NOT treat this as real revenue until wired.
- CLOCK-IN AT TOP OF DASHBOARD FOR EVERYONE: renderDashboard's #dash-ai now renders clockCardHTML(me) for ALL roles (was `isTech && me`). me = myClockIdentity() which is valid for owner/admin too, so the owner sees a clock-in/out card near the top of the dashboard. The AI insight banner only shows if there's no clock identity (rare).
  - Note: the team screen still shows clock UI for employee management (left as-is). If you want the personal clock widget ONLY on the dashboard and removed from the team screen, say so and I'll strip it there.
- Files changed: app.js, index.html. DEPLOY both. No migration, no Edge fn.
- [VERIFY] Dashboard: clock-in/out card at top for owner; scroll to bottom → blurred Reports preview + "Upgrade — $29.99/mo". Tap it → modal → Start Reports → preview unlocks (dashboard shows "View your reports", reports screen now opens fully). Bottom-nav Reports while locked → paywall; while unlocked → real reports.
- [NOT YET DONE — offered as next step] (1) Full HCP-style dashboard section redesign: Open work / Upcoming / Invoices / Jobs / Estimates / Leads cards with "Create First X" empty states. (2) Settings/More screen restructured into YOUR ACCOUNT / YOUR ORGANIZATION / GENERAL sections like the HCP "More" tab. (3) Real Stripe billing for the $29.99 Reports add-on.

## Version: v54

## Housecall-style multi-step signup wizard + GET STARTED checklist (user-requested, with our own twist)
- IMPORTANT: the actual account-creation call is UNCHANGED — submitSignup still calls Auth.signUp(email,password,fullName,company) then initApp(), so provision-org + Stripe trial path is identical. The wizard is purely a nicer front-end collecting info across steps.
- WELCOME LANDING (renderWelcome, app.js): Thrive logo + tagline "all-in-one app for junk & dumpster pros" + [Create an account]→startSignup + [Sign in]→renderLoginPage('signin'). showLoginScreen (supabase.js) now calls renderWelcome (guarded). renderLoginPage restores the gradient bg; its "Sign up free" link now calls startSignup.
- SIGNUP WIZARD (Signup state + renderSignupStep, app.js): progress bar + back/×. Step 'fork' = "Start a business account" vs "Join a team". Business flow steps: profile (first/last/mobile) → industry (grid incl. Junk Removal/Dumpster Rental first) → company size (Owner operator/2-5/6-10/11+) → company name + website → login (email + password with live 8+/uppercase/number checklist) → "Start free trial" = submitSignup. Employee fork → renderEmployeeJoin explains they need an invite link + a Sign in button. Validations per step in suNext.
- submitSignup stashes extras (phone, industry, size, website, name, company) in window._signupExtras AND DS 'pending_signup' (survives the Stripe redirect), then Auth.signUp + initApp.
- GET STARTED CHECKLIST (showOnboarding rewritten + renderGetStarted, app.js): applies the stashed extras to the profile (company/name/phone/industry/companySize/website), clears pending, then shows a checklist: "Choose a plan" (→showSubscribeScreen), progress bar, Create account ✓, and 4 how-to items — Schedule & dispatch jobs / Boost your reviews / Create estimates / Get paid. Each opens openHowTo(key): a walkthrough with numbered written steps + a video placeholder (HOWTOS[key].video URL-ready for real videos later) + "Do it now" deep-link (markHowToDone → action, e.g. openNewJob / openNewEstimate / Pay / Settings). DS 'gs_done' tracks completed items.
- Post-init trigger (supabase.js): showOnboarding now fires when _justProvisioned OR a persisted DS 'pending_signup' exists, so the checklist + profile-extras apply even after the Stripe trial redirect (fresh page load).
- Old saveOnboarding/skipOnboarding left defined but unused (harmless).
- Files changed: app.js, supabase.js. DEPLOY both. No migration.
- [VERIFY in incognito] Logged out → welcome landing → Create an account → fork (business) → profile → industry → size → company → email+password (reqs tick green) → Start free trial → existing plan screen → trial → dashboard → GET STARTED checklist with the company name/phone saved; tap a how-to → steps + "Do it now". Also test "Join a team" fork → invite explanation → Sign in. And existing Sign in still works.
- [FUTURE] Add real walkthrough video URLs to HOWTOS[*].video. Store industry/size to the org in the cloud (currently local profile). Employee self-join via code (currently invite-link based).

## Version: v53

## Take Payment method-picker (+ receipt) and $/% discount toggle (user-requested)
1. TAKE A PAYMENT now opens a method-picker screen instead of an inline record form. Removed the inline pay-pay-form + recordJobPayment. New #modal-take-payment (layered z-index 220 over the pay overview): Amount field (prefilled to amount due) + a 2-col grid of method buttons — Cash, Credit Card, Check, Zelle, Card on File, Payment Link. openTakePayment(jobId) opens it; confirmPayment(method) records {amount,method,date}, marks j.paid when due≤0, cloud-saves job, closes, re-renders overview, then sendPaymentReceipt(jobId,amount,method) texts (sendSMS) + emails (sendEmailJS) the customer a receipt with the amount, method, and remaining balance (best-effort; toasts "Receipt sent" if any channel succeeds). payMethodLabel() maps codes→labels; payment rows in the overview use it.
2. DISCOUNT $/% toggle: discount add form now has a "$ Amount" / "% Percent" segmented toggle (setDiscType + module _discType, reset to 'fixed' on each renderJobPay). Discounts stored as {label,amount,type:'fixed'|'percent'}. discountAmount(d,base) computes fixed = amount, percent = base×amount/100 (base = item subtotal). jobPayMath sums via discountAmount; overview shows "(N%)" next to percent discounts and the computed −$.
- Files changed: app.js, index.html, styles.css (z-index). DEPLOY all three. No migration.
- NOTE: methods are recorded + receipt-sent; actual card CHARGING (Credit Card / Card on File / Payment Link via Stripe) is not wired here — those just record the method for now (Stripe one-off link still available via the Invoice button). Receipts need Twilio SMS / EmailJS configured (already set up) + customer phone/email.
- [VERIFY] Pay → Take a Payment → method screen with amount prefilled to due → tap Cash/Card/Check/Zelle → payment records, due updates (red→green when full), receipt toast. Discounts: +Add → toggle %/$ → enter value → percent discounts scale with the subtotal.

## Version: v52

## Street View of the property in the job detail (user-requested, like Housecall Pro)
- Reuses the existing window.GOOGLE_MAPS_KEY (Settings → Google Maps API Key, already used for Places autocomplete + Geocoding) for the Street View Static API.
- streetViewCard(address): renders a tappable card with a Street View Static image (`maps.googleapis.com/maps/api/streetview?size=640x320&location=<address>&fov=80&pitch=8&key=`) + a "Street View" pill; onclick opens `google.com/maps/search/?api=1&query=<address>` in a new tab (Maps at the property, Street View one tap away). Injected in openJobDetail right after the Job-info card. Returns '' if no address or no key.
- checkStreetView(): async hits the Street View metadata endpoint; if status !== 'OK' (no coverage / unresolved address) it hides the card. <img> onerror also hides on hard failure.
- Files changed: app.js only. DEPLOY app.js. No migration.
- [USER ACTION may be needed] The Google Cloud project for their key must have the "Street View Static API" enabled (Places/Geocoding being enabled doesn't auto-enable it). If the image is blank/hidden, enable that API + ensure key referrer restriction allows the GitHub Pages domain.
- [VERIFY] Open a job whose customer has a real street address → a Street View photo of the property shows under the job info; tapping it opens Google Maps at that address.
- [FUTURE] Same card could be added to the customer profile screen (offered to user).

## Version: v51

## Three standout top buttons + Pay / payment overview page (user-requested)
- Job-detail top action bar redesigned from 2 → 3 big standout buttons (icon-over-label, filled colors): On My Way (blue/--primary), Start Time/Pause (green/orange), and NEW Pay (navy #0b2a5b). On My Way + Start Time disable when job isDone; Pay always enabled.
- Pay → openJobPay(jobId) opens #modal-job-pay (layered over the detail, z-index 210; closeModal returns to the job) → renderJobPay.
- PAYMENT OVERVIEW (renderJobPay + jobPayMath): ITEMS list (read-only, from line items) + SUMMARY card:
  - Item Subtotal = sum(price×qty)
  - Discount Subtotal [+ Add] → inline form (label + $ amount) → addJobDiscount; each discount listed with an x (removeJobDiscount). Stored per-job DS 'discounts_'+jobId.
  - Taxes [+ Add] → inline form (rate %) → applyJobTax; tax = rate% × (itemSubtotal − discounts); shows (rate%) + x to clear. Stored DS 'taxrate_'+jobId.
  - Total = itemSubtotal − discounts + tax
  - Payment Subtotal (paid) [+ Record] → inline form (amount prefilled to amount-due + method cash/card/check/link) → recordJobPayment; each payment listed (date·method, x to remove). Stored DS 'payments_'+jobId.
  - Amount Due = total − paid, shown in a colored banner: RED (--red/--red-lt) if due>0, GREEN (--green/--green-lt) if 0 ("Paid in Full"). Bottom "Take a Payment" button.
  - recordJobPayment marks j.paid when due≤0 and sets j.payment to the method; cloud-saves the job.
- Files changed: app.js, index.html, styles.css (z-index). DEPLOY all three. No migration.
- NOTE: discounts/tax/payments stored per-device (local) like line items — job.paid syncs but the breakdown doesn't yet (future cloud-sync). Taxes are manual per-job rate (no global tax setting yet).
- [VERIFY] Open a job → 3 buttons up top (On My Way / Start Time / Pay) → tap Pay → Overview page lists the job's items, Item Subtotal, then add a discount (+Add), add a tax % (+Add), see Total update; Record a partial payment → Payment Subtotal rises and Amount Due drops (red); pay the rest → Amount Due turns green "Paid in Full".

## Version: v50

## Items = the job price (one thing); Add Item modal; trash per row (user-requested, matches reference screenshot IMG_5248)
- [DECISION] Line items and "job price" are no longer separate. The job total IS the sum of items, applied INSTANTLY on add/remove/qty-change. Removed: the separate "Job Price" input card, "Save Price" button, and "Apply Total to Job Price" button. New syncJobPriceFromItems(jobId) sets j.price = lineItemTotal + cloud-saves; called from submitAddItem / changeLineItemQty / removeLineItem.
- renderLineItems rewritten: "ITEMS" header + "Add Item" button (opens modal); each item row = name + "$price each" (+ description) | − qty + stepper | line subtotal | a TRASH icon (ti-trash, red) to delete that item directly; footer "Job Total" row (= the price). Empty state prompts Add Item.
- NEW Add Item modal (#modal-additem, matches user's reference): From Price Book (optional) quick-pick (aiFromPricebook fills name+price), Item Name, Quantity, Price, Your Cost (optional, for profitability later), Item Description, "Add to Price Book" toggle, "Taxable" toggle, Submit. Uses existing input[type=checkbox].toggle switch style. Opens as a LAYER over the job detail via classList.add('open') (z-index 210, like the pickers) so the detail stays; closeModal closes just it. submitAddItem pushes {serviceId,label,price,qty,cost,description,taxable}, syncs price, optionally appends a {id,service,label,price,category:'Custom Items',cost} to the price book (savePriceBook → cloud org settings), re-renders.
- Line item shape extended: + cost, description, taxable (stored; tax math not yet computed — no tax rate configured; cost feeds future profitability).
- Job detail pricing area now: ITEMS card (#job-line-items) → Payment Method card (jd-payment, auto-saves via new saveJobPayment onchange) → [Invoice | Edit Details] buttons. jd-price input REMOVED. Remaining jd-price reads are guarded (setJobStatus, sendOMW) or in dead saveJobPricing (now null-safe). applyLineItemTotal/addLineItem/autoFillLineItemPrice removed.
- Files changed: app.js, index.html, styles.css (+#modal-additem z-index). DEPLOY all three. No migration. (Line items still per-device/local — cloud-sync of line items is a future item; job.price syncs.)
- [VERIFY] Open a job → ITEMS section with Add Item → tap → Add Item modal (price-book quick pick + manual fields + toggles) → Submit → item appears, Job Total updates instantly (no Apply step). Trash icon on a row deletes it and total updates. "Add to Price Book" toggle saves the item for reuse. No separate Job Price field anymore.

## Version: v49

## Job-detail UX fixes (user-requested)
1. TIMER stops on completion: setJobStatus now, when newStatus is done/cancelled/didnotgo, finalizes the running timer (elapsed += now-startedAt, running=false) + saveJobTimer + clearInterval(_timerInterval). So marking a job complete turns the time tracking off. Completed summary still shows the recorded elapsed.
2. CONVERT estimate → opens the job instantly: convertJobToConfirmed no longer closeModal()s — after setting confirmed=true + bumping customer jobs + re-rendering lists, it calls openJobDetail(jobId) so it reopens immediately as a confirmed job (estimate banner gone), then toasts. Works from both the in-detail "Convert to Job" button and the Estimates-tab "Convert" button.
3. PRICE BOOK / LINE ITEMS now live IN the job detail (no more "Edit Job Details" to reach pricing): root cause was renderLineItems writes into #job-line-items which was MISSING from the openJobDetail template, so the whole line-item UI (price-book dropdown li-service grouped by category, add/qty/remove, "Apply Total to Job Price") never rendered. FIX: added a `<div id="job-line-items"></div>` card in the detail's pricing area (rendered by the existing `if(!isDone) renderLineItems(jobId)` in the openJobDetail setTimeout). Restructured pricing into: line-items card (price book dropdown) → "JOB PRICE" card (jd-price + payment) → Save Price / Invoice → relabeled the old button to "Edit Date, Time & Customer" (it's only for scheduling fields now). applyLineItemTotal made cloud-aware.
- Files changed: app.js only. DEPLOY app.js. No migration.
- [VERIFY] Start a job timer → Mark Complete → timer is stopped (not still counting). Open an estimate → Convert to Job → it immediately reopens as a normal job detail. In any open (not-done) job → the price book dropdown + Add Line Item are right there in the detail; pick price-book items, add them, "Apply Total to Job Price" fills Job Price — no need to open Edit.

## Version: v48

## Customer search filter fix (user-reported: unrelated customers showed for name searches)
- BUG: searchCustomerDropdown matched name OR phone OR email, and the phone check was `phone.includes(query.replace(/\D/g,''))`. For a letters-only query (e.g. "randy") the digit string was "" and `phone.includes("")` is true for EVERY customer → all customers showed even with no name match.
- FIX: phone now only matches when the typed query contains ≥3 digits: `(qDigits.length >= 3 && phone.includes(qDigits))`. Email guarded against empty. So typing a name only matches names: "randy" with no Randy → empty list → just "Add new customer"; "randy" with a Randy Johnson → shows Randy Johnson + the "Add … as new customer" row beneath.
- Files changed: app.js only. DEPLOY app.js. No migration.
- [VERIFY] Type a name not in DB → no customer rows, only Add-new. Type a name that partially matches one customer → only that customer + Add-new. Type 3+ digits of a phone → phone search still works.

## Version: v47

## Inline customer creation always available + side-by-side same-hour jobs (user-requested)
1. ADD-NEW CUSTOMER always offered: searchCustomerDropdown previously only showed "Add as new customer" when there were ZERO matches, so if a typed name partially matched an existing customer the user was stuck picking and couldn't create a new person. FIX: an "Add \"<typed>\" as new customer" row (onmousedown→startInlineNewCustomer) is now appended to the dropdown in BOTH cases — below the matches when there are matches, and as the sole action when there are none. So you can always either pick an existing customer or create one on-site. Inline panel (#jf-newcust) + commitInlineNewCustomer (creates customer cloud+local before the job on save via the '__new__' sentinel) + "Pick existing" toggle (cancelInlineNewCustomer→resetInlineCust re-enables search) all already wired.
2. SIDE-BY-SIDE same-hour jobs on the Schedule: renderJobs hour slot previously stacked each job as its own full-width row. Now: 1 job in an hour → single full-width bar (as before); 2+ jobs in the same hour → the time column shows the hour once and the job bars render in a horizontal flex (each flex:1; min-width:0, truncated, with its specific time shown small inside the card). barHtml(j,compact) helper added inside renderJobs.
- Files changed: app.js only. No migration, no html/css/supabase change. DEPLOY app.js.
- [VERIFY] New job → type a name that partially matches someone → dropdown shows the match(es) AND an "Add … as new customer" row → tap it → fill phone/email → save → new customer + job created. Book 2-3 jobs in the same hour on one day → they appear side by side on the Schedule, not stacked.

## Version: v46

## Scheduling bug fixes (user-reported)
1. CUSTOMER SEARCH not finding existing customers (forced create-new): the customers SCREEN reads local getCustomers() but the job-form search (searchCustomerDropdown) read only window._custCache (cloud), and `_custCache || getCustomers()` never fell back when cache was an empty array. FIX: searchCustomerDropdown now searches a DEDUPED MERGE of cloud (_custCache) + local (getCustomers) by id, so cloud-only, local-only, or both all appear. selectCustomerFromSearch already falls back to getCustomer (local), so selecting any of them works + saveJobForm resolves the id.
2. NEW JOB/ESTIMATE not showing on schedule: TIMEZONE bug. State.selectedDay + dashboard `today` + week-strip day cells used new Date().toISOString().slice(0,10) (UTC) while the new pickers + job save use LOCAL dates (toISO). In the evening (FL = UTC-4/5) UTC rolled to the next day, so selectedDay ≠ the job's local date → job invisible. FIX: replaced all current-date computations with toISO(new Date()) (local) and week-strip ds with toISO(d). ALSO saveJobForm now sets State.selectedDay = date after saving, so the schedule snaps to the new job's day. (toISO is a hoisted top-level fn, safe to use in State literal.)
3. Bottom-nav label "Jobs" → "Schedule" (index.html nav-jobs span). Screen title was already "Schedule".
4. TIME WHEEL: selected time was hidden because the .tp-band highlight (positioned, z-index 0) painted ABOVE the non-positioned columns. FIX: .tp-col now position:relative; z-index:1 so numbers paint on top of the band (band stays as the highlight behind them).
- Files changed: app.js, index.html, styles.css. No migration, no supabase.js. DEPLOY all three.
- [VERIFY] Type an existing customer's name in a new job → they appear in the dropdown (no more forced new-customer). Create a job/estimate for today → it appears on the Schedule immediately (schedule jumps to that day). Bottom nav reads "Schedule". Open the time wheel → the centered (selected) hour/min/AM-PM are clearly visible inside the highlight band.

## Version: v45

## Modern date + time pickers (design polish — matching user's CRM reference screenshots)
- [USER REQUEST] Provided 5 reference screenshots wanting: a CALENDAR date picker (image 3), a SPIN-WHEEL time picker you scroll (image 4), and more organized job-detail sections (image 5: Items/Payments/Summary/Photos & Videos/More cards w/ Lead Source/Job Type/Job Tags dropdowns). Images 1-2 are current Thrive.
- [DECISION] Keep hidden jf-date/jf-time/jf-time-end values (saveJobForm reads them unchanged) and replace the VISIBLE inputs with tap-to-open modern picker modals. Save path untouched.
- THIS BUILD = the two pickers (calendar + spin wheel). Job-detail card reorganization + wiring Job Setup lists (Lead Source/Job Type/Job Tags) into the job = NEXT build (v46).
- styles.css: .picker-btn (input-styled button w/ icon + .pk-val span), .dp-* calendar grid, .tp-* spin wheel (itemH=40, col 200 tall, pad 80, center band top 80, band width 240 = 3×76 + 2×6 gap). #modal-datepick/#modal-timepick z-index 210 (layer above the open form).
- index.html: modal-datepick (#dp-body, Apply→applyDatePicker) + modal-timepick (.tp-wheels w/ #tp-hours/#tp-mins/#tp-period + .tp-band, Apply→applyTimePicker) after modal-send-quote. Job form Date input → button #jf-date-display onclick openDatePicker('jf-date','jf-date-display',onJobDateChange) + hidden #jf-date. Both time blocks (old jf-time-hour/jf-time-end-hour selects + AM/PM toggles) REMOVED → buttons #jf-time-display openTimePicker('jf-time',…,autoFillEnd) + #jf-time-end-display openTimePicker('jf-time-end',…) + hidden #jf-time/#jf-time-end. Picker X buttons use onclick=closeModal(id) NOT data-close (data-close = closeAllModals would kill the form underneath).
- app.js (block before setJobFormMode): toISO, fmtDateShort, setPkVal; DP{} + openDatePicker/dpNav/dpSelect/renderCalendar/applyDatePicker; TP{} + TP_H=40 + openTimePicker/buildWheel/scrollWheelTo/highlightWheel/readWheel/applyTimePicker; setJobDateTime(date,start,end) sets hidden+display together; autoFillEnd() (start + arrivalWindow, rounded). Pickers OPEN via classList.add('open') (NOT openModal, which calls closeAllModals) so they layer over the form; CLOSE via closeModal (single).
- openNewJobForCustomer + openEditJob rewired: use setJobDateTime + autoFillEnd instead of old jf-date.value / populateTimeSelects / autoFillEndTime. Old time fns (populateTimeSelects/buildTimeValue/setTimePeriod/autoFillEndTime/populateHourSelect/updatePeriodButtons + TimePicker obj) now DEAD/unreachable (only referenced by each other + dead convertEstimateToJob) — left in place, harmless.
- Files changed: app.js, index.html, styles.css. NO migration, NO supabase.js change. DEPLOY: app.js + index.html + styles.css.
- [VERIFY] Open + → Job (or Estimate). Tap Date → calendar modal appears OVER the form, ‹ › month nav, today outlined, tap a day → highlights, Apply → button shows "Mon, Jun 23". Tap Arrival From → spin wheel (hours 1-12 / 00·15·30·45 / AM·PM), scroll to choose, Apply → shows "9:00 AM" + Arrival To auto-fills (+arrival window). Save → job lands on schedule at the chosen time. Edit an existing job → pickers pre-fill its date/time. Closing a picker (X) keeps the form open.
- [NEXT v46] Reorganize job detail into sectioned cards (Items / Payments / Summary / Photos & Videos / More) and WIRE Job Setup lists (job_types→Job Type, job_tags→Job Tags, lead_sources→Lead Source) into the job form + detail as dropdowns (image 5). job_costs feed profitability later.

## Version: v44

## Estimate = an UNCONFIRMED JOB (full job functionality) — replaces v43 separate-estimate approach
- [DECISION] An estimate is no longer a separate entity. It's a JOB with confirmed=false. It inherits the ENTIRE job detail screen (On My Way, timer, status, pricing/line items, invoice, photos) for free. confirmed=true = normal job.
- MIGRATION migration-job-confirmed.sql: `alter table jobs add column if not exists confirmed boolean default true;` (run in Supabase SQL editor). CloudDS.saveJob row + _mapJob now include confirmed (defaults true when column/row missing).
- Creation: saveJobForm sets confirmed = (jobFormMode !== 'estimate'); editing keeps existing. Estimate (unconfirmed) does NOT bump customer job count or send booking confirmation; confirmed job does. Old estimate-entity branch removed.
- Schedule (renderJobs): unconfirmed jobs render in the SAME job list with a purple dashed ESTIMATE badge, open openJobDetail. Removed all estimate-entity cards + estimatesForSchedule usage + day-chip estimate dot.
- Dashboard: todayJobs filtered to confirmed only (estimates don't inflate Jobs Today / revenue). Estimates appear on Jobs schedule + Estimates tab only.
- Job detail (openJobDetail): when confirmed===false, shows a purple "Estimate — not yet a confirmed job" banner with [Send Quote] + [Convert to Job]. Everything else (OMW, status incl. 'didnotgo' = "Did Not Go Through" close-out, pricing, invoice) already works for it.
- convertJobToConfirmed(jobId): sets confirmed=true (resets didnotgo/cancelled→scheduled), bumps customer jobs, cloud-saves. openSendQuote(jobId)/sendQuote() now operate on a JOB: set price, cloud-save, send estimate template SMS/email (price + valid-until); stays unconfirmed until converted.
- Estimates tab (renderEstimates): now lists UNCONFIRMED JOBS (filters: all/pending/quoted/lost), cards open openJobDetail with Send Quote + Convert quick buttons. Stats: Open Estimates / Total. Old estStatusPill/getEstimates/saveEstimate/openEstimateDetail/convertEstimateToJob/estimatesForSchedule are now DEAD/unreachable (left in place, harmless).
- CLOUD LIFECYCLE FIX (finishing v41's migration): setJobStatus, saveJobPricing, auto-invoice-on-complete (now newUUID + CloudDS.saveInvoice), cash-points customer update — all now cloud dual-write. So status changes / "did not get" / pricing / completion invoices now persist + sync (were local-only).
- Price book dropdown (populatePriceSelect): now loads the FULL price book grouped by category (was filtered to Junk Removal/Dumpster Rental which no longer matches the Residential/Commercial + tags model). The job Price field = your whole price book.
- Files changed: app.js, supabase.js + new migration-job-confirmed.sql. (index.html/styles.css unchanged since v43 — deploy those too if you skipped v42/v43.)
- DEPLOY: run migration-job-confirmed.sql; deploy app.js + supabase.js (+ index.html, styles.css if not already on v43).
- [VERIFY] + → Estimate → schedule visit → shows on Jobs schedule as dashed ESTIMATE → tap → full job detail with On My Way + Send Quote + Convert to Job → Convert → becomes normal job (badge gone, counts as job). Also "Did Not Go Through" status closes it as lost (shows in Estimates → Lost). Job Price field shows full price book.
- [FUTURE] Old estimate dead code can be deleted later. Configurable close-out reasons (won/lost reason list in Settings) not yet added — uses the built-in 'didnotgo' status for now. Test SMS/two-way + per-client numbers still future.

## Version: v43

## Unified Job/Estimate form + Estimate = scheduled visit (quote later)
- [DECISION] An estimate is the SAME act as a job — schedule a visit to an address. Saving as Estimate just SCHEDULES THE VISIT (no price, nothing sent). The quote is a separate later step. (User chose: "Always just schedule the visit — quote later.")
- One shared form (modal-job-form) with a Job/Estimate toggle (#jf-mode-toggle: #jf-mode-job/#jf-mode-est) + hint (#jf-est-hint). setJobFormMode('job'|'estimate') toggles: hides price group (#jf-price-group) in estimate mode, swaps title + save-btn label (#jf-save-btn "Save Job" / "Schedule Visit"), hides delete (#jf-delete-btn) unless editing a job, styles the toggle buttons. State.jobFormMode tracks it.
- openNewJobForCustomer(custId, mode='job') applies the mode + shows toggle. openNewJob → mode 'job'. openNewEstimate → now just openNewJobForCustomer(null,'estimate') (old modal-new-estimate + saveEstimate() are now DEAD/unused but left in place). openEditJob + convertEstimateToJob hide the toggle and force 'job' mode. FAB Estimate → openNewEstimate → unified form.
- saveJobForm estimate branch: builds estimate {newUUID, customerId, date, time, timeEnd, validDays 30, service, address, price 0, notes, techId, status:'scheduled'} → saveEstimateData + CloudDS.saveEstimate (cloud dual-write). No send. Inline new-customer ('__new__') works in estimate mode too.
- Estimate lifecycle now: scheduled (visit booked) → sent (quoted) → approved/declined → converted. estStatusPill: scheduled='Visit Booked', sent='Quoted'. estimatesForSchedule already shows scheduled/sent/approved on the Jobs schedule (dashed purple ESTIMATE card; price shows only if set) — so estimate visits appear on the schedule with NO extra work.
- QUOTE-LATER step: new #modal-send-quote (sq-price, sq-valid). openSendQuote(estId) + sendQuote() set price/validDays, status→'sent', cloud-save, then send the estimate template SMS/email (reuses getTemplate/msgVars/fillTemplate/sendSMS/sendEmailJS; fetches customer from cache→local→cloud). "Send Quote" button shows on estimate list card + detail when status==='scheduled'. Detail total block shows "Not sent yet" until quoted. resend shows only when priced ("Resend Quote").
- Files changed: app.js, index.html. No schema (estimates table reused; status is free text). Deploy: app.js, index.html (+ carries v41/v42 — deploy app.js, index.html, styles.css, supabase.js for a clean full set).
- [VERIFY] FAB → Estimate → form looks identical to Job (no price field) → schedule visit → appears on Jobs schedule as ESTIMATE → open it → Send Quote (price+valid) → customer gets quote → Approve → Convert to Job. Also Job mode unchanged.
- [NOT DONE/FUTURE] Dashboard "today" list doesn't show estimate visits (Jobs schedule does). Old ef- estimate form/saveEstimate dead code could be removed later. Editing an existing estimate visit's schedule (only quote/approve/convert exist).

## Version: v42

## Floating "+" Add button (global speed-dial)
- Sticky circular + button bottom-right (above bottom-nav), opens an "Add new" speed-dial menu. Files: index.html (markup after #bottom-nav: #fab-add button, #fab-menu, #fab-backdrop), styles.css (#fab-add/#fab-backdrop/.fab-menu/.fab-item/.fab-ic/.fab-tag; positioned right:max(16px,calc(50% - 199px)) to hug the 430px column's right edge; z-index 79-81, below modals @200+), app.js (toggleFab/closeFab/fabAction), supabase.js (showApp shows #fab-add, showLogin hides it + closeFab — starts display:none to avoid login flash).
- Menu items: LIVE → Job (openNewJob), Estimate (openNewEstimate), Client (openEditCustomer(null)), Invoice (→ invoices screen; invoices are job-derived so no standalone create yet). COMING SOON (greyed + "Soon" tag, toast on tap) → Event, Lead, Message, Call. Message/Call are the future two-way-SMS + in-app-calling vision (Twilio; per-client tracking numbers for lead-source attribution) — not built.
- No schema. Deploy: app.js, index.html, styles.css, supabase.js.

## [PARKED — NEXT BUILD] Unify Add Job + Add Estimate into ONE form
- [USER INTENT] A job and an on-site estimate are the SAME act — schedule a visit to an address at a time. Sometimes price is known → book as Job; sometimes go look first → Estimate visit, quote AFTER. Want the add-estimate screen to be the SAME setup as add-job (one form, a Job/Estimate toggle; FAB Job/Estimate both open it pre-set).
- [KEY DECISION TO RESOLVE before building] Current estimate flow SENDS a price to the customer immediately on save (estimate template SMS/email). But user's real flow = estimate is a scheduled VISIT, often WITHOUT a price yet (quote produced after seeing the job). So unified "Estimate" likely should: schedule the visit now, NOT send a price; then later add the quote + send. Confirm: when saving as Estimate, (a) just schedule the visit (no price/send) and quote later, or (b) keep send-price-now when a price is entered, else just schedule. Recommended: (b) — if a price is entered, send the quote; if not, just put the visit on the schedule and quote later.
- Approach when building: add Job/Estimate toggle + "Valid for" field to the existing JOB form; saveJobForm branches: estimate-mode → create estimate (reuse cloud-correct saveEstimate guts) else job. Route openNewEstimate + FAB 'estimate' to the unified form. Both save paths are already cloud-correct (v41).

## Version: v41

## Cloud-save fix for customers/jobs/estimates + inline "add customer" on job/estimate forms
- [IMPORTANT FIX] Discovered the job/customer/estimate FORMS were still saving local-only (newId + DS.save), and the in-form customer search read local getCustomers() — leftover from the multi-tenant migration (only the employee form was done right). Meant new customers/jobs/estimates didn't sync cross-device or to teammates in the cloud app. Now fixed to follow the employee pattern.
- saveCustomerForm (now async), saveJobForm, saveEstimate: new records use newUUID() (cloud id columns are uuid); dual-write = local mirror (saveCustomer/saveJob/saveEstimateData) + `if (_useCloud && CloudDS) await CloudDS.saveX()` (try/catch, warn). Editing keeps existing id. Note: editing a legacy local-only 'c_/j_' record in cloud mode will fail the cloud upsert (non-uuid) — caught/warned; those are device-local legacy rows only.
- In-form customer search now reads a cloud cache: refreshCustCache() sets window._custCache = await asyncGetCustomers(); called in openNewJobForCustomer/openEditJob/openNewEstimate setTimeouts. searchCustomerDropdown + selectCustomerFromSearch read _custCache (fallback getCustomers()). selectCustomerFromSearch also fixed to fill the correct form's address (prefix-based, was always grabbing jf-address).
- INLINE ADD CUSTOMER: searchCustomerDropdown "no results" → "Add as new customer" → startInlineNewCustomer(inputId). Reveals inline panel (#jf-newcust / #ef-newcust in index.html) with first/last/phone/email (address comes from the job/service address field). Hidden customer-id set to sentinel '__new__'. On save, saveJobForm/saveEstimate detect '__new__' → await commitInlineNewCustomer(prefix,address) (creates customer w/ newUUID, cloud+local, unshifts into _custCache, returns id) BEFORE saving the job/estimate (FK-safe: customer in cloud first). Helpers: startInlineNewCustomer, cancelInlineNewCustomer ("Pick existing"), resetInlineCust(prefix), commitInlineNewCustomer. resetInlineCust called on every job/estimate form open + convertEstimateToJob.
- Files changed: app.js, index.html. No schema/migration (uses existing customers/jobs/estimates tables; org_id via BEFORE-INSERT trigger). ALSO INCLUDES the v40 job-types default change (Residential/Commercial; services in tags) — now shipped here.
- [VERIFY AFTER DEPLOY] Create a job, pick "Add as new customer", fill name → save → confirm customer + job appear, ideally on a SECOND device/browser logged into same org (true cloud sync test). Legacy note: device with old local data may still show stale local customers in search until cleared; test cleanest in fresh incognito.
- [STILL LOCAL-ONLY / FUTURE] Other create/save paths not audited this round (invoices created via job completion, messages, time entries). Spot-check invoice + payment flows sync to cloud; time entries still per-device (parked).

## Version: v40 (built last turn; rolled forward into v41 — deploy v41)

## [PENDING NEXT ZIP] Job types default changed to Residential / Commercial
- JOB_SETUP_DEFAULTS updated: job_types ['Residential','Commercial'] (was Junk Removal/Dumpster Rental); services moved into job_tags ['Junk Removal','Dumpster Rental','Repeat Customer','Same-Day']. [DECISION] Job Type = customer segment; Job Tags = services + other labels. Only affects NEW orgs; existing orgs edit via Job Setup folder. Change is in working app.js but NOT yet in a shipped zip — bundle with next build.

## [PARKED] Recurring jobs + recurring billing (revisit later)
- Two layers: (1) recurring JOBS = scheduling auto-repeat, buildable now, no Stripe; (2) recurring BILLING = charging. RECOMMENDED job mechanic: auto-create next occurrence on completion + show "next visit: [date]" marker on schedule (no phantom calendar clutter).
- Billing fork: interim = auto-generate invoice each cycle + auto-text payment link (works today, money → Thrive's Stripe). True auto-charge (card on file, hands-off) needs Stripe Connect so money lands in the BUSINESS's bank + Thrive platform fee — same Connect project already parked; do it together.

## Settings restructure (everything-in-folders) + Job Setup folder
- [DECISION] Dropped the "Junk & Dumpster Pack" idea. Junk/dumpster specifics are now BASE + configurable. Packs (e.g. dumpster TRACKING) come later. Job costs (dump fee, tonnage) are base, not a pack.
- Settings page is now a pure list of clickable FOLDER cards — nothing editable directly on the page. settingsFolder(icon,bg,color,title,sub,onclick) helper renders each card (icon tile + title + chevron). Folders: Profile, Business, Job Setup, Price Book, Communication, Scheduling/Preferences, APIs, Plan & Billing. Preview Employee View + Test + Reset stay as action buttons (not data entry).
- Profile / Business / Preferences converted to folder cards each with own manager modal + save: openProfileManager/saveProfileManager (modal-profile, personal/per-user: name/phone/email), openBusinessManager/saveBusinessManager (modal-business, company-wide via pushBusinessToCloud: company/review link), openPrefsManager/savePrefsManager (modal-prefs, company-wide: tog-sms/tog-inv/tog-rew + scheduling sp-arrival-window/sp-default-tech). Old monolithic saveSettings no longer the entry point — each folder saves itself.
- NEW Job Setup folder: openJobSetupManager/renderJobSetupManager (modal-jobsetup, #jobsetup-body). JOB_SETUP_DEFAULTS = job_types[Junk Removal,Dumpster Rental], job_tags[Repeat Customer,Commercial,Same-Day], lead_sources[Google,Referral,Repeat Customer,Yard Sign,Facebook], job_costs[Dump Fee,Tonnage,Fuel Surcharge]. Helpers getJobSetupList(key)/saveJobSetupList(key,arr)/jobSetupAdd(key)/jobSetupDel(key,idx)/jsSection(key,title,sub). All four are simple add/delete label lists (job_costs are labels for now — $ amounts + job-form wiring come next build).
- Cloud sync company-wide via org settings (organizations.settings jsonb, no migration): saveJobSetupList pushes patch via CloudDS.saveOrgSettings (admin-guarded); supabase.js initApp load block applies os.job_types/job_tags/lead_sources/job_costs (+ existing price_book/msg_templates/business) into DS before render.
- NOTE: legacy getLeadSources() (DEFAULT_LEAD_SOURCES + customLeadSources) still exists separately; both read DS('lead_sources') so they're compatible. Reconcile when wiring lead source into the job form.
- Files changed: app.js, supabase.js, index.html (4 new modals). No migration (reuses organizations.settings).
- [NEXT BUILD] Wire job_types/tags/lead_sources/job_costs into the New Job + Estimate forms (replace hardcoded Junk Removal/Dumpster Rental job-type options with getJobSetupList('job_types'); add tag + lead-source pickers; job_costs feed profitability/invoicing, likely gaining $ amounts then).

## Version: v39

## Disabled demo-data seeding (new accounts start EMPTY)
- seedData() (demo customers/jobs/invoices, IDs c1/j1/inv1, gated by DS('seeded')) and seedEmployees() (demo team, DS('emp_seeded')) both now early-return. Real cloud signups must start blank — no phantom demo job on the dashboard.
- NOTE: a device that ALREADY ran the seed keeps the demo data in its localStorage until cleared (test in a fresh incognito window to verify). Genuinely new customers on fresh devices get empty accounts.
- File: app.js.

## SUBSCRIPTION/SIGNUP STATUS: self-serve signup + 14-day trial + auto-activation WORKING (confirmed by user). Required Supabase Auth "Confirm email" OFF (otherwise new signup has no session → provision-org 401 → falls back to tech). provision-org deployed. create-subscription + stripe-webhook deployed (webhook Verify JWT OFF, STRIPE_WEBHOOK_SECRET set). Prices live as STRIPE_PRICE_* secrets.

## Version: v38

## Self-serve subscription TIERS (Starter $49 / Pro $99 / Pro Max $199, 14-day trial)
- Pricing decided (vs Housecall Pro/Jobber/QuoteIQ research): Starter $49, Pro $99, Pro Max $199 monthly; annual ~2 months free (set in Stripe). Add-on model planned next ("Junk & Dumpster Pack" +$20/mo).
- Migration migration-subscription-fields.sql: organizations += plan, stripe_customer_id, stripe_subscription_id (subscription_status already exists from v37).
- Edge Function edge-function-create-subscription.ts: subscription-mode Checkout for tier, trial_period_days=14, metadata org_id+plan on session AND subscription_data, customer_email prefill, success_url=<app>?subscribed=1. Price IDs via secrets STRIPE_PRICE_STARTER/PRO/PROMAX.
- Edge Function edge-function-stripe-webhook.ts: verifies signature (STRIPE_WEBHOOK_SECRET) via Stripe SDK (esm.sh stripe@17, createSubtleCryptoProvider). On checkout.session.completed / customer.subscription.updated|deleted → sets organizations.subscription_status (trialing/active/past_due/canceled) + plan + stripe ids via service role. MUST be deployed with Verify JWT OFF.
- app.js: subscribe screen shows real prices + "Start trial"; chooseSubscription(tier) → create-subscription → redirect to Stripe. supabase.js: waitForActivation() polls subscription_status (6×1.5s) on return (?subscribed=1) so user doesn't bounce back to gate before webhook lands.
- Files: app.js, supabase.js + new migration-subscription-fields.sql, edge-function-create-subscription.ts, edge-function-stripe-webhook.ts.

## USER SETUP (Stripe, platform/Thrive-side, one-time):
1. Stripe → create 3 recurring monthly Products/Prices: Starter $49, Pro $99, Pro Max $199 (copy each price_… ID). 2. Supabase secrets: STRIPE_PRICE_STARTER/PRO/PROMAX = those IDs. 3. Deploy functions create-subscription + stripe-webhook (paste .ts). 4. stripe-webhook: turn OFF "Verify JWT". 5. Stripe → Developers → Webhooks → add endpoint = stripe-webhook URL, events checkout.session.completed + customer.subscription.updated + customer.subscription.deleted → copy signing secret → Supabase secret STRIPE_WEBHOOK_SECRET. 6. Run migration-subscription-fields.sql. 7. Deploy app.js+supabase.js. Test (Stripe TEST mode): new signup → subscribe screen → Start trial → card 4242… → returns activated (trialing).

## Version: v37

## Subscription access GATE (no active plan = no access; no free demo accounts)
- WHY: new signup landed as tech because provision-org wasn't deployed (app fails closed to tech when it can't build the admin workspace). Fix = deploy provision-org. BUT user also wants NO access without a paid tier → built the gate.
- Migration migration-subscriptions.sql: add organizations.subscription_status (no default → existing rows NULL), backfill NULL→'active' (grandfather existing, idempotent), then set default 'inactive' (new orgs locked until they subscribe). provision-org INSERT omits status → new orgs default 'inactive'.
- supabase.js initApp: reads subscription_status (separate read). window._subActive=false ONLY on positively-inactive ('inactive'/'canceled'/'past_due'); unknown/missing-column/error → FAIL OPEN (true). Gate: _subActive===false → showSubscribeScreen() + return (skip app/onboarding).
- app.js showSubscribeScreen(): full-screen locked overlay (#subscribe-screen) with plan tiers + "Choose" + Sign out. chooseSubscription(tier) = placeholder toast (real Stripe subscription checkout = NEXT).
- INTERIM activation (until self-serve billing): set subscription_status='active' for an org in Supabase to unlock it. Existing accounts grandfathered active (not locked).
- Files: app.js, supabase.js + new migration-subscriptions.sql.

## NEXT: self-serve Stripe SUBSCRIPTION billing (so customers pay the monthly fee themselves → auto-activate). Needs: tier prices + free-trial decision → Stripe Products/Prices → create-subscription Edge Function (mode:subscription) → webhook sets subscription_status active/past_due/canceled. Also still: Stripe CONNECT (customer payments → their bank), move platform keys (Maps/email) off customers.

## Version: v36

## SELF-SERVE SIGNUP + auto-provisioning + skippable onboarding (SaaS front door)
- Edge Function edge-function-provision-org.ts: for a logged-in user with NO membership, creates an organization + ADMIN membership (service role, idempotent — returns existing if already a member). This is what makes self-signup work with zero manual setup. Secure: only ever makes the caller admin of a NEW org.
- supabase.js initApp: when memberships lookup is empty → calls provision-org → sets MY_ORG_ID/MY_ROLE=admin; sets window._justProvisioned on first creation. (Replaces the old fail-closed-to-tech path. Still fails closed if provision errors.) Invited employees already get memberships pre-login so they never hit this; removed users have auth deleted so can't log in — so membership-less = genuine new signup.
- Onboarding wizard (app.js, modal-onboarding): shown only when _justProvisioned. Minimal + SKIPPABLE per user request (no sale friction): company name + phone, "Save & Get Started" or "Skip for now". Sets p.onboarded=true (cloud-synced), pushes business to cloud. Points them to Settings for the rest.
- Files: app.js, supabase.js, index.html + new edge-function-provision-org.ts.

## USER SETUP: deploy Edge Function "provision-org" (paste .ts from chat), deploy 3 app files. NOTE: for frictionless signup, check Supabase → Auth → Email → "Confirm email" (if ON, new users must confirm before first login). Test: sign up with a NEW email → should auto-get workspace as admin + see welcome wizard.

## STILL TODO for full SaaS (discussed): Stripe CONNECT (each customer gets paid into their own bank; Thrive platform fee) — replaces single-key create-checkout; move platform keys (Google Maps, email) off customers to Thrive-level; per-customer SMS numbers later. Stripe phase-2 webhook (auto-confirm text-link payments).

## Version: v35

## Stripe payments — PHASE 1 (collect payment, both options)
- Edge Function edge-function-create-checkout.ts: verifies logged-in user, creates a Stripe Checkout Session (usd, unit_amount cents, metadata invoice_id/org_id/customer, success_url=<app>?paid=<invId>, cancel_url=<app>), returns {url}. Secret = STRIPE_SECRET_KEY (Supabase secret). Mirrors send-sms pattern.
- App (app.js): "Pay by Card" button on unpaid invoice detail → collectCardPayment() POSTs to create-checkout → showPaymentOptions modal (modal-pay-options): "Pay on this device" (location.href=url), "Text link to {customer}" (textPaymentLink → sendSMS), "Copy payment link". 
- On-device confirm: handleReturnFromStripe() runs after initApp — detects ?paid=<invId> on return, marks invoice paid + paidVia 'Card' + awards points (cloud-aware), cleans URL.
- index.html: modal-pay-options added. supabase.js: calls handleReturnFromStripe() at end of initApp.
- Files changed: app.js, supabase.js, index.html + new edge-function-create-checkout.ts.

## USER SETUP NEEDED (Stripe):
1. Create Stripe account (stripe.com). 2. TEST mode → Developers → API keys → copy Secret key (sk_test_…). 3. Supabase → Edge Functions → Secrets → add STRIPE_SECRET_KEY. 4. Create Edge Function "create-checkout" (paste .ts from chat). 5. Deploy app files. Test with card 4242 4242 4242 4242.

## TODO PHASE 2 (auto-confirm for the TEXT-to-customer flow):
- Stripe webhook → Edge Function stripe-webhook (verify signature w/ STRIPE_WEBHOOK_SECRET) on checkout.session.completed → mark invoice (metadata.invoice_id) paid via service role. (On-device flow already auto-confirms via ?paid return.)

## Version: v34

## Invoicing visual redesign (Stripe payment = next, needs setup)
- renderInvoices: 3 summary stats (Invoiced / Paid / Outstanding); cards now have a status-colored left accent + receipt icon tile, customer name prominent, big amount, pill, Send/Mark Paid on unpaid. Filter order all/unpaid/paid/draft.
- openInvoiceDetail: branded gradient header (company name, #id, PAID/DUE pill, Amount Due big), BILL TO block (customer + phone + job address), line-items card, total, points note, payment action area (Send to Customer + Mark Paid; paid state shows "Paid in full" + optional inv.paidVia). Layout leaves room for the Stripe "Pay by Card" button.
- Data model unchanged: invoice {id, jobId, customerId, date, items:[{desc,qty,price}], status}. markPaid awards points.
- File changed: app.js.

## TODO NEXT: Stripe in-app payments
- Plan: Stripe secret key as Supabase secret → Edge Function (create Checkout Session / Payment Link for invoice amount) → "Pay by Card" button in invoice detail opens it (customer pays on phone or on-device) → confirm via webhook (or success redirect) → markPaid(inv, via:'Card'). Mirrors the Twilio Edge Function + secret pattern. Needs: user's Stripe account + publishable/secret keys.

## Version: v33

## Fix: Test SMS/Email button crashed (ReferenceError: c is not defined)
- testMessaging() had stale leftovers: referenced an undefined customer `c` and dead GHL.fromPhone/GHL.apiKey (pre-Twilio). Rewrote to test against the OWNER's own phone (p.phone via Twilio sendSMS) + email (p.email via sendEmailJS). Removed "HaulPro"/GHL test wording.
- Confirmed legacy GHL code (GHL const, ghlHeaders, sendGHLSMS_legacy) is fully dead (no live callers; GHL is a defined object so no ReferenceError). Left as-is.
- File changed: messaging.js.

## Version: v32

## Business settings now company-wide (cloud) — personal stays per-user
- Extends the org-settings sync (v29) with a `business` bundle. ORG_BUSINESS_KEYS = company, googleReviewLink, arrivalWindow, defaultTech, smsReminders, autoInvoice, rewardsEnabled, emailjs* (4), googleMapsKey + GMB (gmb_client_id/access_token/location_name from DS).
- app.js: collectBusinessSettings() (reads profile + GMB DS), pushBusinessToCloud() (admin+cloud guard → CloudDS.saveOrgSettings({business})), applyBusinessSettings(biz) (merges onto local profile + GMB DS). saveSettings + saveApiSettings now call pushBusinessToCloud().
- supabase.js initApp: after loading org settings, applyBusinessSettings(os.business) → syncs into local `p` → re-inits emailjs; maps load later uses the org key.
- Personal fields (name, phone, email, initials) stay per-user (NOT in the bundle).
- NO new migration (reuses organizations.settings jsonb from v29). DEPLOY app.js + supabase.js. After deploy, admin must SAVE settings + SAVE API settings ONCE to populate org.business; then other devices load it on login.

## Version: v31

## Communication: "Insert custom value" palette + Settings Profile/Business split
- Communication manager now has a sticky "Insert custom value" button → toggles a palette (#comm-palette) of chips (COMM_VALUES: tag + friendly label, 16 values incl. {technician}). Tapping a chip inserts the tag at the cursor of the last-focused field.
- Field focus tracking: sms/esub/ebody fields carry onfocus/onblur/onclick/onkeyup="commSaveSel(this)" → _commActive={id,start,end}. commInsertTag splices tag at saved cursor + refocuses. commTogglePalette shows/hides. Helps users discover available placeholders instead of memorizing them.
- Settings: split the old "Your Profile" card into "👤 Profile" (name, phone, email) and "🏢 Business" (company name, review link). All sp- IDs preserved → saveSettings unchanged/works.
- File changed: app.js.

## Version: v30

## APIs & Integrations consolidated into one Settings card
- Settings was cluttered with EmailJS, Google Maps key, and Google My Business sections inline. Collapsed into a single "🔌 APIs & Integrations" card → openApiManager() modal (modal-apis, body #apis-manage-body). Same card→manager pattern as Price Book / Communication.
- Manager (renderApiManager) holds: SMS status banner (Twilio, no keys), EmailJS (pubkey/service/template/from name), Google Maps API key, Google My Business (client id/token/location + Authorize/Test buttons). Own save: saveApiSettings() → writes profile (maps+emailjs) + DS (gmb_*), saves local+cloud, emailjs.init, loadGooglePlaces.
- saveSettings() (main Save) NO LONGER reads the moved fields (would've thrown/wiped them since they're not in the main DOM now). It keeps name/company/phone/email/review-link/toggles/scheduling. Review link stays in Profile card (it's business config, not a credential).
- Files changed: app.js, index.html.

## Version: v29

## Cloud sync of shared settings (price book + message templates) — COMPANY-WIDE
- PROBLEM solved: price_book + msg_templates were LOCAL per-device. Now stored on the business (org) in the cloud so every device loads the same config.
- Migration: migration-org-settings.sql → `alter table organizations add column if not exists settings jsonb default '{}'`. No new policies needed (existing "members read their orgs" + "admins update their org" already cover read/write).
- supabase.js CloudDS.getOrgSettings() (SELECT settings FROM organizations WHERE id=MY_ORG_ID) + saveOrgSettings(patch) (read-modify-write merge → SB.update('organizations', MY_ORG_ID, {settings})).
- initApp: after MY_ORG_ID resolves, loads org settings → DS.set('price_book') / DS.set('msg_templates') BEFORE render, so admins+techs share config. Degrades gracefully if column missing (try/catch).
- app.js writes push to cloud (admin-guarded, window._useCloud): savePriceBook → saveOrgSettings({price_book}); commSaveAll + commResetTemplate → syncTemplatesToCloud() → saveOrgSettings({msg_templates}).
- DEPLOY: run migration-org-settings.sql in Supabase SQL Editor, then deploy app.js + supabase.js. Test: admin edits template/price (saves to cloud) → second device / fresh login loads the same wording + prices.
- NOTE company info (name/phone/review link) still per-user in profile; could move org-side later using the same mechanism.

## Version: v28

## {technician} placeholder added
- msgVars now resolves technician = job's assigned tech (getTechName(j.techId)) → else myClockIdentity().name → else account name. Also {technicianFirst}.
- Default OMW template now uses {technician}: "Hi {customer}! This is {technician} with {company}. I'm on my way now..." (sms + email body).
- Legend updated to show {technician}.
- (Needs the job to have a tech assigned; local employee cache from initApp resolves the name.)

## Version: v27

## Communication: editable message templates (texts + emails)
- New Settings card "Communication" (admin reaches via settings) → openCommunicationManager() modal (modal-communication, body #comm-manage-body).
- Template engine (app.js): DEFAULT_TEMPLATES for 5 auto-sends — omw (On My Way), confirm (Booking Confirmation), complete (Job Complete/Review — fires on job completion), invoice (Invoice Sent), estimate (Estimate Sent). Each has sms + (most) emailSubject/emailBody. Placeholders {customer}{customerFull}{company}{rep}{repFirst}{phone}{address}{date}{time}{window}{service}{price}{total}{reviewLink}{validUntil}.
- Helpers: getTemplates() (defaults merged w/ overrides), getTemplate(key), saveTemplateOverride, resetTemplate, fillTemplate(str,vars); msgVars(c,p,j,extra) builds the values (messaging.js).
- Manager UI: per-template SMS textarea + email subject/body (where applicable) + reset-to-default; placeholder legend; Save Changes (commSaveAll/commCaptureAll preserves edits across resets).
- Rewired send sites to templates: sendOMW, sendBookingConfirmation, sendReviewRequest, sendInvoiceToCustomer (messaging.js) + saveEstimate (app.js). Removed hardcoded "Junk Genies" (now {company}).
- STORAGE = LOCAL (DS 'msg_templates') for now. LIMITATION: tech-sent messages (OMW, complete) use the tech device's templates → won't get the admin's custom wording until we sync templates to the ORG (cloud). NEXT: store templates org-side + load at initApp so the whole team sends the company's wording.

## Version: v26

## Estimate form fixes
- Service Type dropdown was listing every priced load size → simplified to just "Junk Removal" / "Dumpster Rental" (onchange repopulates ef-price-select for that category). Price stays its own field below.
- Added 2-hour arrival WINDOW to estimates (ef-time + ef-time-end, default 09:00–11:00; efSyncWindow() sets end=start+2h on change). saveEstimate stores timeEnd. Matches jobs (which already had timeEnd + fmtArrivalWindow).
- Estimate schedule card now shows the window (fmtArrivalWindow) + readable service label.
- Defined missing selectEstServiceType() (was called in openNewEstimate but undefined → silent console error).

## TODO NEXT (user request): Communication / Message Templates settings
- Want an admin-only Settings section to edit the auto-sent message templates (On My Way text, Job Complete text, + estimate/invoice/reminder/review). Each account customizes wording. Same card→manager pattern as Price Book.
- Templates currently HARDCODED in messaging.js (sendOMW etc.) and app.js send sites. Need: template store (defaults + per-account overrides in profile/cloud) w/ placeholders ({customer},{company},{price},{window},{eta}...), a manager UI w/ placeholder legend + reset, and rewire each send site to fill from the template.

## Version: v25

## Price Book: collapsed inline wall → dedicated manager (add/edit/delete)
- Settings used to dump all ~20 price items inline (renderPriceBookSettings). Replaced with a single compact "Price Book" CARD (tap → openPriceBookManager()).
- New manager modal (modal-pricebook-manage, body #pb-manage-body): items grouped by category, each row = editable label + price + delete (trash). "Add a line item" form (name, price, category select OR new-category text). Save persists via savePriceBook().
- Working-copy pattern (_pbWorking) + pbCaptureInputs() so add/delete don't lose unsaved edits. pbAddItem/pbDeleteItem/savePriceBookManager.
- Price book data unchanged: getPriceBook()/savePriceBook(), items {id,service,label,price,category}, DEFAULT_PRICE_BOOK (Junk Removal / Extra Charge Items / Dumpster Rental). The job/estimate price PICKER (openPriceBook, modal-price-book) is untouched.
- Limitation: recategorizing an existing item = delete + re-add (no per-row category edit). Old savePriceBookSettings removed.

## Version: v24

## Fix: Estimates screen was unreachable (no nav entry)
- screen-estimates + openNewEstimate() existed but no bottom-nav item → user couldn't create/find estimates.
- Added "+ Estimate" button on the Schedule (Jobs) header next to "+ Job" (natural spot — estimates live on the schedule) → openNewEstimate().
- Added "Estimates" quick-action on the dashboard → showScreen('estimates') (the pipeline list w/ status filters).
- openNewEstimate() already defaults ef-date=today; ef-time defaults 09:00 → new estimate shows on today's schedule at 9am.
- (Bottom nav deliberately NOT expanded to 7 — entry points instead.)

## Version: v23

## Estimate field-workflow — STEP 1: estimates on the schedule (DONE)
- Goal (user): estimates behave as schedulable field visits, show on schedule (distinct from jobs to protect close/cancel rates), tech hits On My Way, converts to job in-field, then clocks in + closes. Client can approve/decline.
- Design: REUSE existing separate `estimates` entity (already has date/customer/address/price/techId/status draft|sent|approved|declined|converted + convertEstimateToJob + approve/decline). Because estimates live outside the jobs table, job close/cancel metrics (computed from getJobs only) are auto-protected.
- STEP 1 built: added `time` field to estimate form (ef-time, index.html) + saveEstimate persists it. New estimatesForSchedule(date) (active = not converted/declined; tech-scoped). renderJobs() now renders estimate cards in time slots — dashed purple, "ESTIMATE" badge, onclick openEstimateDetail. Week-strip dots count estimates too. Empty-state reworded.
- NEXT: STEP 2 = On My Way on estimates. STEP 3 = in-field Convert carries customer/address/price/date/time/tech into the new job + tech clock-in/close handoff (improve convertEstimateToJob, currently sets convertedJobId='pending' & asks to fill schedule).

## Version: v22

## Twilio SMS LIVE-pending + legal pages (status)
- User created Twilio account, set the 3 secrets, deployed `send-sms` function, deployed app. Outbound send pipeline works end-to-end (Twilio accepted + charged).
- Texts returned UNDELIVERED with error 30034 = A2P 10DLC not registered. Confirmed it's the carrier registration gate, not a code issue.
- A2P 10DLC: Junk Genies is an LLC w/ EIN → registered STANDARD brand + campaign. Campaign SUBMITTED, now PENDING carrier vetting (a few days). Opt-in = verbal/in-person at booking (no web form); used verbal-consent campaign description tied to privacy policy URL. Opt-in keyword/message boxes left blank (correct).
- AFTER APPROVAL: confirm Twilio number is attached to the campaign's Messaging Service → texts deliver, no app changes needed. Re-test On My Way.
- Created legal pages: privacy-policy.html (has carrier-required SMS clause: opt-in data never shared w/ 3rd parties) + terms-of-service.html. Need hosting (suggested: drop into GitHub Pages repo → https://shivanih06.github.io/test/privacy-policy.html). CONFIRM user uploaded them (privacy URL used in A2P description must resolve).
- If campaign comes back "needs revision" it's almost always the opt-in description → reword + resubmit.

## Version: v21

## SMS migrated off GoHighLevel → Twilio (platform-owned, server-side)
- New Edge Function `send-sms` (edge-function-send-sms.ts): holds Twilio creds as Supabase SECRETS (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER), verifies caller is logged in, POSTs to Twilio Messages API. Optional `from` for future per-business numbers (defaults to TWILIO_FROM_NUMBER).
- App: new sendSMS(toPhone,text) in messaging.js calls the function. All send sites (sendOMW, sendMessage, sendInvoiceToCustomer, reminder, review-request, estimate send/resend in app.js) now call sendSMS. Capability gate changed from "has GHL keys" → "customer has a phone" (!!(c && c.phone)).
- Old sendGHLSMS renamed sendGHLSMS_legacy (dead). fetchGHLMessages still GHL-based (inbound history) → returns [] without keys; inbound via Twilio webhook is a FUTURE item.
- Settings: removed GHL credential fields → replaced with "SMS handled securely by Thrive (Twilio), no keys" note. saveSettings no longer reads sp-ghl-* (would have crashed).
- SETUP PENDING (user): create Twilio acct → SID/Auth Token/number → set 3 Supabase secrets → deploy send-sms function → deploy app. TRIAL accounts only send to verified numbers; US production needs A2P 10DLC registration.
- FUTURE: per-business Twilio numbers stored on org; inbound SMS webhook → messages table; A2P brand/campaign for resale (ISV).

## Version: v20

## RLS cleanup DONE — multi-tenant build COMPLETE
- Ran check-org-id-coverage.sql: all data tables 0 rows missing org_id (employees total=4, missing=0). Safe to retire old rules.
- Ran migration-retire-user-rls.sql: dropped old login-based policies; each of the 8 data tables now has exactly ONE policy "org members access <table>". Verified by user — app still works, data still visible.
- Security model is now a single source of truth: business-based (org_id) RLS only.
- ✅ Step 3 COMPLETE. ✅ Entire multi-tenant + roles + invites build COMPLETE.

## REMAINING / FUTURE (none blocking; pilot is fully functional)
- Cloud-sync time entries (currently per-device local) so admin sees crew hours cross-device for payroll.
- Custom SMTP (e.g. Resend free tier) for invite email volume (Supabase default is rate-limited).
- Auto-provision org + admin membership on NEW business signup (only matters when onboarding a 2nd company; pilot Junk Genies set up manually).
- Owner hours into Team timesheet (add owner as employee w/ login email) — optional.
- Parked: app icons/ folder upload (cosmetic 404); GMB auto-posting (needs Netlify + Business Profile API quota).

## Version: v19

## Retired legacy PIN "switch user"; clock-in follows the logged-in person (DONE — CONFIRMED working)
- New myClockIdentity(): returns the logged-in user's matched employee record (MY_EMPLOYEE_ID), else a self-identity from their profile (id = Auth.user.id) so an owner/admin with no employee record can still clock in.
- Team hero now `const emp = myClockIdentity()` → always shows the logged-in person's clock card; the old "select your profile" PIN picker branch is now dead/unreachable.
- Dashboard tech clock card also uses myClockIdentity().
- Owner chose: they DO clock in sometimes → handled via Team screen clock card as themselves.
- NOTE: if the owner has no employee record matching their login email, their clock entries use their auth user id → their hours show on their own clock card but NOT in the Team timesheet table. To get owner hours into reports, add an employee record with the owner's login email. (Possible future: auto-create a self employee record.)
- selectEmployee()/pinKey()/openClockIn() remain defined but are now legacy/unused fallbacks.

## Version: v18

## Account menu + sign-out for all roles (DONE)
- Header avatar (#header-avatar) was a dead label → now onclick=openAccountMenu(): popover with name, email, role badge, Settings (admin only), and Sign Out. Gives techs (who can't see Settings) a way to log out.
- Auth.signOut() now also clears window.MY_ROLE/MY_ORG_ID/MY_EMPLOYEE_ID and current_employee so nothing leaks into the next login.

## OPEN ITEM — legacy PIN "switch user" on Team
- selectEmployee()/pinKey() = old shared-iPad clock-in picker (sets current_employee only, NOT role/view). Shows for the owner because owner login isn't tied to an employee record. Confusing now that everyone has a real login+role. DECISION NEEDED: do admins/owners clock in? If not, retire the PIN switcher; tie clock-in to the logged-in user's own employee record (MY_EMPLOYEE_ID).

## Version: v17

## CRITICAL SECURITY FIX — any password logged in as admin (FIXED)
- Bug chain: (1) Auth.signIn only checked old-style {error/error_description}; newer Supabase returns bad creds as {code,error_code,msg} → check missed → signIn proceeded with undefined user/token, no throw. (2) undefined uid → membership query errored → catch fell back to MY_ROLE='admin' (fail-OPEN). Result: any/fake password → admin view.
- Fixes: signIn now throws on `!resp.ok || !data.access_token`; signUp hardened (`!resp.ok`). Membership-error catch now FAILS CLOSED → MY_ROLE='tech', MY_ORG_ID=null (never auto-admin). myRole() last-resort default changed 'admin'→'tech'.
- Owner unaffected (has admin membership; query works post-recursion-fix → resolves admin).
- NOTE: new-business signup still doesn't auto-create org+admin membership (pilot has only Junk Genies). Future: auto-provision org on signup, else a fresh owner would fail closed to tech.
- TEST: sign out / use private window; fake password must now be REJECTED; correct tech password → tech view.

## Version: v16

## Step 3 — part 2: login↔employee link + tech home (DONE, pending user test)
- initApp() now links the login to its employee record by email (window.MY_EMPLOYEE_ID), caches the team to local DS (so getTechName/clock card resolve synchronously), and sets the tech as current_employee for clock-in.
- scopeJobsToRole(jobs): techs see ONLY jobs where j.techId === MY_EMPLOYEE_ID (no link → [] , never all). Applied in renderDashboard + renderJobs.
- Tech dashboard: hero stats become My Jobs Today / Complete / Hours Today (no company revenue); the insight slot shows a clock-in/out card (clockCardHTML, reused logic). Tech can open + fully edit their own jobs.
- clockIn/clockOut now renderScreen(State.screen) so the card refreshes on whatever screen is active (dashboard or team).
- Jobs assigned via j.techId. Time entries are LOCAL only (per-device) — cloud time-sync is a future item (admin won't see a tech's hours cross-device yet).
- REMAINING Step 3: retire old user-based RLS (after confirming org-based works for techs). Later: cloud time-entry sync; custom SMTP (Resend) for email volume.

## Version: v15

## Step 3 — part 1 fix: invite link landed on login, not welcome (FIXED)
- Cause: the GMB OAuth on-load handler in app.js (IIFE handleGMBOAuth) grabbed ANY `#access_token=` from the URL — including the Supabase invite token — stored it as a GMB token, cleared the hash, and showed "Google authorized!". So initWithSupabase() saw no hash → fell to login screen.
- Fix: added `isSupabaseAuth` guard (matches type=invite/recovery/signup/magiclink or refresh_token=) so the GMB handler ignores Supabase auth callbacks. Invite token now survives to showSetPasswordScreen().
- Confirms invite uses implicit flow (hash tokens).
- CONFIRMED WORKING by user: fresh invite → welcome/set-password screen → into app. Part 1 of Step 3 COMPLETE.

## Version: v14

## Step 3 — part 1: invite accept / set-password (DONE)
- initWithSupabase() now detects invite/recovery tokens in the URL hash (access_token + type=invite/recovery/signup), starts a session via Auth.setSessionFromTokens(), clears the hash, and shows showSetPasswordScreen().
- showSetPasswordScreen(): full-screen welcome overlay (#setpw-overlay), greets "Welcome to {business name}" (fetched from memberships→organizations), password + confirm fields → submitSetPassword() calls Auth.updateUser({password}) (PUT /auth/v1/user) then initApp().
- New Auth methods: setSessionFromTokens(access, refresh), updateUser(attrs).
- TEST NOTE: invite links are one-time — must invite a FRESH email (not already in Auth→Users) to test the welcome screen.
- STILL TODO Step 3: link logged-in auth user → their employee record (by email) so tech sees own jobs + personal clock-in. Then retire old user-based RLS. Later: custom SMTP (Resend) for email volume.

## Version: v13

## Delete-employee UX (DONE)
- Team employee cards (admin) are tappable → openEmployeeProfile() opens a profile modal (modal-employee-profile, body #emp-profile-body): avatar, name, role badge, phone, email, pay rate (admin), PIN status, hours this week.
- Danger zone → "Remove Employee" → showRemoveWarning() swaps modal to a warning view (consequences list: deletes record, revokes login/access, removes from scheduling; timesheets stay in reports; cannot be undone) → Cancel / "Yes, remove".
- removeEmployee() no longer uses browser confirm() (warning view gates it); closes profile modal, deletes record + calls invite-employee fn action:'remove' to revoke membership/login.
- One-tap trash icon REMOVED from cards.

## Version: v12

## Multi-Tenant — Phases 1 & 2 DONE, Phase 3 IN PROGRESS
- Phase 1 (DONE): organizations + memberships + org_id on all tables + org RLS. RLS recursion bug fixed via SECURITY DEFINER helpers `my_org_ids()` / `my_admin_org_ids()` (migration-fix-rls-recursion.sql).
- Phase 2 (DONE): login resolves org_id + role from memberships (window.MY_ORG_ID / MY_ROLE). CloudDS reads via `scope()` (org_id, falls back to user_id). Writes stamped with org_id. Role-gating UI live (nav + screens by role). Admin "Preview Employee View" in Settings. saveSettings now also writes to cloud (CloudDS.saveProfile upserts).
- Phase 3 (IN PROGRESS):
  - DONE: Edge Function `invite-employee` deployed (verifies caller is admin, invites user, creates membership). Wizard "Add Employee" calls it → invite email sends. Supabase Auth → URL Configuration Site URL set to https://shivanih06.github.io/test (was localhost:3000).
  - TODO Step 3: "Set your password / welcome" screen when invited user lands via email link (detect access_token in URL, call updateUser({password})). Link logged-in auth user → their employee record (by email or store auth user_id on employee row) so "my jobs"/clock-in resolve. Then retire old user-based RLS. Later: custom SMTP (Resend) for email volume.

## Edge Function
- Name: `invite-employee` (Supabase dashboard). Source: edge-function-invite-employee.ts.
- Service key auto-injected; do NOT paste keys. Verify-JWT on (app sends Auth.token).

## Version: v11 (previous)

## Multi-Tenant — Phase 1 DONE (this session)
- `organizations` table = the business. `memberships` table = login → org + role (admin/manager/tech).
- Every data table has `org_id`. Org-based RLS added (additive — old user-based policies kept for now).
- BEFORE INSERT trigger `set_org_id()` auto-tags new rows with the inserter's org.
- Owner's business created: name "Junk Genies", admin = login `454d80db-e23d-4b11-b2d2-aa8962d163f6`.
- NOTE: profile was never in cloud (saveSettings only wrote localStorage) — backfill found 0 profiles, so the org was created manually via UID snippet. Phase 2 must make saveSettings write to cloud.
- Migration files: `migration-phase1-multitenant.sql`, `migration-employees.sql`.

## Multi-Tenant — Phase 2 NEXT (app becomes org-aware)
- On login, resolve user's org_id + role from `memberships`; hold in app state.
- CloudDS: write `org_id` on every insert; read/query by `org_id` (not just user_id).
- saveSettings → also save profile to cloud so settings/Maps key sync across devices.
- Role-gating UI: hide nav/screens by role (tech = my jobs/photos/clock; manager = ops, no settings/billing; admin = all). Then retire old user-based RLS.
- Phase 3: invite Edge Function + email (custom SMTP, e.g. Resend free tier) + accept-password flow.

## Version: v10 (previous)

## Stack
- **App:** Vanilla HTML/CSS/JS PWA
- **Hosting:** GitHub Pages → github.com/Shivanih06/test (Netlify planned for go-live, for serverless functions)
- **Database:** Supabase (znjclglbjifracvrzkik.supabase.co)
- **SMS:** Go High Level API (direct browser calls)
- **Auth:** Supabase email/password

## Files
- `index.html` — all screens and modals; also contains the Google Maps loader + on-load autoloader
- `styles.css` — brand colors
- `app.js` — all logic (~3,390 lines)
- `datastore.js` — localStorage layer (DS)
- `supabase.js` — Supabase auth + CloudDS object; **this is the real boot path (`initWithSupabase` → `initApp`), NOT app.js `init()`**
- `messaging.js` — GHL SMS + EmailJS
- `photos.js` — camera + IndexedDB
- `gmb.js` — Google My Business posting (uses Netlify functions — only works on Netlify, not GitHub Pages)
- `netlify/functions/` — gmb-post.js, ai-caption.js, gmb-token.js (NOT in the repo zip; live only on Netlify)

## Boot Path (important)
- App boots through `supabase.js`: `initWithSupabase()` → `initApp()` → `showScreen('dashboard')`.
- `app.js`'s `init()` is NOT called on the cloud path. Anything that must run on startup goes in `initApp()` (supabase.js) or the on-load block in index.html.
- Google Maps is loaded on startup by an autoloader in `index.html` (reads cached `googleMapsKey` from localStorage, retries ~10s). This is independent of the boot path.

## What Works
- Login/signup via Supabase auth
- Dashboard with today's jobs
- Add Job — customer search, service toggle, 15-min arrival selects, AM/PM toggle, schedule peek, tech assignment
- **Address autocomplete — WORKING via Google Places (new API). Returns correct city + ZIP, including unincorporated addresses.** Falls back: new Places API → legacy Google → Nominatim.
- Job Detail — status dropdown, timer, before/after photos, line items with price book
- Price book, Customers CRM, Estimates, Invoices, Reports, Team (PIN/clock), two-way SMS, Rewards tiers
- Settings — arrival window, default tech, price book editor, GHL keys, EmailJS, GMB, Google Maps API key

## Fixed This Session (v10)
- **AM/PM toggle** on Add Job — was a no-op (regex on normalized `cssText` never matched); now sets `.style.background`/`.color` directly. (app.js `updatePeriodButtons`)
- **Job form crash** — `renderSchedulePeek` and `onJobDateChange` were called but never defined; both now defined. (app.js)
- **Google Maps not loading on boot** — key was saved but only loaded when Settings was re-saved, because the loader lived in app.js `init()` which the Supabase boot path never calls. Added loading to `initApp` (supabase.js) AND a boot-path-independent autoloader in index.html.
- **Address autocomplete county/ZIP problem** — hardened Nominatim fallback (strips county, normalizes state to FL); fixed new Places API `locationBias` to JS bounds-literal format so it succeeds instead of falling back to deprecated legacy.

## What's Broken / Pending
- **Employee seed UUID error** — `seedCloudEmployees` (supabase.js) generates `e_...` IDs, but the `employees` table `id` is `uuid`. Throws 400 on every fresh load (caught, non-blocking). NEXT FIX: generate real UUIDs or change column type.
- GMB auto-posting — pending Google Business Profile API quota approval; also requires Netlify (functions don't run on GitHub Pages)
- Icons 404 on GitHub Pages (icons/ folder needs to be uploaded separately)
- Supabase sync not fully wired — some screens still read from localStorage instead of CloudDS

## Go-Live Checklist (for Netlify move)
- Move hosting to Netlify; confirm `/.netlify/functions/*` resolve (enables AI captions + GMB posting)
- Confirm/﻿update GMB OAuth redirect URI in gmb.js (currently junkgeniestest.netlify.app)
- Set env vars on Netlify; rotate the two secrets below
- Add icons/ folder
- Add the live domain to the Google Maps API key's referrer restrictions

## Key Credentials
- **Supabase URL:** https://znjclglbjifracvrzkik.supabase.co
- **Supabase publishable key:** sb_publishable_aUuw2yi8tcZCEWA5CFkg8Q_UZBnDh82 (safe to expose)
- **GHL Location ID:** 3uK16hBgHS3I4QbGaeLg
- **GHL From Phone:** 8632926992
- **GMB Location ID:** 4712407153014225709
- **Google Cloud Project:** test (896749183992)
- **Google Maps API key:** set in app Settings (restrict to Maps JavaScript API + Places API + Places API New; add referrer for the live domain)
- **GitHub repo:** github.com/Shivanih06/test
- **App URL:** https://shivanih06.github.io/test
- **GHL API Key:** ROTATE THIS — was shared in chat
- **Google Client Secret:** ROTATE THIS — was shared in chat

## How to Start a New Session
1. Start fresh conversation
2. Paste this entire document
3. Upload latest ZIP (v10)
4. Say what you want to fix or build
5. Before ending, ask Claude to update this doc
