// campaigns.js — Outreach campaigns.
//
// Call a list of customers with an offer (first use: pressure washing for the
// existing customer base), one person at a time, and track who's been reached.
//   - Campaign list with a progress board
//   - New campaign: pick the audience, write the script, see how many match
//   - Calling queue: shows ONE customer at a time with the script, a Call button
//     (the same in-app calling that records and logs every call), and outcome buttons
//
// Deliberately manual: a person taps Call for each customer. Not an auto-dialer —
// auto-dialing existing customers raises legal issues manual calling doesn't.
// Calls are only enabled 8am–8pm local time.
(function () {
  'use strict';

  const STATUS_LABELS = {
    new: 'Not called yet', no_answer: 'No answer', callback: 'Call back', interested: 'Interested',
    not_interested: 'Not interested', booked: 'Booked', wrong_number: 'Wrong number', dnc: 'Do not call',
  };
  const CLAIM_MINUTES = 10;   // a customer handed to one caller is held for them this long
  const MAX_ATTEMPTS = 3;     // "no answer" customers are retried until this many tries
  const CALL_FROM_HOUR = 8, CALL_TO_HOUR = 20;

  const DEFAULT_SCRIPT =
`Hi {first}, this is {me} with {company}. We've worked with you before, so I wanted to reach out personally.

We just added pressure washing: driveways, patios, walkways, and house washing. Would you like a free quote?

If yes: get the address, what they want cleaned, and a good day/time.
If not now: thank them, ask if it's OK to check back in a few months.
If they ask not to be called again: tap "Don't call again". We'll never call them again.`;

  let ctx = { rootId: null, campaign: null, row: null, cust: null, skipped: new Set(), stats: null };

  // ── helpers ─────────────────────────────────────────────
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const ph10 = p => String(p || '').replace(/\D/g, '').slice(-10);
  const orgId = () => window.MY_ORG_ID;
  const meId = () => window.MY_EMPLOYEE_ID || (window.Auth && Auth.user && Auth.user.id) || 'me';
  const meName = () => {
    try { const e = getEmployees().find(x => x.id === window.MY_EMPLOYEE_ID); if (e) return e.name; } catch (e) {}
    return (getProfile && getProfile().name) || 'Admin';
  };
  const api = (method, path, body) => SB.request(method, path, body);
  const root = () => document.getElementById(ctx.rootId);
  const hoursOK = () => { const h = new Date().getHours(); return h >= CALL_FROM_HOUR && h < CALL_TO_HOUR; };
  // After-hours calling is only allowed to YOUR OWN number (the phone number in
  // Settings → General), so the app can be tested at any hour without ever letting a
  // real customer be called outside 8am–8pm.
  const isOwnNumber = c => { const mine = ph10((getProfile() || {}).phone); return mine.length === 10 && mine === ph10(c && c.phone); };
  const canCallNow = c => hoursOK() || isOwnNumber(c);

  async function loadBlocked() {
    try {
      const rows = await api('GET', `blocked_numbers?org_id=eq.${orgId()}&select=phone10&limit=10000`);
      window._blockedPhones = rows.map(r => r.phone10);
    } catch (e) { window._blockedPhones = window._blockedPhones || []; }
  }

  async function loadStats(campaignId) {
    const rows = await SB.get('campaign_contacts', `campaign_id=eq.${campaignId}&select=status`);
    const s = { total: rows.length };
    Object.keys(STATUS_LABELS).forEach(k => { s[k] = 0; });
    rows.forEach(r => { s[r.status] = (s[r.status] || 0) + 1; });
    s.contacted = s.total - s.new;
    return s;
  }

  function statChips(s) {
    const chip = (label, n, color) => `<span style="display:inline-block;margin:2px 4px 2px 0;padding:3px 9px;border-radius:99px;background:${color};font-size:12px;font-weight:700">${label} ${n}</span>`;
    return chip('Interested', s.interested, '#e3f6e8') + chip('Booked', s.booked, '#d6efff') + chip('Call back', s.callback, '#fff3d6')
      + chip('No answer', s.no_answer, '#eef0f3') + chip('Not interested', s.not_interested, '#eef0f3')
      + chip('Wrong #', s.wrong_number, '#eef0f3') + chip('Do not call', s.dnc, '#fde4e4');
  }

  // ── entry points ────────────────────────────────────────
  // The screen exists in both layouts (desktop panel and phone screen); draw into
  // whichever one is actually showing.
  function pickRoot() {
    const d = document.getElementById('camp-root'), m = document.getElementById('camp-mobile-body');
    if (d && d.offsetParent !== null) return 'camp-root';
    if (m && m.offsetParent !== null) return 'camp-mobile-body';
    return null;
  }
  let lastAuto = 0;
  window.renderCampaignsMobile = function () { window.renderCampaigns(); };

  window.renderCampaigns = async function (rootId) {
    if (!rootId) {                       // automatic call from the screen switcher
      rootId = pickRoot(); if (!rootId) return;
      const t = Date.now(); if (t - lastAuto < 500) return; lastAuto = t;   // both layouts trigger it; draw once
    }
    ctx.rootId = rootId;
    const el = root(); if (!el) return;
    if (!(window._useCloud && window.CloudDS)) {
      el.innerHTML = `<div class="info-banner"><i class="ti ti-cloud-off"></i><p>Outreach campaigns need the cloud connection. Log in online to use them.</p></div>`;
      return;
    }
    el.innerHTML = `<div class="text-sm text-muted" style="padding:20px;text-align:center"><i class="ti ti-loader"></i> Loading…</div>`;
    let campaigns = [];
    try { campaigns = await SB.get('campaigns', `org_id=eq.${orgId()}&select=*`); }
    catch (e) {
      el.innerHTML = `<div class="info-banner"><i class="ti ti-alert-triangle"></i><p>Couldn't load campaigns. If this is the first time, the campaigns database setup (migration-campaigns.sql) may not have been run yet.</p></div>`;
      return;
    }
    await loadBlocked();

    const head = `<div class="flex-between" style="margin-bottom:14px">
      <div style="font-size:16px;font-weight:800">Outreach campaigns</div>
      <button class="btn btn-primary btn-sm" onclick="campNewSheet()"><i class="ti ti-plus"></i> New campaign</button></div>`;
    if (!campaigns.length) {
      el.innerHTML = head + `<div class="info-banner"><i class="ti ti-phone-call"></i><p>No campaigns yet. A campaign is a list of customers you're calling with one offer, such as pressure washing. Tap <b>New campaign</b> to start.</p></div>`;
      return;
    }
    el.innerHTML = head + campaigns.map(c => `
      <div class="card" style="margin-bottom:12px" id="camp-card-${c.id}">
        <div class="flex-between">
          <div style="font-weight:800;font-size:15px">${esc(c.name)}</div>
          <span class="text-sm text-muted">${c.status === 'paused' ? 'Paused' : 'Active'}</span>
        </div>
        <div id="camp-stats-${c.id}" class="text-sm text-muted" style="margin:10px 0">Loading progress…</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-primary btn-sm" ${c.status === 'paused' ? 'disabled' : ''} onclick="campStart('${c.id}')"><i class="ti ti-phone-call"></i> Start calling</button>
          <button class="btn btn-secondary btn-sm" onclick="campTogglePause('${c.id}','${c.status}')">${c.status === 'paused' ? 'Resume' : 'Pause'}</button>
          <button class="btn btn-secondary btn-sm" onclick="campDelete('${c.id}')"><i class="ti ti-trash"></i></button>
        </div>
      </div>`).join('');
    campaigns.forEach(async c => {
      try {
        const s = await loadStats(c.id);
        const pct = s.total ? Math.round(s.contacted / s.total * 100) : 0;
        const box = document.getElementById('camp-stats-' + c.id); if (!box) return;
        box.innerHTML = `<div style="font-size:13px;color:var(--text);margin-bottom:6px"><b>${s.contacted.toLocaleString()}</b> of <b>${s.total.toLocaleString()}</b> called (${pct}%)</div>
          <div style="height:8px;background:#eef0f3;border-radius:99px;overflow:hidden;margin-bottom:8px"><div style="height:100%;width:${pct}%;background:var(--primary)"></div></div>${statChips(s)}`;
      } catch (e) {}
    });
  };

  // ── new campaign ────────────────────────────────────────
  function audience(filter) {
    const blocked = new Set(window._blockedPhones || []);
    return getCustomers().filter(c => {
      const p = ph10(c.phone);
      if (p.length !== 10 || blocked.has(p)) return false;
      if (filter.type && (c.clientType || 'residential') !== filter.type) return false;
      if (filter.text && !(((c.address || '') + ' ' + (c.city || '')).toLowerCase().includes(filter.text))) return false;
      return true;
    }).sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0) || (b.jobs || 0) - (a.jobs || 0));
  }
  function readFilter() {
    return { type: (document.getElementById('camp-f-type') || {}).value || '', text: ((document.getElementById('camp-f-text') || {}).value || '').trim().toLowerCase() };
  }

  window.campNewSheet = function () {
    const company = (getProfile().company || 'our company');
    dynSheet('camp-new', `
      <div class="flex-between" style="margin-bottom:12px"><div style="font-size:19px;font-weight:800">New campaign</div>
        <button onclick="closeDyn('camp-new')" style="background:none;border:none;font-size:24px;color:var(--hint);cursor:pointer;line-height:1">×</button></div>
      <div class="form-group"><label class="form-label">Name</label><input class="form-input" id="camp-name" value="Pressure Washing Offer"></div>
      <div class="form-group"><label class="form-label">Who to call</label>
        <select class="form-input" id="camp-f-type" onchange="campUpdateCount()">
          <option value="">All customers</option><option value="residential">Homes only</option><option value="commercial">Businesses only</option></select></div>
      <div class="form-group"><label class="form-label">Only addresses containing (optional)</label>
        <input class="form-input" id="camp-f-text" placeholder="A city or zip, e.g. Lakeland or 33801" oninput="campUpdateCount()"></div>
      <div id="camp-count" class="info-banner" style="margin-bottom:12px"></div>
      <div class="form-group"><label class="form-label">Call script</label>
        <textarea class="form-input" id="camp-script" rows="9" style="font-size:13px">${esc(DEFAULT_SCRIPT.replace('{company}', company))}</textarea>
        <div class="text-sm text-muted" style="margin-top:4px">{first} becomes the customer's first name and {me} becomes the caller's name.</div></div>
      <button class="btn btn-primary btn-full" id="camp-create-btn" onclick="campCreate()"><i class="ti ti-check"></i> Create campaign</button>`, 240);
    window.campUpdateCount();
  };

  window.campUpdateCount = function () {
    const n = audience(readFilter()).length, all = getCustomers().length;
    const el = document.getElementById('camp-count'); if (!el) return;
    el.innerHTML = `<i class="ti ti-users"></i><p><b>${n.toLocaleString()}</b> of ${all.toLocaleString()} customers match. Customers with no valid phone number, and anyone on your do-not-call list, are left out. Best customers (most spent) are called first.</p>`;
  };

  window.campCreate = async function () {
    const name = (document.getElementById('camp-name').value || '').trim();
    if (!name) { toast('⚠️ Give the campaign a name'); return; }
    const list = audience(readFilter());
    if (!list.length) { toast('⚠️ No customers match that filter'); return; }
    const script = document.getElementById('camp-script').value;
    const btn = document.getElementById('camp-create-btn'); if (btn) { btn.disabled = true; btn.textContent = 'Creating…'; }
    try {
      const id = newUUID();
      await api('POST', 'campaigns?on_conflict=id', [{ id, org_id: orgId(), name, script, status: 'active' }]);
      const CH = 400;
      for (let i = 0; i < list.length; i += CH) {
        const rows = list.slice(i, i + CH).map((c, j) => ({ id: newUUID(), org_id: orgId(), campaign_id: id, customer_id: c.id, seq: i + j, status: 'new' }));
        await api('POST', 'campaign_contacts?on_conflict=campaign_id,customer_id', rows);
        toast(`<i class="ti ti-loader"></i> Building list… ${Math.min(i + CH, list.length)}/${list.length}`, 20000);
      }
      closeDyn('camp-new');
      toast(`<i class="ti ti-check" style="color:#4ade80"></i> Campaign created with ${list.length.toLocaleString()} customers`, 6000);
      window.renderCampaigns(ctx.rootId);
    } catch (e) {
      console.warn(e); toast('⚠️ Could not create the campaign: ' + (e.message || e), 9000);
      if (btn) { btn.disabled = false; btn.textContent = 'Create campaign'; }
    }
  };

  window.campTogglePause = async function (id, status) {
    await api('PATCH', `campaigns?id=eq.${id}`, { status: status === 'paused' ? 'active' : 'paused' }).catch(() => toast('⚠️ Could not update'));
    window.renderCampaigns(ctx.rootId);
  };
  window.campDelete = async function (id) {
    if (!confirm('Delete this campaign and its call history list? Your customers and recorded calls are NOT deleted.')) return;
    await api('DELETE', `campaigns?id=eq.${id}`).catch(() => toast('⚠️ Could not delete'));
    window.renderCampaigns(ctx.rootId);
  };

  // ── calling queue ───────────────────────────────────────
  window.campStart = async function (campaignId) {
    ctx.skipped = new Set();
    await loadBlocked();
    const rows = await api('GET', `campaigns?id=eq.${campaignId}&select=*`).catch(() => []);
    if (!rows[0]) { toast('⚠️ Campaign not found'); return; }
    ctx.campaign = rows[0];
    campNext();
  };

  async function fetchCustomer(id) {
    let c = null; try { c = getCustomer(id); } catch (e) {}
    if (!c && window.CloudDS) { try { c = await CloudDS.getCustomer(id); } catch (e) {} }
    return c;
  }

  async function campNext() {
    const el = root(); if (!el) return;
    el.innerHTML = `<div class="text-sm text-muted" style="padding:30px;text-align:center"><i class="ti ti-loader"></i> Finding the next customer…</div>`;
    const cid = ctx.campaign.id, now = new Date();
    const stale = new Date(now - CLAIM_MINUTES * 60000).toISOString();
    const dayAgo = new Date(now - 24 * 3600000).toISOString();
    const free = `or=(claimed_at.is.null,claimed_at.lt.${stale},claimed_by.eq.${meId()})`;
    const base = `campaign_contacts?campaign_id=eq.${cid}&${free}`;
    const passes = [
      `${base}&status=eq.callback&callback_at=lte.${now.toISOString()}&order=callback_at.asc&limit=6`,
      `${base}&status=eq.new&order=seq.asc&limit=6`,
      `${base}&status=eq.no_answer&attempts=lt.${MAX_ATTEMPTS}&last_attempt_at=lt.${dayAgo}&order=last_attempt_at.asc&limit=6`,
    ];
    const blocked = new Set(window._blockedPhones || []);
    for (const q of passes) {
      let cands = []; try { cands = await api('GET', q); } catch (e) { cands = []; }
      for (const cand of cands) {
        if (ctx.skipped.has(cand.id)) continue;
        const cust = await fetchCustomer(cand.customer_id);
        if (!cust || ph10(cust.phone).length !== 10) { await api('PATCH', `campaign_contacts?id=eq.${cand.id}`, { status: 'wrong_number', notes: 'No valid phone on file' }).catch(() => {}); continue; }
        if (blocked.has(ph10(cust.phone))) { await api('PATCH', `campaign_contacts?id=eq.${cand.id}`, { status: 'dnc' }).catch(() => {}); continue; }
        // Claim atomically: only succeeds if nobody else grabbed this customer first.
        const got = await api('PATCH', `campaign_contacts?id=eq.${cand.id}&${free}`, { claimed_by: meId(), claimed_at: now.toISOString() }).catch(() => []);
        if (!got || !got[0]) continue;
        ctx.row = got[0]; ctx.cust = cust;
        ctx.stats = await loadStats(cid).catch(() => null);
        renderCard(); return;
      }
    }
    ctx.row = null; ctx.cust = null;
    ctx.stats = await loadStats(cid).catch(() => null);
    renderDone();
  }

  function fillScript(text, c) {
    return String(text || '').replace(/\{first\}/g, c.firstName || 'there').replace(/\{me\}/g, meName()).replace(/\{company\}/g, getProfile().company || 'our company');
  }

  function progressLine() {
    const s = ctx.stats; if (!s) return '';
    return `<div class="text-sm text-muted">${s.contacted.toLocaleString()} of ${s.total.toLocaleString()} called · ${s.interested} interested · ${s.booked} booked</div>`;
  }

  function renderCard() {
    const el = root(); if (!el) return;
    const c = ctx.cust, r = ctx.row;
    const ok = canCallNow(c);
    const tomorrow10 = new Date(); tomorrow10.setDate(tomorrow10.getDate() + 1); tomorrow10.setHours(10, 0, 0, 0);
    const tz = new Date(tomorrow10 - tomorrow10.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    const btn = (status, label, icon, cls) => `<button class="btn ${cls || 'btn-secondary'}" style="padding:12px 8px" onclick="campOutcome('${status}')"><i class="ti ${icon}"></i> ${label}</button>`;
    el.innerHTML = `
      <button class="btn btn-secondary btn-sm" onclick="renderCampaigns('${ctx.rootId}')" style="margin-bottom:10px"><i class="ti ti-arrow-left"></i> Campaigns</button>
      <div style="font-weight:800;margin-bottom:2px">${esc(ctx.campaign.name)}</div>${progressLine()}
      ${ok ? (hoursOK() ? '' : `<div class="info-banner" style="margin:10px 0;background:#e3f6e8"><i class="ti ti-flask"></i><p>It's outside calling hours, but this is your own number, so calling is allowed for testing.</p></div>`)
           : `<div class="info-banner" style="margin:10px 0;background:#fff3d6"><i class="ti ti-clock"></i><p>Outside calling hours (8am to 8pm). Calling is turned off until then.</p></div>`}
      <div class="card" style="margin:12px 0">
        <div style="font-size:20px;font-weight:800">${esc(fullName(c))}</div>
        <div style="font-size:16px;margin:4px 0">${esc(fmtPhone(c.phone))}</div>
        <div class="text-sm text-muted">${esc(c.address || 'No address on file')}</div>
        <div class="text-sm text-muted" style="margin-top:4px">${c.leadSource ? 'Source: ' + esc(c.leadSource) + ' · ' : ''}${c.jobs ? c.jobs + ' past job' + (c.jobs !== 1 ? 's' : '') + ' · ' : ''}Attempt #${(r.attempts || 0) + 1}${r.notes ? ' · Last note: ' + esc(r.notes.slice(-80)) : ''}</div>
        <button class="btn btn-primary btn-full" style="margin-top:12px;padding:14px;font-size:16px" ${ok ? '' : 'disabled'} onclick="campCall()"><i class="ti ti-phone"></i> Call ${esc(c.firstName || '')}</button>
      </div>
      <details open style="margin-bottom:12px"><summary style="font-weight:700;cursor:pointer;margin-bottom:6px">Script</summary>
        <div style="white-space:pre-wrap;font-size:13px;line-height:1.45;background:#f7f8fa;border-radius:10px;padding:12px">${esc(fillScript(ctx.campaign.script, c))}</div></details>
      <div class="form-group"><label class="form-label">Notes</label><textarea class="form-input" id="camp-notes" rows="2" placeholder="What did they say?"></textarea></div>
      <div class="text-sm text-muted" style="margin-bottom:6px">How did the call go?</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        ${btn('no_answer', 'No answer', 'ti-phone-off')}
        ${btn('interested', 'Interested', 'ti-thumb-up')}
        ${btn('booked', 'Booked a job', 'ti-calendar-check', 'btn-primary')}
        ${btn('not_interested', 'Not interested', 'ti-thumb-down')}
        ${btn('wrong_number', 'Wrong number', 'ti-phone-x')}
        ${btn('dnc', "Don't call again", 'ti-ban')}
      </div>
      <div style="margin-top:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <button class="btn btn-secondary" onclick="campOutcome('callback')"><i class="ti ti-clock"></i> Call back on</button>
        <input type="datetime-local" class="form-input" id="camp-cb" value="${tz}" style="flex:1;min-width:170px">
      </div>
      <button class="btn btn-secondary btn-sm" style="margin-top:14px" onclick="campSkip()">Skip for now</button>`;
  }

  function renderDone() {
    const el = root(); if (!el) return;
    el.innerHTML = `
      <button class="btn btn-secondary btn-sm" onclick="renderCampaigns('${ctx.rootId}')" style="margin-bottom:10px"><i class="ti ti-arrow-left"></i> Campaigns</button>
      <div class="card" style="text-align:center;padding:26px 16px">
        <div style="font-size:34px">✅</div>
        <div style="font-weight:800;font-size:17px;margin:6px 0">Nobody left to call right now</div>
        <div class="text-sm text-muted" style="margin-bottom:10px">Everyone has been called, is waiting for a call-back time, or is a "no answer" that gets another try tomorrow (up to ${MAX_ATTEMPTS} tries).</div>
        ${ctx.stats ? statChips(ctx.stats) : ''}
      </div>`;
  }

  window.campCall = function () {
    if (!canCallNow(ctx.cust)) { toast('⚠️ Outside calling hours (8am to 8pm)'); return; }
    callCustomer(ctx.cust.phone, ctx.cust.id);
  };

  window.campSkip = async function () {
    if (ctx.row) { ctx.skipped.add(ctx.row.id); await api('PATCH', `campaign_contacts?id=eq.${ctx.row.id}`, { claimed_by: null, claimed_at: null }).catch(() => {}); }
    campNext();
  };

  window.campOutcome = async function (status) {
    const r = ctx.row, c = ctx.cust; if (!r || !c) return;
    const note = ((document.getElementById('camp-notes') || {}).value || '').trim();
    const stamp = new Date().toLocaleDateString();
    const patch = {
      status, attempts: (r.attempts || 0) + 1, last_attempt_at: new Date().toISOString(),
      worked_by: meName(), claimed_by: null, claimed_at: null,
      notes: note ? ((r.notes ? r.notes + '\n' : '') + stamp + ': ' + note) : (r.notes || ''),
    };
    if (status === 'callback') {
      const v = (document.getElementById('camp-cb') || {}).value;
      patch.callback_at = v ? new Date(v).toISOString() : new Date(Date.now() + 86400000).toISOString();
    }
    try {
      await api('PATCH', `campaign_contacts?id=eq.${r.id}`, patch);
      if (status === 'dnc') {
        await api('POST', 'blocked_numbers?on_conflict=org_id,phone10', [{ id: newUUID(), org_id: orgId(), phone10: ph10(c.phone), reason: 'dnc' }]);
        window._blockedPhones = (window._blockedPhones || []).concat(ph10(c.phone));
        toast(`${esc(c.firstName)} is on the do-not-call list`, 4000);
      }
    } catch (e) { console.warn(e); toast('⚠️ Could not save that result. Check your connection.', 7000); return; }
    // A booked job: open the normal job form for this customer so it's captured right away.
    if (status === 'booked' && typeof openNewJobForCustomer === 'function') { try { openNewJobForCustomer(c.id); } catch (e) {} }
    campNext();
  };
})();
