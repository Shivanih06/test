/* =============================================
   HaulPro PWA v2 — app.js
   Real SMS (Twilio) + Email (EmailJS)
   ============================================= */

// ─── STATE ───────────────────────────────────
const State = {
  screen: 'dashboard',
  modal: null,
  editingJob: null,
  editingCustomer: null,
  editingInvoice: null,
  viewingCustomer: null,
  activeInvoiceId: null,
  selectedDay: toISO(new Date()),
  msgTab: 'sms',
};

// ─── STORAGE ─────────────────────────────────
const DB = {
  get(key, def) {
    try { const v = localStorage.getItem('hp2_' + key); return v ? JSON.parse(v) : def; } catch { return def; }
  },
  set(key, val) {
    try { localStorage.setItem('hp2_' + key, JSON.stringify(val)); } catch {}
  },
};

// ─── SEED DATA ────────────────────────────────
// ─── DATA LAYER HELPERS ─────────────────────
// These wrap CloudDS when logged in, fall back to localStorage DS
async function asyncGetCustomers()  { return window._useCloud ? CloudDS.getCustomers()  : getCustomers(); }
async function asyncGetJobs()       { return window._useCloud ? CloudDS.getJobs()       : getJobs(); }
async function asyncGetJobsForDate(d){ return window._useCloud ? CloudDS.getJobsForDate(d) : jobsForDate(d); }
async function asyncGetInvoices()   { return window._useCloud ? CloudDS.getInvoices()   : getInvoices(); }
async function asyncGetEstimates()  { return window._useCloud ? CloudDS.getEstimates()  : getEstimates(); }
async function asyncGetEmployees()  { return window._useCloud ? CloudDS.getEmployees()  : getEmployees(); }
async function asyncGetMessages()   { return window._useCloud ? CloudDS.getMessages()   : getMessages(); }
async function asyncGetProfile()    { return window._useCloud ? CloudDS.getProfile()    : getProfile(); }
async function asyncSaveCustomer(c) { return window._useCloud ? CloudDS.saveCustomer(c) : saveCustomer(c); }
async function asyncSaveJob(j)      { return window._useCloud ? CloudDS.saveJob(j)      : saveJob(j); }
async function asyncSaveInvoice(i)  { return window._useCloud ? CloudDS.saveInvoice(i)  : saveInvoice(i); }
async function asyncSaveEstimate(e) { return window._useCloud ? CloudDS.saveEstimate(e) : saveEstimateData(e); }
async function asyncDeleteCustomer(id){ if (window._useCloud && window.CloudDS) { try { await CloudDS.deleteCustomer(id); } catch(e){ console.warn('cloud customer delete:', e); } } try { deleteCustomer(id); } catch(e){} }
async function asyncDeleteJob(id)   { if (window._useCloud && window.CloudDS) { try { await CloudDS.deleteJob(id); } catch(e){ console.warn('cloud job delete:', e); } } try { deleteJob(id); } catch(e){} }
async function asyncLogMessage(m){
  logMessage(m); // always write locally first, so it shows up the instant you send it
  if (window._useCloud && window.CloudDS && CloudDS.logMessage) {
    try { await CloudDS.logMessage(m); } catch(e){ console.warn('Cloud message log failed:', e); }
  }
}

function seedData() {
  return; // Real accounts start empty — demo data seeding disabled for production.
  if (DS.get('seeded')) return;
  const today = toISO(new Date());
  DS.set('customers', [
    { id:'c1', firstName:'Mike',   lastName:'Thompson', phone:'4075550143', email:'mike.t@email.com',   address:'1234 Oak St, Ocoee FL 34761',         notes:'Gate code: 1234', points:840,  jobs:4, totalSpent:840,  since:'2024-03-10' },
    { id:'c2', firstName:'Sarah',  lastName:'Chen',     phone:'4075550267', email:'sarah.c@email.com',  address:'789 Maple Ave, Winter Garden FL 34787',notes:'',               points:420,  jobs:2, totalSpent:420,  since:'2024-11-05' },
    { id:'c3', firstName:'Robert', lastName:'Garcia',   phone:'3215550198', email:'rgarcia@email.com',  address:'456 Pine Blvd, Clermont FL 34711',     notes:'3 bedrooms',     points:100,  jobs:1, totalSpent:100,  since:'2025-01-20' },
    { id:'c4', firstName:'Dana',   lastName:'Whitfield',phone:'4075550319', email:'dana.w@email.com',   address:'22 Lakeview Dr, Windermere FL 34786',  notes:'Referral: Mike', points:1240, jobs:7, totalSpent:1240, since:'2023-09-15' },
    { id:'c5', firstName:'James',  lastName:'Porter',   phone:'3215550411', email:'jporter@email.com',  address:'88 Citrus Way, Apopka FL 32703',       notes:'',               points:210,  jobs:2, totalSpent:210,  since:'2025-04-01' },
  ]);
  DS.set('jobs', [
    { id:'j1', customerId:'c1', date:today,           time:'09:00', service:'Full Truck Load',      address:'1234 Oak St, Ocoee FL',           notes:'Living room furniture',   price:280, status:'done',       paid:true  },
    { id:'j2', customerId:'c2', date:today,           time:'14:00', service:'Furniture + Appliances',address:'789 Maple Ave, Winter Garden FL', notes:'3 sofas, refrigerator',  price:590, status:'inprogress', paid:false },
    { id:'j3', customerId:'c3', date:today,           time:'17:30', service:'Estate Cleanout',      address:'456 Pine Blvd, Clermont FL',      notes:'Full 3-bedroom estate',   price:0,   status:'scheduled',  paid:false },
    { id:'j4', customerId:'c4', date:addDays(today,1),time:'10:00', service:'Half Truck Load',      address:'22 Lakeview Dr, Windermere FL',   notes:'',                        price:220, status:'scheduled',  paid:false },
    { id:'j5', customerId:'c1', date:addDays(today,1),time:'14:30', service:'Appliance Removal',    address:'1234 Oak St, Ocoee FL',           notes:'2 washing machines',      price:150, status:'scheduled',  paid:false },
  ]);
  DS.set('invoices', [
    { id:'inv1', jobId:'j1', customerId:'c1', date:today, items:[{desc:'Full Truck Load',qty:1,price:280},{desc:'Dump fee',qty:1,price:35},{desc:'Gold discount (10%)',qty:1,price:-28}], status:'paid' },
    { id:'inv2', jobId:'j2', customerId:'c2', date:today, items:[{desc:'Furniture Removal',qty:1,price:320},{desc:'Appliance Disposal',qty:1,price:180},{desc:'Dump fee',qty:1,price:75},{desc:'Silver discount (5%)',qty:1,price:-28}], status:'unpaid' },
    { id:'inv3', jobId:'j3', customerId:'c3', date:today, items:[], status:'draft' },
  ]);
  DS.set('messages', [
    { id:'m1', customerId:'c1', text:'Hi Mike! Heading your way now — Jake from HaulPro 🚛', sent:'9:47 AM', type:'sms', date:today },
    { id:'m2', customerId:'c2', text:'Hi Sarah! Your job today at 2:00 PM is confirmed. See you soon! — HaulPro', sent:'8:30 AM', type:'email', date:today },
  ]);
  DS.set('profile', {
    name:'Matt', company:'Junk Genies',
    phone:'', email:'', initials:'MG',
    smsReminders:true, autoInvoice:true, rewardsEnabled:true,
    // Messaging keys — user fills these in Settings
    twilioAccountSid:'',
    twilioAuthToken:'',
    twilioFromPhone:'',
    emailjsServiceId:'',
    emailjsTemplateId:'',
    emailjsPublicKey:'',
    emailjsFromName:'',
  });
  DS.set('seeded', true);
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00'); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10);
}

// ─── DATA HELPERS ─────────────────────────────
const getCustomers = () => DS.getCustomers();
const getJobs      = () => DS.getJobs();
const getInvoices  = () => DS.getInvoices();
const getMessages  = () => DS.getMessages();
const getProfile   = () => DS.getProfile();

// ════════════════════════════════════════
//  PLANS / PAYWALL
//  Single source of truth for tiers + limits.
//  In production, `plan` is set by the Stripe webhook after checkout;
//  setPlan()/addSeat() below are the owner/admin + testing entry points.
// ════════════════════════════════════════
const PLANS = {
  starter: { id:'starter', name:'Starter', employees:1,  price:0   },
  pro:     { id:'pro',     name:'Pro',     employees:5,  price:0   },
  promax:  { id:'promax',  name:'Pro Max', employees:15, price:0   },
};
const EXTRA_SEAT_PRICE = 29.99; // per additional employee, per month
const REPORTS_PRICE = 29.99;    // Reports add-on, per month

// Reports is a paid add-on. Unlocked by the add-on flag, or bundled into Pro / Pro Max.
function reportsEnabled(p) {
  p = p || getProfile();
  return !!p.reportsAddon || p.plan === 'pro' || p.plan === 'promax';
}
function reportsPreviewInner() {
  const bars = [42,68,55,80,92,63,74];
  return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
      <div class="card" style="margin:0"><div class="text-sm text-muted">Revenue</div><div style="font-size:22px;font-weight:800">$12,480</div></div>
      <div class="card" style="margin:0"><div class="text-sm text-muted">Jobs done</div><div style="font-size:22px;font-weight:800">37</div></div>
    </div>
    <div class="card" style="margin:0 0 10px"><div class="text-sm text-muted" style="margin-bottom:8px">Revenue by month</div>
      <div style="display:flex;align-items:flex-end;gap:6px;height:80px">
        ${bars.map(h=>`<div style="flex:1;background:var(--primary);border-radius:4px 4px 0 0;height:${h}%"></div>`).join('')}
      </div>
    </div>
    <div class="card" style="margin:0"><div class="text-sm text-muted">Close rate</div><div style="font-size:22px;font-weight:800">78%</div></div>`;
}
function reportsLockOverlayHTML() {
  return `<div style="position:absolute;inset:0;background:rgba(247,248,251,0.55);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:22px">
      <div style="width:48px;height:48px;border-radius:50%;background:var(--primary);display:flex;align-items:center;justify-content:center"><i class="ti ti-lock" style="font-size:24px;color:#fff"></i></div>
      <div style="font-weight:800;font-size:17px;margin-top:10px">Unlock Reports</div>
      <div class="text-sm text-muted" style="margin:4px 0 14px;max-width:250px;line-height:1.4">Revenue, close rates, top services, employee performance and more — unlimited reports for your whole business.</div>
      <button class="btn btn-primary" onclick="openReportsUpgrade()" style="font-weight:800;padding:12px 22px"><i class="ti ti-sparkles"></i> Upgrade — $${REPORTS_PRICE}/mo</button>
    </div>`;
}
function dashReportsCard() {
  if (reportsEnabled()) {
    return `<div class="section-label">Reports</div>
      <div class="card" onclick="showScreen('reports')" style="cursor:pointer;display:flex;align-items:center;justify-content:space-between;margin:0">
        <div><div style="font-weight:700">View your reports</div><div class="text-sm text-muted">Revenue, close rate, top services &amp; more</div></div>
        <i class="ti ti-chevron-right" style="color:var(--muted);font-size:20px"></i>
      </div>`;
  }
  return `<div class="section-label">Reports</div>
    <div style="position:relative;border-radius:14px;overflow:hidden">
      <div style="filter:blur(3px);opacity:0.55;pointer-events:none">${reportsPreviewInner()}</div>
      ${reportsLockOverlayHTML()}
    </div>`;
}
function openReportsUpgrade() {
  let el = document.getElementById('reports-up-overlay'); if (el) el.remove();
  el = document.createElement('div'); el.id = 'reports-up-overlay';
  el.style.cssText = 'position:fixed;inset:0;z-index:240;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;padding:20px';
  el.onclick = (e)=>{ if(e.target===el) el.remove(); };
  el.innerHTML = `
    <div style="background:#fff;border-radius:18px;padding:24px;max-width:360px;width:100%;box-shadow:0 12px 48px rgba(0,0,0,0.25)">
      <div style="text-align:center">
        <div style="width:52px;height:52px;border-radius:14px;background:var(--primary-lt);display:inline-flex;align-items:center;justify-content:center"><i class="ti ti-chart-bar" style="font-size:28px;color:var(--primary)"></i></div>
        <div style="font-size:20px;font-weight:800;margin-top:10px">Thrive Reports</div>
        <div class="text-sm text-muted" style="margin:6px 0 16px;line-height:1.5">Unlimited reports for your whole business — revenue, close rates, top services, employee performance and more.</div>
        <div style="font-size:32px;font-weight:900;line-height:1">$${REPORTS_PRICE}<span style="font-size:14px;color:var(--muted);font-weight:600">/mo</span></div>
      </div>
      <button class="btn btn-primary btn-full" style="margin-top:16px;font-weight:800" onclick="activateReports()"><i class="ti ti-sparkles"></i> Start Reports</button>
      <button class="btn btn-secondary btn-full" style="margin-top:8px" onclick="document.getElementById('reports-up-overlay').remove()">Maybe later</button>
    </div>`;
  document.body.appendChild(el);
}
async function activateReports() {
  const el = document.getElementById('reports-up-overlay'); if (el) el.remove();
  if (!(window._useCloud && window.MY_ORG_ID && window.Auth && Auth.token)) {
    toast('⚠️ Please sign in to subscribe'); return;
  }
  toast('<i class="ti ti-loader"></i> Opening secure checkout…', 9000);
  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/create-subscription`, {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${Auth.token}`, 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ tier: 'reports', orgId: window.MY_ORG_ID, returnUrl: location.origin + location.pathname }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || !data.url) { toast('⚠️ ' + (data.error || 'Could not start checkout — Reports price not set up yet.'), 6000); return; }
    window.location.href = data.url;
  } catch (e) { console.warn('Reports checkout error:', e); toast('⚠️ Checkout error — check your connection'); }
}

// After returning from the Reports checkout (?reports=1), wait for the Stripe
// webhook to flip reports_addon, then unlock. Polls a few times since the webhook
// is near-instant but not synchronous.
async function handleReturnFromReports() {
  try {
    const params = new URLSearchParams(location.search);
    if (params.get('reports') !== '1') return;
    history.replaceState({}, '', location.pathname);
    if (!(window._useCloud && window.CloudDS)) return;
    toast('<i class="ti ti-loader"></i> Activating Reports…', 9000);
    let on = false;
    for (let i = 0; i < 6 && !on; i++) {
      try { on = await CloudDS.getReportsAddon(); } catch (e) {}
      if (!on) await new Promise(r => setTimeout(r, 2000));
    }
    const p = getProfile();
    p.reportsAddon = !!on;
    if (typeof saveProfile === 'function') saveProfile(p); else DS.saveProfile(p);
    if (on) {
      toast('<i class="ti ti-check" style="color:#4ade80"></i> Reports unlocked — thank you!');
      if (typeof State !== 'undefined' && State.screen === 'reports') renderReports(); else renderDashboard();
    } else {
      toast('Payment received — Reports will unlock in a moment. Pull to refresh if needed.', 7000);
    }
  } catch (e) { console.warn('Return-from-Reports failed:', e); }
}

function currentPlan(p) {
  p = p || getProfile();
  return PLANS[p.plan] || PLANS.starter;
}
// Effective cap = tier's base employees + any purchased extra seats.
function maxEmployeesFor(p) {
  p = p || getProfile();
  return currentPlan(p).employees + (Number(p.extraSeats) || 0);
}
// Persist a plan/seat change locally AND to the cloud so it syncs across devices.
async function persistPlan(p) {
  DS.saveProfile(p);
  try { if (window._useCloud && window.CloudDS) await CloudDS.saveProfile(p); } catch(e){ console.warn('Plan cloud save failed:', e); }
}
async function setPlan(planId) {
  if (!PLANS[planId]) return;
  const p = getProfile();
  p.plan = planId;
  await persistPlan(p);
  closeModal('modal-upgrade-plan');
  toast(`<i class="ti ti-check" style="color:#4ade80"></i> Plan set to ${PLANS[planId].name}`);
  renderTeamScreen();
  if (document.getElementById('screen-settings')?.classList.contains('active')) renderSettings();
}
async function addSeat(delta) {
  const p = getProfile();
  p.extraSeats = Math.max(0, (Number(p.extraSeats) || 0) + delta);
  await persistPlan(p);
  toast(`<i class="ti ti-check" style="color:#4ade80"></i> Seats updated (${p.extraSeats} extra)`);
  renderTeamScreen();
  if (document.getElementById('modal-upgrade-plan')?.classList.contains('open')) openUpgradeModal();
}
const getCustomer  = id => DS.getCustomer(id);
const getJob       = id => DS.getJob(id);
const getInvoice   = id => DS.getInvoice(id);
const jobsForDate  = date => DS.getJobsForDate(date);
const invoiceTotal = inv => DS.invoiceTotal(inv);
const tierForPoints= pts => DS.tierForPoints(pts);
const tierDiscount = pts => DS.tierDiscount(pts);
// newId moved to datastore.js
const fmt12 = t => { if(!t||typeof t!=='string'||t.indexOf(':')<0) return 'Anytime'; const [h,m]=t.split(':').map(Number); if(isNaN(h)||isNaN(m)) return 'Anytime'; return `${h%12||12}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}`; };
const fmtDate = s => new Date(s+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
const fmtMoney = n => '$'+Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const fullName = c => c.firstName+' '+c.lastName;
const initials = c => (c.firstName[0]||'')+(c.lastName[0]||'');
const fmtPhone = p => { const d=p.replace(/\D/g,''); return d.length===10?`(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`:`+${d}`; };

const avatarColors = [
  ['#dce8fb','#1a4a8a'],['#ddf3e9','#145c2c'],['#fdeee6','#8a3000'],
  ['#f0f2f5','#4a4a5a'],['#fde8e8','#8a1a1a'],['#f3ecfd','#4a2a9a']
];
const avatarStyle = id => { const i=id.charCodeAt(id.length-1)%avatarColors.length; const [bg,tx]=avatarColors[i]; return `background:${bg};color:${tx}`; };

function statusPill(s) {
  return {
    done:       '<span class="pill pill-green"><i class="ti ti-check"></i> Completed</span>',
    inprogress: '<span class="pill pill-orange"><i class="ti ti-loader"></i> In Progress</span>',
    scheduled:  '<span class="pill pill-blue"><i class="ti ti-calendar"></i> Scheduled</span>',
    cancelled:  '<span class="pill pill-gray"><i class="ti ti-x"></i> Cancelled</span>',
    didnotgo:   '<span class="pill pill-red"><i class="ti ti-thumb-down"></i> Did Not Go</span>',
    paused:     '<span class="pill pill-gray"><i class="ti ti-player-pause"></i> Paused</span>',
  }[s] || '';
}
function invStatusPill(s) {
  return { paid:'<span class="pill pill-green">Paid</span>', unpaid:'<span class="pill pill-orange">Unpaid</span>', draft:'<span class="pill pill-gray">Draft</span>' }[s] || '';
}

function saveCustomer(c) { DS.saveCustomer(c); }
function saveJob(j)      { DS.saveJob(j); }
function saveInvoice(inv){ DS.saveInvoice(inv); }
function logMessage(m)   { DS.logMessage(m); }
function deleteJob(id)      { DS.deleteJob(id); }
function deleteCustomer(id) { DS.deleteCustomer(id); }

// ─── TOAST ────────────────────────────────────
function toast(msg, ms=2800) {
  const el = document.getElementById('toast');
  el.innerHTML = msg; el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), ms);
}

// ─── MODAL ────────────────────────────────────
function openModal(id) {
  closeAllModals();
  const el = document.getElementById(id);
  if (el) {
    el.classList.add('open');
    State.modal = id;
  }
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
  State.modal = null;
}
function closeAllModals() {
  document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
  State.modal = null;
}

// ─── NAVIGATION ──────────────────────────────
// ════════════════════════════════════════
//  ROLE-BASED ACCESS
//  Client-side gating for the UI. The database RLS (Phase 1) is the
//  real security boundary; this just shapes what each role sees.
// ════════════════════════════════════════
const ROLE_SCREENS = {
  admin:   ['dashboard','jobs','jobhistory','customers','invoices','estimates','team','timeclock','messages','reports','rewards','settings'],
  manager: ['dashboard','jobs','jobhistory','customers','invoices','estimates','team','rewards','messages'],
  tech:    ['dashboard','jobs','team'],
};
let PREVIEW_ROLE = null; // admin can preview other roles without changing their real role
function myRole()        { return PREVIEW_ROLE || window.MY_ROLE || 'tech'; }
function canSee(screen)  { return (ROLE_SCREENS[myRole()] || ROLE_SCREENS.admin).includes(screen); }

function applyRoleGating() {
  const role = myRole();
  const allowed = ROLE_SCREENS[role] || ROLE_SCREENS.admin;
  document.querySelectorAll('.nav-item').forEach(btn => {
    const screen = (btn.id || '').replace('nav-','');
    btn.style.display = allowed.includes(screen) ? '' : 'none';
  });
  const gear = document.getElementById('btn-settings-gear');
  if (gear) gear.style.display = (role === 'admin') ? '' : 'none';
  renderPreviewBanner();
}

// Account menu opened by tapping the header avatar — gives EVERY role
// (including techs) a place to see who they are and to sign out.
function openAccountMenu() {
  const existing = document.getElementById('account-menu');
  if (existing) { existing.remove(); return; } // tap again to close
  const p = (typeof getProfile === 'function') ? getProfile() : {};
  const name     = (p && p.name) || (Auth.user && Auth.user.email) || 'Account';
  const email    = (Auth.user && Auth.user.email) || (p && p.email) || '';
  const roleName = (ROLES[myRole()] || {}).name || myRole();
  const back = document.createElement('div');
  back.id = 'account-menu';
  back.style.cssText = 'position:fixed;inset:0;z-index:9998';
  back.onclick = (e) => { if (e.target === back) back.remove(); };
  back.innerHTML = `
    <div style="position:absolute;top:56px;right:14px;width:244px;background:var(--card,#fff);border:1px solid var(--border);border-radius:14px;box-shadow:0 12px 34px rgba(0,0,0,.20);overflow:hidden">
      <div style="padding:14px;border-bottom:1px solid var(--border)">
        <div style="font-weight:800;font-size:15px">${name}</div>
        ${email ? `<div style="color:var(--muted);font-size:12px;margin-top:2px;word-break:break-all">${email}</div>` : ''}
        <div style="margin-top:8px"><span style="background:rgba(127,127,127,.14);border-radius:20px;padding:2px 10px;font-size:11px;font-weight:700">${roleName}</span></div>
      </div>
      ${ myRole() === 'admin' ? `<button onclick="document.getElementById('account-menu').remove();showScreen('settings')" style="width:100%;text-align:left;padding:12px 14px;background:none;border:none;font-size:14px;cursor:pointer;display:flex;align-items:center;gap:10px;color:var(--text);font-family:inherit"><i class="ti ti-settings"></i> Settings</button>` : '' }
      <button onclick="document.getElementById('account-menu').remove();if(confirm('Sign out of Thrive?')){Auth.signOut();}" style="width:100%;text-align:left;padding:12px 14px;background:none;border:none;border-top:1px solid var(--border);font-size:14px;cursor:pointer;display:flex;align-items:center;gap:10px;color:#d03030;font-weight:700;font-family:inherit"><i class="ti ti-logout"></i> Sign Out</button>
    </div>`;
  document.body.appendChild(back);
}

function setPreviewRole(role) {
  PREVIEW_ROLE = (role === window.MY_ROLE) ? null : role;
  applyRoleGating();
  showScreen(canSee(State.screen) ? State.screen : 'dashboard');
}

function renderPreviewBanner() {
  let bar = document.getElementById('preview-banner');
  if (PREVIEW_ROLE) {
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'preview-banner';
      bar.style.cssText = 'position:sticky;top:0;z-index:400;background:#e07b10;color:white;font-size:12px;font-weight:600;text-align:center;padding:7px;display:flex;align-items:center;justify-content:center;gap:12px';
      document.body.prepend(bar);
    }
    bar.innerHTML = `<span><i class="ti ti-eye"></i> Previewing as ${(ROLES[PREVIEW_ROLE]||{}).name || PREVIEW_ROLE}</span><button onclick="setPreviewRole(window.MY_ROLE)" style="background:rgba(255,255,255,0.25);border:none;color:white;border-radius:6px;padding:3px 10px;font-size:11px;font-weight:700;cursor:pointer">Exit preview</button>`;
  } else if (bar) {
    bar.remove();
  }
}

// ═══════════════════════════════════════════════
//  DESKTOP DASHBOARD MODE
//  Everything below only ever WRITES into #desktop-shell's own elements — it never
//  touches a mobile screen/element, and CSS alone decides which shell is visible
//  (see the @media block in styles.css). All actions here (openJobDetail, sendOMWFromDetail,
//  etc.) are the exact same functions the phone app already uses.
// ═══════════════════════════════════════════════
function isDesktopMode(){ return window.matchMedia('(min-width: 1024px)').matches; }
function showDesktopScreen(name){ showScreen(name); } // sidebar buttons just reuse the real nav path
function renderDesktopScreen(name){
  if (!document.getElementById('desktop-shell')) return;
  document.querySelectorAll('.dsk-nav-item').forEach(n=>n.classList.remove('active'));
  document.getElementById('dnav-'+name)?.classList.add('active');
  const titles = {dashboard:'Dashboard', jobs:'Schedule', jobhistory:'Jobs', customers:'Customers', invoices:'Invoices', team:'Team', timeclock:'Time Clock', messages:'Messages', reports:'Reports', settings:'Settings'};
  const t = document.getElementById('dsk-topbar-title'); if (t) t.textContent = titles[name] || '';
  const content = document.getElementById('dsk-content'); if (!content) return;
  if (name === 'dashboard') { content.innerHTML = renderDesktopDashboardHTML(); return; }
  if (name === 'customers') { content.innerHTML = renderDesktopCustomersHTML(); wireDesktopTableSearch('dsk-cust-search', filterDesktopCustomers); return; }
  if (name === 'invoices')  { content.innerHTML = renderDesktopInvoicesHTML();  wireDesktopTableSearch('dsk-inv-search', filterDesktopInvoices); return; }
  if (name === 'jobs')      { content.innerHTML = renderDesktopScheduleHTML(); return; }
  if (name === 'jobhistory'){ content.innerHTML = renderDesktopJobHistoryHTML(); wireDesktopTableSearch('dsk-jh-search', filterDesktopJobHistory); return; }
  if (name === 'team')      { renderDesktopTeamHTML().then(html=>{ content.innerHTML = html; }); return; }
  if (name === 'timeclock') { renderDesktopTimeClockHTML().then(html=>{ content.innerHTML = html; initDayReportMaps(window._dskTcAllShown||[]); }); return; }
  if (name === 'messages')  { content.innerHTML = renderDesktopMessagesHTML(); return; }
  if (name === 'reports')   { content.innerHTML = renderDesktopReportsHTML(); wireDesktopReportsRange(); return; }
  if (name === 'settings')  { content.innerHTML = renderDesktopSettingsHTML(); return; }
  // Phase 1 fallback for tabs not yet desktop-native: reuse the
  // phone screen's already-rendered content, just in a wider centered column.
  const mobileScreen = document.getElementById('screen-'+name);
  content.innerHTML = mobileScreen ? `<div class="dsk-wide-wrap">${mobileScreen.innerHTML}</div>` : '';
}
function wireDesktopTableSearch(inputId, fn){
  const el = document.getElementById(inputId);
  if (el) el.oninput = () => fn(el.value);
}

// ── Desktop Customers table ──
let _dskCustSort = {key:'name', dir:1};
function filterDesktopCustomers(q){
  q = (q||'').toLowerCase();
  document.querySelectorAll('#dsk-cust-tbody tr').forEach(row=>{
    row.style.display = row.dataset.search.includes(q) ? '' : 'none';
  });
}
function sortDesktopCustomers(key){
  _dskCustSort = { key, dir: (_dskCustSort.key===key ? -_dskCustSort.dir : 1) };
  renderDesktopScreen('customers');
}

// ── Actions menu (Export / Manage Duplicates) ──
function toggleCustActionsMenu(){
  const m = document.getElementById('cust-actions-menu'); if (!m) return;
  const opening = m.style.display==='none';
  document.querySelectorAll('#cust-actions-menu').forEach(x=>x.style.display='none');
  if (opening) m.style.display='block';
}
function closeCustActionsMenu(){ const m=document.getElementById('cust-actions-menu'); if(m) m.style.display='none'; }
document.addEventListener('click', (e)=>{
  const menu = document.getElementById('cust-actions-menu');
  if (menu && menu.style.display!=='none' && !e.target.closest('#cust-actions-menu') && !e.target.closest('[onclick*="toggleCustActionsMenu"]')) menu.style.display='none';
});

function exportCustomersCsv(){
  const custs = getCustomers();
  const rows = [['Name','Phone','Email','Address','Type','Lead Source','Jobs','Lifetime Value','Points']];
  custs.forEach(c=>{
    rows.push([fullName(c), c.phone?fmtPhone(c.phone):'', c.email||'', c.address||'', (c.clientType||'residential'), c.leadSource||'', c.jobs||0, (c.totalSpent||0).toFixed(2), c.points||0]);
  });
  const csv = rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `customers_${toISO(new Date())}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 2000);
  toast('<i class="ti ti-check" style="color:#4ade80"></i> CSV downloaded');
}

// ── Manage Duplicates — groups customers who share the same phone number (the way
//    ours actually happened) or email, and lets you merge any pair together. ──
let _dskCustSubview = 'table'; // 'table' | 'duplicates'
function showDesktopManageDuplicates(){ _dskCustSubview = 'duplicates'; renderDesktopScreen('customers'); }
function showDesktopCustomersTable(){ _dskCustSubview = 'table'; renderDesktopScreen('customers'); }
function findDuplicateCustomerGroups(){
  const custs = getCustomers();
  const byPhone = {};
  custs.forEach(c=>{
    const key = (c.phone||'').replace(/\D/g,'').slice(-10);
    if (!key) return;
    (byPhone[key] = byPhone[key]||[]).push(c);
  });
  return Object.values(byPhone).filter(g=>g.length>1);
}
function renderDesktopManageDuplicatesHTML(){
  const groups = findDuplicateCustomerGroups();
  return `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
      <button class="btn btn-secondary btn-sm" onclick="showDesktopCustomersTable()"><i class="ti ti-arrow-left"></i> Back to Customers</button>
      <div class="dsk-set-title" style="margin:0">Manage Duplicates</div>
    </div>
    <div class="text-sm text-muted" style="margin-bottom:16px">Grouped by matching phone number. Select any number in a group to merge them all at once — their jobs, invoices, and messages all move to the merged record.</div>
    ${groups.length ? groups.map(g=>{
      const groupId = 'dg-'+g[0].id;
      const rows = g.map(c=>`<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">
        <input type="checkbox" class="dup-pick" data-id="${c.id}" checked style="width:18px;height:18px;accent-color:var(--primary)">
        <div class="cust-avatar" style="${avatarStyle(c.id)};width:32px;height:32px;font-size:12px;border-radius:8px">${initials(c)}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:13px">${fullName(c)}</div>
          <div class="text-sm text-muted">${c.email||'no email'} · ${c.jobs||0} job${c.jobs!==1?'s':''} · ${fmtMoney(c.totalSpent||0)} lifetime</div>
        </div>
      </div>`).join('');
      return `<div class="dsk-rpt-card" style="margin-bottom:14px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
          <span class="text-sm text-muted">${fmtPhone(g[0].phone)} — ${g.length} matching records</span>
          <button class="text-sm" style="background:none;border:none;color:var(--primary);font-weight:700;cursor:pointer" onclick="toggleAllInGroup('${groupId}')">Select/deselect all</button>
        </div>
        <div id="${groupId}">${rows}</div>
        <button class="btn btn-primary btn-sm" style="margin-top:10px" onclick="startMergeFromGroup('${groupId}')"><i class="ti ti-git-merge"></i> Merge selected</button>
      </div>`;
    }).join('') : `<div class="dsk-rpt-card"><div class="text-sm text-muted">No duplicate phone numbers found — nice and clean.</div></div>`}`;
}
function toggleAllInGroup(groupId){
  const boxes = document.querySelectorAll(`#${groupId} .dup-pick`);
  const allChecked = Array.from(boxes).every(b=>b.checked);
  boxes.forEach(b=>b.checked = !allChecked);
}
function startMergeFromGroup(groupId){
  const checked = Array.from(document.querySelectorAll(`#${groupId} .dup-pick:checked`)).map(el=>el.dataset.id);
  if (checked.length < 2) { toast('⚠️ Pick at least 2 to merge'); return; }
  openMergeCustomersSheet(checked);
}

// ── Merge N customers — a real form grid: fields that already match everywhere just
//    display plainly (nothing to choose); only fields that actually DIFFER become a
//    dropdown of the candidate values. Any number of duplicates merge in one pass. ──
function openMergeCustomersSheet(ids){
  const custs = ids.map(id=>getCustomer(id)).filter(Boolean);
  if (custs.length < 2) return;
  const fields = [
    ['firstName','First Name'], ['lastName','Last Name'],
    ['phone','Phone'], ['email','Email'],
    ['address','Address'], ['leadSource','Lead Source'],
    ['clientType','Client Type'],
  ];
  const displayVal = (key, v) => key==='phone' ? fmtPhone(v) : key==='clientType' ? (v==='commercial'?'Commercial':'Residential') : v;
  const fieldBlock = ([key,label]) => {
    const values = custs.map(c=>c[key]).filter(v=>v!=null && v!=='');
    const distinct = [...new Set(values)];
    if (!distinct.length) return '';
    if (distinct.length === 1) {
      return `<div class="mg-field">
        <div class="mg-field-label">${label}</div>
        <div class="mg-field-static">${displayVal(key, distinct[0])}</div>
        <input type="hidden" data-mgfield="${key}" value="${String(distinct[0]).replace(/"/g,'&quot;')}">
      </div>`;
    }
    return `<div class="mg-field">
      <div class="mg-field-label">${label} <span class="mg-diff-tag">differs</span></div>
      <select class="form-input" data-mgfield="${key}">
        ${distinct.map(v=>`<option value="${String(v).replace(/"/g,'&quot;')}">${displayVal(key, v)}</option>`).join('')}
      </select>
    </div>`;
  };
  const notesValues = [...new Set(custs.map(c=>c.notes).filter(v=>v))];

  const body = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
      <div style="font-size:19px;font-weight:800">Merge ${custs.length} customers</div>
      <button onclick="closeDyn('merge-cust')" style="background:none;border:none;font-size:24px;color:var(--hint);cursor:pointer;line-height:1">×</button>
    </div>
    <div class="text-sm text-muted" style="margin-bottom:16px">Fields that match everywhere are combined automatically. Only fields marked <b>differs</b> need a choice.</div>
    <div class="mg-grid">
      ${fields.map(fieldBlock).join('')}
    </div>
    ${notesValues.length ? `<div class="mg-field" style="margin-top:2px">
      <div class="mg-field-label">Notes${notesValues.length>1?' <span class="mg-diff-tag">differs</span>':''}</div>
      ${notesValues.length===1
        ? `<div class="mg-field-static">${notesValues[0]}</div><input type="hidden" data-mgfield="notes" value="${notesValues[0].replace(/"/g,'&quot;')}">`
        : `<select class="form-input" data-mgfield="notes">${notesValues.map(v=>`<option value="${v.replace(/"/g,'&quot;')}">${v.length>60?v.slice(0,60)+'…':v}</option>`).join('')}</select>`}
    </div>` : ''}
    <div class="text-sm text-muted" style="margin:14px 0 16px">Job count, lifetime value, and points from all ${custs.length} records are added together automatically.</div>
    <button class="btn btn-primary btn-full" onclick='confirmMergeCustomers(${JSON.stringify(ids)})'><i class="ti ti-git-merge"></i> Merge ${custs.length} customers</button>`;
  dynSheet('merge-cust', body, 260);
}
async function confirmMergeCustomers(ids){
  const custs = ids.map(id=>getCustomer(id)).filter(Boolean);
  if (custs.length < 2) return;
  const merged = { ...custs[0] }; // the first selected record's id is what survives
  document.querySelectorAll('[data-mgfield]').forEach(el=>{ merged[el.dataset.mgfield] = el.value; });
  merged.points     = custs.reduce((s,c)=>s+(c.points||0),0);
  merged.totalSpent = custs.reduce((s,c)=>s+(c.totalSpent||0),0);
  merged.jobs       = custs.reduce((s,c)=>s+(c.jobs||0),0);
  const sinceDates  = custs.map(c=>c.since).filter(Boolean).sort();
  merged.since      = sinceDates[0] || merged.since;

  closeDyn('merge-cust');
  toast('<i class="ti ti-loader"></i> Merging…', 8000);

  saveCustomer(merged);
  if (window._useCloud && window.CloudDS) { try { await CloudDS.saveCustomer(merged); } catch(e){ console.warn('Cloud save (merge) failed:', e); } }

  // Re-point everything from every OTHER record onto the one that survives, locally and in the cloud.
  const loserIds = custs.map(c=>c.id).filter(id=>id!==merged.id);
  [getJobs(), getInvoices()].forEach((arr, i)=>{
    arr.filter(x=>loserIds.includes(x.customerId)).forEach(x=>{
      x.customerId = merged.id;
      if (i===0) saveJob(x); else saveInvoice(x);
    });
  });
  const msgs = getMessages();
  msgs.filter(m=>loserIds.includes(m.customerId)).forEach(m=>{ m.customerId = merged.id; });
  DS.set('messages', msgs);

  if (window._useCloud) {
    for (const loserId of loserIds) {
      try { await SB.request('PATCH', `jobs?customer_id=eq.${loserId}`, { customer_id: merged.id }); } catch(e){ console.warn('Cloud re-point jobs failed:', e); }
      try { await SB.request('PATCH', `invoices?customer_id=eq.${loserId}`, { customer_id: merged.id }); } catch(e){ console.warn('Cloud re-point invoices failed:', e); }
      try { await SB.request('PATCH', `messages?customer_id=eq.${loserId}`, { customer_id: merged.id }); } catch(e){ console.warn('Cloud re-point messages failed:', e); }
    }
  }

  for (const loserId of loserIds) { await asyncDeleteCustomer(loserId); }

  toast(`<i class="ti ti-check" style="color:#4ade80"></i> ${custs.length} customers merged into one`);
  showDesktopManageDuplicates();
}
function renderDesktopCustomersHTML(){
  if (_dskCustSubview === 'duplicates') return renderDesktopManageDuplicatesHTML();
  let custs = getCustomers();
  const k = _dskCustSort.key, dir = _dskCustSort.dir;
  custs = custs.slice().sort((a,b)=>{
    let av, bv;
    if (k==='name')      { av=fullName(a).toLowerCase(); bv=fullName(b).toLowerCase(); }
    else if (k==='jobs')    { av=a.jobs||0; bv=b.jobs||0; }
    else if (k==='spent')   { av=a.totalSpent||0; bv=b.totalSpent||0; }
    else if (k==='points')  { av=a.points||0; bv=b.points||0; }
    else { av=fullName(a).toLowerCase(); bv=fullName(b).toLowerCase(); }
    return av<bv ? -1*dir : av>bv ? 1*dir : 0;
  });
  const arrow = key => _dskCustSort.key===key ? (_dskCustSort.dir===1?' ↑':' ↓') : '';
  const rows = custs.map(c=>{
    const tier = tierForPoints(c.points||0);
    const search = `${fullName(c)} ${c.phone||''} ${c.email||''}`.toLowerCase();
    return `<tr onclick="openCustomerDetail('${c.id}')" data-search="${search.replace(/"/g,'')}">
      <td><div class="dsk-td-avatar"><span class="cust-avatar" style="${avatarStyle(c.id)};width:30px;height:30px;font-size:12px;border-radius:8px">${initials(c)}</span><span>${fullName(c)}</span></div></td>
      <td>${c.phone?fmtPhone(c.phone):'—'}</td>
      <td>${c.email||'—'}</td>
      <td>${(c.clientType||'residential')==='commercial'?'Commercial':'Residential'}</td>
      <td>${c.jobs||0}</td>
      <td>${fmtMoney(c.totalSpent||0)}</td>
      <td><span style="color:${tier.color};font-weight:700">${(c.points||0).toLocaleString()} · ${tier.name}</span></td>
    </tr>`;
  }).join('');
  return `
    <div class="dsk-table-toolbar">
      <input id="dsk-cust-search" class="form-input" placeholder="Search name, phone, or email…" style="max-width:320px">
      <span class="text-sm text-muted">${custs.length} customer${custs.length!==1?'s':''}</span>
      <div style="position:relative;margin-left:8px">
        <button class="btn btn-secondary btn-sm" onclick="toggleCustActionsMenu()"><i class="ti ti-dots"></i> Actions</button>
        <div id="cust-actions-menu" style="display:none;position:absolute;right:0;top:calc(100% + 4px);background:#fff;border:1px solid var(--border);border-radius:8px;box-shadow:0 6px 20px rgba(0,0,0,0.12);min-width:180px;z-index:20;overflow:hidden">
          <button class="cust-action-item" onclick="closeCustActionsMenu();exportCustomersCsv()"><i class="ti ti-download"></i> Export CSV</button>
          <button class="cust-action-item" onclick="closeCustActionsMenu();showDesktopManageDuplicates()"><i class="ti ti-copy"></i> Manage Duplicates</button>
        </div>
      </div>
    </div>
    <table class="dsk-table">
      <thead><tr>
        <th onclick="sortDesktopCustomers('name')" style="cursor:pointer">Name${arrow('name')}</th>
        <th>Phone</th><th>Email</th><th>Type</th>
        <th onclick="sortDesktopCustomers('jobs')" style="cursor:pointer">Jobs${arrow('jobs')}</th>
        <th onclick="sortDesktopCustomers('spent')" style="cursor:pointer">Lifetime Value${arrow('spent')}</th>
        <th onclick="sortDesktopCustomers('points')" style="cursor:pointer">Points / Tier${arrow('points')}</th>
      </tr></thead>
      <tbody id="dsk-cust-tbody">${rows || `<tr><td colspan="7" style="text-align:center;color:var(--hint);padding:24px">No customers yet</td></tr>`}</tbody>
    </table>`;
}

// ── Desktop Invoices table ──
let _dskInvFilter = 'all';
let _dskInvSort = {key:'date', dir:-1};
function filterDesktopInvoices(q){
  q = (q||'').toLowerCase();
  document.querySelectorAll('#dsk-inv-tbody tr').forEach(row=>{
    row.style.display = row.dataset.search && row.dataset.search.includes(q) ? '' : 'none';
  });
}
function setDesktopInvoiceFilter(f){ _dskInvFilter = f; renderDesktopScreen('invoices'); }
function sortDesktopInvoices(key){
  _dskInvSort = { key, dir: (_dskInvSort.key===key ? -_dskInvSort.dir : 1) };
  renderDesktopScreen('invoices');
}
function renderDesktopInvoicesHTML(){
  let invs = getInvoices();
  if (_dskInvFilter === 'paid')   invs = invs.filter(i=>i.status==='paid');
  if (_dskInvFilter === 'unpaid') invs = invs.filter(i=>i.status!=='paid');
  const k = _dskInvSort.key, dir = _dskInvSort.dir;
  invs = invs.slice().sort((a,b)=>{
    let av, bv;
    if (k==='amount')    { av=invoiceTotal(a); bv=invoiceTotal(b); }
    else if (k==='customer'){ const ca=getCustomer(a.customerId), cb=getCustomer(b.customerId); av=(ca?fullName(ca):'').toLowerCase(); bv=(cb?fullName(cb):'').toLowerCase(); }
    else { av=a.date||''; bv=b.date||''; }
    return av<bv ? -1*dir : av>bv ? 1*dir : 0;
  });
  const arrow = key => _dskInvSort.key===key ? (_dskInvSort.dir===1?' ↑':' ↓') : '';
  const totalShown = invs.reduce((s,i)=>s+invoiceTotal(i),0);
  const rows = invs.map(i=>{
    const c = getCustomer(i.customerId);
    const search = `${i.id} ${c?fullName(c):''}`.toLowerCase();
    return `<tr onclick="openInvoiceDetail('${i.id}')" data-search="${search.replace(/"/g,'')}">
      <td>#${i.id.toUpperCase().slice(-6)}</td>
      <td>${c?fullName(c):'—'}</td>
      <td>${fmtDate(i.date)}</td>
      <td>${invStatusPill(i.status)}</td>
      <td style="font-weight:700">${fmtMoney(invoiceTotal(i))}</td>
    </tr>`;
  }).join('');
  return `
    <div class="dsk-table-toolbar">
      <input id="dsk-inv-search" class="form-input" placeholder="Search invoice # or customer…" style="max-width:280px">
      <div class="dsk-filter-pills">
        <button class="${_dskInvFilter==='all'?'active':''}" onclick="setDesktopInvoiceFilter('all')">All</button>
        <button class="${_dskInvFilter==='unpaid'?'active':''}" onclick="setDesktopInvoiceFilter('unpaid')">Unpaid</button>
        <button class="${_dskInvFilter==='paid'?'active':''}" onclick="setDesktopInvoiceFilter('paid')">Paid</button>
      </div>
      <span class="text-sm text-muted" style="margin-left:auto">${invs.length} invoice${invs.length!==1?'s':''} · ${fmtMoney(totalShown)}</span>
    </div>
    <table class="dsk-table">
      <thead><tr>
        <th>Invoice</th>
        <th onclick="sortDesktopInvoices('customer')" style="cursor:pointer">Customer${arrow('customer')}</th>
        <th onclick="sortDesktopInvoices('date')" style="cursor:pointer">Date${arrow('date')}</th>
        <th>Status</th>
        <th onclick="sortDesktopInvoices('amount')" style="cursor:pointer">Amount${arrow('amount')}</th>
      </tr></thead>
      <tbody id="dsk-inv-tbody">${rows || `<tr><td colspan="5" style="text-align:center;color:var(--hint);padding:24px">No invoices yet</td></tr>`}</tbody>
    </table>`;
}
function desktopStatusMeta(s){
  return ({
    scheduled: {label:'Scheduled',  dot:'var(--primary)'},
    inprogress:{label:'On My Way',  dot:'var(--orange)'},
    paused:    {label:'Paused',     dot:'var(--muted)'},
    done:      {label:'Completed',  dot:'var(--green)'},
  })[s] || {label:s, dot:'var(--muted)'};
}
// Condensed reporting strip shown above the Jobs Board on Dashboard — shares the same
// period/compare state and metrics engine as the full Reports tab, so the numbers
// always agree between the two. Respects the same Reports paywall.
function renderDesktopDashboardSummaryHTML(){
  if (!reportsEnabled()) {
    return `<div class="dsk-rpt-card" style="margin-bottom:18px;display:flex;align-items:center;justify-content:space-between;gap:14px">
      <div><div class="dsk-rpt-title">Reporting</div><div class="text-sm text-muted">Unlock revenue, close rate, and trend reporting right here on your dashboard.</div></div>
      <button class="btn btn-primary btn-sm" style="white-space:nowrap" onclick="showDesktopScreen('reports')"><i class="ti ti-lock-open"></i> Unlock Reports</button>
    </div>`;
  }
  const cur = dskPeriodBounds(_dskRptRange);
  const prevBounds = dskPrevPeriodBounds(_dskRptRange);
  const m = dskReportMetrics(cur.from, cur.to);
  const pm = prevBounds ? dskReportMetrics(prevBounds.from, prevBounds.to) : null;
  return `
    <div class="dsk-cal-toolbar" style="margin-bottom:8px;flex-wrap:wrap;row-gap:8px">
      <div class="dsk-filter-pills">
        <button class="${_dskRptRange==='month'?'active':''}" onclick="setDskRptRange('month')">This Month</button>
        <button class="${_dskRptRange==='quarter'?'active':''}" onclick="setDskRptRange('quarter')">This Quarter</button>
        <button class="${_dskRptRange==='year'?'active':''}" onclick="setDskRptRange('year')">This Year</button>
        <button class="${_dskRptRange==='all'?'active':''}" onclick="setDskRptRange('all')">All Time</button>
      </div>
      ${_dskRptRange!=='all' ? `<div class="dsk-filter-pills">
        <button class="${_dskRptCompare==='prev'?'active':''}" onclick="setDskRptCompare('prev')">vs Previous</button>
        <button class="${_dskRptCompare==='yoy'?'active':''}" onclick="setDskRptCompare('yoy')">vs Last Year</button>
      </div>`:''}
      <button class="btn btn-secondary btn-sm" style="margin-left:auto" onclick="showDesktopScreen('reports')">View Full Reports <i class="ti ti-arrow-right"></i></button>
    </div>
    <div class="dsk-kpis" style="grid-template-columns:repeat(5,1fr);margin-bottom:22px">
      ${dskKpiCard('Revenue', fmtMoney(m.revenue), m.revenue, pm?.revenue, true)}
      ${dskKpiCard('Jobs Completed', m.jobsCompleted, m.jobsCompleted, pm?.jobsCompleted, true)}
      ${dskKpiCard('Avg Ticket Size', fmtMoney(m.avgJob), m.avgJob, pm?.avgJob, true)}
      ${dskKpiCard('Close Rate', Math.round(m.closeRatePct)+'%', m.closeRatePct, pm?.closeRatePct, true)}
      ${dskKpiCard('Cancellation Rate', Math.round(m.cancelRatePct)+'%', m.cancelRatePct, pm?.cancelRatePct, false)}
    </div>`;
}

// ── Pipeline — a live snapshot of where work currently sits: estimates waiting on a
//    decision, jobs booked, invoices owed, and what's actually been collected this
//    month. Not date-range-based like the summary above — this is "right now." ──
function renderDesktopPipelineHTML(){
  const estimates = scopeJobsToRole(getJobs()).filter(j=>j.confirmed===false);
  const estValue = estimates.reduce((s,j)=>s+(j.price||0),0);
  const activeJobs = scopeJobsToRole(getJobs()).filter(j=>j.confirmed!==false && ['scheduled','inprogress','paused'].includes(j.status));
  const activeValue = activeJobs.reduce((s,j)=>s+(j.price||0),0);
  const invs = getInvoices();
  const unpaidInvs = invs.filter(i=>i.status!=='paid');
  const unpaidValue = unpaidInvs.reduce((s,i)=>s+invoiceTotal(i),0);
  const now = new Date(); const monthStart = toISO(new Date(now.getFullYear(), now.getMonth(), 1));
  const paidThisMonth = invs.filter(i=>i.status==='paid' && i.date>=monthStart);
  const paidValue = paidThisMonth.reduce((s,i)=>s+invoiceTotal(i),0);

  const stage = (label, count, value, icon, onclick) => `
    <div class="dsk-pipe-stage" onclick="${onclick}">
      <i class="ti ${icon}"></i>
      <div class="dsk-pipe-count">${count}</div>
      <div class="dsk-pipe-label">${label}</div>
      <div class="dsk-pipe-value">${fmtMoney(value)}</div>
    </div>`;

  return `
    <div class="dsk-set-subtitle" style="margin-bottom:10px">PIPELINE</div>
    <div class="dsk-pipeline">
      ${stage('Open Estimates', estimates.length, estValue, 'ti-file-description', "showDesktopScreen('jobs')")}
      <i class="ti ti-arrow-right dsk-pipe-arrow"></i>
      ${stage('Active Jobs', activeJobs.length, activeValue, 'ti-briefcase', "showDesktopScreen('jobs')")}
      <i class="ti ti-arrow-right dsk-pipe-arrow"></i>
      ${stage('Unpaid Invoices', unpaidInvs.length, unpaidValue, 'ti-file-invoice', "showDesktopScreen('invoices')")}
      <i class="ti ti-arrow-right dsk-pipe-arrow"></i>
      ${stage('Paid This Month', paidThisMonth.length, paidValue, 'ti-circle-check', "showDesktopScreen('invoices')")}
    </div>`;
}

// ── Today's Route map — every job on today's schedule, pinned. Uses Google's Static
//    Maps API with plain addresses as markers (no separate geocoding step needed),
//    same graceful "no key yet" fallback used everywhere else in the app. ──
function renderDesktopTodayMapHTML(){
  const today = toISO(new Date());
  const todayJobs = scopeJobsToRole(jobsForDate(today)).filter(j=>j.confirmed!==false && j.address && j.status!=='cancelled' && j.status!=='didnotgo');
  if (!todayJobs.length) {
    return `<div class="dsk-set-subtitle" style="margin:18px 0 10px">TODAY'S ROUTE</div><div class="dsk-rpt-card" style="margin-bottom:18px"><div class="text-sm text-muted">No jobs with an address on today's schedule.</div></div>`;
  }
  if (!window.GOOGLE_MAPS_KEY) {
    return `<div class="dsk-set-subtitle" style="margin:18px 0 10px">TODAY'S ROUTE</div><div class="dsk-rpt-card" style="margin-bottom:18px"><div class="text-sm text-muted">Add a Google Maps API key in Settings → APIs &amp; Integrations to see today's jobs pinned on a map.</div></div>`;
  }
  const capped = todayJobs.slice(0,15);
  const labelFor = i => i<9 ? String(i+1) : String.fromCharCode(65+i-9);
  const markerParams = capped.map((j,i)=>`markers=color:0x0f2d6b%7Clabel:${labelFor(i)}%7C${encodeURIComponent(j.address)}`).join('&');
  const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?size=900x280&scale=2&${markerParams}&key=${window.GOOGLE_MAPS_KEY}`;
  const dirDest = encodeURIComponent(capped[capped.length-1].address);
  const dirWaypoints = capped.slice(0,-1).map(j=>encodeURIComponent(j.address)).join('|');
  const dirUrl = `https://www.google.com/maps/dir/?api=1&destination=${dirDest}${dirWaypoints?`&waypoints=${dirWaypoints}`:''}`;
  return `
    <div style="display:flex;align-items:center;justify-content:space-between;margin:18px 0 10px">
      <div class="dsk-set-subtitle" style="margin:0">TODAY'S ROUTE — ${todayJobs.length} STOP${todayJobs.length!==1?'S':''}</div>
      <a href="${dirUrl}" target="_blank" class="btn btn-secondary btn-sm" style="text-decoration:none"><i class="ti ti-navigation"></i> Open Directions</a>
    </div>
    <div class="dsk-rpt-card" style="margin-bottom:18px;padding:0;overflow:hidden">
      <img src="${mapUrl}" style="width:100%;display:block" alt="Map of today's job locations">
    </div>`;
}

function renderDesktopDashboardHTML(){
  return renderDesktopDashboardSummaryHTML()
    + renderDesktopPipelineHTML()
    + renderDesktopTodayMapHTML()
    + `<div class="dsk-set-subtitle" style="margin-bottom:10px">TODAY'S JOBS BOARD</div>`
    + renderDesktopBoardHTML();
}
function renderDesktopBoardHTML(){
  const today = toISO(new Date());
  const todayJobs = scopeJobsToRole(jobsForDate(today)).filter(j => j.confirmed !== false);
  const doneJobs  = todayJobs.filter(j => j.status==='done');

  const cols = ['scheduled','inprogress','paused','done'];
  const byCol = {}; cols.forEach(c=>byCol[c]=[]);
  todayJobs.forEach(j => { if (byCol[j.status]) byCol[j.status].push(j); });

  const cardHTML = j => {
    const c = getCustomer(j.customerId);
    const techIds = getJobAssignees(j.id);
    const meta = desktopStatusMeta(j.status);
    return `<div class="dsk-card" style="border-left-color:${meta.dot}" onclick="openJobDetail('${j.id}')">
      <div class="dsk-card-name">${c?fullName(c):'—'}</div>
      <div class="dsk-card-sub">${fmt12(j.time)}${j.timeEnd?'–'+fmt12(j.timeEnd):''} · ${j.service||''}</div>
      ${j.price?`<div class="dsk-card-sub">${fmtMoney(j.price)}</div>`:''}
      ${techIds.length?`<div style="display:flex;align-items:center;gap:5px;margin-top:6px">
        <span style="width:16px;height:16px;border-radius:5px;background:${getTechColor(techIds[0])};color:#fff;font-size:8px;font-weight:700;display:flex;align-items:center;justify-content:center">${initialsOf(getTechName(techIds[0]))}</span>
        <span class="dsk-card-sub" style="margin-top:0">${getTechName(techIds[0])}${techIds.length>1?` +${techIds.length-1}`:''}</span>
      </div>`:''}
    </div>`;
  };

  return `
    <div class="dsk-board">
      ${cols.map(col => {
        const meta = desktopStatusMeta(col);
        const jobs = byCol[col];
        return `<div>
          <div class="dsk-col-head"><span style="width:8px;height:8px;border-radius:50%;background:${meta.dot}"></span>${meta.label}<span class="dsk-col-count">${jobs.length}</span></div>
          ${jobs.length ? jobs.map(cardHTML).join('') : `<div class="dsk-empty-col">No jobs</div>`}
        </div>`;
      }).join('')}
    </div>`;
}

function showScreen(name, opts) {
  opts = opts || {};
  if (!canSee(name)) name = 'dashboard';
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('screen-'+name)?.classList.add('active');
  document.getElementById('nav-'+name)?.classList.add('active');
  State.screen = name;
  applyRoleGating();
  renderScreen(name);
  renderDesktopScreen(name); // additive — populates the desktop shell in parallel; invisible unless in desktop mode
  // Give each screen a real URL: refreshing, bookmarking, sharing a link, and the
  // browser's back/forward buttons all now land back on the same page instead of
  // always resetting to Dashboard. Skipped when we're already responding to a
  // back/forward navigation, so we don't push a duplicate history entry.
  if (!opts.fromPopState) {
    const newHash = '#'+name;
    if (location.hash !== newHash) { try { history.pushState({screen:name}, '', newHash); } catch(e){} }
  }
}
// Restores the right screen when the user hits back/forward.
window.addEventListener('popstate', () => {
  const name = (location.hash||'').replace('#','') || 'dashboard';
  showScreen(name, {fromPopState:true});
});
function renderScreen(name) {
  ({dashboard:renderDashboard, jobs:renderJobs, customers:()=>renderCustomers(), invoices:()=>renderInvoices(), rewards:renderRewards, settings:renderSettings, team:renderTeamScreen, reports:renderReports, estimates:()=>renderEstimates()})[name]?.();
}

// ─── DASHBOARD ───────────────────────────────
// A tech only sees jobs assigned to them; everyone else sees all.
function scopeJobsToRole(jobs) {
  if (myRole() === 'tech') {
    return window.MY_EMPLOYEE_ID ? jobs.filter(j => j.techId === window.MY_EMPLOYEE_ID || getJobAssignees(j.id).includes(window.MY_EMPLOYEE_ID)) : [];
  }
  return jobs;
}

// Active estimate "visits" for the schedule (a tech sees only their own).
function estimatesForSchedule(date) {
  let ests = getEstimates().filter(e => e.date === date && e.status !== 'converted' && e.status !== 'declined');
  if (myRole() === 'tech') {
    ests = window.MY_EMPLOYEE_ID ? ests.filter(e => e.techId === window.MY_EMPLOYEE_ID) : [];
  }
  return ests;
}

// The person to clock in as = whoever is logged in. Their matched employee
// record if we have one, otherwise a self-identity from their profile (so an
// owner/admin with no separate employee record can still clock in).
function myClockIdentity() {
  if (window.MY_EMPLOYEE_ID) {
    const e = getEmployee(window.MY_EMPLOYEE_ID);
    if (e) return e;
  }
  const p = (typeof getProfile === 'function') ? (getProfile() || {}) : {};
  const name = p.name || (Auth.user && Auth.user.email) || 'Me';
  const initials = p.initials || name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0,2).toUpperCase() || 'ME';
  const id = window.MY_EMPLOYEE_ID || (Auth.user && Auth.user.id) || 'me';
  return { id, name, initials, color: 'var(--primary)', role: window.MY_ROLE || 'tech', active: true };
}

// Reusable clock-in/out card (used on the tech dashboard + team screen).
function fmtClock(ms){
  const s = Math.max(0, Math.floor(ms/1000));
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), ss = s%60;
  const pad = n => String(n).padStart(2,'0');
  return h > 0 ? `${h}:${pad(m)}:${pad(ss)}` : `${m}:${pad(ss)}`;
}
function _tickClockTimer(){
  const el = document.getElementById('clock-live-timer');
  if (!el) return;
  const start = +new Date(el.dataset.start);
  const base  = +el.dataset.base || 0;
  el.textContent = fmtClock(base + (Date.now() - start));
}
function ensureClockTimer(){
  if (window._clockTimerWired) return;
  window._clockTimerWired = setInterval(_tickClockTimer, 1000);
}

function clockCardHTML(emp) {
  const todayEnts = getTimeEntries().filter(e => e.empId === emp.id && e.date === todayStr());
  const active    = todayEnts.find(e => e.clockIn && !e.clockOut && e.type !== 'lunch');
  const onLunch   = todayEnts.find(e => e.type === 'lunch' && e.clockIn && !e.clockOut);
  const totalMs   = todayEnts.filter(e => e.clockOut && e.type !== 'lunch')
                      .reduce((s, e) => s + (new Date(e.clockOut) - new Date(e.clockIn)), 0);
  const statusTxt   = active ? 'Clocked In' : onLunch ? 'On Lunch' : 'Clocked Out';
  const statusColor = active ? 'var(--green)' : onLunch ? 'var(--orange)' : 'var(--muted)';
  return `
    <div style="background:white;border:1px solid var(--border);border-radius:14px;padding:18px;margin-bottom:14px">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:14px">
        <div style="width:52px;height:52px;border-radius:50%;background:${emp.color};color:white;font-size:18px;font-weight:700;display:flex;align-items:center;justify-content:center">${emp.initials}</div>
        <div style="flex:1">
          <div style="font-size:17px;font-weight:800">${emp.name}</div>
          <div style="font-size:12px;font-weight:700;color:${statusColor};margin-top:2px">● ${statusTxt}</div>
        </div>
        ${active
          ? `<div style="text-align:right"><div id="clock-live-timer" data-start="${active.clockIn}" data-base="${totalMs}" style="font-size:22px;font-weight:900;color:var(--green);font-variant-numeric:tabular-nums">${fmtClock(totalMs + (Date.now() - new Date(active.clockIn)))}</div><div style="font-size:10px;color:var(--muted)">running</div></div>`
          : (totalMs > 0 ? `<div style="text-align:right"><div style="font-size:22px;font-weight:900;color:var(--primary)">${fmtElapsed(totalMs)}</div><div style="font-size:10px;color:var(--muted)">today</div></div>` : '')}
      </div>
      ${active ? `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <button class="btn btn-orange btn-full" onclick="clockOut('${emp.id}','lunch')"><i class="ti ti-coffee"></i> Lunch Break</button>
          <button class="btn btn-red btn-full" onclick="clockOut('${emp.id}','day')"><i class="ti ti-door-exit"></i> Clock Out</button>
        </div>` : onLunch ? `
        <button class="btn btn-green btn-full" onclick="clockIn('${emp.id}')"><i class="ti ti-player-play"></i> Clock Back In from Lunch</button>` : `
        <button class="btn btn-green btn-full" onclick="clockIn('${emp.id}')"><i class="ti ti-player-play"></i> Clock In</button>`}
    </div>`;
}

function renderDashboard() {
  const today = toISO(new Date());
  const isTech = myRole() === 'tech';
  const me = myClockIdentity();
  const todayJobs = scopeJobsToRole(jobsForDate(today)).filter(j => j.confirmed !== false);
  const doneJobs  = todayJobs.filter(j => j.status==='done');
  const invs      = getInvoices();
  const todayRev  = invs.filter(i => i.date===today && i.status==='paid').reduce((s,i)=>s+invoiceTotal(i),0);
  const profile   = getProfile();

  // Header date
  document.getElementById('header-date').textContent =
    new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});

  // Hero stats
  if (isTech) {
    const myHrsMs = getTimeEntries()
      .filter(e => me && e.empId === me.id && e.date === today && e.clockOut && e.type !== 'lunch')
      .reduce((s, e) => s + (new Date(e.clockOut) - new Date(e.clockIn)), 0);
    document.getElementById('dash-hero-stats').innerHTML = `
      <div class="hero-stat"><div class="hero-stat-val">${todayJobs.length}</div><div class="hero-stat-lbl">My Jobs Today</div></div>
      <div class="hero-stat"><div class="hero-stat-val">${doneJobs.length}/${todayJobs.length}</div><div class="hero-stat-lbl">Complete</div></div>
      <div class="hero-stat"><div class="hero-stat-val">${fmtElapsed(myHrsMs)}</div><div class="hero-stat-lbl">Hours Today</div></div>`;
  } else {
    document.getElementById('dash-hero-stats').innerHTML = `
      <div class="hero-stat"><div class="hero-stat-val">${fmtMoney(todayRev)}</div><div class="hero-stat-lbl">Today Revenue</div></div>
      <div class="hero-stat"><div class="hero-stat-val">${todayJobs.length}</div><div class="hero-stat-lbl">Jobs Today</div></div>
      <div class="hero-stat"><div class="hero-stat-val">${doneJobs.length}/${todayJobs.length}</div><div class="hero-stat-lbl">Complete</div></div>`;
  }

  // AI insight
  const activeJob = todayJobs.find(j=>j.status==='inprogress');
  let aiMsg = todayJobs.length
    ? `You have <strong>${todayJobs.length} job${todayJobs.length!==1?'s':''}</strong> today. ${doneJobs.length} complete, ${todayJobs.length-doneJobs.length} remaining.`
    : `No jobs scheduled today. Tap <strong>Add Job</strong> to get started.`;
  if (activeJob) {
    const c = getCustomer(activeJob.customerId);
    aiMsg = `Active job with <strong>${c?fullName(c):'a customer'}</strong>. Tap <strong>On My Way</strong> to send them an update.`;
  }
  document.getElementById('dash-ai').innerHTML = me
    ? clockCardHTML(me)
    : `<div class="info-banner"><i class="ti ti-sparkles"></i><p>${aiMsg}</p></div>`;
  if (typeof ensureClockTimer === 'function') ensureClockTimer();

  // Map pins
  const pinPositions = [
    {left:'22%',top:'30%'},{left:'60%',top:'55%'},{left:'45%',top:'75%'}
  ];
  const pinColors = ['var(--green)','var(--primary)','var(--orange)'];
  document.getElementById('map-pins').innerHTML = todayJobs.slice(0,3).map((j,i) => {
    const c = getCustomer(j.customerId);
    const pos = pinPositions[i];
    return `<div class="map-pin" style="left:${pos.left};top:${pos.top};position:absolute">
      <div class="map-pin-dot" style="background:${pinColors[i]}"><i class="ti ti-map-pin"></i></div>
      <div class="map-pin-label">${i+1}. ${c?c.firstName:'?'}</div>
    </div>`;
  }).join('');
  document.getElementById('map-subtitle').textContent =
    todayJobs.length ? `${todayJobs.length} stop${todayJobs.length!==1?'s':''} · ${todayJobs.filter(j=>j.status==='done').length} done` : 'No jobs today';

  // Jobs list
  document.getElementById('dash-jobs').innerHTML = todayJobs.length ? todayJobs.map(j => {
    const c = getCustomer(j.customerId);
    const cls = {done:'done-job',inprogress:'active-job',scheduled:'upcoming',cancelled:'cancelled',didnotgo:'cancelled',paused:'upcoming'}[j.status]||'upcoming';
    return `<div class="job-card ${cls}">
      <div class="flex-between mb-8">
        <div class="job-time">${fmt12(j.time)}${j.timeEnd?'–'+fmt12(j.timeEnd):''}${j.status==='inprogress'?' — NOW':''}</div>
        ${statusPill(j.status)}
      </div>
      <div class="job-name">${c?fullName(c):'Unknown Customer'}</div>
      <div class="job-addr"><i class="ti ti-map-pin" style="font-size:11px"></i> ${j.address}</div>
      <div class="job-type">${j.service}${j.price?` · ${fmtMoney(j.price)}`:''}</div>
      ${j.timeEnd?`<div class="text-sm text-muted"><i class="ti ti-clock" style="font-size:11px"></i> ${fmtArrivalWindow(j.time,j.timeEnd)}</div>`:''}
      ${(()=>{ const lbl=jobAssigneeLabel(j); return lbl?`<div class="text-sm" style="color:${getTechColor(getJobAssignees(j.id)[0])};font-weight:600"><i class="ti ti-user" style="font-size:11px"></i> ${lbl}</div>`:''; })()}
      <div class="job-actions">
        <button class="btn btn-primary btn-sm" onclick="openJobDetail('${j.id}')"><i class="ti ti-eye"></i> View Job</button>
        ${j.status!=='done'&&j.status!=='cancelled'?`<button class="btn btn-outline btn-sm" onclick="sendOMWFromDetail('${j.id}')"><i class="ti ti-send"></i> On My Way</button>`:''}
        <button class="btn btn-secondary btn-sm" onclick="openJobInvoice('${j.id}')"><i class="ti ti-receipt"></i> Invoice</button>
      </div>
    </div>`;
  }).join('')
  : `<div class="empty-state"><i class="ti ti-calendar-off"></i><p>No jobs today.</p><button class="btn btn-primary" onclick="openNewJob()"><i class="ti ti-plus"></i> Schedule a Job</button></div>`;

  // Reports teaser (paywalled preview unless on the Reports add-on / Pro tier)
  const dr = document.getElementById('dash-reports');
  if (dr) dr.innerHTML = dashReportsCard();
}

// ─── JOBS ────────────────────────────────────
function renderJobs() {
  const date = State.selectedDay;
  const jobs = scopeJobsToRole(jobsForDate(date));
  const baseISO = State.weekBase || State.selectedDay || toISO(new Date());
  const base = new Date(baseISO+'T12:00:00');
  const weekSun = new Date(base); weekSun.setDate(base.getDate()-base.getDay());
  const days = Array.from({length:7},(_,i)=>{const d=new Date(weekSun);d.setDate(weekSun.getDate()+i);return d;});
  const dayNames=['SUN','MON','TUE','WED','THU','FRI','SAT'];
  const weekSat=new Date(weekSun); weekSat.setDate(weekSun.getDate()+6);
  const mo=d=>d.toLocaleDateString('en-US',{month:'short'});
  const rangeLabel = mo(weekSun)===mo(weekSat) ? `${mo(weekSun)} ${weekSun.getDate()} – ${weekSat.getDate()}` : `${mo(weekSun)} ${weekSun.getDate()} – ${mo(weekSat)} ${weekSat.getDate()}`;

  const stripEl=document.getElementById('jobs-week-strip');
  stripEl.style.display='block';
  stripEl.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
      <button onclick="jobsWeekShift(-1)" style="background:none;border:none;color:var(--primary);font-size:22px;cursor:pointer;padding:2px 14px;line-height:1">‹</button>
      <div style="font-weight:700;font-size:13px">${rangeLabel}</div>
      <button onclick="jobsWeekShift(1)" style="background:none;border:none;color:var(--primary);font-size:22px;cursor:pointer;padding:2px 14px;line-height:1">›</button>
    </div>
    <div style="display:flex;gap:4px">
      ${days.map(d=>{
        const ds=toISO(d);
        const sel=ds===date?'selected':'';
        const dot=(jobsForDate(ds).length>0)&&ds!==date;
        return `<button class="day-chip ${sel}" style="flex:1" onclick="selectDay('${ds}')">
          <div class="d-name">${dayNames[d.getDay()]}</div>
          <div class="d-num">${d.getDate()}</div>
          ${dot?`<div style="width:5px;height:5px;border-radius:50%;background:var(--primary);margin:2px auto 0"></div>`:'<div style="height:9px"></div>'}
        </button>`;
      }).join('')}
    </div>`;

  const hours = ['8','9','10','11','12','13','14','15','16','17','18','19'];
  document.getElementById('jobs-schedule').innerHTML = hours.map(h=>{
    const hh = h.padStart(2,'0')+':';
    const matched  = jobs.filter(j=>j.time.startsWith(hh));
    if (!matched.length) return `<div class="sched-slot">
      <div class="sched-time">${fmt12(h+':00').replace(':00','')}</div>
      <div class="sched-bar" style="background:#f7f8fa;min-height:32px;display:flex;align-items:center"><span style="font-size:11px;color:#ccc">—</span></div>
    </div>`;
    const barHtml = (j, compact) => {
      const c=getCustomer(j.customerId);
      const unconf = j.confirmed === false;
      const bgBorder={done:`#e6f7ed;border-left:3px solid var(--green)`,inprogress:`#fef3e2;border-left:3px solid var(--orange)`,scheduled:`#e8f0fb;border-left:3px solid var(--primary)`};
      const txColor={done:'var(--green)',inprogress:'var(--orange)',scheduled:'var(--primary)'};
      const bg = unconf ? `background:#f3eefe;border-left:3px dashed #7c5cff` : `background:${bgBorder[j.status]||'#f0f2f5'}`;
      const badge = unconf ? ` <span style="font-size:8px;background:#7c5cff;color:#fff;padding:1px 4px;border-radius:4px;vertical-align:middle">EST</span>` : '';
      const tag = unconf ? '' : (j.status==='inprogress'?' ←':j.status==='done'?' ✓':'');
      const nameColor = unconf?'#6b46e5':(txColor[j.status]||'var(--text)');
      const nm = c?fullName(c):'?';
      return `<div class="sched-bar" style="${bg};cursor:pointer;${compact?'flex:1;min-width:0':''}" onclick="openJobDetail('${j.id}')">
        ${compact?`<div style="font-size:10px;color:var(--muted);font-weight:600">${fmt12(j.time)}</div>`:''}
        <div style="font-size:13px;font-weight:700;color:${nameColor};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${nm}${badge}${tag}</div>
        <div style="font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${j.service}${compact?'':' · '+(j.address||'').split(',')[0]}</div>
      </div>`;
    };
    if (matched.length === 1) {
      const j = matched[0];
      return `<div class="sched-slot"><div class="sched-time">${fmt12(j.time)}${j.timeEnd?'<br><span style="font-weight:500;opacity:.7">–'+fmt12(j.timeEnd)+'</span>':''}</div>${barHtml(j,false)}</div>`;
    }
    // Multiple jobs in the same hour → side by side
    return `<div class="sched-slot">
      <div class="sched-time">${fmt12(h+':00').replace(':00','')}</div>
      <div style="display:flex;gap:6px;flex:1;min-width:0">${matched.map(j=>barHtml(j,true)).join('')}</div>
    </div>`;
  }).join('');

  const jrEl = document.getElementById('jobs-route');
  if (jrEl) jrEl.innerHTML = '';

  // Additive — keeps the desktop Schedule tab's clone of this screen in sync (week nav,
  // day selection, etc. all funnel through renderJobs). No effect in mobile mode.
  if (typeof isDesktopMode==='function' && isDesktopMode() && State.screen==='jobs' && typeof renderDesktopScreen==='function') {
    renderDesktopScreen('jobs');
  }
}

function selectDay(d) { State.selectedDay=d; State.weekBase=d; renderJobs(); }
function jobsWeekShift(dir){
  const baseISO=State.weekBase||State.selectedDay||toISO(new Date());
  const b=new Date(baseISO+'T12:00:00'); b.setDate(b.getDate()+dir*7);
  State.weekBase=toISO(b); renderJobs();
}

// ─── CUSTOMERS ───────────────────────────────
let custFilter='';
function renderCustomers(filter) {
  if(filter!==undefined) custFilter=filter.toLowerCase();
  let custs=getCustomers();
  if(custFilter) custs=custs.filter(c=>fullName(c).toLowerCase().includes(custFilter)||c.phone.includes(custFilter)||c.email.toLowerCase().includes(custFilter));
  custs=custs.slice().sort((a,b)=>fullName(a).trim().toLowerCase().localeCompare(fullName(b).trim().toLowerCase()));
  const rowHTML=c=>{
    const tier=tierForPoints(c.points);
    return `<div class="card-inner-row" style="cursor:pointer" onclick="openCustomerDetail('${c.id}')">
          <div class="cust-avatar" style="${avatarStyle(c.id)}">${initials(c)}</div>
          <div style="flex:1">
            <div style="font-size:14px;font-weight:700">${fullName(c)}</div>
            <div class="text-sm text-muted">${c.jobs} job${c.jobs!==1?'s':''} · ${fmtPhone(c.phone)}</div>
          </div>
          <div><div class="cust-pts">${c.points.toLocaleString()} pts</div><div class="cust-tier" style="color:${tier.color}">${tier.name}</div></div>
        </div>`;
  };
  if(!custs.length){
    document.getElementById('customers-list').innerHTML=`<div class="empty-state"><i class="ti ti-users"></i><p>No customers found.</p></div>`;
    return;
  }
  // Group into A–Z sections by the first letter of the displayed name (non-letters → #)
  const groups={}, order=[];
  custs.forEach(c=>{
    const ch=(fullName(c).trim()[0]||'#').toUpperCase();
    const key=/[A-Z]/.test(ch)?ch:'#';
    if(!groups[key]){ groups[key]=[]; order.push(key); }
    groups[key].push(c);
  });
  order.sort((a,b)=> a==='#'?1 : b==='#'?-1 : a.localeCompare(b));
  document.getElementById('customers-list').innerHTML = order.map(letter=>
    `<div style="padding:14px 6px 5px;font-size:12px;font-weight:800;color:var(--hint);letter-spacing:1px">${letter}</div>
     <div class="card-flat" style="margin-bottom:8px">${groups[letter].map(rowHTML).join('')}</div>`
  ).join('');
}

function openCustomerDetail(id) {
  State.viewingCustomer=id;
  const c=getCustomer(id); if(!c) return;
  const tier=tierForPoints(c.points);
  const custJobs=getJobs().filter(j=>j.customerId===id).sort((a,b)=>b.date.localeCompare(a.date));
  document.getElementById('cust-detail-body').innerHTML = `
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">
      <div class="cust-avatar" style="width:54px;height:54px;font-size:18px;${avatarStyle(c.id)}">${initials(c)}</div>
      <div style="flex:1">
        <div style="font-size:20px;font-weight:800">${fullName(c)}</div>
        <span class="pill mt-4" style="background:transparent;border:1px solid ${tier.color};color:${tier.color}">★ ${tier.name} · ${c.points.toLocaleString()} pts</span>
      </div>
    </div>
    <div class="card" style="background:#fafbfc;margin-bottom:12px">
      <div class="inv-row"><span class="text-muted"><i class="ti ti-phone"></i> Phone</span><a href="tel:${c.phone}" style="color:var(--primary);font-weight:600">${fmtPhone(c.phone)}</a></div>
      <div class="inv-row"><span class="text-muted"><i class="ti ti-mail"></i> Email</span><a href="mailto:${c.email}" style="color:var(--primary);font-weight:600">${c.email||'—'}</a></div>
      <div class="inv-row"><span class="text-muted"><i class="ti ti-map-pin"></i> Address</span><span style="font-size:12px;text-align:right;max-width:200px">${c.address}</span></div>
      ${c.notes?`<div class="inv-row"><span class="text-muted"><i class="ti ti-notes"></i> Notes</span><span style="font-size:12px">${c.notes}</span></div>`:''}
      ${c.clientType?`<div class="inv-row"><span class="text-muted"><i class="ti ti-tag"></i> Type</span><span class="pill ${c.clientType==='commercial'?'pill-blue':'pill-green'}">${c.clientType==='commercial'?'Commercial':'Residential'}</span></div>`:''}
      ${c.leadSource?`<div class="inv-row"><span class="text-muted"><i class="ti ti-speakerphone"></i> Lead Source</span><span style="font-weight:600">${c.leadSource}</span></div>`:''}
      <div class="inv-row" style="border:none"><span class="text-muted"><i class="ti ti-calendar"></i> Since</span><span>${fmtDate(c.since)}</span></div>
    </div>
    <div class="stats-grid mb-12">
      <div class="stat-card"><div class="stat-label">Total Jobs</div><div class="stat-value">${c.jobs}</div></div>
      <div class="stat-card"><div class="stat-label">Lifetime Value</div><div class="stat-value">${fmtMoney(c.totalSpent)}</div></div>
    </div>
    ${custJobs.length?`<div class="section-label">Job History</div><div class="card-flat mb-12">${custJobs.slice(0,5).map(j=>`
      <div class="card-inner-row"><div style="flex:1"><div style="font-size:13px;font-weight:600">${j.service}</div><div class="text-sm text-muted">${fmtDate(j.date)}</div></div>
      <div style="text-align:right">${j.price?`<div style="font-weight:700">${fmtMoney(j.price)}</div>`:''} ${statusPill(j.status)}</div></div>`).join('')}</div>`:''}
    <div class="btn-grid">
      <button class="btn btn-primary btn-full" onclick="openNewJobForCustomer('${c.id}')"><i class="ti ti-calendar-plus"></i> Book Job</button>
      <button class="btn btn-secondary btn-full" onclick="openConversation('${c.id}')"><i class="ti ti-messages"></i> Conversation</button>
      <button class="btn btn-outline btn-full" onclick="openEditCustomer('${c.id}')"><i class="ti ti-edit"></i> Edit</button>
      <button class="btn btn-secondary btn-full" style="color:var(--red)" onclick="confirmDeleteCustomer('${c.id}')"><i class="ti ti-trash"></i> Delete</button>
    </div>`;
  openModal('modal-cust-detail');
}

function openEditCustomer(id) {
  State.editingCustomer=id;
  const c=id?getCustomer(id):null;
  document.getElementById('cust-form-title').textContent=c?'Edit Customer':'Add Customer';
  document.getElementById('cf-first').value=c?.firstName||'';
  document.getElementById('cf-last').value=c?.lastName||'';
  document.getElementById('cf-phone').value=c?fmtPhone(c.phone):'';
  document.getElementById('cf-phone').setAttribute('autocomplete','tel');
  document.getElementById('cf-email').value=c?.email||'';
  document.getElementById('cf-addr').value=c?.address||'';
  document.getElementById('cf-notes').value=c?.notes||'';
  closeModal('modal-cust-detail');
  openModal('modal-cust-form');
  setTimeout(() => {
    attachAutocomplete();
    populateLeadSourceDropdown(c?.leadSource||'');
    selectClientType(c?.clientType||'residential');
  }, 200);
}

async function saveCustomerForm() {
  const firstName=document.getElementById('cf-first').value.trim();
  if(!firstName){toast('⚠️ First name required');return;}
  const id=State.editingCustomer||newUUID();
  const existing=State.editingCustomer?getCustomer(id):null;
  const c = {
    id, firstName, lastName:document.getElementById('cf-last').value.trim(),
    phone:document.getElementById('cf-phone').value.replace(/\D/g,''),
    email:document.getElementById('cf-email').value.trim(),
    address:document.getElementById('cf-addr').value.trim(),
    notes:document.getElementById('cf-notes').value.trim(),
    clientType:  document.getElementById('cf-client-type')?.value || 'residential',
    leadSource:  document.getElementById('cf-lead-source')?.value || '',
    points:existing?.points||0, jobs:existing?.jobs||0,
    totalSpent:existing?.totalSpent||0, since:existing?.since||toISO(new Date()),
  };
  saveCustomer(c);
  if (window._useCloud && window.CloudDS) { try { await CloudDS.saveCustomer(c); } catch(e){ console.warn('Cloud customer save failed:', e); } }
  State.editingCustomer=null;
  closeAllModals(); renderCustomers();
  toast('<i class="ti ti-check" style="color:#4ade80"></i> Customer saved');
}

function confirmDeleteCustomer(id) {
  const c=getCustomer(id);
  if(c&&confirm(`Delete ${fullName(c)}?`)){deleteCustomer(id);closeAllModals();renderCustomers();toast('Customer deleted');}
}

// ─── INVOICES ────────────────────────────────
let invFilter='all';
function renderInvoices(filter) {
  if(filter) invFilter=filter;
  const allInvs=getInvoices();
  let invs=invFilter==='all'?[...allInvs]:allInvs.filter(i=>i.status===invFilter);
  invs=invs.sort((a,b)=>b.date.localeCompare(a.date));
  const totalInv=allInvs.reduce((s,i)=>s+invoiceTotal(i),0);
  const paidSum=allInvs.filter(i=>i.status==='paid').reduce((s,i)=>s+invoiceTotal(i),0);
  const outstanding=allInvs.filter(i=>i.status==='unpaid').reduce((s,i)=>s+invoiceTotal(i),0);
  document.getElementById('inv-summary').innerHTML=`<div class="stats-grid" style="grid-template-columns:1fr 1fr 1fr">
    <div class="stat-card"><div class="stat-label">Invoiced</div><div class="stat-value" style="font-size:17px">${fmtMoney(totalInv)}</div></div>
    <div class="stat-card"><div class="stat-label">Paid</div><div class="stat-value" style="font-size:17px;color:var(--green)">${fmtMoney(paidSum)}</div></div>
    <div class="stat-card"><div class="stat-label">Outstanding</div><div class="stat-value" style="font-size:17px;color:var(--orange)">${fmtMoney(outstanding)}</div></div>
  </div>`;
  document.getElementById('inv-filters').innerHTML=['all','unpaid','paid','draft'].map(f=>
    `<button class="btn btn-sm ${invFilter===f?'btn-primary':'btn-secondary'}" onclick="renderInvoices('${f}')">${f.charAt(0).toUpperCase()+f.slice(1)}</button>`
  ).join('');
  document.getElementById('invoices-list').innerHTML=invs.length?invs.map(inv=>{
    const c=getCustomer(inv.customerId);
    const total=invoiceTotal(inv);
    const accent=inv.status==='paid'?'var(--green)':inv.status==='unpaid'?'var(--orange)':'var(--hint)';
    const tint =inv.status==='paid'?'#e9f9ef':inv.status==='unpaid'?'#fff3e6':'#eef0f3';
    return `<div class="card" style="cursor:pointer;border-left:4px solid ${accent}" onclick="openInvoiceDetail('${inv.id}')">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="width:40px;height:40px;border-radius:10px;background:${tint};color:${accent};display:flex;align-items:center;justify-content:center;font-size:19px;flex-shrink:0"><i class="ti ti-receipt"></i></div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:700">${c?fullName(c):'?'}</div>
          <div class="text-sm text-muted">#${inv.id.toUpperCase()} · ${fmtDate(inv.date)}</div>
        </div>
        <div class="text-right">
          <div style="font-size:18px;font-weight:800">${total>0?fmtMoney(total):'—'}</div>
          ${invStatusPill(inv.status)}
        </div>
      </div>
      ${inv.status==='unpaid'?`<div class="btn-grid mt-8">
        <button class="btn btn-secondary btn-full btn-sm" onclick="event.stopPropagation();sendInvoiceToCustomer('${inv.id}')"><i class="ti ti-send"></i> Send</button>
        <button class="btn btn-green btn-full btn-sm" onclick="event.stopPropagation();markPaid('${inv.id}')"><i class="ti ti-cash"></i> Mark Paid</button>
      </div>`:''}
    </div>`;
  }).join(''):`<div class="empty-state"><i class="ti ti-receipt-off"></i><p>No invoices found.</p></div>`;
}

// Build a shareable, self-contained link to the printable customer invoice page.
function buildInvoiceLink(inv){
  const c=getCustomer(inv.customerId);
  const p=getProfile();
  const job=inv.jobId?getJob(inv.jobId):null;
  const items=(inv.items||[]).map(it=>({d:it.desc,q:it.qty||1,p:it.price||0}));
  const data={
    co:p.company||'', ph:p.phone?fmtPhone(p.phone):'', em:p.email||'', web:p.website||'',
    cust:c?fullName(c):'', caddr:(job&&job.address)||(c&&c.address)||'', cph:c&&c.phone?fmtPhone(c.phone):'',
    num:((inv.number||inv.id||'')+'').toUpperCase().replace(/^INV/,''),
    date:inv.date, status:inv.status, paidVia:inv.paidVia||'',
    items, total:invoiceTotal(inv),
  };
  let enc=btoa(unescape(encodeURIComponent(JSON.stringify(data))));
  enc=enc.replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); // base64url so texted links don't break
  const dir=location.origin+location.pathname.replace(/[^/]*$/,'');
  return dir+'invoice.html#'+enc;
}
function invNumOf(inv){ return ((inv.number||inv.id||'')+'').toUpperCase().replace(/^INV/,''); }
function openInvoiceShare(invId){
  const inv=getInvoice(invId); if(!inv) return;
  const c=getCustomer(inv.customerId);
  const canText=!!(c&&c.phone);
  const body=`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
      <div style="font-size:18px;font-weight:800">Invoice #${invNumOf(inv)}</div>
      <button onclick="closeDyn('inv-share')" style="background:none;border:none;font-size:24px;color:var(--hint);cursor:pointer;line-height:1">×</button>
    </div>
    <div style="font-size:13px;color:var(--muted);margin-bottom:16px">A clean invoice your customer can open and save as a PDF.</div>
    <button class="btn btn-primary btn-full" style="margin-bottom:8px" onclick="viewInvoiceDoc('${invId}')"><i class="ti ti-external-link"></i> Open / print invoice</button>
    ${canText?`<button class="btn btn-secondary btn-full" style="margin-bottom:8px" onclick="textInvoiceDoc('${invId}')"><i class="ti ti-message"></i> Text link to ${c.firstName}</button>`:''}
    <button class="btn btn-secondary btn-full" onclick="copyInvoiceDoc('${invId}')"><i class="ti ti-copy"></i> Copy invoice link</button>`;
  dynSheet('inv-share', body, 250);
}
function viewInvoiceDoc(invId){ const inv=getInvoice(invId); if(!inv) return; window.open(buildInvoiceLink(inv),'_blank'); }
async function textInvoiceDoc(invId){
  const inv=getInvoice(invId); if(!inv) return;
  const c=getCustomer(inv.customerId); const p=getProfile();
  if(!c||!c.phone){ toast('⚠️ No phone on file'); return; }
  const url=buildInvoiceLink(inv);
  const ok=await sendSMS(c.phone, `Hi ${c.firstName}! Here's your invoice from ${p.company||'us'}: ${url}`);
  if(ok){ closeDyn('inv-share'); toast(`<i class="ti ti-check" style="color:#4ade80"></i> Invoice link sent to ${c.firstName}`); }
}
function copyInvoiceDoc(invId){
  const inv=getInvoice(invId); if(!inv) return;
  const url=buildInvoiceLink(inv);
  try{ navigator.clipboard.writeText(url); toast('<i class="ti ti-check" style="color:#4ade80"></i> Invoice link copied'); }
  catch(e){ prompt('Copy this invoice link:', url); }
}

function openInvoiceDetail(id) {
  const inv=getInvoice(id); if(!inv) return;
  const c=getCustomer(inv.customerId);
  const p=getProfile();
  const job=inv.jobId?getJob(inv.jobId):null;
  const total=invoiceTotal(inv);
  const paid=inv.status==='paid';
  const items=inv.items||[];
  const charges=items.filter(it=>(it.price||0)>=0);
  const discounts=items.filter(it=>(it.price||0)<0);
  const subtotal=charges.reduce((s,it)=>s+(it.price||0),0);
  const discTotal=discounts.reduce((s,it)=>s+(it.price||0),0);
  const num=(inv.number||inv.id||'').toString().toUpperCase().replace(/^INV/,'');
  const contact=[p.phone?fmtPhone(p.phone):'', p.email||''].filter(Boolean).join('  ·  ');
  document.getElementById('inv-detail-body').innerHTML=`
    <!-- Letterhead -->
    <div style="background:var(--primary);color:#fff;border-radius:16px;padding:20px 20px 18px;margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
        <div style="min-width:0">
          <div style="font-size:10px;letter-spacing:2px;font-weight:800;opacity:.7">INVOICE</div>
          <div style="font-size:19px;font-weight:800;margin-top:4px;line-height:1.15">${p.company||'Your Company'}</div>
          ${contact?`<div style="font-size:11px;opacity:.78;margin-top:3px">${contact}</div>`:''}
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-size:11px;opacity:.72;font-variant-numeric:tabular-nums">#${num}</div>
          <div style="margin-top:6px"><span style="background:${paid?'rgba(74,222,128,.22)':'rgba(232,82,10,.30)'};color:${paid?'#bff3d3':'#ffc9ad'};padding:3px 11px;border-radius:999px;font-size:10px;font-weight:800;letter-spacing:1px">${paid?'PAID':'DUE'}</span></div>
        </div>
      </div>
      <div style="height:1px;background:rgba(255,255,255,.15);margin:16px 0 14px"></div>
      <div style="display:flex;justify-content:space-between;align-items:flex-end">
        <div>
          <div style="font-size:10px;letter-spacing:1px;font-weight:700;opacity:.6">${paid?'TOTAL PAID':'AMOUNT DUE'}</div>
          <div style="font-size:32px;font-weight:800;line-height:1.05;margin-top:2px">${fmtMoney(total)}</div>
        </div>
        <div style="text-align:right;font-size:11px;opacity:.75;line-height:1.5">
          <div>Issued ${fmtDate(inv.date)}</div>
          ${paid&&inv.paidVia?`<div>via ${inv.paidVia}</div>`:''}
        </div>
      </div>
    </div>

    <!-- Bill to -->
    <div class="card" style="margin-bottom:12px">
      <div style="font-size:10px;font-weight:800;color:var(--hint);letter-spacing:1px;margin-bottom:6px">BILL TO</div>
      <div style="font-weight:700;font-size:15px">${c?fullName(c):'—'}</div>
      ${c&&c.phone?`<div class="text-sm" style="color:var(--primary);font-weight:600">${fmtPhone(c.phone)}</div>`:''}
      ${(job&&job.address)||(c&&c.address)?`<div class="text-sm text-muted">${(job&&job.address)||c.address}</div>`:''}
    </div>

    <!-- Line items + breakdown -->
    <div class="card" style="padding:0;margin-bottom:12px;overflow:hidden">
      <div style="padding:11px 14px;border-bottom:1px solid var(--border);font-size:10px;font-weight:800;color:var(--hint);letter-spacing:1px">DETAILS</div>
      ${charges.length?charges.map(it=>`<div class="inv-row" style="padding:11px 14px"><span style="padding-right:10px">${it.desc||'Item'}${it.qty&&it.qty>1?` <span style="color:var(--hint);font-weight:600">×${it.qty}</span>`:''}</span><span style="font-weight:600;white-space:nowrap">${fmtMoney(it.price||0)}</span></div>`).join('')
        :`<div class="inv-row" style="padding:11px 14px;color:var(--muted)"><span>No line items yet</span><span></span></div>`}
      <div class="inv-row" style="padding:10px 14px;border-top:1px solid var(--border)"><span class="text-muted">Subtotal</span><span style="font-weight:600">${fmtMoney(subtotal)}</span></div>
      ${discounts.map(it=>`<div class="inv-row" style="padding:6px 14px 6px 14px"><span class="text-sm" style="color:var(--green)">${it.desc||'Discount'}</span><span class="text-sm" style="font-weight:600;color:var(--green);white-space:nowrap">−${fmtMoney(Math.abs(it.price||0))}</span></div>`).join('')}
      <div class="inv-row" style="padding:13px 14px;border-top:2px solid var(--border);background:#f5f6f8"><span style="font-weight:800">Total</span><span class="inv-total">${fmtMoney(total)}</span></div>
    </div>

    ${c&&c.points?`<div style="background:var(--orange-lt);border-radius:10px;padding:10px 14px;margin-bottom:12px;font-size:12px"><i class="ti ti-trophy" style="color:var(--orange);margin-right:4px"></i>${c.firstName} ${paid?'earned':'will earn'} <strong>${Math.max(0,total)} points</strong> — ${tierForPoints(c.points).name} tier</div>`:''}

    <!-- Customer-facing invoice -->
    <button class="btn btn-secondary btn-full" style="margin-bottom:8px" onclick="openInvoiceShare('${inv.id}')"><i class="ti ti-file-invoice"></i> View / share invoice</button>

    ${paid
      ? `<div style="text-align:center;padding:14px;background:#e9f9ef;border-radius:12px;color:var(--green);font-weight:700"><i class="ti ti-circle-check"></i> Paid in full${inv.paidVia?` · ${inv.paidVia}`:''}</div>`
      : `<div class="btn-grid" style="margin-bottom:8px">
          <button class="btn btn-secondary btn-full" onclick="sendInvoiceToCustomer('${inv.id}')"><i class="ti ti-send"></i> Send to Customer</button>
          <button class="btn btn-green btn-full" onclick="markPaid('${inv.id}');closeModal('modal-inv-detail')"><i class="ti ti-cash"></i> Mark Paid</button>
        </div>
        <button class="btn btn-primary btn-full" onclick="collectCardPayment('${inv.id}')"><i class="ti ti-credit-card"></i> Pay by Card</button>`
    }`;
  openModal('modal-inv-detail');
}

function openJobInvoice(jobId) {
  const inv=getInvoices().find(i=>i.jobId===jobId);
  if(inv){openInvoiceDetail(inv.id);}else{openNewInvoice(jobId);}
}

function openNewInvoice(jobId) {
  const job=jobId?getJob(jobId):null;
  const c=job?getCustomer(job.customerId):null;
  const disc=c?tierDiscount(c.points):0;
  document.getElementById('inv-job-sel').innerHTML=`<option value="">— Select Job —</option>`+
    getJobs().map(j=>{const cj=getCustomer(j.customerId);return`<option value="${j.id}" ${j.id===jobId?'selected':''}>${cj?fullName(cj):'?'} — ${j.service} (${fmtDate(j.date)})</option>`;}).join('');
  document.getElementById('inv-items-container').innerHTML=`
    <div class="card" style="background:#fafbfc;padding:12px">
      <div class="form-group"><label class="form-label">Service Description</label><input class="form-input" id="ii-desc" value="${job?.service||''}" placeholder="Description"></div>
      <div class="input-row">
        <div class="form-group"><label class="form-label">Price ($)</label><input class="form-input" id="ii-price" type="number" value="${job?.price||0}"></div>
        <div class="form-group"><label class="form-label">Qty</label><input class="form-input" id="ii-qty" type="number" value="1"></div>
      </div>
      ${disc?`<div style="font-size:12px;color:var(--green);margin-top:4px"><i class="ti ti-percentage"></i> ${(disc*100).toFixed(0)}% loyalty discount auto-applied</div>`:''}
    </div>`;
  openModal('modal-new-invoice');
}

function saveNewInvoice() {
  const jobId=document.getElementById('inv-job-sel').value;
  const job=jobId?getJob(jobId):null;
  const c=job?getCustomer(job.customerId):null;
  const desc=document.getElementById('ii-desc')?.value||'Service';
  const price=parseFloat(document.getElementById('ii-price')?.value)||0;
  const qty=parseInt(document.getElementById('ii-qty')?.value)||1;
  const disc=c?tierDiscount(c.points):0;
  const items=[{desc,qty,price:price*qty}];
  if(disc) items.push({desc:`${tierForPoints(c.points).name} loyalty discount (${(disc*100).toFixed(0)}%)`,qty:1,price:-Math.round(price*qty*disc)});
  saveInvoice({id:newId('inv'),jobId,customerId:job?.customerId||'',date:toISO(new Date()),items,status:'unpaid'});
  closeAllModals(); renderInvoices();
  toast('<i class="ti ti-check" style="color:#4ade80"></i> Invoice created');
}




// ─── SUBSCRIPTION GATE SCREEN (no active plan = no access) ───
function showSubscribeScreen() {
  let el = document.getElementById('subscribe-screen');
  if (!el) {
    el = document.createElement('div');
    el.id = 'subscribe-screen';
    el.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#0f1116;overflow:auto;display:flex;align-items:center;justify-content:center;padding:24px';
    document.body.appendChild(el);
  }
  const plans = [
    { id:'starter', name:'Starter', price:'$49',  blurb:'Solo operator', features:'1 seat · jobs, estimates, invoices, card payments, templates' },
    { id:'pro',     name:'Pro',     price:'$99',  blurb:'Growing crew',  features:'Up to 5 seats · team roles, photos, rewards, automations' },
    { id:'promax',  name:'Pro Max', price:'$199', blurb:'Full operation',features:'Up to 15 seats · AI, Google auto-posting, priority support' },
  ];
  el.innerHTML = `
    <div style="max-width:440px;width:100%;text-align:center;color:#fff;font-family:inherit">
      <div style="font-size:42px;line-height:1">🚀</div>
      <div style="font-size:23px;font-weight:800;margin-top:8px">Choose your plan</div>
      <p style="color:#b9bfce;font-size:14px;margin:8px 0 4px;line-height:1.5">Start with a <strong style="color:#fff">14-day free trial</strong> — no charge today, cancel anytime.</p>
      <div style="display:flex;flex-direction:column;gap:10px;text-align:left;margin-top:16px">
        ${plans.map(pl=>`
          <div style="background:#1b1e27;border:1px solid #2a2e3a;border-radius:14px;padding:14px 16px">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <div>
                <div style="font-weight:800;font-size:16px">${pl.name} <span style="color:#8b93a7;font-weight:600;font-size:13px">${pl.price}/mo</span></div>
                <div style="color:#8b93a7;font-size:12px">${pl.blurb}</div>
              </div>
              <button onclick="chooseSubscription('${pl.id}')" style="background:var(--primary);color:#fff;border:none;border-radius:9px;padding:9px 16px;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit">Start trial</button>
            </div>
            <div style="color:#9aa2b4;font-size:12px;margin-top:6px">${pl.features}</div>
          </div>`).join('')}
      </div>
      <button onclick="Auth.signOut()" style="background:none;border:none;color:#8b93a7;font-size:13px;cursor:pointer;font-family:inherit;margin-top:20px;text-decoration:underline">Sign out</button>
    </div>`;
  el.style.display = 'flex';
}

async function chooseSubscription(tier) {
  toast('<i class="ti ti-loader"></i> Starting your free trial…', 9000);
  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/create-subscription`, {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${Auth.token}`, 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ tier, orgId: window.MY_ORG_ID, returnUrl: location.origin + location.pathname }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || !data.url) { toast('⚠️ ' + (data.error || 'Could not start checkout — check plan setup.'), 6000); return; }
    window.location.href = data.url;
  } catch (e) { console.warn('Subscription checkout error:', e); toast('⚠️ Checkout error — check your connection'); }
}

// ─── ONBOARDING: applies signup info + GET STARTED checklist ───
const HOWTOS = {
  schedule: { title:'Schedule & dispatch jobs', mins:'1–4 min', icon:'ti-calendar-plus', video:'',
    steps:['Tap the + button at the bottom, then choose Job.','Search an existing customer or add a new one on the spot.','Pick the date on the calendar and the arrival time on the wheel.','Assign a crew member and hit Save — it lands on your Schedule.'],
    action:()=>{ closeModal('modal-onboarding'); finishOnboardingFlag(); showScreen('jobs'); if(typeof openNewJob==='function') openNewJob(); } },
  estimates: { title:'Create estimates', mins:'1–4 min', icon:'ti-clipboard', video:'',
    steps:['Tap +, then Estimate.','Add the customer and the date/time you’ll go look at the job.','On the estimate, add line items and tap Send Quote to text/email the price.','When they approve, hit Convert to Job — it becomes a real job instantly.'],
    action:()=>{ closeModal('modal-onboarding'); finishOnboardingFlag(); if(typeof openNewEstimate==='function') openNewEstimate(); } },
  payments: { title:'Get paid', mins:'1–3 min', icon:'ti-cash', video:'',
    steps:['Open a job and tap the Pay button up top.','Review the items, add any discount or tax.','Tap Take a Payment and choose how they paid (cash, card, check, Zelle).','A receipt is texted and emailed to the customer automatically.'],
    action:()=>{ closeModal('modal-onboarding'); finishOnboardingFlag(); showScreen('jobs'); } },
  reviews: { title:'Boost your reviews', mins:'1–3 min', icon:'ti-star', video:'',
    steps:['Connect your Google Business Profile in Settings → APIs.','After a job is completed, send the customer a thank-you with your review link.','Watch your Google rating climb as happy customers leave 5 stars.'],
    action:()=>{ closeModal('modal-onboarding'); finishOnboardingFlag(); showScreen('settings'); } },
};

function showOnboarding() {
  const p  = getProfile();
  const ex = window._signupExtras || DS.get('pending_signup', {}) || {};
  if (ex.company)  p.company     = ex.company;
  if (ex.name)     p.name        = ex.name;
  if (ex.phone)    p.phone       = (ex.phone+'').replace(/\D/g,'');
  if (ex.industry) p.industry    = ex.industry;
  if (ex.size)     p.companySize = ex.size;
  if (ex.website)  p.website     = ex.website;
  p.initials = (p.name || p.company || 'ME').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  DS.saveProfile(p);
  if (window._useCloud && window.CloudDS) CloudDS.saveProfile(p).catch(()=>{});
  if (typeof pushBusinessToCloud === 'function') pushBusinessToCloud();
  const av = document.getElementById('header-avatar'); if (av) av.textContent = p.initials;
  window._signupExtras = null;
  try { DS.set('pending_signup', null); } catch(e){}
  renderGetStarted();
  openModal('modal-onboarding');
}

function renderGetStarted() {
  const p = getProfile();
  const done = DS.get('gs_done', {});
  const items = [
    { key:'schedule',  label:'Schedule & dispatch jobs' },
    { key:'reviews',   label:'Boost your reviews' },
    { key:'estimates', label:'Create estimates' },
    { key:'payments',  label:'Get paid' },
  ];
  const completed = 1 + items.filter(i=>done[i.key]).length; // create account always done
  const total = items.length + 1;
  const pct = Math.round((completed/total)*100);
  document.getElementById('onboarding-body').innerHTML = `
    <div style="text-align:center;margin-bottom:6px">
      <div style="font-size:22px;font-weight:900;color:var(--primary)">Welcome to Thrive! 🎉</div>
      <div class="text-sm text-muted" style="margin-top:2px">A few quick wins to get you rolling.</div>
    </div>
    <div style="background:var(--primary-lt);border-radius:12px;padding:12px 14px;margin:12px 0;display:flex;align-items:center;justify-content:space-between;gap:10px">
      <div style="font-size:13px;font-weight:700">Pick a plan when you're ready</div>
      <button class="btn btn-primary btn-sm" onclick="closeModal('modal-onboarding');finishOnboardingFlag();showSubscribeScreen()">Choose a plan</button>
    </div>
    <div style="height:8px;background:#eef0f3;border-radius:6px;overflow:hidden;margin-bottom:6px"><div style="height:100%;width:${pct}%;background:var(--green);border-radius:6px"></div></div>
    <div class="text-sm text-muted" style="margin-bottom:12px">Progress ${completed} of ${total}</div>

    <div style="background:var(--green-lt);border-radius:12px;padding:14px 16px;display:flex;align-items:center;gap:12px;margin-bottom:10px">
      <i class="ti ti-circle-check-filled" style="font-size:22px;color:var(--green)"></i>
      <span style="font-weight:700;color:#1a7a4f">Create account</span>
    </div>
    ${items.map(i=>`
      <div onclick="openHowTo('${i.key}')" style="background:#fff;border:1px solid var(--border);border-radius:12px;padding:14px 16px;display:flex;align-items:center;gap:12px;margin-bottom:10px;cursor:pointer">
        <i class="ti ${HOWTOS[i.key].icon}" style="font-size:20px;color:${done[i.key]?'var(--green)':'var(--primary)'}"></i>
        <div style="flex:1">
          <div style="font-weight:700">${i.label}</div>
          <div style="font-size:11px;color:var(--muted)">${HOWTOS[i.key].mins}</div>
        </div>
        ${done[i.key]?'<i class="ti ti-check" style="color:var(--green)"></i>':'<i class="ti ti-chevron-right" style="color:var(--muted)"></i>'}
      </div>`).join('')}

    <button class="btn btn-secondary btn-full" style="margin-top:8px" onclick="closeModal('modal-onboarding');finishOnboardingFlag()">I'll explore on my own</button>`;
}

function openHowTo(key) {
  const h = HOWTOS[key]; if (!h) return;
  document.getElementById('onboarding-body').innerHTML = `
    <button onclick="renderGetStarted()" style="background:none;border:none;color:var(--primary);font-weight:700;cursor:pointer;font-family:inherit;font-size:14px;margin-bottom:10px"><i class="ti ti-chevron-left"></i> Get Started</button>
    <div style="font-size:20px;font-weight:800;margin-bottom:4px"><i class="ti ${h.icon}" style="color:var(--primary)"></i> ${h.title}</div>
    <div class="text-sm text-muted" style="margin-bottom:12px">${h.mins}</div>
    ${h.video
      ? `<div style="position:relative;padding-bottom:56%;height:0;border-radius:12px;overflow:hidden;margin-bottom:14px"><iframe src="${h.video}" style="position:absolute;inset:0;width:100%;height:100%;border:0" allowfullscreen></iframe></div>`
      : `<div style="background:#0b1220;border-radius:12px;height:150px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;margin-bottom:14px"><i class="ti ti-player-play" style="font-size:34px;opacity:0.8"></i><div style="font-size:12px;opacity:0.7;margin-top:6px">Walkthrough video coming soon</div></div>`}
    <div style="font-size:12px;font-weight:700;color:var(--hint);letter-spacing:0.5px;margin-bottom:8px">HOW IT WORKS</div>
    ${h.steps.map((s,i)=>`<div style="display:flex;gap:10px;margin-bottom:10px"><div style="flex-shrink:0;width:22px;height:22px;border-radius:50%;background:var(--primary);color:#fff;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center">${i+1}</div><div style="font-size:14px;line-height:1.4">${s}</div></div>`).join('')}
    <button class="btn btn-primary btn-full" style="margin-top:8px" onclick="markHowToDone('${key}')"><i class="ti ti-arrow-right"></i> Do it now</button>`;
}

function markHowToDone(key) {
  const done = DS.get('gs_done', {}); done[key] = true; DS.set('gs_done', done);
  const h = HOWTOS[key];
  if (h && typeof h.action === 'function') h.action();
}

function finishOnboardingFlag() {
  const p = getProfile(); p.onboarded = true; DS.saveProfile(p);
  if (window._useCloud && window.CloudDS) CloudDS.saveProfile(p).catch(()=>{});
}

// ═══════════════════════════════════════════════
//  WELCOME LANDING + MULTI-STEP SIGNUP WIZARD
// ═══════════════════════════════════════════════
const LOGIN_GRADIENT = 'linear-gradient(135deg,#0f2d6b 0%,#1a4a8a 50%,#00a86b 100%)';
let Signup = null;
const INDUSTRIES = ['Junk Removal','Dumpster Rental','Hauling','Moving','Demolition','Landscaping & Lawn','Cleaning','General Contractor','Handyman','Other'];
const COMPANY_SIZES = [['solo','Owner operator','ti-user'],['2-5','2–5 employees','ti-users'],['6-10','6–10 employees','ti-users-group'],['11+','11+ employees','ti-building']];

function renderWelcome() {
  const el = document.getElementById('login-screen');
  el.style.display = 'flex';
  el.style.background = LOGIN_GRADIENT;
  el.innerHTML = `
    <div style="width:100%;max-width:380px;padding:32px 24px;text-align:center;color:#fff">
      <div style="font-size:46px;font-weight:900;letter-spacing:-1px">Thrive</div>
      <div style="font-size:13px;opacity:0.85;margin-top:4px;margin-bottom:42px">Powering Your Business</div>
      <div style="font-size:26px;font-weight:800;line-height:1.3;margin-bottom:40px">The all-in-one app for junk &amp; dumpster pros</div>
      <button class="btn btn-full" style="background:#fff;color:var(--primary);font-weight:800;padding:15px;margin-bottom:12px" onclick="startSignup()">Create an account</button>
      <button class="btn btn-full" style="background:transparent;color:#fff;border:1.5px solid rgba(255,255,255,0.6);font-weight:700;padding:15px" onclick="renderLoginPage('signin')">Sign in</button>
    </div>`;
}

function startSignup() {
  Signup = { step:'fork', fork:'', data:{ firstName:'',lastName:'',phone:'',industry:'',size:'',company:'',website:'',email:'',password:'' } };
  renderSignupStep();
}

function suCapture() {
  const map = {'su-first':'firstName','su-last':'lastName','su-phone':'phone','su-company':'company','su-website':'website','su-email':'email','su-password':'password'};
  Object.keys(map).forEach(id => { const el=document.getElementById(id); if(el) Signup.data[map[id]] = el.value; });
}
function suErr(msg){ const e=document.getElementById('su-error'); if(e) e.textContent=msg||''; }

const SU_STEPS = ['profile','industry','size','company','login'];
function suStepIndex(){ return SU_STEPS.indexOf(Signup.step); }
function suNext(){
  suCapture();
  if (Signup.step==='profile' && !Signup.data.firstName.trim()) { suErr('Enter your name'); return; }
  if (Signup.step==='industry' && !Signup.data.industry) { suErr('Pick what you do'); return; }
  if (Signup.step==='size' && !Signup.data.size) { suErr('Pick your company size'); return; }
  if (Signup.step==='company' && !Signup.data.company.trim()) { suErr('Enter your company name'); return; }
  const i = suStepIndex();
  if (i < SU_STEPS.length-1) { Signup.step = SU_STEPS[i+1]; renderSignupStep(); }
}
function suBack(){
  suCapture();
  if (Signup.step==='fork' || Signup.step==='profile' || Signup.fork==='employee') { renderWelcome(); return; }
  const i = suStepIndex();
  if (i>0) { Signup.step = SU_STEPS[i-1]; renderSignupStep(); }
}

function suShell(progress, title, inner, footer){
  const el = document.getElementById('login-screen');
  el.style.display='flex';
  el.style.background='#f7f8fb';
  el.innerHTML = `
    <div style="width:100%;max-width:420px;min-height:100vh;background:#f7f8fb;display:flex;flex-direction:column">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 18px">
        <button onclick="suBack()" style="background:none;border:none;color:var(--primary);font-size:26px;cursor:pointer;line-height:1">‹</button>
        <div style="font-weight:800">Thrive</div>
        <button onclick="renderWelcome()" style="background:none;border:none;color:var(--muted);font-size:22px;cursor:pointer;line-height:1">×</button>
      </div>
      <div style="height:5px;background:#e5e8ee;border-radius:4px;margin:0 18px"><div style="height:100%;width:${progress}%;background:var(--primary);border-radius:4px;transition:width .2s"></div></div>
      <div style="padding:24px 18px;flex:1">
        <div style="font-size:24px;font-weight:800;text-align:center;margin-bottom:24px">${title}</div>
        ${inner}
        <div id="su-error" style="color:var(--red);font-size:12px;text-align:center;margin-top:12px;min-height:16px"></div>
      </div>
      ${footer||''}
    </div>`;
}
function suNextBtn(label, onclick){
  return `<div style="padding:14px 18px"><button class="btn btn-primary btn-full" id="su-submit" style="padding:15px;font-weight:800" onclick="${onclick||'suNext()'}">${label||'Next'}</button></div>`;
}

function renderSignupStep(){
  const d = Signup.data;
  if (Signup.step==='fork') {
    suShell(12, 'How will you use Thrive?', `
      <div onclick="suFork('business')" style="background:#fff;border:1.5px solid var(--border);border-radius:14px;padding:22px;margin-bottom:14px;cursor:pointer;text-align:center">
        <i class="ti ti-building-store" style="font-size:32px;color:var(--primary)"></i>
        <div style="font-weight:800;font-size:16px;margin-top:8px">Start a business account</div>
        <div class="text-sm text-muted">I own or run the company</div>
      </div>
      <div onclick="suFork('employee')" style="background:#fff;border:1.5px solid var(--border);border-radius:14px;padding:22px;cursor:pointer;text-align:center">
        <i class="ti ti-users" style="font-size:32px;color:var(--primary)"></i>
        <div style="font-weight:800;font-size:16px;margin-top:8px">Join a team</div>
        <div class="text-sm text-muted">My employer invited me</div>
      </div>`);
    return;
  }
  if (Signup.fork==='employee') { renderEmployeeJoin(); return; }
  if (Signup.step==='profile') {
    suShell(28, 'Create your profile', `
      <div class="form-group"><input class="form-input" id="su-first" placeholder="First name" value="${(d.firstName||'').replace(/"/g,'&quot;')}"></div>
      <div class="form-group"><input class="form-input" id="su-last" placeholder="Last name" value="${(d.lastName||'').replace(/"/g,'&quot;')}"></div>
      <div class="form-group"><input class="form-input" id="su-phone" placeholder="Mobile phone number" inputmode="tel" value="${(d.phone||'').replace(/"/g,'&quot;')}"></div>`,
      suNextBtn('Next'));
    return;
  }
  if (Signup.step==='industry') {
    suShell(44, 'What do you do?', `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        ${INDUSTRIES.map(ind=>`<div onclick="suPickIndustry('${ind.replace(/'/g,"\\'")}')" style="background:#fff;border:1.5px solid ${d.industry===ind?'var(--primary)':'var(--border)'};border-radius:12px;padding:16px 8px;text-align:center;cursor:pointer;font-weight:700;font-size:13px">${ind}</div>`).join('')}
      </div>`,
      suNextBtn('Next'));
    return;
  }
  if (Signup.step==='size') {
    suShell(60, "What's the size of your company?", `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        ${COMPANY_SIZES.map(([v,lbl,icon])=>`<div onclick="suPickSize('${v}')" style="background:#fff;border:1.5px solid ${d.size===v?'var(--primary)':'var(--border)'};border-radius:12px;padding:20px 8px;text-align:center;cursor:pointer"><i class="ti ${icon}" style="font-size:22px;color:var(--primary)"></i><div style="font-weight:700;font-size:13px;margin-top:6px">${lbl}</div></div>`).join('')}
      </div>`,
      suNextBtn('Next'));
    return;
  }
  if (Signup.step==='company') {
    suShell(76, "What's your company name?", `
      <div class="form-group"><input class="form-input" id="su-company" placeholder="Company name" value="${(d.company||'').replace(/"/g,'&quot;')}"></div>
      <div class="form-group"><input class="form-input" id="su-website" placeholder="Website (optional)" value="${(d.website||'').replace(/"/g,'&quot;')}"></div>`,
      suNextBtn('Next'));
    return;
  }
  if (Signup.step==='login') {
    suShell(92, 'Create your login', `
      <div class="form-group"><input class="form-input" id="su-email" type="email" placeholder="Email" inputmode="email" value="${(d.email||'').replace(/"/g,'&quot;')}"></div>
      <div class="form-group"><input class="form-input" id="su-password" type="password" placeholder="Password" oninput="suPwCheck(this.value)" value="${d.password||''}"></div>
      <div id="su-pwreqs" style="font-size:12px;color:var(--muted);margin-top:8px;line-height:1.9">
        <div data-req="len"><i class="ti ti-circle"></i> 8+ characters</div>
        <div data-req="upper"><i class="ti ti-circle"></i> One uppercase letter</div>
        <div data-req="num"><i class="ti ti-circle"></i> One number</div>
      </div>`,
      suNextBtn('Start free trial','submitSignup()'));
    setTimeout(()=>suPwCheck(d.password||''),20);
    return;
  }
}
function suFork(f){ Signup.fork=f; Signup.step = (f==='employee') ? 'employee' : 'profile'; renderSignupStep(); }
function suPickIndustry(ind){ suCapture(); Signup.data.industry=ind; renderSignupStep(); }
function suPickSize(v){ suCapture(); Signup.data.size=v; renderSignupStep(); }
function suPwCheck(v){
  v = v||'';
  const set=(req,ok)=>{ const el=document.querySelector('#su-pwreqs [data-req="'+req+'"] i'); if(el){ el.className = ok?'ti ti-circle-check-filled':'ti ti-circle'; el.style.color = ok?'var(--green)':''; } };
  set('len', v.length>=8); set('upper', /[A-Z]/.test(v)); set('num', /[0-9]/.test(v));
}
function renderEmployeeJoin(){
  suShell(50, 'Join your team', `
    <div style="background:#fff;border:1px solid var(--border);border-radius:12px;padding:20px;text-align:center;margin-bottom:16px">
      <i class="ti ti-mail" style="font-size:30px;color:var(--primary)"></i>
      <div style="font-weight:700;margin-top:8px">Your employer sends you an invite</div>
      <div class="text-sm text-muted" style="margin-top:6px;line-height:1.5">Ask your manager to add you as an employee in Thrive. You'll get a text/email link to set your password and join the team.</div>
    </div>
    <div class="text-sm text-muted" style="text-align:center">Already set your password from an invite?</div>`,
    suNextBtn('Sign in',"renderLoginPage('signin')"));
}

async function submitSignup(){
  suCapture();
  const d = Signup.data;
  suErr('');
  if (!d.email.trim()) { suErr('Enter your email'); return; }
  if (!d.password || d.password.length<8) { suErr('Password must be at least 8 characters'); return; }
  if (!/[A-Z]/.test(d.password) || !/[0-9]/.test(d.password)) { suErr('Password needs an uppercase letter and a number'); return; }
  const btn = document.getElementById('su-submit'); if(btn){ btn.disabled=true; btn.textContent='Creating account…'; }
  const fullName = `${d.firstName} ${d.lastName}`.trim();
  window._signupExtras = { phone:(d.phone||'').replace(/\D/g,''), industry:d.industry, size:d.size, website:d.website, name:fullName, company:d.company };
  try { DS.set('pending_signup', window._signupExtras); } catch(e){}
  try {
    await Auth.signUp(d.email.trim(), d.password, fullName, d.company.trim());
    await initApp();
  } catch(e){
    suErr(e.message || 'Something went wrong — try again');
    if(btn){ btn.disabled=false; btn.textContent='Start free trial'; }
  }
}

function saveOnboarding() {
  const p = getProfile();
  const company = document.getElementById('ob-company')?.value.trim();
  const phone   = document.getElementById('ob-phone')?.value.replace(/\D/g,'');
  if (company) p.company = company;
  if (phone)   p.phone = phone;
  p.onboarded = true;
  p.initials = (p.name || p.company || 'ME').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  DS.saveProfile(p);
  if (window._useCloud && window.CloudDS) CloudDS.saveProfile(p).catch(()=>{});
  if (typeof pushBusinessToCloud === 'function') pushBusinessToCloud();
  const av = document.getElementById('header-avatar'); if (av) av.textContent = p.initials;
  closeModal('modal-onboarding');
  toast("<i class='ti ti-check' style='color:#4ade80'></i> You're all set!");
  if (typeof State !== 'undefined' && typeof renderScreen === 'function') renderScreen(State.screen);
}

function skipOnboarding() {
  const p = getProfile();
  p.onboarded = true;
  DS.saveProfile(p);
  if (window._useCloud && window.CloudDS) CloudDS.saveProfile(p).catch(()=>{});
  closeModal('modal-onboarding');
}

// ─── STRIPE PAYMENTS ─────────────────────────
async function collectCardPayment(invId) {
  const inv = getInvoice(invId); if (!inv) return;
  const c = getCustomer(inv.customerId);
  const total = invoiceTotal(inv);
  if (total < 0.5) { toast('⚠️ Invoice total must be at least $0.50'); return; }
  toast('<i class="ti ti-loader"></i> Creating secure payment…', 8000);
  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout`, {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${Auth.token}`, 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        amount:       Math.round(total * 100),
        description:  `Invoice #${inv.id.toUpperCase()} — ${getProfile().company || ''}`.trim(),
        kind:         'invoice',
        refId:        inv.id,
        orgId:        window.MY_ORG_ID,
        customerName: c ? fullName(c) : '',
        returnUrl:    location.origin + location.pathname,
      }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || !data.url) { toast('⚠️ ' + (data.error || 'Could not start payment. Check Stripe setup.'), 6000); return; }
    showPaymentOptions('invoice', inv.id, data.url, c);
  } catch (e) { console.warn('Payment error:', e); toast('⚠️ Payment error — check your connection'); }
}

function showPaymentOptions(kind, refId, url, c) {
  const hasPhone = !!(c && c.phone);
  document.getElementById('pay-options-body').innerHTML = `
    <div class="info-banner" style="margin-bottom:14px"><i class="ti ti-lock"></i><p>Secure payment powered by Stripe. Choose how to collect:</p></div>
    <button class="btn btn-primary btn-full" style="margin-bottom:10px" onclick="window.location.href='${url}'"><i class="ti ti-device-mobile"></i> Pay on this device now</button>
    ${hasPhone ? `<button class="btn btn-green btn-full" style="margin-bottom:10px" onclick="textPaymentLinkGeneric('${kind}','${refId}','${encodeURIComponent(url)}')"><i class="ti ti-message"></i> Text link to ${c.firstName}</button>` : ''}
    <button class="btn btn-secondary btn-full" onclick="copyPaymentLink('${encodeURIComponent(url)}')"><i class="ti ti-copy"></i> Copy payment link</button>`;
  if (kind === 'invoice') closeModal('modal-inv-detail');
  else closeModal('modal-take-payment');
  openModal('modal-pay-options');
}

async function textPaymentLinkGeneric(kind, refId, encUrl){
  const url = decodeURIComponent(encUrl);
  const c = kind === 'invoice' ? (getInvoice(refId) ? getCustomer(getInvoice(refId).customerId) : null) : getCustomer((getJob(refId)||{}).customerId);
  if (!c || !c.phone) { toast('⚠️ No phone on file'); return; }
  const p = getProfile();
  const msg = `Hi ${c.firstName}! Pay securely here: ${url}`;
  const ok = await sendSMS(c.phone, msg);
  if (ok) { closeModal('modal-pay-options'); toast(`<i class="ti ti-check" style="color:#4ade80"></i> Payment link sent to ${c.firstName}`); }
}
// Kept for any old markup still calling the invoice-specific name.
async function textPaymentLink(invId, encUrl) { return textPaymentLinkGeneric('invoice', invId, encUrl); }

function copyPaymentLink(encUrl) {
  const url = decodeURIComponent(encUrl);
  navigator.clipboard?.writeText(url).then(
    () => toast('<i class="ti ti-check" style="color:#4ade80"></i> Link copied'),
    () => toast('Link: ' + url, 8000)
  );
}

// Charges a card for a JOB payment (not an invoice) — used from the Take Payment sheet.
// Creates the same kind of secure Stripe Checkout as invoices use, just recorded against
// the job's payment history instead of an invoice when the customer completes it.
async function chargeCardOnline(jobId){
  const j = getJob(jobId); if (!j) return;
  const c = getCustomer(j.customerId);
  const amount = parseFloat(document.getElementById('pm-amount')?.value) || 0;
  if (amount < 0.5) { toast('⚠️ Enter an amount of at least $0.50'); return; }
  toast('<i class="ti ti-loader"></i> Creating secure payment…', 8000);
  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout`, {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${Auth.token}`, 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        amount:       Math.round(amount * 100),
        description:  `${j.service || 'Job'} — ${getProfile().company || ''}`.trim(),
        kind:         'job',
        refId:        jobId,
        orgId:        window.MY_ORG_ID,
        customerName: c ? fullName(c) : '',
        returnUrl:    location.origin + location.pathname,
      }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || !data.url) { toast('⚠️ ' + (data.error || 'Could not start payment. Check Stripe setup.'), 6000); return; }
    showPaymentOptions('job', jobId, data.url, c);
  } catch (e) { console.warn('Payment error:', e); toast('⚠️ Payment error — check your connection'); }
}

// When Stripe redirects back after an on-device payment (?paidKind=&paidRef=&paidAmt=), record it.
async function handleReturnFromStripe() {
  const params = new URLSearchParams(location.search);
  const paidKind = params.get('paidKind');
  const paidRef  = params.get('paidRef');
  const paidAmtC = params.get('paidAmt');
  // Back-compat: an older link might still say just ?paid=<invoiceId>
  const legacyPaidInv = params.get('paid');
  if (!paidKind && !legacyPaidInv) return;
  history.replaceState({}, '', location.pathname);
  try {
    if (paidKind === 'job' && paidRef) {
      const amount = paidAmtC ? (parseInt(paidAmtC,10)/100) : 0;
      const p = getJobPayments(paidRef); p.push({ amount, method:'card', date: toISO(new Date()) }); saveJobPayments(paidRef, p);
      const m = jobPayMath(paidRef);
      const j = getJob(paidRef);
      if (j) { j.paid = m.due <= 0.005; saveJob(j); if (window._useCloud && window.CloudDS) { try { await CloudDS.saveJob(j); } catch(e){} } }
      toast('<i class="ti ti-circle-check" style="color:#4ade80"></i> Payment received!', 6000);
      try { await sendPaymentReceipt(paidRef, amount, 'card'); } catch(e){ console.warn('Receipt failed:', e); }
    } else {
      const invId = (paidKind === 'invoice' && paidRef) ? paidRef : legacyPaidInv;
      const inv = window._useCloud ? await CloudDS.getInvoice(invId) : getInvoice(invId);
      if (inv && inv.status !== 'paid') {
        inv.status = 'paid'; inv.paidVia = 'Card';
        if (window._useCloud) await CloudDS.saveInvoice(inv); else saveInvoice(inv);
        const c = getCustomer(inv.customerId);
        if (c) { const earned = Math.max(0, Math.round(invoiceTotal(inv))); c.points = (c.points || 0) + earned; c.totalSpent = (c.totalSpent || 0) + invoiceTotal(inv); (window._useCloud ? CloudDS.saveCustomer(c) : saveCustomer(c)); }
        toast('<i class="ti ti-circle-check" style="color:#4ade80"></i> Payment received — invoice paid!', 6000);
      }
    }
    if (State && typeof renderScreen === 'function') renderScreen(State.screen);
  } catch (e) { console.warn('Return-from-Stripe failed:', e); }
}

function markPaid(id) {
  const inv=getInvoice(id); if(!inv) return;
  inv.status='paid'; saveInvoice(inv);
  const c=getCustomer(inv.customerId);
  if(c){const earned=Math.max(0,Math.round(invoiceTotal(inv)));c.points=(c.points||0)+earned;c.totalSpent=(c.totalSpent||0)+invoiceTotal(inv);saveCustomer(c);toast(`<i class="ti ti-trophy" style="color:#f9c74f"></i> Paid! +${earned} pts to ${c.firstName}`);}
  else{toast('<i class="ti ti-check" style="color:#4ade80"></i> Marked as paid');}
  renderInvoices();
}

// ─── REWARDS ─────────────────────────────────
function renderRewards() {
  const custs=getCustomers().sort((a,b)=>b.points-a.points);
  const top=custs[0];
  document.getElementById('rewards-hero').innerHTML=top?`
    <div style="font-size:12px;opacity:0.85;margin-bottom:4px">${fullName(top)} — ${tierForPoints(top.points).name}</div>
    <div class="rewards-pts">${top.points.toLocaleString()}</div>
    <div class="rewards-pts-label">reward points (top customer)</div>
    <div class="progress-bar"><div class="progress-fill" style="width:${Math.min(100,(top.points/2000)*100).toFixed(1)}%"></div></div>
    <div class="flex-between mt-4" style="font-size:11px;opacity:0.8"><span>${top.points.toLocaleString()} pts</span><span>${Math.max(0,2000-top.points).toLocaleString()} pts to max</span></div>`:'<div>No customers yet.</div>';
  document.getElementById('rewards-leaderboard').innerHTML=custs.slice(0,6).map((c,i)=>{
    const tier=tierForPoints(c.points);
    return `<div class="card-inner-row" style="cursor:pointer" onclick="openCustomerDetail('${c.id}')">
      <div class="lb-rank ${i===0?'r1':i===1?'r2':i===2?'r3':''}">${i+1}</div>
      <div class="cust-avatar" style="${avatarStyle(c.id)}">${initials(c)}</div>
      <div style="flex:1"><div style="font-size:14px;font-weight:700">${fullName(c)}</div><div class="text-sm" style="color:${tier.color}">${tier.name}</div></div>
      <div class="cust-pts">${c.points.toLocaleString()} pts</div>
    </div>`;
  }).join('');
}

// ─── SETTINGS ────────────────────────────────
// ─── JOB SETUP (configurable lists: types, tags, lead sources, costs) ───
// Base, owner-editable building blocks. Stored locally + synced company-wide
// via org settings (same as price book / templates).
const JOB_SETUP_DEFAULTS = {
  job_types:    ['Residential', 'Commercial'],
  job_tags:     ['Junk Removal', 'Dumpster Rental', 'Repeat Customer', 'Same-Day'],
  lead_sources: ['Google', 'Referral', 'Repeat Customer', 'Yard Sign', 'Facebook'],
  job_costs:    ['Dump Fee', 'Tonnage', 'Fuel Surcharge'],
};
function getJobSetupList(key) {
  const v = DS.get(key);
  return Array.isArray(v) ? v : (JOB_SETUP_DEFAULTS[key] || []).slice();
}
function saveJobSetupList(key, arr) {
  DS.set(key, arr);
  if (window._useCloud && window.CloudDS && window.MY_ROLE === 'admin') {
    const patch = {}; patch[key] = arr;
    CloudDS.saveOrgSettings(patch).catch(e => console.warn('Job-setup cloud sync failed:', e));
  }
}
function jobSetupAdd(key) {
  const inp = document.getElementById('js-add-' + key);
  const val = (inp?.value || '').trim();
  if (!val) return;
  const arr = getJobSetupList(key);
  if (arr.some(x => String(x).toLowerCase() === val.toLowerCase())) { toast('That one already exists'); return; }
  arr.push(val);
  saveJobSetupList(key, arr);
  renderJobSetupManager();
}
function jobSetupDel(key, idx) {
  const arr = getJobSetupList(key);
  arr.splice(idx, 1);
  saveJobSetupList(key, arr);
  renderJobSetupManager();
}
function jsSection(key, title, sub) {
  const arr = getJobSetupList(key);
  const items = arr.length
    ? arr.map((item, i) => `<div class="setting-row"><div class="s-label">${item}</div><button onclick="jobSetupDel('${key}',${i})" title="Delete" style="background:none;border:none;color:#d03030;cursor:pointer;padding:6px;font-size:16px"><i class="ti ti-trash"></i></button></div>`).join('')
    : `<div class="text-sm" style="color:var(--hint);padding:4px 0">None yet — add your first below.</div>`;
  return `
    <div class="section-label">${title}</div>
    <div class="card">
      ${sub ? `<div class="text-sm text-muted" style="margin-bottom:10px">${sub}</div>` : ''}
      ${items}
      <div style="display:flex;gap:8px;margin-top:12px">
        <input class="form-input" id="js-add-${key}" placeholder="Add ${title.toLowerCase().replace(/s$/,'')}…" onkeyup="if(event.key==='Enter')jobSetupAdd('${key}')">
        <button class="btn btn-secondary btn-sm" style="white-space:nowrap" onclick="jobSetupAdd('${key}')"><i class="ti ti-plus"></i> Add</button>
      </div>
    </div>`;
}
function openJobSetupManager() { renderJobSetupManager(); openModal('modal-jobsetup'); }
function renderJobSetupManager() {
  document.getElementById('jobsetup-body').innerHTML =
    jsSection('job_types',    'Job Types',    'The kinds of jobs you do. These show up when you create a job.') +
    jsSection('job_tags',     'Job Tags',     'Labels you can attach to jobs to organize and filter them.') +
    jsSection('lead_sources', 'Lead Sources', 'Where customers heard about you — great for tracking what marketing works.') +
    jsSection('job_costs',    'Job Costs',    'Cost line items like dump fees and tonnage. Used to track profit on each job.');
}

// Small helper: a clickable settings folder card (icon + title + chevron).
function settingsFolder(icon, bg, color, title, sub, onclick) {
  return `
    <div class="card" style="cursor:pointer" onclick="${onclick}">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="width:42px;height:42px;border-radius:11px;background:${bg};color:${color};display:flex;align-items:center;justify-content:center;font-size:20px"><i class="ti ti-${icon}"></i></div>
        <div style="flex:1">
          <div style="font-weight:700">${title}</div>
          <div class="text-sm text-muted">${sub}</div>
        </div>
        <i class="ti ti-chevron-right" style="color:var(--hint)"></i>
      </div>
    </div>`;
}

function renderSettings() {
  const p=getProfile();
  const ghlKey=DS.get('ghl_api_key','');
  const ghlLoc=DS.get('ghl_location_id','');
  const ghlFrom=DS.get('ghl_from_phone','');
  document.getElementById('settings-body').innerHTML=`
    <div class="section-label">Plan &amp; Billing</div>
    <div class="card" style="display:flex;align-items:center;justify-content:space-between">
      <div>
        <div style="font-weight:800;font-size:16px">${currentPlan(p).name}</div>
        <div style="font-size:12px;color:var(--muted)">Up to ${maxEmployeesFor(p)} employee${maxEmployeesFor(p)>1?'s':''}${(Number(p.extraSeats)||0)>0?` (incl. ${p.extraSeats} extra seat${p.extraSeats>1?'s':''})`:''}</div>
      </div>
      <button class="btn btn-primary btn-sm" onclick="openUpgradeModal()"><i class="ti ti-arrow-up"></i> Manage Plan</button>
    </div>
    ${ (window.MY_ROLE==='admin') ? `
    <div class="section-label">Preview Employee View</div>
    <div class="card">
      <div style="font-size:12px;color:var(--muted);margin-bottom:10px">See exactly what each role sees. This is a preview — it doesn't change your access.</div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary btn-sm" style="flex:1" onclick="setPreviewRole('admin')"><i class="ti ti-crown"></i> Admin</button>
        <button class="btn btn-secondary btn-sm" style="flex:1" onclick="setPreviewRole('manager')"><i class="ti ti-clipboard"></i> Manager</button>
        <button class="btn btn-secondary btn-sm" style="flex:1" onclick="setPreviewRole('tech')"><i class="ti ti-truck"></i> Tech</button>
      </div>
    </div>` : '' }

    <div class="section-label">Profile</div>
    ${settingsFolder('user','#eef2ff','#6366f1','Profile','Your name, phone &amp; email',"openProfileManager()")}

    <div class="section-label">Business</div>
    ${settingsFolder('building-store','#ecfdf5','#10b981','Business','Company name &amp; review link',"openBusinessManager()")}

    <div class="section-label">Job Setup</div>
    ${settingsFolder('list-details','#fef3c7','#d97706','Job Setup','Job types, tags, lead sources &amp; costs',"openJobSetupManager()")}

    ${ (window.MY_ROLE==='admin'||window.MY_ROLE==='manager') ? `
    <div class="section-label">Time Tracking</div>
    <div class="card" style="display:flex;align-items:center;justify-content:space-between;gap:12px">
      <div style="flex:1">
        <div style="font-weight:700">Record clock location</div>
        <div style="font-size:12px;color:var(--muted);line-height:1.4">Stamps clock-in/out with GPS, shown on a mini map per punch (admins only). Techs are asked to enable location once at launch as a general app requirement — clock tracking isn't mentioned to them.</div>
      </div>
      <button class="btn btn-sm ${clockGeoOn()?'btn-primary':'btn-secondary'}" style="min-width:62px" onclick="setClockGeo(${!clockGeoOn()})">${clockGeoOn()?'<i class="ti ti-check"></i> On':'Off'}</button>
    </div>` : '' }

    ${renderPriceBookSettings()}

    <div class="section-label">Discounts &amp; Job Costs</div>
    ${settingsFolder('discount-2','#fce7f3','#db2777','Discounts &amp; Job Costs','Preset discounts &amp; material cost items',"openDiscountsCostsManager()")}

    <div class="section-label">Account</div>
    ${settingsFolder('cloud-check','#e0f2fe','#0284c7','Sync status','Check &amp; repair cross-device syncing',"openSyncManager()")}

    <div class="section-label">Preferences</div>
    ${settingsFolder('adjustments','#f3e8ff','#a855f7','Preferences','Automations &amp; scheduling defaults',"openPrefsManager()")}

    ${renderCommunicationSettings()}
    ${renderApiSettings()}

    <button class="btn btn-secondary btn-full mt-12" onclick="testMessaging()"><i class="ti ti-send"></i> Test SMS &amp; Email</button>
    <button class="btn btn-secondary btn-full mt-8" style="color:var(--red)" onclick="if(confirm('Reset all data?')){DS.reset();location.reload()}"><i class="ti ti-refresh"></i> Reset App Data</button>
  `;
}

// ─── PROFILE folder (personal — stays per-user) ───
function openProfileManager() { renderProfileManager(); openModal('modal-profile'); }
function renderProfileManager() {
  const p = getProfile();
  document.getElementById('profile-body').innerHTML = `
    <div class="card">
      <div class="form-group"><label class="form-label">Full Name</label><input class="form-input" id="sp-name" value="${p.name||''}"></div>
      <div class="form-group"><label class="form-label">Your Phone</label><input class="form-input" id="sp-phone" value="${fmtPhone(p.phone||'')}"></div>
      <div class="form-group" style="margin-bottom:0"><label class="form-label">Your Email</label><input class="form-input" id="sp-email" value="${p.email||''}"></div>
    </div>
    <button class="btn btn-primary btn-full" style="margin-top:14px" onclick="saveProfileManager()"><i class="ti ti-check"></i> Save Profile</button>`;
}
function saveProfileManager() {
  const p = getProfile();
  p.name  = document.getElementById('sp-name').value.trim() || p.name;
  p.phone = document.getElementById('sp-phone').value.replace(/\D/g,'');
  p.email = document.getElementById('sp-email').value.trim();
  p.initials = p.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
  DS.saveProfile(p);
  if (window._useCloud && window.CloudDS) CloudDS.saveProfile(p).catch(e => console.warn('Cloud profile save failed:', e));
  document.getElementById('header-avatar').textContent = p.initials;
  closeModal('modal-profile'); renderSettings();
  toast('<i class="ti ti-check" style="color:#4ade80"></i> Profile saved');
}

// ─── BUSINESS folder (company-wide via org settings) ───
function openBusinessManager() { renderBusinessManager(); openModal('modal-business'); }
function renderBusinessManager() {
  const p = getProfile();
  document.getElementById('business-body').innerHTML = `
    <div class="card">
      <div class="form-group"><label class="form-label">Company Name</label><input class="form-input" id="sp-company" value="${p.company||''}"></div>
      <div class="form-group" style="margin-bottom:0"><label class="form-label">Google Review Link</label><input class="form-input" id="sp-review-link" value="${p.googleReviewLink||''}" placeholder="https://g.page/r/YOUR-LINK/review"></div>
    </div>
    <button class="btn btn-primary btn-full" style="margin-top:14px" onclick="saveBusinessManager()"><i class="ti ti-check"></i> Save Business Info</button>`;
}
function saveBusinessManager() {
  const p = getProfile();
  p.company = document.getElementById('sp-company').value.trim() || p.company;
  p.googleReviewLink = document.getElementById('sp-review-link').value.trim();
  DS.saveProfile(p);
  if (window._useCloud && window.CloudDS) CloudDS.saveProfile(p).catch(e => console.warn('Cloud profile save failed:', e));
  pushBusinessToCloud();
  closeModal('modal-business'); renderSettings();
  toast('<i class="ti ti-check" style="color:#4ade80"></i> Business info saved');
}

// ─── PREFERENCES folder (automations + scheduling, company-wide) ───
function openPrefsManager() { renderPrefsManager(); openModal('modal-prefs'); }
function renderPrefsManager() {
  const p = getProfile();
  document.getElementById('prefs-body').innerHTML = `
    <div class="section-label" style="margin-top:0">Automation</div>
    <div class="card">
      <div class="setting-row"><div><div class="s-label">Auto-send SMS Reminders</div><div class="s-sub">1 hour before each job</div></div><input type="checkbox" class="toggle" id="tog-sms" ${p.smsReminders?'checked':''}></div>
      <div class="setting-row"><div><div class="s-label">Auto-create Invoices</div><div class="s-sub">When job is marked complete</div></div><input type="checkbox" class="toggle" id="tog-inv" ${p.autoInvoice?'checked':''}></div>
      <div class="setting-row" style="border:none"><div><div class="s-label">Loyalty Rewards</div><div class="s-sub">Award points to customers</div></div><input type="checkbox" class="toggle" id="tog-rew" ${p.rewardsEnabled?'checked':''}></div>
    </div>
    <div class="section-label">Scheduling</div>
    <div class="card">
      <div class="form-group">
        <label class="form-label">Default Arrival Window</label>
        <select class="form-input" id="sp-arrival-window">
          <option value="1" ${p.arrivalWindow===1?'selected':''}>1 Hour (e.g. 2:00 PM – 3:00 PM)</option>
          <option value="2" ${!p.arrivalWindow||p.arrivalWindow===2?'selected':''}>2 Hours (e.g. 2:00 PM – 4:00 PM)</option>
          <option value="3" ${p.arrivalWindow===3?'selected':''}>3 Hours (e.g. 2:00 PM – 5:00 PM)</option>
          <option value="4" ${p.arrivalWindow===4?'selected':''}>4 Hours (e.g. 2:00 PM – 6:00 PM)</option>
        </select>
        <div style="font-size:11px;color:var(--hint);margin-top:4px">When you pick a start time on a job, the end time auto-fills based on this setting</div>
      </div>
      <div class="form-group" style="margin-bottom:0">
        <label class="form-label">Default Technician</label>
        <select class="form-input" id="sp-default-tech">
          <option value="">No default (assign per job)</option>
          ${getEmployees().map(e=>`<option value="${e.id}" ${p.defaultTech===e.id?'selected':''}>${e.name}</option>`).join('')}
        </select>
      </div>
    </div>
    <button class="btn btn-primary btn-full" style="margin-top:14px" onclick="savePrefsManager()"><i class="ti ti-check"></i> Save Preferences</button>`;
}
function savePrefsManager() {
  const p = getProfile();
  p.smsReminders   = document.getElementById('tog-sms').checked;
  p.autoInvoice    = document.getElementById('tog-inv').checked;
  p.rewardsEnabled = document.getElementById('tog-rew').checked;
  p.arrivalWindow  = parseInt(document.getElementById('sp-arrival-window')?.value || '2');
  p.defaultTech    = document.getElementById('sp-default-tech')?.value || '';
  DS.saveProfile(p);
  if (window._useCloud && window.CloudDS) CloudDS.saveProfile(p).catch(e => console.warn('Cloud profile save failed:', e));
  pushBusinessToCloud();
  closeModal('modal-prefs'); renderSettings();
  toast('<i class="ti ti-check" style="color:#4ade80"></i> Preferences saved');
}

// ─── APIs & INTEGRATIONS (consolidated) ───
function renderApiSettings() {
  return `
    <div class="section-label">🔌 APIs & Integrations</div>
    <div class="card" style="cursor:pointer" onclick="openApiManager()">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="width:42px;height:42px;border-radius:11px;background:#e8f3ff;color:#2b7fff;display:flex;align-items:center;justify-content:center;font-size:20px"><i class="ti ti-plug-connected"></i></div>
        <div style="flex:1">
          <div style="font-weight:700">APIs &amp; Integrations</div>
          <div class="text-sm text-muted">Email, Maps & Google Business setup</div>
        </div>
        <i class="ti ti-chevron-right" style="color:var(--hint)"></i>
      </div>
    </div>`;
}

function openApiManager() {
  renderApiManager();
  openModal('modal-apis');
}

function renderApiManager() {
  const p = getProfile();
  document.getElementById('apis-manage-body').innerHTML = `
    <div class="section-label" style="margin-top:0">💬 Text Messaging (SMS)</div>
    <div class="info-banner"><i class="ti ti-circle-check" style="color:#4ade80"></i><p>SMS is handled securely by Thrive — no keys to enter. Your customer texts send automatically. <span style="color:var(--hint)">Powered by Twilio.</span></p></div>

    <div class="section-label">📧 Email (EmailJS)</div>
    <div class="info-banner"><i class="ti ti-info-circle"></i><p>Free at <strong>emailjs.com</strong> (200/mo). Create a service + template with variables <strong>to_email, to_name, subject, message</strong>.</p></div>
    <div class="card">
      <div class="form-group"><label class="form-label">Public Key</label><input class="form-input" id="sp-ejs-pubkey" value="${p.emailjsPublicKey||''}" placeholder="Your EmailJS public key"></div>
      <div class="form-group"><label class="form-label">Service ID</label><input class="form-input" id="sp-ejs-service" value="${p.emailjsServiceId||''}" placeholder="service_xxxxxxx"></div>
      <div class="form-group"><label class="form-label">Template ID</label><input class="form-input" id="sp-ejs-template" value="${p.emailjsTemplateId||''}" placeholder="template_xxxxxxx"></div>
      <div class="form-group" style="margin-bottom:0"><label class="form-label">From Name</label><input class="form-input" id="sp-ejs-fromname" value="${p.emailjsFromName||p.company}" placeholder="${p.company||'Your Company'}"></div>
    </div>

    <div class="section-label">🗺️ Google Maps</div>
    <div class="card">
      <div class="form-group" style="margin-bottom:0"><label class="form-label">Maps API Key <span style="font-weight:400;color:var(--hint)">(address autocomplete)</span></label><input class="form-input" id="sp-maps-key" value="${p.googleMapsKey||''}" placeholder="AIza..."></div>
    </div>

    <div class="section-label">📍 Google My Business</div>
    <div class="info-banner"><i class="ti ti-info-circle"></i><p>Auto-posts when you complete a job. Set up your Client ID and access token to enable.</p></div>
    <div class="card">
      <div class="form-group"><label class="form-label">Google Client ID</label><input class="form-input" id="sp-gmb-client-id" value="${DS.get('gmb_client_id','')}" placeholder="xxxxxxxx.apps.googleusercontent.com"></div>
      <div class="form-group"><label class="form-label">Access Token <span style="font-weight:400;color:var(--hint)">(paste after authorizing)</span></label><input class="form-input" id="sp-gmb-token" type="password" value="${DS.get('gmb_access_token','')}" placeholder="ya29..."></div>
      <div class="form-group" style="margin-bottom:8px">
        <label class="form-label">GMB Location ID <span style="font-weight:400;color:var(--hint)">(just the number)</span></label>
        <input class="form-input" id="sp-gmb-location" value="${DS.get('gmb_location_name','')}" placeholder="4712407153014225709">
      </div>
      <div id="gmb-locations"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px">
        <button class="btn btn-outline btn-full btn-sm" onclick="startGMBAuth()"><i class="ti ti-brand-google"></i> Authorize</button>
        <button class="btn btn-secondary btn-full btn-sm" onclick="testGMBPost()"><i class="ti ti-send"></i> Test Post</button>
      </div>
    </div>
    <button class="btn btn-primary btn-full" style="margin-top:14px" onclick="saveApiSettings()"><i class="ti ti-check"></i> Save API Settings</button>`;
}

function saveApiSettings() {
  const p = getProfile();
  p.googleMapsKey    = document.getElementById('sp-maps-key')?.value.trim() || '';
  if (p.googleMapsKey) { window.GOOGLE_MAPS_KEY = p.googleMapsKey; if (typeof loadGooglePlaces === 'function') loadGooglePlaces(); }
  p.emailjsPublicKey = document.getElementById('sp-ejs-pubkey')?.value.trim() || '';
  p.emailjsServiceId = document.getElementById('sp-ejs-service')?.value.trim() || '';
  p.emailjsTemplateId= document.getElementById('sp-ejs-template')?.value.trim() || '';
  p.emailjsFromName  = document.getElementById('sp-ejs-fromname')?.value.trim() || p.company;
  const gmbClientId = document.getElementById('sp-gmb-client-id')?.value.trim();
  const gmbToken    = document.getElementById('sp-gmb-token')?.value.trim();
  const gmbLocation = document.getElementById('sp-gmb-location')?.value.trim();
  if (gmbClientId) DS.set('gmb_client_id',    gmbClientId);
  if (gmbToken)    DS.set('gmb_access_token',  gmbToken);
  if (gmbLocation) DS.set('gmb_location_name', gmbLocation);
  DS.saveProfile(p);
  if (window._useCloud && window.CloudDS) {
    CloudDS.saveProfile(p).catch(e => console.warn('Cloud profile save failed:', e));
  }
  if (p.emailjsPublicKey) emailjs.init(p.emailjsPublicKey);
  pushBusinessToCloud();
  closeModal('modal-apis');
  toast('<i class="ti ti-check" style="color:#4ade80"></i> API settings saved');
}

// ─── BUSINESS settings sync (company-wide, like price book + templates) ───
// Personal fields (name, phone, email, initials) stay per-user; everything
// business-level lives on the org so every device shares it.
const ORG_BUSINESS_KEYS = [
  'company', 'googleReviewLink',
  'arrivalWindow', 'defaultTech',
  'smsReminders', 'autoInvoice', 'rewardsEnabled',
  'emailjsPublicKey', 'emailjsServiceId', 'emailjsTemplateId', 'emailjsFromName',
  'googleMapsKey',
];

function collectBusinessSettings() {
  const p = getProfile();
  const biz = {};
  ORG_BUSINESS_KEYS.forEach(k => { biz[k] = p[k]; });
  biz.gmb_client_id     = DS.get('gmb_client_id', '');
  biz.gmb_access_token  = DS.get('gmb_access_token', '');
  biz.gmb_location_name = DS.get('gmb_location_name', '');
  return biz;
}

function pushBusinessToCloud() {
  if (!(window._useCloud && window.MY_ROLE === 'admin' && window.CloudDS)) return;
  CloudDS.saveOrgSettings({ business: collectBusinessSettings() });
}

// Merge org-wide business settings onto the local profile (+ GMB in DS).
function applyBusinessSettings(biz) {
  if (!biz) return;
  const p = getProfile();
  Object.keys(biz).forEach(k => {
    if (biz[k] === undefined || biz[k] === null) return;
    if (k.startsWith('gmb_')) DS.set(k, biz[k]);
    else p[k] = biz[k];
  });
  DS.set('profile', p);
}




// ─── JOB FORM ────────────────────────────────
// ─── Floating "+" Add button ───
// ═══════════════════════════════════════════════
//  AI SUPPORT CHAT — bottom-left bubble, works on any screen size
// ═══════════════════════════════════════════════
let _supportHistory = []; // {role:'user'|'assistant', content:string}[] — session-only, not persisted
function toggleSupportChat(){
  const panel = document.getElementById('support-panel');
  if (!panel) return;
  const opening = !panel.classList.contains('open');
  panel.classList.toggle('open');
  if (opening) {
    const msgs = document.getElementById('support-panel-msgs');
    if (msgs && !msgs.children.length) {
      appendSupportMsg('bot', "Hi! I'm the Thrive assistant — ask me how anything in the app works, like \"how do I reschedule a job\" or \"how do discounts work.\"");
    }
    setTimeout(()=>document.getElementById('support-panel-input')?.focus(), 50);
  }
}
function appendSupportMsg(role, text, isErr){
  const msgs = document.getElementById('support-panel-msgs'); if (!msgs) return;
  const div = document.createElement('div');
  div.className = `sup-msg ${role==='user'?'user':'bot'}${isErr?' err':''}`;
  div.textContent = text;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}
async function sendSupportChatMessage(){
  const inp = document.getElementById('support-panel-input');
  const msg = (inp?.value||'').trim();
  if (!msg) return;
  inp.value = '';
  appendSupportMsg('user', msg);
  _supportHistory.push({ role:'user', content: msg });

  const msgs = document.getElementById('support-panel-msgs');
  const typing = document.createElement('div');
  typing.className = 'sup-typing'; typing.id = 'sup-typing-now';
  typing.innerHTML = '<span></span><span></span><span></span>';
  msgs.appendChild(typing); msgs.scrollTop = msgs.scrollHeight;

  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/ai-support-chat`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${(window.Auth && Auth.token)?Auth.token:''}`, 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg, history: _supportHistory.slice(0,-1) }),
    });
    const data = await resp.json().catch(()=>({}));
    document.getElementById('sup-typing-now')?.remove();
    if (!resp.ok || !data.reply) {
      appendSupportMsg('bot', data.error || "The assistant isn't available right now — try again in a bit.", true);
      return;
    }
    appendSupportMsg('bot', data.reply);
    _supportHistory.push({ role:'assistant', content: data.reply });
  } catch (e) {
    document.getElementById('sup-typing-now')?.remove();
    appendSupportMsg('bot', "Couldn't reach the assistant — check your connection and try again.", true);
  }
}

function toggleFab() {
  const menu = document.getElementById('fab-menu');
  const back = document.getElementById('fab-backdrop');
  const btn  = document.getElementById('fab-add');
  const open = !menu.classList.contains('open');
  menu.classList.toggle('open', open);
  back.classList.toggle('open', open);
  btn.classList.toggle('open', open);
}
function closeFab() {
  ['fab-menu','fab-backdrop','fab-add'].forEach(id => {
    const el = document.getElementById(id); if (el) el.classList.remove('open');
  });
}
function fabAction(kind) {
  closeFab();
  switch (kind) {
    case 'job':      openNewJob(); break;
    case 'estimate': openNewEstimate(); break;
    case 'client':   openEditCustomer(null); break;
    case 'invoice':  showScreen('invoices'); toast('<i class="ti ti-info-circle"></i> Open a completed job to create its invoice'); break;
    default:         toast('<i class="ti ti-clock"></i> ' + kind.charAt(0).toUpperCase() + kind.slice(1) + ' — coming soon');
  }
}

// ─── Modern date + time pickers ───
function toISO(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function fmtDateShort(ds){ if(!ds) return 'Select date'; const d=new Date(ds+'T00:00:00'); return d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}); }
function setPkVal(displayId,text){ const el=document.getElementById(displayId); if(!el)return; const s=el.querySelector('.pk-val'); if(s) s.textContent=text; else el.textContent=text; }

const DP = { y:0, m:0, sel:'', target:null, display:null, cb:null };
function openDatePicker(targetId, displayId, cb){
  DP.target=targetId; DP.display=displayId; DP.cb=(typeof cb==='function')?cb:null;
  const cur=document.getElementById(targetId)?.value;
  const d=cur?new Date(cur+'T00:00:00'):new Date();
  DP.y=d.getFullYear(); DP.m=d.getMonth(); DP.sel=cur||toISO(d);
  renderCalendar(); document.getElementById('modal-datepick').classList.add('open');
}
function dpNav(delta){ DP.m+=delta; if(DP.m<0){DP.m=11;DP.y--;} if(DP.m>11){DP.m=0;DP.y++;} renderCalendar(); }
function dpSelect(ds){ DP.sel=ds; renderCalendar(); }
function renderCalendar(){
  const first=new Date(DP.y,DP.m,1); const startDay=first.getDay();
  const dim=new Date(DP.y,DP.m+1,0).getDate(); const today=toISO(new Date());
  const monthName=first.toLocaleDateString('en-US',{month:'long',year:'numeric'});
  let cells=''; for(let i=0;i<startDay;i++) cells+='<div></div>';
  for(let d=1;d<=dim;d++){ const ds=`${DP.y}-${String(DP.m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    cells+=`<button type="button" class="dp-day${ds===DP.sel?' sel':''}${ds===today?' today':''}" onclick="dpSelect('${ds}')">${d}</button>`; }
  document.getElementById('dp-body').innerHTML=`
    <div class="dp-head"><button type="button" onclick="dpNav(-1)">‹</button><div class="dp-month">${monthName}</div><button type="button" onclick="dpNav(1)">›</button></div>
    <div class="dp-grid dp-dow">${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>`<div>${d}</div>`).join('')}</div>
    <div class="dp-grid">${cells}</div>`;
}
function applyDatePicker(){
  const h=document.getElementById(DP.target); if(h) h.value=DP.sel;
  setPkVal(DP.display, fmtDateShort(DP.sel));
  closeModal('modal-datepick'); if(DP.cb) DP.cb();
}

const TP = { target:null, display:null, cb:null }; const TP_H=40;
function openTimePicker(targetId, displayId, cb){
  TP.target=targetId; TP.display=displayId; TP.cb=(typeof cb==='function')?cb:null;
  const cur=document.getElementById(targetId)?.value||'09:00';
  let [h,m]=cur.split(':').map(Number); if(isNaN(h)){h=9;m=0;}
  const period=h>=12?'PM':'AM'; const h12=h%12||12;
  const mins=[0,15,30,45]; const minute=mins.reduce((a,b)=>Math.abs(b-m)<Math.abs(a-m)?b:a,0);
  buildWheel('tp-hours', Array.from({length:12},(_,i)=>String(i+1)));
  buildWheel('tp-mins', mins.map(x=>String(x).padStart(2,'0')));
  buildWheel('tp-period', ['AM','PM']);
  tpRenderDaySchedule();
  document.getElementById('modal-timepick').classList.add('open');
  setTimeout(()=>{ scrollWheelTo('tp-hours',h12-1); scrollWheelTo('tp-mins',mins.indexOf(minute)); scrollWheelTo('tp-period',period==='PM'?1:0); tpUpdateSelMarker(); },60);
}

// Live day schedule shown above the wheels while scheduling a job.
function tpRenderDaySchedule(){
  let wrap = document.getElementById('tp-schedule');
  if (window._inSchedSheet) { if (wrap) wrap.style.display='none'; return; }
  if (!wrap) {
    // Create it on the fly so the feature works even if index.html wasn't redeployed.
    const sheet  = document.querySelector('#modal-timepick .modal-sheet');
    const wheels = sheet && sheet.querySelector('.tp-wheels');
    if (sheet) {
      wrap = document.createElement('div');
      wrap.id = 'tp-schedule';
      wrap.style.cssText = 'margin-bottom:14px';
      if (wheels) sheet.insertBefore(wrap, wheels); else sheet.appendChild(wrap);
    }
  }
  if (!wrap) return;
  const dateVal = document.getElementById('jf-date')?.value;
  if (!dateVal) { wrap.style.display='none'; wrap.innerHTML=''; return; }
  const editingId = (State.editingJob && State.editingJob.id) || State.editingJob || null;
  const toMin = t => { const [hh,mm]=String(t).split(':').map(Number); return (hh||0)*60+(mm||0); };
  const jobs = (typeof jobsForDate==='function' ? jobsForDate(dateVal) : [])
    .filter(j => j.id!==editingId && j.time && j.status!=='cancelled' && j.status!=='didnotgo');
  let minH=7, maxH=19;
  jobs.forEach(j=>{ const s=Math.floor(toMin(j.time)/60); const e=Math.ceil(toMin(j.timeEnd||j.time)/60)||s+1; if(s<minH)minH=s; if(e>maxH)maxH=e; });
  const PXH=34;
  let html = `<div style="font-size:11px;font-weight:700;color:var(--hint);letter-spacing:0.4px;margin-bottom:6px">${(fmtDateShort(dateVal)||'').toUpperCase()} · WHAT'S BOOKED</div>`;
  html += `<div style="position:relative;max-height:168px;overflow-y:auto;border:1px solid var(--border);border-radius:10px;background:#fafbfc">`;
  html += `<div style="position:relative;height:${(maxH-minH)*PXH}px">`;
  for(let h=minH; h<=maxH; h++){
    html += `<div style="position:absolute;top:${(h-minH)*PXH}px;left:0;right:0;height:${PXH}px;border-top:1px solid #eef0f3"><span style="position:absolute;left:6px;top:1px;font-size:10px;color:var(--muted)">${fmt12(String(h).padStart(2,'0')+':00')}</span></div>`;
  }
  jobs.forEach(j=>{
    const s=toMin(j.time), e=toMin(j.timeEnd||j.time)||s+60;
    const top=((s-minH*60)/60)*PXH, ht=Math.max(18,((Math.max(e,s+30)-s)/60)*PXH);
    const c = typeof getCustomer==='function' ? getCustomer(j.customerId) : null;
    html += `<div style="position:absolute;left:52px;right:6px;top:${top}px;height:${ht}px;background:var(--primary);color:#fff;border-radius:6px;padding:2px 8px;font-size:11px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.12)"><div style="font-weight:700;white-space:nowrap">${fmt12(j.time)}${j.timeEnd?'–'+fmt12(j.timeEnd):''}</div><div style="white-space:nowrap;text-overflow:ellipsis;overflow:hidden;opacity:0.92">${c?fullName(c):(j.service||'Job')}</div></div>`;
  });
  html += `<div id="tp-sel-marker" style="position:absolute;left:0;right:0;height:0;border-top:2px dashed var(--green);display:none;z-index:2"><span style="position:absolute;right:6px;top:-9px;background:var(--green);color:#fff;font-size:10px;font-weight:700;padding:1px 7px;border-radius:6px">this job</span></div>`;
  html += `</div></div>`;
  if (!jobs.length) html += `<div class="text-sm text-muted" style="text-align:center;margin-top:6px">Nothing else booked this day yet.</div>`;
  wrap.innerHTML = html; wrap.style.display='block'; wrap._minH=minH; wrap._pxh=PXH;
}
function tpUpdateSelMarker(){
  const wrap=document.getElementById('tp-schedule'); const mk=document.getElementById('tp-sel-marker');
  if(!wrap||!mk||wrap.style.display==='none') return;
  const h12=parseInt(readWheel('tp-hours'))||9, m=parseInt(readWheel('tp-mins'))||0, period=readWheel('tp-period')||'AM';
  let h=h12%12; if(period==='PM') h+=12;
  const minH=wrap._minH||7, pxh=wrap._pxh||34;
  mk.style.top=(((h*60+m)-minH*60)/60*pxh)+'px'; mk.style.display='block';
}
function buildWheel(id, values){
  const col=document.getElementById(id); if(!col) return;
  col.innerHTML=`<div class="tp-pad"></div>`+values.map(v=>`<div class="tp-item" data-v="${v}">${v}</div>`).join('')+`<div class="tp-pad"></div>`;
  col.onscroll=()=>{ clearTimeout(col._t); col._t=setTimeout(()=>{ highlightWheel(col); if(typeof tpUpdateSelMarker==='function') tpUpdateSelMarker(); },50); };
}
function scrollWheelTo(id,index){ const col=document.getElementById(id); if(col){ col.scrollTop=Math.max(0,index)*TP_H; highlightWheel(col);} }
function highlightWheel(col){ const idx=Math.round(col.scrollTop/TP_H); [...col.querySelectorAll('.tp-item')].forEach((el,i)=>el.classList.toggle('sel',i===idx)); }
function readWheel(id){ const col=document.getElementById(id); if(!col) return null; const items=col.querySelectorAll('.tp-item'); const idx=Math.max(0,Math.min(items.length-1,Math.round(col.scrollTop/TP_H))); return items[idx]?.dataset.v; }
function applyTimePicker(){
  const h12=parseInt(readWheel('tp-hours'))||9; const m=parseInt(readWheel('tp-mins'))||0; const period=readWheel('tp-period')||'AM';
  let h=h12%12; if(period==='PM') h+=12;
  const val=`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  const hidden=document.getElementById(TP.target); if(hidden) hidden.value=val;
  setPkVal(TP.display, fmt12(val));
  closeModal('modal-timepick'); if(TP.cb) TP.cb();
}

// Set the job form's date/time hidden values + the Schedule summary button
function setJobDateTime(dateVal, startVal, endVal){
  const set=(id,v)=>{ const el=document.getElementById(id); if(el) el.value=v||''; };
  set('jf-date', dateVal); set('jf-time', startVal); set('jf-time-end', endVal);
  const ed=document.getElementById('jf-end-date'); if(ed && !ed.value) ed.value=dateVal||'';
  updateScheduleSummary();
}
function updateScheduleSummary(){
  const g=id=>document.getElementById(id)?.value||'';
  const d=g('jf-date'), s=g('jf-time'), e=g('jf-time-end'), anytime=g('jf-anytime')==='1';
  let txt='Set date & time';
  if(d){ txt=fmtDateShort(d); if(anytime) txt+=' · Anytime'; else if(s) txt+=' · '+fmt12(s)+(e?'–'+fmt12(e):''); }
  setPkVal('jf-schedule-summary', txt);
}

// ─── New-job bubble cards (collapse/expand + header summaries) ───
function toggleJobCard(id){ const el=document.getElementById('jfb-'+id); if(el) el.classList.toggle('open'); }
function setBubbleVal(id, txt){ const el=document.getElementById('jfb-'+id+'-val'); if(el) el.textContent = txt||''; }
function refreshJobBubbleVals(){
  const g=id=>document.getElementById(id);
  // Customer
  let custTxt='';
  const cid=g('jf-customer-id')?.value;
  if(cid){ const c=(window._custCache&&window._custCache.find(x=>x.id===cid))||getCustomer(cid); custTxt=c?fullName(c):''; }
  if(!custTxt){ const f=g('jf-nc-first')?.value||'', l=g('jf-nc-last')?.value||''; if(f||l) custTxt=(f+' '+l).trim()+' (new)'; }
  setBubbleVal('customer', custTxt);
  // Service & price
  const svc=g('jf-service')?.value; const svcLabel = svc==='dumpster-rental'?'Dumpster Rental':'Junk Removal';
  const price=g('jf-price')?.value;
  setBubbleVal('service', svcLabel + (price?` · ${fmtMoney(price)}`:''));
  // Address
  setBubbleVal('address', g('jf-address')?.value||'');
  // Assigned
  const names = assigneeNames(window._jobAssignees);
  setBubbleVal('tech', names.length ? (names.length<=2 ? names.join(', ') : names[0]+' +'+(names.length-1)) : 'Unassigned');
  // Notes
  const n=g('jf-notes')?.value||''; setBubbleVal('notes', n.length>26?n.slice(0,26)+'…':n);
}

// ═══════════════════════════════════════════════
//  UNIFIED SCHEDULE SHEET (date + time + anytime + recurrence + arrival)
// ═══════════════════════════════════════════════
let Sched = null;
const RECUR_OPTS   = [['none','Does not repeat'],['daily','Daily'],['weekly','Weekly'],['biweekly','Every 2 weeks'],['monthly','Monthly']];
const ARRIVAL_OPTS = [['','Default'],['0','Exact time'],['1','1-hour window'],['2','2-hour window'],['3','3-hour window'],['4','4-hour window']];

// jf-recur-end isn't in index.html; create it lazily so this stays app.js-only.
function ensureRecurEndInput(){
  if(!document.getElementById('jf-recur-end')){
    const inp=document.createElement('input'); inp.type='hidden'; inp.id='jf-recur-end'; inp.value='';
    const ref=document.getElementById('jf-recurrence');
    (ref&&ref.parentNode?ref.parentNode:document.body).appendChild(inp);
  }
}
// Holds the richer recurrence config (weekdays / monthMode / endMode / count) as JSON.
function ensureRecurExtraInput(){
  if(!document.getElementById('jf-recur-extra')){
    const inp=document.createElement('input'); inp.type='hidden'; inp.id='jf-recur-extra'; inp.value='';
    const ref=document.getElementById('jf-recurrence');
    (ref&&ref.parentNode?ref.parentNode:document.body).appendChild(inp);
  }
}
const WEEKDAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
function recurrenceSummary(S){
  if(!S.recurrence||S.recurrence==='none') return '';
  const dObj=new Date(S.date+'T12:00:00');
  let freq='';
  if(S.recurrence==='daily') freq='every day';
  else if(S.recurrence==='weekly'){
    const wds=(S.recurWeekdays&&S.recurWeekdays.length)?S.recurWeekdays.slice().sort((a,b)=>a-b):[dObj.getDay()];
    freq='every week on '+wds.map(d=>WEEKDAY_LABELS[d]).join(', ');
  }
  else if(S.recurrence==='biweekly') freq='every 2 weeks on '+dObj.toLocaleDateString('en-US',{weekday:'long'});
  else if(S.recurrence==='monthly'){
    if(S.recurMonthMode==='nth'){ const nth=Math.min(5,Math.ceil(dObj.getDate()/7)); freq='every month on the '+ordinal(nth)+' '+dObj.toLocaleDateString('en-US',{weekday:'long'}); }
    else freq='every month on the '+ordinal(dObj.getDate());
  }
  if(!freq) return '';
  let s='Repeats '+freq+', starting '+dObj.toLocaleDateString('en-US',{month:'short',day:'numeric'});
  if(S.recurEndMode==='count' && S.recurCount) s += ', '+S.recurCount+' time'+(S.recurCount>1?'s':'');
  else if(S.recurEndMode==='date' && S.recurEnd) s += ', until '+new Date(S.recurEnd+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  else s += ' — no end date';
  return s;
}
function ordinal(n){ const s=['th','st','nd','rd'], v=n%100; return n+(s[(v-20)%10]||s[v]||s[0]); }

// ── Generate recurring jobs as real, independent jobs (each needs its own payment) ──
function recurNthDate(startISO, freq, n){
  const d=new Date(startISO+'T12:00:00');
  if(freq==='daily') d.setDate(d.getDate()+n);
  else if(freq==='weekly') d.setDate(d.getDate()+7*n);
  else if(freq==='biweekly') d.setDate(d.getDate()+14*n);
  else if(freq==='monthly'){ const day=d.getDate(); d.setDate(1); d.setMonth(d.getMonth()+n); const dim=new Date(d.getFullYear(),d.getMonth()+1,0).getDate(); d.setDate(Math.min(day,dim)); }
  else return null;
  return toISO(d);
}
// The Nth (1-5) occurrence of a given weekday in a month, or null if it doesn't exist (e.g. 5th Tue).
function nthWeekdayOfMonth(year, monthIdx, weekday, nth){
  const dim   = new Date(year, monthIdx+1, 0).getDate();
  const first = new Date(year, monthIdx, 1).getDay();
  const day   = 1 + ((weekday - first + 7) % 7) + (nth-1)*7;
  if (day > dim) return null;
  return new Date(year, monthIdx, day);
}
// Returns the list of child occurrence dates (ISO, after the start) honoring all options.
// opts: { start, freq, weekdays[], monthMode:'date'|'nth', endMode:'never'|'date'|'count', recurEnd, count }
function recurOccurrenceDates(opts){
  const freq = opts.freq;
  const startD = new Date(opts.start+'T12:00:00');
  const endMode = opts.endMode || (opts.recurEnd ? 'date' : 'never');
  let endISO = (endMode === 'date') ? (opts.recurEnd || '') : '';
  const count = (endMode === 'count') ? Math.max(1, parseInt(opts.count,10)||1) : 0; // total incl. the start (#1)
  if (endMode === 'never' && !endISO){ const h=new Date(startD); h.setMonth(h.getMonth()+6); endISO=toISO(h); } // open-ended cap
  const out = [];
  const within   = iso => (!endISO || iso <= endISO);
  const enough   = () => (count && out.length >= count-1);
  const push     = iso => { out.push(iso); };
  const SCAN = 1000;
  if (freq === 'daily'){
    for(let n=1;n<=SCAN;n++){ const d=new Date(startD); d.setDate(d.getDate()+n); const iso=toISO(d); if(!within(iso)) break; push(iso); if(enough()) break; }
  } else if (freq === 'weekly'){
    const wds = (opts.weekdays && opts.weekdays.length) ? opts.weekdays.slice().sort((a,b)=>a-b) : [startD.getDay()];
    for(let n=1;n<=SCAN;n++){ const d=new Date(startD); d.setDate(d.getDate()+n); const iso=toISO(d); if(!within(iso)) break; if(wds.includes(d.getDay())){ push(iso); if(enough()) break; } }
  } else if (freq === 'biweekly'){
    for(let n=1;n<=SCAN;n++){ const d=new Date(startD); d.setDate(d.getDate()+14*n); const iso=toISO(d); if(!within(iso)) break; push(iso); if(enough()) break; }
  } else if (freq === 'monthly'){
    if (opts.monthMode === 'nth'){
      const wd = startD.getDay(); const nth = Math.min(5, Math.ceil(startD.getDate()/7));
      for(let n=1;n<=120;n++){ const d=nthWeekdayOfMonth(startD.getFullYear(), startD.getMonth()+n, wd, nth); if(!d) continue; const iso=toISO(d); if(!within(iso)) break; push(iso); if(enough()) break; }
    } else {
      const day = startD.getDate();
      for(let n=1;n<=120;n++){ const d=new Date(startD); d.setDate(1); d.setMonth(d.getMonth()+n); const dim=new Date(d.getFullYear(),d.getMonth()+1,0).getDate(); d.setDate(Math.min(day,dim)); const iso=toISO(d); if(!within(iso)) break; push(iso); if(enough()) break; }
    }
  }
  return out;
}
// Remove previously generated, still-pending occurrences of a series (keeps paid/done/past-completed history).
// Uses a LOCAL child-id index (recurkids_<seriesId>) so it still works after a cloud reload,
// since _mapJob doesn't carry recurChild/recurSeriesId back from Supabase.
async function clearFutureRecurChildren(seriesId, exceptId){
  if(!seriesId) return 0;
  const idxIds = DS.get('recurkids_'+seriesId, []) || [];
  const byField = getJobs().filter(j=> j && j.recurSeriesId===seriesId && j.recurChild).map(j=>j.id);
  const candidateIds = Array.from(new Set([...idxIds, ...byField])).filter(id=>id && id!==exceptId);
  let removed=0; const kept=[];
  for(const cid of candidateIds){
    const j=getJob(cid);
    if(j && (j.paid || j.status==='done' || j.status==='completed' || j.status==='cancelled' || j.status==='didnotgo')){ kept.push(cid); continue; } // preserve billed/finished/cancelled history
    try{ await asyncDeleteJob(cid);}catch(e){ try{deleteJob(cid);}catch(_){} }
    ['sched_','discounts_','taxrate_','payments_','costitems_','lineitems_'].forEach(p=>{ try{DS.set(p+cid,null);}catch(e){} });
    removed++;
  }
  DS.set('recurkids_'+seriesId, kept);
  return removed;
}
async function generateRecurringJobs(master, opts){
  const freq=opts.recurrence; if(!freq||freq==='none') return {count:0,lastDate:master.date};
  const seriesId=master.recurSeriesId||master.id;
  const dates = recurOccurrenceDates({
    start: master.date, freq,
    weekdays:  opts.recurWeekdays || [],
    monthMode: opts.recurMonthMode || 'date',
    endMode:   opts.recurEndMode || (opts.recurEnd ? 'date' : 'never'),
    recurEnd:  opts.recurEnd || '',
    count:     opts.recurCount,
  });
  const masterItems=(getJobLineItems(master.id)||[]);
  const masterAssignees=getJobAssignees(master.id);
  const created=[]; let lastDate=master.date;
  for(const occ of dates){
    const cid=newUUID();
    const cj={ id:cid, customerId:master.customerId, date:occ, time:master.time, timeEnd:master.timeEnd, techId:master.techId, service:master.service, address:master.address, price:master.price, notes:master.notes, status:'scheduled', paid:false, confirmed:master.confirmed, recurSeriesId:seriesId, recurChild:true };
    saveJob(cj);
    try{ DS.set('sched_'+cid,{ endDate:occ, anytime:!!opts.anytime, recurrence:'none', recurEnd:'', arrival:opts.arrival||'' }); }catch(e){}
    if(masterItems.length){ try{ saveJobLineItems(cid, masterItems.map(it=>Object.assign({},it))); }catch(e){} }
    if(masterAssignees.length){ try{ saveJobAssignees(cid, masterAssignees.slice()); }catch(e){} }
    created.push(cj); lastDate=occ;
  }
  if(window._useCloud && window.CloudDS){ for(const cj of created){ try{ await CloudDS.saveJob(cj);}catch(e){} try{ await CloudDS.saveJobExtras(cj.id, gatherJobExtras(cj.id)); }catch(e){} } }
  const prevKept = DS.get('recurkids_'+seriesId, []) || [];
  DS.set('recurkids_'+seriesId, Array.from(new Set([...prevKept, ...created.map(c=>c.id)])));
  return {count:created.length, lastDate};
}

function schedAddHours(start, hrs){
  let [h,m]=String(start).split(':').map(Number); if(isNaN(h)) return '';
  let total=h*60+m+(hrs||2)*60; let eh=Math.floor(total/60)%24, em=total%60;
  return `${String(eh).padStart(2,'0')}:${String(em).padStart(2,'0')}`;
}
function openSchedule(){
  ensureRecurEndInput(); ensureRecurExtraInput();
  const v=id=>document.getElementById(id)?.value||'';
  const today=toISO(new Date());
  let rx={}; try{ rx=JSON.parse(v('jf-recur-extra')||'{}')||{}; }catch(e){ rx={}; }
  const baseDate = v('jf-date')||today;
  Sched={
    date:    baseDate,
    start:   v('jf-time')||'09:00',
    end:     v('jf-time-end')||'',
    endDate: v('jf-end-date')||v('jf-date')||today,
    anytime: v('jf-anytime')==='1',
    recurrence: v('jf-recurrence')||'none',
    recurEnd: v('jf-recur-end')||'',
    recurWeekdays:  Array.isArray(rx.weekdays) ? rx.weekdays.slice() : [],
    recurMonthMode: rx.monthMode === 'nth' ? 'nth' : 'date',
    recurEndMode:   rx.endMode || (v('jf-recur-end') ? 'date' : 'never'),
    recurCount:     rx.count || 8,
    arrival: v('jf-arrival')||'',
    weekBase: v('jf-date')||today,
  };
  if(!Sched.end && Sched.start) Sched.end=schedAddHours(Sched.start, parseInt(Sched.arrival||getProfile().arrivalWindow||2)||2);
  let el=document.getElementById('sched-overlay'); if(el) el.remove();
  el=document.createElement('div'); el.id='sched-overlay';
  el.style.cssText='position:fixed;inset:0;z-index:205;background:rgba(0,0,0,0.4);display:flex;align-items:flex-end;justify-content:center';
  el.onclick=(e)=>{ if(e.target===el) closeSchedule(); };
  el.innerHTML=`<div id="sched-sheet" style="background:#fff;width:100%;max-width:480px;max-height:94vh;overflow-y:auto;border-radius:20px 20px 0 0;padding:14px 16px 28px"></div>
    <input type="hidden" id="sched-h-date"><input type="hidden" id="sched-h-enddate"><input type="hidden" id="sched-h-start"><input type="hidden" id="sched-h-end"><input type="hidden" id="sched-h-recurend">`;
  document.body.appendChild(el);
  renderScheduleSheet();
}
function closeSchedule(){ window._inSchedSheet=false; const el=document.getElementById('sched-overlay'); if(el) el.remove(); }

function renderScheduleSheet(){
  const sheet=document.getElementById('sched-sheet'); if(!sheet||!Sched) return;
  const S=Sched;
  const base=new Date((S.weekBase||S.date)+'T12:00:00');
  const sun=new Date(base); sun.setDate(base.getDate()-base.getDay());
  const days=Array.from({length:7},(_,i)=>{ const d=new Date(sun); d.setDate(sun.getDate()+i); return d; });
  const dn=['S','M','T','W','T','F','S'];
  const strip=days.map(d=>{
    const ds=toISO(d), sel=ds===S.date;
    const has=jobsForDate(ds).filter(j=>j.status!=='cancelled'&&j.status!=='didnotgo').length>0&&!sel;
    return `<button onclick="schedPickDay('${ds}')" style="flex:1;border:none;background:${sel?'var(--primary)':'transparent'};color:${sel?'#fff':'var(--text)'};border-radius:10px;padding:6px 0;cursor:pointer;font-family:inherit">
      <div style="font-size:10px;opacity:0.7">${dn[d.getDay()]}</div>
      <div style="font-size:16px;font-weight:700">${d.getDate()}</div>
      ${has?'<div style="width:5px;height:5px;border-radius:50%;background:var(--primary);margin:2px auto 0"></div>':'<div style="height:7px"></div>'}
    </button>`;
  }).join('');
  sheet.innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <button onclick="closeSchedule()" style="background:none;border:none;color:var(--primary);font-size:15px;cursor:pointer;font-family:inherit">Cancel</button>
      <div style="font-weight:800;font-size:16px">Schedule</div>
      <button onclick="applySchedule()" style="background:none;border:none;color:var(--primary);font-size:15px;font-weight:800;cursor:pointer;font-family:inherit">Done</button>
    </div>
    <div style="display:flex;align-items:center;gap:4px;margin-bottom:6px">
      <button onclick="schedWeek(-1)" style="background:none;border:none;color:var(--muted);font-size:22px;cursor:pointer;line-height:1">‹</button>
      <div style="flex:1;display:flex;gap:2px">${strip}</div>
      <button onclick="schedWeek(1)" style="background:none;border:none;color:var(--muted);font-size:22px;cursor:pointer;line-height:1">›</button>
    </div>
    <div style="text-align:center;font-weight:700;font-size:13px;margin-bottom:10px">${new Date(S.date+'T12:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})}</div>
    <div id="sched-timeline" style="margin-bottom:14px">${schedTimelineHTML(S.date, S.anytime?null:S.start, S.anytime?null:S.end)}</div>
    <div style="background:#f7f8fb;border-radius:12px;overflow:hidden">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:13px 14px;border-bottom:1px solid var(--border)">
        <span style="font-weight:600">Start</span>
        <div style="display:flex;gap:8px">
          <button onclick="schedPick('date')" class="btn btn-secondary btn-sm">${fmtDateShort(S.date)}</button>
          ${S.anytime?'':`<button onclick="schedPick('start')" class="btn btn-secondary btn-sm">${fmt12(S.start)}</button>`}
        </div>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;padding:13px 14px;border-bottom:1px solid var(--border)">
        <span style="font-weight:600">End</span>
        <div style="display:flex;gap:8px">
          <button onclick="schedPick('enddate')" class="btn btn-secondary btn-sm">${fmtDateShort(S.endDate)}</button>
          ${S.anytime?'':`<button onclick="schedPick('end')" class="btn btn-secondary btn-sm">${S.end?fmt12(S.end):'Set'}</button>`}
        </div>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;padding:13px 14px">
        <span style="font-weight:600">Anytime</span>
        <input type="checkbox" class="toggle" ${S.anytime?'checked':''} onchange="schedToggleAnytime(this.checked)">
      </div>
    </div>
    <div style="background:#f7f8fb;border-radius:12px;overflow:hidden;margin-top:12px">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:13px 14px">
        <span style="font-weight:600">Recurrence</span>
        <select onchange="schedSetRecurrence(this.value)" style="border:none;background:none;font-family:inherit;font-size:14px;color:var(--primary);font-weight:600">
          ${RECUR_OPTS.map(([val,l])=>`<option value="${val}" ${S.recurrence===val?'selected':''}>${l}</option>`).join('')}
        </select>
      </div>
      ${S.recurrence!=='none'?`
      <div style="display:flex;align-items:center;justify-content:space-between;padding:13px 14px;border-top:1px solid var(--border)">
        <span style="font-weight:600">Starts on</span>
        <button onclick="schedPick('date')" class="btn btn-secondary btn-sm">${new Date(S.date+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}</button>
      </div>
      ${S.recurrence==='weekly'?`
      <div style="padding:13px 14px;border-top:1px solid var(--border)">
        <div style="font-weight:600;margin-bottom:8px">Repeat on</div>
        <div style="display:flex;gap:5px">
          ${WEEKDAY_LABELS.map((lbl,d)=>{ const sel=(S.recurWeekdays&&S.recurWeekdays.length?S.recurWeekdays:[new Date(S.date+'T12:00:00').getDay()]); const on=sel.includes(d); return `<button onclick="schedToggleWeekday(${d})" style="flex:1;border:none;cursor:pointer;font-family:inherit;font-size:12px;font-weight:800;border-radius:8px;padding:9px 0;${on?'background:var(--primary);color:#fff':'background:#eceef3;color:var(--muted)'}">${lbl[0]}</button>`; }).join('')}
        </div>
      </div>`:''}
      ${S.recurrence==='monthly'?`
      <div style="padding:13px 14px;border-top:1px solid var(--border)">
        <div style="font-weight:600;margin-bottom:8px">Repeat by</div>
        <div style="display:flex;flex-direction:column;gap:6px">
          <button onclick="schedSetMonthMode('date')" style="text-align:left;border:none;cursor:pointer;font-family:inherit;font-size:13px;font-weight:600;border-radius:8px;padding:10px 12px;${S.recurMonthMode!=='nth'?'background:var(--primary);color:#fff':'background:#eceef3;color:var(--muted)'}">Day ${new Date(S.date+'T12:00:00').getDate()} of the month</button>
          <button onclick="schedSetMonthMode('nth')" style="text-align:left;border:none;cursor:pointer;font-family:inherit;font-size:13px;font-weight:600;border-radius:8px;padding:10px 12px;${S.recurMonthMode==='nth'?'background:var(--primary);color:#fff':'background:#eceef3;color:var(--muted)'}">The ${ordinal(Math.min(5,Math.ceil(new Date(S.date+'T12:00:00').getDate()/7)))} ${new Date(S.date+'T12:00:00').toLocaleDateString('en-US',{weekday:'long'})}</button>
        </div>
      </div>`:''}
      <div style="display:flex;align-items:center;justify-content:space-between;padding:13px 14px;border-top:1px solid var(--border)">
        <span style="font-weight:600">Ends</span>
        <div style="display:flex;gap:4px;background:#eceef3;border-radius:9px;padding:3px">
          ${[['never','Never'],['date','On date'],['count','After']].map(([m,l])=>`<button onclick="schedSetEndMode('${m}')" style="border:none;cursor:pointer;font-family:inherit;font-size:12px;font-weight:700;border-radius:7px;padding:6px 10px;${S.recurEndMode===m?'background:#fff;color:var(--primary);box-shadow:0 1px 2px rgba(0,0,0,0.1)':'background:none;color:var(--muted)'}">${l}</button>`).join('')}
        </div>
      </div>
      ${S.recurEndMode==='date'?`<div style="display:flex;align-items:center;justify-content:space-between;padding:13px 14px;border-top:1px solid var(--border)">
        <span style="font-weight:600">Ends on</span>
        <button onclick="schedPick('recurend')" class="btn btn-secondary btn-sm">${S.recurEnd?new Date(S.recurEnd+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'}):'Pick date'}</button>
      </div>`:''}
      ${S.recurEndMode==='count'?`<div style="display:flex;align-items:center;justify-content:space-between;padding:13px 14px;border-top:1px solid var(--border)">
        <span style="font-weight:600"># of visits</span>
        <div style="display:flex;align-items:center;gap:14px">
          <button onclick="schedSetCount(-1)" class="btn btn-secondary btn-sm" style="width:36px;padding:6px 0">−</button>
          <span style="font-weight:800;font-size:16px;min-width:22px;text-align:center">${S.recurCount||8}</span>
          <button onclick="schedSetCount(1)" class="btn btn-secondary btn-sm" style="width:36px;padding:6px 0">+</button>
        </div>
      </div>`:''}`:''}
      <div style="display:flex;align-items:center;justify-content:space-between;padding:13px 14px;border-top:1px solid var(--border)">
        <span style="font-weight:600">Arrival window</span>
        <select onchange="schedSetArrival(this.value)" style="border:none;background:none;font-family:inherit;font-size:14px;color:var(--primary);font-weight:600">
          ${ARRIVAL_OPTS.map(([val,l])=>`<option value="${val}" ${S.arrival===val?'selected':''}>${l}</option>`).join('')}
        </select>
      </div>
    </div>
    ${S.recurrence!=='none'?`<div style="margin-top:8px;display:flex;align-items:flex-start;gap:7px;background:#eef6ff;border-radius:10px;padding:10px 12px"><i class="ti ti-repeat" style="color:var(--primary);margin-top:1px"></i><div><div style="font-size:13px;font-weight:600;color:var(--text)">${recurrenceSummary(S)}</div><div class="text-sm text-muted" style="margin-top:2px">${S.recurEndMode==='count'?'Saving creates that many visits — each is its own job with its own payment.':S.recurEndMode==='date'?'Saving creates a separate job for every date through the end — each is its own visit with its own payment.':'No end date set, so saving creates about 6 months of visits. Each is its own job billed separately.'}</div></div></div>`:''}`;
}
function schedTimelineHTML(dateVal, hlStart, hlEnd){
  if(!dateVal) return '';
  const editingId=(State.editingJob&&State.editingJob.id)||State.editingJob||null;
  const toMin=t=>{const[h,m]=String(t).split(':').map(Number);return (h||0)*60+(m||0);};
  const jobs=(jobsForDate(dateVal)||[]).filter(j=>j.id!==editingId&&j.time&&j.status!=='cancelled'&&j.status!=='didnotgo');
  let minH=7,maxH=19;
  jobs.forEach(j=>{const s=Math.floor(toMin(j.time)/60),e=Math.ceil(toMin(j.timeEnd||j.time)/60)||s+1;if(s<minH)minH=s;if(e>maxH)maxH=e;});
  if(hlStart){const s=Math.floor(toMin(hlStart)/60),e=Math.ceil(toMin(hlEnd||hlStart)/60)||s+1;if(s<minH)minH=s;if(e>maxH)maxH=e;}
  const PXH=34;
  let html=`<div style="position:relative;max-height:200px;overflow-y:auto;border:1px solid var(--border);border-radius:10px;background:#fafbfc"><div style="position:relative;height:${(maxH-minH)*PXH}px">`;
  for(let h=minH;h<=maxH;h++) html+=`<div style="position:absolute;top:${(h-minH)*PXH}px;left:0;right:0;height:${PXH}px;border-top:1px solid #eef0f3"><span style="position:absolute;left:6px;top:1px;font-size:10px;color:var(--muted)">${fmt12(String(h).padStart(2,'0')+':00')}</span></div>`;
  jobs.forEach(j=>{const s=toMin(j.time),e=toMin(j.timeEnd||j.time)||s+60;const top=((s-minH*60)/60)*PXH,ht=Math.max(18,((Math.max(e,s+30)-s)/60)*PXH);const c=getCustomer(j.customerId);html+=`<div style="position:absolute;left:52px;right:6px;top:${top}px;height:${ht}px;background:var(--primary);color:#fff;border-radius:6px;padding:2px 8px;font-size:11px;overflow:hidden"><div style="font-weight:700;white-space:nowrap">${fmt12(j.time)}${j.timeEnd?'–'+fmt12(j.timeEnd):''}</div><div style="white-space:nowrap;text-overflow:ellipsis;overflow:hidden;opacity:0.92">${c?fullName(c):(j.service||'Job')}</div></div>`;});
  if(hlStart){const s=toMin(hlStart),e=toMin(hlEnd||hlStart)||s+60;const top=((s-minH*60)/60)*PXH,ht=Math.max(18,((Math.max(e,s+30)-s)/60)*PXH);html+=`<div style="position:absolute;left:52px;right:6px;top:${top}px;height:${ht}px;background:var(--green);color:#fff;border-radius:6px;padding:2px 8px;font-size:11px;overflow:hidden;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.25)"><div style="font-weight:800;white-space:nowrap">${fmt12(hlStart)}${hlEnd?'–'+fmt12(hlEnd):''}</div><div style="opacity:0.95">This job</div></div>`;}
  html+=`</div></div>`;
  if(!jobs.length) html+=`<div class="text-sm text-muted" style="text-align:center;margin-top:6px">Nothing else booked this day.</div>`;
  return html;
}
function schedPickDay(ds){ Sched.date=ds; if(!Sched.endDate||Sched.endDate<ds) Sched.endDate=ds; renderScheduleSheet(); }
function schedWeek(dir){ const b=new Date((Sched.weekBase||Sched.date)+'T12:00:00'); b.setDate(b.getDate()+dir*7); Sched.weekBase=toISO(b); renderScheduleSheet(); }
function schedToggleAnytime(on){ Sched.anytime=on; renderScheduleSheet(); }
function schedSetRecurrence(v){
  Sched.recurrence=v;
  if(v==='none'){ Sched.recurEnd=''; Sched.recurEndMode='never'; Sched.recurWeekdays=[]; Sched.recurMonthMode='date'; }
  if(v==='weekly' && (!Sched.recurWeekdays || !Sched.recurWeekdays.length)){ Sched.recurWeekdays=[new Date(Sched.date+'T12:00:00').getDay()]; }
  renderScheduleSheet();
}
function schedToggleWeekday(d){
  let wds=(Sched.recurWeekdays&&Sched.recurWeekdays.length)?Sched.recurWeekdays.slice():[new Date(Sched.date+'T12:00:00').getDay()];
  if(wds.includes(d)) wds=wds.filter(x=>x!==d); else wds.push(d);
  if(!wds.length) wds=[new Date(Sched.date+'T12:00:00').getDay()]; // never empty
  Sched.recurWeekdays=wds.sort((a,b)=>a-b);
  renderScheduleSheet();
}
function schedSetMonthMode(mode){ Sched.recurMonthMode=mode; renderScheduleSheet(); }
function schedSetEndMode(mode){
  Sched.recurEndMode=mode;
  if(mode==='never'){ Sched.recurEnd=''; renderScheduleSheet(); return; }
  if(mode==='count'){ if(!Sched.recurCount) Sched.recurCount=8; renderScheduleSheet(); return; }
  if(mode==='date'){
    if(!Sched.recurEnd){ const d=new Date((Sched.date||toISO(new Date()))+'T12:00:00'); d.setMonth(d.getMonth()+1); Sched.recurEnd=toISO(d); }
    renderScheduleSheet(); schedPick('recurend');
  }
}
function schedSetCount(delta){ Sched.recurCount=Math.max(2,Math.min(104,(parseInt(Sched.recurCount,10)||8)+delta)); renderScheduleSheet(); }
function schedSetArrival(v){ Sched.arrival=v; if(v && v!=='0' && Sched.start) Sched.end=schedAddHours(Sched.start, parseInt(v)); renderScheduleSheet(); }
function schedPick(which){
  window._inSchedSheet=true;
  if(which==='date'){ document.getElementById('sched-h-date').value=Sched.date; openDatePicker('sched-h-date','sched-h-date',()=>{ Sched.date=document.getElementById('sched-h-date').value; if(Sched.endDate<Sched.date)Sched.endDate=Sched.date; Sched.weekBase=Sched.date; window._inSchedSheet=false; renderScheduleSheet(); }); }
  else if(which==='enddate'){ document.getElementById('sched-h-enddate').value=Sched.endDate; openDatePicker('sched-h-enddate','sched-h-enddate',()=>{ Sched.endDate=document.getElementById('sched-h-enddate').value; window._inSchedSheet=false; renderScheduleSheet(); }); }
  else if(which==='start'){ document.getElementById('sched-h-start').value=Sched.start; openTimePicker('sched-h-start','sched-h-start',()=>{ Sched.start=document.getElementById('sched-h-start').value; if(Sched.arrival!=='0') Sched.end=schedAddHours(Sched.start, parseInt(Sched.arrival||getProfile().arrivalWindow||2)||2); window._inSchedSheet=false; renderScheduleSheet(); }); }
  else if(which==='end'){ document.getElementById('sched-h-end').value=Sched.end||Sched.start; openTimePicker('sched-h-end','sched-h-end',()=>{ Sched.end=document.getElementById('sched-h-end').value; window._inSchedSheet=false; renderScheduleSheet(); }); }
  else if(which==='recurend'){ const h=document.getElementById('sched-h-recurend'); if(h) h.value=Sched.recurEnd||Sched.date; openDatePicker('sched-h-recurend','sched-h-recurend',()=>{ let v=document.getElementById('sched-h-recurend').value; if(v && v<Sched.date) v=Sched.date; Sched.recurEnd=v; window._inSchedSheet=false; renderScheduleSheet(); }); }
}
function applySchedule(){
  const S=Sched; const set=(id,v)=>{ const el=document.getElementById(id); if(el) el.value=v||''; };
  set('jf-date',S.date); set('jf-end-date',S.endDate||S.date);
  set('jf-anytime',S.anytime?'1':'0'); set('jf-recurrence',S.recurrence||'none'); set('jf-arrival',S.arrival||'');
  ensureRecurEndInput(); set('jf-recur-end', S.recurrence==='none' ? '' : (S.recurEndMode==='date' ? (S.recurEnd||'') : ''));
  ensureRecurExtraInput();
  set('jf-recur-extra', S.recurrence==='none' ? '' : JSON.stringify({
    weekdays:  (S.recurrence==='weekly'  && S.recurWeekdays && S.recurWeekdays.length) ? S.recurWeekdays : [],
    monthMode: (S.recurrence==='monthly') ? (S.recurMonthMode||'date') : 'date',
    endMode:   S.recurEndMode || 'never',
    count:     S.recurEndMode==='count' ? (parseInt(S.recurCount,10)||8) : 0,
  }));
  if(S.anytime){ set('jf-time',''); set('jf-time-end',''); }
  else { set('jf-time',S.start||''); set('jf-time-end',S.end||''); }
  updateScheduleSummary();
  if(typeof onJobDateChange==='function') onJobDateChange();
  closeSchedule();
}
function autoFillEnd(){
  const start=document.getElementById('jf-time')?.value; if(!start) return;
  const p=getProfile(); const win=p.arrivalWindow||2;
  let [h,m]=start.split(':').map(Number); if(isNaN(h)) return;
  let total=h*60+m+win*60; let eh=Math.floor(total/60)%24; let em=total%60;
  const rm=em<15?0:em<45?30:0; const rh=em>=45?(eh+1)%24:eh;
  const val=`${String(rh).padStart(2,'0')}:${String(rm).padStart(2,'0')}`;
  const eHidden=document.getElementById('jf-time-end'); if(eHidden) eHidden.value=val;
  updateScheduleSummary();
}

function setJobFormMode(mode) {
  State.jobFormMode = mode;
  const isEst = mode === 'estimate';
  const editing = !!State.editingJob;
  const set = (id, fn) => { const el = document.getElementById(id); if (el) fn(el); };
  set('jf-price-group', el => el.style.display = isEst ? 'none' : '');
  set('jf-est-hint',    el => el.style.display = isEst ? 'block' : 'none');
  set('jf-title',       el => el.textContent = isEst ? (editing ? 'Edit Estimate Visit' : 'Schedule Estimate Visit') : (editing ? 'Edit Job' : 'New Job'));
  set('jf-save-btn',    el => el.innerHTML = isEst ? '<i class="ti ti-calendar-plus"></i> Schedule Visit' : '<i class="ti ti-check"></i> Save Job');
  set('jf-delete-btn',  el => el.style.display = (editing && !isEst) ? '' : 'none');
  set('jf-mode-job',    el => el.className = 'btn btn-sm ' + (isEst ? 'btn-secondary' : 'btn-primary'));
  set('jf-mode-est',    el => el.className = 'btn btn-sm ' + (isEst ? 'btn-primary' : 'btn-secondary'));
}

function openNewJob() { openNewJobForCustomer(null, 'job'); }
function openNewJobForCustomer(custId, mode) {
  mode = mode || 'job';
  State.editingJob=null;
  resetInlineCust('jf');
  document.getElementById('jf-title').textContent='New Job';
  // Set up searchable customer field
  const searchEl = document.getElementById('jf-customer-search');
  const hiddenEl = document.getElementById('jf-customer-id');
  if (custId) {
    const preC = getCustomer(custId);
    if (searchEl && preC) searchEl.value = fullName(preC);
    if (hiddenEl) hiddenEl.value = custId;
  } else {
    if (searchEl) searchEl.value = '';
    if (hiddenEl) hiddenEl.value = '';
  }
  setJobDateTime(toISO(new Date()), '09:00', null);
  ['jf-anytime','jf-recurrence','jf-arrival','jf-end-date'].forEach(i=>{ const el=document.getElementById(i); if(el) el.value = i==='jf-recurrence' ? 'none' : (i==='jf-end-date' ? toISO(new Date()) : (i==='jf-anytime' ? '0' : '')); });
  ensureRecurEndInput(); { const re=document.getElementById('jf-recur-end'); if(re) re.value=''; }
  ensureRecurExtraInput(); { const rx=document.getElementById('jf-recur-extra'); if(rx) rx.value=''; }
  updateScheduleSummary();
  autoFillEnd();
  document.getElementById('jf-service').value='JR-Full';
  document.getElementById('jf-address').value=custId?(getCustomer(custId)?.address||''):'';
  document.getElementById('jf-price').value='';
  document.getElementById('jf-notes').value='';
  document.getElementById('jf-status').value='scheduled';
  closeModal('modal-cust-detail');
  document.getElementById('jf-mode-toggle').style.display = 'flex';
  setJobFormMode(mode);
  openModal('modal-job-form');
  setTimeout(async () => {
    await refreshCustCache();
    attachAutocomplete();
    await loadEmployeesForDropdown('jf-tech', '');
    await loadAssigneePicker(getProfile().defaultTech ? [getProfile().defaultTech] : []);
    selectServiceType('junk-removal');
    populatePriceSelect('jf-price-select', 'junk-removal');
    renderSchedulePeek(document.getElementById('jf-date')?.value);
    refreshJobBubbleVals();
  }, 150);
}

function openEditJob(id) {
  State.editingJob=id;
  resetInlineCust('jf');
  const j=getJob(id); if(!j) return;
  const custs=getCustomers();
  document.getElementById('jf-title').textContent='Edit Job';
  // Pre-fill customer search with existing customer
  const editCust = getCustomer(j.customerId);
  const editSearchEl = document.getElementById('jf-customer-search');
  const editHiddenEl = document.getElementById('jf-customer-id');
  if (editSearchEl && editCust) editSearchEl.value = fullName(editCust);
  if (editHiddenEl) editHiddenEl.value = j.customerId || '';
  setJobDateTime(j.date, j.time||'09:00', j.timeEnd||null);
  const sx = DS.get('sched_'+id, {}) || {};
  const setV=(i,v)=>{ const el=document.getElementById(i); if(el) el.value=v; };
  setV('jf-end-date', sx.endDate || j.date || '');
  setV('jf-anytime', sx.anytime ? '1' : '0');
  setV('jf-recurrence', sx.recurrence || 'none');
  ensureRecurEndInput(); setV('jf-recur-end', sx.recurEnd || '');
  ensureRecurExtraInput(); setV('jf-recur-extra', (sx.recurrence && sx.recurrence!=='none') ? JSON.stringify({
    weekdays:  sx.recurWeekdays || [],
    monthMode: sx.recurMonthMode || 'date',
    endMode:   sx.recurEndMode || (sx.recurEnd ? 'date' : 'never'),
    count:     sx.recurCount || 0,
  }) : '');
  setV('jf-arrival', sx.arrival || '');
  updateScheduleSummary();
  if (!j.timeEnd) autoFillEnd();
  document.getElementById('jf-service').value=j.service||'junk-removal';
  document.getElementById('jf-address').value=j.address;
  document.getElementById('jf-price').value=j.price||'';
  document.getElementById('jf-notes').value=j.notes||'';
  if (document.getElementById('jf-status')) document.getElementById('jf-status').value = j.status||'scheduled';
  document.getElementById('jf-mode-toggle').style.display = 'none';
  setJobFormMode('job');
  openModal('modal-job-form');
  setTimeout(async () => {
    await refreshCustCache();
    await loadEmployeesForDropdown('jf-tech', j.techId||'');
    await loadAssigneePicker(getJobAssignees(j.id));
    attachAutocomplete();
    const svcType = (j.service||'').startsWith('DR') ? 'dumpster-rental' : 'junk-removal';
    selectServiceType(svcType);
    populatePriceSelect('jf-price-select', svcType);
    reconcilePriceUI();
    renderSchedulePeek(j.date);
    refreshJobBubbleVals();
  }, 150);
}

async function saveJobForm() {
  let custId    = document.getElementById('jf-customer-id')?.value || '';
  const date    = document.getElementById('jf-date')?.value || '';
  const time    = document.getElementById('jf-time')?.value || '';
  const timeEnd = document.getElementById('jf-time-end')?.value || '';
  const schedEndDate = document.getElementById('jf-end-date')?.value || date;
  const schedAnytime = document.getElementById('jf-anytime')?.value === '1';
  const schedRecur   = document.getElementById('jf-recurrence')?.value || 'none';
  const schedRecurEnd= document.getElementById('jf-recur-end')?.value || '';
  let   schedRX = {}; try { schedRX = JSON.parse(document.getElementById('jf-recur-extra')?.value || '{}') || {}; } catch(e){ schedRX = {}; }
  const schedArrival = document.getElementById('jf-arrival')?.value || '';
  const techIds = (window._jobAssignees||[]).filter(Boolean);
  const techId  = techIds[0] || '';
  const service = document.getElementById('jf-service')?.value || 'junk-removal';
  const address = document.getElementById('jf-address')?.value.trim() || '';
  const price   = parseFloat(document.getElementById('jf-price')?.value) || 0;
  const notes   = document.getElementById('jf-notes')?.value.trim() || '';

  // Inline-added customer: create their profile first, then use its id.
  if (custId === '__new__') {
    const newCustId = await commitInlineNewCustomer('jf', address);
    if (!newCustId) { toast('⚠️ Add at least a first name for the new customer'); return; }
    custId = newCustId;
  }

  if (!custId) { toast('⚠️ Please select a customer'); return; }
  if (!date)   { toast('⚠️ Date required'); return; }
  if (!time)   { toast('⚠️ Select an arrival time'); return; }

  const id       = State.editingJob || newUUID();
  const existing = State.editingJob ? getJob(id) : null;

  // An estimate is just an UNCONFIRMED job (confirmed=false). Editing keeps its current state.
  const confirmed = existing ? (existing.confirmed !== false) : (State.jobFormMode !== 'estimate');

  const j = {
    id,
    customerId: custId,
    date,
    time,
    timeEnd,
    techId,
    service,
    address:    address || getCustomer(custId)?.address || '',
    price,
    notes,
    status:     existing?.status || 'scheduled',
    paid:       existing?.paid   || false,
    confirmed,
  };
  // Recurring master gets a stable series id so we can regenerate without dupes.
  const wasMaster = existing && existing.recurMaster;
  const seriesId  = wasMaster ? (existing.recurSeriesId || id) : id;
  if (schedRecur !== 'none') { j.recurMaster = true; j.recurSeriesId = seriesId; }

  saveJob(j);
  saveJobAssignees(id, techIds);
  try { DS.set('sched_'+id, { endDate:schedEndDate, anytime:schedAnytime, recurrence:schedRecur, recurEnd:schedRecurEnd, arrival:schedArrival, recurWeekdays:schedRX.weekdays||[], recurMonthMode:schedRX.monthMode||'date', recurEndMode:schedRX.endMode||(schedRecurEnd?'date':'never'), recurCount:schedRX.count||0 }); } catch(e){}
  pushJobExtras(id);
  if (window._useCloud && window.CloudDS) { try { await CloudDS.saveJob(j); } catch(e){ console.warn('Cloud job save failed:', e); } }

  // Generate (or regenerate) the future occurrences as their own standalone jobs.
  let recurMsg = '';
  let didRegenerate = false;
  if (schedRecur !== 'none') {
    const sig = `${schedRecur}|${j.date}|${schedRecurEnd}|${JSON.stringify(schedRX||{})}`;
    const prevSig = DS.get('recursig_'+seriesId, '');
    const alreadyHas = (DS.get('recurkids_'+seriesId, [])||[]).length > 0;
    if (sig !== prevSig || !alreadyHas) {
      // First setup, or the pattern (frequency / start / end / options) changed → rebuild future visits.
      await clearFutureRecurChildren(seriesId, id);
      const r = await generateRecurringJobs(j, { recurrence:schedRecur, recurEnd:schedRecurEnd, anytime:schedAnytime, arrival:schedArrival, recurWeekdays:schedRX.weekdays||[], recurMonthMode:schedRX.monthMode||'date', recurEndMode:schedRX.endMode||(schedRecurEnd?'date':'never'), recurCount:schedRX.count||0 });
      DS.set('recursig_'+seriesId, sig);
      didRegenerate = true;
      if (r.count > 0) recurMsg = ` · ${r.count} repeat visit${r.count>1?'s':''} created through ${new Date(r.lastDate+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})}`;
    }
    // else: pattern unchanged — leave the existing series (and any per-visit edits) intact.
  } else if (existing && (existing.recurSeriesId || (DS.get('recurkids_'+seriesId,[])||[]).length)) {
    // Recurrence turned off → clean up its pending future occurrences.
    await clearFutureRecurChildren(seriesId, id);
    DS.set('recursig_'+seriesId, ''); DS.set('recurkids_'+seriesId, []);
  }

  // If this was an edit of a visit in an existing series (and we didn't just rebuild the whole
  // series), offer to push the detail changes to future visits too.
  let _propSeriesId = '', _propFields = null;
  if (State.editingJob && existing && !didRegenerate) {
    _propSeriesId = findJobSeriesId(existing) || (j.recurSeriesId || '');
    if (_propSeriesId) {
      const pf = {};
      ['time','timeEnd','service','address','price','notes','techId'].forEach(f => { if (String(existing[f] ?? '') !== String(j[f] ?? '')) pf[f] = j[f]; });
      if (Object.keys(pf).length) _propFields = pf;
    }
  }

  // Only confirmed jobs bump the customer's job count + send a booking confirmation.
  if (!State.editingJob && confirmed) {
    const c = (window._custCache && window._custCache.find(x => x.id === custId)) || getCustomer(custId);
    if (c) {
      c.jobs = (c.jobs||0)+1; saveCustomer(c);
      if (window._useCloud && window.CloudDS) { try { await CloudDS.saveCustomer(c); } catch(e){} }
    }
    try { await sendBookingConfirmation(j.id); } catch(e) { console.warn('SMS:', e); }
  }

  State.editingJob = null;
  State.selectedDay = date;
  closeAllModals();
  renderDashboard();
  if (State.screen === 'jobs')      renderJobs();
  if (State.screen === 'estimates') renderEstimates();
  toast(confirmed
    ? `<i class="ti ti-check" style="color:#4ade80"></i> Job scheduled!${recurMsg}`
    : `<i class="ti ti-calendar-plus" style="color:#4ade80"></i> Estimate visit scheduled${recurMsg}`);
  if (_propFields) openRecurEditChoice(_propSeriesId, id, j.date, _propFields);
}

// After editing one visit of a series, ask whether to apply the changes to future visits too.
function openRecurEditChoice(seriesId, jobId, fromDate, fields){
  const labels = { time:'time', timeEnd:'time', service:'service', address:'address', price:'price', notes:'notes', techId:'assignee' };
  const what = Array.from(new Set(Object.keys(fields).map(f=>labels[f]||f))).join(', ');
  const body = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
      <div style="font-size:18px;font-weight:800">Apply to future visits?</div>
      <button onclick="closeDyn('recur-edit')" style="background:none;border:none;font-size:22px;color:var(--hint);cursor:pointer;line-height:1">×</button>
    </div>
    <div style="font-size:13px;color:var(--muted);margin-bottom:16px">You changed the ${what} on a repeating visit. Apply that to the upcoming visits in this series too?</div>
    <button class="btn btn-secondary btn-full" style="margin-bottom:8px;justify-content:flex-start;text-align:left" onclick="closeDyn('recur-edit')"><i class="ti ti-calendar-event"></i>&nbsp; This visit only</button>
    <button class="btn btn-primary btn-full" style="justify-content:flex-start;text-align:left" onclick='recurEditApplyFuture(${JSON.stringify(seriesId)}, ${JSON.stringify(jobId)}, ${JSON.stringify(fromDate)}, ${JSON.stringify(fields)})'><i class="ti ti-calendar-repeat"></i>&nbsp; This &amp; all future visits</button>`;
  dynSheet('recur-edit', body, 250);
}
async function recurEditApplyFuture(seriesId, fromJobId, fromDate, fields){
  closeDyn('recur-edit');
  const ids = Array.from(new Set([
    ...(DS.get('recurkids_'+seriesId,[])||[]),
    ...getJobs().filter(x => x && x.recurSeriesId === seriesId).map(x => x.id) ]));
  let n = 0;
  for (const cid of ids){
    if (cid === fromJobId) continue;
    const cj = getJob(cid); if (!cj) continue;
    if (cj.date < fromDate) continue;                                            // future only
    if (cj.paid || ['done','completed','cancelled','didnotgo'].includes(cj.status)) continue; // skip billed/finished
    Object.assign(cj, fields);
    saveJob(cj);
    if (window._useCloud && window.CloudDS) { try { await CloudDS.saveJob(cj); } catch(e){} }
    n++;
  }
  toast(`<i class="ti ti-check" style="color:#4ade80"></i> Updated this + ${n} future visit${n!==1?'s':''}`);
  renderDashboard(); if (State.screen==='jobs') renderJobs();
}

// Resolve the recurring-series id for a job, even legacy jobs whose recur fields
// were stripped by an old cloud round-trip (falls back to the local recurkids_ index).
function findJobSeriesId(job){
  if (!job) return '';
  if (job.recurSeriesId) return job.recurSeriesId;
  if (job.recurMaster)   return job.id;
  if ((DS.get('recurkids_'+job.id, [])||[]).length > 0) return job.id; // job is a master
  try {
    for (let i=0; i<localStorage.length; i++){
      const k = localStorage.key(i);
      if (k && k.indexOf('hp_recurkids_') === 0){
        const sid = k.slice('hp_recurkids_'.length);
        if ((DS.get('recurkids_'+sid, [])||[]).includes(job.id)) return sid;
      }
    }
  } catch(e){}
  return '';
}

async function deleteJobFromDetail(jobId) {
  const j = getJob(jobId);
  const seriesId = findJobSeriesId(j);
  if (seriesId) { openRecurDeleteChoice(jobId, seriesId); return; }
  if (!confirm('Delete this job permanently? This cannot be undone.')) return;
  await _removeOneJob(jobId);
  closeModal('modal-job-detail'); State.editingJob = null;
  toast('<i class="ti ti-trash" style="color:#f87171"></i> Job deleted');
  renderDashboard();
  if (State.screen==='jobs') renderJobs();
  if (State.screen==='estimates') renderEstimates();
}
// Low-level single-job removal (cloud + local + per-job side stores + recurkids index).
async function _removeOneJob(jobId){
  const jb = getJob(jobId);
  const sid = jb && jb.recurSeriesId;
  try { await asyncDeleteJob(jobId); } catch(e) { try { deleteJob(jobId); } catch(_){} }
  ['sched_','discounts_','taxrate_','payments_','costitems_','lineitems_','assignees_'].forEach(p=>{ try{ DS.set(p+jobId, null);}catch(e){} });
  if (sid) { const k=(DS.get('recurkids_'+sid,[])||[]).filter(id=>id!==jobId); DS.set('recurkids_'+sid, k); }
}
function openRecurDeleteChoice(jobId, seriesId){
  const j = getJob(jobId);
  const dlabel = j ? new Date(j.date+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}) : 'this date';
  const body = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
      <div style="font-size:18px;font-weight:800">Delete recurring visit</div>
      <button onclick="closeDyn('recur-del')" style="background:none;border:none;font-size:22px;color:var(--hint);cursor:pointer;line-height:1">×</button>
    </div>
    <div style="font-size:13px;color:var(--muted);margin-bottom:16px">This is part of a repeating series. What should be deleted?</div>
    <button class="btn btn-secondary btn-full" style="margin-bottom:8px;justify-content:flex-start;text-align:left" onclick="recurDelete('${jobId}','${seriesId}','one')"><i class="ti ti-calendar-x"></i>&nbsp; This visit only <span style="color:var(--hint);font-weight:500">(${dlabel})</span></button>
    <button class="btn btn-secondary btn-full" style="margin-bottom:14px;justify-content:flex-start;text-align:left;color:var(--red)" onclick="recurDelete('${jobId}','${seriesId}','future')"><i class="ti ti-calendar-off"></i>&nbsp; This &amp; all future visits</button>
    <div style="font-size:11px;color:var(--hint);line-height:1.5;margin-bottom:12px">Past visits and any already paid or completed visits are always kept.</div>
    <button class="btn btn-secondary btn-full" onclick="closeDyn('recur-del')">Cancel</button>`;
  dynSheet('recur-del', body, 250);
}
async function recurDelete(jobId, seriesId, mode){
  closeDyn('recur-del');
  if (mode === 'one') {
    await _removeOneJob(jobId);
    closeModal('modal-job-detail'); State.editingJob = null;
    toast('<i class="ti ti-trash" style="color:#f87171"></i> Visit deleted');
    renderDashboard(); if (State.screen==='jobs') renderJobs(); if (State.screen==='estimates') renderEstimates();
    return;
  }
  // "This & all future": remove this visit + every later pending visit in the series.
  const j = getJob(jobId);
  const fromDate = j ? j.date : todayStr();
  const ids = Array.from(new Set([ jobId,
    ...(DS.get('recurkids_'+seriesId,[])||[]),
    ...getJobs().filter(x => x && x.recurSeriesId === seriesId).map(x => x.id) ]));
  let removed = 0;
  for (const cid of ids){
    const cj = getJob(cid); if (!cj) continue;
    if (cj.date < fromDate) continue;                                            // keep past visits
    if (cj.paid || ['done','completed','cancelled','didnotgo'].includes(cj.status)) continue; // keep billed/finished
    await _removeOneJob(cid);
    removed++;
  }
  // Stop the series from silently regenerating these dates again.
  DS.set('recursig_'+seriesId, '');
  closeModal('modal-job-detail'); State.editingJob = null;
  toast(`<i class="ti ti-trash" style="color:#f87171"></i> Removed ${removed} visit${removed!==1?'s':''} from here on`);
  renderDashboard(); if (State.screen==='jobs') renderJobs(); if (State.screen==='estimates') renderEstimates();
}

async function deleteJobFromForm() {
  if (!State.editingJob) return;
  const j = getJob(State.editingJob);
  if (!j) return;
  const sid = findJobSeriesId(j);
  if (sid) { closeAllModals(); openRecurDeleteChoice(j.id, sid); return; }
  const inv = getInvoices().find(i => i.jobId === j.id);
  const msg = `Delete this job?${inv ? '\n\nThis will also delete the linked invoice.' : ''}`;
  if (confirm(msg)) {
    await asyncDeleteJob(State.editingJob);
    if (inv) DS.set('invoices', getInvoices().filter(i => i.jobId !== j.id));
    DS.del('timer_' + j.id);
    // Delete messages related to this job (by date matching — keep customer messages)
    // Don't delete customer messages — only job-specific ones aren't stored separately
    State.editingJob = null;
    closeAllModals();
    renderDashboard();
    if (State.screen === 'jobs') renderJobs();
    if (State.screen === 'reports') renderReports();
    toast('<i class="ti ti-check" style="color:#4ade80"></i> Job deleted');
  }
}

function openCompleteJob(jobId) {
  State.editingJob=jobId;
  const j=getJob(jobId);
  const c=j?getCustomer(j.customerId):null;
  document.getElementById('cj-title').textContent=`Complete — ${c?fullName(c):'Job'}`;
  document.getElementById('cj-price').value=j?.price||'';
  document.getElementById('cj-notes').value=j?.notes||'';
  openModal('modal-complete-job');
}

function saveCompleteJob() {
  const j=getJob(State.editingJob); if(!j) return;
  j.status='done';
  j.price=parseFloat(document.getElementById('cj-price').value)||j.price;
  j.notes=document.getElementById('cj-notes').value;
  j.paid=document.getElementById('cj-payment').value==='cash';
  saveJob(j);
  const p=getProfile();
  if(p.autoInvoice){
    const c=getCustomer(j.customerId);
    const disc=c?tierDiscount(c.points):0;
    const items=[{desc:j.service,qty:1,price:j.price}];
    if(j.notes) items.push({desc:'Items: '+j.notes,qty:1,price:0});
    if(disc) items.push({desc:`${c?tierForPoints(c.points).name:''} discount (${(disc*100).toFixed(0)}%)`,qty:1,price:-Math.round(j.price*disc)});
    const inv={id:newId('inv'),jobId:j.id,customerId:j.customerId,date:j.date,items,status:j.paid?'paid':'unpaid'};
    saveInvoice(inv);
    if(j.paid&&c){const earned=Math.max(0,Math.round(invoiceTotal(inv)));c.points=(c.points||0)+earned;c.totalSpent=(c.totalSpent||0)+invoiceTotal(inv);saveCustomer(c);}
  }
  closeAllModals(); renderDashboard();
  toast('<i class="ti ti-check" style="color:#4ade80"></i> Job complete! Invoice created.');
}

// ─── REAL MESSAGING ──────────────────────────

// Twilio SMS via their REST API
// NOTE: For production, call your own backend to avoid exposing credentials.
// This uses Twilio's CORS-enabled endpoint for browser-based calls.
async function sendTwilioSMS(toPhone, message) {
  const p=getProfile();
  if(!p.twilioAccountSid||!p.twilioAuthToken||!p.twilioFromPhone){
    console.warn('Twilio not configured');
    return false;
  }
  const to='+1'+toPhone.replace(/\D/g,'').replace(/^1/,'');
  try {
    const resp = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${p.twilioAccountSid}/Messages.json`,
      {
        method:'POST',
        headers:{
          'Authorization':'Basic '+btoa(p.twilioAccountSid+':'+p.twilioAuthToken),
          'Content-Type':'application/x-www-form-urlencoded',
        },
        body:new URLSearchParams({To:to, From:p.twilioFromPhone, Body:message}),
      }
    );
    const data=await resp.json();
    if(data.sid){ console.log('SMS sent',data.sid); return true; }
    else{ console.error('Twilio error',data); toast('⚠️ SMS failed: '+data.message); return false; }
  } catch(e){ console.error('Twilio fetch error',e); toast('⚠️ SMS error — check console'); return false; }
}

// EmailJS — browser-side email sending



// Send both SMS + Email for "On My Way"



// ─── SMS MODAL ───────────────────────────────
function openSMSModal(custId) {
  State.viewingCustomer=custId;
  const c=getCustomer(custId);
  const p=getProfile();
  if(!c) return;
  document.getElementById('sms-to').textContent=`${fullName(c)} · ${fmtPhone(c.phone)} · ${c.email}`;
  document.getElementById('sms-body').value=`Hi ${c.firstName}! This is ${p.name.split(' ')[0]} from ${p.company}. `;
  document.getElementById('email-subject').value='';
  const hasKeys=p.twilioAccountSid||p.emailjsPublicKey;
  document.getElementById('sms-setup-warn').style.display=hasKeys?'none':'flex';
  switchMsgTab('sms');
  closeModal('modal-cust-detail');
  openModal('modal-sms');
}

function switchMsgTab(tab) {
  State.msgTab=tab;
  document.getElementById('sms-tab').className='btn btn-sm '+(tab==='sms'?'btn-primary':'btn-secondary');
  document.getElementById('email-tab').className='btn btn-sm '+(tab==='email'?'btn-primary':'btn-secondary');
  document.getElementById('email-subject-wrap').style.display=tab==='email'?'block':'none';
  document.getElementById('msg-body-label').textContent=tab==='sms'?'SMS Message':'Email Body';
}

function applySMSTemplate() {
  const c=getCustomer(State.viewingCustomer);
  const p=getProfile();
  const tpl=document.getElementById('sms-template').value;
  const name=c?c.firstName:'there';
  const from=p.name.split(' ')[0];
  const co=p.company;
  const templates={
    omw:`Hi ${name}! This is ${from} from ${co}. I'm on my way and should arrive in about 15 minutes. See you soon! 🚛`,
    confirm:`Hi ${name}! Your junk removal job with ${co} is confirmed. We'll see you at the scheduled time. Reply with any questions!`,
    followup:`Hi ${name}! Thanks for choosing ${co}! We'd love a quick review — it really helps us. Reply STOP to opt out.`,
    reward:`Hi ${name}! You have ${c?.points||0} reward points with ${co}. Use them for discounts on your next job! 🏆`,
    reminder:`Hi ${name}! Reminder: you have a junk removal appointment with ${co} coming up. Reply with any questions!`,
  };
  if(templates[tpl]) document.getElementById('sms-body').value=templates[tpl];
  if(tpl==='confirm'&&State.msgTab==='email') document.getElementById('email-subject').value=`${co} — Job Confirmation`;
  if(tpl==='followup'&&State.msgTab==='email') document.getElementById('email-subject').value=`${co} — Thank You!`;
}




function renderMessages() {
  const msgs=getMessages();
  const el=document.getElementById('sms-sent-list');
  if(!el) return;
  el.innerHTML=msgs.slice(0,10).map(m=>{
    const c=getCustomer(m.customerId);
    const icon=m.type==='email'?'ti-mail':'ti-message';
    return `<div style="padding:10px 0;border-bottom:1px solid var(--border)">
      <div class="flex gap-8 mb-4"><i class="ti ${icon}" style="color:var(--primary);font-size:14px"></i><span class="text-sm text-muted">${m.sent} · ${c?fullName(c):'?'}</span></div>
      <div style="font-size:13px">${m.text}</div>
    </div>`;
  }).join('')||'<div class="text-sm text-muted">No messages sent yet.</div>';
}

function openMessagesPanel() {
  renderMessages();
  openModal('modal-messages');
}

// ─── INIT ─────────────────────────────────────
function init() {
  seedData();
  const p=getProfile();
  document.getElementById('header-avatar').textContent=p.initials||'JD';
  if(p.emailjsPublicKey) emailjs.init(p.emailjsPublicKey);

  // Load saved Google Maps key so address autocomplete uses Google (not the
  // Nominatim fallback) on every page load — not just the session it was saved in.
  if(p.googleMapsKey && typeof loadGooglePlaces==='function'){
    window.GOOGLE_MAPS_KEY=p.googleMapsKey;
    loadGooglePlaces();
  }

  document.querySelectorAll('.modal-overlay').forEach(el=>{
    el.addEventListener('click', e=>{ if(e.target===el) closeAllModals(); });
  });
  document.querySelectorAll('[data-close]').forEach(btn=>{
    btn.addEventListener('click', ()=>closeAllModals());
  });

  showScreen((location.hash||'').replace('#','') || 'dashboard');
}

// Init called by supabase.js after auth — not directly from DOMContentLoaded
// document.addEventListener('DOMContentLoaded', init); // replaced by initWithSupabase()

// ─── AUTO-HANDLE GMB OAUTH REDIRECT ─────────
// After Google OAuth, code is in URL query params
// Exchange it via Netlify function for access token
(async function handleGMBOAuth() {
  const params = new URLSearchParams(window.location.search);
  const code   = params.get('code');
  const state  = params.get('state');
  const error  = params.get('error');

  // Log everything for debugging
  console.log('URL params on load:', {
    code:  code ? code.slice(0,20)+'...' : null,
    state, error,
    hash:  window.location.hash ? window.location.hash.slice(0,40) : null,
  });

  if (error) {
    console.error('OAuth error:', error, params.get('error_description'));
    setTimeout(() => toast('⚠️ Google auth error: ' + error, 5000), 800);
    return;
  }

  // Check hash for implicit flow token (fallback)
  const hash = window.location.hash;
  // Ignore Supabase auth callbacks (invite / recovery / magic-link / signup) —
  // those carry a type= and refresh_token and are handled by the set-password
  // flow in initWithSupabase(), not by GMB.
  const isSupabaseAuth = /type=(invite|recovery|signup|magiclink|email_change)/.test(hash) || hash.includes('refresh_token=');
  if (!isSupabaseAuth && hash.includes('access_token=')) {
    const hashParams = new URLSearchParams(hash.replace('#',''));
    const token = hashParams.get('access_token');
    if (token) {
      DS.set('gmb_access_token', token);
      window.history.replaceState(null, '', window.location.pathname);
      console.log('GMB token saved from hash (implicit flow)');
      setTimeout(() => {
        toast('<i class="ti ti-check" style="color:#4ade80"></i> Google authorized! GMB is active.', 5000);
        showScreen('settings');
      }, 800);
      return;
    }
  }

  if (!code) return;

  // Clean URL
  const redirectUriUsed = location.origin + location.pathname.replace(/[^/]*$/, '');
  window.history.replaceState(null, '', window.location.pathname);
  console.log('GMB auth code received — exchanging via gmb-oauth-exchange...');

  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/gmb-oauth-exchange`, {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${(window.Auth && Auth.token) ? Auth.token : ''}`, 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ code, redirectUri: redirectUriUsed }),
    });

    console.log('Token exchange response status:', resp.status);
    const data = await resp.json();
    console.log('Token exchange data:', data);

    if (data.access_token) {
      DS.set('gmb_access_token',  data.access_token);
      DS.set('gmb_refresh_token', data.refresh_token || '');
      DS.del('gmb_oauth_state');
      setTimeout(() => {
        toast('<i class="ti ti-check" style="color:#4ade80"></i> Google authorized! GMB is active.', 5000);
        showScreen('settings');
      }, 800);
    } else {
      console.error('Token exchange failed:', data);
      setTimeout(() => {
        toast('⚠️ Auth exchange failed: ' + (data.error || 'unknown error'), 6000);
        showScreen('settings');
      }, 800);
    }
  } catch(e) {
    console.error('Token exchange error:', e);
    setTimeout(() => toast('⚠️ Auth error: ' + e.message, 5000), 800);
  }
})();



function saveJobPricing(jobId) {
  const j = getJob(jobId);
  if (!j) return;
  const jp = document.getElementById('jd-price');
  if (jp) j.price = parseFloat(jp.value) || j.price;
  const pm = document.getElementById('jd-payment');
  if (pm) j.payment = pm.value;
  saveJob(j);
  if (window._useCloud && window.CloudDS) { try { CloudDS.saveJob(j).catch(e=>console.warn('Cloud job save failed:', e)); } catch(e){} }
  toast('<i class="ti ti-check" style="color:#4ade80"></i> Price saved');
  renderDashboard();
  if (State.screen === 'jobs') renderJobs();
}

async function setJobStatus(jobId, newStatus) {
  const j = getJob(jobId);
  if (!j) return;
  const c = getCustomer(j.customerId);
  const p = getProfile();

  j.status = newStatus;
  // Stop the running timer when the job is closed out (complete / cancelled / did-not-go)
  if (['done','cancelled','didnotgo'].includes(newStatus)) {
    const t = getJobTimer(jobId);
    if (t && t.running) {
      t.elapsed += Date.now() - t.startedAt;
      t.running = false;
      t.startedAt = null;
      saveJobTimer(jobId, t);
    }
    try { stopDriveTimer(jobId); } catch(e){} // bank drive time if still running
    clearInterval(_timerInterval);
  }
  // Save price if in detail view
  const priceEl = document.getElementById('jd-price');
  if (priceEl) j.price = parseFloat(priceEl.value) || j.price;
  saveJob(j);
  if (window._useCloud && window.CloudDS) { try { await CloudDS.saveJob(j); } catch(e){ console.warn('Cloud job save failed:', e); } }

  // Update button styles in detail view
  document.getElementById('jds-inprogress')?.classList.toggle('btn-primary',    newStatus === 'inprogress');
  document.getElementById('jds-inprogress')?.classList.toggle('btn-secondary',  newStatus !== 'inprogress');
  document.getElementById('jds-done')?.classList.toggle('btn-green',    newStatus === 'done');
  document.getElementById('jds-done')?.classList.toggle('btn-secondary', newStatus !== 'done');

  if (newStatus === 'done') {
    // Auto-create invoice
    if (p.autoInvoice && !getInvoices().find(i => i.jobId === jobId)) {
      const disc  = c ? tierDiscount(c.points) : 0;
      // Use line items if available, otherwise use job price
      const lineItems = getJobLineItems(j.id);
      let items;
      if (lineItems.length) {
        items = lineItems.map(li => ({ desc: li.label, qty: li.qty, price: li.price * li.qty }));
        if (disc) items.push({ desc: `${tierForPoints(c.points).name} discount (${(disc*100).toFixed(0)}%)`, qty:1, price: -Math.round(lineItemTotal({reduce:(fn,s)=>lineItems.reduce((s,i)=>s+(i.price*i.qty),0)}) * disc) });
      } else {
        items = [{ desc: getServiceLabel(j.service) || j.service, qty: 1, price: j.price || 0 }];
        if (j.notes) items.push({ desc: 'Items: ' + j.notes, qty: 1, price: 0 });
        if (disc) items.push({ desc: `${tierForPoints(c.points).name} discount (${(disc*100).toFixed(0)}%)`, qty:1, price: -Math.round((j.price||0) * disc) });
      }
      const inv = { id:newUUID(), jobId:j.id, customerId:j.customerId, date:j.date, items, status:'unpaid' };
      saveInvoice(inv);
      if (window._useCloud && window.CloudDS) { try { await CloudDS.saveInvoice(inv); } catch(e){ console.warn('Cloud invoice save failed:', e); } }
    }
    // Award points if paid cash
    if (j.payment === 'cash' && c) {
      c.points = (c.points||0) + Math.max(0, Math.round(j.price||0));
      c.totalSpent = (c.totalSpent||0) + (j.price||0);
      saveCustomer(c);
      if (window._useCloud && window.CloudDS) { try { await CloudDS.saveCustomer(c); } catch(e){} }
    }
    // Trigger daily GMB post (fires async, won't block UI)
    setTimeout(() => handleDailyGMBPost(jobId).catch(e => console.warn('GMB post error:', e)), 2000);
    toast('<i class="ti ti-check" style="color:#4ade80"></i> Job complete!');
    try { openJobDetail(jobId); } catch(e){} // refresh in place (buttons/status now reflect Completed) — stay on this job
    // Ask before sending the review request — not every job should get one.
    openReviewSendChoice(jobId);
  } else if (newStatus === 'cancelled' || newStatus === 'didnotgo') {
    // Terminal states too — close back out to the list, same as Complete, so the change is visible.
    closeModal('modal-job-detail');
    toast(newStatus === 'cancelled'
      ? '<i class="ti ti-x" style="color:var(--red)"></i> Job cancelled'
      : '<i class="ti ti-thumb-down"></i> Marked as did not go through');
  } else if (newStatus === 'paused') {
    // Not terminal — stay on the job screen, just refresh it so the status row/timer reflect the pause.
    toast('<i class="ti ti-player-pause" style="color:var(--orange)"></i> Job paused');
    try { openJobDetail(jobId); } catch(e){}
  } else if (newStatus === 'inprogress') {
    toast('<i class="ti ti-loader" style="color:var(--primary)"></i> Job marked in progress');
  }

  renderDashboard();
  if (State.screen === 'jobs') renderJobs();
}

async function sendOMWFromDetail(jobId) {
  // Save price first
  const j = getJob(jobId);
  if (j) {
    const priceEl = document.getElementById('jd-price');
    if (priceEl && priceEl.value) { j.price = parseFloat(priceEl.value); saveJob(j); }
    // Set to in progress automatically
    if (j.status === 'scheduled') { j.status = 'inprogress'; saveJob(j); }
  }
  if (!hasGoneOMW(jobId)) startDriveTimer(jobId); // begin tracking drive time (once, until Start)
  await sendOMW(jobId);
  // Refresh detail view buttons
  openJobDetail(jobId);
}

// ─── ADDRESS AUTOCOMPLETE ─────────────────────

function attachAutocomplete() {
  setupAddressInput('cf-addr',     'cf-addr-suggestions');
  setupAddressInput('jf-address',  'jf-address-suggestions');
}

function setupAddressInput(inputId, suggestionsId) {
  const input = document.getElementById(inputId);
  const box   = document.getElementById(suggestionsId);
  if (!input || !box) return;

  // Remove old listeners by cloning
  const newInput = input.cloneNode(true);
  input.parentNode.replaceChild(newInput, input);

  let debounceTimer;
  let sessionToken;

  newInput.addEventListener('input', function() {
    clearTimeout(debounceTimer);
    const val = this.value.trim();
    if (val.length < 3) { box.style.display = 'none'; return; }

    debounceTimer = setTimeout(() => {
      if (window.googlePlacesReady && window.google?.maps?.places) {
        // Use Google Places Autocomplete Service
        if (!sessionToken) {
          sessionToken = new google.maps.places.AutocompleteSessionToken();
        }
        // Legacy Google Autocomplete — its predictions' `description` includes the
        // city. Used as the primary fallback when the new Places API isn't present
        // or errors, BEFORE dropping to Nominatim (which lacks reliable city data).
        const runLegacyGoogle = () => {
          if (!google.maps.places.AutocompleteService) {
            fetchNominatim(val, box, newInput); return;
          }
          const svc = new google.maps.places.AutocompleteService();
          svc.getPlacePredictions({
            input: val,
            sessionToken,
            componentRestrictions: { country: 'us' },
            types: ['address'],
            bounds: new google.maps.LatLngBounds(
              new google.maps.LatLng(24.5465, -87.6349),
              new google.maps.LatLng(31.0017, -80.0310)
            ),
          }, (predictions, status) => {
            if (status !== google.maps.places.PlacesServiceStatus.OK || !predictions) {
              fetchNominatim(val, box, newInput); return;
            }
            showSuggestions(box, predictions
              .filter(p => p.description.includes('FL') || p.description.includes('Florida'))
              .map(p => ({ label: p.description, value: p.description })),
            newInput, () => { sessionToken = null; });
          });
        };

        // Prefer the new Places API; on error or empty result fall through to
        // legacy Google (still has city), and only then to Nominatim.
        if (window.google?.maps?.places?.AutocompleteSuggestion) {
          const request = {
            input: val,
            sessionToken,
            includedRegionCodes: ['us'],
            locationBias: { west: -87.6349, south: 24.5465, east: -80.0310, north: 31.0017 },
          };
          google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(request)
            .then(({ suggestions }) => {
              const filtered = (suggestions || [])
                .filter(s => s.placePrediction?.text?.text?.includes('FL') || s.placePrediction?.text?.text?.includes('Florida'))
                .map(s => ({
                  label: s.placePrediction.text.text,
                  value: s.placePrediction.text.text,
                }));
              if (!filtered.length) { runLegacyGoogle(); return; }
              showSuggestions(box, filtered, newInput, () => { sessionToken = null; });
            })
            .catch(err => {
              console.warn('Places API (New) failed — falling back to legacy Google:', err);
              runLegacyGoogle();
            });
        } else {
          runLegacyGoogle();
        }
      } else {
        // Fallback: use free Nominatim geocoder (no key needed)
        fetchNominatim(val, box, newInput);
      }
    }, 350);
  });

  newInput.addEventListener('blur', () => {
    setTimeout(() => { box.style.display = 'none'; }, 200);
  });
  newInput.addEventListener('focus', () => {
    if (newInput.value.length >= 3) newInput.dispatchEvent(new Event('input'));
  });
}

async function fetchNominatim(query, box, input) {
  try {
    // Use structured query for better Florida city results
    // Append Florida to query for better local results
    const flQuery = query.toLowerCase().includes('fl') || query.toLowerCase().includes('florida')
      ? query : query + ', Florida';
    // Use structured search to force street-level results with proper city
    const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&countrycodes=us&q=${encodeURIComponent(flQuery)}&viewbox=-87.6349,31.0017,-80.0310,24.5465&bounded=1&dedupe=1`;
    const resp = await fetch(url, { headers: { 'Accept-Language': 'en', 'User-Agent': 'HaulPro/1.0' } });
    const data = await resp.json();
    if (!data.length) { box.style.display = 'none'; return; }

    const suggestions = data.map(item => {
      const a = item.address;

      // Street number + road
      const street = [a.house_number, a.road].filter(Boolean).join(' ');

      // City hierarchy — Florida cities often appear as city_district or town
      // Florida cities often come back as 'census', 'locality', or 'place'
      // Real Nominatim city-level fields, in priority order.
      // Deliberately excludes `county` — a county is never shown as the city.
      const city =
        a.city ||
        a.town ||
        a.village ||
        a.hamlet ||
        a.municipality ||
        a.suburb ||
        a.city_district ||
        '';

      // Nominatim returns the full state name ("Florida"); show the abbreviation
      // to match the rest of the app and to satisfy the ", FL" filter below.
      const state = (a.state === 'Florida' || a['ISO3166-2-lvl4'] === 'US-FL')
        ? 'FL' : (a.state || '');
      const zip   = a.postcode || '';

      let label;
      if (street && city) {
        // Full address: 123 Main St, Lakeland, FL 33801
        label = `${street}, ${city}, ${state}${zip?' '+zip:''}`;
      } else if (city && state) {
        // City only: Lakeland, FL
        label = `${city}, ${state}${zip?' '+zip:''}`;
      } else {
        // Last resort: clean up display_name — and never let a county
        // ("Polk County") stand in for the city.
        const parts = item.display_name.split(',').map(p => p.trim());
        const filtered = parts.filter(p =>
          p !== 'United States' &&
          !/county/i.test(p) &&
          !/^\d{5}$/.test(p) &&
          p.length > 1
        );
        label = filtered.slice(0, 4).join(', ');
      }

      return { label: label.trim(), value: label.trim() };
    })
    .filter(s => s.label.length > 5)
    .filter(s => {
      // Filter out county names unless that's all we have
      return !s.label.includes('County') || data.length === 1;
    })
    .filter(s => {
      // Only show Florida results
      return s.label.includes(', FL') ||
             s.label.includes(', Florida') ||
             s.label.toLowerCase().includes('florida');
    });

    // Remove duplicates
    const seen  = new Set();
    const unique = suggestions.filter(s => {
      const key = s.label.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (unique.length) {
      showSuggestions(box, unique, input, null);
    } else {
      // If all filtered out, show unfiltered
      showSuggestions(box, suggestions.slice(0,4), input, null);
    }
  } catch(e) {
    console.warn('Nominatim error:', e);
    box.style.display = 'none';
  }
}

async function fetchGoogleGeocode(query, box, input, apiKey) {
  try {
    const flQuery = query.includes('FL') || query.includes('Florida') ? query : query + ', Florida';
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(flQuery)}&components=administrative_area:FL|country:US&key=${apiKey}`;
    const resp = await fetch(url);
    const data = await resp.json();
    if (data.status !== 'OK' || !data.results?.length) {
      box.style.display = 'none'; return;
    }
    const suggestions = data.results.slice(0,5).map(r => {
      // Extract city from address components
      const comps  = r.address_components;
      const city   = comps.find(c => c.types.includes('locality'))?.long_name || '';
      const state  = comps.find(c => c.types.includes('administrative_area_level_1'))?.short_name || '';
      const zip    = comps.find(c => c.types.includes('postal_code'))?.long_name || '';
      const street = r.formatted_address.split(',')[0];
      const label  = city ? `${street}, ${city}, ${state} ${zip}`.trim() : r.formatted_address;
      return { label, value: label };
    }).filter(s => s.label.includes('FL') || s.label.includes('Florida'));
    showSuggestions(box, suggestions, input, null);
  } catch(e) {
    console.warn('Google Geocode error:', e);
    box.style.display = 'none';
  }
}

function showSuggestions(box, suggestions, input, onSelect) {
  if (!suggestions.length) { box.style.display = 'none'; return; }
  box.innerHTML = suggestions.map((s, i) =>
    `<div data-idx="${i}" style="padding:11px 14px;font-size:13px;cursor:pointer;border-bottom:0.5px solid var(--border);display:flex;align-items:center;gap:8px">
      <i class="ti ti-map-pin" style="color:var(--primary);font-size:14px;flex-shrink:0"></i>
      <span>${s.label}</span>
    </div>`
  ).join('');
  box.style.display = 'block';

  box.querySelectorAll('[data-idx]').forEach(el => {
    el.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const idx = parseInt(el.dataset.idx);
      input.value = suggestions[idx].value;
      box.style.display = 'none';
      if (onSelect) onSelect();
      input.dispatchEvent(new Event('change'));
    });
    el.addEventListener('mouseover', () => { el.style.background = 'var(--primary-lt)'; });
    el.addEventListener('mouseout',  () => { el.style.background = ''; });
  });
}

// ─── APPLY JOB STATUS FROM DROPDOWN ─────────
function applyJobStatus(jobId) {
  const sel = document.getElementById('jd-status-select');
  if (!sel || !sel.value) { toast('⚠️ Select a status first'); return; }
  setJobStatus(jobId, sel.value);
}

// ═══════════════════════════════════════════════
//  EMPLOYEE AUTH & TIME TRACKING
// ═══════════════════════════════════════════════

// ─── EMPLOYEE DATA ───────────────────────────
function getEmployees() { return DS.getEmployees(); }
function getEmployee(id) { return DS.getEmployee(id); }
function getCurrentEmployee() { return DS.getCurrentEmployee(); }
function saveEmployee(emp) {
  const result = DS.saveEmployee(emp);
  if (result && result.error) { toast("⚠️ "+result.error); return false; }
  return true;
}
function getTimeEntries() { return DS.getTimeEntries(); }
function saveTimeEntry(entry) {
  DS.saveTimeEntry(entry);
  if (window._useCloud && window.CloudDS && CloudDS.saveTimeEntry) { CloudDS.saveTimeEntry(entry).catch(()=>{}); }
}
async function hydrateTimeEntries() {
  if (!(window._useCloud && window.CloudDS && window.CloudDS.getTimeEntries)) return;
  try {
    const cloud = await CloudDS.getTimeEntries();
    if (Array.isArray(cloud)) DS.set('time_entries', mergeById(getTimeEntries(), cloud));
  } catch (e) {}
}
// Pulls in messages that arrived server-side (a customer's inbound text via the Twilio
// webhook) or were sent from another device — neither would otherwise ever reach this one.
async function hydrateMessages() {
  if (!(window._useCloud && window.CloudDS && window.CloudDS.getMessages)) return;
  try {
    const cloud = await CloudDS.getMessages();
    if (Array.isArray(cloud)) DS.set('messages', mergeById(getMessages(), cloud).slice(0, 200));
  } catch (e) {}
}

// ─── SEED EMPLOYEES ──────────────────────────
function seedEmployees() {
  return; // Real accounts start with no team — demo employees disabled for production.
  if (DS.get('emp_seeded')) return;
  const profile = getProfile();
  DS.set('employees', [
    { id:'e1', name:'Matt',  role:'owner',       pin:'5931', color:'#1a6fdb', initials:'MT', active:true },
    { id:'e2', name:'Wayne', role:'technician',  pin:'5930', color:'#1a8a4a', initials:'WY', active:true },
    { id:'e3', name:'John',  role:'technician',  pin:'5555', color:'#e07b10', initials:'JN', active:true },
  ]);
  DS.set('emp_seeded', true);
}

// ─── JOB TIMER STATE ─────────────────────────
// Stored in localStorage so it survives page refresh
function getJobTimer(jobId) { return DS.getJobTimer(jobId); }
function saveJobTimer(jobId, data) { DS.saveJobTimer(jobId, data); }

// ── Drive-time timer (On My Way → Start). Separate from the on-job timer. ──
function getDriveTimer(jobId){ return DS.get('drive_'+jobId, null); }
function saveDriveTimer(jobId, t){ DS.set('drive_'+jobId, t); pushJobExtras(jobId); }
function hasGoneOMW(jobId){ return !!getDriveTimer(jobId); }
function getDriveMs(jobId){ const t=getDriveTimer(jobId); if(!t) return 0; return t.running ? (t.elapsed||0)+(Date.now()-t.startedAt) : (t.elapsed||0); }
function startDriveTimer(jobId){ const ex=getDriveTimer(jobId); if(ex&&ex.running) return; saveDriveTimer(jobId,{ startedAt:Date.now(), elapsed: ex?(ex.elapsed||0):0, running:true }); }
function stopDriveTimer(jobId){ const t=getDriveTimer(jobId); if(!t||!t.running) return; t.elapsed=(t.elapsed||0)+(Date.now()-t.startedAt); t.running=false; t.startedAt=null; saveDriveTimer(jobId,t); }

function startJobTimer(jobId) {
  const existing = getJobTimer(jobId);
  if (existing && existing.running) return; // already running
  stopDriveTimer(jobId); // arriving on site → bank the drive time
  const timer = {
    jobId,
    startedAt: Date.now(),
    elapsed: existing ? (existing.elapsed || 0) : 0,
    running: true,
  };
  saveJobTimer(jobId, timer);
  // Update job status to inprogress
  const j = getJob(jobId);
  if (j && j.status === 'scheduled') { j.status = 'inprogress'; saveJob(j); }
  openJobDetail(jobId); // refresh view
  renderDashboard();
  toast('<i class="ti ti-player-play" style="color:#4ade80"></i> On-job timer started');
}

function pauseJobTimer(jobId) {
  const timer = getJobTimer(jobId);
  if (!timer || !timer.running) return;
  timer.elapsed += Date.now() - timer.startedAt;
  timer.running = false;
  timer.startedAt = null;
  saveJobTimer(jobId, timer);
  openJobDetail(jobId);
  toast('<i class="ti ti-player-pause" style="color:#f9c74f"></i> Timer paused');
}

function getElapsedMs(jobId) {
  const timer = getJobTimer(jobId);
  if (!timer) return 0;
  if (timer.running) return timer.elapsed + (Date.now() - timer.startedAt);
  return timer.elapsed || 0;
}

function fmtElapsed(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2,'0')}m`;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}
// Decimal "payroll hours" (e.g. 7.50) — the form payroll systems like Gusto expect,
// rather than the 7h 30m display used elsewhere in the app.
function fmtPayrollHours(ms){ return (ms/3600000).toFixed(2); }

// Live timer tick — updates the display every second
let _timerInterval = null;
function startTimerDisplay(jobId) {
  clearInterval(_timerInterval);
  _timerInterval = setInterval(() => {
    const de = document.getElementById('drive-timer-display');
    const je = document.getElementById('job-timer-display');
    if (!de && !je) { clearInterval(_timerInterval); return; }
    if (de) de.textContent = fmtElapsed(getDriveMs(jobId));
    if (je) je.textContent = fmtElapsed(getElapsedMs(jobId));
  }, 1000);
}

// ─── UPDATED JOB DETAIL (with timer) ────────
// Override the openJobDetail from above
function streetViewCard(address, flatTop) {
  if (!address) return '';
  const enc    = encodeURIComponent(address);
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${enc}`;
  const topR   = flatTop ? '0 0 10px 10px' : 'var(--r-card)';
  if (!window.GOOGLE_MAPS_KEY) {
    return `<div class="card" style="margin-bottom:10px;text-align:center;padding:20px 16px;background:#f7f8fa;border-radius:${topR};${flatTop?'border-top:none':''}">
      <i class="ti ti-map-pin-off" style="font-size:26px;color:var(--hint)"></i>
      <div class="text-sm text-muted" style="margin-top:8px">Add a Google Maps API key in Settings → API to see a map here.</div>
    </div>`;
  }
  const key    = window.GOOGLE_MAPS_KEY;
  const img    = `https://maps.googleapis.com/maps/api/streetview?size=640x320&location=${enc}&fov=80&pitch=8&key=${key}`;
  const staticImg = `https://maps.googleapis.com/maps/api/staticmap?size=640x320&scale=1&markers=color:0x0f2d6b%7C${enc}&key=${key}`;
  const cid    = 'sv-' + Math.random().toString(36).slice(2,8);
  setTimeout(() => checkStreetView(enc, key, cid), 40);
  return `<div class="card" id="${cid}" style="padding:0;overflow:hidden;margin-bottom:10px;cursor:pointer;border-radius:${topR};${flatTop?'border-top:none':''}" onclick="window.open('${mapUrl}','_blank')">
    <div style="position:relative">
      <img src="${img}" loading="lazy" alt="Street view of property" style="width:100%;height:165px;object-fit:cover;display:block;background:#eef0f3" onerror="this.onerror=null;this.src='${staticImg}'">
      <div style="position:absolute;bottom:8px;right:8px;background:rgba(255,255,255,0.92);border-radius:20px;padding:5px 11px;font-size:12px;font-weight:700;color:var(--primary);display:flex;align-items:center;gap:5px"><i class="ti ti-map-pin"></i> <span id="${cid}-label">Street View</span></div>
    </div>
  </div>`;
}

async function checkStreetView(encAddress, key, cardId) {
  try {
    const r = await fetch(`https://maps.googleapis.com/maps/api/streetview/metadata?location=${encAddress}&key=${key}`);
    const d = await r.json();
    if (d.status !== 'OK') {
      // No Street View coverage here (common for rural/new addresses) — fall back to a plain map pin instead of hiding the card.
      const img = document.querySelector(`#${cardId} img`);
      const lbl = document.getElementById(`${cardId}-label`);
      if (img) img.src = `https://maps.googleapis.com/maps/api/staticmap?size=640x320&scale=1&markers=color:0x0f2d6b%7C${encAddress}&key=${key}`;
      if (lbl) lbl.textContent = 'Map';
    }
  } catch (e) { /* leave image; hard load failures handled by onerror */ }
}

// ── Reschedule a job (change date/time) + optional customer notification ──
function ensureReschedInputs(){
  ['rs-date','rs-start','rs-end'].forEach(id=>{ if(!document.getElementById(id)){ const i=document.createElement('input'); i.type='hidden'; i.id=id; document.body.appendChild(i); } });
}
function openReschedule(jobId){
  const j=getJob(jobId); if(!j) return;
  if(['done','cancelled','didnotgo'].includes(j.status)) return; // finished jobs aren't rescheduled here
  window._reschedule={ id:jobId, date:j.date, time:j.time, timeEnd:j.timeEnd||'' };
  renderRescheduleSheet();
}
function renderRescheduleSheet(){
  const r=window._reschedule; if(!r) return;
  const body=`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <div style="font-size:18px;font-weight:800">Reschedule job</div>
      <button onclick="closeDyn('resched')" style="background:none;border:none;font-size:24px;color:var(--hint);cursor:pointer;line-height:1">×</button>
    </div>
    <div class="card" style="padding:0;margin-bottom:14px">
      <div class="inv-row" style="padding:13px 14px;cursor:pointer" onclick="reschedPick('date')"><span class="text-muted"><i class="ti ti-calendar"></i> Date</span><span style="font-weight:700;color:var(--primary)">${new Date(r.date+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}</span></div>
      <div class="inv-row" style="padding:13px 14px;cursor:pointer" onclick="reschedPick('start')"><span class="text-muted"><i class="ti ti-clock"></i> Start time</span><span style="font-weight:700;color:var(--primary)">${fmt12(r.time)}</span></div>
      <div class="inv-row" style="padding:13px 14px;cursor:pointer;border:none" onclick="reschedPick('end')"><span class="text-muted"><i class="ti ti-clock-stop"></i> End time</span><span style="font-weight:700;color:var(--primary)">${r.timeEnd?fmt12(r.timeEnd):'Set end'}</span></div>
    </div>
    <button class="btn btn-primary btn-full" onclick="saveReschedule()"><i class="ti ti-calendar-check"></i> Save new time</button>`;
  dynSheet('resched', body, 250);
}
function reschedPick(which){
  ensureReschedInputs();
  const r=window._reschedule; if(!r) return;
  if(which==='date'){ const el=document.getElementById('rs-date'); el.value=r.date; openDatePicker('rs-date','rs-date',()=>{ r.date=document.getElementById('rs-date').value||r.date; renderRescheduleSheet(); }); }
  else if(which==='start'){ const el=document.getElementById('rs-start'); el.value=r.time; openTimePicker('rs-start','rs-start',()=>{ r.time=document.getElementById('rs-start').value||r.time; if(r.timeEnd && r.timeEnd<r.time) r.timeEnd=''; renderRescheduleSheet(); }); }
  else if(which==='end'){ const el=document.getElementById('rs-end'); el.value=r.timeEnd||r.time; openTimePicker('rs-end','rs-end',()=>{ r.timeEnd=document.getElementById('rs-end').value||''; renderRescheduleSheet(); }); }
}
async function saveReschedule(){
  const r=window._reschedule; if(!r) return;
  const j=getJob(r.id); if(!j) return;
  const timeChanged=(j.time!==r.time)||((j.timeEnd||'')!==(r.timeEnd||''));
  const changed=(j.date!==r.date)||timeChanged;
  j.date=r.date; j.time=r.time; j.timeEnd=r.timeEnd||'';
  saveJob(j);
  if(changed){ try{ DS.del('drive_'+r.id); }catch(e){} } // rescheduled → allow "On My Way" again, reset drive time
  if(window._useCloud && window.CloudDS){ try{ await CloudDS.saveJob(j); }catch(e){} }
  closeDyn('resched');
  renderDashboard(); if(State.screen==='jobs') renderJobs();
  try{ openJobDetail(r.id); }catch(e){}
  toast('<i class="ti ti-check" style="color:#4ade80"></i> Job rescheduled');
  // Part of a recurring series and the TIME moved (date shifts stay per-visit)?
  // Offer to move the future visits too — otherwise they'd silently keep the old time.
  if(timeChanged){
    const sid=findJobSeriesId(j);
    if(sid) openRecurEditChoice(sid, j.id, j.date, { time:j.time, timeEnd:j.timeEnd });
  }
  if(changed) openNotifyRescheduleChoice(r.id);
}
function openNotifyRescheduleChoice(jobId){
  const j=getJob(jobId); if(!j) return;
  const c=getCustomer(j.customerId);
  const canText=!!(c&&c.phone);
  const when=`${new Date(j.date+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})} at ${fmt12(j.time)}${j.timeEnd?'–'+fmt12(j.timeEnd):''}`;
  const body=`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
      <div style="font-size:18px;font-weight:800">Notify customer?</div>
      <button onclick="closeDyn('resched-notify')" style="background:none;border:none;font-size:24px;color:var(--hint);cursor:pointer;line-height:1">×</button>
    </div>
    <div style="font-size:13px;color:var(--muted);margin-bottom:16px">Text ${c?c.firstName:'the customer'} to let them know their new time: <b>${when}</b>?</div>
    ${canText
      ? `<button class="btn btn-primary btn-full" style="margin-bottom:8px" onclick="sendRescheduleNotice('${jobId}')"><i class="ti ti-message"></i> Yes, text them the new time</button>`
      : `<div class="text-sm text-muted" style="margin-bottom:8px">No phone on file to text.</div>`}
    <button class="btn btn-secondary btn-full" onclick="closeDyn('resched-notify')">Don't notify</button>`;
  dynSheet('resched-notify', body, 260);
}
async function sendRescheduleNotice(jobId){
  const j=getJob(jobId); if(!j) return;
  const c=getCustomer(j.customerId); const p=getProfile();
  if(!c||!c.phone){ toast('⚠️ No phone on file'); return; }
  const when=`${new Date(j.date+'T12:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})} at ${fmt12(j.time)}${j.timeEnd?'–'+fmt12(j.timeEnd):''}`;
  const msg=`Hi ${c.firstName}, your ${p.company||'service'} appointment has been rescheduled to ${when}. Reply or call us with any questions. Reply STOP to opt out.`;
  const ok=await sendSMS(c.phone, msg);
  closeDyn('resched-notify');
  if(ok){ try{ asyncLogMessage({ id:newId('m'), customerId:c.id, text:msg, sent:nowTime(), type:'reschedule', date:todayStr(), jobId }); }catch(e){} toast(`<i class="ti ti-check" style="color:#4ade80"></i> ${c.firstName} notified of the new time`); }
}

// ── Job tags + job-level lead source (separate from the CLIENT's lead source:
//    the same client can find you a different way for each job) ──
function getJobTagList(){ return getJobSetupList('job_tags'); }
function getJobTags(jobId){ return DS.get('jobtags_'+jobId, []); }
function saveJobTags(jobId, tags){ DS.set('jobtags_'+jobId, tags); pushJobExtras(jobId); }
function getJobLeadSource(jobId){ return DS.get('jobsrc_'+jobId, ''); }
function saveJobLeadSource(jobId, src){ DS.set('jobsrc_'+jobId, src); pushJobExtras(jobId); }
function setJobLeadSource(jobId){
  const sel=document.getElementById('jd-job-source'); if(!sel) return;
  saveJobLeadSource(jobId, sel.value);
}
// Summary row (shown on the job detail) — tap to open the multi-select checklist.
function renderJobTagsSrc(jobId){
  const el=document.getElementById('jd-tags-src'); if(!el) return;
  const mine=getJobTags(jobId);
  const src=getJobLeadSource(jobId);
  const sources=getLeadSources();
  el.innerHTML=`
    <div onclick="openJobTagsPicker('${jobId}')" style="display:flex;align-items:center;gap:10px;cursor:pointer;margin-bottom:14px">
      <div style="flex:1;display:flex;flex-wrap:wrap;gap:6px">
        ${mine.length ? mine.map(t=>`<span style="background:var(--primary-lt);color:var(--primary);border-radius:999px;padding:5px 12px;font-size:12px;font-weight:700">${t}</span>`).join('') : `<span class="text-sm text-muted">Add tags…</span>`}
      </div>
      <i class="ti ti-chevron-right" style="color:var(--hint)"></i>
    </div>
    <div style="display:flex;align-items:center;gap:10px">
      <span class="text-sm text-muted" style="white-space:nowrap"><i class="ti ti-speakerphone"></i> Job lead source</span>
      <select class="form-input" id="jd-job-source" style="flex:1;font-size:13px" onchange="setJobLeadSource('${jobId}')">
        <option value="">How'd they find you this time?</option>
        ${sources.map(s=>`<option value="${s}" ${s===src?'selected':''}>${s}</option>`).join('')}
      </select>
    </div>`;
}
// ── Dropdown-style multi-select checklist (bottom sheet), with an "add a new tag"
//    row at the bottom so a missing tag can be created on the spot. ──
function openJobTagsPicker(jobId){ renderJobTagsPicker(jobId); }
function renderJobTagsPicker(jobId){
  const all=getJobTagList();
  const mine=getJobTags(jobId);
  const body=`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <div style="font-size:18px;font-weight:800">Job tags</div>
      <button onclick="closeDyn('tags-picker')" style="background:none;border:none;font-size:24px;color:var(--hint);cursor:pointer;line-height:1">×</button>
    </div>
    <div class="text-sm text-muted" style="margin-bottom:12px">Select any that fit this job — zero, a few, or all of them.</div>
    <div style="max-height:44vh;overflow-y:auto;margin-bottom:4px">
      ${all.length ? all.map(t=>{ const on=mine.includes(t); return `
        <label style="display:flex;align-items:center;gap:12px;padding:11px 4px;border-bottom:1px solid var(--border);cursor:pointer">
          <input type="checkbox" ${on?'checked':''} onchange="toggleJobTagPick('${jobId}','${t.replace(/'/g,"\\'")}')" style="width:20px;height:20px;accent-color:var(--primary);flex-shrink:0">
          <span style="font-size:14px;font-weight:600">${t}</span>
        </label>`; }).join('') : `<div class="text-sm text-muted" style="padding:8px 0">No tags yet — add your first below.</div>`}
    </div>
    <div style="display:flex;gap:8px;margin-top:12px">
      <input class="form-input" id="tp-new-tag" placeholder="Add a new tag…" onkeyup="if(event.key==='Enter')addNewJobTagInline('${jobId}')">
      <button class="btn btn-primary btn-sm" style="white-space:nowrap" onclick="addNewJobTagInline('${jobId}')"><i class="ti ti-plus"></i> Add</button>
    </div>`;
  dynSheet('tags-picker', body, 260);
  setTimeout(()=>{ const i=document.getElementById('tp-new-tag'); }, 0);
}
function toggleJobTagPick(jobId, tag){
  let t=getJobTags(jobId);
  if(t.includes(tag)) t=t.filter(x=>x!==tag); else t=[...t, tag];
  saveJobTags(jobId, t);
  renderJobTagsSrc(jobId); // keep the summary row current underneath
  // Checkbox already reflects the click; no need to re-render the whole picker.
}
function addNewJobTagInline(jobId){
  const inp=document.getElementById('tp-new-tag');
  const val=(inp?.value||'').trim();
  if(!val) return;
  const all=getJobTagList();
  if(all.some(x=>String(x).toLowerCase()===val.toLowerCase())){ toast('That tag already exists'); return; }
  const updated=[...all, val];
  saveJobSetupList('job_tags', updated); // org-wide list, syncs like the rest of Job Setup
  const mine=getJobTags(jobId);
  saveJobTags(jobId, [...mine, val]); // auto-select it on this job
  renderJobTagsSrc(jobId);
  renderJobTagsPicker(jobId); // refresh the checklist to show the new row, checked
  toast(`<i class="ti ti-check" style="color:#4ade80"></i> "${val}" added`);
}

// ── Full new-customer popup (from the job form's "Add as new customer") — same
//    fields as the real client form so nothing gets skipped. ──
function startInlineNewCustomer(inputId){
  const input=document.getElementById(inputId);
  const typed=(input?input.value.trim():'').replace(/"/g,'');
  const parts=typed.split(/\s+/);
  const first=parts[0]||'', last=parts.slice(1).join(' ');
  const prefix=inputId.replace('-customer-search','');
  const results=document.getElementById(prefix+'-customer-results'); if(results) results.style.display='none';
  const sources=getLeadSources();
  const body=`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
      <div style="font-size:18px;font-weight:800">New customer</div>
      <button onclick="closeDyn('new-cust-sheet')" style="background:none;border:none;font-size:24px;color:var(--hint);cursor:pointer;line-height:1">×</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
      <input class="form-input" id="ncp-first" placeholder="First name *" value="${first.replace(/"/g,'&quot;')}">
      <input class="form-input" id="ncp-last" placeholder="Last name" value="${last.replace(/"/g,'&quot;')}">
    </div>
    <input class="form-input" id="ncp-phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="Phone" style="margin-bottom:8px">
    <input class="form-input" id="ncp-email" type="email" inputmode="email" placeholder="Email" style="margin-bottom:8px">
    <input class="form-input" id="ncp-addr" placeholder="Address" style="margin-bottom:8px">
    <div style="display:flex;gap:6px;margin-bottom:8px">
      <button type="button" id="ncp-type-res" class="btn btn-sm" style="flex:1;background:var(--primary);color:#fff;border:none" onclick="ncpSetType('residential')">Residential</button>
      <button type="button" id="ncp-type-com" class="btn btn-sm btn-outline" style="flex:1" onclick="ncpSetType('commercial')">Commercial</button>
    </div>
    <select class="form-input" id="ncp-source" style="margin-bottom:8px">
      <option value="">How did they find you? (lead source)</option>
      ${sources.map(s=>`<option value="${s}">${s}</option>`).join('')}
    </select>
    <textarea class="form-input" id="ncp-notes" rows="2" placeholder="Notes (gate code, pets, preferences…)" style="margin-bottom:12px;resize:vertical"></textarea>
    <button class="btn btn-primary btn-full" onclick="saveNewCustPopup('${prefix}')"><i class="ti ti-user-plus"></i> Save customer</button>`;
  dynSheet('new-cust-sheet', body, 240);
  window._ncpType='residential';
  setTimeout(()=>{ const f=document.getElementById(first?'ncp-phone':'ncp-first'); if(f) f.focus(); }, 60);
}
function ncpSetType(t){
  window._ncpType=t;
  const r=document.getElementById('ncp-type-res'), c=document.getElementById('ncp-type-com');
  if(!r||!c) return;
  if(t==='residential'){ r.className='btn btn-sm'; r.style.background='var(--primary)'; r.style.color='#fff'; c.className='btn btn-sm btn-outline'; c.style.background=''; c.style.color=''; }
  else { c.className='btn btn-sm'; c.style.background='var(--primary)'; c.style.color='#fff'; r.className='btn btn-sm btn-outline'; r.style.background=''; r.style.color=''; }
}
async function saveNewCustPopup(prefix){
  const v=id=>document.getElementById(id)?.value||'';
  const first=v('ncp-first').trim();
  if(!first){ toast('⚠️ First name is required'); return; }
  const c={
    id:newUUID(), firstName:first, lastName:v('ncp-last').trim(),
    phone:v('ncp-phone').replace(/\D/g,''), email:v('ncp-email').trim(),
    address:v('ncp-addr').trim(), notes:v('ncp-notes').trim(),
    clientType:window._ncpType||'residential', leadSource:v('ncp-source'),
    points:0, jobs:0, totalSpent:0, since:toISO(new Date()),
  };
  saveCustomer(c);
  if(window._useCloud && window.CloudDS){ try{ await CloudDS.saveCustomer(c); }catch(e){ console.warn('Cloud customer save failed:', e); } }
  if(window._custCache) window._custCache.unshift(c); else window._custCache=[c];
  // Link the new customer into whichever form launched this (job form, edit form, convert flow)
  const hidden=document.getElementById(prefix+'-customer-id');
  const search=document.getElementById(prefix+'-customer-search');
  if(hidden) hidden.value=c.id;
  if(search) search.value=fullName(c);
  // If the job form's address is empty and the client gave one, carry it over
  const jfAddr=document.getElementById(prefix+'-address');
  if(jfAddr && !jfAddr.value && c.address) jfAddr.value=c.address;
  closeDyn('new-cust-sheet');
  if(typeof refreshJobBubbleVals==='function'){ try{ refreshJobBubbleVals(); }catch(e){} }
  toast(`<i class="ti ti-check" style="color:#4ade80"></i> ${c.firstName} added as a customer`);
}

// ── Desktop Schedule — a real week grid (no cloning, so it's always live) ──
function dskWeekShift(dir){
  const baseISO = State.weekBase || State.selectedDay || toISO(new Date());
  const b = new Date(baseISO+'T12:00:00'); b.setDate(b.getDate()+dir*7);
  State.weekBase = toISO(b);
  renderDesktopScreen('jobs');
}
function dskSelectDay(d){ State.selectedDay=d; State.weekBase=d; renderDesktopScreen('jobs'); }
const DSK_SCHED_HOURS = Array.from({length:13},(_,i)=>i+7); // 7 AM–7 PM
function renderDesktopScheduleHTML(){
  const baseISO = State.weekBase || State.selectedDay || toISO(new Date());
  const base = new Date(baseISO+'T12:00:00');
  const weekSun = new Date(base); weekSun.setDate(base.getDate()-base.getDay());
  const days = Array.from({length:7},(_,i)=>{ const d=new Date(weekSun); d.setDate(weekSun.getDate()+i); return d; });
  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const weekSat = new Date(weekSun); weekSat.setDate(weekSun.getDate()+6);
  const mo = d => d.toLocaleDateString('en-US',{month:'short'});
  const rangeLabel = mo(weekSun)===mo(weekSat) ? `${mo(weekSun)} ${weekSun.getDate()} – ${weekSat.getDate()}` : `${mo(weekSun)} ${weekSun.getDate()} – ${mo(weekSat)} ${weekSat.getDate()}`;
  const today = toISO(new Date());

  const jobsByDay = {};
  const anytimeByDay = {};
  days.forEach(d=>{
    const ds = toISO(d);
    const jobs = scopeJobsToRole(jobsForDate(ds)).filter(j=>j.confirmed!==false);
    jobsByDay[ds] = jobs.filter(j=>j.time && j.time.indexOf(':')>=0);
    anytimeByDay[ds] = jobs.filter(j=>!j.time || j.time.indexOf(':')<0);
  });

  const blockHTML = j => {
    const c = getCustomer(j.customerId);
    const meta = desktopStatusMeta(j.status);
    return `<div class="dsk-cal-block" style="border-left-color:${meta.dot}" onclick="openJobDetail('${j.id}')" title="${c?fullName(c):''}">
      <div class="dsk-cal-block-name">${c?fullName(c):'—'}</div>
      <div class="dsk-cal-block-time">${fmt12(j.time)}${j.service?' · '+j.service:''}</div>
    </div>`;
  };

  const anyRow = days.some(d=>anytimeByDay[toISO(d)].length) ? `
    <div class="dsk-cal-row dsk-cal-anyrow">
      <div class="dsk-cal-hour">Anytime</div>
      ${days.map(d=>{ const ds=toISO(d); return `<div class="dsk-cal-cell">${anytimeByDay[ds].map(blockHTML).join('')}</div>`; }).join('')}
    </div>` : '';

  const hourRows = DSK_SCHED_HOURS.map(h=>{
    const label = fmt12(String(h).padStart(2,'0')+':00');
    return `<div class="dsk-cal-row">
      <div class="dsk-cal-hour">${label}</div>
      ${days.map(d=>{
        const ds = toISO(d);
        const jobs = jobsByDay[ds].filter(j=>parseInt((j.time||'0:0').split(':')[0],10)===h);
        return `<div class="dsk-cal-cell">${jobs.map(blockHTML).join('')}</div>`;
      }).join('')}
    </div>`;
  }).join('');

  return `
    <div class="dsk-cal-toolbar">
      <button class="icon-btn" onclick="dskWeekShift(-1)"><i class="ti ti-chevron-left"></i></button>
      <div class="dsk-cal-range">${rangeLabel}</div>
      <button class="icon-btn" onclick="dskWeekShift(1)"><i class="ti ti-chevron-right"></i></button>
    </div>
    <div class="dsk-cal-grid">
      <div class="dsk-cal-row dsk-cal-daysrow">
        <div class="dsk-cal-hour"></div>
        ${days.map(d=>{ const ds=toISO(d); const isToday = ds===today;
          return `<div class="dsk-cal-daycol ${isToday?'today':''}" onclick="dskSelectDay('${ds}')">
            <div class="dsk-cal-dayname">${dayNames[d.getDay()]}</div>
            <div class="dsk-cal-daynum">${d.getDate()}</div>
          </div>`;
        }).join('')}
      </div>
      ${anyRow}
      ${hourRows}
    </div>`;
}

// ── Desktop Team — real roster reusing the exact same timesheet data/actions ──
async function renderDesktopTeamHTML(){
  const employees = window._useCloud ? await CloudDS.getEmployees() : getEmployees();
  const entries = getTimeEntries();
  const today = new Date();
  const sunday = new Date(today); sunday.setDate(today.getDate()-today.getDay()); sunday.setHours(0,0,0,0);
  const days = Array.from({length:7},(_,i)=>{ const d=new Date(sunday); d.setDate(sunday.getDate()+i); return d; });
  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  const shownIds = new Set(employees.filter(e=>e.active).map(e=>e.id));
  const wkMs = sunday.getTime();
  const orphanIds = [...new Set(entries.filter(e=>e.empId && !shownIds.has(e.empId) && new Date(e.clockIn).getTime()>=wkMs).map(e=>e.empId))];
  const prof = getProfile();
  const orphanEmps = orphanIds.map(id=>{
    const isMe = (window.Auth && Auth.userId===id);
    let nm = isMe ? (prof.firstName ? (prof.firstName+(prof.lastName?' '+prof.lastName:'')) : (prof.name||'You')) : 'Team member';
    nm = (nm||'You').trim();
    return { id, name:nm, initials:(nm.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()||'YO'), color:'#64748b', role:(window.MY_ROLE||'admin'), active:true, _orphan:true };
  });
  const renderEmps = [...employees.filter(e=>e.active), ...orphanEmps];
  const canOpen = myRole()==='admin';

  const cardHTML = emp=>{
    const empEntries = entries.filter(e=>e.empId===emp.id && e.clockOut);
    const weekMs = empEntries.filter(e=>{ const d=new Date(e.clockIn); return (today-d)/86400000<=7 && e.type!=='lunch'; }).reduce((s,e)=>s+(new Date(e.clockOut)-new Date(e.clockIn)),0);
    const recentPunches = entries.filter(e=>e.empId===emp.id && e.type!=='lunch' && new Date(e.clockIn)>=days[0]).sort((a,b)=>new Date(b.clockIn)-new Date(a.clockIn)).slice(0,4);
    return `<div class="dsk-team-card">
      <div class="dsk-team-head" ${canOpen && !emp._orphan?`onclick="openEmployeeProfile('${emp.id}')" style="cursor:pointer"`:''}>
        <div style="width:38px;height:38px;border-radius:10px;background:${emp.color};color:#fff;font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center">${emp.initials}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:14px">${emp.name}</div>
          <div class="text-sm text-muted">${(ROLES[emp.role]||{}).name || emp.role}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:17px;font-weight:800;color:var(--primary)">${fmtElapsed(weekMs)}</div>
          <div class="text-sm text-muted">this week</div>
        </div>
      </div>
      <div class="dsk-team-days">
        ${days.map(d=>{
          const ds = toISO(d);
          const dayMs = empEntries.filter(e=>e.date===ds && e.type!=='lunch').reduce((s,e)=>s+(new Date(e.clockOut)-new Date(e.clockIn)),0);
          const hrs = dayMs/3600000;
          const isToday = ds===todayStr();
          return `<div class="dsk-team-day" ${hrs>0?`onclick="openDayReport('${emp.id}','${ds}')"`:''}>
            <div class="dsk-team-dayname" style="${isToday?'color:var(--primary)':''}">${dayNames[d.getDay()]}</div>
            <div class="dsk-team-bar" style="background:${hrs>0?`rgba(15,45,107,${Math.min(0.9,hrs/8*0.8+0.2)})`:'#f0f2f5'}">
              <span style="color:${hrs>0?'#fff':'var(--hint)'}">${hrs>0?hrs.toFixed(1):''}</span>
            </div>
          </div>`;
        }).join('')}
      </div>
      <div class="dsk-team-punches">
        ${recentPunches.length ? recentPunches.map(e=>{
          const inT = new Date(e.clockIn).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
          const outT = e.clockOut ? new Date(e.clockOut).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}) : 'ongoing';
          const dl = new Date(e.clockIn).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
          const hasLoc = (e.inLat!=null || e.outLat!=null);
          return `<div class="dsk-team-punch" onclick="openDayReport('${emp.id}','${e.date}')">
            <span>${dl}: ${inT} → ${outT}</span>${hasLoc?'<i class="ti ti-map-pin" style="color:#16a34a;font-size:13px"></i>':''}
          </div>`;
        }).join('') : `<div class="text-sm text-muted">No punches this week</div>`}
      </div>
    </div>`;
  };

  // Grouped by title, per request — Owner, then Admin, Manager, Technician.
  const groups = { owner:[], admin:[], manager:[], tech:[] };
  renderEmps.forEach(emp=>{
    if (emp._orphan) groups.owner.push(emp);
    else if (groups[emp.role]) groups[emp.role].push(emp);
    else groups.tech.push(emp);
  });
  const groupLabels = [['owner','Owner'],['admin','Admin'],['manager','Manager'],['tech','Technicians']];
  const cards = groupLabels.filter(([k])=>groups[k].length).map(([k,label])=>`
    <div class="dsk-team-group-label">${label}</div>
    <div class="dsk-team-grid">${groups[k].map(cardHTML).join('')}</div>
  `).join('');

  const seatCard = myRole()==='admin' ? `
    <div class="dsk-team-seats">
      <div>
        <div style="font-weight:700;font-size:14px">${currentPlan().name} plan</div>
        <div class="text-sm text-muted">${employees.filter(e=>e.active).length} of ${maxEmployeesFor()} employee seats used</div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary btn-sm" onclick="openUpgradeModal()"><i class="ti ti-settings"></i> Manage</button>
        <button class="btn btn-primary btn-sm" onclick="openOnboarding()"><i class="ti ti-user-plus"></i> Add Employee</button>
      </div>
    </div>` : '';

  return `${cards || `<div class="text-sm text-muted">No team activity yet this week</div>`}${seatCard}`;
}

// ── Desktop Reports — same computations as mobile, laid out for a wide screen ──
// ── Desktop Reports v2 — period-over-period comparisons (month/quarter/year vs the
//    previous period or the same period last year), plus estimates, repeat-customer
//    rate, and outstanding invoices alongside the existing close/cancel/client-type mix. ──
let _dskRptRange = 'month';     // 'month' | 'quarter' | 'year' | 'all'
let _dskRptCompare = 'prev';    // 'prev' (immediately preceding period) | 'yoy' (same period last year)
function setDskRptRange(r){ _dskRptRange = r; renderDesktopScreen('reports'); }
function setDskRptCompare(c){ _dskRptCompare = c; renderDesktopScreen('reports'); }

function dskPeriodBounds(rangeKey, yearsBack){
  yearsBack = yearsBack || 0;
  const now = new Date(); now.setFullYear(now.getFullYear()-yearsBack);
  if (rangeKey==='month'){
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to   = new Date(now.getFullYear(), now.getMonth()+1, 0);
    return { from: toISO(from), to: toISO(to), label: from.toLocaleDateString('en-US',{month:'long',year:'numeric'}) };
  }
  if (rangeKey==='quarter'){
    const q = Math.floor(now.getMonth()/3);
    const from = new Date(now.getFullYear(), q*3, 1);
    const to   = new Date(now.getFullYear(), q*3+3, 0);
    return { from: toISO(from), to: toISO(to), label: `Q${q+1} ${now.getFullYear()}` };
  }
  if (rangeKey==='year'){
    const from = new Date(now.getFullYear(), 0, 1);
    const to   = new Date(now.getFullYear(), 11, 31);
    return { from: toISO(from), to: toISO(to), label: String(now.getFullYear()) };
  }
  return { from: '2000-01-01', to: toISO(new Date()), label: 'All Time' }; // 'all'
}
// The comparison period: previous calendar period, or the same period one year back.
function dskPrevPeriodBounds(rangeKey){
  if (_dskRptCompare === 'yoy') return dskPeriodBounds(rangeKey, 1);
  const now = new Date();
  if (rangeKey==='month'){ const d=new Date(now.getFullYear(),now.getMonth()-1,1); const from=new Date(d.getFullYear(),d.getMonth(),1); const to=new Date(d.getFullYear(),d.getMonth()+1,0); return {from:toISO(from),to:toISO(to)}; }
  if (rangeKey==='quarter'){ const q=Math.floor(now.getMonth()/3)-1; const y=q<0?now.getFullYear()-1:now.getFullYear(); const qq=(q+4)%4; const from=new Date(y,qq*3,1); const to=new Date(y,qq*3+3,0); return {from:toISO(from),to:toISO(to)}; }
  if (rangeKey==='year'){ const from=new Date(now.getFullYear()-1,0,1); const to=new Date(now.getFullYear()-1,11,31); return {from:toISO(from),to:toISO(to)}; }
  return null; // 'all' has no meaningful previous period
}
function dskReportMetrics(from, to){
  const jobs = getJobs().filter(j=>jobInRange(j, from, to));
  const doneJobs = jobs.filter(j=>j.status==='done');
  const cancelledJobs = jobs.filter(j=>j.status==='cancelled');
  const didNotGoJobs = jobs.filter(j=>j.status==='didnotgo');
  const closedJobs = [...doneJobs, ...didNotGoJobs];
  const allFinished = doneJobs.length+cancelledJobs.length+didNotGoJobs.length;
  const totalRev = doneJobs.reduce((s,j)=>s+(j.price||0),0);
  const invs = getInvoices().filter(i=>i.date>=from && i.date<=to);
  const outstanding = invs.filter(i=>i.status!=='paid').reduce((s,i)=>s+invoiceTotal(i),0);
  const doneCustomerIds = [...new Set(doneJobs.map(j=>j.customerId))];
  const doneCustomers = doneCustomerIds.map(id=>getCustomer(id)).filter(Boolean);
  const repeatCustomers = doneCustomers.filter(c=>c.since && c.since < from).length;
  const newCustomers = getCustomers().filter(c=>c.since && c.since>=from && c.since<=to).length;
  return {
    revenue: totalRev,
    jobsCompleted: doneJobs.length,
    avgJob: doneJobs.length ? totalRev/doneJobs.length : 0,
    closeRatePct: closedJobs.length ? (doneJobs.length/closedJobs.length)*100 : 0,
    cancelRatePct: allFinished ? (cancelledJobs.length/allFinished)*100 : 0,
    newCustomers,
    repeatRatePct: doneCustomers.length ? (repeatCustomers/doneCustomers.length)*100 : 0,
    outstanding,
    doneJobs, cancelledJobs, didNotGoJobs, closedJobs, doneCustomers,
  };
}
function dskTrendBadge(cur, prev, higherIsBetter){
  if (higherIsBetter===undefined) higherIsBetter = true;
  if (prev===0 && cur===0) return `<span class="dsk-kpi-trend flat">No change</span>`;
  if (prev===0) return `<span class="dsk-kpi-trend up">▲ New</span>`;
  const pct = Math.round(((cur-prev)/Math.abs(prev))*100);
  const isUp = pct >= 0;
  const good = higherIsBetter ? isUp : !isUp;
  const cls = pct===0 ? 'flat' : (good ? 'up' : 'down');
  const arrow = pct===0 ? '' : (isUp ? '▲' : '▼');
  return `<span class="dsk-kpi-trend ${cls}">${arrow} ${Math.abs(pct)}%</span>`;
}
function dskKpiCard(label, display, cur, prev, higherIsBetter){
  const trend = (prev==null) ? '' : dskTrendBadge(cur, prev, higherIsBetter);
  return `<div class="dsk-kpi"><div class="dsk-kpi-label">${label}</div><div class="dsk-kpi-val">${display}</div>${trend}</div>`;
}

function wireDesktopReportsRange(){}
function setDesktopReportRange(r){ setDskRptRange(r); } // kept for any old callers
function renderDesktopReportsHTML(){
  if (!reportsEnabled()) {
    return `<div style="position:relative;border-radius:14px;overflow:hidden;min-height:340px">
      <div style="filter:blur(3px);opacity:0.55;pointer-events:none">${reportsPreviewInner()}</div>
      ${reportsLockOverlayHTML()}
    </div>`;
  }
  const cur = dskPeriodBounds(_dskRptRange);
  const prevBounds = dskPrevPeriodBounds(_dskRptRange);
  const m = dskReportMetrics(cur.from, cur.to);
  const pm = prevBounds ? dskReportMetrics(prevBounds.from, prevBounds.to) : null;

  // Snapshot, not period-bound — an estimate has no "won" trail once it becomes a job.
  const openEstimates = scopeJobsToRole(getJobs()).filter(j=>j.confirmed===false);
  const openEstValue = openEstimates.reduce((s,j)=>s+(j.price||0),0);

  const didNotGoPct = m.closedJobs.length ? Math.round((m.didNotGoJobs.length/m.closedJobs.length)*100) : 0;
  const residential = m.doneCustomers.filter(c=>c.clientType!=='commercial').length;
  const commercial  = m.doneCustomers.filter(c=>c.clientType==='commercial').length;
  const totalTypes  = m.doneCustomers.length || 1;
  const resPct = Math.round((residential/totalTypes)*100);
  const comPct = Math.round((commercial/totalTypes)*100);

  const leadCounts = {};
  m.doneCustomers.forEach(c=>{ const src=c.leadSource||'Unknown'; leadCounts[src]=(leadCounts[src]||0)+1; });
  const leadEntries = Object.entries(leadCounts).sort((a,b)=>b[1]-a[1]);
  const totalLeads = m.doneCustomers.length || 1;
  const pieColors = ['#0f2d6b','#639922','#e8520a','#6b4fcf','#d03030','#0891b2','#be185d','#854d0e'];

  const pieCard = (title, sub, pct, pctColor, pctLabel, segs) => `
    <div class="dsk-rpt-card">
      <div class="dsk-rpt-title">${title}</div>
      <div class="text-sm text-muted" style="margin-bottom:12px">${sub}</div>
      <div style="display:flex;align-items:center;gap:16px">
        <svg viewBox="0 0 100 100" style="width:96px;height:96px;flex-shrink:0">
          ${buildPieSlices(segs)}
          <circle cx="50" cy="50" r="28" fill="white"/>
          <text x="50" y="46" text-anchor="middle" style="font-size:13px;font-weight:800;fill:${pctColor}">${pct}%</text>
          <text x="50" y="57" text-anchor="middle" style="font-size:7px;fill:#666">${pctLabel}</text>
        </svg>
      </div>
    </div>`;

  return `
    <div class="dsk-cal-toolbar" style="margin-bottom:8px;flex-wrap:wrap;row-gap:8px">
      <div class="dsk-filter-pills">
        <button class="${_dskRptRange==='month'?'active':''}" onclick="setDskRptRange('month')">This Month</button>
        <button class="${_dskRptRange==='quarter'?'active':''}" onclick="setDskRptRange('quarter')">This Quarter</button>
        <button class="${_dskRptRange==='year'?'active':''}" onclick="setDskRptRange('year')">This Year</button>
        <button class="${_dskRptRange==='all'?'active':''}" onclick="setDskRptRange('all')">All Time</button>
      </div>
      ${_dskRptRange!=='all' ? `<div class="dsk-filter-pills">
        <button class="${_dskRptCompare==='prev'?'active':''}" onclick="setDskRptCompare('prev')">vs Previous Period</button>
        <button class="${_dskRptCompare==='yoy'?'active':''}" onclick="setDskRptCompare('yoy')">vs Last Year</button>
      </div>`:''}
      <span class="text-sm text-muted" style="margin-left:auto">${cur.label}</span>
    </div>

    <div class="dsk-kpis" style="grid-template-columns:repeat(4,1fr)">
      ${dskKpiCard('Revenue', fmtMoney(m.revenue), m.revenue, pm?.revenue, true)}
      ${dskKpiCard('Jobs Completed', m.jobsCompleted, m.jobsCompleted, pm?.jobsCompleted, true)}
      ${dskKpiCard('Avg Ticket Size', fmtMoney(m.avgJob), m.avgJob, pm?.avgJob, true)}
      ${dskKpiCard('New Customers', m.newCustomers, m.newCustomers, pm?.newCustomers, true)}
    </div>
    <div class="dsk-kpis" style="grid-template-columns:repeat(4,1fr)">
      ${dskKpiCard('Close Rate', Math.round(m.closeRatePct)+'%', m.closeRatePct, pm?.closeRatePct, true)}
      ${dskKpiCard('Cancellation Rate', Math.round(m.cancelRatePct)+'%', m.cancelRatePct, pm?.cancelRatePct, false)}
      ${dskKpiCard('Repeat Customer Rate', Math.round(m.repeatRatePct)+'%', m.repeatRatePct, pm?.repeatRatePct, true)}
      ${dskKpiCard('Outstanding Invoices', fmtMoney(m.outstanding), m.outstanding, pm?.outstanding, false)}
    </div>
    ${!pm ? `<div class="text-sm text-muted" style="margin:-6px 0 14px">Trend comparisons aren't shown for All Time — pick Month, Quarter, or Year to compare periods.</div>`:''}

    <div class="dsk-rpt-card" style="max-width:340px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between">
      <div>
        <div class="dsk-rpt-title">Open Estimates</div>
        <div class="text-sm text-muted">Currently pending — not tied to the selected period</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:20px;font-weight:800">${openEstimates.length}</div>
        <div class="text-sm text-muted">${fmtMoney(openEstValue)}</div>
      </div>
    </div>

    <div class="dsk-rpt-grid">
      ${pieCard('Close Rate','Completed vs. Did Not Go Through', Math.round(m.closeRatePct), 'var(--green)', 'close rate', [{value:m.closeRatePct,color:'var(--green)'},{value:didNotGoPct,color:'#d03030'}])}
      ${pieCard('Cancellation Rate','Cancelled vs. finished jobs', Math.round(m.cancelRatePct), '#d03030', 'cancelled', [{value:m.cancelRatePct,color:'#d03030'},{value:100-m.cancelRatePct,color:'var(--green)'}])}
      ${pieCard('Client Type','Residential vs. commercial (completed)', resPct, 'var(--primary)', 'residential', [{value:resPct,color:'var(--primary)'},{value:comPct,color:'#e8520a'}])}
    </div>
    <div class="dsk-rpt-card" style="margin-top:14px">
      <div class="dsk-rpt-title">Lead Source</div>
      <div class="text-sm text-muted" style="margin-bottom:12px">Where completed-job customers came from</div>
      ${leadEntries.length ? leadEntries.map(([src,count],i)=>{
        const pct = Math.round((count/totalLeads)*100);
        return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <span style="width:10px;height:10px;border-radius:3px;background:${pieColors[i%pieColors.length]};flex-shrink:0"></span>
          <span style="flex:1;font-size:13px">${src}</span>
          <span style="font-size:12px;color:var(--muted)">${count} · ${pct}%</span>
        </div>`;
      }).join('') : `<div class="text-sm text-muted">No completed jobs in this range yet</div>`}
    </div>`;
}

// ── Desktop Settings — real category layout (left list + right panel), reusing all
//    the same underlying data functions the phone Settings screen uses. A few of the
//    phone's more complex managers (Price Book's add/edit/delete, Communication's
//    template editor) stay as "open" buttons into their existing modal — those modals
//    already center and widen nicely on desktop, and rebuilding their intricate
//    working-copy editors inline isn't worth the risk for what they'd gain. ──
let _dskSettingsCat = 'general';
const DSK_SETTINGS_CATS = [
  ['general','General',       'ti-user'],
  ['business','Business',     'ti-building-store'],
  ['plan','Plan & Billing',   'ti-crown'],
  ['jobsetup','Job Setup',    'ti-list-details'],
  ['discounts','Discounts & Costs','ti-discount-2'],
  ['pricebook','Price Book',  'ti-book-2'],
  ['team','Time Tracking',    'ti-clock'],
  ['prefs','Preferences',     'ti-adjustments'],
  ['comm','Communication',    'ti-message-2'],
  ['api','APIs & Integrations','ti-plug-connected'],
  ['sync','Sync & Data',      'ti-cloud-check'],
];
function dskSettingsCategory(cat){ _dskSettingsCat = cat; renderDesktopScreen('settings'); }
function renderDesktopSettingsHTML(){
  const p = getProfile();
  const body = ({
    general:   dskSetGeneral,
    business:  dskSetBusiness,
    plan:      dskSetPlan,
    jobsetup:  dskSetJobSetup,
    discounts: dskSetDiscounts,
    pricebook: dskSetPriceBook,
    team:      dskSetTeamTracking,
    prefs:     dskSetPrefs,
    comm:      dskSetComm,
    api:       dskSetApi,
    sync:      dskSetSync,
  }[_dskSettingsCat] || dskSetGeneral)(p);

  return `<div class="dsk-settings-layout">
    <div class="dsk-settings-nav">
      ${DSK_SETTINGS_CATS.map(([key,label,icon])=>`<button class="dsk-settings-nav-item ${_dskSettingsCat===key?'active':''}" onclick="dskSettingsCategory('${key}')"><i class="ti ${icon}"></i>${label}</button>`).join('')}
    </div>
    <div class="dsk-settings-panel">${body}</div>
  </div>`;
}

function dskSetGeneral(p){
  return `
    <div class="dsk-set-title">General</div>
    <div class="dsk-set-sub">Your name, phone, and email</div>
    <div class="card" style="max-width:440px">
      <div class="form-group"><label class="form-label">Full Name</label><input class="form-input" id="dk-name" value="${p.name||''}"></div>
      <div class="form-group"><label class="form-label">Your Phone</label><input class="form-input" id="dk-phone" value="${fmtPhone(p.phone||'')}"></div>
      <div class="form-group" style="margin-bottom:0"><label class="form-label">Your Email</label><input class="form-input" id="dk-email" value="${p.email||''}"></div>
    </div>
    <button class="btn btn-primary" style="margin-top:14px" onclick="dskSaveGeneral()"><i class="ti ti-check"></i> Save</button>`;
}
async function dskSaveGeneral(){
  const p = getProfile();
  p.name  = document.getElementById('dk-name').value.trim() || p.name;
  p.phone = document.getElementById('dk-phone').value.replace(/\D/g,'');
  p.email = document.getElementById('dk-email').value.trim();
  p.initials = p.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  DS.saveProfile(p);
  if (window._useCloud && window.CloudDS) { try{ await CloudDS.saveProfile(p); }catch(e){} }
  const av=document.getElementById('dsk-header-avatar'); if(av) av.textContent=p.initials;
  toast('<i class="ti ti-check" style="color:#4ade80"></i> Saved');
}

function dskSetBusiness(p){
  return `
    <div class="dsk-set-title">Business</div>
    <div class="dsk-set-sub">Company name and review link</div>
    <div class="card" style="max-width:440px">
      <div class="form-group"><label class="form-label">Company Name</label><input class="form-input" id="dk-company" value="${p.company||''}"></div>
      <div class="form-group" style="margin-bottom:0"><label class="form-label">Google Review Link</label><input class="form-input" id="dk-review-link" value="${p.googleReviewLink||''}" placeholder="https://g.page/r/YOUR-LINK/review"></div>
    </div>
    <button class="btn btn-primary" style="margin-top:14px" onclick="dskSaveBusiness()"><i class="ti ti-check"></i> Save</button>`;
}
async function dskSaveBusiness(){
  const p = getProfile();
  p.company = document.getElementById('dk-company').value.trim() || p.company;
  p.googleReviewLink = document.getElementById('dk-review-link').value.trim();
  DS.saveProfile(p);
  if (window._useCloud && window.CloudDS) { try{ await CloudDS.saveProfile(p); }catch(e){} }
  if (typeof pushBusinessToCloud==='function') { try{ pushBusinessToCloud(); }catch(e){} }
  toast('<i class="ti ti-check" style="color:#4ade80"></i> Saved');
}

function dskSetPlan(p){
  const emps = getEmployees().filter(e=>e.active).length;
  return `
    <div class="dsk-set-title">Plan &amp; Billing</div>
    <div class="dsk-set-sub">Your Thrive subscription</div>
    <div class="card" style="max-width:440px;display:flex;align-items:center;justify-content:space-between">
      <div>
        <div style="font-weight:800;font-size:16px">${currentPlan(p).name}</div>
        <div class="text-sm text-muted">Up to ${maxEmployeesFor(p)} employee${maxEmployeesFor(p)>1?'s':''} · ${emps} in use</div>
      </div>
      <button class="btn btn-primary btn-sm" onclick="openUpgradeModal()"><i class="ti ti-arrow-up"></i> Manage Plan</button>
    </div>`;
}

function dskListSection(dataKey, title, sub){
  const arr = getJobSetupList(dataKey);
  const items = arr.length
    ? arr.map((item,i)=>`<div class="setting-row"><div class="s-label">${item}</div><button onclick="dskListDel('${dataKey}',${i})" style="background:none;border:none;color:#d03030;cursor:pointer;padding:6px;font-size:16px"><i class="ti ti-trash"></i></button></div>`).join('')
    : `<div class="text-sm" style="color:var(--hint);padding:4px 0">None yet — add your first below.</div>`;
  return `
    <div class="dsk-set-subtitle">${title}</div>
    <div class="card" style="max-width:520px;margin-bottom:16px">
      ${sub?`<div class="text-sm text-muted" style="margin-bottom:10px">${sub}</div>`:''}
      ${items}
      <div style="display:flex;gap:8px;margin-top:12px">
        <input class="form-input" id="dk-add-${dataKey}" placeholder="Add ${title.toLowerCase().replace(/s$/,'')}…" onkeyup="if(event.key==='Enter')dskListAdd('${dataKey}')">
        <button class="btn btn-secondary btn-sm" style="white-space:nowrap" onclick="dskListAdd('${dataKey}')"><i class="ti ti-plus"></i> Add</button>
      </div>
    </div>`;
}
function dskListAdd(key){
  const inp = document.getElementById('dk-add-'+key);
  const val = (inp?.value||'').trim();
  if (!val) { toast('⚠️ Type something first'); return; }
  const arr = getJobSetupList(key);
  if (arr.some(x=>String(x).toLowerCase()===val.toLowerCase())) { toast('⚠️ Already exists'); return; }
  saveJobSetupList(key, [...arr, val]);
  renderDesktopScreen('settings');
  toast(`<i class="ti ti-check" style="color:#4ade80"></i> Added`);
}
function dskListDel(key, i){
  const arr = getJobSetupList(key); arr.splice(i,1); saveJobSetupList(key, arr);
  renderDesktopScreen('settings');
}
function dskSetJobSetup(){
  return `
    <div class="dsk-set-title">Job Setup</div>
    <div class="dsk-set-sub">Job types, tags, lead sources, and cost items — these show up when creating or pricing a job</div>
    ${dskListSection('job_types','Job Types','The kinds of jobs you do.')}
    ${dskListSection('job_tags','Job Tags','Labels you can attach to jobs.')}
    ${dskListSection('lead_sources','Lead Sources','Where customers heard about you.')}
    ${dskListSection('job_costs','Job Costs','Cost line items like dump fees.')}`;
}

function dskAmountListSection(kind, title, sub, getFn, items, extraCol){
  const rows = items.length
    ? items.map((it,i)=>`<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border)"><div style="flex:1"><div style="font-weight:600">${it.label||it.name}</div><div class="text-sm text-muted">${extraCol(it)}</div></div><button onclick="dskAmountDel('${kind}',${i})" style="background:none;border:none;color:#d03030;cursor:pointer;font-size:16px"><i class="ti ti-trash"></i></button></div>`).join('')
    : `<div class="text-sm text-muted" style="padding:4px 0">None yet.</div>`;
  const isDiscount = kind==='disc';
  return `
    <div class="dsk-set-subtitle">${title}</div>
    <div class="card" style="max-width:520px;margin-bottom:16px">
      ${sub?`<div class="text-sm text-muted" style="margin-bottom:8px">${sub}</div>`:''}
      ${rows}
      <div style="display:flex;gap:6px;margin-top:12px">
        <input class="form-input" id="dk-${kind}-label" placeholder="${isDiscount?'Label':'Item (e.g. Tarps)'}" style="flex:1">
        <input class="form-input" id="dk-${kind}-amount" type="number" placeholder="${isDiscount?'Amt':'$'}" style="width:80px">
        ${isDiscount?`<select class="form-input" id="dk-${kind}-type" style="width:110px"><option value="fixed">$ Amount</option><option value="percent">% Percent</option></select>`:''}
        <button class="btn btn-secondary btn-sm" onclick="dskAmountAdd('${kind}')"><i class="ti ti-plus"></i> Add</button>
      </div>
    </div>`;
}
function dskAmountAdd(kind){
  const label = (document.getElementById(`dk-${kind}-label`)?.value||'').trim();
  const amount = parseFloat(document.getElementById(`dk-${kind}-amount`)?.value)||0;
  if (!label || !amount) { toast('⚠️ Enter a label and amount'); return; }
  if (kind==='disc') {
    const type = document.getElementById('dk-disc-type')?.value||'fixed';
    const p = getDiscountPresets(); p.push({label, amount, type}); saveDiscountPresets(p);
  } else {
    const p = getCostItemPresets(); p.push({name:label, price:amount}); saveCostItemPresets(p);
  }
  renderDesktopScreen('settings');
  toast('<i class="ti ti-check" style="color:#4ade80"></i> Added');
}
function dskAmountDel(kind, i){
  if (kind==='disc') { const p=getDiscountPresets(); p.splice(i,1); saveDiscountPresets(p); }
  else { const p=getCostItemPresets(); p.splice(i,1); saveCostItemPresets(p); }
  renderDesktopScreen('settings');
}
function dskSetDiscounts(){
  const discs = getDiscountPresets(), costs = getCostItemPresets();
  return `
    <div class="dsk-set-title">Discounts &amp; Job Costs</div>
    <div class="dsk-set-sub">Preset discounts and material cost items you can add to any job</div>
    ${dskAmountListSection('disc','Preset Discounts','', getDiscountPresets, discs, it=>it.type==='percent'?it.amount+'%':fmtMoney(it.amount))}
    ${dskAmountListSection('cost','Job Cost Items','', getCostItemPresets, costs, it=>fmtMoney(it.price))}`;
}

function dskSetPriceBook(){
  const count = getPriceBook().length;
  return `
    <div class="dsk-set-title">Price Book</div>
    <div class="dsk-set-sub">${count} item${count!==1?'s':''} — add, edit, or delete your standard pricing</div>
    <button class="btn btn-primary" onclick="openPriceBookManager()"><i class="ti ti-book-2"></i> Open Price Book</button>`;
}

function dskSetTeamTracking(){
  return `
    <div class="dsk-set-title">Time Tracking</div>
    <div class="dsk-set-sub">GPS location on clock-in/out</div>
    <div class="card" style="max-width:520px;display:flex;align-items:center;justify-content:space-between;gap:12px">
      <div style="flex:1">
        <div style="font-weight:700">Record clock location</div>
        <div class="text-sm text-muted" style="line-height:1.4">Stamps clock-in/out with GPS, shown on a mini map per punch (admins only).</div>
      </div>
      <button class="btn btn-sm ${clockGeoOn()?'btn-primary':'btn-secondary'}" onclick="dskToggleClockGeo()">${clockGeoOn()?'<i class="ti ti-check"></i> On':'Off'}</button>
    </div>`;
}
async function dskToggleClockGeo(){ await setClockGeo(!clockGeoOn()); renderDesktopScreen('settings'); }

function dskSetPrefs(p){
  return `
    <div class="dsk-set-title">Preferences</div>
    <div class="dsk-set-sub">Automations and scheduling defaults</div>
    <div class="card" style="max-width:520px">
      <div class="setting-row"><div><div class="s-label">Auto-send SMS Reminders</div><div class="s-sub">1 hour before each job</div></div><input type="checkbox" class="toggle" id="dk-tog-sms" ${p.smsReminders?'checked':''} onchange="dskSavePrefs()"></div>
      <div class="setting-row"><div><div class="s-label">Auto-create Invoices</div><div class="s-sub">When job is marked complete</div></div><input type="checkbox" class="toggle" id="dk-tog-inv" ${p.autoInvoice?'checked':''} onchange="dskSavePrefs()"></div>
      <div class="setting-row" style="border:none"><div><div class="s-label">Loyalty Rewards</div><div class="s-sub">Award points to customers</div></div><input type="checkbox" class="toggle" id="dk-tog-rew" ${p.rewardsEnabled?'checked':''} onchange="dskSavePrefs()"></div>
    </div>`;
}
async function dskSavePrefs(){
  const p = getProfile();
  p.smsReminders = !!document.getElementById('dk-tog-sms')?.checked;
  p.autoInvoice   = !!document.getElementById('dk-tog-inv')?.checked;
  p.rewardsEnabled= !!document.getElementById('dk-tog-rew')?.checked;
  DS.saveProfile(p);
  if (window._useCloud && window.CloudDS) { try{ await CloudDS.saveProfile(p); }catch(e){} }
  toast('<i class="ti ti-check" style="color:#4ade80"></i> Saved');
}

function dskSetComm(){
  return `
    <div class="dsk-set-title">Communication</div>
    <div class="dsk-set-sub">Edit the texts and emails sent to customers</div>
    <button class="btn btn-primary" onclick="openCommunicationManager()"><i class="ti ti-message-2"></i> Open Message Templates</button>`;
}

function dskSetApi(p){
  return `
    <div class="dsk-set-title">APIs &amp; Integrations</div>
    <div class="dsk-set-sub">Email, Maps, and Google Business setup</div>
    <div class="dsk-set-subtitle">Text Messaging (SMS)</div>
    <div class="info-banner" style="max-width:520px"><i class="ti ti-circle-check" style="color:#4ade80"></i><p>Handled securely by Thrive — no keys to enter. <span style="color:var(--hint)">Powered by Twilio.</span></p></div>
    <div class="dsk-set-subtitle">Email (EmailJS)</div>
    <div class="card" style="max-width:520px;margin-bottom:16px">
      <div class="form-group"><label class="form-label">Public Key</label><input class="form-input" id="dk-ejs-pubkey" value="${p.emailjsPublicKey||''}"></div>
      <div class="form-group"><label class="form-label">Service ID</label><input class="form-input" id="dk-ejs-service" value="${p.emailjsServiceId||''}"></div>
      <div class="form-group"><label class="form-label">Template ID</label><input class="form-input" id="dk-ejs-template" value="${p.emailjsTemplateId||''}"></div>
      <div class="form-group" style="margin-bottom:0"><label class="form-label">From Name</label><input class="form-input" id="dk-ejs-fromname" value="${p.emailjsFromName||p.company||''}"></div>
    </div>
    <div class="dsk-set-subtitle">Google Maps</div>
    <div class="card" style="max-width:520px;margin-bottom:16px">
      <div class="form-group" style="margin-bottom:0"><label class="form-label">Maps API Key</label><input class="form-input" id="dk-maps-key" value="${p.googleMapsKey||''}" placeholder="AIza..."></div>
    </div>
    <div class="dsk-set-subtitle">Google My Business</div>
    <div class="card" style="max-width:520px">
      <div class="form-group"><label class="form-label">Google Client ID</label><input class="form-input" id="dk-gmb-client-id" value="${DS.get('gmb_client_id','')}" placeholder="xxxxxxxx.apps.googleusercontent.com"></div>
      <div class="form-group"><label class="form-label">Access Token <span style="font-weight:400;color:var(--hint)">(paste after authorizing, or use the button below)</span></label>
        <div style="position:relative">
          <input class="form-input" id="dk-gmb-token" type="password" value="${DS.get('gmb_access_token','')}" placeholder="ya29..." style="padding-right:38px">
          <button type="button" onclick="toggleGmbTokenVisibility()" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--hint);cursor:pointer;padding:4px" title="Show/hide token"><i class="ti ti-eye" id="dk-gmb-token-eye"></i></button>
        </div>
      </div>
      <div class="form-group" style="margin-bottom:10px"><label class="form-label">GMB Location ID</label><input class="form-input" id="dk-gmb-location" value="${DS.get('gmb_location_name','')}" placeholder="4712407153014225709"></div>
      <button class="btn btn-outline btn-full btn-sm" style="margin-bottom:8px" onclick="dskSaveApi();startGMBAuth()"><i class="ti ti-brand-google"></i> Save &amp; Authorize with Google</button>
      <button class="btn btn-secondary btn-full btn-sm" style="margin-bottom:0" onclick="testGMBPost()"><i class="ti ti-send"></i> Test Post</button>
    </div>
    <button class="btn btn-primary" style="margin-top:14px" onclick="dskSaveApi()"><i class="ti ti-check"></i> Save API Settings</button>`;
}
function toggleGmbTokenVisibility(){
  const inp = document.getElementById('dk-gmb-token');
  const eye = document.getElementById('dk-gmb-token-eye');
  if (!inp) return;
  const showing = inp.type === 'text';
  inp.type = showing ? 'password' : 'text';
  if (eye) { eye.className = showing ? 'ti ti-eye' : 'ti ti-eye-off'; }
}
async function dskSaveApi(){
  const p = getProfile();
  p.googleMapsKey = document.getElementById('dk-maps-key')?.value.trim() || '';
  if (p.googleMapsKey) { window.GOOGLE_MAPS_KEY = p.googleMapsKey; if (typeof loadGooglePlaces==='function') loadGooglePlaces(); }
  p.emailjsPublicKey = document.getElementById('dk-ejs-pubkey')?.value.trim() || '';
  p.emailjsServiceId = document.getElementById('dk-ejs-service')?.value.trim() || '';
  p.emailjsTemplateId= document.getElementById('dk-ejs-template')?.value.trim() || '';
  p.emailjsFromName  = document.getElementById('dk-ejs-fromname')?.value.trim() || p.company;
  DS.saveProfile(p);
  const gmbClientId = document.getElementById('dk-gmb-client-id')?.value.trim();
  const gmbToken    = document.getElementById('dk-gmb-token')?.value.trim();
  const gmbLocation = document.getElementById('dk-gmb-location')?.value.trim();
  if (gmbClientId) DS.set('gmb_client_id', gmbClientId);
  if (gmbToken)    DS.set('gmb_access_token', gmbToken);
  if (gmbLocation) DS.set('gmb_location_name', gmbLocation);
  // Saved locally above (synchronous) before this — so calling startGMBAuth() right
  // after dskSaveApi() always sees the freshly-typed Client ID, even without awaiting.
  if (window._useCloud && window.CloudDS) { try{ await CloudDS.saveProfile(p); }catch(e){} }
  toast('<i class="ti ti-check" style="color:#4ade80"></i> Saved');
}

function dskSetSync(){
  return `
    <div class="dsk-set-title">Sync &amp; Data</div>
    <div class="dsk-set-sub">Cross-device syncing and account tools</div>
    <button class="btn btn-primary" style="margin-bottom:10px" onclick="openSyncManager()"><i class="ti ti-cloud-check"></i> Check Sync Status</button>
    <div style="display:flex;gap:10px;margin-top:6px">
      <button class="btn btn-secondary" onclick="testMessaging()"><i class="ti ti-send"></i> Test SMS &amp; Email</button>
      <button class="btn btn-secondary" style="color:var(--red)" onclick="if(confirm('Reset all data?')){DS.reset();location.reload()}"><i class="ti ti-refresh"></i> Reset App Data</button>
    </div>`;
}

// ── Desktop Time Clock — pick an employee, see their punches grouped by day with a
//    real map per punch (reusing the same dayMapBlock/initDayReportMaps the phone's
//    day-report popup already uses — same map, same fallbacks, just shown inline). ──
let _dskTcSelectedEmp = null;
async function renderDesktopTimeClockHTML(){
  const employees = window._useCloud ? await CloudDS.getEmployees() : getEmployees();
  const entries = getTimeEntries().filter(e=>e.type!=='lunch');
  const empIdsWithPunches = [...new Set(entries.map(e=>e.empId))];
  const empName = id => { const e=employees.find(x=>x.id===id); if(e) return e.name; const isMe=(window.Auth&&Auth.userId===id); if(isMe){ const p=getProfile(); return (p.firstName?(p.firstName+(p.lastName?' '+p.lastName:'')):(p.name||'Owner')); } return 'Unknown'; };
  const empInitials = id => { const e=employees.find(x=>x.id===id); if(e) return e.initials; return (empName(id).split(' ').map(w=>w[0]).join('').slice(0,2)||'?').toUpperCase(); };
  const empColor = id => { const e=employees.find(x=>x.id===id); return e?e.color:'#64748b'; };

  // Roster to list: active employees first (even with 0 punches), then anyone else who has punches.
  const rosterIds = [...new Set([...employees.filter(e=>e.active).map(e=>e.id), ...empIdsWithPunches])];
  if (!_dskTcSelectedEmp || !rosterIds.includes(_dskTcSelectedEmp)) _dskTcSelectedEmp = rosterIds[0] || null;

  const listHTML = rosterIds.map(id=>{
    const count = entries.filter(e=>e.empId===id).length;
    const active = id === _dskTcSelectedEmp;
    return `<button class="dsk-tc-emp ${active?'active':''}" onclick="selectDskTcEmp('${id}')">
      <span class="dsk-tc-emp-av" style="background:${empColor(id)}">${empInitials(id)}</span>
      <span class="dsk-tc-emp-name">${empName(id)}</span>
      <span class="dsk-tc-emp-count">${count}</span>
    </button>`;
  }).join('');

  let detailHTML = `<div class="text-sm text-muted" style="padding:20px">Select an employee to see their time clock history.</div>`;
  let allShown = [];
  if (_dskTcSelectedEmp) {
    const mine = entries.filter(e=>e.empId===_dskTcSelectedEmp).sort((a,b)=>new Date(b.clockIn)-new Date(a.clockIn));
    allShown = mine;
    window._dskTcAllShown = mine;

    // Group into Sun–Sat payroll weeks, most recent first.
    const weekKeyOf = ds => { const d=new Date(ds+'T12:00:00'); const sun=new Date(d); sun.setDate(d.getDate()-d.getDay()); return toISO(sun); };
    const byWeek = {};
    mine.forEach(e=>{ const wk=weekKeyOf(e.date); (byWeek[wk]=byWeek[wk]||[]).push(e); });
    const weekKeys = Object.keys(byWeek).sort((a,b)=>b.localeCompare(a));

    detailHTML = `
      <div class="dsk-tc-detail-head">
        <span class="dsk-tc-emp-av" style="background:${empColor(_dskTcSelectedEmp)};width:40px;height:40px;font-size:14px">${empInitials(_dskTcSelectedEmp)}</span>
        <div style="font-size:17px;font-weight:800">${empName(_dskTcSelectedEmp)}</div>
      </div>
      ${weekKeys.length ? weekKeys.map(wk=>{
        const weekEntries = byWeek[wk];
        const weekMs = weekEntries.reduce((s,e)=>s+(e.clockOut?(new Date(e.clockOut)-new Date(e.clockIn)):0),0);
        const sun = new Date(wk+'T12:00:00'); const sat = new Date(sun); sat.setDate(sun.getDate()+6);
        const rangeLabel = `${sun.toLocaleDateString('en-US',{month:'short',day:'numeric'})} – ${sat.toLocaleDateString('en-US',{month:'short',day:'numeric'})}`;

        const byDate = {};
        weekEntries.forEach(e=>{ (byDate[e.date]=byDate[e.date]||[]).push(e); });
        const dates = Object.keys(byDate).sort((a,b)=>b.localeCompare(a));

        return `<div class="dsk-tc-week-block">
          <div class="dsk-tc-week-head">
            <span>Week of ${rangeLabel}</span>
            <span class="dsk-tc-week-total">${fmtPayrollHours(weekMs)} hrs</span>
            <button class="btn btn-secondary btn-sm" onclick="exportTimeClockWeekCsv('${_dskTcSelectedEmp}','${wk}')"><i class="ti ti-download"></i> Export CSV</button>
          </div>
          ${dates.map(ds=>{
            const day = byDate[ds];
            const totalMs = day.reduce((s,e)=>s+(e.clockOut?(new Date(e.clockOut)-new Date(e.clockIn)):0),0);
            const dlabel = new Date(ds+'T12:00:00').toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'});
            return `<div class="dsk-tc-day-block">
              <div class="dsk-tc-day-head"><span>${dlabel}</span><span class="dsk-tc-day-total">${fmtPayrollHours(totalMs)} hrs</span></div>
              ${day.map(e=>{
                const inT = new Date(e.clockIn).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
                const outT = e.clockOut ? new Date(e.clockOut).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}) : 'ongoing';
                const dur = e.clockOut ? fmtPayrollHours(new Date(e.clockOut)-new Date(e.clockIn))+' hrs' : '—';
                return `<div class="dsk-tc-punch">
                  <div class="dsk-tc-punch-row">
                    <div class="dsk-tc-punch-time">${inT} <i class="ti ti-arrow-right" style="font-size:12px;color:var(--hint)"></i> ${outT}</div>
                    <div class="dsk-tc-punch-dur">${dur}</div>
                    <button class="btn btn-secondary btn-sm" onclick="openEditTimeEntry('${e.id}')"><i class="ti ti-edit"></i> Edit</button>
                  </div>
                  ${dayMapBlock(e)}
                </div>`;
              }).join('')}
            </div>`;
          }).join('')}
        </div>`;
      }).join('') : `<div class="text-sm text-muted" style="padding:20px">No punches recorded yet.</div>`}`;
  }

  return `<div class="dsk-tc-layout">
    <div class="dsk-tc-list">${listHTML || `<div class="text-sm text-muted" style="padding:14px">No employees yet.</div>`}</div>
    <div class="dsk-tc-detail">${detailHTML}</div>
  </div>`;
}
window._dskTcAllShown = [];
function selectDskTcEmp(id){ _dskTcSelectedEmp = id; renderDesktopScreen('timeclock'); }

// ── Desktop Messages — everything Thrive has SENT (texts + emails), searchable.
//    Honest limitation: this is one-directional. Thrive can send texts, but nothing
//    currently listens for a customer's REPLY — that needs a Twilio inbound webhook
//    (its own small backend piece, similar in shape to the send-sms function) writing
//    replies back into this same log. Until that exists, this is a sent-message
//    history, not a two-way conversation view. ──
// ── Desktop Messages — a real two-pane conversation view: customers on the left
//    (most recent activity first), the selected customer's full thread on the right,
//    with a reply box. Inbound texts require the Twilio webhook (edge-function-
//    receive-sms.ts) to be set up — until then this still works as a send + sent-log
//    view, it just won't show customer replies. ──
let _dskMsgSelected = null;
function renderDesktopMessagesHTML(){
  const msgs = getMessages().slice().sort((a,b)=> new Date(b.createdAt||0) - new Date(a.createdAt||0));
  const byCustomer = {};
  msgs.forEach(m=>{ if(!m.customerId) return; (byCustomer[m.customerId]=byCustomer[m.customerId]||[]).push(m); });
  const custIds = Object.keys(byCustomer); // already newest-first since msgs is newest-first and we push in order
  if (!_dskMsgSelected || !byCustomer[_dskMsgSelected]) _dskMsgSelected = custIds[0] || null;

  const listHTML = custIds.map(id=>{
    const c = getCustomer(id);
    const latest = byCustomer[id][0];
    const active = id === _dskMsgSelected;
    return `<button class="dsk-msg-conv ${active?'active':''}" onclick="selectDskMsgConv('${id}')">
      <div class="cust-avatar" style="${c?avatarStyle(c.id):'background:#f0f2f5'};width:34px;height:34px;font-size:13px;border-radius:9px;flex-shrink:0">${c?initials(c):'?'}</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:13px">${c?fullName(c):'Unknown customer'}</div>
        <div class="text-sm text-muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${latest.direction==='inbound'?'':'You: '}${(latest.text||'').replace(/</g,'&lt;')}</div>
      </div>
    </button>`;
  }).join('');

  let threadHTML = `<div class="text-sm text-muted" style="padding:24px">Select a conversation to see the message history.</div>`;
  if (_dskMsgSelected) {
    const c = getCustomer(_dskMsgSelected);
    const thread = byCustomer[_dskMsgSelected].slice().reverse(); // oldest first for reading top-to-bottom
    threadHTML = `
      <div class="dsk-msg-thread-head">
        <div class="cust-avatar" style="${c?avatarStyle(c.id):'background:#f0f2f5'};width:34px;height:34px;font-size:13px;border-radius:9px">${c?initials(c):'?'}</div>
        <div style="font-weight:800">${c?fullName(c):'Unknown customer'}</div>
        ${c&&c.phone?`<span class="text-sm text-muted" style="margin-left:auto">${fmtPhone(c.phone)}</span>`:''}
      </div>
      <div class="dsk-msg-thread" id="dsk-msg-thread">
        ${thread.map(m=>`<div class="dsk-bubble ${m.direction==='inbound'?'in':'out'}${m.jobId?' clickable':''}" ${m.jobId?`onclick="openJobDetail('${m.jobId}')" title="Open this job"`:''}>
          <div>${(m.text||'').replace(/</g,'&lt;')}</div>
          <div class="dsk-bubble-time">${m.sent||''}${m.jobId?' · <i class="ti ti-external-link"></i>':''}</div>
        </div>`).join('')}
      </div>
      ${c&&c.phone ? `<div class="dsk-msg-reply-row">
        <input class="form-input" id="dsk-msg-reply" placeholder="Type a reply…" onkeydown="if(event.key==='Enter')sendDskMsgReply()">
        <button class="btn btn-primary" onclick="sendDskMsgReply()"><i class="ti ti-send"></i></button>
      </div>` : `<div class="text-sm text-muted" style="padding:10px 16px">No phone on file — can't reply by text.</div>`}`;
  }

  const hasInbound = msgs.some(m=>m.direction==='inbound');
  const banner = hasInbound
    ? `<div class="info-banner" style="margin-bottom:14px;background:var(--green-lt,#e9f9ef);border-color:var(--green)"><i class="ti ti-circle-check" style="color:var(--green)"></i><p>Inbound texting is working — customer replies are showing up below.</p></div>`
    : `<div class="info-banner" style="margin-bottom:14px"><i class="ti ti-info-circle"></i><p>Sent messages (confirmations, invoices, review requests) always show here. No customer <strong>reply</strong> has come through yet — either none has been sent, or the Twilio inbound webhook isn't connected. Text your Thrive number from your own phone to test it.</p></div>`;

  return `
    ${banner}
    <div class="dsk-msg-layout">
      <div class="dsk-msg-convlist">${listHTML || `<div class="text-sm text-muted" style="padding:14px">No messages yet.</div>`}</div>
      <div class="dsk-msg-threadpane">${threadHTML}</div>
    </div>`;
}
function selectDskMsgConv(id){ _dskMsgSelected = id; renderDesktopScreen('messages'); setTimeout(()=>{ const t=document.getElementById('dsk-msg-thread'); if(t) t.scrollTop = t.scrollHeight; }, 30); }
async function sendDskMsgReply(){
  const inp = document.getElementById('dsk-msg-reply');
  const text = (inp?.value||'').trim();
  if (!text || !_dskMsgSelected) return;
  const c = getCustomer(_dskMsgSelected);
  if (!c || !c.phone) { toast('⚠️ No phone on file'); return; }
  inp.value = '';
  const ok = await sendSMS(c.phone, text);
  if (ok) {
    asyncLogMessage({ id:newId('m'), customerId:c.id, text, sent:nowTime(), type:'sent', direction:'outbound', date:todayStr() });
    renderDesktopScreen('messages');
    setTimeout(()=>{ const t=document.getElementById('dsk-msg-thread'); if(t) t.scrollTop = t.scrollHeight; }, 30);
  } else {
    toast('⚠️ Message failed to send');
  }
}

// ── Jobs (history) — every job ever booked, with paid/unpaid status at a glance.
//    Separate from Schedule (the forward-looking calendar) — this is the searchable
//    record of what's been done. ──
let _dskJhStatusFilter = 'all';
let _dskJhSort = {key:'date', dir:-1};
let _dskJhPaymentFilter = 'all';
function filterDesktopJobHistory(q){
  q = (q||'').toLowerCase();
  document.querySelectorAll('#dsk-jh-tbody tr').forEach(row=>{
    row.style.display = row.dataset.search.includes(q) ? '' : 'none';
  });
}
function setDskJhStatusFilter(f){ _dskJhStatusFilter = f; renderDesktopScreen('jobhistory'); }
function setDskJhPaymentFilter(f){ _dskJhPaymentFilter = f; renderDesktopScreen('jobhistory'); }
function sortDskJh(key){ _dskJhSort = { key, dir: (_dskJhSort.key===key ? -_dskJhSort.dir : 1) }; renderDesktopScreen('jobhistory'); }
function renderDesktopJobHistoryHTML(){
  let jobs = scopeJobsToRole(getJobs()).filter(j=>j.confirmed!==false); // real jobs, not open estimates
  if (_dskJhStatusFilter!=='all') jobs = jobs.filter(j=>j.status===_dskJhStatusFilter);
  if (_dskJhPaymentFilter!=='all') {
    jobs = jobs.filter(j=>{
      const pm = jobPayMath(j.id);
      const isPaidFull = pm.total>0 && pm.due<=0.005;
      return _dskJhPaymentFilter==='paid' ? isPaidFull : !isPaidFull;
    });
  }

  const k=_dskJhSort.key, dir=_dskJhSort.dir;
  jobs = jobs.slice().sort((a,b)=>{
    let av,bv;
    if (k==='price')    { av=a.price||0; bv=b.price||0; }
    else if (k==='customer'){ const ca=getCustomer(a.customerId), cb=getCustomer(b.customerId); av=(ca?fullName(ca):'').toLowerCase(); bv=(cb?fullName(cb):'').toLowerCase(); }
    else { av=a.date||''; bv=b.date||''; }
    return av<bv ? -1*dir : av>bv ? 1*dir : 0;
  });
  const arrow = key => _dskJhSort.key===key ? (_dskJhSort.dir===1?' ↑':' ↓') : '';

  const totalValue = jobs.reduce((s,j)=>s+(j.price||0),0);
  const rows = jobs.map(j=>{
    const c = getCustomer(j.customerId);
    const pm = jobPayMath(j.id);
    const isPaidFull = pm.total>0 && pm.due<=0.005;
    const search = `${c?fullName(c):''} ${j.service||''}`.toLowerCase();
    return `<tr onclick="openJobDetail('${j.id}')" data-search="${search.replace(/"/g,'')}">
      <td>${fmtDate(j.date)}</td>
      <td>${c?fullName(c):'—'}</td>
      <td>${j.service||'—'}</td>
      <td>${statusPill(j.status)}</td>
      <td style="font-weight:700">${fmtMoney(j.price||0)}</td>
      <td>${j.price ? `<span style="font-weight:700;color:${isPaidFull?'var(--green)':'#d03030'}">${isPaidFull?'Paid':'Unpaid'}</span>` : '—'}</td>
    </tr>`;
  }).join('');

  const statusPills = [
    ['all','All'], ['scheduled','Scheduled'], ['inprogress','On My Way'], ['paused','Paused'],
    ['done','Completed'], ['cancelled','Cancelled'], ['didnotgo','Did Not Go Through'],
  ];
  const paymentPills = [['all','All'],['paid','Paid'],['unpaid','Unpaid']];

  return `
    <div class="dsk-table-toolbar" style="flex-wrap:wrap;row-gap:8px">
      <input id="dsk-jh-search" class="form-input" placeholder="Search customer or service…" style="max-width:280px">
      <span class="text-sm text-muted" style="margin-left:auto">${jobs.length} job${jobs.length!==1?'s':''} · ${fmtMoney(totalValue)}</span>
    </div>
    <div class="dsk-table-toolbar" style="flex-wrap:wrap;row-gap:8px;margin-top:-4px">
      <div class="dsk-filter-pills">
        ${statusPills.map(([v,l])=>`<button class="${_dskJhStatusFilter===v?'active':''}" onclick="setDskJhStatusFilter('${v}')">${l}</button>`).join('')}
      </div>
      <div class="dsk-filter-pills">
        ${paymentPills.map(([v,l])=>`<button class="${_dskJhPaymentFilter===v?'active':''}" onclick="setDskJhPaymentFilter('${v}')">${l}</button>`).join('')}
      </div>
    </div>
    <table class="dsk-table">
      <thead><tr>
        <th onclick="sortDskJh('date')" style="cursor:pointer">Date${arrow('date')}</th>
        <th onclick="sortDskJh('customer')" style="cursor:pointer">Customer${arrow('customer')}</th>
        <th>Service</th><th>Status</th>
        <th onclick="sortDskJh('price')" style="cursor:pointer">Price${arrow('price')}</th>
        <th>Payment</th>
      </tr></thead>
      <tbody id="dsk-jh-tbody">${rows || `<tr><td colspan="6" style="text-align:center;color:var(--hint);padding:24px">No jobs match these filters</td></tr>`}</tbody>
    </table>`;
}

// Exports one employee's week as a CSV — a practical stand-in for a real Gusto/payroll
// API sync (which is its own larger project): most payroll platforms, Gusto included,
// accept hours via CSV import or manual entry, so this gets the data there today.
function exportTimeClockWeekCsv(empId, weekKey){
  const employees = getEmployees();
  const emp = employees.find(e=>e.id===empId);
  const isMe = (window.Auth && Auth.userId===empId);
  const name = emp ? emp.name : (isMe ? ((getProfile().name)||'Owner') : 'Employee');
  const entries = getTimeEntries().filter(e=>e.empId===empId && e.type!=='lunch');
  const sun = new Date(weekKey+'T12:00:00'); const sat = new Date(sun); sat.setDate(sun.getDate()+6);
  const weekEnts = entries.filter(e=>{ const d=new Date(e.date+'T12:00:00'); return d>=sun && d<=sat; }).sort((a,b)=>new Date(a.clockIn)-new Date(b.clockIn));
  if (!weekEnts.length) { toast('⚠️ No punches in this week'); return; }
  const rows = [['Employee','Date','Clock In','Clock Out','Hours']];
  let total = 0;
  weekEnts.forEach(e=>{
    const hrs = e.clockOut ? (new Date(e.clockOut)-new Date(e.clockIn))/3600000 : 0;
    total += hrs;
    rows.push([
      name,
      e.date,
      new Date(e.clockIn).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}),
      e.clockOut ? new Date(e.clockOut).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}) : 'ongoing',
      hrs.toFixed(2),
    ]);
  });
  rows.push(['','','','Total', total.toFixed(2)]);
  const csv = rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${name.replace(/\s+/g,'_')}_${weekKey}_hours.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 2000);
  toast('<i class="ti ti-check" style="color:#4ade80"></i> CSV downloaded');
}

// Edit a punch's clock-in/out times — for when someone forgets to clock out.
function _dtLocal(iso){ if(!iso) return ''; const d=new Date(iso); const p=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; }
function openEditTimeEntry(entryId){
  const e = getTimeEntries().find(x=>x.id===entryId); if(!e) return;
  const body = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <div style="font-size:18px;font-weight:800">Edit punch</div>
      <button onclick="closeDyn('edit-time-entry')" style="background:none;border:none;font-size:24px;color:var(--hint);cursor:pointer;line-height:1">×</button>
    </div>
    <div class="form-group"><label class="form-label">Clock In</label><input class="form-input" type="datetime-local" id="et-in" value="${_dtLocal(e.clockIn)}"></div>
    <div class="form-group" style="margin-bottom:16px"><label class="form-label">Clock Out</label><input class="form-input" type="datetime-local" id="et-out" value="${_dtLocal(e.clockOut)}"></div>
    <button class="btn btn-primary btn-full" onclick="saveEditTimeEntry('${entryId}')"><i class="ti ti-check"></i> Save</button>`;
  dynSheet('edit-time-entry', body, 260);
}
async function saveEditTimeEntry(entryId){
  const e = getTimeEntries().find(x=>x.id===entryId); if(!e) return;
  const inVal = document.getElementById('et-in')?.value;
  const outVal = document.getElementById('et-out')?.value;
  if (!inVal) { toast('⚠️ Clock in time is required'); return; }
  e.clockIn = new Date(inVal).toISOString();
  e.clockOut = outVal ? new Date(outVal).toISOString() : null;
  e.date = toISO(new Date(inVal));
  saveTimeEntry(e);
  closeDyn('edit-time-entry');
  toast('<i class="ti ti-check" style="color:#4ade80"></i> Punch updated');
  renderDesktopScreen('timeclock');
}

function assignedSectionHTML(jobId){
  const ids=getJobAssignees(jobId);
  const cards=ids.map(id=>{
    const name=getTechName(id)||'Unknown';
    const color=getTechColor(id);
    return `<div style="background:#f7f8fa;border-radius:8px;padding:9px 13px 9px 9px;display:flex;align-items:center;gap:9px">
      <div style="width:30px;height:30px;border-radius:8px;background:${color};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0">${initialsOf(name)}</div>
      <span style="font-size:13px;font-weight:600;white-space:nowrap">${name}</span>
    </div>`;
  }).join('');
  const strip=`<div style="background:var(--primary);border-radius:10px 10px 0 0;padding:10px 14px;margin-top:18px;display:flex;align-items:center;justify-content:space-between">
    <span style="font-size:11px;letter-spacing:1.5px;font-weight:800;color:#a9c0e8">ON THIS JOB</span>
    <button onclick="openReassign('${jobId}')" style="background:#fff;border:none;border-radius:8px;color:var(--primary);font-size:11px;font-weight:700;padding:5px 11px;cursor:pointer;display:flex;align-items:center;gap:5px"><i class="ti ti-user-edit" style="font-size:13px"></i> ${ids.length?'Reassign':'Assign'}</button>
  </div>`;
  return `${strip}<div class="card" style="${sectionCardStyle('12px')}">
    ${ids.length ? `<div style="display:flex;flex-wrap:wrap;gap:8px">${cards}</div>` : `<span class="text-sm text-muted">No one assigned yet</span>`}
  </div>`;
}
function openNavigate(address){
  if(!address) return;
  const q=encodeURIComponent(address);
  const body=`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px"><div style="font-size:17px;font-weight:800">Navigate</div><button onclick="closeDyn('nav-choice')" style="background:none;border:none;font-size:24px;color:var(--hint);cursor:pointer;line-height:1">×</button></div>
    <div style="font-size:13px;color:var(--muted);margin-bottom:14px">${address}</div>
    <a class="btn btn-primary btn-full" style="margin-bottom:8px;text-decoration:none" href="https://maps.apple.com/?q=${q}" target="_blank" onclick="closeDyn('nav-choice')"><i class="ti ti-map-2"></i> Apple Maps</a>
    <a class="btn btn-secondary btn-full" style="text-decoration:none" href="https://www.google.com/maps/search/?api=1&query=${q}" target="_blank" onclick="closeDyn('nav-choice')"><i class="ti ti-brand-google-maps"></i> Google Maps</a>`;
  dynSheet('nav-choice', body, 260);
}
async function savePrivateNote(jobId){
  const el=document.getElementById('jd-private-notes'); if(!el) return;
  const j=getJob(jobId); if(!j) return;
  j.notes=el.value;
  saveJob(j);
  if(window._useCloud && window.CloudDS){ try{ await CloudDS.saveJob(j); }catch(e){} }
}

// Shared "bold title + hairline divider" section header used across job detail cards.
// "Bold and structured" header: a navy strip fused to the top of the card that follows it
// (that card must use sectionCardStyle() for its style attribute so the corners line up).
function sectionHead(title, extra){
  return `<div style="background:var(--primary);border-radius:10px 10px 0 0;padding:10px 14px;margin-top:18px;display:flex;align-items:center;justify-content:space-between">
    <span style="font-size:11px;letter-spacing:1.5px;font-weight:800;color:#a9c0e8">${title.toUpperCase()}</span>${extra||''}
  </div>`;
}
function sectionCardStyle(marginBottom){ return `border-radius:0 0 10px 10px;border-top:none;margin-top:0;margin-bottom:${marginBottom||'12px'}`; }
function openStatusChoice(jobId){
  const j=getJob(jobId); if(!j) return;
  const opts=[
    ['done','Mark Complete','ti-circle-check','var(--green)'],
    ['paused','Pause Job','ti-player-pause','var(--orange)'],
    ['cancelled','Cancel Job','ti-x','var(--red)'],
    ['didnotgo','Did Not Go Through','ti-thumb-down','var(--muted)'],
  ];
  const body=`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <div style="font-size:18px;font-weight:800">Update status</div>
      <button onclick="closeDyn('status-choice')" style="background:none;border:none;font-size:24px;color:var(--hint);cursor:pointer;line-height:1">×</button>
    </div>
    ${opts.map(([val,label,icon,color])=>`<button class="btn btn-secondary btn-full" style="margin-bottom:8px;justify-content:flex-start;text-align:left" onclick="confirmStatusChoice('${jobId}','${val}','${label.replace(/'/g,"\\'")}')"><i class="ti ${icon}" style="color:${color}"></i>&nbsp; ${label}</button>`).join('')}`;
  dynSheet('status-choice', body, 250);
}
function confirmStatusChoice(jobId, val, label){
  closeDyn('status-choice');
  const body=`
    <div style="text-align:center;padding:6px 4px 2px">
      <div style="font-size:18px;font-weight:800;margin-bottom:8px">${label}?</div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:20px">Are you sure you want to ${label.toLowerCase()} this job?</div>
      <button class="btn btn-primary btn-full" style="margin-bottom:8px" onclick="closeDyn('status-confirm');setJobStatus('${jobId}','${val}')">Yes, ${label.toLowerCase()}</button>
      <button class="btn btn-secondary btn-full" onclick="closeDyn('status-confirm');openStatusChoice('${jobId}')">Cancel</button>
    </div>`;
  dynSheet('status-confirm', body, 260);
}
function statusDotColor(s){ return {scheduled:'var(--primary)',inprogress:'var(--orange)',done:'var(--green)',paused:'var(--muted)',cancelled:'var(--hint)',didnotgo:'var(--red)'}[s] || 'var(--muted)'; }
function statusLabel(s){ return {scheduled:'Scheduled',inprogress:'On My Way',done:'Completed',paused:'Paused',cancelled:'Cancelled',didnotgo:'Did Not Go'}[s] || s; }

function openReviewSendChoice(jobId){
  const j=getJob(jobId); if(!j) return;
  const c=getCustomer(j.customerId);
  const canText=!!(c&&c.phone);
  const body=`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
      <div style="font-size:18px;font-weight:800">Send review request?</div>
      <button onclick="closeDyn('review-send')" style="background:none;border:none;font-size:24px;color:var(--hint);cursor:pointer;line-height:1">×</button>
    </div>
    <div style="font-size:13px;color:var(--muted);margin-bottom:16px">Text ${c?c.firstName:'the customer'} a thank-you with your Google review link? Skip this if the job didn't go smoothly.</div>
    ${canText
      ? `<button class="btn btn-primary btn-full" style="margin-bottom:8px" onclick="confirmSendReview('${jobId}')"><i class="ti ti-star"></i> Yes, send review request</button>`
      : `<div class="text-sm text-muted" style="margin-bottom:8px">No phone on file to text.</div>`}
    <button class="btn btn-secondary btn-full" onclick="closeDyn('review-send')">No, skip it</button>`;
  dynSheet('review-send', body, 260);
}
async function confirmSendReview(jobId){
  closeDyn('review-send');
  const j=getJob(jobId); const c=j?getCustomer(j.customerId):null;
  try{ await sendReviewRequest(jobId); toast(`<i class="ti ti-star" style="color:#4ade80"></i> Review request sent${c?' to '+c.firstName:''}`); }
  catch(e){ console.warn('Review SMS error:', e); }
}

function openJobDetail(jobId) {
  clearInterval(_timerInterval);
  const j = getJob(jobId);
  if (!j) return;
  const c = getCustomer(j.customerId);
  const p = getProfile();
  const inv = getInvoices().find(i => i.jobId === jobId);
  const timer = getJobTimer(jobId);
  const elapsed = getElapsedMs(jobId);
  const isDone = ['done','cancelled','didnotgo'].includes(j.status);
  const goneOMW = hasGoneOMW(jobId);
  const driveMs = getDriveMs(jobId);
  const driveRunning = !!(getDriveTimer(jobId)||{}).running;
  const jobRunning = !!(timer && timer.running);
  const payM = jobPayMath(jobId);
  const isPaidFull = payM.total > 0 && payM.due <= 0.005;
  const needsPay = isDone && !isPaidFull && payM.total > 0; // completed, there's a price, and it's not settled yet
  const payBg = isPaidFull ? 'var(--green)' : (needsPay ? 'var(--red)' : '#0b2a5b');
  const payIcon = isPaidFull ? 'ti-check' : 'ti-cash';
  const payLabel = isPaidFull ? 'Paid' : 'Pay';

  document.getElementById('job-detail-body').innerHTML = `
    ${j.confirmed === false ? `
    <div style="background:#f3eefe;border:1px dashed #7c5cff;border-radius:10px;padding:12px 14px;margin-bottom:12px">
      <div style="font-size:12px;font-weight:800;color:#6b46e5;margin-bottom:8px"><i class="ti ti-file-dollar"></i> Estimate — not yet a confirmed job</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <button class="btn btn-sm btn-secondary btn-full" onclick="openSendQuote('${jobId}')"><i class="ti ti-send"></i> Send Quote</button>
        <button class="btn btn-sm btn-primary btn-full" onclick="convertJobToConfirmed('${jobId}')"><i class="ti ti-calendar-check"></i> Convert to Job</button>
      </div>
    </div>` : ''}
    <!-- Top action bar — 3 standout buttons show where you are in the job -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px">
      <button class="btn btn-full" style="flex-direction:column;gap:5px;padding:13px 4px;background:${goneOMW?'#8b93a3':'var(--primary)'};color:#fff;border:none;${(isDone||goneOMW)?'opacity:0.6':''}"
        onclick="sendOMWFromDetail('${jobId}')" ${(isDone||goneOMW)?'disabled':''}>
        <i class="ti ti-${goneOMW?'check':'send'}" style="font-size:21px"></i><span style="font-size:11px;font-weight:700">${goneOMW?'En route':'On My Way'}</span>
      </button>
      ${!jobRunning ? `
        <button class="btn btn-full" style="flex-direction:column;gap:5px;padding:13px 4px;background:var(--green);color:#fff;border:none;${isDone?'opacity:0.4':''}" onclick="startJobTimer('${jobId}')" ${isDone?'disabled':''}>
          <i class="ti ti-player-play" style="font-size:21px"></i><span style="font-size:11px;font-weight:700">${elapsed>0?'Resume':'Start Time'}</span>
        </button>` : `
        <button class="btn btn-full" style="flex-direction:column;gap:5px;padding:13px 4px;background:var(--orange);color:#fff;border:none" onclick="pauseJobTimer('${jobId}')">
          <i class="ti ti-player-pause" style="font-size:21px"></i><span style="font-size:11px;font-weight:700">Pause</span>
        </button>`}
      <button class="btn btn-full" style="flex-direction:column;gap:5px;padding:13px 4px;background:${payBg};color:#fff;border:none"
        onclick="openJobPay('${jobId}')">
        <i class="ti ${payIcon}" style="font-size:21px"></i><span style="font-size:11px;font-weight:700">${payLabel}</span>
      </button>
    </div>
    ${!isDone ? `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:13px 14px;background:#f7f8fa;border-radius:12px;margin-bottom:16px;cursor:pointer" onclick="openStatusChoice('${jobId}')">
      <span style="display:flex;align-items:center;gap:9px;font-weight:700"><span style="width:10px;height:10px;border-radius:50%;background:${statusDotColor(j.status)}"></span>${statusLabel(j.status)}</span>
      <i class="ti ti-chevron-down" style="color:var(--hint)"></i>
    </div>` : `<div style="margin-bottom:16px">${statusPill(j.status)}</div>`}

    <!-- Drive time + on-job time -->
    ${(goneOMW || elapsed > 0 || jobRunning || driveMs > 0) ? `
    <div style="display:flex;gap:8px;margin-bottom:12px">
      <div style="flex:1;background:${driveRunning?'#fff3ea':'#f0f2f5'};border-radius:10px;padding:10px 13px">
        <div style="font-size:10px;font-weight:800;color:var(--muted);letter-spacing:.5px">DRIVE TIME${driveRunning?' · LIVE':''}</div>
        <div id="drive-timer-display" style="font-size:22px;font-weight:900;font-family:monospace;color:${driveRunning?'var(--orange)':'var(--text)'}">${fmtElapsed(driveMs)}</div>
      </div>
      <div style="flex:1;background:${jobRunning?'var(--primary-lt)':'#f0f2f5'};border-radius:10px;padding:10px 13px">
        <div style="font-size:10px;font-weight:800;color:var(--muted);letter-spacing:.5px">ON-JOB TIME${jobRunning?' · LIVE':''}</div>
        <div id="job-timer-display" style="font-size:22px;font-weight:900;font-family:monospace" class="timer-val">${fmtElapsed(elapsed)}</div>
      </div>
    </div>` : `
    <div style="background:#f0f2f5;border-radius:10px;padding:12px 16px;margin-bottom:12px;display:flex;align-items:center;gap:12px">
      <i class="ti ti-clock" style="font-size:24px;color:var(--hint)"></i>
      <div>
        <div style="font-size:12px;font-weight:700;color:var(--muted)">TIME TRACKING</div>
        <div style="font-size:12px;color:var(--hint)">Tap On My Way to start drive time, or Start Time to begin the job</div>
      </div>
    </div>`}

    <!-- Client -->
    ${sectionHead('Client', c?`<div style="display:flex;gap:8px">
        <button onclick="openSMSModal('${c.id}')" style="width:34px;height:34px;border-radius:8px;border:none;background:#fff;color:var(--primary);display:flex;align-items:center;justify-content:center;cursor:pointer"><i class="ti ti-message" style="font-size:16px"></i></button>
        ${c.phone?`<a href="tel:${c.phone}" style="width:34px;height:34px;border-radius:8px;border:none;background:#fff;color:var(--primary);display:flex;align-items:center;justify-content:center;text-decoration:none"><i class="ti ti-phone" style="font-size:16px"></i></a>`:''}
        ${j.address?`<button onclick="openNavigate('${(j.address||'').replace(/'/g,"\\'")}')" style="width:34px;height:34px;border-radius:8px;border:none;background:#fff;color:var(--primary);display:flex;align-items:center;justify-content:center;cursor:pointer"><i class="ti ti-navigation" style="font-size:16px"></i></button>`:''}
      </div>`:'')}
    <div class="card" style="${sectionCardStyle('6px')}">
      <div style="display:flex;align-items:center;gap:12px${c?';cursor:pointer':''}" ${c?`onclick="openCustomerDetail('${c.id}')"`:''}>
        <div class="cust-avatar" style="${c?avatarStyle(c.id):'background:#f0f2f5'};width:46px;height:46px;font-size:16px;border-radius:8px">${c?initials(c):'?'}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:16px;font-weight:800${c?';color:var(--primary)':''}">${c?fullName(c):'Unknown Customer'}${c?' <i class="ti ti-chevron-right" style="font-size:14px;color:var(--hint)"></i>':''}</div>
          ${c?.email?`<div class="text-sm text-muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.email}</div>`:''}
        </div>
      </div>
      ${c&&c.phone?`<div style="display:flex;align-items:center;gap:10px;padding:10px 0 0;margin-top:10px;border-top:1px solid var(--border)">
        <i class="ti ti-phone" style="color:var(--hint);font-size:16px"></i>
        <span style="font-size:13px">${fmtPhone(c.phone)}</span>
      </div>`:''}
      ${j.address?`<div style="display:flex;align-items:flex-start;gap:10px;padding:10px 0 0;margin-top:${c&&c.phone?'8px':'10px'};${c&&c.phone?'':'border-top:1px solid var(--border)'}">
        <i class="ti ti-map-pin" style="color:var(--hint);font-size:16px;margin-top:1px"></i>
        <span style="font-size:13px">${j.address}</span>
      </div>`:''}
    </div>

    <!-- Address / map -->
    ${j.address?`
    ${sectionHead('Address')}
    ${streetViewCard(j.address, true)}
    <a class="btn btn-primary btn-full" style="text-decoration:none;margin:-2px 0 6px;border-radius:8px" onclick="event.preventDefault();openNavigate('${(j.address||'').replace(/'/g,"\\'")}')" href="#"><i class="ti ti-navigation"></i> Navigate</a>
    `:''}

    <!-- Schedule -->
    ${sectionHead('Schedule')}
    <div class="card" style="padding:0;${sectionCardStyle('12px')}">
      <div class="inv-row" style="padding:12px 14px;cursor:pointer" onclick="${isDone?'':`openReschedule('${jobId}')`}">
        <span class="text-muted"><i class="ti ti-calendar"></i> Date</span>
        <span style="font-weight:700;text-align:right">${fmtDate(j.date)}${isDone?'':` <i class="ti ti-pencil" style="color:var(--primary);margin-left:5px;font-size:13px"></i>`}</span>
      </div>
      <div class="inv-row" style="padding:12px 14px;cursor:pointer" onclick="${isDone?'':`openReschedule('${jobId}')`}">
        <span class="text-muted"><i class="ti ti-clock"></i> Time</span>
        <span style="font-weight:700;text-align:right">${fmt12(j.time)}${j.timeEnd?` → ${fmt12(j.timeEnd)}`:''}${isDone?'':` <i class="ti ti-pencil" style="color:var(--primary);margin-left:5px;font-size:13px"></i>`}</span>
      </div>
      <div class="inv-row" style="padding:12px 14px;border:none"><span class="text-muted"><i class="ti ti-truck"></i> Service</span><span style="font-weight:600">${j.service}</span></div>
    </div>

    <!-- Items -->
    ${!isDone ? `
    <!-- Items drive the job total (add an item = applied instantly) -->
    <div class="card" style="margin-bottom:10px">
      <div id="job-line-items"></div>
    </div>
    ` : `
    <div class="card" style="background:var(--green-lt);border-color:var(--green)">
      <div style="display:flex;align-items:center;gap:10px">
        <i class="ti ti-circle-check" style="font-size:24px;color:var(--green)"></i>
        <div>
          <div style="font-weight:700;color:var(--green)">Job Complete</div>
          <div class="text-sm" style="color:var(--green)">${j.price?fmtMoney(j.price)+' · ':''}${driveMs>0?`Drive ${fmtElapsed(driveMs)} · `:''}On job ${fmtElapsed(elapsed)||'0:00'}</div>
        </div>
      </div>
    </div>
    <button class="btn btn-secondary btn-full" onclick="openJobInvoice('${jobId}')"><i class="ti ti-receipt"></i> View Invoice</button>
    `}
    ${inv?`<div style="background:var(--green-lt);border-radius:9px;padding:10px 14px;margin-top:8px;font-size:12px;color:var(--green)">
      <i class="ti ti-receipt"></i> Invoice #${inv.id.toUpperCase()} — ${invStatusPill(inv.status)} ${fmtMoney(invoiceTotal(inv))}
    </div>`:''}

    <!-- Job costs -->
    <div id="job-costs"></div>

    <!-- Private notes -->
    ${sectionHead('Private Notes', '<span style="font-size:11px;font-weight:700;color:#a9c0e8">INTERNAL ONLY</span>')}
    <div class="card" style="${sectionCardStyle('12px')}">
      <textarea id="jd-private-notes" class="form-input" rows="2" placeholder="Add a private note about this job…" style="resize:vertical;min-height:44px" onchange="savePrivateNote('${jobId}')">${(j.notes||'').replace(/&/g,'&amp;').replace(/</g,'&lt;')}</textarea>
    </div>

    <!-- Tags + job lead source -->
    ${sectionHead('Tags &amp; Lead Source')}
    <div class="card" style="${sectionCardStyle('12px')}"><div id="jd-tags-src"></div></div>

    <!-- Photos section (very bottom of the main content) -->
    <div id="job-photos-section"></div>
    ${assignedSectionHTML(jobId)}

    <!-- Job info footer -->
    ${sectionHead('Job Info')}
    <div class="card" style="padding:0;${sectionCardStyle('12px')}">
      <div class="inv-row" style="padding:12px 14px"><span class="text-muted">Job ID</span><span style="background:var(--primary-lt);color:var(--primary);font-weight:700;font-size:12px;border-radius:8px;padding:4px 12px">#${(j.id||'').toString().slice(-6).toUpperCase()}</span></div>
      <div class="inv-row" style="padding:12px 14px;border:none"><span class="text-muted">Job Created</span><span style="font-weight:600;font-size:13px">${j.createdAt?new Date(j.createdAt).toLocaleString('en-US',{month:'2-digit',day:'2-digit',year:'numeric',hour:'numeric',minute:'2-digit'}):'—'}</span></div>
    </div>

    <button class="btn btn-secondary btn-full" style="margin-top:6px;border-radius:8px;color:var(--red)" onclick="deleteJobFromDetail('${jobId}')"><i class="ti ti-trash"></i> Delete Job</button>
  `;

  State.editingJob = jobId;
  openModal('modal-job-detail');

  // Start live timer display if running
  if ((timer && timer.running) || (getDriveTimer(jobId)||{}).running) startTimerDisplay(jobId);

  // Load photos and line items async
  setTimeout(() => {
    renderJobPhotos(jobId);
    if (!isDone) renderLineItems(jobId);
    renderJobCostsCard(jobId);
    renderJobTagsSrc(jobId);
  }, 100);
};

// ─── EMPLOYEE LOGIN SCREEN ───────────────────
function renderLoginScreen() {
  const employees = getEmployees();
  document.getElementById('login-body').innerHTML = `
    <div style="text-align:center;margin-bottom:24px">
      <div style="font-size:28px;font-weight:900;color:var(--primary)">Haul<span style="color:var(--text)">Pro</span></div>
      <div style="font-size:13px;color:var(--muted);margin-top:4px">Select your profile to continue</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px">
      ${employees.filter(e=>e.active).map(e=>`
        <button class="card" style="cursor:pointer;text-align:center;padding:18px 10px;border:none;font-family:inherit"
          onclick="selectEmployee('${e.id}')">
          <div style="width:52px;height:52px;border-radius:50%;background:${e.color};color:white;font-size:18px;font-weight:700;display:flex;align-items:center;justify-content:center;margin:0 auto 8px">
            ${e.initials}
          </div>
          <div style="font-size:13px;font-weight:700">${e.name.split(' ')[0]}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">${e.role}</div>
        </button>`).join('')}
    </div>`;
}

function selectEmployee(empId) {
  const emp = getEmployee(empId);
  if (!emp) return;
  document.getElementById('login-body').innerHTML = `
    <button onclick="renderLoginScreen()" style="background:none;border:none;color:var(--muted);cursor:pointer;margin-bottom:16px;font-size:13px;font-family:inherit">
      <i class="ti ti-arrow-left"></i> Back
    </button>
    <div style="text-align:center;margin-bottom:24px">
      <div style="width:64px;height:64px;border-radius:50%;background:${emp.color};color:white;font-size:22px;font-weight:700;display:flex;align-items:center;justify-content:center;margin:0 auto 10px">${emp.initials}</div>
      <div style="font-size:18px;font-weight:800">${emp.name}</div>
      <div style="font-size:12px;color:var(--muted);margin-top:2px">${emp.role}</div>
    </div>
    <div style="font-size:13px;font-weight:700;color:var(--muted);text-align:center;margin-bottom:12px">ENTER PIN</div>
    <div id="pin-display" style="display:flex;justify-content:center;gap:10px;margin-bottom:20px">
      ${[0,1,2,3].map(i=>`<div style="width:14px;height:14px;border-radius:50%;border:2px solid var(--border-md);background:transparent" id="pin-dot-${i}"></div>`).join('')}
    </div>
    <div id="pin-error" style="color:var(--red);font-size:12px;text-align:center;min-height:18px;margin-bottom:8px"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;max-width:240px;margin:0 auto">
      ${[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map(k=>`
        <button onclick="pinKey('${k}','${empId}')" style="height:56px;border-radius:10px;background:${k===''?'transparent':'var(--card)'};border:${k===''?'none':'1px solid var(--border)'};font-size:${k==='⌫'?'20px':'22px'};font-weight:700;cursor:${k===''?'default':'pointer'};font-family:inherit;color:var(--text)">${k}</button>
      `).join('')}
    </div>`;
  window._pinEntry = '';
}

let _pinEntry = '';
function pinKey(key, empId) {
  if (key === '') return;
  if (key === '⌫') {
    _pinEntry = _pinEntry.slice(0,-1);
  } else {
    if (_pinEntry.length >= 4) return;
    _pinEntry += key;
  }
  // Update dots
  for (let i=0;i<4;i++) {
    const dot = document.getElementById('pin-dot-'+i);
    if (dot) dot.style.background = i < _pinEntry.length ? 'var(--primary)' : 'transparent';
  }
  if (_pinEntry.length === 4) {
    const emp = getEmployee(empId);
    if (emp && _pinEntry === emp.pin) {
      DS.setCurrentEmployee(emp);
      closeModal('modal-login');
      _pinEntry = '';
      // Re-render team screen so clock in button appears immediately
      setTimeout(() => {
        if (document.getElementById('screen-team').classList.contains('active')) {
          renderTeamScreen();
        }
        toast(`<i class="ti ti-check" style="color:#4ade80"></i> Welcome, ${emp.name.split(' ')[0]}!`);
      }, 200);
    } else {
      document.getElementById('pin-error').textContent = 'Incorrect PIN — try again';
      _pinEntry = '';
      for (let i=0;i<4;i++) {
        const dot = document.getElementById('pin-dot-'+i);
        if (dot) dot.style.background = 'transparent';
      }
    }
  }
}

// ─── CLOCK IN / OUT ──────────────────────────
function openClockIn(empId) {
  const emp = getEmployee(empId || getCurrentEmployee()?.id);
  if (!emp) return;
  const todayEntries = getTimeEntries().filter(e => e.empId === emp.id && e.date === todayStr());
  const activeEntry  = todayEntries.find(e => e.clockIn && !e.clockOut && e.type !== 'lunch');
  const onLunch      = todayEntries.find(e => e.type === 'lunch' && e.clockIn && !e.clockOut);
  const totalMs      = todayEntries.filter(e => e.clockOut).reduce((s,e) => s + (new Date(e.clockOut) - new Date(e.clockIn)), 0);

  document.getElementById('clockin-body').innerHTML = `
    <div style="text-align:center;margin-bottom:20px">
      <div style="width:56px;height:56px;border-radius:50%;background:${emp.color};color:white;font-size:20px;font-weight:700;display:flex;align-items:center;justify-content:center;margin:0 auto 10px">${emp.initials}</div>
      <div style="font-size:18px;font-weight:800">${emp.name}</div>
      <div style="font-size:12px;color:var(--muted)">${new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}</div>
    </div>

    ${totalMs > 0 ? `<div class="card" style="text-align:center;margin-bottom:14px;background:var(--primary-lt)">
      <div style="font-size:11px;font-weight:700;color:var(--muted)">TODAY'S HOURS</div>
      <div style="font-size:28px;font-weight:900;color:var(--primary)">${fmtElapsed(totalMs)}</div>
    </div>` : ''}

    ${activeEntry ? `
      <div class="info-banner" style="margin-bottom:14px"><i class="ti ti-clock"></i><p>Clocked in at <strong>${new Date(activeEntry.clockIn).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}</strong></p></div>
      <button class="btn btn-orange btn-full" style="margin-bottom:8px" onclick="clockOut('${emp.id}','lunch')"><i class="ti ti-coffee"></i> Clock Out for Lunch</button>
      <button class="btn btn-red btn-full" onclick="clockOut('${emp.id}','day')"><i class="ti ti-door-exit"></i> Clock Out for Day</button>
    ` : onLunch ? `
      <div class="warn-banner" style="margin-bottom:14px"><i class="ti ti-coffee"></i><p>On lunch since <strong>${new Date(onLunch.clockIn).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}</strong></p></div>
      <button class="btn btn-green btn-full" onclick="clockIn('${emp.id}')"><i class="ti ti-player-play"></i> Clock Back In</button>
    ` : `
      <button class="btn btn-green btn-full" onclick="clockIn('${emp.id}')"><i class="ti ti-player-play"></i> Clock In</button>
    `}
  `;
  openModal('modal-clockin');
}

// ─── Clock-in/out location (admin setting; required for techs when on) ───
function clockGeoOn() { return !!DS.get('clock_geo', false); }
async function setClockGeo(on) {
  DS.set('clock_geo', !!on);
  if (window._useCloud && window.CloudDS) { try { await CloudDS.saveOrgSettings({ clock_geo: !!on }); } catch (e) {} }
  toast(on ? '<i class="ti ti-map-pin" style="color:#4ade80"></i> Clock location recording is ON' : 'Clock location recording is off');
  if (typeof State !== 'undefined' && State.screen === 'settings') renderSettings();
}
// Resolve current GPS position, or null on denial/timeout/unsupported.
function captureClockLoc() {
  return new Promise(resolve => {
    if (!navigator.geolocation) { resolve(null); return; }
    let done = false;
    const finish = v => { if (!done) { done = true; resolve(v); } };
    const t = setTimeout(() => finish(null), 9000);
    navigator.geolocation.getCurrentPosition(
      pos => { clearTimeout(t); finish({ lat: +pos.coords.latitude.toFixed(6), lng: +pos.coords.longitude.toFixed(6) }); },
      ()  => { clearTimeout(t); finish(null); },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 120000 }
    );
  });
}
// Static-map thumbnail for a punch (green=in, red=out) linking to Google Maps.
function punchMapImg(e) {
  const k = window.GOOGLE_MAPS_KEY; if (!k) return '';
  const mk = [];
  if (e.inLat != null && e.inLng != null)   mk.push(`markers=color:green%7Clabel:I%7C${e.inLat},${e.inLng}`);
  if (e.outLat != null && e.outLng != null) mk.push(`markers=color:red%7Clabel:O%7C${e.outLat},${e.outLng}`);
  if (!mk.length) return '';
  const url  = `https://maps.googleapis.com/maps/api/staticmap?size=320x130&scale=2&${mk.join('&')}&key=${k}`;
  const at   = e.inLat != null ? `${e.inLat},${e.inLng}` : `${e.outLat},${e.outLng}`;
  return `<a href="https://maps.google.com/?q=${at}" target="_blank" rel="noopener" style="display:block;margin-top:6px">
    <img src="${url}" alt="Clock location" style="width:100%;border-radius:8px;border:1px solid var(--border);display:block" loading="lazy">
  </a>`;
}

// Generic launch-time location gate (shown to techs when location recording is on).
// Framed as an app requirement — does NOT mention clock tracking.
async function maybeRequireLocation() {
  try {
    if (typeof myRole === 'function' && myRole() !== 'tech') return;
    if (!clockGeoOn()) { const g=document.getElementById('loc-gate'); if(g) g.remove(); return; }
    let state = 'prompt';
    if (navigator.permissions && navigator.permissions.query) {
      try { const r = await navigator.permissions.query({ name: 'geolocation' }); state = r.state; } catch(e){}
    }
    if (state === 'granted') { const g=document.getElementById('loc-gate'); if(g) g.remove(); return; }
    showLocationGate(state);
  } catch(e){}
}
function showLocationGate(state) {
  let el = document.getElementById('loc-gate'); if (el) el.remove();
  el = document.createElement('div'); el.id = 'loc-gate';
  el.style.cssText = 'position:fixed;inset:0;z-index:99999;background:var(--bg,#f5f7fb);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:30px;text-align:center';
  const denied = state === 'denied';
  el.innerHTML = `
    <div style="width:66px;height:66px;border-radius:18px;background:var(--primary-lt,#eef2ff);display:flex;align-items:center;justify-content:center;margin-bottom:18px"><i class="ti ti-map-pin" style="font-size:34px;color:var(--primary,#1a6fdb)"></i></div>
    <div style="font-size:22px;font-weight:800;margin-bottom:8px">Location required</div>
    <div style="font-size:14px;color:var(--muted,#667085);max-width:300px;line-height:1.5;margin-bottom:22px">This app needs location access to work. Please turn on location to continue.</div>
    ${ denied
      ? `<div style="font-size:13px;color:var(--muted,#667085);max-width:300px;line-height:1.5">Location is currently blocked for this site. Open your browser's site settings (tap the lock/▾ icon by the address bar, or phone Settings → this site) and allow <b>Location</b>, then reopen the app.</div>`
      : `<button class="btn btn-primary" style="font-weight:800;padding:12px 30px" onclick="requestLocationGate()"><i class="ti ti-map-pin"></i> Enable location</button>` }
  `;
  document.body.appendChild(el);
}
async function requestLocationGate() {
  const loc = await captureClockLoc();
  if (loc) { const el = document.getElementById('loc-gate'); if (el) el.remove(); }
  else { showLocationGate('denied'); }
}

// Day report: a single employee's punches for one day, each with a live, pannable map.
function dayMapBlock(e) {
  const hasLoc = (e.inLat != null || e.outLat != null);
  if (!hasLoc) return `<div style="font-size:12px;color:var(--hint);padding:6px 0"><i class="ti ti-map-pin-off"></i> No location recorded for this punch.</div>`;
  // Coordinates we have, shown as a fallback line regardless.
  const coord = e.inLat != null ? `${e.inLat}, ${e.inLng}` : `${e.outLat}, ${e.outLng}`;
  if (!window.GOOGLE_MAPS_KEY) {
    return `<div style="font-size:12px;color:var(--muted);padding:8px 10px;background:var(--bg);border-radius:8px;line-height:1.5">
      <i class="ti ti-map-pin" style="color:#16a34a"></i> Location captured (${coord}).<br>
      <span style="color:var(--hint)">Add a Google Maps API key in Settings → API to see this on a map.</span>
    </div>`;
  }
  const legend = [];
  if (e.inLat != null)  legend.push('<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;color:var(--muted)"><span style="width:10px;height:10px;border-radius:50%;background:#16a34a;display:inline-block"></span> Clock-in</span>');
  if (e.outLat != null) legend.push('<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;color:var(--muted)"><span style="width:10px;height:10px;border-radius:50%;background:#dc2626;display:inline-block"></span> Clock-out</span>');
  return `
    <div id="daymap-${e.id}" style="width:100%;height:240px;border-radius:10px;border:1px solid var(--border);background:var(--bg);margin:8px 0;background-size:cover;background-position:center"></div>
    <div style="display:flex;gap:14px;margin-bottom:2px">${legend.join('')}</div>`;
}
function _dayMapStaticFallback(e) {
  const el = document.getElementById('daymap-' + e.id); if (!el || el.dataset.done) return;
  const k = window.GOOGLE_MAPS_KEY; if (!k) return;
  const mk = [];
  if (e.inLat != null)  mk.push(`markers=color:green%7Clabel:I%7C${e.inLat},${e.inLng}`);
  if (e.outLat != null) mk.push(`markers=color:red%7Clabel:O%7C${e.outLat},${e.outLng}`);
  if (mk.length) el.style.backgroundImage = `url(https://maps.googleapis.com/maps/api/staticmap?size=600x280&scale=2&${mk.join('&')}&key=${k})`;
}
function initDayReportMaps(day, attempt) {
  attempt = attempt || 0;
  const ready = !!(window.google && google.maps && google.maps.Map);
  if (!ready) {
    day.forEach(e => { if (e.inLat != null || e.outLat != null) _dayMapStaticFallback(e); }); // show something now
    if (attempt < 8) setTimeout(() => initDayReportMaps(day, attempt + 1), 700);              // upgrade to interactive when ready
    return;
  }
  day.forEach(e => {
    if (e.inLat == null && e.outLat == null) return;
    const el = document.getElementById('daymap-' + e.id);
    if (!el || el.dataset.done) return;
    el.dataset.done = '1';
    el.style.backgroundImage = '';
    const map = new google.maps.Map(el, { zoom: 16, mapTypeControl: false, streetViewControl: false, fullscreenControl: true, gestureHandling: 'greedy' });
    const pts = [];
    if (e.inLat != null)  { const pos = { lat: e.inLat,  lng: e.inLng };  pts.push(pos); new google.maps.Marker({ position: pos, map, icon: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png', title: 'Clock-in' }); }
    if (e.outLat != null) { const pos = { lat: e.outLat, lng: e.outLng }; pts.push(pos); new google.maps.Marker({ position: pos, map, icon: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',   title: 'Clock-out' }); }
    const fit = () => {
      if (pts.length > 1) { const b = new google.maps.LatLngBounds(); pts.forEach(p => b.extend(p)); map.fitBounds(b, 50); }
      else { map.setCenter(pts[0]); map.setZoom(16); }
    };
    fit();
    // Re-draw after the sheet finishes laying out (dynamic containers often render blank otherwise).
    setTimeout(() => { try { google.maps.event.trigger(map, 'resize'); fit(); } catch(_) {} }, 300);
    setTimeout(() => { try { google.maps.event.trigger(map, 'resize'); fit(); } catch(_) {} }, 900);
  });
}
function openDayReport(empId, ds) {
  let emp = getEmployees().find(e => e.id === empId);
  if (!emp) { const isMe = (window.Auth && Auth.userId === empId); emp = { id:empId, name: isMe ? ((getProfile().name)||'You') : 'Team member', role:'' }; }
  const day = getTimeEntries().filter(e => e.empId === empId && e.type !== 'lunch' && e.date === ds)
    .sort((a,b) => new Date(a.clockIn) - new Date(b.clockIn));
  const totalMs = day.reduce((s,e) => s + (e.clockOut ? (new Date(e.clockOut) - new Date(e.clockIn)) : 0), 0);
  const dlabel = new Date(ds + 'T12:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
  const body = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
      <div style="font-size:18px;font-weight:800">${emp.name}</div>
      <button onclick="closeDyn('day-report')" style="background:none;border:none;font-size:22px;color:var(--hint);cursor:pointer;line-height:1">×</button>
    </div>
    <div style="font-size:13px;color:var(--muted);margin-bottom:14px">${dlabel} · ${fmtElapsed(totalMs)} total</div>
    ${ day.length ? day.map(e => {
      const inT  = new Date(e.clockIn).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
      const outT = e.clockOut ? new Date(e.clockOut).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}) : 'ongoing';
      const dur  = e.clockOut ? fmtElapsed(new Date(e.clockOut) - new Date(e.clockIn)) : '—';
      return `<div class="card" style="margin-bottom:10px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
          <div style="font-weight:700;font-size:14px">${inT} → ${outT}</div>
          <div style="font-size:13px;font-weight:700;color:var(--primary)">${dur}</div>
        </div>
        ${ dayMapBlock(e) }
      </div>`;
    }).join('') : '<div style="text-align:center;color:var(--muted);padding:24px">No punches this day.</div>' }
  `;
  dynSheet('day-report', body, 240);
  initDayReportMaps(day);
}
// Attribute the owner's login-id punches to their employee record (run once when linked).
function relinkOwnerPunches(fromId, toId) {
  if (!fromId || !toId || fromId === toId) return;
  const ents = getTimeEntries(); let changed = false;
  ents.forEach(e => { if (e.empId === fromId) { e.empId = toId; changed = true; if (window._useCloud && window.CloudDS && CloudDS.saveTimeEntry) CloudDS.saveTimeEntry(e).catch(()=>{}); } });
  if (changed) DS.set('time_entries', ents);
}

async function clockIn(empId) {
  let loc = null;
  if (clockGeoOn()) { try { loc = await captureClockLoc(); } catch(e){} }   // silent — gate handles enforcement
  const entry = { id:newId('te'), empId, date:todayStr(), clockIn:new Date().toISOString(), clockOut:null, type:'work' };
  if (loc) { entry.inLat = loc.lat; entry.inLng = loc.lng; }
  saveTimeEntry(entry);
  renderScreen(State.screen);
  toast(`<i class="ti ti-check" style="color:#4ade80"></i> Clocked in — ${new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}`);
}

async function clockOut(empId, type) {
  const entries = getTimeEntries();
  const active  = entries.find(e => e.empId === empId && e.clockIn && !e.clockOut);
  if (!active) return;
  let loc = null;
  if (clockGeoOn()) { try { loc = await captureClockLoc(); } catch(e){} }   // silent — gate handles enforcement
  if (type === 'lunch') {
    active.clockOut = new Date().toISOString();
    active.type = 'work';
    if (loc) { active.outLat = loc.lat; active.outLng = loc.lng; }
    saveTimeEntry(active);
    // Start lunch entry
    saveTimeEntry({ id:newId('te'), empId, date:todayStr(), clockIn:new Date().toISOString(), clockOut:null, type:'lunch' });
    renderScreen(State.screen);
    toast('<i class="ti ti-coffee" style="color:#f9c74f"></i> Clocked out for lunch — enjoy!');
  } else {
    active.clockOut = new Date().toISOString();
    active.type = 'work';
    if (loc) { active.outLat = loc.lat; active.outLng = loc.lng; }
    saveTimeEntry(active);
    // Also close any lunch entry
    const lunch = entries.find(e => e.empId === empId && e.type === 'lunch' && !e.clockOut);
    if (lunch) { lunch.clockOut = new Date().toISOString(); saveTimeEntry(lunch); }
    renderScreen(State.screen);
    const emp = getEmployee(empId);
    toast(`<i class="ti ti-door-exit" style="color:#4ade80"></i> ${emp?emp.name.split(' ')[0]:'Employee'} clocked out. See you tomorrow!`);
  }
}




// ─── TIMESHEETS SCREEN ───────────────────────
async function renderTimesheets() {
  const employees = window._useCloud ? await CloudDS.getEmployees() : getEmployees();
  const entries   = getTimeEntries();
  const today     = new Date();

  // Build Sun–Sat week (current week), anchored at local midnight Sunday
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - today.getDay()); // back to Sunday
  sunday.setHours(0,0,0,0);                          // local midnight (so today's punches aren't filtered out)
  const days = Array.from({length:7}, (_,i) => {
    const d = new Date(sunday); d.setDate(sunday.getDate() + i);
    return d;
  });
  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  document.getElementById('timesheets-body').innerHTML = (myRole()==='tech') ? `
    <div style="text-align:center;padding:30px 16px;color:var(--muted)">
      <i class="ti ti-clock" style="font-size:28px;display:block;margin-bottom:8px;color:var(--hint)"></i>
      <div style="font-size:13px">Use the card above to clock in and out.</div>
    </div>` : `
    <div class="section-label">This Week</div>
    ${(() => {
      // Show everyone who clocked in this week, including the owner/admin whose
      // punches are filed under their login id rather than an employee seat.
      const shownIds = new Set(employees.filter(e=>e.active).map(e=>e.id));
      const wkMs = sunday.getTime();
      const orphanIds = [...new Set(entries.filter(e => e.empId && !shownIds.has(e.empId) && new Date(e.clockIn).getTime() >= wkMs).map(e => e.empId))];
      const prof = getProfile();
      const orphanEmps = orphanIds.map(id => {
        const isMe = (window.Auth && Auth.userId === id);
        let nm = isMe ? (prof.firstName ? (prof.firstName + (prof.lastName ? ' ' + prof.lastName : '')) : (prof.name || 'You')) : 'Team member';
        nm = (nm || 'You').trim();
        return { id, name: nm, initials: (nm.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() || 'YO'), color:'#64748b', role:(window.MY_ROLE||'admin'), active:true, _orphan:true };
      });
      const renderEmps = [...employees.filter(e=>e.active), ...orphanEmps];
      return renderEmps.map(emp => {
      const empEntries = entries.filter(e => e.empId === emp.id && e.clockOut);
      const weekMs = empEntries.filter(e => {
        const d = new Date(e.clockIn);
        const diff = (today - d) / 86400000;
        return diff <= 7 && e.type !== 'lunch';
      }).reduce((s,e) => s + (new Date(e.clockOut) - new Date(e.clockIn)), 0);
      const canOpen = (myRole()==='admin' && !emp._orphan);

      return `<div class="card" style="margin-bottom:10px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px${ canOpen ? ';cursor:pointer' : '' }" ${ canOpen ? `onclick="openEmployeeProfile('${emp.id}')"` : '' }>
          <div style="width:38px;height:38px;border-radius:50%;background:${emp.color};color:white;font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center">${emp.initials}</div>
          <div style="flex:1"><div style="font-weight:700">${emp.name}${emp._orphan?' <span style="font-size:10px;color:var(--hint);font-weight:600">(owner)</span>':''}</div><div class="text-sm text-muted">${(ROLES[emp.role]||{}).name || emp.role}</div></div>
          <div style="text-align:right"><div style="font-size:18px;font-weight:800;color:var(--primary)">${fmtElapsed(weekMs)}</div><div class="text-sm text-muted">this week</div></div>
          ${ canOpen ? `<i class="ti ti-chevron-right" style="color:var(--hint);font-size:18px"></i>` : '' }
        </div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px">
          ${days.map(d => {
            const ds = toISO(d);
            const dayMs = empEntries.filter(e => e.date === ds && e.type !== 'lunch')
              .reduce((s,e) => s + (new Date(e.clockOut) - new Date(e.clockIn)), 0);
            const hrs = dayMs / 3600000;
            const isToday = ds === todayStr();
            return `<div style="text-align:center${hrs>0?';cursor:pointer':''}" ${hrs>0?`onclick="openDayReport('${emp.id}','${ds}')"`:''}>
              <div style="font-size:9px;font-weight:700;color:var(--hint)">${dayNames[d.getDay()]}</div>
              <div style="font-size:10px;font-weight:700;color:${isToday?'var(--primary)':'var(--text)'}">${d.getDate()}</div>
              <div style="height:32px;background:${hrs>0?`rgba(26,111,219,${Math.min(0.9,hrs/8*0.8+0.2)})`:'var(--bg)'};border-radius:5px;margin-top:3px;display:flex;align-items:center;justify-content:center">
                <span style="font-size:9px;font-weight:700;color:${hrs>0?'white':'var(--hint)'}">${hrs>0?hrs.toFixed(1):''}</span>
              </div>
            </div>`;
          }).join('')}
        </div>
        <div style="margin-top:10px">
          ${entries.filter(e => e.empId === emp.id && e.type !== 'lunch' && new Date(e.clockIn) >= days[0])
            .sort((a,b) => new Date(b.clockIn) - new Date(a.clockIn))
            .map(e => {
              const inT  = new Date(e.clockIn).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
              const outT = e.clockOut ? new Date(e.clockOut).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}) : 'ongoing';
              const dl   = new Date(e.clockIn).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
              const hasLoc = (e.inLat != null || e.outLat != null);
              const pin = hasLoc ? '<i class="ti ti-map-pin" style="color:#16a34a;font-size:14px"></i>' : (clockGeoOn() ? '<span style="font-size:10px;color:var(--hint)">no loc</span>' : '');
              return `<div onclick="openDayReport('${emp.id}','${e.date}')" style="padding:8px 0;border-bottom:0.5px solid var(--border);cursor:pointer;display:flex;align-items:center;gap:8px">
                <div style="flex:1;font-size:11px;color:var(--muted)">⏱ ${dl}: ${inT} → ${outT}</div>
                ${pin}
                <i class="ti ti-chevron-right" style="color:var(--hint);font-size:14px"></i>
              </div>`;
            }).join('') || '<div style="font-size:11px;color:var(--hint)">No punches this week</div>'}
        </div>
      </div>`;
    }).join('');
    })()}
    ${ myRole()==='admin' ? `
    <div style="margin-top:14px;padding:14px;background:white;border:1px solid var(--border);border-radius:12px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div>
          <div style="font-weight:700;font-size:14px">${currentPlan().name} plan</div>
          <div style="font-size:12px;color:var(--muted)">${employees.filter(e=>e.active).length} of ${maxEmployeesFor()} employee seats used</div>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="openUpgradeModal()"><i class="ti ti-settings"></i> Manage</button>
      </div>
      <button class="btn btn-primary btn-full" onclick="openOnboarding()"><i class="ti ti-user-plus"></i> Add Employee</button>
    </div>` : '' }
  `;
}

// ─── ADD EMPLOYEE ────────────────────────────
function saveEmployeeForm() {
  const name = document.getElementById('ef-name').value.trim();
  const pin  = document.getElementById('ef-pin').value.trim();
  if (!name || pin.length !== 4) { toast('⚠️ Name and 4-digit PIN required'); return; }
  const emp = {
    id:       DS.newId('e'),
    name,
    role:     document.getElementById('ef-role').value,
    pin,
    color:    ['#1a6fdb','#1a8a4a','#e07b10','#6b4fcf','#d03030'][getEmployees().length % 5],
    initials: name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase(),
    active:   true,
  };
  // Use cloud-aware save
  saveEmployeeFormCloud();
  return; // saveEmployeeFormCloud handles the rest
}

// ─── TEAM SCREEN ENTRY ───────────────────────
async function renderTeamScreen() {
  // Clock in/out lives only on the dashboard now — no hero here.
  const banner = document.getElementById('current-employee-banner');
  if (banner) banner.innerHTML = '';

  await renderTimesheets();
}

function openLoginModal() {
  seedEmployees();
  renderLoginScreen();
  openModal('modal-login');
}

// ═══════════════════════════════════════════════
//  CLIENT TAGS, LEAD SOURCES & REPORTS
// ═══════════════════════════════════════════════

// ─── LEAD SOURCES ────────────────────────────
const DEFAULT_LEAD_SOURCES = ['Google My Business','Google Ads','Facebook','Referral','Repeat Customer','Door Hanger','Yard Sign','Nextdoor','Other'];

function getLeadSources() {
  // Check profile for custom sources first
  const p = getProfile();
  if (p.customLeadSources && p.customLeadSources.length > DEFAULT_LEAD_SOURCES.length) {
    return p.customLeadSources;
  }
  return DS.get('lead_sources', DEFAULT_LEAD_SOURCES);
}

function saveLeadSources(sources) {
  DS.set('lead_sources', sources);
}

function addNewLeadSource() {
  const input = document.getElementById('cf-new-lead');
  const val   = input?.value.trim();
  if (!val) { toast('⚠️ Type a lead source name first'); return; }
  const sources = getLeadSources();
  if (sources.map(s=>s.toLowerCase()).includes(val.toLowerCase())) {
    toast('⚠️ Already exists');
    // Still select it
    populateLeadSourceDropdown(val);
    input.value = '';
    return;
  }
  sources.push(val);
  saveLeadSources(sources);
  // Also save to profile settings so it persists across sessions
  const p = getProfile();
  p.customLeadSources = sources;
  saveProfile(p);
  input.value = '';
  populateLeadSourceDropdown(val);
  toast(`<i class="ti ti-check" style="color:#4ade80"></i> "${val}" saved to lead sources`);
}

function populateLeadSourceDropdown(selectValue) {
  const sel = document.getElementById('cf-lead-source');
  if (!sel) return;
  const sources = getLeadSources();
  sel.innerHTML = `<option value="">Select lead source...</option>` +
    sources.map(s => `<option value="${s}" ${s===selectValue?'selected':''}>${s}</option>`).join('');
}

function selectClientType(type) {
  document.getElementById('cf-client-type').value = type;
  const res = document.getElementById('ct-residential');
  const com = document.getElementById('ct-commercial');
  if (!res || !com) return;
  if (type === 'residential') {
    res.className = 'btn btn-primary';
    com.className = 'btn btn-secondary';
  } else {
    res.className = 'btn btn-secondary';
    com.className = 'btn btn-primary';
  }
}

// ─── REPORT DATE RANGE STATE ─────────────────
const ReportState = {
  range: 'month', // month | year | all | custom
  from:  null,
  to:    null,
};

function setReportRange(range) {
  ReportState.range = range;
  // Update button styles
  ['month','year','all','custom'].forEach(r => {
    const btn = document.getElementById('rpt-btn-'+r);
    if (btn) btn.className = 'btn btn-sm ' + (r===range?'btn-primary':'btn-secondary');
  });
  // Show/hide custom date inputs
  const customDates = document.getElementById('rpt-custom-dates');
  if (customDates) customDates.style.display = range==='custom' ? 'grid' : 'none';
  renderReports();
}

function getReportDateRange() {
  const now   = new Date();
  const today = now.toISOString().slice(0,10);
  switch(ReportState.range) {
    case 'month': {
      const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10);
      return { from, to: today, label: now.toLocaleDateString('en-US',{month:'long',year:'numeric'}) };
    }
    case 'year': {
      const from = `${now.getFullYear()}-01-01`;
      return { from, to: today, label: `Year ${now.getFullYear()}` };
    }
    case 'all': {
      return { from: '2000-01-01', to: today, label: 'All Time' };
    }
    case 'custom': {
      const from = document.getElementById('rpt-date-from')?.value || '2000-01-01';
      const to   = document.getElementById('rpt-date-to')?.value   || today;
      if (!from || !to) return { from: '2000-01-01', to: today, label: 'All Time' };
      return { from, to, label: `${fmtDate(from)} – ${fmtDate(to)}` };
    }
    default: return { from: '2000-01-01', to: today, label: 'All Time' };
  }
}

function jobInRange(job, from, to) {
  return job.date >= from && job.date <= to;
}

// ─── REPORTS SCREEN ──────────────────────────
function renderReports() {
  // Paywall gate — Reports is a paid add-on.
  const pad = document.querySelector('#screen-reports .screen-pad');
  const pw  = document.getElementById('rpt-paywall');
  if (!reportsEnabled()) {
    if (pw) {
      pw.style.display = 'block';
      pw.innerHTML = `<div class="screen-title">Reports</div>
        <div style="position:relative;border-radius:14px;overflow:hidden;min-height:340px">
          <div style="filter:blur(3px);opacity:0.55;pointer-events:none">${reportsPreviewInner()}</div>
          ${reportsLockOverlayHTML()}
        </div>`;
    }
    if (pad) Array.from(pad.children).forEach(ch => { if (ch.id !== 'rpt-paywall') ch.style.display = 'none'; });
    return;
  }
  if (pw) pw.style.display = 'none';
  if (pad) Array.from(pad.children).forEach(ch => { if (ch.id !== 'rpt-paywall') ch.style.display = ''; });

  const { from, to, label } = getReportDateRange();
  const allJobs     = getJobs();
  const customers   = getCustomers();

  // Update range label
  const labelEl = document.getElementById('rpt-range-label');
  if (labelEl) labelEl.textContent = `Showing: ${label}`;

  // Filter jobs to date range
  const jobs = allJobs.filter(j => jobInRange(j, from, to));

  // ── Job Status Buckets ──
  const doneJobs      = jobs.filter(j => j.status === 'done');
  const cancelledJobs = jobs.filter(j => j.status === 'cancelled');
  const didNotGoJobs  = jobs.filter(j => j.status === 'didnotgo');
  const scheduledJobs = jobs.filter(j => j.status === 'scheduled' || j.status === 'inprogress');
  const closedJobs    = [...doneJobs, ...didNotGoJobs];

  // ── Revenue (completed jobs only) ──
  const totalRev = doneJobs.reduce((s,j) => s + (j.price||0), 0);
  const avgJob   = doneJobs.length ? Math.round(totalRev / doneJobs.length) : 0;

  // ── Close Rate ──
  const closeRatePct = closedJobs.length ? Math.round((doneJobs.length / closedJobs.length) * 100) : 0;
  const didNotGoPct  = closedJobs.length ? Math.round((didNotGoJobs.length / closedJobs.length) * 100) : 0;

  // ── Cancellation Rate ──
  const allFinished   = doneJobs.length + cancelledJobs.length + didNotGoJobs.length;
  const cancelRatePct = allFinished ? Math.round((cancelledJobs.length / allFinished) * 100) : 0;

  // ── Client Type (completed jobs only) ──
  const doneCustomerIds = [...new Set(doneJobs.map(j => j.customerId))];
  const doneCustomers   = doneCustomerIds.map(id => getCustomer(id)).filter(Boolean);
  const residential     = doneCustomers.filter(c => c.clientType !== 'commercial').length;
  const commercial      = doneCustomers.filter(c => c.clientType === 'commercial').length;
  const totalTypes      = doneCustomers.length || 1;
  const resPct          = Math.round((residential / totalTypes) * 100);
  const comPct          = Math.round((commercial  / totalTypes) * 100);

  // ── Lead Source (completed jobs only) ──
  const leadCounts = {};
  doneCustomers.forEach(c => {
    const src = c.leadSource || 'Unknown';
    leadCounts[src] = (leadCounts[src] || 0) + 1;
  });
  const leadEntries = Object.entries(leadCounts).sort((a,b) => b[1]-a[1]);
  const totalLeads  = doneCustomers.length || 1;

  // Colors for pie charts
  const pieColors = ['#1a6fdb','#1a8a4a','#e07b10','#6b4fcf','#d03030','#0891b2','#be185d','#854d0e'];

  document.getElementById('reports-body').innerHTML = `

    <!-- Summary Stats -->
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-label">Jobs Completed</div><div class="stat-value">${doneJobs.length}</div></div>
      <div class="stat-card"><div class="stat-label">Total Revenue</div><div class="stat-value">${fmtMoney(totalRev)}</div></div>
      <div class="stat-card"><div class="stat-label">Avg Job Value</div><div class="stat-value">${fmtMoney(avgJob)}</div></div>
      <div class="stat-card"><div class="stat-label">Total Customers</div><div class="stat-value">${customers.length}</div></div>
    </div>

    <!-- Close Rate Report -->
    <div class="section-label">Close Rate</div>
    <div class="card">
      <div style="font-size:11px;color:var(--muted);margin-bottom:12px">Completed jobs vs. Did Not Go Through (quoted but not sold)</div>
      <div style="display:flex;align-items:center;gap:20px">
        <svg viewBox="0 0 100 100" style="width:110px;height:110px;flex-shrink:0">
          ${buildPieSlices([
            { value: closeRatePct, color: 'var(--green)' },
            { value: didNotGoPct,  color: '#d03030' },
          ])}
          <circle cx="50" cy="50" r="28" fill="white"/>
          <text x="50" y="46" text-anchor="middle" style="font-size:12px;font-weight:800;fill:var(--green)">${closeRatePct}%</text>
          <text x="50" y="57" text-anchor="middle" style="font-size:7px;fill:#666">close rate</text>
        </svg>
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
            <div style="width:12px;height:12px;border-radius:3px;background:var(--green);flex-shrink:0"></div>
            <div style="flex:1"><div style="font-weight:700">Completed</div><div class="text-sm text-muted">${doneJobs.length} jobs</div></div>
            <div style="font-size:20px;font-weight:800;color:var(--green)">${closeRatePct}%</div>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:12px;height:12px;border-radius:3px;background:#d03030;flex-shrink:0"></div>
            <div style="flex:1"><div style="font-weight:700">Did Not Go</div><div class="text-sm text-muted">${didNotGoJobs.length} jobs</div></div>
            <div style="font-size:20px;font-weight:800;color:#d03030">${didNotGoPct}%</div>
          </div>
          ${closedJobs.length===0?'<div class="text-sm text-muted" style="margin-top:8px">No data yet</div>':''}
        </div>
      </div>
    </div>

    <!-- Cancellation Rate -->
    <div class="section-label">Cancellation Rate</div>
    <div class="card">
      <div style="font-size:11px;color:var(--muted);margin-bottom:12px">Cancelled jobs out of all finished jobs</div>
      <div style="display:flex;align-items:center;gap:20px">
        <svg viewBox="0 0 100 100" style="width:110px;height:110px;flex-shrink:0">
          ${buildPieSlices([
            { value: 100-cancelRatePct, color: 'var(--primary)' },
            { value: cancelRatePct,     color: '#e07b10' },
          ])}
          <circle cx="50" cy="50" r="28" fill="white"/>
          <text x="50" y="46" text-anchor="middle" style="font-size:12px;font-weight:800;fill:var(--primary)">${100-cancelRatePct}%</text>
          <text x="50" y="57" text-anchor="middle" style="font-size:7px;fill:#666">completed</text>
        </svg>
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
            <div style="width:12px;height:12px;border-radius:3px;background:var(--primary);flex-shrink:0"></div>
            <div style="flex:1"><div style="font-weight:700">Completed</div><div class="text-sm text-muted">${doneJobs.length} jobs</div></div>
            <div style="font-size:20px;font-weight:800;color:var(--primary)">${100-cancelRatePct}%</div>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:12px;height:12px;border-radius:3px;background:#e07b10;flex-shrink:0"></div>
            <div style="flex:1"><div style="font-weight:700">Cancelled</div><div class="text-sm text-muted">${cancelledJobs.length} jobs</div></div>
            <div style="font-size:20px;font-weight:800;color:#e07b10">${cancelRatePct}%</div>
          </div>
          <div style="margin-top:8px;padding:8px;background:var(--bg);border-radius:8px">
            <div class="text-sm text-muted">${scheduledJobs.length} job${scheduledJobs.length!==1?'s':''} currently scheduled/in progress</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Client Type Pie (completed jobs only) -->
    <div class="section-label">Client Type — Completed Jobs Only</div>
    <div class="card">
      <div style="display:flex;align-items:center;gap:20px">
        <!-- SVG Pie Chart -->
        <svg viewBox="0 0 100 100" style="width:120px;height:120px;flex-shrink:0">
          ${buildPieSlices([
            { value: resPct,  color: '#1a6fdb' },
            { value: comPct,  color: '#e07b10' },
          ])}
          <circle cx="50" cy="50" r="28" fill="white"/>
          <text x="50" y="46" text-anchor="middle" style="font-size:10px;font-weight:700;fill:#1a1f2e">${customers.length}</text>
          <text x="50" y="57" text-anchor="middle" style="font-size:7px;fill:#666">total</text>
        </svg>
        <!-- Legend -->
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
            <div style="width:12px;height:12px;border-radius:3px;background:#1a6fdb;flex-shrink:0"></div>
            <div style="flex:1">
              <div style="font-weight:700">Residential</div>
              <div class="text-sm text-muted">${residential} customers</div>
            </div>
            <div style="font-size:20px;font-weight:800;color:#1a6fdb">${resPct}%</div>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:12px;height:12px;border-radius:3px;background:#e07b10;flex-shrink:0"></div>
            <div style="flex:1">
              <div style="font-weight:700">Commercial</div>
              <div class="text-sm text-muted">${commercial} customers</div>
            </div>
            <div style="font-size:20px;font-weight:800;color:#e07b10">${comPct}%</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Lead Source Pie -->
    <div class="section-label">Lead Source — Completed Jobs Only</div>
    <div class="card">
      <div style="display:flex;align-items:center;gap:20px;margin-bottom:14px">
        <svg viewBox="0 0 100 100" style="width:120px;height:120px;flex-shrink:0">
          ${buildPieSlices(leadEntries.map((e,i) => ({
            value: Math.round((e[1]/totalLeads)*100),
            color: pieColors[i % pieColors.length],
          })))}
          <circle cx="50" cy="50" r="28" fill="white"/>
          <text x="50" y="46" text-anchor="middle" style="font-size:10px;font-weight:700;fill:#1a1f2e">${totalLeads}</text>
          <text x="50" y="57" text-anchor="middle" style="font-size:7px;fill:#666">leads</text>
        </svg>
        <div style="flex:1">
          ${leadEntries.map((e,i) => {
            const pct = Math.round((e[1]/totalLeads)*100);
            const color = pieColors[i % pieColors.length];
            return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
              <div style="width:10px;height:10px;border-radius:2px;background:${color};flex-shrink:0"></div>
              <div style="flex:1;font-size:12px;font-weight:600">${e[0]}</div>
              <div style="font-size:12px;font-weight:700;color:${color}">${pct}%</div>
              <div class="text-sm text-muted">(${e[1]})</div>
            </div>`;
          }).join('')}
        </div>
      </div>
      ${leadEntries.length === 0 ? '<div class="text-sm text-muted" style="text-align:center;padding:12px">No lead source data yet — add lead sources when creating customers</div>' : ''}
    </div>

    <!-- Bar chart: Jobs by month -->
    <div class="section-label">Jobs This Month by Day</div>
    <div class="card">
      ${buildJobsBarChart(jobs)}
    </div>
  `;
}

// ─── PIE CHART BUILDER ───────────────────────
function buildPieSlices(segments) {
  const total = segments.reduce((s,seg) => s + seg.value, 0);
  if (!total) return `<circle cx="50" cy="50" r="40" fill="#f0f2f5"/>`;

  let currentAngle = -90; // Start from top
  return segments.map(seg => {
    if (!seg.value) return '';
    const sliceAngle = (seg.value / total) * 360;
    const startRad   = (currentAngle * Math.PI) / 180;
    const endRad     = ((currentAngle + sliceAngle) * Math.PI) / 180;
    const x1 = 50 + 40 * Math.cos(startRad);
    const y1 = 50 + 40 * Math.sin(startRad);
    const x2 = 50 + 40 * Math.cos(endRad);
    const y2 = 50 + 40 * Math.sin(endRad);
    const largeArc = sliceAngle > 180 ? 1 : 0;
    const path = `M 50 50 L ${x1.toFixed(2)} ${y1.toFixed(2)} A 40 40 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
    currentAngle += sliceAngle;
    return `<path d="${path}" fill="${seg.color}" stroke="white" stroke-width="1.5"/>`;
  }).join('');
}

// ─── BAR CHART ───────────────────────────────
function buildJobsBarChart(jobs) {
  const now   = new Date();
  const month = now.getMonth();
  const year  = now.getFullYear();
  const daysInMonth = new Date(year, month+1, 0).getDate();

  // Count jobs per day this month
  const counts = Array(daysInMonth).fill(0);
  jobs.forEach(j => {
    const d = new Date(j.date + 'T12:00:00');
    if (d.getMonth() === month && d.getFullYear() === year) {
      counts[d.getDate()-1]++;
    }
  });

  const max = Math.max(...counts, 1);
  const monthName = now.toLocaleDateString('en-US', { month:'long', year:'numeric' });

  if (counts.every(c => c === 0)) {
    return `<div class="text-sm text-muted" style="text-align:center;padding:12px">No jobs this month yet</div>`;
  }

  return `
    <div style="font-size:12px;font-weight:700;color:var(--muted);margin-bottom:10px">${monthName}</div>
    <div style="display:flex;align-items:flex-end;gap:3px;height:80px">
      ${counts.map((c,i) => `
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px">
          <div style="width:100%;background:${c>0?'var(--primary)':'var(--bg)'};border-radius:3px 3px 0 0;height:${c>0?Math.max(8,Math.round((c/max)*70)):4}px;transition:height 0.3s"></div>
          ${(i+1)%5===0||i===0?`<div style="font-size:8px;color:var(--hint)">${i+1}</div>`:'<div style="height:11px"></div>'}
        </div>`).join('')}
    </div>
    <div style="text-align:center;font-size:11px;color:var(--muted);margin-top:4px">Day of month</div>`;
}

// Lead source population handled inside openEditCustomer

// ═══════════════════════════════════════════════
//  ARRIVAL WINDOWS
// ═══════════════════════════════════════════════



function fmtArrivalWindow(startTime, endTime) {
  if (!startTime) return '';
  if (!endTime) return fmt12(startTime);
  return `${fmt12(startTime)} – ${fmt12(endTime)}`;
}

// ═══════════════════════════════════════════════
//  TECHNICIAN ASSIGNMENT
// ═══════════════════════════════════════════════

function populateTechDropdown(selectId, selectedId) {
  const el = document.getElementById(selectId);
  if (!el) return;
  const emps = getEmployees().filter(e => e.active);
  const p    = getProfile();
  const defId = selectedId || p.defaultTech || '';
  el.innerHTML = `<option value="">Unassigned</option>` +
    emps.map(e => `<option value="${e.id}" ${e.id===defId?'selected':''}>${e.name}</option>`).join('');
}

function getTechName(techId) {
  if (!techId) return '';
  const emp = getEmployee(techId);
  return emp ? emp.name : '';
}

function getTechColor(techId) {
  if (!techId) return 'var(--hint)';
  const emp = getEmployee(techId);
  return emp ? emp.color : 'var(--hint)';
}

// ── Multiple assignees per job (techId stays = first assignee for cloud/back-compat; full list local) ──
function getJobAssignees(jobId){
  const arr = DS.get('assignees_'+jobId, null);
  if (Array.isArray(arr) && arr.length) return arr.filter(Boolean);
  const j = getJob(jobId);
  return (j && j.techId) ? [j.techId] : [];
}
function saveJobAssignees(jobId, ids){ DS.set('assignees_'+jobId, (ids||[]).filter(Boolean)); pushJobExtras(jobId); }
function assigneeNames(ids){ return (ids||[]).map(getTechName).filter(Boolean); }
function jobAssigneeLabel(j){
  if(!j) return '';
  const names = assigneeNames(getJobAssignees(j.id));
  if(!names.length) return '';
  return names.length<=2 ? names.join(', ') : names[0]+' +'+(names.length-1);
}

// ═══════════════════════════════════════════════
//  TWO-WAY SMS CONVERSATION
// ═══════════════════════════════════════════════

// Fetch messages from GHL for a contact
async function fetchGHLMessages(customerId) {
  const c = getCustomer(customerId);
  if (!c) return [];
  const apiKey     = DS.get('ghl_api_key','');
  const locationId = DS.get('ghl_location_id','');
  if (!apiKey || !locationId) return getMessages().filter(m => m.customerId === customerId);

  try {
    const phone = '+1' + c.phone.replace(/\D/g,'').replace(/^1/,'');
    // Search for contact in GHL
    const searchResp = await fetch(
      `https://services.leadconnectorhq.com/contacts/?locationId=${locationId}&query=${encodeURIComponent(phone)}`,
      { headers: { 'Authorization': `Bearer ${apiKey}`, 'Version': '2021-07-28' } }
    );
    const searchData = await searchResp.json();
    const contactId  = searchData.contacts?.[0]?.id;
    if (!contactId) return getMessages().filter(m => m.customerId === customerId);

    // Get conversation
    const convResp = await fetch(
      `https://services.leadconnectorhq.com/conversations/search?locationId=${locationId}&contactId=${contactId}`,
      { headers: { 'Authorization': `Bearer ${apiKey}`, 'Version': '2021-07-28' } }
    );
    const convData  = await convResp.json();
    const convId    = convData.conversations?.[0]?.id;
    if (!convId) return getMessages().filter(m => m.customerId === customerId);

    // Get messages
    const msgResp = await fetch(
      `https://services.leadconnectorhq.com/conversations/${convId}/messages`,
      { headers: { 'Authorization': `Bearer ${apiKey}`, 'Version': '2021-07-28' } }
    );
    const msgData = await msgResp.json();

    // Map GHL messages to our format
    return (msgData.messages?.messages || []).map(m => ({
      id:          m.id,
      customerId,
      text:        m.body || m.message || '',
      sent:        new Date(m.dateAdded).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}),
      date:        new Date(m.dateAdded).toISOString().slice(0,10),
      type:        m.direction === 'inbound' ? 'received' : 'sent',
      direction:   m.direction,
      source:      'ghl',
    })).reverse(); // newest last

  } catch(e) {
    console.warn('GHL messages fetch error:', e);
    return getMessages().filter(m => m.customerId === customerId);
  }
}

async function openConversation(customerId) {
  const c = getCustomer(customerId);
  if (!c) return;

  document.getElementById('conv-title').textContent = fullName(c);
  document.getElementById('conv-subtitle').textContent = fmtPhone(c.phone);
  document.getElementById('conv-messages').innerHTML = `
    <div style="text-align:center;padding:20px;color:var(--hint)">
      <i class="ti ti-loader" style="font-size:24px"></i><br>Loading messages…
    </div>`;
  document.getElementById('conv-input').value = '';

  // Quick reply templates
  const p = getProfile();
  const name = p.name.split(' ')[0];
  const templates = [
    { label:'On My Way', text:`Hi ${c.firstName}! This is ${name} from ${p.company}. I'm on my way and should arrive in about 15 minutes! 🚛` },
    { label:'Confirm', text:`Hi ${c.firstName}! Confirming your appointment with ${p.company}. See you soon!` },
    { label:'Running Late', text:`Hi ${c.firstName}! This is ${name} from ${p.company}. We're running about 20 minutes behind. Apologies for the delay!` },
    { label:'Review', text:`Hi ${c.firstName}! Thank you for choosing ${p.company}! We'd love a Google review if you have a moment 🙏` },
  ];
  document.getElementById('conv-templates').innerHTML = templates.map(t =>
    `<button class="btn btn-secondary btn-sm" onclick="document.getElementById('conv-input').value='${t.text.replace(/'/g,"\\'")}'">${t.label}</button>`
  ).join('');

  // Store current customer for sending
  State.viewingCustomer = customerId;
  openModal('modal-conversation');

  // Load messages
  const messages = await fetchGHLMessages(customerId);
  renderConversation(messages, customerId);
}

function renderConversation(messages, customerId) {
  const container = document.getElementById('conv-messages');
  if (!messages.length) {
    container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--hint)">No messages yet. Send one below!</div>`;
    return;
  }
  container.innerHTML = messages.map(m => {
    const isSent = m.direction !== 'inbound' && m.type !== 'received';
    return `
      <div style="display:flex;flex-direction:column;align-items:${isSent?'flex-end':'flex-start'}">
        <div style="max-width:80%;padding:10px 14px;border-radius:${isSent?'14px 14px 4px 14px':'14px 14px 14px 4px'};background:${isSent?'var(--primary)':'#f0f2f5'};color:${isSent?'white':'var(--text)'};font-size:13px;line-height:1.5">
          ${m.text}
        </div>
        <div style="font-size:10px;color:var(--hint);margin-top:3px;padding:0 4px">${m.sent||''} ${isSent?'· Sent':'· Received'}</div>
      </div>`;
  }).join('');
  // Scroll to bottom
  container.scrollTop = container.scrollHeight;
}

async function sendConvMessage() {
  const body = document.getElementById('conv-input').value.trim();
  if (!body) return;
  const c = getCustomer(State.viewingCustomer);
  if (!c) return;

  const hasGHL = !!(c && c.phone);

  document.getElementById('conv-input').value = '';
  toast('<i class="ti ti-loader"></i> Sending…', 3000);

  if (hasGHL) {
    const ok = await sendSMS(c.phone, body);
    if (ok) {
      asyncLogMessage({ id:newId('m'), customerId:c.id, text:body, sent:nowTime(), type:'sent', direction:'outbound', date:todayStr() });
      // Reload conversation
      const messages = await fetchGHLMessages(c.id);
      renderConversation(messages, c.id);
      toast(`<i class="ti ti-check" style="color:#4ade80"></i> Sent to ${c.firstName}`);
    }
  } else {
    asyncLogMessage({ id:newId('m'), customerId:c.id, text:body, sent:nowTime(), type:'sent', direction:'outbound', date:todayStr() });
    toast('Logged (no phone or email on file to send to)');
  }
}

// ═══════════════════════════════════════════════
//  ESTIMATES
// ═══════════════════════════════════════════════

function getEstimates()  { return DS.get('estimates', []); }
function getEstimate(id) { return getEstimates().find(e => e.id === id) || null; }

function saveEstimateData(est) {
  const all = getEstimates();
  const idx = all.findIndex(e => e.id === est.id);
  if (idx >= 0) all[idx] = est; else all.unshift(est);
  DS.set('estimates', all);
}

function estStatusPill(s) {
  return {
    scheduled:'<span class="pill pill-blue"><i class="ti ti-calendar"></i> Visit Booked</span>',
    draft:    '<span class="pill pill-gray">Draft</span>',
    sent:     '<span class="pill pill-blue">Quoted</span>',
    approved: '<span class="pill pill-green"><i class="ti ti-check"></i> Approved</span>',
    declined: '<span class="pill pill-red"><i class="ti ti-x"></i> Declined</span>',
    converted:'<span class="pill pill-green"><i class="ti ti-calendar"></i> Converted</span>',
  }[s] || '';
}

let estFilter = 'all';
function renderEstimates(filter) {
  if (filter) estFilter = filter;
  // Estimates are now unconfirmed jobs.
  let ests = scopeJobsToRole(getJobs()).filter(j => j.confirmed === false);
  const all = ests.slice();
  if (estFilter === 'pending')  ests = ests.filter(j => !['didnotgo','cancelled','done'].includes(j.status));
  if (estFilter === 'quoted')   ests = ests.filter(j => (j.price||0) > 0 && !['didnotgo','cancelled'].includes(j.status));
  if (estFilter === 'lost')     ests = ests.filter(j => ['didnotgo','cancelled'].includes(j.status));
  ests = ests.sort((a,b) => (b.date||'').localeCompare(a.date||''));

  const pending = all.filter(j => !['didnotgo','cancelled','done'].includes(j.status)).length;

  const filtersEl = document.getElementById('est-filters');
  if (filtersEl) filtersEl.innerHTML = [['all','All'],['pending','Pending'],['quoted','Quoted'],['lost','Lost']].map(([f,lbl]) =>
    `<button class="btn btn-sm ${estFilter===f?'btn-primary':'btn-secondary'}" onclick="renderEstimates('${f}')">${lbl}</button>`
  ).join('');

  const listEl = document.getElementById('estimates-list');
  if (!listEl) return;

  listEl.innerHTML = `
    <div class="stats-grid mb-12">
      <div class="stat-card"><div class="stat-label">Open Estimates</div><div class="stat-value">${pending}</div></div>
      <div class="stat-card"><div class="stat-label">Total</div><div class="stat-value" style="color:var(--green)">${all.length}</div></div>
    </div>
    ${ests.length ? ests.map(j => {
      const c = getCustomer(j.customerId);
      const tech = getTechName(j.techId);
      const lost = ['didnotgo','cancelled'].includes(j.status);
      return `<div class="card" style="cursor:pointer;border-left:3px dashed ${lost?'var(--red)':'#7c5cff'}" onclick="openJobDetail('${j.id}')">
        <div class="flex-between mb-8">
          <div>
            <div style="font-size:14px;font-weight:700">${c?fullName(c):'?'}</div>
            <div class="text-sm text-muted">${fmtDate(j.date)} · ${fmt12(j.time||'09:00')}</div>
          </div>
          <div class="text-right">
            <div style="font-size:17px;font-weight:800">${j.price?fmtMoney(j.price):'—'}</div>
            ${lost ? statusPill(j.status) : '<span class="pill" style="background:#f3eefe;color:#6b46e5"><i class="ti ti-file-dollar"></i> Estimate</span>'}
          </div>
        </div>
        <div class="text-sm text-muted">${(j.address||'').split(',')[0]}${tech?' · '+tech:''}</div>
        ${!lost ? `<div class="btn-grid mt-8">
          <button class="btn btn-secondary btn-full btn-sm" onclick="event.stopPropagation();openSendQuote('${j.id}')"><i class="ti ti-send"></i> Send Quote</button>
          <button class="btn btn-primary btn-full btn-sm" onclick="event.stopPropagation();convertJobToConfirmed('${j.id}')"><i class="ti ti-calendar-check"></i> Convert</button>
        </div>` : ''}
      </div>`;
    }).join('') : `<div class="empty-state"><i class="ti ti-file-off"></i><p>No estimates yet. Tap + to schedule a visit.</p></div>`}`;
}

function openNewEstimate() {
  // Estimates and jobs are the same act — open the shared form in estimate mode (schedule a visit).
  openNewJobForCustomer(null, 'estimate');
}

async function convertJobToConfirmed(jobId) {
  const j = getJob(jobId); if (!j) return;
  j.confirmed = true;
  if (j.status === 'didnotgo' || j.status === 'cancelled') j.status = 'scheduled';
  saveJob(j);
  if (window._useCloud && window.CloudDS) { try { await CloudDS.saveJob(j); } catch(e){ console.warn('Cloud job save failed:', e); } }
  const c = getCustomer(j.customerId);
  if (c) { c.jobs = (c.jobs||0)+1; saveCustomer(c); if (window._useCloud && window.CloudDS) { try { await CloudDS.saveCustomer(c); } catch(e){} } }
  renderDashboard();
  if (State.screen === 'jobs')      renderJobs();
  if (State.screen === 'estimates') renderEstimates();
  openJobDetail(jobId);   // reopen instantly as a confirmed job
  toast('<i class="ti ti-calendar-check" style="color:#4ade80"></i> Converted to a confirmed job!');
}

function openSendQuote(jobId) {
  const j = getJob(jobId); if (!j) return;
  document.getElementById('sq-est-id').value = jobId;
  document.getElementById('sq-price').value  = j.price || '';
  document.getElementById('sq-valid').value  = '30';
  closeModal('modal-job-detail');
  openModal('modal-send-quote');
}
async function sendQuote() {
  const jobId = document.getElementById('sq-est-id').value;
  const j = getJob(jobId); if (!j) return;
  const price = parseFloat(document.getElementById('sq-price').value) || 0;
  if (!price) { toast('⚠️ Enter a quoted price'); return; }
  const validDays = parseInt(document.getElementById('sq-valid').value) || 30;
  j.price = price;
  saveJob(j);
  if (window._useCloud && window.CloudDS) { try { await CloudDS.saveJob(j); } catch(e){ console.warn('Cloud job save failed:', e); } }

  let c = (window._custCache && window._custCache.find(x => x.id === j.customerId)) || getCustomer(j.customerId);
  if (!c && window._useCloud) { try { const all = await asyncGetCustomers(); c = all.find(x => x.id === j.customerId); } catch(e){} }
  const p = getProfile();
  if (c) {
    const expiry = new Date(j.date); expiry.setDate(expiry.getDate() + validDays);
    const t = getTemplate('estimate');
    const vars = msgVars(c, p, j, {
      service:    getServiceLabel(j.service) || j.service,
      address:    j.address,
      price:      fmtMoney(j.price),
      validUntil: fmtDate(expiry.toISOString().slice(0,10)),
    });
    try { if (c.phone) await sendSMS(c.phone, fillTemplate(t.sms, vars)); } catch(e){ console.warn('SMS:', e); }
    try { await sendEmailJS(c.email, fullName(c), fillTemplate(t.emailSubject, vars), fillTemplate(t.emailBody, vars)); } catch(e){ console.warn('Email:', e); }
  }
  closeModal('modal-send-quote');
  renderDashboard();
  if (State.screen === 'jobs')      renderJobs();
  if (State.screen === 'estimates') renderEstimates();
  toast('<i class="ti ti-send" style="color:#4ade80"></i> Quote sent to ' + (c ? c.firstName : 'customer') + '!');
}

async function saveEstimate() {
  let custId = document.getElementById('ef-customer-id')?.value || document.getElementById('ef-customer')?.value || '';
  if (custId === '__new__') {
    const addr = document.getElementById('ef-address')?.value.trim() || '';
    const newCustId = await commitInlineNewCustomer('ef', addr);
    if (!newCustId) { toast('⚠️ Add at least a first name for the new customer'); return; }
    custId = newCustId;
  }
  if (!custId) { toast('⚠️ Select a customer'); return; }
  const est = {
    id:         newUUID(),
    customerId: custId,
    date:       document.getElementById('ef-date').value,
    time:       document.getElementById('ef-time')?.value || '09:00',
    timeEnd:    document.getElementById('ef-time-end')?.value || '',
    validDays:  parseInt(document.getElementById('ef-valid').value) || 30,
    service:    document.getElementById('ef-service')?.value || 'junk-removal',
    address:    document.getElementById('ef-address').value.trim(),
    price:      parseFloat(document.getElementById('ef-price')?.value) || parseFloat(document.getElementById('ef-price-select')?.value) || 0,
    notes:      document.getElementById('ef-notes').value.trim(),
    techId:     document.getElementById('ef-tech').value,
    status:     'sent',
  };
  saveEstimateData(est);
  if (window._useCloud && window.CloudDS) { try { await CloudDS.saveEstimate(est); } catch(e){ console.warn('Cloud estimate save failed:', e); } }

  // Send estimate via SMS and Email
  const c = (window._custCache && window._custCache.find(x => x.id === custId)) || getCustomer(custId);
  const p = getProfile();
  if (c) {
    const expiryDate = new Date(est.date);
    expiryDate.setDate(expiryDate.getDate() + est.validDays);
    const t = getTemplate('estimate');
    const vars = msgVars(c, p, null, {
      service:    est.service==='dumpster-rental' ? 'Dumpster Rental' : 'Junk Removal',
      address:    est.address,
      price:      fmtMoney(est.price),
      validUntil: fmtDate(expiryDate.toISOString().slice(0,10)),
    });
    const smsText     = fillTemplate(t.sms, vars);
    const emailSubject = fillTemplate(t.emailSubject, vars);
    const emailBody   = fillTemplate(t.emailBody, vars);

    const hasGHL = !!(c && c.phone);
    if (hasGHL) await sendSMS(c.phone, smsText);
    await sendEmailJS(c.email, fullName(c), emailSubject, emailBody);
  }

  closeAllModals();
  renderEstimates();
  toast('<i class="ti ti-check" style="color:#4ade80"></i> Estimate sent!');
}

function openEstimateDetail(id) {
  const est = getEstimate(id);
  if (!est) return;
  const c    = getCustomer(est.customerId);
  const tech = getTechName(est.techId);
  const expiryDate = new Date(est.date);
  expiryDate.setDate(expiryDate.getDate() + (est.validDays||30));

  document.getElementById('est-detail-body').innerHTML = `
    <div class="flex-between mb-12">
      <div><div style="font-size:16px;font-weight:800">#${est.id.slice(-6).toUpperCase()}</div><div class="text-sm text-muted">${fmtDate(est.date)}</div></div>
      ${estStatusPill(est.status)}
    </div>
    <div class="card" style="background:#fafbfc;padding:0;margin-bottom:12px">
      <div class="inv-row" style="padding:11px 14px"><span class="text-muted">Customer</span><span style="font-weight:700">${c?fullName(c):'?'}</span></div>
      <div class="inv-row" style="padding:11px 14px"><span class="text-muted">Service</span><span style="font-weight:600">${est.service}</span></div>
      <div class="inv-row" style="padding:11px 14px"><span class="text-muted">Address</span><span style="font-size:12px;text-align:right;max-width:180px">${est.address}</span></div>
      ${tech?`<div class="inv-row" style="padding:11px 14px"><span class="text-muted">Assigned To</span><span style="font-weight:600">${tech}</span></div>`:''}
      <div class="inv-row" style="padding:11px 14px"><span class="text-muted">Valid Until</span><span>${fmtDate(expiryDate.toISOString().slice(0,10))}</span></div>
      ${est.notes?`<div class="inv-row" style="padding:11px 14px;border:none"><span class="text-muted">Notes</span><span style="font-size:12px">${est.notes}</span></div>`:'<div style="height:4px"></div>'}
    </div>
    <div style="background:var(--primary-lt);border-radius:10px;padding:14px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center">
      <span style="font-size:14px;font-weight:700">${est.price?'Estimate Total':'Quote'}</span>
      <span style="font-size:${est.price?'24px':'14px'};font-weight:${est.price?'900':'600'};color:var(--primary)">${est.price?fmtMoney(est.price):'Not sent yet'}</span>
    </div>
    ${est.status==='scheduled'?`
    <button class="btn btn-primary btn-full mb-8" onclick="openSendQuote('${est.id}')"><i class="ti ti-file-dollar"></i> Send Quote</button>`:''}
    ${est.status==='sent'?`
    <div class="btn-grid mb-8">
      <button class="btn btn-green btn-full" onclick="updateEstimateStatus('${est.id}','approved');closeModal('modal-est-detail')"><i class="ti ti-check"></i> Approved</button>
      <button class="btn btn-red btn-full" onclick="updateEstimateStatus('${est.id}','declined');closeModal('modal-est-detail')"><i class="ti ti-x"></i> Declined</button>
    </div>`:''}
    ${est.status==='approved'?`
    <button class="btn btn-primary btn-full mb-8" onclick="convertEstimateToJob('${est.id}')"><i class="ti ti-calendar-plus"></i> Convert to Job</button>`:''}
    ${est.price?`<button class="btn btn-secondary btn-full" onclick="resendEstimate('${est.id}')"><i class="ti ti-send"></i> Resend Quote</button>`:''}`;

  openModal('modal-est-detail');
}

function updateEstimateStatus(id, status) {
  const est = getEstimate(id);
  if (!est) return;
  est.status = status;
  saveEstimateData(est);
  renderEstimates();
  const labels = { approved:'✅ Estimate approved', declined:'❌ Estimate declined', converted:'📅 Converted to job' };
  toast(labels[status] || 'Updated');
}

function convertEstimateToJob(estId) {
  const est = getEstimate(estId);
  if (!est) return;
  const c = getCustomer(est.customerId);

  // Pre-fill job form with estimate data
  State.editingJob = null;
  resetInlineCust('jf');
  document.getElementById('jf-mode-toggle').style.display = 'none';
  setJobFormMode('job');
  document.getElementById('jf-title').textContent = 'New Job (from Estimate)';
  // Pre-fill searchable customer field
  const convSearchEl = document.getElementById('jf-customer-search');
  const convHiddenEl = document.getElementById('jf-customer-id');
  if (convSearchEl && c) convSearchEl.value = fullName(c);
  if (convHiddenEl) convHiddenEl.value = est.customerId;
  document.getElementById('jf-date').value  = toISO(new Date());
  document.getElementById('jf-service').value = est.service;
  document.getElementById('jf-address').value = est.address || (c?.address||'');
  document.getElementById('jf-price').value   = est.price || '';
  document.getElementById('jf-notes').value   = est.notes || '';
  document.getElementById('jf-status').value  = 'scheduled';

  // Mark estimate as converted
  est.status = 'converted';
  est.convertedJobId = 'pending';
  saveEstimateData(est);

  closeAllModals();
  openModal('modal-job-form');
  setTimeout(() => {
    populateTechDropdown('jf-tech', est.techId);
    loadAssigneePicker(est.techId ? [est.techId] : []);
    autoFillEndTime();
    attachAutocomplete();
  }, 200);

  toast('<i class="ti ti-calendar-plus" style="color:#4ade80"></i> Estimate converted — fill in the schedule details');
}

async function resendEstimate(id) {
  const est = getEstimate(id);
  const c   = est ? getCustomer(est.customerId) : null;
  if (!c) return;
  const p = getProfile();
  const smsText = `Hi ${c.firstName}! Resending your estimate from ${p.company} for ${est.service}: ${fmtMoney(est.price)}. Reply YES to approve!`;
  const hasGHL = !!(c && c.phone);
  if (hasGHL) await sendSMS(c.phone, smsText);
  toast(`<i class="ti ti-send" style="color:#4ade80"></i> Estimate resent to ${c.firstName}`);
}


// ═══════════════════════════════════════════════
//  SEARCHABLE CUSTOMER DROPDOWN
// ═══════════════════════════════════════════════

// Load the cloud customer list into a cache the in-form search can read synchronously.
async function refreshCustCache() {
  try { window._custCache = await asyncGetCustomers(); }
  catch (e) { window._custCache = getCustomers(); }
}

// ─── INLINE "ADD CUSTOMER" (inside job / estimate forms) ───
function resetInlineCust(prefix) {
  const panel = document.getElementById(prefix + '-newcust');
  if (panel) panel.style.display = 'none';
  ['first','last','phone','email'].forEach(f => { const el = document.getElementById(prefix + '-nc-' + f); if (el) el.value = ''; });
  const hidden = document.getElementById(prefix + '-customer-id'); if (hidden) hidden.value = '';
  const search = document.getElementById(prefix + '-customer-search'); if (search) search.disabled = false;
}
function legacyInlineNewCustomer(inputId) { // superseded by the full popup (startInlineNewCustomer above)
  const prefix = (inputId || '').split('-')[0];   // 'jf' or 'ef'
  const raw    = (document.getElementById(inputId)?.value || '').trim();
  const results = document.getElementById(prefix + '-customer-results');
  if (results) results.style.display = 'none';
  const fEl = document.getElementById(prefix + '-nc-first');
  const lEl = document.getElementById(prefix + '-nc-last');
  const pEl = document.getElementById(prefix + '-nc-phone');
  const eEl = document.getElementById(prefix + '-nc-email');
  [fEl,lEl,pEl,eEl].forEach(el => { if (el) el.value = ''; });
  // Prefill from whatever they typed — phone-like into phone, otherwise into name.
  const digits = raw.replace(/\D/g,'');
  const looksPhone = digits.length >= 7 && !/[a-zA-Z]/.test(raw);
  if (looksPhone) { if (pEl) pEl.value = fmtPhone(digits); }
  else if (raw)   { const parts = raw.split(/\s+/); if (fEl) fEl.value = parts.shift() || ''; if (lEl) lEl.value = parts.join(' '); }
  const panel = document.getElementById(prefix + '-newcust');
  if (panel) panel.style.display = 'block';
  const hidden = document.getElementById(prefix + '-customer-id'); if (hidden) hidden.value = '__new__';
  const search = document.getElementById(prefix + '-customer-search');
  if (search) { search.value = ((fEl?.value || '') + ' ' + (lEl?.value || '')).trim() || raw; search.disabled = true; }
  if (fEl && !looksPhone) fEl.focus(); else if (pEl) pEl.focus();
}
function cancelInlineNewCustomer(prefix) {
  resetInlineCust(prefix);
  const search = document.getElementById(prefix + '-customer-search');
  if (search) { search.value = ''; search.focus(); }
}
// Build + persist a brand-new customer from the inline panel. Returns the new id (or null if no name).
async function commitInlineNewCustomer(prefix, address) {
  const first = (document.getElementById(prefix + '-nc-first')?.value || '').trim();
  if (!first) return null;
  const last  = (document.getElementById(prefix + '-nc-last')?.value  || '').trim();
  const phone = (document.getElementById(prefix + '-nc-phone')?.value || '').replace(/\D/g,'');
  const email = (document.getElementById(prefix + '-nc-email')?.value || '').trim();
  const c = {
    id: newUUID(), firstName: first, lastName: last, phone, email,
    address: address || '', notes: '', clientType: 'residential', leadSource: '',
    points: 0, jobs: 0, totalSpent: 0, since: toISO(new Date()),
  };
  saveCustomer(c);   // local mirror so it's immediately readable
  if (window._useCloud && window.CloudDS) { try { await CloudDS.saveCustomer(c); } catch (e) { console.warn('Cloud customer save failed:', e); } }
  if (window._custCache) window._custCache.unshift(c); else window._custCache = [c];
  return c.id;
}

function searchCustomerDropdown(inputId, resultsId, hiddenId) {
  const input   = document.getElementById(inputId);
  const results = document.getElementById(resultsId);
  const hidden  = document.getElementById(hiddenId);
  if (!input || !results) return;

  const query = input.value.trim().toLowerCase();

  // Clear hidden id when user types
  if (hidden) hidden.value = '';

  if (query.length < 1) {
    results.style.display = 'none';
    return;
  }

  const cloud = Array.isArray(window._custCache) ? window._custCache : [];
  const local = getCustomers();
  const byId  = {};
  [...cloud, ...local].forEach(c => { if (c && c.id && !byId[c.id]) byId[c.id] = c; });
  const customers = Object.values(byId);
  const qDigits   = query.replace(/\D/g,'');
  const matched   = customers.filter(c => {
    const name  = fullName(c).toLowerCase();
    const phone = (c.phone || '').replace(/\D/g,'');
    const email = (c.email || '').toLowerCase();
    return name.includes(query) ||
           (qDigits.length >= 3 && phone.includes(qDigits)) ||
           (email && email.includes(query));
  }).slice(0, 8); // max 8 results

  const typed = (input.value.trim()).replace(/"/g,'');
  const addNewRow = `
    <div onmousedown="startInlineNewCustomer('${inputId}')"
      style="padding:12px 14px;cursor:pointer;display:flex;align-items:center;gap:8px;color:var(--primary);font-weight:700;font-size:13px;border-top:0.5px solid var(--border);background:var(--primary-lt)">
      <i class="ti ti-user-plus"></i> ${typed ? `Add "${typed}" as new customer` : 'Add a new customer'}
    </div>`;

  if (!matched.length) {
    results.innerHTML = `<div style="padding:12px 14px;text-align:center;color:var(--muted);font-size:13px">No matching customers</div>` + addNewRow;
    results.style.display = 'block';
    return;
  }

  results.innerHTML = matched.map(c => {
    const tier = tierForPoints(c.points);
    return `<div
      style="padding:12px 14px;cursor:pointer;border-bottom:0.5px solid var(--border);display:flex;align-items:center;gap:10px"
      onmousedown="selectCustomerFromSearch('${c.id}','${inputId}','${resultsId}','${hiddenId}')"
      onmouseover="this.style.background='var(--primary-lt)'"
      onmouseout="this.style.background=''">
      <div style="width:36px;height:36px;border-radius:50%;${avatarStyle(c.id)};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0">${initials(c)}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:14px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${fullName(c)}</div>
        <div style="font-size:11px;color:var(--muted)">${fmtPhone(c.phone)}${c.leadSource?' · '+c.leadSource:''}</div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="font-size:11px;font-weight:700;color:${tier.color}">${tier.name}</div>
        <div style="font-size:10px;color:var(--hint)">${c.jobs} job${c.jobs!==1?'s':''}</div>
      </div>
    </div>`;
  }).join('') + addNewRow;

  results.style.display = 'block';
}

function selectCustomerFromSearch(custId, inputId, resultsId, hiddenId) {
  const c       = (window._custCache && window._custCache.find(x => x.id === custId)) || getCustomer(custId);
  const input   = document.getElementById(inputId);
  const results = document.getElementById(resultsId);
  const hidden  = document.getElementById(hiddenId);
  if (!c || !input) return;

  input.value  = fullName(c);
  if (hidden) hidden.value = custId;
  results.style.display = 'none';

  // Auto-fill address in the matching form (jf- or ef-)
  const prefix    = (inputId || '').split('-')[0];
  const addrField = document.getElementById(prefix + '-address');
  if (addrField && c.address) {
    addrField.value = c.address;
  }

  // Show customer tier info
  const tier = tierForPoints(c.points);
  const disc = tierDiscount(c.points);
  if (disc > 0) {
    toast(`<i class="ti ti-trophy" style="color:${tier.color}"></i> ${c.firstName} is ${tier.name} — ${(disc*100).toFixed(0)}% discount auto-applied`);
  }
  if (typeof refreshJobBubbleVals==='function') refreshJobBubbleVals();
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  document.querySelectorAll('[id$="-results"]').forEach(el => {
    if (!el.contains(e.target) && el.style.display !== 'none') {
      el.style.display = 'none';
    }
  });
});

// ═══════════════════════════════════════════════
//  TIME SELECTS — 15 MINUTE INCREMENTS
// ═══════════════════════════════════════════════





// ═══════════════════════════════════════════════
//  PRICE BOOK
// ═══════════════════════════════════════════════

const DEFAULT_PRICE_BOOK = [
  // Junk Removal — General (truck loads)
  { id:'JR-Min',      service:'JR-Min',      label:'Minimum Load',       price: 125, category:'Junk Removal' },
  { id:'JR-Eighth',   service:'JR-Eighth',   label:'1/8 Truck Load',     price: 198, category:'Junk Removal' },
  { id:'JR-Quarter',  service:'JR-Quarter',  label:'1/4 Truck Load',     price: 298, category:'Junk Removal' },
  { id:'JR-3Eighth',  service:'JR-3Eighth',  label:'3/8 Truck Load',     price: 388, category:'Junk Removal' },
  { id:'JR-Half',     service:'JR-Half',     label:'1/2 Truck Load',     price: 468, category:'Junk Removal' },
  { id:'JR-5Eighth',  service:'JR-5Eighth',  label:'5/8 Truck Load',     price: 558, category:'Junk Removal' },
  { id:'JR-3Quarter', service:'JR-3Quarter', label:'3/4 Truck Load',     price: 618, category:'Junk Removal' },
  { id:'JR-7Eighth',  service:'JR-7Eighth',  label:'7/8 Truck Load',     price: 698, category:'Junk Removal' },
  { id:'JR-Full',     service:'JR-Full',     label:'Full Truck Load',    price: 748, category:'Junk Removal' },
  // Extra Charge Items
  { id:'EX-Paint1',   service:'EX-Paint1',   label:'Paint — 1 Pint',     price: 5,   category:'Extra Charge Items' },
  { id:'EX-Paint2',   service:'EX-Paint2',   label:'Paint — 1 Gallon',   price: 10,  category:'Extra Charge Items' },
  { id:'EX-Paint3',   service:'EX-Paint3',   label:'Paint — 5 Gallon',   price: 50,  category:'Extra Charge Items' },
  { id:'EX-Tire',     service:'EX-Tire',     label:'Tire Disposal',       price: 25,  category:'Extra Charge Items' },
  { id:'EX-Labor',    service:'EX-Labor',    label:'Labor Only (per hr)', price: 135, category:'Extra Charge Items' },
  { id:'EX-Stairs',   service:'EX-Stairs',   label:'Stairs (per flight)', price: 20,  category:'Extra Charge Items' },
  { id:'EX-Stair14',  service:'EX-Stair14',  label:'Stairs per 1/4 load', price: 30, category:'Extra Charge Items' },
  // Dumpster Rental
  { id:'DR-10', service:'DR-10', label:'10 Yard Dumpster', price: 299, category:'Dumpster Rental' },
  { id:'DR-15', service:'DR-15', label:'15 Yard Dumpster', price: 349, category:'Dumpster Rental' },
  { id:'DR-20', service:'DR-20', label:'20 Yard Dumpster', price: 399, category:'Dumpster Rental' },
  { id:'DR-30', service:'DR-30', label:'30 Yard Dumpster', price: 499, category:'Dumpster Rental' },
];

// ═══════════════════════════════════════════════
//  TIME PICKER — HOUR + AM/PM
// ═══════════════════════════════════════════════

// State for AM/PM selections
const TimePicker = {
  fromPeriod: 'AM',
  toPeriod:   'PM',
};

function populateHourSelect(selectId) {
  const el = document.getElementById(selectId);
  if (!el) return;
  // 12:00, 12:30, 1:00, 1:30 ... 11:00, 11:30
  const slots = [];
  const hours = [12,1,2,3,4,5,6,7,8,9,10,11];
  for (const h of hours) {
    slots.push({ value: `${h}:00`,  label: `${h}:00`  });
    slots.push({ value: `${h}:30`,  label: `${h}:30`  });
  }
  el.innerHTML = `<option value="">--</option>` +
    slots.map(s => `<option value="${s.value}">${s.label}</option>`).join('');
}

function populateTimeSelects(startVal, endVal) {
  populateHourSelect('jf-time-hour');
  populateHourSelect('jf-time-end-hour');

  if (startVal) {
    const [h, m] = startVal.split(':').map(Number);
    const period  = h >= 12 ? 'PM' : 'AM';
    const h12     = h % 12 || 12;
    const sel     = document.getElementById('jf-time-hour');
    if (sel) sel.value = `${h12}:${String(m).padStart(2,'0')}`;
    TimePicker.fromPeriod = period;
    updatePeriodButtons('from', period);
    buildTimeValue('from');
  } else {
    // Default: 9:00 AM
    const sel = document.getElementById('jf-time-hour');
    if (sel) sel.value = '9:00';
    TimePicker.fromPeriod = 'AM';
    updatePeriodButtons('from', 'AM');
    buildTimeValue('from');
  }

  if (endVal) {
    const [h, m] = endVal.split(':').map(Number);
    const period  = h >= 12 ? 'PM' : 'AM';
    const h12     = h % 12 || 12;
    const sel     = document.getElementById('jf-time-end-hour');
    if (sel) sel.value = `${h12}:${String(m).padStart(2,'0')}`;
    TimePicker.toPeriod = period;
    updatePeriodButtons('to', period);
    buildTimeValue('to');
  } else {
    autoFillEndTime();
  }
}

function setTimePeriod(which, period) {
  if (which === 'from') TimePicker.fromPeriod = period;
  else                  TimePicker.toPeriod   = period;
  updatePeriodButtons(which, period);
  buildTimeValue(which);
  if (which === 'from') autoFillEndTime();
}

function updatePeriodButtons(which, period) {
  const amId = which === 'from' ? 'jf-time-am'  : 'jf-end-am';
  const pmId = which === 'from' ? 'jf-time-pm'  : 'jf-end-pm';
  const amBtn = document.getElementById(amId);
  const pmBtn = document.getElementById(pmId);
  if (!amBtn || !pmBtn) return;
  const amActive = period === 'AM';
  amBtn.style.background = amActive ? 'var(--primary)' : 'white';
  amBtn.style.color      = amActive ? 'white'          : 'var(--muted)';
  pmBtn.style.background = amActive ? 'white'          : 'var(--primary)';
  pmBtn.style.color      = amActive ? 'var(--muted)'   : 'white';
}

function buildTimeValue(which) {
  const hourId   = which === 'from' ? 'jf-time-hour'     : 'jf-time-end-hour';
  const hiddenId = which === 'from' ? 'jf-time'          : 'jf-time-end';
  const period   = which === 'from' ? TimePicker.fromPeriod : TimePicker.toPeriod;
  const sel      = document.getElementById(hourId);
  const hidden   = document.getElementById(hiddenId);
  if (!sel || !hidden || !sel.value) return;
  // sel.value is like "2:00" or "2:30"
  const [hStr, mStr] = sel.value.split(':');
  let h = parseInt(hStr);
  const m = parseInt(mStr) || 0;
  if (period === 'AM') {
    if (h === 12) h = 0;
  } else {
    if (h !== 12) h += 12;
  }
  hidden.value = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  if (which === 'from') autoFillEndTime();
}

function autoFillEndTime() {
  const startHidden = document.getElementById('jf-time');
  if (!startHidden || !startHidden.value) return;
  const p = getProfile();
  const windowHours = p.arrivalWindow || 2;
  const [h, m] = startHidden.value.split(':').map(Number);
  if (isNaN(h)) return;
  const totalMins = h * 60 + m + windowHours * 60;
  const endH   = Math.floor(totalMins / 60) % 24;
  const endM   = totalMins % 60;
  // Round to nearest :00 or :30
  const roundedM = endM < 15 ? 0 : endM < 45 ? 30 : 0;
  const roundedH = endM >= 45 ? (endH + 1) % 24 : endH;
  const endVal  = `${String(roundedH).padStart(2,'0')}:${String(roundedM).padStart(2,'0')}`;
  const endHidden = document.getElementById('jf-time-end');
  if (endHidden) endHidden.value = endVal;
  const endH12   = roundedH % 12 || 12;
  const endPeriod = roundedH >= 12 ? 'PM' : 'AM';
  const endSel   = document.getElementById('jf-time-end-hour');
  if (endSel) endSel.value = `${endH12}:${String(roundedM).padStart(2,'0')}`;
  TimePicker.toPeriod = endPeriod;
  updatePeriodButtons('to', endPeriod);
}

// ─── SERVICE TYPE TOGGLE ─────────────────────
function selectServiceType(type) {
  document.getElementById('jf-service').value = type;
  const jr = document.getElementById('svc-jr');
  const dr = document.getElementById('svc-dr');
  if (!jr || !dr) return;
  if (type === 'junk-removal') {
    jr.className = 'btn btn-primary';
    dr.className = 'btn btn-secondary';
  } else {
    jr.className = 'btn btn-secondary';
    dr.className = 'btn btn-primary';
  }
  populatePriceSelect('jf-price-select', type);
  if (typeof refreshJobBubbleVals==='function') refreshJobBubbleVals();
}

function populatePriceSelect(selectId, serviceType) {
  const el = document.getElementById(selectId);
  if (!el) return;
  const book = getPriceBook();
  const cats = [...new Set(book.map(i => i.category || 'Other'))];
  el.innerHTML = `<option value="">Select from price book (optional)…</option>` +
    cats.map(cat =>
      `<optgroup label="${cat}">` +
      book.filter(i => (i.category || 'Other') === cat).map(i =>
        `<option value="${i.price}" data-label="${(i.label||'').replace(/"/g,'&quot;')}" data-desc="${(i.description||'').replace(/"/g,'&quot;')}">${i.label} — ${fmtMoney(i.price)}</option>`
      ).join('') +
      `</optgroup>`
    ).join('') +
    `<option value="__custom__">✏️ Enter custom price…</option>`;
}

function applyPriceFromSelect() {
  const sel = document.getElementById('jf-price-select');
  const hidden = document.getElementById('jf-price');
  const custom = document.getElementById('jf-custom-price');
  if (!sel || !hidden) return;
  if (sel.value === '__custom__') {
    if (custom) { custom.style.display='block'; custom.focus(); }
    hidden.value = (custom && custom.value) ? custom.value : '';
  } else {
    if (custom) { custom.style.display='none'; }
    hidden.value = sel.value || '';
    const opt = sel.options[sel.selectedIndex];
    const desc = opt ? (opt.getAttribute('data-desc') || '') : '';
    if (desc) {
      const notes = document.getElementById('jf-notes');
      if (notes && !notes.value.trim()) notes.value = desc;
    }
  }
  if (typeof refreshJobBubbleVals==='function') refreshJobBubbleVals();
}
function setCustomPrice(v){ const h=document.getElementById('jf-price'); if(h) h.value=v||''; if(typeof refreshJobBubbleVals==='function') refreshJobBubbleVals(); }
// On edit: if the job's price isn't a price-book option, show it in the custom field
function reconcilePriceUI(){
  const sel=document.getElementById('jf-price-select'); const hidden=document.getElementById('jf-price'); const custom=document.getElementById('jf-custom-price');
  if(!sel||!hidden) return;
  const v=hidden.value;
  if(!v){ sel.value=''; if(custom) custom.style.display='none'; return; }
  const match=Array.from(sel.options).some(o=>o.value===String(v));
  if(match){ sel.value=String(v); if(custom) custom.style.display='none'; }
  else { sel.value='__custom__'; if(custom){ custom.value=v; custom.style.display='block'; } }
}

// Estimate form: set the service type + refresh its price list.
function selectEstServiceType(type) {
  const svc = document.getElementById('ef-service');
  if (svc) svc.value = type;
  populatePriceSelect('ef-price-select', type);
}

// Estimate form: keep a standard 2-hour arrival window (end = start + 2h).
function efSyncWindow() {
  const s = document.getElementById('ef-time');
  const e = document.getElementById('ef-time-end');
  if (!s || !e || !s.value) return;
  const [h, m] = s.value.split(':').map(Number);
  const end = new Date(2000, 0, 1, h + 2, m);
  e.value = String(end.getHours()).padStart(2, '0') + ':' + String(end.getMinutes()).padStart(2, '0');
}

// ─── SCHEDULE PEEK ────────────────────────────
// Shows the "View Schedule for This Day" button only when the selected date
// already has other (non-cancelled) jobs booked — the schedule peek.
function renderSchedulePeek(date) {
  const btn = document.getElementById('jf-schedule-btn');
  if (!btn) return;
  if (!date) { btn.style.display = 'none'; return; }
  const count = jobsForDate(date).filter(j =>
    j.status !== 'cancelled' && j.status !== 'didnotgo'
  ).length;
  btn.style.display = count > 0 ? 'block' : 'none';
}

// Fires when the date field in the job form changes.
function onJobDateChange() {
  renderSchedulePeek(document.getElementById('jf-date')?.value);
}

function openScheduleView(date) {
  if (!date) return;
  const jobs = jobsForDate(date).filter(j =>
    j.status !== 'cancelled' && j.status !== 'didnotgo'
  ).sort((a,b) => (a.time||'').localeCompare(b.time||''));

  const dateLabel = new Date(date+'T12:00:00').toLocaleDateString('en-US',{
    weekday:'long', month:'long', day:'numeric'
  });

  document.getElementById('day-sched-title').textContent = dateLabel;

  const body = document.getElementById('day-sched-body');
  if (!jobs.length) {
    body.innerHTML = `
      <div style="text-align:center;padding:60px 20px">
        <i class="ti ti-calendar-check" style="font-size:48px;color:var(--green);display:block;margin-bottom:12px"></i>
        <div style="font-size:18px;font-weight:800;color:var(--green)">All Clear!</div>
        <div style="color:var(--muted);margin-top:4px">No jobs scheduled for this day.</div>
      </div>`;
    openModal('modal-day-schedule');
    return;
  }

  // Build time slot grid 6am-8pm
  const slots = [];
  for (let h = 6; h <= 20; h++) {
    const period = h >= 12 ? 'PM' : 'AM';
    const h12    = h % 12 || 12;
    const label  = `${h12}:00 ${period}`;
    const val    = `${String(h).padStart(2,'0')}:00`;

    // Find jobs that overlap this hour
    const overlapping = jobs.filter(j => {
      if (!j.time) return false;
      const [jh] = j.time.split(':').map(Number);
      const endTime = j.timeEnd || `${String(jh+2).padStart(2,'0')}:00`;
      const [eh]    = endTime.split(':').map(Number);
      return jh <= h && eh > h;
    });

    // Check if any job STARTS in this hour
    const starting = jobs.filter(j => {
      if (!j.time) return false;
      const [jh] = j.time.split(':').map(Number);
      return jh === h;
    });

    slots.push({ label, val, h, overlapping, starting });
  }

  const colors = ['#0f2d6b','#00a86b','#e07b10','#6b4fcf','#d03030'];
  const jobColors = {};
  jobs.forEach((j,i) => { jobColors[j.id] = colors[i % colors.length]; });

  body.innerHTML = `
    <div style="font-size:13px;color:var(--muted);margin-bottom:16px">
      ${jobs.length} job${jobs.length!==1?'s':''} scheduled
    </div>

    <!-- Job cards at top -->
    ${jobs.map(j => {
      const c    = getCustomer(j.customerId);
      const tech = jobAssigneeLabel(j);
      const color = jobColors[j.id];
      return `<div style="border-left:4px solid ${color};padding:10px 12px;background:#fafafa;border-radius:0 8px 8px 0;margin-bottom:8px;cursor:pointer" onclick="closeModal('modal-day-schedule');openJobDetail('${j.id}')">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="font-weight:800;font-size:14px">${c?fullName(c):'Unknown Customer'}</div>
          <div style="font-size:13px;font-weight:700;color:${color}">${fmtArrivalWindow(j.time, j.timeEnd)}</div>
        </div>
        <div style="font-size:12px;color:var(--muted);margin-top:2px">
          ${j.service||'Junk Removal'}${tech?' · '+tech:''}${j.address?' · '+j.address.split(',')[1]||'':''}
        </div>
      </div>`;
    }).join('')}

    <div style="border-top:1px solid var(--border);margin:16px 0"></div>

    <!-- Timeline -->
    <div style="font-size:11px;font-weight:700;color:var(--hint);margin-bottom:8px;letter-spacing:0.5px">TIMELINE</div>
    ${slots.map(slot => {
      const isBooked = slot.overlapping.length > 0;
      const isStart  = slot.starting.length > 0;
      return `<div style="display:flex;align-items:stretch;min-height:44px;${isBooked?'':''}">
        <!-- Time label -->
        <div style="width:64px;flex-shrink:0;font-size:12px;font-weight:${isBooked?'700':'400'};color:${isBooked?'var(--text)':'var(--hint)'};padding-top:10px;text-align:right;padding-right:12px">
          ${slot.label}
        </div>
        <!-- Line -->
        <div style="width:2px;background:${isBooked?'var(--primary)':'var(--border)'};flex-shrink:0;position:relative">
          ${isStart?`<div style="position:absolute;top:10px;left:-4px;width:10px;height:10px;border-radius:50%;background:var(--primary)"></div>`:''}
        </div>
        <!-- Content -->
        <div style="flex:1;padding:6px 12px;${isBooked?'background:#f0f4ff;border-radius:0 8px 8px 0;margin:2px 0':''}">
          ${slot.starting.map(j => {
            const c = getCustomer(j.customerId);
            return `<div style="font-size:12px;font-weight:700;color:var(--primary)">${c?fullName(c):'?'} — ${j.service||'Junk Removal'}</div>`;
          }).join('')}
          ${isBooked && !isStart ? '<div style="height:20px"></div>' : ''}
          ${!isBooked ? '<div style="height:20px;border-bottom:0.5px dashed var(--border)"></div>' : ''}
        </div>
      </div>`;
    }).join('')}
  `;

  openModal('modal-day-schedule');
}


// ═══════════════════════════════════════════════
//  MESSAGE TEMPLATES (Communication) — editable per account
// ═══════════════════════════════════════════════
// Placeholders: {customer} {customerFull} {company} {rep} {repFirst} {phone}
//   {address} {date} {time} {window} {service} {price} {total} {reviewLink} {validUntil}
const DEFAULT_TEMPLATES = {
  omw: {
    name: 'On My Way',
    desc: 'Sent when a tech taps "On My Way" on a job.',
    sms: `Hi {customer}! This is {technician} with {company}. I'm on my way now and should arrive in about 15 minutes. See you soon! 🚛`,
    emailSubject: `{company} — On My Way!`,
    emailBody: `Hi {customer},\n\nThis is {technician} with {company} — I'm on my way and should arrive in about 15 minutes.\n\nAddress: {address}\n\nSee you soon!\n{technician}\n{company}\n{phone}`,
  },
  confirm: {
    name: 'Booking Confirmation',
    desc: 'Confirms a scheduled job to the customer.',
    sms: `Hi {customer}! Your job with {company} is confirmed ✅\n\nDate: {date}\nTime: {window}\nService: {service}\nAddress: {address}\n\nQuestions? Call or text us anytime!\n— {rep} | {company}`,
    emailSubject: `{company} — Job Confirmation`,
    emailBody: `Hi {customer},\n\nYour job with {company} is confirmed.\n\nDate: {date}\nTime: {window}\nService: {service}\nAddress: {address}\n\nQuestions? Just reply or call us.\n\n{rep}\n{company}\n{phone}`,
  },
  complete: {
    name: 'Job Complete / Review Request',
    desc: 'Sent automatically when a job is marked complete.',
    sms: `Hi {customer}! Thank you for choosing {company}! 🙏 We hope everything went smoothly today.\n\nIf you're happy with our service, we'd love a quick Google review:\n\n👉 {reviewLink}\n\nThanks so much!\n— {rep} | {company}`,
  },
  invoice: {
    name: 'Invoice Sent',
    desc: 'Sent when you send an invoice to a customer.',
    sms: `Hi {customer}! Your invoice for {total} from {company} is ready. Call or text us to pay. — {repFirst}`,
    emailSubject: `Invoice from {company} — {total}`,
    emailBody: `Hi {customer},\n\nThank you for choosing {company}!\n\nService: {service}\nDate: {date}\nTotal: {total}\n\nPlease call or text us to pay.\n\nThanks,\n{rep}\n{company}\n{phone}`,
  },
  estimate: {
    name: 'Estimate Sent',
    desc: 'Sent when you create and send an estimate.',
    sms: `Hi {customer}! {company} sent you an estimate for {service}: {price}. Valid until {validUntil}. Reply YES to approve or NO to decline.`,
    emailSubject: `Estimate from {company} — {price}`,
    emailBody: `Hi {customer},\n\nThank you for considering {company}!\n\nEstimate Details:\nService: {service}\nAddress: {address}\nPrice: {price}\nValid Until: {validUntil}\n\nReply to this email or call us to approve.\n\nThanks,\n{rep}\n{company}\n{phone}`,
  },
};

function getTemplates() {
  const saved = DS.get('msg_templates', {});
  const merged = {};
  for (const k in DEFAULT_TEMPLATES) merged[k] = Object.assign({}, DEFAULT_TEMPLATES[k], saved[k] || {});
  return merged;
}
function getTemplate(key) { return getTemplates()[key] || DEFAULT_TEMPLATES[key]; }
function saveTemplateOverride(key, fields) {
  const saved = DS.get('msg_templates', {});
  saved[key] = Object.assign({}, saved[key], fields);
  DS.set('msg_templates', saved);
}
function resetTemplate(key) {
  const saved = DS.get('msg_templates', {});
  delete saved[key];
  DS.set('msg_templates', saved);
}
function fillTemplate(str, vars) {
  return (str || '').replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined && vars[k] !== null) ? vars[k] : '');
}

// ─── COMMUNICATION (message templates) settings ───
function renderCommunicationSettings() {
  return `
    <div class="section-label">💬 Communication</div>
    <div class="card" style="cursor:pointer" onclick="openCommunicationManager()">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="width:42px;height:42px;border-radius:11px;background:#efe9fe;color:#7c5cff;display:flex;align-items:center;justify-content:center;font-size:20px"><i class="ti ti-message-2"></i></div>
        <div style="flex:1">
          <div style="font-weight:700">Communication</div>
          <div class="text-sm text-muted">Edit the texts & emails sent to customers</div>
        </div>
        <i class="ti ti-chevron-right" style="color:var(--hint)"></i>
      </div>
    </div>`;
}

function openCommunicationManager() {
  renderCommunicationManager();
  openModal('modal-communication');
}

// Custom values available in message templates (tag + friendly label).
const COMM_VALUES = [
  ['{customer}','Customer first name'],
  ['{customerFull}','Customer full name'],
  ['{company}','Your company'],
  ['{technician}','Technician'],
  ['{technicianFirst}','Technician first name'],
  ['{rep}','Your name'],
  ['{phone}','Your phone'],
  ['{address}','Job address'],
  ['{date}','Job date'],
  ['{time}','Job time'],
  ['{window}','Arrival window'],
  ['{service}','Service type'],
  ['{price}','Price'],
  ['{total}','Invoice total'],
  ['{reviewLink}','Review link'],
  ['{validUntil}','Estimate expiry'],
];

let _commActive = null;
function commSaveSel(el) {
  _commActive = { id: el.id, start: el.selectionStart, end: el.selectionEnd };
}
function commTogglePalette() {
  const el = document.getElementById('comm-palette');
  if (el) el.style.display = (el.style.display === 'none' || !el.style.display) ? 'flex' : 'none';
}
function commInsertTag(tag) {
  const a = _commActive;
  if (!a) { toast('Tap into a message box first, then pick a value'); return; }
  const el = document.getElementById(a.id);
  if (!el) return;
  const v = el.value;
  const start = a.start != null ? a.start : v.length;
  const end   = a.end   != null ? a.end   : v.length;
  el.value = v.slice(0, start) + tag + v.slice(end);
  const pos = start + tag.length;
  _commActive = { id: a.id, start: pos, end: pos };
  el.focus();
  try { el.setSelectionRange(pos, pos); } catch (e) {}
}

function renderCommunicationManager() {
  const tpls = getTemplates();
  const esc = s => (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const track = 'onfocus="commSaveSel(this)" onblur="commSaveSel(this)" onclick="commSaveSel(this)" onkeyup="commSaveSel(this)"';
  const blocks = Object.keys(tpls).map(key => {
    const t = tpls[key];
    const hasEmail = t.emailSubject !== undefined || t.emailBody !== undefined;
    return `
      <div class="card" style="margin-bottom:14px">
        <div style="font-weight:800;font-size:15px">${t.name}</div>
        <div class="text-sm text-muted" style="margin-bottom:10px">${t.desc || ''}</div>
        <label class="form-label">Text message</label>
        <textarea class="form-input" id="ct-${key}-sms" rows="4" style="margin-bottom:10px" ${track}>${esc(t.sms)}</textarea>
        ${hasEmail ? `
          <label class="form-label">Email subject</label>
          <input class="form-input" id="ct-${key}-esub" value="${esc(t.emailSubject).replace(/"/g,'&quot;')}" style="margin-bottom:10px" ${track}>
          <label class="form-label">Email body</label>
          <textarea class="form-input" id="ct-${key}-ebody" rows="6" style="margin-bottom:10px" ${track}>${esc(t.emailBody)}</textarea>` : ''}
        <button class="btn btn-secondary btn-sm" onclick="commResetTemplate('${key}')"><i class="ti ti-rotate"></i> Reset to default</button>
      </div>`;
  }).join('');
  const chips = COMM_VALUES.map(([tag,label]) =>
    `<button onclick="commInsertTag('${tag}')" style="border:1px solid var(--border);background:#f5f7fa;border-radius:999px;padding:6px 11px;font-size:12px;cursor:pointer;font-family:inherit;white-space:nowrap"><strong>${label}</strong> <span style="color:var(--hint)">${tag}</span></button>`
  ).join('');
  document.getElementById('comm-manage-body').innerHTML = `
    <div style="position:sticky;top:0;background:#fff;z-index:5;padding:4px 0 10px;border-bottom:1px solid var(--border);margin-bottom:12px">
      <button class="btn btn-secondary btn-full" onclick="commTogglePalette()"><i class="ti ti-plus"></i> Insert custom value</button>
      <div id="comm-palette" style="display:none;flex-wrap:wrap;gap:6px;margin-top:8px">${chips}</div>
      <div class="text-sm text-muted" style="margin-top:8px">Tap inside a message, then tap a value to drop it in. These auto-fill with real info when the message sends.</div>
    </div>
    ${blocks}
    <button class="btn btn-primary btn-full" onclick="commSaveAll()"><i class="ti ti-check"></i> Save Changes</button>`;
}

function commCaptureAll() {
  Object.keys(getTemplates()).forEach(key => {
    const fields = {};
    const sms   = document.getElementById('ct-' + key + '-sms');   if (sms)   fields.sms = sms.value;
    const esub  = document.getElementById('ct-' + key + '-esub');  if (esub)  fields.emailSubject = esub.value;
    const ebody = document.getElementById('ct-' + key + '-ebody'); if (ebody) fields.emailBody = ebody.value;
    if (Object.keys(fields).length) saveTemplateOverride(key, fields);
  });
}

function syncTemplatesToCloud() {
  if (window._useCloud && window.MY_ROLE === 'admin' && typeof CloudDS !== 'undefined') {
    CloudDS.saveOrgSettings({ msg_templates: DS.get('msg_templates', {}) });
  }
}

function commSaveAll() {
  commCaptureAll();
  syncTemplatesToCloud();
  closeModal('modal-communication');
  toast('<i class="ti ti-check" style="color:#4ade80"></i> Messages saved');
}

function commResetTemplate(key) {
  if (!confirm('Reset this message to the default wording?')) return;
  commCaptureAll();      // keep other in-progress edits
  resetTemplate(key);
  syncTemplatesToCloud();
  renderCommunicationManager();
  toast('Reset to default');
}

function getPriceBook() {
  return DS.get('price_book', DEFAULT_PRICE_BOOK);
}

function savePriceBook(book) {
  DS.set('price_book', book);
  // Sync company-wide so every device uses the same prices.
  if (window._useCloud && window.MY_ROLE === 'admin' && typeof CloudDS !== 'undefined') {
    CloudDS.saveOrgSettings({ price_book: book });
  }
}

function getServiceLabel(serviceId) {
  const book = getPriceBook();
  const item = book.find(i => i.service === serviceId || i.id === serviceId);
  return item ? item.label : serviceId;
}

function openPriceBook() {
  const book = getPriceBook();
  const categories = [...new Set(book.map(i => i.category))];

  document.getElementById('price-book-list').innerHTML = categories.map(cat => `
    <div class="section-label">${cat}</div>
    <div class="card-flat" style="margin-bottom:12px">
      ${book.filter(i => i.category === cat).map(item => `
        <div class="card-inner-row" style="cursor:pointer"
          onclick="selectFromPriceBook('${item.service}','${item.label}',${item.price})">
          <div style="flex:1">
            <div style="font-size:14px;font-weight:700">${item.label}</div>
          </div>
          <div style="font-size:16px;font-weight:800;color:var(--primary)">${fmtMoney(item.price)}</div>
          <i class="ti ti-chevron-right" style="color:var(--hint);margin-left:8px"></i>
        </div>`).join('')}
    </div>`).join('');

  openModal('modal-price-book');
}

function selectFromPriceBook(serviceId, label, price) {
  // Set service
  const svcEl = document.getElementById('jf-service') || document.getElementById('ef-service');
  if (svcEl) svcEl.value = serviceId;
  // Set price
  const priceEl = document.getElementById('jf-price') || document.getElementById('ef-price');
  if (priceEl) priceEl.value = price;
  closeModal('modal-price-book');
  toast(`<i class="ti ti-check" style="color:#4ade80"></i> ${label} — ${fmtMoney(price)}`);
}

function renderPriceBookSettings() {
  const count = getPriceBook().length;
  return `
    <div class="section-label">💲 Pricing</div>
    <div class="card" style="cursor:pointer" onclick="openPriceBookManager()">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="width:42px;height:42px;border-radius:11px;background:var(--primary-lt);color:var(--primary);display:flex;align-items:center;justify-content:center;font-size:20px"><i class="ti ti-book-2"></i></div>
        <div style="flex:1">
          <div style="font-weight:700">Price Book</div>
          <div class="text-sm text-muted">${count} item${count!==1?'s':''} · tap to add, edit, or delete pricing</div>
        </div>
        <i class="ti ti-chevron-right" style="color:var(--hint)"></i>
      </div>
    </div>`;
}

// ─── PRICE BOOK MANAGER (add / edit / delete) ───
let _pbWorking = null;

function openPriceBookManager() {
  _pbWorking = JSON.parse(JSON.stringify(getPriceBook()));
  renderPriceBookManager();
  openModal('modal-pricebook-manage');
}

// Pull current field values into the working copy (so add/delete don't lose edits).
function pbCaptureInputs() {
  if (!_pbWorking) return;
  _pbWorking.forEach(item => {
    const l = document.getElementById('pb-label-' + item.id);
    const p = document.getElementById('pb-price-' + item.id);
    const d = document.getElementById('pb-desc-' + item.id);
    if (l) item.label = l.value;
    if (p) item.price = parseFloat(p.value) || 0;
    if (d) item.description = d.value;
  });
}

function renderPriceBookManager() {
  const esc  = s => (s || '').replace(/"/g, '&quot;');
  const cats = [...new Set(_pbWorking.map(i => i.category || 'Other'))];
  const rows = cats.map(cat => `
    <div class="section-label">${cat}</div>
    ${_pbWorking.filter(i => (i.category || 'Other') === cat).map(item => `
      <div style="margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
          <input class="form-input" id="pb-label-${item.id}" value="${esc(item.label)}" style="flex:1;font-size:13px" placeholder="Item name">
          <input class="form-input" id="pb-price-${item.id}" type="number" value="${item.price}" style="width:82px;text-align:right" placeholder="0">
          <button onclick="pbDeleteItem('${item.id}')" title="Delete" style="background:none;border:none;color:#d03030;cursor:pointer;padding:6px;font-size:16px"><i class="ti ti-trash"></i></button>
        </div>
        <input class="form-input" id="pb-desc-${item.id}" value="${esc(item.description||'')}" style="font-size:12px" placeholder="Description (auto-fills job notes)…">
      </div>`).join('')}
  `).join('');
  const catOptions = cats.map(c => `<option value="${esc(c)}">${c}</option>`).join('');
  document.getElementById('pb-manage-body').innerHTML = rows + `
    <div class="card" style="margin-top:16px">
      <div class="section-label" style="margin-top:0">Add a line item</div>
      <input class="form-input" id="pb-new-label" placeholder="Item name (e.g. 10 Yard Dumpster)" style="margin-bottom:8px">
      <input class="form-input" id="pb-new-price" type="number" placeholder="Price ($)" style="margin-bottom:8px">
      <input class="form-input" id="pb-new-desc" placeholder="Description (optional — auto-fills job notes)" style="margin-bottom:8px">
      <select class="form-input" id="pb-new-cat" style="margin-bottom:8px">${catOptions}</select>
      <input class="form-input" id="pb-new-catnew" placeholder="…or type a new category" style="margin-bottom:8px">
      <button class="btn btn-secondary btn-full" onclick="pbAddItem()"><i class="ti ti-plus"></i> Add Line Item</button>
    </div>
    <button class="btn btn-primary btn-full" style="margin-top:14px" onclick="savePriceBookManager()"><i class="ti ti-check"></i> Save Changes</button>`;
}

function pbAddItem() {
  pbCaptureInputs();
  const label  = (document.getElementById('pb-new-label').value || '').trim();
  const price  = parseFloat(document.getElementById('pb-new-price').value) || 0;
  const newCat = (document.getElementById('pb-new-catnew').value || '').trim();
  const cat    = newCat || document.getElementById('pb-new-cat').value || 'Other';
  const desc   = (document.getElementById('pb-new-desc')?.value || '').trim();
  if (!label) { toast('⚠️ Enter an item name'); return; }
  const id = 'PB-' + Date.now().toString(36);
  _pbWorking.push({ id, service: id, label, price, category: cat, description: desc });
  renderPriceBookManager();
  toast(`<i class="ti ti-plus" style="color:#4ade80"></i> Added ${label}`);
}

function pbDeleteItem(id) {
  pbCaptureInputs();
  const item = _pbWorking.find(i => i.id === id);
  if (!item) return;
  if (!confirm(`Delete "${item.label}" from your price book?`)) return;
  _pbWorking = _pbWorking.filter(i => i.id !== id);
  renderPriceBookManager();
}

function savePriceBookManager() {
  pbCaptureInputs();
  savePriceBook(_pbWorking);
  closeModal('modal-pricebook-manage');
  if (typeof renderSettings === 'function') renderSettings();
  toast('<i class="ti ti-check" style="color:#4ade80"></i> Price book saved');
}

// ═══════════════════════════════════════════════
//  EMPLOYEE MANAGEMENT (Cloud-aware)
// ═══════════════════════════════════════════════

async function loadEmployeesForDropdown(selectId, selectedId) {
  const el = document.getElementById(selectId);
  if (!el) return;
  const emps = window._useCloud ? await CloudDS.getEmployees() : getEmployees();
  const p    = getProfile();
  const defId = selectedId || p.defaultTech || '';
  el.innerHTML = `<option value="">Unassigned</option>` +
    emps.filter(e => e.active).map(e =>
      `<option value="${e.id}" ${e.id===defId?'selected':''}>${e.name}</option>`
    ).join('');
}

// Multi-assignee picker: hides the #jf-tech select and renders a tappable team list in its place.
async function loadAssigneePicker(selectedIds){
  window._jobAssignees = Array.isArray(selectedIds) ? selectedIds.filter(Boolean) : [];
  const sel = document.getElementById('jf-tech');
  if (sel) sel.style.display = 'none';
  const body = (sel && sel.parentNode) || document.querySelector('#jfb-tech .jf-bubble-body');
  if (!body) return;
  let host = document.getElementById('jf-assignee-list');
  if (!host){ host = document.createElement('div'); host.id='jf-assignee-list'; body.appendChild(host); }
  window._assigneeEmps = (window._useCloud ? await CloudDS.getEmployees() : getEmployees()).filter(e=>e.active);
  renderAssigneeList();
  refreshJobBubbleVals();
}
function initialsOf(name){ return (name||'?').replace(/[^A-Za-z ]/g,'').split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase()||'?'; }
// Shared team-picker markup. kind 'form' drives the job-form list; 'reassign' drives the detail sheet.
function buildAssigneePicker(emps, sel, kind, jobId){
  if(!emps.length) return `<div class="text-sm text-muted" style="padding:4px 2px">No team members yet — add them on the Team screen.</div>`;
  const allOn = emps.every(e=>sel.includes(e.id));
  const saCall = kind==='form' ? 'assigneeSelectAll()' : `reassignSelectAll('${jobId}')`;
  const head = `<button type="button" onclick="${saCall}" style="display:flex;align-items:center;justify-content:space-between;width:100%;padding:9px 6px;border:none;background:none;cursor:pointer;font-family:inherit;border-bottom:2px solid var(--border);font-weight:700;color:var(--primary)">
      <span><i class="ti ti-users-group"></i> ${allOn?'Clear all':'Select all techs'}</span>
      <span style="font-size:12px;color:var(--muted);font-weight:600">${sel.length}/${emps.length}</span>
    </button>`;
  const rows = emps.map(e=>{
    const on = sel.includes(e.id);
    const tCall = kind==='form' ? `toggleAssignee('${e.id}')` : `toggleReassign('${e.id}','${jobId}')`;
    return `<button type="button" onclick="${tCall}" style="display:flex;align-items:center;gap:10px;width:100%;padding:10px 6px;border:none;background:none;cursor:pointer;font-family:inherit;border-bottom:1px solid var(--border)">
      <span style="width:30px;height:30px;border-radius:50%;background:${getTechColor(e.id)};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0">${initialsOf(e.name)}</span>
      <span style="flex:1;text-align:left;font-weight:600;font-size:14px">${e.name}</span>
      <span style="width:22px;height:22px;border-radius:6px;border:2px solid ${on?'var(--primary)':'var(--border)'};background:${on?'var(--primary)':'transparent'};color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0">${on?'<i class="ti ti-check"></i>':''}</span>
    </button>`;
  }).join('');
  return head + rows;
}
function renderAssigneeList(){
  const host = document.getElementById('jf-assignee-list'); if(!host) return;
  const emps = window._assigneeEmps || getEmployees().filter(e=>e.active);
  const sel = window._jobAssignees || [];
  host.innerHTML = buildAssigneePicker(emps, sel, 'form');
}
function toggleAssignee(empId){
  const arr = window._jobAssignees || (window._jobAssignees=[]);
  const i = arr.indexOf(empId);
  if(i>=0) arr.splice(i,1); else arr.push(empId);
  renderAssigneeList();
  refreshJobBubbleVals();
}
function assigneeSelectAll(){
  const emps = window._assigneeEmps || getEmployees().filter(e=>e.active);
  const sel = window._jobAssignees || (window._jobAssignees=[]);
  const allOn = emps.length>0 && emps.every(e=>sel.includes(e.id));
  window._jobAssignees = allOn ? [] : emps.map(e=>e.id);
  renderAssigneeList();
  refreshJobBubbleVals();
}

// ── Reassign techs on an already-created job (no new job needed) ──
function openReassign(jobId){
  window._reassign = getJobAssignees(jobId).slice();
  renderReassignSheet(jobId);
}
function renderReassignSheet(jobId){
  const emps = getEmployees().filter(e=>e.active);
  const sel = window._reassign || [];
  dynSheet('reassign-sheet', `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px"><div style="font-weight:800;font-size:16px">Assign techs</div><button onclick="closeDyn('reassign-sheet')" style="background:none;border:none;color:var(--muted);font-size:22px;cursor:pointer">×</button></div>
    <div class="text-sm text-muted" style="margin-bottom:6px">Tap to add or remove people on this job — handy if someone calls out.</div>
    ${buildAssigneePicker(emps, sel, 'reassign', jobId)}
    <button class="btn btn-primary btn-full" style="margin-top:16px" onclick="saveReassign('${jobId}')"><i class="ti ti-check"></i> Save assignment</button>`, 230);
}
function toggleReassign(empId, jobId){
  const a = window._reassign || (window._reassign=[]);
  const i = a.indexOf(empId);
  if(i>=0) a.splice(i,1); else a.push(empId);
  renderReassignSheet(jobId);
}
function reassignSelectAll(jobId){
  const emps = getEmployees().filter(e=>e.active);
  const sel = window._reassign || [];
  const allOn = emps.length>0 && emps.every(e=>sel.includes(e.id));
  window._reassign = allOn ? [] : emps.map(e=>e.id);
  renderReassignSheet(jobId);
}
async function saveReassign(jobId){
  const before = getJobAssignees(jobId);         // who was on it before, so we know who's newly added
  const ids = (window._reassign||[]).filter(Boolean);
  saveJobAssignees(jobId, ids);                 // local + cloud extras
  const j = getJob(jobId);
  if(j){ j.techId = ids[0]||''; saveJob(j); if(window._useCloud && window.CloudDS){ try{ await CloudDS.saveJob(j); }catch(e){} } }
  closeDyn('reassign-sheet');
  toast('<i class="ti ti-user-check" style="color:#4ade80"></i> Assignment updated');
  const newlyAdded = ids.filter(id => !before.includes(id));
  if (j && newlyAdded.length) notifyTechsAssigned(j, newlyAdded); // auto-texts, no confirmation needed
  openJobDetail(jobId);
  renderDashboard();
  if(State.screen==='jobs') renderJobs();
}
// Auto-texts each newly assigned tech that a job is now on their schedule — no confirmation prompt,
// this is an internal staffing notice, not a customer-facing message.
async function notifyTechsAssigned(job, techIds){
  const p = getProfile();
  const when = `${new Date(job.date+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})} at ${fmt12(job.time)}${job.timeEnd?'–'+fmt12(job.timeEnd):''}`;
  for (const id of techIds){
    const emp = getEmployee(id);
    if (!emp || !emp.phone) continue; // no phone on file — nothing to send
    const msg = `Hi ${emp.name||'there'}, you've been assigned a job: ${job.service||'Job'} on ${when} at ${job.address||'the job address'}. — ${p.company||'Dispatch'}`;
    try { await sendSMS(emp.phone, msg); } catch(e){ console.warn('Tech assignment SMS failed:', e); }
  }
}

async function saveEmployeeFormCloud() {
  const name = document.getElementById('ef-name').value.trim();
  const pin  = document.getElementById('ef-pin').value.trim();
  if (!name || pin.length !== 4) { toast('⚠️ Name and 4-digit PIN required'); return; }

  const emps = window._useCloud ? await CloudDS.getEmployees() : getEmployees();

  // Plan limit check — derived from the active tier + purchased seats.
  const p = getProfile();
  const max = maxEmployeesFor(p);
  if (emps.length >= max) {
    closeModal('modal-add-employee');
    openUpgradeModal(emps.length);
    return;
  }

  const emp = {
    id:       newUUID(),
    name,
    role:     document.getElementById('ef-role').value,
    pin,
    color:    ['#0f2d6b','#00a86b','#e07b10','#6b4fcf','#d03030'][emps.length % 5],
    initials: name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase(),
    active:   true,
  };

  if (window._useCloud) {
    await CloudDS.saveEmployee(emp);
  } else {
    saveEmployee(emp);
  }

  closeModal('modal-add-employee');
  renderScreen(State.screen);
  toast(`<i class="ti ti-check" style="color:#4ade80"></i> ${name} added`);
}

// ── PAYWALL / UPGRADE MODAL ──
async function openUpgradeModal(currentCount) {
  const p   = getProfile();
  const cur = currentPlan(p);
  const max = maxEmployeesFor(p);
  const body = document.getElementById('upgrade-body');
  if (!body) return;

  let used = currentCount;
  if (used == null) {
    try { used = window._useCloud ? (await CloudDS.getEmployees()).length : getEmployees().length; }
    catch(e) { used = null; }
  }

  const tierCard = (plan) => {
    const isCurrent = plan.id === cur.id;
    return `
      <div style="border:1.5px solid ${isCurrent?'var(--primary)':'var(--border)'};border-radius:12px;padding:14px;margin-bottom:10px;background:${isCurrent?'rgba(15,45,107,0.06)':'white'}">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div style="font-weight:800;font-size:16px">${plan.name}</div>
          ${isCurrent?'<span style="font-size:11px;font-weight:700;color:var(--primary);background:rgba(15,45,107,0.1);padding:3px 8px;border-radius:20px">CURRENT</span>':''}
        </div>
        <div style="color:var(--muted);font-size:13px;margin:4px 0 10px">Up to <b>${plan.employees}</b> employee${plan.employees>1?'s':''}</div>
        ${isCurrent
          ? `<button class="btn btn-secondary btn-full btn-sm" disabled>Current plan</button>`
          : `<button class="btn btn-primary btn-full btn-sm" onclick="setPlan('${plan.id}')"><i class="ti ti-arrow-up"></i> Switch to ${plan.name}</button>`}
      </div>`;
  };

  const extra = Number(p.extraSeats) || 0;
  body.innerHTML = `
    <div style="text-align:center;margin-bottom:14px">
      <div style="font-size:20px;font-weight:800">Manage Plan</div>
      <div style="color:var(--muted);font-size:13px;margin-top:2px">
        ${cur.name} · ${used!=null?`${used} of ${max} employees used`:`${max} employee seats`}
      </div>
    </div>
    ${Object.values(PLANS).map(tierCard).join('')}
    <div style="border-top:1px solid var(--border);margin-top:6px;padding-top:14px">
      <div style="font-weight:700;font-size:14px;margin-bottom:4px">Need more seats?</div>
      <div style="color:var(--muted);font-size:13px;margin-bottom:10px">
        Add extra employees beyond your plan for <b>$${EXTRA_SEAT_PRICE}</b>/employee per month.
        ${extra>0?`<br>You currently have <b>${extra}</b> extra seat(s).`:''}
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-outline btn-sm" style="flex:1" onclick="addSeat(1)"><i class="ti ti-plus"></i> Add seat (+$${EXTRA_SEAT_PRICE}/mo)</button>
        ${extra>0?`<button class="btn btn-outline btn-sm" style="flex:1" onclick="addSeat(-1)"><i class="ti ti-minus"></i> Remove seat</button>`:''}
      </div>
      <div style="font-size:11px;color:var(--hint);text-align:center;margin-top:12px">
        <i class="ti ti-info-circle"></i> Secure checkout coming soon — billing will be handled automatically.
      </div>
    </div>`;

  openModal('modal-upgrade-plan');
}

// ═══════════════════════════════════════════════
//  EMPLOYEE ONBOARDING WIZARD
// ═══════════════════════════════════════════════
const ROLES = {
  admin:   { id:'admin',   name:'Admin',      icon:'ti-crown',     desc:'Full access — revenue, reports, customers, settings & billing' },
  manager: { id:'manager', name:'Manager',    icon:'ti-clipboard', desc:'Jobs, scheduling & customers — no settings or billing' },
  tech:    { id:'tech',    name:'Technician', icon:'ti-truck',     desc:'Their assigned jobs, photos & clock in/out only' },
};

let Onboard = null;

function openOnboarding() {
  Onboard = { step: 1, data: { firstName:'', lastName:'', phone:'', email:'', role:'tech', pin:'', payRate:'' } };
  renderOnboardStep();
  openModal('modal-onboard-emp');
}

function onboardCapture() {
  const g = id => document.getElementById(id);
  if (Onboard.step === 1) {
    Onboard.data.firstName = g('ob-first')?.value.trim() ?? Onboard.data.firstName;
    Onboard.data.lastName  = g('ob-last')?.value.trim()  ?? Onboard.data.lastName;
    Onboard.data.phone     = g('ob-phone')?.value.trim() ?? Onboard.data.phone;
    Onboard.data.email     = g('ob-email')?.value.trim() ?? Onboard.data.email;
  } else if (Onboard.step === 3) {
    Onboard.data.pin     = g('ob-pin')?.value.trim() ?? Onboard.data.pin;
    Onboard.data.payRate = g('ob-pay')?.value.trim() ?? Onboard.data.payRate;
  }
}

function onboardSetRole(r) { Onboard.data.role = r; renderOnboardStep(); }

function onboardNext() {
  onboardCapture();
  const d = Onboard.data;
  if (Onboard.step === 1) {
    if (!d.firstName || !d.lastName) { toast('⚠️ First and last name required'); return; }
    if (!d.email || !/.+@.+\..+/.test(d.email)) { toast('⚠️ A valid email is required (it\'s their login)'); return; }
  }
  if (Onboard.step === 3 && d.pin && d.pin.length !== 4) { toast('⚠️ PIN must be 4 digits (or leave blank)'); return; }
  Onboard.step = Math.min(4, Onboard.step + 1);
  renderOnboardStep();
}

function onboardBack() {
  onboardCapture();
  Onboard.step = Math.max(1, Onboard.step - 1);
  renderOnboardStep();
}

function renderOnboardStep() {
  const body = document.getElementById('onboard-body');
  if (!body) return;
  const d = Onboard.data;
  const dots = [1,2,3,4].map(n => `<div style="flex:1;height:4px;border-radius:2px;background:${n<=Onboard.step?'var(--primary)':'var(--border)'}"></div>`).join('');
  const header = (title, sub) => `
    <div style="display:flex;gap:5px;margin-bottom:14px">${dots}</div>
    <div style="font-size:19px;font-weight:800">${title}</div>
    <div style="font-size:13px;color:var(--muted);margin-bottom:16px">${sub}</div>`;
  const navBtns = (nextLabel='Continue') => `
    <div style="display:flex;gap:8px;margin-top:18px">
      ${Onboard.step>1?`<button class="btn btn-secondary" style="flex:1" onclick="onboardBack()"><i class="ti ti-arrow-left"></i> Back</button>`:''}
      <button class="btn btn-primary" style="flex:2" onclick="onboardNext()">${nextLabel} <i class="ti ti-arrow-right"></i></button>
    </div>`;

  if (Onboard.step === 1) {
    body.innerHTML = header('Add Employee', 'Step 1 of 4 · Their details') + `
      <div class="input-row">
        <div class="form-group"><label class="form-label">First Name</label><input class="form-input" id="ob-first" value="${d.firstName}" placeholder="Wayne"></div>
        <div class="form-group"><label class="form-label">Last Name</label><input class="form-input" id="ob-last" value="${d.lastName}" placeholder="Smith"></div>
      </div>
      <div class="form-group"><label class="form-label">Phone</label><input class="form-input" id="ob-phone" value="${d.phone}" placeholder="(863) 555-0142"></div>
      <div class="form-group" style="margin-bottom:0"><label class="form-label">Email <span style="font-weight:400;color:var(--hint)">(this becomes their login)</span></label><input class="form-input" id="ob-email" type="email" value="${d.email}" placeholder="wayne@email.com"></div>
      ${navBtns()}`;
  } else if (Onboard.step === 2) {
    const card = (role) => {
      const sel = d.role === role.id;
      return `
        <div onclick="onboardSetRole('${role.id}')" style="cursor:pointer;border:1.5px solid ${sel?'var(--primary)':'var(--border)'};border-radius:12px;padding:13px;margin-bottom:10px;background:${sel?'rgba(15,45,107,0.06)':'white'}">
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:36px;height:36px;border-radius:9px;background:${sel?'var(--primary)':'var(--bg)'};color:${sel?'white':'var(--muted)'};display:flex;align-items:center;justify-content:center"><i class="ti ${role.icon}" style="font-size:18px"></i></div>
            <div style="flex:1">
              <div style="font-weight:700;font-size:15px">${role.name}</div>
              <div style="font-size:12px;color:var(--muted);line-height:1.4">${role.desc}</div>
            </div>
            ${sel?'<i class="ti ti-circle-check" style="color:var(--primary);font-size:20px"></i>':'<i class="ti ti-circle" style="color:var(--border-md,#ccc);font-size:20px"></i>'}
          </div>
        </div>`;
    };
    body.innerHTML = header('Role & Access', 'Step 2 of 4 · What can they see?') +
      Object.values(ROLES).map(card).join('') + navBtns();
  } else if (Onboard.step === 3) {
    body.innerHTML = header('Quick Access & Pay', 'Step 3 of 4 · Optional') + `
      <div class="form-group"><label class="form-label">Clock-in PIN <span style="font-weight:400;color:var(--hint)">(optional — backup for the shared truck iPad)</span></label><input class="form-input" id="ob-pin" type="number" value="${d.pin}" placeholder="4-digit, e.g. 5930"></div>
      <div class="form-group" style="margin-bottom:0"><label class="form-label">Pay Rate <span style="font-weight:400;color:var(--hint)">(per hour · admin-only, never shown to staff)</span></label>
        <div style="display:flex;align-items:center;gap:6px"><span style="font-size:16px;color:var(--muted)">$</span><input class="form-input" id="ob-pay" type="number" step="0.01" value="${d.payRate}" placeholder="18.00"></div>
      </div>
      ${navBtns('Review')}`;
  } else {
    const role = ROLES[d.role];
    const row = (label, val) => `<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:0.5px solid var(--border)"><span style="color:var(--muted);font-size:13px">${label}</span><span style="font-size:13px;font-weight:600;text-align:right">${val||'—'}</span></div>`;
    body.innerHTML = header('Review & Invite', 'Step 4 of 4 · Confirm and send') + `
      <div style="background:white;border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:6px">
        ${row('Name', (d.firstName+' '+d.lastName).trim())}
        ${row('Phone', d.phone? fmtPhone(d.phone):'')}
        ${row('Email', d.email)}
        ${row('Role', role.name)}
        ${row('PIN', d.pin?'Set':'Not set')}
        ${row('Pay rate', d.payRate?('$'+Number(d.payRate).toFixed(2)+'/hr'):'Not set')}
      </div>
      <div style="font-size:11px;color:var(--hint);display:flex;align-items:center;gap:5px;margin:10px 2px">
        <i class="ti ti-mail"></i> An invite email lets them set their own password. Live invites turn on with the login system — for now this saves the employee.
      </div>
      <div style="display:flex;gap:8px;margin-top:6px">
        <button class="btn btn-secondary" style="flex:1" onclick="onboardBack()"><i class="ti ti-arrow-left"></i> Back</button>
        <button class="btn btn-primary" style="flex:2" onclick="saveOnboard()"><i class="ti ti-user-plus"></i> Add Employee</button>
      </div>`;
  }
}

async function saveOnboard() {
  const d = Onboard.data;
  const emps = window._useCloud ? await CloudDS.getEmployees() : getEmployees();
  const p = getProfile();
  if (emps.length >= maxEmployeesFor(p)) {
    closeModal('modal-onboard-emp');
    openUpgradeModal(emps.length);
    return;
  }
  const emp = {
    id:        newUUID(),
    firstName: d.firstName,
    lastName:  d.lastName,
    name:      (d.firstName+' '+d.lastName).trim(),
    phone:     d.phone,
    email:     d.email,
    role:      d.role,
    pin:       d.pin || null,
    payRate:   Number(d.payRate) || 0,
    color:     ['#0f2d6b','#00a86b','#e07b10','#6b4fcf','#d03030'][emps.length % 5],
    initials:  ((d.firstName[0]||'')+(d.lastName[0]||'')).toUpperCase(),
    active:    true,
  };
  try {
    if (window._useCloud) await CloudDS.saveEmployee(emp); else saveEmployee(emp);
  } catch(e) {
    console.error('Save employee failed:', e);
    toast('⚠️ Could not save — did you run the employee migration in Supabase?');
    return;
  }
  closeModal('modal-onboard-emp');
  renderTeamScreen();

  // Send the login invite (creates their account + links them to the business)
  let inviteNote = '';
  if (emp.email) {
    const r = await inviteEmployee(emp);
    inviteNote = r.success ? ' — invite sent' : ` (saved; invite failed: ${r.error})`;
  }
  toast(`<i class="ti ti-check" style="color:#4ade80"></i> ${emp.name} added as ${ROLES[d.role].name}${inviteNote}`, 6000);
}

// Calls the Supabase Edge Function that creates the login + membership.
async function inviteEmployee(emp) {
  if (!window.MY_ORG_ID) return { error: 'No business resolved — reload and try again' };
  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/invite-employee`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Auth.token}`,
        'apikey':        SUPABASE_KEY,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        email:      emp.email,
        firstName:  emp.firstName,
        lastName:   emp.lastName,
        role:       emp.role,
        orgId:      window.MY_ORG_ID,
        redirectTo: window.location.origin + window.location.pathname,
      }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || data.error) return { error: data.error || ('HTTP ' + resp.status) };
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
}

// Opens a read-only profile for an employee, with a danger-zone remove option.
async function openEmployeeProfile(empId) {
  const emps = window._useCloud ? await CloudDS.getEmployees() : getEmployees();
  const emp = emps.find(e => e.id === empId);
  if (!emp) return;
  const isAdmin  = myRole() === 'admin';
  const roleName = (ROLES[emp.role] || {}).name || emp.role || '—';
  const now = new Date();
  const weekMs = getTimeEntries()
    .filter(e => e.empId === emp.id && e.clockOut && e.type !== 'lunch' && ((now - new Date(e.clockIn)) / 86400000) <= 7)
    .reduce((s, e) => s + (new Date(e.clockOut) - new Date(e.clockIn)), 0);

  const row = (label, val) => `<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid var(--border)"><span style="color:var(--muted);font-size:13px">${label}</span><span style="font-weight:600;font-size:14px;text-align:right;word-break:break-word">${val}</span></div>`;

  document.getElementById('emp-profile-body').innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;text-align:center;margin-bottom:18px">
      <div style="width:68px;height:68px;border-radius:50%;background:${emp.color};color:#fff;font-size:24px;font-weight:700;display:flex;align-items:center;justify-content:center;margin-bottom:10px">${emp.initials || ''}</div>
      <div style="font-size:19px;font-weight:800">${emp.name || 'Employee'}</div>
      <div style="margin-top:6px"><span style="background:rgba(127,127,127,.14);border-radius:20px;padding:3px 12px;font-size:12px;font-weight:600">${roleName}</span></div>
    </div>
    <div style="margin-bottom:18px">
      ${row('Phone', emp.phone || '—')}
      ${row('Email', emp.email || '—')}
      ${isAdmin ? row('Pay rate', emp.payRate ? ('$' + emp.payRate + '/hr') : '—') : ''}
      ${row('PIN', emp.pin ? 'Set' : 'Not set')}
      ${row('Hours this week', fmtElapsed(weekMs))}
    </div>
    ${ isAdmin ? `
    <div style="border:1px solid #e3b3b3;background:rgba(208,48,48,.05);border-radius:14px;padding:14px">
      <div style="font-weight:700;color:#b02525;font-size:14px;margin-bottom:3px">Danger zone</div>
      <div style="color:var(--muted);font-size:12.5px;margin-bottom:12px">Remove this employee from your business.</div>
      <button class="btn btn-full" onclick="showRemoveWarning('${emp.id}')" style="background:#fff;border:1.5px solid #d03030;color:#d03030;font-weight:700"><i class="ti ti-user-minus"></i> Remove Employee</button>
    </div>` : '' }
  `;
  openModal('modal-employee-profile');
}

// Swaps the profile modal to a warning view before actually removing.
async function showRemoveWarning(empId) {
  const emps = window._useCloud ? await CloudDS.getEmployees() : getEmployees();
  const emp = emps.find(e => e.id === empId);
  if (!emp) return;
  const first = (emp.name || 'employee').split(' ')[0];
  document.getElementById('emp-profile-body').innerHTML = `
    <div style="text-align:center;margin-bottom:14px">
      <div style="width:56px;height:56px;border-radius:50%;background:rgba(208,48,48,.12);color:#d03030;font-size:26px;display:flex;align-items:center;justify-content:center;margin:0 auto 10px"><i class="ti ti-alert-triangle"></i></div>
      <div style="font-size:18px;font-weight:800">Remove ${emp.name}?</div>
    </div>
    <div style="background:rgba(208,48,48,.05);border:1px solid #e3b3b3;border-radius:14px;padding:14px;margin-bottom:16px">
      <div style="font-weight:700;font-size:13px;margin-bottom:8px;color:#b02525">This will:</div>
      <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.7">
        <li>Delete their employee record</li>
        <li>Revoke their login and access to your business</li>
        <li>Remove them from scheduling and the team list</li>
      </ul>
      <div style="color:var(--muted);font-size:12px;margin-top:10px">Their past timesheets stay in your reports for payroll. This can't be undone.</div>
    </div>
    <button class="btn btn-full" onclick="removeEmployee('${emp.id}')" style="background:#d03030;color:#fff;font-weight:700;margin-bottom:8px"><i class="ti ti-trash"></i> Yes, remove ${first}</button>
    <button class="btn btn-full btn-secondary" onclick="openEmployeeProfile('${emp.id}')">Cancel</button>
  `;
}

// Executes the removal. Confirmation is handled by the warning view above.
async function removeEmployee(empId) {
  const emps = window._useCloud ? await CloudDS.getEmployees() : getEmployees();
  const emp = emps.find(e => e.id === empId);
  if (!emp) return;

  closeModal('modal-employee-profile');
  toast('<i class="ti ti-loader"></i> Removing…', 5000);

  // 1. Delete the employee record
  try {
    if (window._useCloud) await CloudDS.deleteEmployee(empId);
    else if (DS.deleteEmployee) DS.deleteEmployee(empId);
  } catch (e) { console.warn('Delete record failed:', e); }

  // 2. Revoke access (membership + login) — needs the server (service role)
  if (emp.email && window.MY_ORG_ID) {
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/invite-employee`, {
        method:  'POST',
        headers: { 'Authorization': `Bearer ${Auth.token}`, 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'remove', email: emp.email, orgId: window.MY_ORG_ID }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || data.error) console.warn('Access revoke issue:', data.error || resp.status);
    } catch (e) { console.warn('Revoke failed:', e); }
  }

  renderScreen(State.screen);
  toast(`<i class="ti ti-check" style="color:#4ade80"></i> ${emp.name} removed`);
}


//  LINE ITEMS
// ═══════════════════════════════════════════════

// ═══════════════════════════════════════════════
//  JOB PAYMENT OVERVIEW (items → discounts → tax → paid → due)
// ═══════════════════════════════════════════════
function getJobDiscounts(jobId){ return DS.get('discounts_'+jobId, []); }
function saveJobDiscounts(jobId, d){ DS.set('discounts_'+jobId, d); pushJobExtras(jobId); }

// ═══════════════════════════════════════════════
//  CLOUD SYNC for per-job extras (one JSON blob per job → job_extras table)
//  Local DS stays the source of truth (synchronous getters); every save also
//  debounce-pushes the whole blob to cloud, and initApp hydrates it back down.
// ═══════════════════════════════════════════════
function gatherJobExtras(jobId){
  const o = {};
  const sched=DS.get('sched_'+jobId,null);     if(sched!=null)  o.sched=sched;
  const disc =DS.get('discounts_'+jobId,null);  if(disc!=null)   o.discounts=disc;
  const tax  =DS.get('taxrate_'+jobId,null);    if(tax!=null)    o.taxrate=tax;
  const pay  =DS.get('payments_'+jobId,null);   if(pay!=null)    o.payments=pay;
  const cost =DS.get('costitems_'+jobId,null);  if(cost!=null)   o.costitems=cost;
  const li   =DS.get('lineitems_'+jobId,null);  if(li!=null)     o.lineitems=li;
  const asg  =DS.get('assignees_'+jobId,null);  if(asg!=null)    o.assignees=asg;
  const jt   =DS.get('jobtags_'+jobId,null);    if(jt!=null)     o.jobtags=jt;
  const js   =DS.get('jobsrc_'+jobId,null);     if(js!=null)     o.jobsrc=js;
  return o;
}
const _extrasTimers = {};
function pushJobExtras(jobId){
  if(!jobId) return;
  if(!(window._useCloud && window.CloudDS && window.CloudDS.saveJobExtras)) return;
  clearTimeout(_extrasTimers[jobId]);
  _extrasTimers[jobId] = setTimeout(async ()=>{
    try{ await CloudDS.saveJobExtras(jobId, gatherJobExtras(jobId)); }
    catch(e){ console.warn('Job extras sync failed:', e); }
  }, 600);
}
async function pushJobExtrasNow(jobId){
  if(!jobId) return;
  if(!(window._useCloud && window.CloudDS && window.CloudDS.saveJobExtras)) return;
  try{ await CloudDS.saveJobExtras(jobId, gatherJobExtras(jobId)); }catch(e){ console.warn('Job extras sync failed:', e); }
}
// Union local + cloud records by id (cloud wins on a conflicting id; local-only records are kept,
// so a device's not-yet-pushed jobs are NEVER wiped by a pull).
function mergeById(localArr, cloudArr){
  const map = {};
  (localArr||[]).forEach(x=>{ if(x&&x.id) map[x.id]=x; });
  (cloudArr||[]).forEach(x=>{ if(x&&x.id) map[x.id]=x; });
  return Object.values(map);
}
// Pull the org's jobs/customers/invoices/estimates DOWN into local storage so every device
// shows the same data (the UI renders from local DS). Merge-based, so it can't erase local-only rows.
async function hydrateCloudToLocal(){
  if(!(window._useCloud && window.CloudDS)) return;
  if(!(window.Auth && Auth.token) || !window.MY_ORG_ID) return; // only with a valid authed session
  try{
    const jobs  = await CloudDS.getJobs().catch(()=>null);
    if(Array.isArray(jobs))  DS.set('jobs',      mergeById(getJobs(),      jobs));
    const custs = await CloudDS.getCustomers().catch(()=>null);
    if(Array.isArray(custs)) DS.set('customers', mergeById(getCustomers(), custs));
    const invs  = await CloudDS.getInvoices().catch(()=>null);
    if(Array.isArray(invs))  DS.set('invoices',  mergeById(getInvoices(),  invs));
    const ests  = await CloudDS.getEstimates().catch(()=>null);
    if(Array.isArray(ests))  DS.set('estimates', mergeById(getEstimates(), ests));
  }catch(e){ console.warn('Cloud→local hydrate failed:', e); }
}
async function hydrateJobExtras(){
  if(!(window._useCloud && window.CloudDS && window.CloudDS.getJobExtras)) return;
  const map = await CloudDS.getJobExtras();
  Object.keys(map||{}).forEach(jobId=>{
    const d=map[jobId]||{};
    if(d.sched!=null)     DS.set('sched_'+jobId, d.sched);
    if(d.discounts!=null) DS.set('discounts_'+jobId, d.discounts);
    if(d.taxrate!=null)   DS.set('taxrate_'+jobId, d.taxrate);
    if(d.payments!=null)  DS.set('payments_'+jobId, d.payments);
    if(d.costitems!=null) DS.set('costitems_'+jobId, d.costitems);
    if(d.lineitems!=null) DS.set('lineitems_'+jobId, d.lineitems);
    if(d.assignees!=null) DS.set('assignees_'+jobId, d.assignees);
    if(d.jobtags!=null)   DS.set('jobtags_'+jobId, d.jobtags);
    if(d.jobsrc!=null)    DS.set('jobsrc_'+jobId, d.jobsrc);
  });
}

// ── Auto-sync: pull cloud changes in the background so devices stay current without a manual Pull ──
let _autoSyncing=false, _autoSyncTimer=null;
function _uiBusy(){
  // Don't refresh under an open form/sheet/picker, or while the user is typing/selecting.
  if(document.querySelector('.modal.open')) return true;
  if(document.querySelector('#sched-overlay, #sync-mgr, #reassign-sheet, [id$="-sheet"], [id$="-picker"]')) return true;
  const ae=document.activeElement;
  if(ae && (ae.tagName==='INPUT'||ae.tagName==='TEXTAREA'||ae.tagName==='SELECT')) return true;
  return false;
}
function _dataSignature(){
  const j=getJobs(), c=getCustomers(), t=getTimeEntries(), msgs=getMessages();
  let s=j.length+':'+c.length+':'+t.length+':'+msgs.length+';';
  for(const x of j) s+=x.id+'~'+(x.status||'')+'~'+(x.date||'')+'~'+(x.time||'')+'~'+(x.price||'')+'~'+(x.techId||'')+'~'+(x.confirmed===false?'e':'j')+'|';
  for(const x of c) s+='#'+x.id+(x.firstName||'')+(x.lastName||'');
  for(const x of t) s+='@'+x.id+(x.clockOut||'')+(x.inLat||'')+(x.outLat||'');
  if(msgs[0]) s+='%'+msgs[0].id;
  return s;
}
function rerenderCurrentScreen(){
  try{
    const s=State&&State.screen;
    if(s==='dashboard') renderDashboard();
    else if(s==='jobs') renderJobs();
    else if(s==='customers' && typeof renderCustomers==='function') renderCustomers();
    else if(s==='invoices' && typeof renderInvoices==='function') renderInvoices();
    else if(s==='team' && typeof renderTimesheets==='function') renderTimesheets();
    if (typeof renderDesktopScreen==='function') renderDesktopScreen(s);
  }catch(e){}
}
async function autoSyncPull(){
  if(_autoSyncing || _uiBusy()) return;
  if(!(window._useCloud && window.CloudDS && window.Auth && Auth.token && window.MY_ORG_ID)) return;
  if(navigator && navigator.onLine===false) return;
  _autoSyncing=true;
  try{
    const before=_dataSignature();
    await hydrateCloudToLocal();
    if(typeof hydrateJobExtras==='function') await hydrateJobExtras();
    if(typeof hydrateTimeEntries==='function') await hydrateTimeEntries();
    if(typeof hydrateMessages==='function') await hydrateMessages();
    if(_dataSignature()!==before && !_uiBusy()) rerenderCurrentScreen();
  }catch(e){ /* silent — background */ }
  finally{ _autoSyncing=false; }
}
function startAutoSync(){
  if(!window._autoSyncWired){
    document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='visible'){ autoSyncPull(); startRealtime(); if(typeof maybeRequireLocation==='function') maybeRequireLocation(); } });
    window.addEventListener('focus', ()=>{ autoSyncPull(); startRealtime(); if(typeof maybeRequireLocation==='function') maybeRequireLocation(); });
    let _dskResizeT=null;
    window.addEventListener('resize', ()=>{ clearTimeout(_dskResizeT); _dskResizeT=setTimeout(()=>{ if(typeof renderDesktopScreen==='function' && State) renderDesktopScreen(State.screen); }, 200); });
    window._autoSyncWired=true;
  }
  if(_autoSyncTimer) clearInterval(_autoSyncTimer);
  _autoSyncTimer=setInterval(()=>{ if(document.visibilityState==='visible') autoSyncPull(); }, 15000); // background poll (fallback for realtime)
  if(typeof wirePullToRefresh==='function') wirePullToRefresh();
  if(typeof startRealtime==='function') startRealtime();
}

// ── Realtime "poke": a websocket that fires autoSyncPull the instant another device changes data.
//    Polling above is the fallback if the socket can't connect (e.g. Realtime not enabled). ──
let _rt = { ws:null, ref:0, hb:null, retry:0, joined:false };
function _rtSend(topic,event,payload,ref){ try{ _rt.ws.send(JSON.stringify({ topic, event, payload, ref:String(ref), join_ref:'1' })); }catch(e){} }
let _rtPokeTimer=null;
function _rtPoke(){ clearTimeout(_rtPokeTimer); _rtPokeTimer=setTimeout(()=>{ if(!_uiBusy()) autoSyncPull(); }, 350); }
function startRealtime(){
  if(!(window._useCloud && window.Auth && Auth.token && window.MY_ORG_ID)) return;
  if(_rt.ws && (_rt.ws.readyState===0 || _rt.ws.readyState===1)) return; // already connecting/open
  if(typeof WebSocket==='undefined') return;
  let ws;
  try{ ws = new WebSocket(`wss://${SUPABASE_URL.replace('https://','')}/realtime/v1/websocket?apikey=${encodeURIComponent(SUPABASE_KEY)}&vsn=1.0.0`); }
  catch(e){ return; }
  _rt.ws = ws; _rt.joined=false;
  ws.onopen = ()=>{
    const org = window.MY_ORG_ID;
    const changes = ['jobs','customers','invoices','time_entries','job_extras','messages'].map(t=>({ event:'*', schema:'public', table:t, filter:`org_id=eq.${org}` }));
    _rtSend('realtime:thrive:'+org, 'phx_join', { config:{ broadcast:{ack:false,self:false}, presence:{key:''}, postgres_changes: changes }, access_token: Auth.token }, ++_rt.ref);
    if(_rt.hb) clearInterval(_rt.hb);
    _rt.hb = setInterval(()=>{ if(ws.readyState===1) _rtSend('phoenix','heartbeat',{},++_rt.ref); }, 25000);
  };
  ws.onmessage = (ev)=>{
    let m; try{ m=JSON.parse(ev.data); }catch(e){ return; }
    if(m.event==='phx_reply'){ if(m.payload && m.payload.status==='ok'){ _rt.joined=true; _rt.retry=0; } return; }
    if(m.event==='postgres_changes'){ _rtPoke(); }
  };
  ws.onclose = ()=>{ if(_rt.hb){ clearInterval(_rt.hb); _rt.hb=null; } _rt.ws=null; _rtReconnect(); };
  ws.onerror = ()=>{ try{ ws.close(); }catch(e){} };
}
function _rtReconnect(){
  if(!(window._useCloud && window.Auth && Auth.token && window.MY_ORG_ID)) return;
  if(document.visibilityState!=='visible') return;         // reconnect when the app is back in focus
  if(!_rt.joined && _rt.retry>=5) return;                   // never connected after several tries → rely on poll
  _rt.retry=Math.min(_rt.retry+1,6);
  setTimeout(startRealtime, Math.min(30000, 1000*Math.pow(2,_rt.retry)));
}

// ── Pull-to-refresh: drag down at the top of a screen to force a sync ──
function wirePullToRefresh(){
  if(window._ptrWired) return; window._ptrWired=true;
  if(!document.getElementById('ptr-style')){
    const st=document.createElement('style'); st.id='ptr-style';
    st.textContent='@keyframes ptrspin{to{transform:rotate(360deg)}} #ptr-ind .spin{animation:ptrspin 0.7s linear infinite}';
    document.head.appendChild(st);
  }
  const ind=document.createElement('div'); ind.id='ptr-ind';
  ind.style.cssText='position:fixed;top:0;left:50%;z-index:150;background:#fff;border:1px solid var(--border);border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(0,0,0,0.14);opacity:0;transform:translateX(-50%) translateY(-50px);transition:opacity 0.15s';
  ind.innerHTML='<i class="ti ti-refresh" style="color:var(--primary);font-size:20px"></i>';
  document.body.appendChild(ind);
  const THRESH=72; let startY=0, pulling=false, dist=0;
  const reset=()=>{ ind.style.transition='transform 0.2s, opacity 0.15s'; ind.style.transform='translateX(-50%) translateY(-50px)'; ind.style.opacity='0'; ind.querySelector('i').classList.remove('spin'); };
  window.addEventListener('touchstart',(e)=>{ if(window.scrollY<=0 && !_uiBusy() && e.touches.length===1){ startY=e.touches[0].clientY; pulling=true; dist=0; } else pulling=false; }, {passive:true});
  window.addEventListener('touchmove',(e)=>{ if(!pulling) return; dist=e.touches[0].clientY-startY; if(dist>0 && window.scrollY<=0){ const d=Math.min(dist,120); ind.style.transition='none'; ind.style.opacity=String(Math.min(1,d/THRESH)); ind.style.transform=`translateX(-50%) translateY(${Math.min(d-42,58)}px) rotate(${d*3}deg)`; } else { pulling=false; } }, {passive:true});
  window.addEventListener('touchend',()=>{ if(!pulling){ return; } pulling=false; if(dist>=THRESH){ ind.style.transition='transform 0.2s'; ind.style.transform='translateX(-50%) translateY(16px)'; ind.style.opacity='1'; ind.querySelector('i').classList.add('spin'); Promise.resolve(autoSyncPull()).finally(()=>{ setTimeout(reset, 550); }); } else { reset(); } dist=0; }, {passive:true});
}

// ── Sync diagnostics + repair (recover data stuck on one device) ──
function _isUuidId(id){ return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id||''); }
function _isLegacyRealId(id){ return id && !_isUuidId(id) && /^[a-z]+_\d{6,}_/i.test(id); }
// Old records used `prefix_timestamp_random` ids that Postgres UUID columns reject. Convert those
// to UUIDs and fix every reference, so they can sync. (Short demo seed ids like c1/j1 are left alone.)
function normalizeLegacyIds(){
  const jobs=getJobs(), custs=getCustomers(), invs=getInvoices(), ests=(typeof getEstimates==='function'?getEstimates():[]);
  const cMap={}, jMap={};
  custs.forEach(c=>{ if(c&&_isLegacyRealId(c.id)){ const n=newUUID(); cMap[c.id]=n; c.id=n; } });
  jobs.forEach(j=>{
    if(j.customerId&&cMap[j.customerId]) j.customerId=cMap[j.customerId];
    if(_isLegacyRealId(j.id)){ const n=newUUID(); jMap[j.id]=n;
      ['sched_','discounts_','taxrate_','payments_','costitems_','lineitems_','assignees_'].forEach(p=>{ const v=DS.get(p+j.id,null); if(v!=null){ DS.set(p+n,v); DS.set(p+j.id,null);} });
      if(j.recurSeriesId===j.id) j.recurSeriesId=n; j.id=n; }
  });
  jobs.forEach(j=>{ if(j.recurSeriesId&&jMap[j.recurSeriesId]) j.recurSeriesId=jMap[j.recurSeriesId]; });
  invs.forEach(iv=>{ if(iv.customerId&&cMap[iv.customerId]) iv.customerId=cMap[iv.customerId]; if(iv.jobId&&jMap[iv.jobId]) iv.jobId=jMap[iv.jobId]; if(_isLegacyRealId(iv.id)) iv.id=newUUID(); });
  ests.forEach(e=>{ if(e.customerId&&cMap[e.customerId]) e.customerId=cMap[e.customerId]; if(_isLegacyRealId(e.id)) e.id=newUUID(); });
  DS.set('customers',custs); DS.set('jobs',jobs); DS.set('invoices',invs); if(typeof getEstimates==='function') DS.set('estimates',ests);
  return { customers:Object.keys(cMap).length, jobs:Object.keys(jMap).length };
}
// Replace ALL local entities with the cloud's copy (no merge). Use on a SECONDARY device so it
// mirrors the master rather than re-uploading its own near-duplicate legacy records.
async function replaceLocalWithCloud(){
  if(!(window.Auth && Auth.token)){ toast('⚠️ Sign in first'); return false; }
  try{
    const jobs=await CloudDS.getJobs();      if(Array.isArray(jobs))  DS.set('jobs', jobs);
    const cs=await CloudDS.getCustomers();   if(Array.isArray(cs))    DS.set('customers', cs);
    const iv=await CloudDS.getInvoices();    if(Array.isArray(iv))    DS.set('invoices', iv);
    const es=await CloudDS.getEstimates();   if(Array.isArray(es))    DS.set('estimates', es);
    if(typeof hydrateJobExtras==='function') await hydrateJobExtras();
  }catch(e){ console.warn(e); toast('Pull failed'); return false; }
  return true;
}
async function replaceLocalWithCloudUI(){
  if(!confirm('Replace THIS device\'s jobs/customers with the cloud copy?\n\nUse this on a phone/laptop that should just mirror the cloud. Anything only on this device (not yet pushed) will be removed.')) return;
  const ok = await replaceLocalWithCloud();
  if(ok){ try{ renderDashboard(); if(State.screen==='jobs') renderJobs(); }catch(e){} toast('<i class="ti ti-check" style="color:#4ade80"></i> This device now mirrors the cloud'); openSyncManager(); }
}
async function fixLegacyIdsUI(){
  if(!(window.Auth && Auth.token)){ toast('⚠️ Sign in first'); return; }
  const r = normalizeLegacyIds();
  toast(`<i class="ti ti-wand"></i> Fixed ${r.jobs} jobs, ${r.customers} customers — pushing…`);
  const n = await pushAllLocalToCloud();
  if(n){ toast(`<i class="ti ti-check" style="color:#4ade80"></i> Synced ${n.jobs} jobs${n.fail?` · ${n.fail} failed`:''}`); openSyncManager(); }
}
async function pushAllLocalToCloud(){
  if(!(window._useCloud && window.CloudDS)) { toast('Cloud is not active on this device'); return null; }
  if(!(window.Auth && Auth.token))          { toast('⚠️ Re-login first, then push'); return null; }
  const n={cust:0,jobs:0,extras:0,est:0,inv:0,fail:0};
  // Customers FIRST (jobs/invoices reference them).
  for(const c of getCustomers()){ try{ await CloudDS.saveCustomer(c); n.cust++; }catch(e){ n.fail++; console.warn('cust',e); } }
  for(const j of getJobs()){
    try{ await CloudDS.saveJob(j); n.jobs++; }catch(e){ n.fail++; console.warn('job',e); continue; }
    try{ await CloudDS.saveJobExtras(j.id, gatherJobExtras(j.id)); n.extras++; }catch(e){ console.warn('extras',e); }
  }
  for(const e of getEstimates()){ try{ await CloudDS.saveEstimate(e); n.est++; }catch(_){ n.fail++; } }
  for(const iv of getInvoices()){ try{ await CloudDS.saveInvoice(iv); n.inv++; }catch(_){ n.fail++; } }
  return n;
}
async function pushLocalToCloudUI(){
  if(!(window.Auth && Auth.token)){ toast('⚠️ Re-login first, then push'); return; }
  toast('<i class="ti ti-cloud-upload"></i> Pushing this device\'s data…');
  const n = await pushAllLocalToCloud();
  if(n){ toast(`<i class="ti ti-check" style="color:#4ade80"></i> Synced ${n.jobs} jobs · ${n.cust} customers${n.fail?` · ${n.fail} failed`:''}`); openSyncManager(); }
}
async function pullFromCloudUI(){
  if(!(window.Auth && Auth.token)){ toast('⚠️ Sign in first'); return; }
  toast('<i class="ti ti-cloud-download"></i> Pulling latest…');
  try{ await hydrateCloudToLocal(); if(typeof hydrateJobExtras==='function') await hydrateJobExtras(); }catch(e){ console.warn(e); }
  try{ renderDashboard(); if(State.screen==='jobs') renderJobs(); if(State.screen==='customers' && typeof renderCustomers==='function') renderCustomers(); }catch(e){}
  toast('<i class="ti ti-check" style="color:#4ade80"></i> Updated from cloud');
  openSyncManager();
}
function openSyncManager(){
  dynSheet('sync-mgr', `<div style="text-align:center;padding:34px 10px"><div class="text-sm text-muted">Checking sync status…</div></div>`, 230);
  (async ()=>{
    const authEmail = (window.Auth && Auth.user && Auth.user.email) || '';
    const profEmail = getProfile().email || '';
    const cloud   = !!window._useCloud;
    const tokenOk = !!(window.Auth && Auth.token);
    const org     = window.MY_ORG_ID || '';
    const uid     = (window.Auth && Auth.userId) || '';
    const localJobs = getJobs().length;
    const mismatch = authEmail && profEmail && authEmail.toLowerCase()!==profEmail.toLowerCase();
    let cloudJobs='—', cloudErr='';
    try{ if(cloud && window.CloudDS) cloudJobs = (await CloudDS.getJobs()).length; }
    catch(e){ cloudErr = String(e.message||e).slice(0,120); }
    const row=(l,v,good)=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)"><span class="text-muted">${l}</span><span style="font-weight:700;text-align:right;color:${good===false?'var(--red)':(good===true?'var(--green)':'var(--text)')}">${v}</span></div>`;
    const html = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px"><div style="font-weight:800;font-size:17px">Sync status</div><button onclick="closeDyn('sync-mgr')" style="background:none;border:none;color:var(--muted);font-size:22px;cursor:pointer">×</button></div>
      ${row('Account (login)', authEmail||'—', authEmail?undefined:false)}
      ${row('Profile shown', profEmail||'—')}
      ${row('Cloud mode', cloud?'On':'Off', cloud)}
      ${row('Valid session', tokenOk?'Yes':'Expired', tokenOk)}
      ${row('Business ID', org?org.slice(0,8)+'…':'—', !!org)}
      ${row('User ID', uid?uid.slice(0,8)+'…':'—')}
      ${row('Jobs on this device', localJobs)}
      ${row('Jobs in cloud', cloudErr?'error':cloudJobs, cloudErr?false:undefined)}
      ${cloudErr?`<div class="text-sm" style="color:var(--red);margin-top:6px">${cloudErr}</div>`:''}
      ${mismatch?`<div class="text-sm" style="background:#fff8ec;border:1px solid #f0d28a;border-radius:10px;padding:11px 13px;color:#8a5a00;margin-top:12px"><b>Heads up:</b> this device is logged in as <b>${authEmail}</b> but still showing <b>${profEmail}</b>'s saved profile. That's a stale login. Use <b>Sign out &amp; clear</b> below, then log in fresh as the account you actually want — type the email by hand so autofill doesn't pick the wrong one.</div>`:''}
      ${!tokenOk?`<div class="text-sm" style="background:#fff4f4;border:1px solid #f3c0c0;border-radius:10px;padding:11px 13px;color:#b02020;margin-top:12px">Your session expired, so saves aren't reaching the cloud. <b>Sign out &amp; clear</b>, log back in (type the email by hand), then reopen this and tap <b>Push to cloud</b>.</div>`:''}
      <div style="margin-top:14px;display:flex;flex-direction:column;gap:8px">
        ${mismatch?`<button class="btn btn-primary btn-full" onclick="resetDeviceFromCloud()"><i class="ti ti-refresh"></i> Fix: reset this device &amp; reload from cloud</button>`:''}
        <button class="btn btn-primary btn-full" onclick="pushLocalToCloudUI()" ${tokenOk?'':'disabled style="opacity:0.5"'}><i class="ti ti-cloud-upload"></i> Push this device's data to cloud</button>
        <button class="btn btn-secondary btn-full" onclick="pullFromCloudUI()" ${tokenOk?'':'disabled style="opacity:0.5"'}><i class="ti ti-cloud-download"></i> Pull latest from cloud</button>
        <button class="btn btn-secondary btn-full" onclick="fixLegacyIdsUI()" ${tokenOk?'':'disabled style="opacity:0.5"'}><i class="ti ti-wand"></i> Fix legacy IDs &amp; push</button>
        <button class="btn btn-secondary btn-full" onclick="replaceLocalWithCloudUI()" ${tokenOk?'':'disabled style="opacity:0.5"'}><i class="ti ti-versions"></i> Replace this device with cloud</button>
        <button class="btn btn-secondary btn-full" onclick="clearSignInKeepData()"><i class="ti ti-refresh-alert"></i> Sign out &amp; clear (keeps your jobs)</button>
      </div>
      <div class="text-sm text-muted" style="margin-top:10px">"Sign out &amp; clear" wipes only the cached login — your ${localJobs} local jobs &amp; customers stay so you can push them after signing back in.</div>`;
    dynSheet('sync-mgr', html, 230);
  })();
}
// Clears the cached login + stale profile but KEEPS the actual data (jobs/customers/etc.)
// so it can be pushed after a clean re-login. Fixes a device stuck on the wrong account.
function clearSignInKeepData(){
  if(!confirm('Sign out and clear this device\'s cached login?\n\nYour jobs, customers and invoices STAY on this device so you can push them after you sign back in.')) return;
  try{
    localStorage.removeItem('thrive_token');
    localStorage.removeItem('thrive_refresh');
    localStorage.removeItem('thrive_user');
    DS.set('profile', null);
    DS.set('employees', null);
    DS.set('current_employee', null);
  }catch(e){}
  if(window.Auth){ Auth.token=null; Auth.user=null; }
  window.MY_ORG_ID=null; window.MY_ROLE=null; window.MY_EMPLOYEE_ID=null; window._authBroken=false;
  closeDyn('sync-mgr');
  toast('Cleared. Please sign in again.');
  if(typeof showLoginScreen==='function') showLoginScreen();
}
// Remove ALL of this device's cached app data (jobs, customers, invoices, profile, per-job blobs).
// Login tokens (thrive_*) are NOT touched. Used on account switch and device reset.
function wipeLocalData(){
  try{
    const kill=[];
    for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(k && k.indexOf('hp_')===0) kill.push(k); }
    kill.forEach(k=>{ try{ localStorage.removeItem(k); }catch(e){} });
  }catch(e){}
}
// One-tap fix for a device stuck showing the wrong account: clear everything local and
// reload, so the app re-pulls a clean copy from the cloud for whoever is currently signed in.
function resetDeviceFromCloud(){
  if(!confirm('Reset this device?\n\nThis clears everything stored on THIS device and reloads a fresh copy from the cloud for your current account. Your cloud data is not affected.')) return;
  try{ wipeLocalData(); }catch(e){}
  toast('<i class="ti ti-refresh"></i> Reloading from cloud…');
  setTimeout(()=>location.reload(), 500);
}
function getJobTaxRate(jobId){ return DS.get('taxrate_'+jobId, 0); }
function saveJobTaxRate(jobId, r){ DS.set('taxrate_'+jobId, r); pushJobExtras(jobId); }
function getJobPayments(jobId){ return DS.get('payments_'+jobId, []); }
function saveJobPayments(jobId, p){ DS.set('payments_'+jobId, p); pushJobExtras(jobId); }

function discountAmount(d, base){ return d.type==='percent' ? base*(parseFloat(d.amount)||0)/100 : (parseFloat(d.amount)||0); }

function jobPayMath(jobId){
  const items = getJobLineItems(jobId);
  const j = getJob(jobId);
  const itemSubtotal = items.length ? lineItemTotal(items) : (parseFloat(j&&j.price)||0);
  const discounts = getJobDiscounts(jobId);
  const discountTotal = discounts.reduce((s,d)=>s+discountAmount(d, itemSubtotal),0);
  const taxRate = getJobTaxRate(jobId);
  const taxBase = Math.max(0, itemSubtotal - discountTotal);
  const taxAmount = taxRate ? (taxRate/100)*taxBase : 0;
  const total = Math.max(0, itemSubtotal - discountTotal + taxAmount);
  const payments = getJobPayments(jobId);
  const paid = payments.reduce((s,p)=>s+(parseFloat(p.amount)||0),0);
  const due = total - paid;
  return { items, itemSubtotal, discounts, discountTotal, taxRate, taxAmount, total, payments, paid, due };
}

function openJobPay(jobId){
  document.getElementById('modal-job-pay').classList.add('open');
  renderJobPay(jobId);
}
function togglePayForm(id){ const el=document.getElementById(id); if(!el) return; el.style.display = (el.style.display==='none'||!el.style.display) ? 'block' : 'none'; }

function renderJobPay(jobId){
  _discType = 'fixed';
  const m = jobPayMath(jobId);
  const body = document.getElementById('job-pay-body');
  if (!body) return;
  const dueColor = m.due > 0.005 ? 'var(--red)' : 'var(--green)';
  const dueLabel = m.due > 0.005 ? 'Amount Due' : 'Paid in Full';
  body.innerHTML = `
    <div style="font-size:12px;font-weight:700;color:var(--hint);letter-spacing:0.5px;margin-bottom:8px">ITEMS</div>
    <div class="card-flat" style="margin-bottom:14px">
      ${m.items.length ? m.items.map(it=>`
        <div style="display:flex;justify-content:space-between;padding:10px 14px;border-bottom:0.5px solid var(--border)">
          <div><div style="font-size:13px;font-weight:600">${it.label}</div><div style="font-size:11px;color:var(--muted)">${fmtMoney(it.price)} × ${it.qty}</div></div>
          <div style="font-weight:700">${fmtMoney(it.price*it.qty)}</div>
        </div>`).join('') : `<div style="padding:14px;text-align:center;color:var(--hint);font-size:13px">No items on this job yet</div>`}
    </div>

    <div style="font-size:12px;font-weight:700;color:var(--hint);letter-spacing:0.5px;margin-bottom:8px">SUMMARY</div>
    <div class="card" style="padding:14px;margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;padding:6px 0">
        <span class="text-muted">Item Subtotal</span><span style="font-weight:700">${fmtMoney(m.itemSubtotal)}</span>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0">
        <span class="text-muted">Discount Subtotal</span>
        <span style="display:flex;align-items:center;gap:8px">
          <span style="font-weight:700;color:${m.discountTotal?'var(--red)':'var(--text)'}">${m.discountTotal?'−'+fmtMoney(m.discountTotal):fmtMoney(0)}</span>
          <button class="btn btn-sm btn-outline" style="padding:3px 8px" onclick="openDiscountSheet('${jobId}')"><i class="ti ti-plus"></i> Add</button>
        </span>
      </div>
      ${m.discounts.map((d,i)=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0 3px 12px;font-size:12px">
        <span class="text-muted">${d.label||'Discount'}${d.type==='percent'?` (${d.amount}%)`:''}</span>
        <span style="display:flex;align-items:center;gap:8px"><span style="color:var(--red)">−${fmtMoney(discountAmount(d, m.itemSubtotal))}</span>
        <button onclick="removeJobDiscount('${jobId}',${i})" style="background:none;border:none;color:var(--red);cursor:pointer"><i class="ti ti-x"></i></button></span>
      </div>`).join('')}

      <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-top:0.5px solid var(--border)">
        <span class="text-muted">Taxes${m.taxRate?` (${m.taxRate}%)`:''}</span>
        <span style="display:flex;align-items:center;gap:8px">
          <span style="font-weight:700">${fmtMoney(m.taxAmount)}</span>
          ${m.taxRate?`<button onclick="clearJobTax('${jobId}')" style="background:none;border:none;color:var(--red);cursor:pointer"><i class="ti ti-x"></i></button>`:`<button class="btn btn-sm btn-outline" style="padding:3px 8px" onclick="openTaxSheet('${jobId}')"><i class="ti ti-plus"></i> Add</button>`}
        </span>
      </div>

      <div style="display:flex;justify-content:space-between;padding:10px 0;border-top:1px solid var(--border);margin-top:4px">
        <span style="font-weight:800">Total</span><span style="font-weight:900;font-size:17px">${fmtMoney(m.total)}</span>
      </div>

      ${m.payments.length?`<div style="padding:8px 0 2px;border-top:0.5px solid var(--border)">
        ${m.payments.map((p,i)=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0;font-size:12px">
          <span class="text-muted">${fmtDate(p.date)} · ${payMethodLabel(p.method)}</span>
          <span style="display:flex;align-items:center;gap:8px"><span>${fmtMoney(p.amount)}</span>
          <button onclick="removeJobPayment('${jobId}',${i})" style="background:none;border:none;color:var(--red);cursor:pointer"><i class="ti ti-x"></i></button></span>
        </div>`).join('')}
      </div>`:''}

      <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;margin-top:8px;border-radius:10px;background:${m.due>0.005?'var(--red-lt)':'var(--green-lt)'}">
        <span style="font-weight:800;color:${dueColor}">${dueLabel}</span>
        <span style="display:flex;align-items:center;gap:2px">
          <span style="font-weight:900;font-size:19px;color:${dueColor}">$</span>
          <input id="jd-pay-amount-due" type="number" inputmode="decimal" step="0.01" value="${Math.max(0,m.due).toFixed(2)}" onclick="this.select()" style="width:92px;text-align:right;font-weight:900;font-size:20px;color:${dueColor};background:transparent;border:none;border-bottom:2px solid ${dueColor};padding:2px 0">
        </span>
      </div>
    </div>

    <button class="btn btn-primary btn-full" onclick="openTakePayment('${jobId}')"><i class="ti ti-cash"></i> Take a Payment</button>
  `;
}

let _discType = 'fixed';
function setDiscType(t){
  _discType = t;
  const f=document.getElementById('disc-type-fixed'), p=document.getElementById('disc-type-percent');
  if(f&&p){
    if(t==='fixed'){ f.className='btn btn-sm'; f.style.background='var(--primary)'; f.style.color='#fff'; p.className='btn btn-sm btn-outline'; p.style.background=''; p.style.color=''; }
    else { p.className='btn btn-sm'; p.style.background='var(--primary)'; p.style.color='#fff'; f.className='btn btn-sm btn-outline'; f.style.background=''; f.style.color=''; }
  }
  const amt=document.getElementById('pay-disc-amount'); if(amt) amt.placeholder = (t==='percent'?'%':'0');
}
function payMethodLabel(m){ return ({cash:'Cash',card:'Credit Card',check:'Check',zelle:'Zelle',cardfile:'Card on File',link:'Payment Link'})[m] || (m||'Payment'); }

// Discount and tax now open their own sheet, so the main Pay overview doesn't get congested with forms.
function openDiscountSheet(jobId){
  _discType = 'fixed';
  const body = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <div style="font-size:18px;font-weight:800">Add a discount</div>
      <button onclick="closeDyn('disc-sheet')" style="background:none;border:none;font-size:24px;color:var(--hint);cursor:pointer;line-height:1">×</button>
    </div>
    <div style="display:flex;gap:6px;margin-bottom:10px">
      <button type="button" id="disc-type-fixed" class="btn btn-sm" style="flex:1;background:var(--primary);color:#fff;border:none" onclick="setDiscType('fixed')">$ Amount</button>
      <button type="button" id="disc-type-percent" class="btn btn-sm btn-outline" style="flex:1" onclick="setDiscType('percent')">% Percent</button>
    </div>
    <input class="form-input" id="pay-disc-label" placeholder="Label (e.g. Senior discount)" style="margin-bottom:8px">
    <input class="form-input" id="pay-disc-amount" type="number" inputmode="decimal" placeholder="0" style="margin-bottom:16px">
    <button class="btn btn-primary btn-full" onclick="addJobDiscount('${jobId}')"><i class="ti ti-discount-2"></i> Add discount</button>`;
  dynSheet('disc-sheet', body, 260);
}
function openTaxSheet(jobId){
  const m = jobPayMath(jobId);
  const body = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <div style="font-size:18px;font-weight:800">Set tax rate</div>
      <button onclick="closeDyn('tax-sheet')" style="background:none;border:none;font-size:24px;color:var(--hint);cursor:pointer;line-height:1">×</button>
    </div>
    <input class="form-input" id="pay-tax-rate" type="number" inputmode="decimal" placeholder="Tax rate %" value="${m.taxRate||''}" style="margin-bottom:16px">
    <button class="btn btn-primary btn-full" onclick="applyJobTax('${jobId}')"><i class="ti ti-percentage"></i> Apply tax rate</button>`;
  dynSheet('tax-sheet', body, 260);
}
function addJobDiscount(jobId){
  const label=(document.getElementById('pay-disc-label')?.value||'').trim()||'Discount';
  const amount=parseFloat(document.getElementById('pay-disc-amount')?.value)||0;
  if(!amount){ toast('⚠️ Enter a discount amount'); return; }
  const d=getJobDiscounts(jobId); d.push({label, amount, type:_discType}); saveJobDiscounts(jobId, d);
  closeDyn('disc-sheet');
  renderJobPay(jobId); // back to the overview, now reflecting the discount
}
function removeJobDiscount(jobId, idx){ const d=getJobDiscounts(jobId); d.splice(idx,1); saveJobDiscounts(jobId,d); renderJobPay(jobId); }
function applyJobTax(jobId){ const r=parseFloat(document.getElementById('pay-tax-rate')?.value)||0; saveJobTaxRate(jobId, r); closeDyn('tax-sheet'); renderJobPay(jobId); }
function clearJobTax(jobId){ saveJobTaxRate(jobId, 0); renderJobPay(jobId); }

// ═══════════════════════════════════════════════
//  DISCOUNTS + JOB COST ITEMS (on job detail) + Settings presets
// ═══════════════════════════════════════════════
function dynSheet(id, innerHTML, z){
  let el=document.getElementById(id); if(el) el.remove();
  el=document.createElement('div'); el.id=id;
  el.style.cssText='position:fixed;inset:0;z-index:'+(z||230)+';background:rgba(0,0,0,0.45);display:flex;align-items:flex-end;justify-content:center';
  el.onclick=(e)=>{ if(e.target===el) el.remove(); };
  el.innerHTML='<div style="background:#fff;width:100%;max-width:480px;max-height:90vh;overflow-y:auto;border-radius:20px 20px 0 0;padding:16px 16px 28px">'+innerHTML+'</div>';
  document.body.appendChild(el);
}
function closeDyn(id){ const el=document.getElementById(id); if(el) el.remove(); }

function getDiscountPresets(){ return DS.get('discount_presets', []); }
function saveDiscountPresets(p){ DS.set('discount_presets', p); }
function getCostItemPresets(){ return DS.get('cost_item_presets', []); }
function saveCostItemPresets(p){ DS.set('cost_item_presets', p); }
function getJobCostItems(jobId){ return DS.get('costitems_'+jobId, []); }
function saveJobCostItems(jobId, c){ DS.set('costitems_'+jobId, c); pushJobExtras(jobId); }
function jobCostTotal(jobId){ return getJobCostItems(jobId).reduce((s,c)=>s+(parseFloat(c.price)||0)*(parseInt(c.qty)||1),0); }

// ── Discounts on the job detail ──
function renderJobDiscountsCard(jobId){
  const el=document.getElementById('job-discounts'); if(!el) return;
  const items=getJobLineItems(jobId); const j=getJob(jobId);
  const base=items.length ? lineItemTotal(items) : (parseFloat(j&&j.price)||0);
  const discs=getJobDiscounts(jobId);
  el.innerHTML=`<div class="card" style="margin-bottom:10px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:${discs.length?'8px':'0'}">
      <div style="font-weight:700"><i class="ti ti-discount-2" style="color:var(--primary)"></i> Discounts</div>
      <button class="btn btn-secondary btn-sm" onclick="openAddDiscount('${jobId}')"><i class="ti ti-plus"></i> Add</button>
    </div>
    ${discs.map((d,i)=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-top:1px solid var(--border)">
      <div><div style="font-weight:600;font-size:14px">${d.label||'Discount'}</div><div class="text-sm text-muted">${d.type==='percent'?(d.amount+'% off'):'$'+(parseFloat(d.amount)||0).toFixed(2)+' off'}</div></div>
      <div style="display:flex;align-items:center;gap:10px"><span style="font-weight:700;color:var(--red)">−${fmtMoney(discountAmount(d, base))}</span><button onclick="removeDiscountFromDetail('${jobId}',${i})" style="background:none;border:none;color:#d03030;cursor:pointer;font-size:16px"><i class="ti ti-trash"></i></button></div>
    </div>`).join('')}
  </div>`;
}
function removeDiscountFromDetail(jobId, idx){ const d=getJobDiscounts(jobId); d.splice(idx,1); saveJobDiscounts(jobId,d); renderJobDiscountsCard(jobId); }
function openAddDiscount(jobId){
  _discType='fixed';
  const presets=getDiscountPresets();
  dynSheet('add-disc-sheet', `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px"><div style="font-weight:800;font-size:16px">Add discount</div><button onclick="closeDyn('add-disc-sheet')" style="background:none;border:none;color:var(--muted);font-size:22px;cursor:pointer">×</button></div>
    ${presets.length?`<div class="text-sm text-muted" style="margin-bottom:6px">Quick add</div><div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px">${presets.map((p,i)=>`<button class="btn btn-secondary btn-sm" onclick="addPresetDiscount('${jobId}',${i})">${p.label} · ${p.type==='percent'?p.amount+'%':'$'+p.amount}</button>`).join('')}</div>`:''}
    <div class="text-sm text-muted" style="margin-bottom:6px">Custom</div>
    <input class="form-input" id="dd-label" placeholder="Label (e.g. First-time customer)" style="margin-bottom:8px">
    <div style="display:flex;gap:8px;margin-bottom:8px">
      <button type="button" id="disc-type-fixed" class="btn btn-sm" style="flex:1;background:var(--primary);color:#fff;border:none" onclick="setDiscType('fixed')">$ Amount</button>
      <button type="button" id="disc-type-percent" class="btn btn-sm btn-outline" style="flex:1" onclick="setDiscType('percent')">% Percent</button>
    </div>
    <input class="form-input" id="dd-amount" type="number" inputmode="decimal" placeholder="0" style="margin-bottom:14px">
    <button class="btn btn-primary btn-full" onclick="addDiscountFromDetail('${jobId}')"><i class="ti ti-plus"></i> Add discount</button>`, 230);
}
function addDiscountFromDetail(jobId){
  const label=(document.getElementById('dd-label')?.value||'').trim()||'Discount';
  const amount=parseFloat(document.getElementById('dd-amount')?.value)||0;
  if(!amount){ toast('⚠️ Enter a discount amount'); return; }
  const d=getJobDiscounts(jobId); d.push({label, amount, type:_discType}); saveJobDiscounts(jobId,d);
  closeDyn('add-disc-sheet'); renderJobDiscountsCard(jobId);
}
function addPresetDiscount(jobId, idx){
  const p=getDiscountPresets()[idx]; if(!p) return;
  const d=getJobDiscounts(jobId); d.push({label:p.label, amount:p.amount, type:p.type}); saveJobDiscounts(jobId,d);
  closeDyn('add-disc-sheet'); renderJobDiscountsCard(jobId);
}

// ── Job cost items on the job detail ──
function renderJobCostsCard(jobId){
  const el=document.getElementById('job-costs'); if(!el) return;
  const costs=getJobCostItems(jobId); const total=jobCostTotal(jobId);
  el.innerHTML=`<div class="card" style="margin-bottom:10px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:${costs.length?'8px':'0'}">
      <div style="font-weight:700"><i class="ti ti-businessplan" style="color:var(--primary)"></i> Job costs</div>
      <button class="btn btn-secondary btn-sm" onclick="openAddCost('${jobId}')"><i class="ti ti-plus"></i> Add</button>
    </div>
    ${costs.map((c,i)=>{ const qty=parseInt(c.qty)||1; const each=parseFloat(c.price)||0; return `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-top:1px solid var(--border)">
      <div style="min-width:0;flex:1"><div style="font-weight:600;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.name||'Item'}</div><div class="text-sm text-muted">${fmtMoney(each)} each</div></div>
      <div style="display:flex;align-items:center;gap:8px">
        <div style="display:flex;align-items:center;gap:6px">
          <button onclick="changeCostQty('${jobId}',${i},-1)" style="width:26px;height:26px;border-radius:7px;border:1px solid var(--border);background:#fff;cursor:pointer;font-size:16px;line-height:1">−</button>
          <span style="min-width:18px;text-align:center;font-weight:700">${qty}</span>
          <button onclick="changeCostQty('${jobId}',${i},1)" style="width:26px;height:26px;border-radius:7px;border:1px solid var(--border);background:#fff;cursor:pointer;font-size:16px;line-height:1">+</button>
        </div>
        <span style="font-weight:700;min-width:62px;text-align:right">${fmtMoney(each*qty)}</span>
        <button onclick="removeCostFromDetail('${jobId}',${i})" style="background:none;border:none;color:#d03030;cursor:pointer;font-size:16px"><i class="ti ti-trash"></i></button>
      </div>
    </div>`; }).join('')}
    ${costs.length?`<div style="display:flex;justify-content:space-between;padding-top:10px;border-top:2px solid var(--border);margin-top:4px;font-weight:800"><span>Total cost</span><span>${fmtMoney(total)}</span></div>`:'<div class="text-sm text-muted" style="margin-top:6px">Track materials — bags, tarps, supplies, etc.</div>'}
  </div>`;
}
function changeCostQty(jobId, idx, delta){ const c=getJobCostItems(jobId); if(!c[idx]) return; c[idx].qty=Math.max(1,(parseInt(c[idx].qty)||1)+delta); saveJobCostItems(jobId,c); renderJobCostsCard(jobId); }
function removeCostFromDetail(jobId, idx){ const c=getJobCostItems(jobId); c.splice(idx,1); saveJobCostItems(jobId,c); renderJobCostsCard(jobId); }
function openAddCost(jobId){
  const presets=getCostItemPresets();
  dynSheet('add-cost-sheet', `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px"><div style="font-weight:800;font-size:16px">Add job cost</div><button onclick="closeDyn('add-cost-sheet')" style="background:none;border:none;color:var(--muted);font-size:22px;cursor:pointer">×</button></div>
    ${presets.length?`<div class="text-sm text-muted" style="margin-bottom:6px">Quick add</div><div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px">${presets.map((p,i)=>`<button class="btn btn-secondary btn-sm" onclick="addPresetCost('${jobId}',${i})">${p.name} · $${p.price}</button>`).join('')}</div>`:''}
    <div class="text-sm text-muted" style="margin-bottom:6px">Custom</div>
    <input class="form-input" id="dc-name" placeholder="Item (e.g. Garbage bags)" style="margin-bottom:8px">
    <div style="display:flex;gap:8px;margin-bottom:14px">
      <div style="flex:1"><label class="text-sm text-muted" style="display:block;margin-bottom:4px">Cost each</label><input class="form-input" id="dc-price" type="number" inputmode="decimal" placeholder="$"></div>
      <div style="width:90px"><label class="text-sm text-muted" style="display:block;margin-bottom:4px">Qty</label><input class="form-input" id="dc-qty" type="number" inputmode="numeric" value="1" min="1"></div>
    </div>
    <button class="btn btn-primary btn-full" onclick="addCostFromDetail('${jobId}')"><i class="ti ti-plus"></i> Add cost</button>`, 230);
}
function addCostFromDetail(jobId){
  const name=(document.getElementById('dc-name')?.value||'').trim();
  const price=parseFloat(document.getElementById('dc-price')?.value)||0;
  const qty=Math.max(1, parseInt(document.getElementById('dc-qty')?.value)||1);
  if(!name){ toast('⚠️ Enter an item name'); return; }
  const c=getJobCostItems(jobId); c.push({name, price, qty}); saveJobCostItems(jobId,c);
  closeDyn('add-cost-sheet'); renderJobCostsCard(jobId);
}
function addPresetCost(jobId, idx){ const p=getCostItemPresets()[idx]; if(!p) return; const c=getJobCostItems(jobId); c.push({name:p.name, price:p.price, qty:1}); saveJobCostItems(jobId,c); closeDyn('add-cost-sheet'); renderJobCostsCard(jobId); }

// ── Settings: manage preset discounts + preset cost items ──
function openDiscountsCostsManager(){ renderDCManager(); }
function renderDCManager(){
  const discs=getDiscountPresets(), costs=getCostItemPresets();
  dynSheet('dc-mgr-sheet', `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px"><div style="font-weight:800;font-size:17px">Discounts & Job Costs</div><button onclick="closeDyn('dc-mgr-sheet')" style="background:none;border:none;color:var(--muted);font-size:22px;cursor:pointer">×</button></div>
    <div class="section-label" style="margin-top:0">Preset discounts</div>
    ${discs.map((p,i)=>`<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><div style="flex:1"><div style="font-weight:600">${p.label}</div><div class="text-sm text-muted">${p.type==='percent'?p.amount+'%':'$'+p.amount}</div></div><button onclick="delDiscountPreset(${i})" style="background:none;border:none;color:#d03030;cursor:pointer;font-size:16px"><i class="ti ti-trash"></i></button></div>`).join('')||'<div class="text-sm text-muted" style="margin-bottom:8px">None yet.</div>'}
    <div style="display:flex;gap:6px;margin-bottom:6px"><input class="form-input" id="np-disc-label" placeholder="Label" style="flex:1"><input class="form-input" id="np-disc-amount" type="number" placeholder="Amt" style="width:72px"></div>
    <div style="display:flex;gap:6px;margin-bottom:18px"><select class="form-input" id="np-disc-type" style="flex:1"><option value="fixed">$ Amount</option><option value="percent">% Percent</option></select><button class="btn btn-secondary" onclick="addDiscountPreset()"><i class="ti ti-plus"></i> Add</button></div>
    <div class="section-label">Job cost items</div>
    ${costs.map((p,i)=>`<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><div style="flex:1"><div style="font-weight:600">${p.name}</div><div class="text-sm text-muted">$${p.price}</div></div><button onclick="delCostPreset(${i})" style="background:none;border:none;color:#d03030;cursor:pointer;font-size:16px"><i class="ti ti-trash"></i></button></div>`).join('')||'<div class="text-sm text-muted" style="margin-bottom:8px">None yet.</div>'}
    <div style="display:flex;gap:6px;margin-bottom:6px"><input class="form-input" id="np-cost-name" placeholder="Item (e.g. Tarps)" style="flex:1"><input class="form-input" id="np-cost-price" type="number" placeholder="$" style="width:72px"></div>
    <button class="btn btn-secondary btn-full" onclick="addCostPreset()"><i class="ti ti-plus"></i> Add cost item</button>`, 230);
}
function addDiscountPreset(){ const label=(document.getElementById('np-disc-label')?.value||'').trim(); const amount=parseFloat(document.getElementById('np-disc-amount')?.value)||0; const type=document.getElementById('np-disc-type')?.value||'fixed'; if(!label||!amount){ toast('⚠️ Enter a label and amount'); return; } const p=getDiscountPresets(); p.push({label, amount, type}); saveDiscountPresets(p); renderDCManager(); }
function delDiscountPreset(i){ const p=getDiscountPresets(); p.splice(i,1); saveDiscountPresets(p); renderDCManager(); }
function addCostPreset(){ const name=(document.getElementById('np-cost-name')?.value||'').trim(); const price=parseFloat(document.getElementById('np-cost-price')?.value)||0; if(!name){ toast('⚠️ Enter an item name'); return; } const p=getCostItemPresets(); p.push({name, price}); saveCostItemPresets(p); renderDCManager(); }
function delCostPreset(i){ const p=getCostItemPresets(); p.splice(i,1); saveCostItemPresets(p); renderDCManager(); }
function openTakePayment(jobId){
  const m = jobPayMath(jobId);
  document.getElementById('pm-job-id').value = jobId;
  const amt = document.getElementById('pm-amount');
  const editedDue = document.getElementById('jd-pay-amount-due');
  let val = m.due > 0.005 ? m.due : (m.total > 0 ? m.total : 0);
  if (editedDue && editedDue.value !== '') { const n = parseFloat(editedDue.value); if (!isNaN(n) && n >= 0) val = n; }
  if (amt) amt.value = val.toFixed(2);
  document.getElementById('modal-take-payment').classList.add('open');
}

async function confirmPayment(method){
  const jobId  = document.getElementById('pm-job-id').value;
  const amount = parseFloat(document.getElementById('pm-amount')?.value) || 0;
  if (!amount) { toast('⚠️ Enter a payment amount'); return; }
  const p = getJobPayments(jobId); p.push({ amount, method, date: toISO(new Date()) }); saveJobPayments(jobId, p);
  const m = jobPayMath(jobId);
  const j = getJob(jobId);
  if (j) { j.paid = m.due <= 0.005; if (j.payment === 'invoice') j.payment = method; saveJob(j); if (window._useCloud && window.CloudDS) { try { CloudDS.saveJob(j).catch(()=>{}); } catch(e){} } }
  closeModal('modal-take-payment');
  renderJobPay(jobId);
  toast(`<i class="ti ti-check" style="color:#4ade80"></i> ${fmtMoney(amount)} — ${payMethodLabel(method)} recorded`);
  try { await sendPaymentReceipt(jobId, amount, method); } catch(e){ console.warn('Receipt failed:', e); }
}

async function sendPaymentReceipt(jobId, amount, method){
  const j = getJob(jobId); if (!j) return;
  const c = getCustomer(j.customerId); if (!c) return;
  const m = jobPayMath(jobId);
  const p = getProfile();
  const company = p.company || p.businessName || p.name || 'our team';
  const balance = Math.max(0, m.due);
  const msg = `Hi ${c.firstName||'there'}, thanks for your payment of ${fmtMoney(amount)} (${payMethodLabel(method)}) to ${company}. `
    + (balance > 0.005 ? `Remaining balance: ${fmtMoney(balance)}.` : `Your balance is paid in full — thank you!`);
  let sent = false;
  try { if (c.phone) { await sendSMS(c.phone, msg); sent = true; } } catch(e){ console.warn('SMS receipt:', e); }
  try { if (c.email) { await sendEmailJS(c.email, fullName(c), `Payment Receipt — ${company}`, msg); sent = true; } } catch(e){ console.warn('Email receipt:', e); }
  if (sent) toast('<i class="ti ti-mail" style="color:#4ade80"></i> Receipt sent to ' + (c.firstName || 'customer'));
}
function removeJobPayment(jobId, idx){
  const p=getJobPayments(jobId); p.splice(idx,1); saveJobPayments(jobId,p);
  const m=jobPayMath(jobId); const j=getJob(jobId); if(j){ j.paid=m.due<=0.005; saveJob(j); }
  renderJobPay(jobId);
}

function getJobLineItems(jobId) {
  return DS.get('lineitems_' + jobId, []);
}

function saveJobLineItems(jobId, items) {
  DS.set('lineitems_' + jobId, items);
  pushJobExtras(jobId);
}

function lineItemTotal(items) {
  return items.reduce((s, i) => s + (i.price * i.qty), 0);
}

function syncJobPriceFromItems(jobId) {
  const items = getJobLineItems(jobId);
  const total = lineItemTotal(items);
  const j = getJob(jobId); if (!j) return total;
  j.price = total;
  saveJob(j);
  if (window._useCloud && window.CloudDS) { try { CloudDS.saveJob(j).catch(()=>{}); } catch(e){} }
  return total;
}

function renderLineItems(jobId) {
  const container = document.getElementById('job-line-items');
  if (!container) return;
  const items = getJobLineItems(jobId);
  const total = lineItemTotal(items);

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <div style="font-size:12px;font-weight:700;color:var(--hint);letter-spacing:0.5px">ITEMS</div>
      <button class="btn btn-primary btn-sm" onclick="openAddItemModal('${jobId}')"><i class="ti ti-plus"></i> Add Item</button>
    </div>
    ${items.length ? `
    <div class="card-flat" style="margin-bottom:0">
      ${items.map((item, idx) => `
        <div style="display:flex;align-items:center;gap:10px;padding:11px 14px;border-bottom:0.5px solid var(--border)">
          <div style="flex:1;min-width:0">
            <div style="font-size:14px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${item.label}</div>
            <div style="font-size:11px;color:var(--muted)">${fmtMoney(item.price)} each${item.description?` · ${item.description}`:''}</div>
          </div>
          <div style="display:flex;align-items:center;gap:4px;flex-shrink:0">
            <button onclick="changeLineItemQty('${jobId}',${idx},-1)" style="width:26px;height:26px;border-radius:50%;background:var(--bg);border:1px solid var(--border);cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center">−</button>
            <span style="font-size:13px;font-weight:700;min-width:18px;text-align:center">${item.qty}</span>
            <button onclick="changeLineItemQty('${jobId}',${idx},1)" style="width:26px;height:26px;border-radius:50%;background:var(--bg);border:1px solid var(--border);cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center">+</button>
          </div>
          <div style="font-weight:800;color:var(--primary);min-width:60px;text-align:right;flex-shrink:0">${fmtMoney(item.price*item.qty)}</div>
          <button onclick="removeLineItem('${jobId}',${idx})" title="Remove item" style="width:32px;height:32px;border-radius:8px;background:var(--red-lt);border:none;cursor:pointer;color:var(--red);font-size:16px;display:flex;align-items:center;justify-content:center;flex-shrink:0"><i class="ti ti-trash"></i></button>
        </div>`).join('')}
      <div style="display:flex;justify-content:space-between;padding:13px 14px;background:var(--primary-lt)">
        <span style="font-weight:800">Job Total</span>
        <span style="font-size:18px;font-weight:900;color:var(--primary)">${fmtMoney(total)}</span>
      </div>
    </div>` : `
    <div style="text-align:center;padding:18px;background:#f7f8fa;border-radius:10px;color:var(--hint);font-size:13px">
      No items yet — tap <b>Add Item</b> to build the price.
    </div>`}`;
}

function openAddItemModal(jobId) {
  document.getElementById('ai-job-id').value = jobId;
  ['ai-name','ai-price','ai-cost','ai-desc'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const q = document.getElementById('ai-qty'); if (q) q.value = '1';
  const pb = document.getElementById('ai-pb'); if (pb) pb.checked = false;
  const tx = document.getElementById('ai-tax'); if (tx) tx.checked = false;
  const book = getPriceBook();
  const cats = [...new Set(book.map(i => i.category || 'Other'))];
  const sel = document.getElementById('ai-pricebook');
  if (sel) sel.innerHTML = `<option value="">Choose a saved item…</option>` +
    cats.map(cat => `<optgroup label="${cat}">` +
      book.filter(i => (i.category||'Other') === cat).map(i =>
        `<option value="${i.id}" data-label="${i.label}" data-price="${i.price}">${i.label} — ${fmtMoney(i.price)}</option>`
      ).join('') + `</optgroup>`).join('');
  document.getElementById('modal-additem').classList.add('open');
  setTimeout(() => document.getElementById('ai-name')?.focus(), 80);
}

function aiFromPricebook() {
  const sel = document.getElementById('ai-pricebook'); if (!sel) return;
  const opt = sel.options[sel.selectedIndex];
  if (opt && opt.value) {
    const nm = document.getElementById('ai-name'); if (nm) nm.value = opt.dataset.label || '';
    const pr = document.getElementById('ai-price'); if (pr) pr.value = opt.dataset.price || '';
  }
}

async function submitAddItem() {
  const jobId   = document.getElementById('ai-job-id').value;
  const name    = (document.getElementById('ai-name')?.value || '').trim();
  const price   = parseFloat(document.getElementById('ai-price')?.value) || 0;
  const qty     = parseInt(document.getElementById('ai-qty')?.value) || 1;
  const cost    = parseFloat(document.getElementById('ai-cost')?.value) || 0;
  const desc    = (document.getElementById('ai-desc')?.value || '').trim();
  const toPb    = document.getElementById('ai-pb')?.checked;
  const taxable = document.getElementById('ai-tax')?.checked;
  if (!name)  { toast('⚠️ Enter an item name'); return; }
  if (!price) { toast('⚠️ Enter a price'); return; }
  const pbSel     = document.getElementById('ai-pricebook');
  const serviceId = (pbSel && pbSel.value) ? pbSel.value : '';
  const items = getJobLineItems(jobId);
  items.push({ serviceId, label: name, price, qty, cost, description: desc, taxable: !!taxable });
  saveJobLineItems(jobId, items);
  syncJobPriceFromItems(jobId);
  if (toPb) {
    const book = getPriceBook();
    if (!book.find(i => (i.label||'').toLowerCase() === name.toLowerCase())) {
      const id = 'PB-' + Date.now();
      book.push({ id, service: id, label: name, price, category: 'Custom Items', cost });
      savePriceBook(book);
    }
  }
  closeModal('modal-additem');
  renderLineItems(jobId);
  toast(`<i class="ti ti-check" style="color:#4ade80"></i> ${name} × ${qty} added`);
}

function changeLineItemQty(jobId, idx, delta) {
  const items = getJobLineItems(jobId);
  if (!items[idx]) return;
  items[idx].qty = Math.max(1, (items[idx].qty||1) + delta);
  saveJobLineItems(jobId, items);
  syncJobPriceFromItems(jobId);
  renderLineItems(jobId);
}

function removeLineItem(jobId, idx) {
  const items = getJobLineItems(jobId);
  items.splice(idx, 1);
  saveJobLineItems(jobId, items);
  syncJobPriceFromItems(jobId);
  renderLineItems(jobId);
}

function saveJobPayment(jobId) {
  const j = getJob(jobId); if (!j) return;
  const sel = document.getElementById('jd-payment');
  if (sel) j.payment = sel.value;
  saveJob(j);
  if (window._useCloud && window.CloudDS) { try { CloudDS.saveJob(j).catch(()=>{}); } catch(e){} }
}
