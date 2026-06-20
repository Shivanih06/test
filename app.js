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
  selectedDay: new Date().toISOString().slice(0,10),
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
async function asyncDeleteCustomer(id){ return window._useCloud ? CloudDS.deleteCustomer(id) : deleteCustomer(id); }
async function asyncDeleteJob(id)   { return window._useCloud ? CloudDS.deleteJob(id)   : deleteJob(id); }
async function asyncLogMessage(m)   { return window._useCloud ? CloudDS.logMessage(m)   : logMessage(m); }

function seedData() {
  if (DS.get('seeded')) return;
  const today = new Date().toISOString().slice(0,10);
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
const fmt12 = t => { const [h,m]=t.split(':').map(Number); return `${h%12||12}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}`; };
const fmtDate = s => new Date(s+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
const fmtMoney = n => '$'+Number(n).toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:0});
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
  admin:   ['dashboard','jobs','customers','invoices','estimates','team','reports','rewards','settings'],
  manager: ['dashboard','jobs','customers','invoices','estimates','team','rewards'],
  tech:    ['dashboard','jobs','team'],
};
let PREVIEW_ROLE = null; // admin can preview other roles without changing their real role
function myRole()        { return PREVIEW_ROLE || window.MY_ROLE || 'admin'; }
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

function showScreen(name) {
  if (!canSee(name)) name = 'dashboard';
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('screen-'+name)?.classList.add('active');
  document.getElementById('nav-'+name)?.classList.add('active');
  State.screen = name;
  applyRoleGating();
  renderScreen(name);
}
function renderScreen(name) {
  ({dashboard:renderDashboard, jobs:renderJobs, customers:()=>renderCustomers(), invoices:()=>renderInvoices(), rewards:renderRewards, settings:renderSettings, team:renderTeamScreen, reports:renderReports, estimates:()=>renderEstimates()})[name]?.();
}

// ─── DASHBOARD ───────────────────────────────
function renderDashboard() {
  const today = new Date().toISOString().slice(0,10);
  const todayJobs = jobsForDate(today);
  const doneJobs  = todayJobs.filter(j => j.status==='done');
  const invs      = getInvoices();
  const todayRev  = invs.filter(i => i.date===today && i.status==='paid').reduce((s,i)=>s+invoiceTotal(i),0);
  const profile   = getProfile();

  // Header date
  document.getElementById('header-date').textContent =
    new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});

  // Hero stats
  document.getElementById('dash-hero-stats').innerHTML = `
    <div class="hero-stat"><div class="hero-stat-val">${fmtMoney(todayRev)}</div><div class="hero-stat-lbl">Today Revenue</div></div>
    <div class="hero-stat"><div class="hero-stat-val">${todayJobs.length}</div><div class="hero-stat-lbl">Jobs Today</div></div>
    <div class="hero-stat"><div class="hero-stat-val">${doneJobs.length}/${todayJobs.length}</div><div class="hero-stat-lbl">Complete</div></div>`;

  // AI insight
  const activeJob = todayJobs.find(j=>j.status==='inprogress');
  let aiMsg = todayJobs.length
    ? `You have <strong>${todayJobs.length} job${todayJobs.length!==1?'s':''}</strong> today. ${doneJobs.length} complete, ${todayJobs.length-doneJobs.length} remaining.`
    : `No jobs scheduled today. Tap <strong>Add Job</strong> to get started.`;
  if (activeJob) {
    const c = getCustomer(activeJob.customerId);
    aiMsg = `Active job with <strong>${c?fullName(c):'a customer'}</strong>. Tap <strong>On My Way</strong> to send them an update.`;
  }
  document.getElementById('dash-ai').innerHTML =
    `<div class="info-banner"><i class="ti ti-sparkles"></i><p>${aiMsg}</p></div>`;

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
        <div class="job-time">${fmt12(j.time)}${j.status==='inprogress'?' — NOW':''}</div>
        ${statusPill(j.status)}
      </div>
      <div class="job-name">${c?fullName(c):'Unknown Customer'}</div>
      <div class="job-addr"><i class="ti ti-map-pin" style="font-size:11px"></i> ${j.address}</div>
      <div class="job-type">${j.service}${j.price?` · ${fmtMoney(j.price)}`:''}</div>
      ${j.timeEnd?`<div class="text-sm text-muted"><i class="ti ti-clock" style="font-size:11px"></i> ${fmtArrivalWindow(j.time,j.timeEnd)}</div>`:''}
      ${j.techId?`<div class="text-sm" style="color:${getTechColor(j.techId)};font-weight:600"><i class="ti ti-user" style="font-size:11px"></i> ${getTechName(j.techId)}</div>`:''}
      <div class="job-actions">
        <button class="btn btn-primary btn-sm" onclick="openJobDetail('${j.id}')"><i class="ti ti-eye"></i> View Job</button>
        ${j.status!=='done'&&j.status!=='cancelled'?`<button class="btn btn-outline btn-sm" onclick="sendOMW('${j.id}')"><i class="ti ti-send"></i> On My Way</button>`:''}
        <button class="btn btn-secondary btn-sm" onclick="openJobInvoice('${j.id}')"><i class="ti ti-receipt"></i> Invoice</button>
      </div>
    </div>`;
  }).join('')
  : `<div class="empty-state"><i class="ti ti-calendar-off"></i><p>No jobs today.</p><button class="btn btn-primary" onclick="openNewJob()"><i class="ti ti-plus"></i> Schedule a Job</button></div>`;
}

// ─── JOBS ────────────────────────────────────
function renderJobs() {
  const date = State.selectedDay;
  const jobs = jobsForDate(date);
  const today = new Date();
  const weekSun = new Date(today); weekSun.setDate(today.getDate()-today.getDay());
  const days = Array.from({length:7},(_,i)=>{const d=new Date(weekSun);d.setDate(weekSun.getDate()+i);return d;});
  const dayNames=['SUN','MON','TUE','WED','THU','FRI','SAT'];

  document.getElementById('jobs-week-strip').innerHTML = days.map(d=>{
    const ds=d.toISOString().slice(0,10);
    const sel=ds===date?'selected':'';
    const dot=jobsForDate(ds).length>0&&ds!==date;
    return `<button class="day-chip ${sel}" onclick="selectDay('${ds}')">
      <div class="d-name">${dayNames[d.getDay()]}</div>
      <div class="d-num">${d.getDate()}</div>
      ${dot?`<div style="width:5px;height:5px;border-radius:50%;background:var(--primary);margin:2px auto 0"></div>`:'<div style="height:9px"></div>'}
    </button>`;
  }).join('');

  const hours = ['8','9','10','11','12','13','14','15','16','17','18','19'];
  document.getElementById('jobs-schedule').innerHTML = hours.map(h=>{
    const matched = jobs.filter(j=>j.time.startsWith(h.padStart(2,'0')+':'));
    if (!matched.length) return `<div class="sched-slot">
      <div class="sched-time">${fmt12(h+':00').replace(':00','')}</div>
      <div class="sched-bar" style="background:#f7f8fa;min-height:32px;display:flex;align-items:center"><span style="font-size:11px;color:#ccc">—</span></div>
    </div>`;
    return matched.map(j=>{
      const c=getCustomer(j.customerId);
      const bgBorder={done:`#e6f7ed;border-left:3px solid var(--green)`,inprogress:`#fef3e2;border-left:3px solid var(--orange)`,scheduled:`#e8f0fb;border-left:3px solid var(--primary)`};
      const txColor={done:'var(--green)',inprogress:'var(--orange)',scheduled:'var(--primary)'};
      return `<div class="sched-slot">
        <div class="sched-time">${fmt12(j.time)}</div>
        <div class="sched-bar" style="background:${bgBorder[j.status]||'#f0f2f5'};cursor:pointer" onclick="openJobDetail('${j.id}')">
          <div style="font-size:13px;font-weight:700;color:${txColor[j.status]||'var(--text)'}">${c?fullName(c):'?'}${j.status==='inprogress'?' ← ACTIVE':j.status==='done'?' ✓':''}</div>
          <div style="font-size:11px;color:var(--muted)">${j.service} · ${j.address.split(',')[0]}</div>
        </div>
      </div>`;
    }).join('');
  }).join('');

  document.getElementById('jobs-route').innerHTML = jobs.length ? `
    <div class="card mt-12">
      <div class="flex-between mb-8">
        <div style="font-weight:700">Route — ${fmtDate(date)}</div>
        <span class="pill pill-blue">${jobs.length} stop${jobs.length!==1?'s':''}</span>
      </div>
      <div class="timeline">
        ${jobs.map(j=>{
          const c=getCustomer(j.customerId);
          const dotCls=j.status==='done'?'done':j.status==='scheduled'?'pending':'';
          return `<div class="tl-item"><div class="tl-dot ${dotCls}"></div>
            <div class="tl-time">${fmt12(j.time)}</div>
            <div class="tl-label">${j.address}</div>
            <div class="tl-sub">${c?fullName(c):''} · ${j.service}${j.price?` · ${fmtMoney(j.price)}`:''}</div>
          </div>`;
        }).join('')}
      </div>
    </div>` : `<div class="card" style="text-align:center;padding:24px;color:var(--muted)">No jobs on this day.</div>`;
}

function selectDay(d) { State.selectedDay=d; renderJobs(); }

// ─── CUSTOMERS ───────────────────────────────
let custFilter='';
function renderCustomers(filter) {
  if(filter!==undefined) custFilter=filter.toLowerCase();
  let custs=getCustomers();
  if(custFilter) custs=custs.filter(c=>fullName(c).toLowerCase().includes(custFilter)||c.phone.includes(custFilter)||c.email.toLowerCase().includes(custFilter));
  document.getElementById('customers-list').innerHTML = custs.length
    ? `<div class="card-flat">${custs.map(c=>{
        const tier=tierForPoints(c.points);
        return `<div class="card-inner-row" style="cursor:pointer" onclick="openCustomerDetail('${c.id}')">
          <div class="cust-avatar" style="${avatarStyle(c.id)}">${initials(c)}</div>
          <div style="flex:1">
            <div style="font-size:14px;font-weight:700">${fullName(c)}</div>
            <div class="text-sm text-muted">${c.jobs} job${c.jobs!==1?'s':''} · ${fmtPhone(c.phone)}</div>
          </div>
          <div><div class="cust-pts">${c.points.toLocaleString()} pts</div><div class="cust-tier" style="color:${tier.color}">${tier.name}</div></div>
        </div>`;
      }).join('')}</div>`
    : `<div class="empty-state"><i class="ti ti-users"></i><p>No customers found.</p></div>`;
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
      <div class="stat-card"><div class="stat-label">Total Spent</div><div class="stat-value">${fmtMoney(c.totalSpent)}</div></div>
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

function saveCustomerForm() {
  const firstName=document.getElementById('cf-first').value.trim();
  if(!firstName){toast('⚠️ First name required');return;}
  const id=State.editingCustomer||newId('c');
  const existing=State.editingCustomer?getCustomer(id):null;
  saveCustomer({
    id, firstName, lastName:document.getElementById('cf-last').value.trim(),
    phone:document.getElementById('cf-phone').value.replace(/\D/g,''),
    email:document.getElementById('cf-email').value.trim(),
    address:document.getElementById('cf-addr').value.trim(),
    notes:document.getElementById('cf-notes').value.trim(),
    clientType:  document.getElementById('cf-client-type')?.value || 'residential',
    leadSource:  document.getElementById('cf-lead-source')?.value || '',
    points:existing?.points||0, jobs:existing?.jobs||0,
    totalSpent:existing?.totalSpent||0, since:existing?.since||new Date().toISOString().slice(0,10),
  });
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
  const outstanding=allInvs.filter(i=>i.status==='unpaid').reduce((s,i)=>s+invoiceTotal(i),0);
  document.getElementById('inv-summary').innerHTML=`<div class="stats-grid">
    <div class="stat-card"><div class="stat-label">Total Invoiced</div><div class="stat-value">${fmtMoney(totalInv)}</div></div>
    <div class="stat-card"><div class="stat-label">Outstanding</div><div class="stat-value" style="color:var(--orange)">${fmtMoney(outstanding)}</div></div>
  </div>`;
  document.getElementById('inv-filters').innerHTML=['all','paid','unpaid','draft'].map(f=>
    `<button class="btn btn-sm ${invFilter===f?'btn-primary':'btn-secondary'}" onclick="renderInvoices('${f}')">${f.charAt(0).toUpperCase()+f.slice(1)}</button>`
  ).join('');
  document.getElementById('invoices-list').innerHTML=invs.length?invs.map(inv=>{
    const c=getCustomer(inv.customerId);
    const total=invoiceTotal(inv);
    return `<div class="card" style="cursor:pointer" onclick="openInvoiceDetail('${inv.id}')">
      <div class="flex-between">
        <div><div style="font-size:13px;font-weight:700">#${inv.id.toUpperCase()}</div><div class="text-sm text-muted">${c?fullName(c):'?'} · ${fmtDate(inv.date)}</div></div>
        <div class="text-right"><div style="font-size:17px;font-weight:800">${total>0?fmtMoney(total):'—'}</div>${invStatusPill(inv.status)}</div>
      </div>
      ${inv.status==='unpaid'?`<div class="btn-grid mt-8">
        <button class="btn btn-green btn-full btn-sm" onclick="event.stopPropagation();sendInvoiceToCustomer('${inv.id}')"><i class="ti ti-send"></i> Send</button>
        <button class="btn btn-primary btn-full btn-sm" onclick="event.stopPropagation();markPaid('${inv.id}')"><i class="ti ti-credit-card"></i> Mark Paid</button>
      </div>`:''}
    </div>`;
  }).join(''):`<div class="empty-state"><i class="ti ti-receipt-off"></i><p>No invoices found.</p></div>`;
}

function openInvoiceDetail(id) {
  const inv=getInvoice(id); if(!inv) return;
  const c=getCustomer(inv.customerId);
  const total=invoiceTotal(inv);
  document.getElementById('inv-detail-body').innerHTML=`
    <div class="flex-between mb-12">
      <div><div style="font-size:18px;font-weight:800">#${inv.id.toUpperCase()}</div><div class="text-sm text-muted">${fmtDate(inv.date)}</div></div>
      ${invStatusPill(inv.status)}
    </div>
    <div class="flex-between mb-12">
      <div><div class="text-sm text-muted">Customer</div><div style="font-weight:700">${c?fullName(c):'?'}</div></div>
      ${c?`<div class="text-right"><div class="text-sm text-muted">Phone</div><div style="font-weight:600;color:var(--primary)">${fmtPhone(c.phone)}</div></div>`:''}
    </div>
    <div class="card" style="background:#fafbfc;padding:0">
      <div style="padding:10px 14px;border-bottom:1px solid var(--border);font-size:11px;font-weight:700;color:var(--hint);letter-spacing:0.5px">LINE ITEMS</div>
      ${inv.items.map(item=>`<div class="inv-row" style="padding:10px 14px"><span>${item.desc}</span><span style="font-weight:600;color:${item.price<0?'var(--green)':''}">${item.price<0?'-'+fmtMoney(Math.abs(item.price)):fmtMoney(item.price)}</span></div>`).join('')}
      <div class="inv-row" style="padding:12px 14px;border-top:2px solid var(--border);background:#f5f6f8"><span style="font-weight:800">Total</span><span class="inv-total">${fmtMoney(total)}</span></div>
    </div>
    ${c&&c.points?`<div style="background:var(--orange-lt);border-radius:9px;padding:10px 14px;margin-top:10px;font-size:12px"><i class="ti ti-trophy" style="color:var(--orange);margin-right:4px"></i>${c.firstName} will earn <strong>${Math.max(0,total)} reward points</strong> — ${tierForPoints(c.points).name} tier</div>`:''}
    <div class="mt-12">
      ${inv.status==='unpaid'?`<div class="btn-grid"><button class="btn btn-primary btn-full" onclick="sendInvoiceToCustomer('${inv.id}');closeModal('modal-inv-detail')"><i class="ti ti-send"></i> Send Invoice</button><button class="btn btn-green btn-full" onclick="markPaid('${inv.id}');closeModal('modal-inv-detail')"><i class="ti ti-credit-card"></i> Mark Paid</button></div>`:''}
    </div>`;
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
  saveInvoice({id:newId('inv'),jobId,customerId:job?.customerId||'',date:new Date().toISOString().slice(0,10),items,status:'unpaid'});
  closeAllModals(); renderInvoices();
  toast('<i class="ti ti-check" style="color:#4ade80"></i> Invoice created');
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

    <div class="section-label">Your Profile</div>
    <div class="card">
      <div class="form-group"><label class="form-label">Full Name</label><input class="form-input" id="sp-name" value="${p.name}"></div>
      <div class="form-group"><label class="form-label">Company Name</label><input class="form-input" id="sp-company" value="${p.company}"></div>
      <div class="form-group"><label class="form-label">Your Phone</label><input class="form-input" id="sp-phone" value="${fmtPhone(p.phone)}"></div>
      <div class="form-group"><label class="form-label">Your Email</label><input class="form-input" id="sp-email" value="${p.email}"></div>
      <div class="form-group"><label class="form-label">Google Review Link</label><input class="form-input" id="sp-review-link" value="${p.googleReviewLink||''}" placeholder="https://g.page/r/YOUR-LINK/review"></div>
      <div class="form-group" style="margin-bottom:0"><label class="form-label">Google Maps API Key <span style="font-weight:400;color:var(--hint)">(for address autocomplete)</span></label><input class="form-input" id="sp-maps-key" value="${p.googleMapsKey||''}" placeholder="AIza..."></div>
    </div>

    <div class="section-label">💬 SMS Setup (Go High Level)</div>
    <div class="info-banner"><i class="ti ti-info-circle"></i><p>Uses your existing GHL account to send SMS. Get your API Key from <strong>GHL → Settings → API Keys</strong> and your Location ID from <strong>Settings → Business Info</strong>.</p></div>
    <div class="card">
      <div class="form-group"><label class="form-label">GHL API Key</label><input class="form-input" id="sp-ghl-key" type="password" value="${ghlKey}" placeholder="pit-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"></div>
      <div class="form-group"><label class="form-label">Location ID</label><input class="form-input" id="sp-ghl-loc" value="${ghlLoc}" placeholder="Your GHL Location ID"></div>
      <div class="form-group" style="margin-bottom:0"><label class="form-label">From Phone Number</label><input class="form-input" id="sp-ghl-from" value="${ghlFrom}" placeholder="8632926992"></div>
    </div>

    <div class="section-label">📧 Email Setup (EmailJS)</div>
    <div class="info-banner"><i class="ti ti-info-circle"></i><p>Sign up free at <strong>emailjs.com</strong> (200 emails/month free). Create a service + template with variables <strong>to_email</strong>, <strong>to_name</strong>, <strong>subject</strong>, <strong>message</strong>.</p></div>
    <div class="card">
      <div class="form-group"><label class="form-label">Public Key</label><input class="form-input" id="sp-ejs-pubkey" value="${p.emailjsPublicKey||''}" placeholder="Your EmailJS public key"></div>
      <div class="form-group"><label class="form-label">Service ID</label><input class="form-input" id="sp-ejs-service" value="${p.emailjsServiceId||''}" placeholder="service_xxxxxxx"></div>
      <div class="form-group"><label class="form-label">Template ID</label><input class="form-input" id="sp-ejs-template" value="${p.emailjsTemplateId||''}" placeholder="template_xxxxxxx"></div>
      <div class="form-group" style="margin-bottom:0"><label class="form-label">From Name</label><input class="form-input" id="sp-ejs-fromname" value="${p.emailjsFromName||p.company}" placeholder="Davis Junk Removal"></div>
    </div>

    <div class="section-label">Preferences</div>
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
    <div class="section-label">📍 Google My Business Auto-Posting</div>
    <div class="info-banner"><i class="ti ti-info-circle"></i><p>Posts automatically when you complete a job — once per day, picks the highest-value job and generates an AI caption. Set up your Google Client ID and access token to enable.</p></div>
    <div class="card">
      <div class="form-group"><label class="form-label">Google Client ID</label><input class="form-input" id="sp-gmb-client-id" value="${DS.get('gmb_client_id','')}" placeholder="xxxxxxxx.apps.googleusercontent.com"></div>
      <div class="form-group"><label class="form-label">Access Token <span style="font-weight:400;color:var(--hint)">(paste after authorizing)</span></label><input class="form-input" id="sp-gmb-token" type="password" value="${DS.get('gmb_access_token','')}" placeholder="ya29..."></div>
      <div class="form-group" style="margin-bottom:8px">
        <label class="form-label">GMB Location ID <span style="font-weight:400;color:var(--hint)">(just the number)</span></label>
        <input class="form-input" id="sp-gmb-location" value="${DS.get('gmb_location_name','')}" placeholder="4712407153014225709">
        <div style="font-size:11px;color:var(--hint);margin-top:4px">Find in Google Business Profile URL or contact support</div>
      </div>
      <div id="gmb-locations"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px">
        <button class="btn btn-outline btn-full btn-sm" onclick="startGMBAuth()"><i class="ti ti-brand-google"></i> Authorize</button>
        <button class="btn btn-secondary btn-full btn-sm" onclick="testGMBPost()"><i class="ti ti-send"></i> Test Post</button>
      </div>
    </div>
    ${renderPriceBookSettings()}
    <button class="btn btn-primary btn-full mt-12" onclick="saveSettings()"><i class="ti ti-check"></i> Save All Settings</button>
    <button class="btn btn-secondary btn-full mt-8" onclick="testMessaging()"><i class="ti ti-send"></i> Test SMS & Email</button>
    <button class="btn btn-secondary btn-full mt-8" style="color:var(--red)" onclick="if(confirm('Reset all data?')){DS.reset();location.reload()}"><i class="ti ti-refresh"></i> Reset App Data</button>
  `;
}

function saveSettings() {
  const p=getProfile();
  p.name=document.getElementById('sp-name').value.trim()||p.name;
  p.company=document.getElementById('sp-company').value.trim()||p.company;
  p.phone=document.getElementById('sp-phone').value.replace(/\D/g,'');
  p.email=document.getElementById('sp-email').value.trim();
  p.googleReviewLink=document.getElementById('sp-review-link').value.trim();
  p.googleMapsKey=document.getElementById('sp-maps-key').value.trim();
  if(p.googleMapsKey){ window.GOOGLE_MAPS_KEY=p.googleMapsKey; loadGooglePlaces(); }
  // Save GMB keys
  const gmbClientId = document.getElementById('sp-gmb-client-id')?.value.trim();
  const gmbToken    = document.getElementById('sp-gmb-token')?.value.trim();
  const gmbLocation = document.getElementById('sp-gmb-location')?.value.trim();
  if(gmbClientId) DS.set('gmb_client_id',    gmbClientId);
  if(gmbToken)    DS.set('gmb_access_token',  gmbToken);
  if(gmbLocation) DS.set('gmb_location_name', gmbLocation);
  // Save GHL keys separately so they're not in the profile blob
  const ghlKey=document.getElementById('sp-ghl-key').value.trim();
  const ghlLoc=document.getElementById('sp-ghl-loc').value.trim();
  const ghlFrom=document.getElementById('sp-ghl-from').value.replace(/\D/g,'');
  if(ghlKey)  DS.set('ghl_api_key', ghlKey);
  if(ghlLoc)  DS.set('ghl_location_id', ghlLoc);
  if(ghlFrom) DS.set('ghl_from_phone', ghlFrom);
  p.emailjsPublicKey=document.getElementById('sp-ejs-pubkey').value.trim();
  p.emailjsServiceId=document.getElementById('sp-ejs-service').value.trim();
  p.emailjsTemplateId=document.getElementById('sp-ejs-template').value.trim();
  p.emailjsFromName=document.getElementById('sp-ejs-fromname').value.trim()||p.company;
  p.smsReminders=document.getElementById('tog-sms').checked;
  p.autoInvoice=document.getElementById('tog-inv').checked;
  p.rewardsEnabled=document.getElementById('tog-rew').checked;
  p.arrivalWindow=parseInt(document.getElementById('sp-arrival-window')?.value||'2');
  p.defaultTech=document.getElementById('sp-default-tech')?.value||'';
  p.initials=p.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  DS.saveProfile(p);
  if (window._useCloud && window.CloudDS) {
    CloudDS.saveProfile(p).catch(e => console.warn('Cloud profile save failed:', e));
  }
  document.getElementById('header-avatar').textContent=p.initials;
  if(p.emailjsPublicKey) emailjs.init(p.emailjsPublicKey);
  toast('<i class="ti ti-check" style="color:#4ade80"></i> Settings saved');
}




// ─── JOB FORM ────────────────────────────────
function openNewJob() { openNewJobForCustomer(null); }
function openNewJobForCustomer(custId) {
  State.editingJob=null;
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
  document.getElementById('jf-date').value=new Date().toISOString().slice(0,10);
  // jf-time is now a select — populated by populateTimeSelects
  document.getElementById('jf-service').value='JR-Full';
  document.getElementById('jf-address').value=custId?(getCustomer(custId)?.address||''):'';
  document.getElementById('jf-price').value='';
  document.getElementById('jf-notes').value='';
  document.getElementById('jf-status').value='scheduled';
  closeModal('modal-cust-detail');
  openModal('modal-job-form');
  setTimeout(async () => {
    attachAutocomplete();
    await loadEmployeesForDropdown('jf-tech', '');
    populateTimeSelects('09:00', null);
    autoFillEndTime();
    selectServiceType('junk-removal');
    populatePriceSelect('jf-price-select', 'junk-removal');
    renderSchedulePeek(document.getElementById('jf-date')?.value);
  }, 150);
}

function openEditJob(id) {
  State.editingJob=id;
  const j=getJob(id); if(!j) return;
  const custs=getCustomers();
  document.getElementById('jf-title').textContent='Edit Job';
  // Pre-fill customer search with existing customer
  const editCust = getCustomer(j.customerId);
  const editSearchEl = document.getElementById('jf-customer-search');
  const editHiddenEl = document.getElementById('jf-customer-id');
  if (editSearchEl && editCust) editSearchEl.value = fullName(editCust);
  if (editHiddenEl) editHiddenEl.value = j.customerId || '';
  document.getElementById('jf-date').value=j.date;
  // jf-time is a select — populated in setTimeout below
  document.getElementById('jf-service').value=j.service||'junk-removal';
  document.getElementById('jf-address').value=j.address;
  document.getElementById('jf-price').value=j.price||'';
  document.getElementById('jf-notes').value=j.notes||'';
  if (document.getElementById('jf-status')) document.getElementById('jf-status').value = j.status||'scheduled';
  openModal('modal-job-form');
  setTimeout(async () => {
    await loadEmployeesForDropdown('jf-tech', j.techId||'');
    populateTimeSelects(j.time||'09:00', j.timeEnd||null);
    if (!j.timeEnd) autoFillEndTime();
    attachAutocomplete();
    const svcType = (j.service||'').startsWith('DR') ? 'dumpster-rental' : 'junk-removal';
    selectServiceType(svcType);
    populatePriceSelect('jf-price-select', svcType);
    renderSchedulePeek(j.date);
  }, 150);
}

async function saveJobForm() {
  const custId  = document.getElementById('jf-customer-id')?.value || '';
  const date    = document.getElementById('jf-date')?.value || '';
  const time    = document.getElementById('jf-time')?.value || '';
  const timeEnd = document.getElementById('jf-time-end')?.value || '';
  const techId  = document.getElementById('jf-tech')?.value || '';
  const service = document.getElementById('jf-service')?.value || 'junk-removal';
  const address = document.getElementById('jf-address')?.value.trim() || '';
  const price   = parseFloat(document.getElementById('jf-price')?.value) || 0;
  const notes   = document.getElementById('jf-notes')?.value.trim() || '';

  if (!custId) { toast('⚠️ Please select a customer'); return; }
  if (!date)   { toast('⚠️ Date required'); return; }
  if (!time)   { toast('⚠️ Select an arrival time'); return; }

  const id       = State.editingJob || newId('j');
  const existing = State.editingJob ? getJob(id) : null;

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
  };

  saveJob(j);

  if (!State.editingJob) {
    const c = getCustomer(custId);
    if (c) { c.jobs = (c.jobs||0)+1; saveCustomer(c); }
    try { await sendBookingConfirmation(j.id); } catch(e) { console.warn('SMS:', e); }
  }

  State.editingJob = null;
  closeAllModals();
  renderDashboard();
  if (State.screen === 'jobs') renderJobs();
  toast('<i class="ti ti-check" style="color:#4ade80"></i> Job scheduled!');
}

function deleteJobFromForm() {
  if (!State.editingJob) return;
  const j = getJob(State.editingJob);
  if (!j) return;
  const inv = getInvoices().find(i => i.jobId === j.id);
  const msg = `Delete this job?${inv ? '\n\nThis will also delete the linked invoice.' : ''}`;
  if (confirm(msg)) {
    // Delete job and all related records
    deleteJob(State.editingJob);
    // Delete linked invoice
    if (inv) DS.set('invoices', getInvoices().filter(i => i.jobId !== j.id));
    // Delete timer
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

  showScreen('dashboard');
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
  if (hash.includes('access_token=')) {
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
  window.history.replaceState(null, '', window.location.pathname);
  console.log('GMB auth code received — exchanging via Netlify function...');

  try {
    const resp = await fetch('/.netlify/functions/gmb-token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'exchange', code }),
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
      // Show manual fallback
      setTimeout(() => {
        toast('⚠️ Auto-auth failed — use OAuth Playground to get token manually', 6000);
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
  j.price   = parseFloat(document.getElementById('jd-price').value) || j.price;
  j.payment = document.getElementById('jd-payment').value;
  saveJob(j);
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
  // Save price if in detail view
  const priceEl = document.getElementById('jd-price');
  if (priceEl) j.price = parseFloat(priceEl.value) || j.price;
  saveJob(j);

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
      saveInvoice({ id:newId('inv'), jobId:j.id, customerId:j.customerId, date:j.date, items, status:'unpaid' });
    }
    // Award points if paid cash
    if (j.payment === 'cash' && c) {
      c.points = (c.points||0) + Math.max(0, Math.round(j.price||0));
      c.totalSpent = (c.totalSpent||0) + (j.price||0);
      saveCustomer(c);
    }
    // Send review request SMS — wrapped so failure doesn't block completion
    try { await sendReviewRequest(jobId); } catch(e) { console.warn('Review SMS error:', e); }
    // Trigger daily GMB post (fires async, won't block UI)
    setTimeout(() => handleDailyGMBPost(jobId).catch(e => console.warn('GMB post error:', e)), 2000);
    closeModal('modal-job-detail');
    toast('<i class="ti ti-check" style="color:#4ade80"></i> Job complete! Review request sent.');
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
function saveTimeEntry(entry) { DS.saveTimeEntry(entry); }

// ─── SEED EMPLOYEES ──────────────────────────
function seedEmployees() {
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

function startJobTimer(jobId) {
  const existing = getJobTimer(jobId);
  if (existing && existing.running) return; // already running
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
  toast('<i class="ti ti-player-play" style="color:#4ade80"></i> Timer started');
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

// Live timer tick — updates the display every second
let _timerInterval = null;
function startTimerDisplay(jobId) {
  clearInterval(_timerInterval);
  const el = document.getElementById('job-timer-display');
  if (!el) return;
  _timerInterval = setInterval(() => {
    const el2 = document.getElementById('job-timer-display');
    if (!el2) { clearInterval(_timerInterval); return; }
    el2.textContent = fmtElapsed(getElapsedMs(jobId));
  }, 1000);
}

// ─── UPDATED JOB DETAIL (with timer) ────────
// Override the openJobDetail from above
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

  document.getElementById('job-detail-body').innerHTML = `
    <!-- HCP-style top action bar -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
      <button class="btn btn-sm btn-full ${j.status==='inprogress'?'btn-primary':'btn-secondary'}"
        onclick="sendOMWFromDetail('${jobId}')" ${isDone?'disabled style="opacity:0.4"':''}>
        <i class="ti ti-send"></i><span style="font-size:11px">On My Way</span>
      </button>
      ${!timer||!timer.running ? `
        <button class="btn btn-sm btn-full btn-green" onclick="startJobTimer('${jobId}')" ${isDone?'disabled style="opacity:0.4"':''}>
          <i class="ti ti-player-play"></i><span style="font-size:11px">Start Time</span>
        </button>` : `
        <button class="btn btn-sm btn-full btn-orange" onclick="pauseJobTimer('${jobId}')">
          <i class="ti ti-player-pause"></i><span style="font-size:11px">Pause</span>
        </button>`}
    </div>
    ${!isDone ? `
    <div style="display:grid;grid-template-columns:1fr auto;gap:8px;margin-bottom:16px;align-items:center">
      <select class="form-input" id="jd-status-select" style="font-weight:700;font-size:13px">
        <option value="">— Update Job Status —</option>
        <option value="done">✅ Mark Complete</option>
        <option value="paused">⏸ Pause Job</option>
        <option value="cancelled">❌ Cancel Job</option>
        <option value="didnotgo">👎 Did Not Go Through</option>
      </select>
      <button class="btn btn-primary" onclick="applyJobStatus('${jobId}')">Apply</button>
    </div>` : `<div style="margin-bottom:16px">${statusPill(j.status)}</div>`}

    <!-- Timer display -->
    ${elapsed > 0 || (timer && timer.running) ? `
    <div style="background:${timer&&timer.running?`var(--primary-lt)`:`#f0f2f5`};border-radius:10px;padding:12px 16px;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between">
      <div>
        <div style="font-size:11px;font-weight:700;color:var(--muted);letter-spacing:0.5px">${timer&&timer.running?`TIME RUNNING`:`TIME PAUSED`}</div>
        <div id="job-timer-display" style="font-size:28px;font-weight:900;font-family:monospace" class="timer-val">${fmtElapsed(elapsed)}</div>
      </div>
      <i class="ti ti-clock" style="font-size:32px;color:${timer&&timer.running?`var(--primary)`:`var(--hint)`}"></i>
    </div>` : `
    <div style="background:#f0f2f5;border-radius:10px;padding:12px 16px;margin-bottom:12px;display:flex;align-items:center;gap:12px">
      <i class="ti ti-clock" style="font-size:24px;color:var(--hint)"></i>
      <div>
        <div style="font-size:12px;font-weight:700;color:var(--muted)">TIME TRACKING</div>
        <div style="font-size:12px;color:var(--hint)">Tap Start Time to begin tracking</div>
      </div>
    </div>`}

    <!-- Job status pill -->
    <div style="margin-bottom:12px">${statusPill(j.status)}</div>

    <!-- Customer -->
    <div class="card" style="margin-bottom:10px">
      <div style="display:flex;align-items:center;gap:12px">
        <div class="cust-avatar" style="${c?avatarStyle(c.id):'background:#f0f2f5'};width:46px;height:46px;font-size:16px">${c?initials(c):'?'}</div>
        <div style="flex:1">
          <div style="font-size:16px;font-weight:800">${c?fullName(c):'Unknown Customer'}</div>
          <div class="text-sm text-muted">${c?fmtPhone(c.phone):''}</div>
          <div class="text-sm text-muted">${c?.email||''}</div>
        </div>
        ${c?`<button class="btn btn-outline btn-sm" onclick="openSMSModal('${c.id}')"><i class="ti ti-message"></i></button>`:''}
      </div>
    </div>

    <!-- Job info -->
    <div class="card" style="margin-bottom:10px;padding:0">
      <div class="inv-row" style="padding:11px 14px"><span class="text-muted"><i class="ti ti-calendar"></i> Date</span><span style="font-weight:600">${fmtDate(j.date)}</span></div>
      <div class="inv-row" style="padding:11px 14px"><span class="text-muted"><i class="ti ti-clock"></i> Time</span><span style="font-weight:600">${fmt12(j.time)}</span></div>
      <div class="inv-row" style="padding:11px 14px"><span class="text-muted"><i class="ti ti-truck"></i> Service</span><span style="font-weight:600">${j.service}</span></div>
      <div class="inv-row" style="padding:11px 14px"><span class="text-muted"><i class="ti ti-map-pin"></i> Address</span><span style="font-size:12px;text-align:right;max-width:180px">${j.address}</span></div>
      ${j.notes?`<div class="inv-row" style="padding:11px 14px;border:none"><span class="text-muted"><i class="ti ti-notes"></i> Notes</span><span style="font-size:12px;text-align:right;max-width:180px">${j.notes}</span></div>`:'<div style="height:4px"></div>'}
    </div>

    <!-- Pricing -->
    ${!isDone ? `
    <div class="card" style="margin-bottom:10px">
      <div style="font-size:12px;font-weight:700;color:var(--hint);letter-spacing:0.5px;margin-bottom:10px">PRICING</div>
      <div class="form-group">
        <label class="form-label">Job Price ($)</label>
        <input type="number" class="form-input" id="jd-price" value="${j.price||''}" placeholder="Enter price">
      </div>
      <div class="form-group" style="margin-bottom:0">
        <label class="form-label">Payment Method</label>
        <select class="form-input" id="jd-payment">
          <option value="invoice" ${j.payment==='invoice'?'selected':''}>Invoice later</option>
          <option value="cash"    ${j.payment==='cash'?'selected':''}>Cash — on site</option>
          <option value="card"    ${j.payment==='card'?'selected':''}>Charge card on file</option>
          <option value="link"    ${j.payment==='link'?'selected':''}>Send payment link</option>
        </select>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
      <button class="btn btn-primary btn-full" onclick="saveJobPricing('${jobId}')"><i class="ti ti-device-floppy"></i> Save Price</button>
      <button class="btn btn-secondary btn-full" onclick="openJobInvoice('${jobId}')"><i class="ti ti-receipt"></i> Invoice</button>
    </div>
    <button class="btn btn-secondary btn-full" onclick="closeModal('modal-job-detail');openEditJob('${jobId}')"><i class="ti ti-edit"></i> Edit Job Details</button>
    ` : `
    <div class="card" style="background:var(--green-lt);border-color:var(--green)">
      <div style="display:flex;align-items:center;gap:10px">
        <i class="ti ti-circle-check" style="font-size:24px;color:var(--green)"></i>
        <div>
          <div style="font-weight:700;color:var(--green)">Job Complete</div>
          <div class="text-sm" style="color:var(--green)">${j.price?fmtMoney(j.price)+' · ':''} ${fmtElapsed(elapsed)||'No time recorded'}</div>
        </div>
      </div>
    </div>
    <button class="btn btn-secondary btn-full" onclick="openJobInvoice('${jobId}')"><i class="ti ti-receipt"></i> View Invoice</button>
    `}
    ${inv?`<div style="background:var(--green-lt);border-radius:9px;padding:10px 14px;margin-top:8px;font-size:12px;color:var(--green)">
      <i class="ti ti-receipt"></i> Invoice #${inv.id.toUpperCase()} — ${invStatusPill(inv.status)} ${fmtMoney(invoiceTotal(inv))}
    </div>`:''}
    <!-- Photos section -->
    <div id="job-photos-section"></div>
  `;

  State.editingJob = jobId;
  openModal('modal-job-detail');

  // Start live timer display if running
  if (timer && timer.running) startTimerDisplay(jobId);

  // Load photos and line items async
  setTimeout(() => {
    renderJobPhotos(jobId);
    if (!isDone) renderLineItems(jobId);
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

function clockIn(empId) {
  const entry = { id:newId('te'), empId, date:todayStr(), clockIn:new Date().toISOString(), clockOut:null, type:'work' };
  saveTimeEntry(entry);
  renderTeamScreen();
  toast(`<i class="ti ti-check" style="color:#4ade80"></i> Clocked in — ${new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}`);
}

function clockOut(empId, type) {
  const entries = getTimeEntries();
  const active  = entries.find(e => e.empId === empId && e.clockIn && !e.clockOut);
  if (!active) return;
  if (type === 'lunch') {
    active.clockOut = new Date().toISOString();
    active.type = 'work';
    saveTimeEntry(active);
    // Start lunch entry
    saveTimeEntry({ id:newId('te'), empId, date:todayStr(), clockIn:new Date().toISOString(), clockOut:null, type:'lunch' });
    renderTeamScreen();
    toast('<i class="ti ti-coffee" style="color:#f9c74f"></i> Clocked out for lunch — enjoy!');
  } else {
    active.clockOut = new Date().toISOString();
    active.type = 'work';
    saveTimeEntry(active);
    // Also close any lunch entry
    const lunch = entries.find(e => e.empId === empId && e.type === 'lunch' && !e.clockOut);
    if (lunch) { lunch.clockOut = new Date().toISOString(); saveTimeEntry(lunch); }
    renderTeamScreen();
    const emp = getEmployee(empId);
    toast(`<i class="ti ti-door-exit" style="color:#4ade80"></i> ${emp?emp.name.split(' ')[0]:'Employee'} clocked out. See you tomorrow!`);
  }
}




// ─── TIMESHEETS SCREEN ───────────────────────
async function renderTimesheets() {
  const employees = window._useCloud ? await CloudDS.getEmployees() : getEmployees();
  const entries   = getTimeEntries();
  const today     = new Date();

  // Build Sun–Sat week (current week)
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - today.getDay()); // back to Sunday
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
    ${employees.filter(e=>e.active).map(emp => {
      const empEntries = entries.filter(e => e.empId === emp.id && e.clockOut);
      const weekMs = empEntries.filter(e => {
        const d = new Date(e.clockIn);
        const diff = (today - d) / 86400000;
        return diff <= 7 && e.type !== 'lunch';
      }).reduce((s,e) => s + (new Date(e.clockOut) - new Date(e.clockIn)), 0);

      return `<div class="card" style="margin-bottom:10px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px${ myRole()==='admin' ? ';cursor:pointer' : '' }" ${ myRole()==='admin' ? `onclick="openEmployeeProfile('${emp.id}')"` : '' }>
          <div style="width:38px;height:38px;border-radius:50%;background:${emp.color};color:white;font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center">${emp.initials}</div>
          <div style="flex:1"><div style="font-weight:700">${emp.name}</div><div class="text-sm text-muted">${(ROLES[emp.role]||{}).name || emp.role}</div></div>
          <div style="text-align:right"><div style="font-size:18px;font-weight:800;color:var(--primary)">${fmtElapsed(weekMs)}</div><div class="text-sm text-muted">this week</div></div>
          ${ myRole()==='admin' ? `<i class="ti ti-chevron-right" style="color:var(--hint);font-size:18px"></i>` : '' }
        </div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px">
          ${days.map(d => {
            const ds = d.toISOString().slice(0,10);
            const dayMs = empEntries.filter(e => e.date === ds && e.type !== 'lunch')
              .reduce((s,e) => s + (new Date(e.clockOut) - new Date(e.clockIn)), 0);
            const hrs = dayMs / 3600000;
            const isToday = ds === todayStr();
            return `<div style="text-align:center">
              <div style="font-size:9px;font-weight:700;color:var(--hint)">${dayNames[d.getDay()]}</div>
              <div style="font-size:10px;font-weight:700;color:${isToday?'var(--primary)':'var(--text)'}">${d.getDate()}</div>
              <div style="height:32px;background:${hrs>0?`rgba(26,111,219,${Math.min(0.9,hrs/8*0.8+0.2)})`:'var(--bg)'};border-radius:5px;margin-top:3px;display:flex;align-items:center;justify-content:center">
                <span style="font-size:9px;font-weight:700;color:${hrs>0?'white':'var(--hint)'}">${hrs>0?hrs.toFixed(1):''}</span>
              </div>
            </div>`;
          }).join('')}
        </div>
        <div style="margin-top:10px">
          ${empEntries.filter(e => e.date === todayStr()).map(e => `
            <div style="font-size:11px;color:var(--muted);padding:3px 0;border-bottom:0.5px solid var(--border)">
              ${e.type==='lunch'?'🍽 Lunch':'⏱ Work'}: ${new Date(e.clockIn).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})} → ${e.clockOut?new Date(e.clockOut).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}):'ongoing'}
            </div>`).join('')}
        </div>
      </div>`;
    }).join('')}
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
  const emp = getCurrentEmployee();

  // Big clock in/out hero card
  const hero = document.getElementById('clockin-hero');
  if (hero) {
    if (emp) {
      const entries   = getTimeEntries();
      const todayEnts = entries.filter(e => e.empId === emp.id && e.date === todayStr());
      const active    = todayEnts.find(e => e.clockIn && !e.clockOut && e.type !== 'lunch');
      const onLunch   = todayEnts.find(e => e.type === 'lunch' && e.clockIn && !e.clockOut);
      const totalMs   = todayEnts.filter(e => e.clockOut && e.type !== 'lunch')
                          .reduce((s,e) => s + (new Date(e.clockOut) - new Date(e.clockIn)), 0);
      const statusTxt = active ? 'Clocked In' : onLunch ? 'On Lunch' : 'Clocked Out';
      const statusColor = active ? 'var(--green)' : onLunch ? 'var(--orange)' : 'var(--muted)';
      hero.innerHTML = `
        <div style="background:white;border:1px solid var(--border);border-radius:14px;padding:18px;margin-bottom:14px">
          <div style="display:flex;align-items:center;gap:14px;margin-bottom:14px">
            <div style="width:52px;height:52px;border-radius:50%;background:${emp.color};color:white;font-size:18px;font-weight:700;display:flex;align-items:center;justify-content:center">${emp.initials}</div>
            <div style="flex:1">
              <div style="font-size:17px;font-weight:800">${emp.name}</div>
              <div style="font-size:12px;font-weight:700;color:${statusColor};margin-top:2px">● ${statusTxt}</div>
            </div>
            ${totalMs > 0 ? `<div style="text-align:right">
              <div style="font-size:22px;font-weight:900;color:var(--primary)">${fmtElapsed(totalMs)}</div>
              <div style="font-size:10px;color:var(--muted)">today</div>
            </div>` : ''}
          </div>
          ${active ? `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
              <button class="btn btn-orange btn-full" onclick="clockOut('${emp.id}','lunch')">
                <i class="ti ti-coffee"></i> Lunch Break
              </button>
              <button class="btn btn-red btn-full" onclick="clockOut('${emp.id}','day')">
                <i class="ti ti-door-exit"></i> Clock Out
              </button>
            </div>` : onLunch ? `
            <button class="btn btn-green btn-full" onclick="clockIn('${emp.id}')">
              <i class="ti ti-player-play"></i> Clock Back In from Lunch
            </button>` : `
            <button class="btn btn-green btn-full" onclick="clockIn('${emp.id}')">
              <i class="ti ti-player-play"></i> Clock In
            </button>`}
        </div>`;
    } else {
      hero.innerHTML = `
        <div style="background:white;border:2px dashed var(--border-md);border-radius:14px;padding:24px;margin-bottom:14px;text-align:center">
          <i class="ti ti-user-circle" style="font-size:40px;color:var(--hint);display:block;margin-bottom:10px"></i>
          <div style="font-size:15px;font-weight:700;margin-bottom:6px">No one logged in</div>
          <div style="font-size:13px;color:var(--muted);margin-bottom:14px">Select your profile to clock in</div>
          <button class="btn btn-primary" onclick="openLoginModal()">
            <i class="ti ti-login"></i> Log In
          </button>
        </div>`;
    }
  }

  // Hide old banner — hero replaces it
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

  const hasGHL = !!(DS.get('ghl_api_key','') && DS.get('ghl_location_id','') && DS.get('ghl_from_phone',''));

  document.getElementById('conv-input').value = '';
  toast('<i class="ti ti-loader"></i> Sending…', 3000);

  if (hasGHL) {
    const ok = await sendGHLSMS(c.phone, body);
    if (ok) {
      logMessage({ id:newId('m'), customerId:c.id, text:body, sent:nowTime(), type:'sent', direction:'outbound', date:todayStr() });
      // Reload conversation
      const messages = await fetchGHLMessages(c.id);
      renderConversation(messages, c.id);
      toast(`<i class="ti ti-check" style="color:#4ade80"></i> Sent to ${c.firstName}`);
    }
  } else {
    logMessage({ id:newId('m'), customerId:c.id, text:body, sent:nowTime(), type:'sent', direction:'outbound', date:todayStr() });
    toast('Logged — add GHL keys in Settings to send for real');
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
    draft:    '<span class="pill pill-gray">Draft</span>',
    sent:     '<span class="pill pill-blue">Sent</span>',
    approved: '<span class="pill pill-green"><i class="ti ti-check"></i> Approved</span>',
    declined: '<span class="pill pill-red"><i class="ti ti-x"></i> Declined</span>',
    converted:'<span class="pill pill-green"><i class="ti ti-calendar"></i> Converted</span>',
  }[s] || '';
}

let estFilter = 'all';
function renderEstimates(filter) {
  if (filter) estFilter = filter;
  let ests = getEstimates();
  if (estFilter !== 'all') ests = ests.filter(e => e.status === estFilter);
  ests = ests.sort((a,b) => b.date.localeCompare(a.date));

  const all = getEstimates();
  const sent     = all.filter(e => e.status === 'sent' || e.status === 'approved' || e.status === 'declined' || e.status === 'converted').length;
  const approved = all.filter(e => e.status === 'approved' || e.status === 'converted').length;
  const convRate = sent ? Math.round((approved/sent)*100) : 0;

  document.getElementById('est-filters').innerHTML = ['all','draft','sent','approved','declined','converted'].map(f =>
    `<button class="btn btn-sm ${estFilter===f?'btn-primary':'btn-secondary'}" onclick="renderEstimates('${f}')">${f.charAt(0).toUpperCase()+f.slice(1)}</button>`
  ).join('');

  const listEl = document.getElementById('estimates-list');
  if (!listEl) return;

  listEl.innerHTML = `
    <div class="stats-grid mb-12">
      <div class="stat-card"><div class="stat-label">Total Estimates</div><div class="stat-value">${all.length}</div></div>
      <div class="stat-card"><div class="stat-label">Conversion Rate</div><div class="stat-value" style="color:var(--green)">${convRate}%</div></div>
    </div>
    ${ests.length ? ests.map(est => {
      const c = getCustomer(est.customerId);
      const tech = getTechName(est.techId);
      return `<div class="card" style="cursor:pointer" onclick="openEstimateDetail('${est.id}')">
        <div class="flex-between mb-8">
          <div>
            <div style="font-size:13px;font-weight:700">#${est.id.slice(-6).toUpperCase()}</div>
            <div class="text-sm text-muted">${c?fullName(c):'?'} · ${fmtDate(est.date)}</div>
          </div>
          <div class="text-right">
            <div style="font-size:17px;font-weight:800">${est.price?fmtMoney(est.price):'—'}</div>
            ${estStatusPill(est.status)}
          </div>
        </div>
        <div class="text-sm text-muted">${est.service}${tech?' · '+tech:''}</div>
        ${est.status==='sent'?`<div class="btn-grid mt-8">
          <button class="btn btn-green btn-full btn-sm" onclick="event.stopPropagation();updateEstimateStatus('${est.id}','approved')"><i class="ti ti-check"></i> Mark Approved</button>
          <button class="btn btn-secondary btn-full btn-sm" onclick="event.stopPropagation();updateEstimateStatus('${est.id}','declined')"><i class="ti ti-x"></i> Declined</button>
        </div>`:''}
        ${est.status==='approved'?`<button class="btn btn-primary btn-full btn-sm mt-8" onclick="event.stopPropagation();convertEstimateToJob('${est.id}')"><i class="ti ti-calendar-plus"></i> Convert to Job</button>`:''}
      </div>`;
    }).join('') : `<div class="empty-state"><i class="ti ti-file-off"></i><p>No estimates yet.</p></div>`}`;
}

function openNewEstimate() {
  const custs = getCustomers();
  // Clear customer search
  const estSearchEl = document.getElementById('ef-customer-search');
  const estHiddenEl = document.getElementById('ef-customer-id');
  if (estSearchEl) estSearchEl.value = '';
  if (estHiddenEl) estHiddenEl.value = '';
  document.getElementById('ef-date').value = new Date().toISOString().slice(0,10);
  document.getElementById('ef-price').value = '';
  document.getElementById('ef-notes').value = '';
  document.getElementById('ef-address').value = '';
  populateTechDropdown('ef-tech', '');
  openModal('modal-new-estimate');
  setTimeout(async () => {
    attachAutocomplete();
    setupAddressInput('ef-address', 'ef-address-suggestions');
    await loadEmployeesForDropdown('ef-tech', '');
    selectEstServiceType('junk-removal');
    populatePriceSelect('ef-price-select', 'junk-removal');
  }, 200);
}

async function saveEstimate() {
  const custId = document.getElementById('ef-customer-id')?.value || document.getElementById('ef-customer')?.value || '';
  if (!custId) { toast('⚠️ Select a customer'); return; }
  const est = {
    id:         newId('est'),
    customerId: custId,
    date:       document.getElementById('ef-date').value,
    validDays:  parseInt(document.getElementById('ef-valid').value) || 30,
    service:    document.getElementById('ef-service')?.value || 'junk-removal',
    address:    document.getElementById('ef-address').value.trim(),
    price:      parseFloat(document.getElementById('ef-price')?.value) || parseFloat(document.getElementById('ef-price-select')?.value) || 0,
    notes:      document.getElementById('ef-notes').value.trim(),
    techId:     document.getElementById('ef-tech').value,
    status:     'sent',
  };
  saveEstimateData(est);

  // Send estimate via SMS and Email
  const c = getCustomer(custId);
  const p = getProfile();
  if (c) {
    const expiryDate = new Date(est.date);
    expiryDate.setDate(expiryDate.getDate() + est.validDays);
    const smsText = `Hi ${c.firstName}! ${p.company} sent you an estimate for ${est.service}: ${fmtMoney(est.price)}. Valid until ${fmtDate(expiryDate.toISOString().slice(0,10))}. Reply YES to approve or NO to decline.`;
    const emailSubject = `Estimate from ${p.company} — ${fmtMoney(est.price)}`;
    const emailBody = `Hi ${c.firstName},\n\nThank you for considering ${p.company}!\n\nEstimate Details:\nService: ${est.service}\nAddress: ${est.address}\nPrice: ${fmtMoney(est.price)}\nValid Until: ${fmtDate(expiryDate.toISOString().slice(0,10))}\n${est.notes?'\nNotes: '+est.notes:''}\n\nReply to this email or call us to approve.\n\nThanks,\n${p.name}\n${p.company}\n${fmtPhone(p.phone)}`;

    const hasGHL = !!(DS.get('ghl_api_key','') && DS.get('ghl_location_id','') && DS.get('ghl_from_phone',''));
    if (hasGHL) await sendGHLSMS(c.phone, smsText);
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
      <span style="font-size:14px;font-weight:700">Estimate Total</span>
      <span style="font-size:24px;font-weight:900;color:var(--primary)">${fmtMoney(est.price)}</span>
    </div>
    ${est.status==='sent'?`
    <div class="btn-grid mb-8">
      <button class="btn btn-green btn-full" onclick="updateEstimateStatus('${est.id}','approved');closeModal('modal-est-detail')"><i class="ti ti-check"></i> Approved</button>
      <button class="btn btn-red btn-full" onclick="updateEstimateStatus('${est.id}','declined');closeModal('modal-est-detail')"><i class="ti ti-x"></i> Declined</button>
    </div>`:''}
    ${est.status==='approved'?`
    <button class="btn btn-primary btn-full mb-8" onclick="convertEstimateToJob('${est.id}')"><i class="ti ti-calendar-plus"></i> Convert to Job</button>`:''}
    <button class="btn btn-secondary btn-full" onclick="resendEstimate('${est.id}')"><i class="ti ti-send"></i> Resend Estimate</button>`;

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
  document.getElementById('jf-title').textContent = 'New Job (from Estimate)';
  // Pre-fill searchable customer field
  const convSearchEl = document.getElementById('jf-customer-search');
  const convHiddenEl = document.getElementById('jf-customer-id');
  if (convSearchEl && c) convSearchEl.value = fullName(c);
  if (convHiddenEl) convHiddenEl.value = est.customerId;
  document.getElementById('jf-date').value  = new Date().toISOString().slice(0,10);
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
  const hasGHL = !!(DS.get('ghl_api_key','') && DS.get('ghl_location_id','') && DS.get('ghl_from_phone',''));
  if (hasGHL) await sendGHLSMS(c.phone, smsText);
  toast(`<i class="ti ti-send" style="color:#4ade80"></i> Estimate resent to ${c.firstName}`);
}


// ═══════════════════════════════════════════════
//  SEARCHABLE CUSTOMER DROPDOWN
// ═══════════════════════════════════════════════

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

  const customers = getCustomers();
  const matched   = customers.filter(c => {
    const name  = fullName(c).toLowerCase();
    const phone = (c.phone || '').replace(/\D/g,'');
    const email = (c.email || '').toLowerCase();
    return name.includes(query) ||
           phone.includes(query.replace(/\D/g,'')) ||
           email.includes(query);
  }).slice(0, 8); // max 8 results

  if (!matched.length) {
    results.innerHTML = `
      <div style="padding:14px;text-align:center;color:var(--muted);font-size:13px">
        No customers found
        <div style="margin-top:8px">
          <button class="btn btn-outline btn-sm" onclick="openEditCustomer(null);closeAllModals()">
            <i class="ti ti-user-plus"></i> Add New Customer
          </button>
        </div>
      </div>`;
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
  }).join('');

  results.style.display = 'block';
}

function selectCustomerFromSearch(custId, inputId, resultsId, hiddenId) {
  const c       = getCustomer(custId);
  const input   = document.getElementById(inputId);
  const results = document.getElementById(resultsId);
  const hidden  = document.getElementById(hiddenId);
  if (!c || !input) return;

  input.value  = fullName(c);
  if (hidden) hidden.value = custId;
  results.style.display = 'none';

  // Auto-fill address in job/estimate form
  const addrField = document.getElementById('jf-address') || document.getElementById('ef-address');
  if (addrField && c.address) {
    addrField.value = c.address;
  }

  // Show customer tier info
  const tier = tierForPoints(c.points);
  const disc = tierDiscount(c.points);
  if (disc > 0) {
    toast(`<i class="ti ti-trophy" style="color:${tier.color}"></i> ${c.firstName} is ${tier.name} — ${(disc*100).toFixed(0)}% discount auto-applied`);
  }
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
}

function populatePriceSelect(selectId, serviceType) {
  const el   = document.getElementById(selectId);
  if (!el) return;
  const book = getPriceBook();
  const cat  = serviceType === 'dumpster-rental' ? 'Dumpster Rental' : 'Junk Removal';
  const items = book.filter(i => i.category === cat || i.category === 'Extra Charge Items');
  el.innerHTML = `<option value="">Select price (optional)…</option>` +
    `<optgroup label="${cat}">` +
    items.filter(i => i.category === cat).map(i =>
      `<option value="${i.price}" data-label="${i.label}">${i.label} — ${fmtMoney(i.price)}</option>`
    ).join('') + `</optgroup>` +
    (serviceType !== 'dumpster-rental' ? `<optgroup label="Extra Charge Items">` +
    items.filter(i => i.category === 'Extra Charge Items').map(i =>
      `<option value="${i.price}" data-label="${i.label}">${i.label} — ${fmtMoney(i.price)}</option>`
    ).join('') + `</optgroup>` : '');
}

function applyPriceFromSelect() {
  const sel = document.getElementById('jf-price-select');
  const hidden = document.getElementById('jf-price');
  if (!sel || !hidden) return;
  hidden.value = sel.value || '';
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
      const tech = getTechName(j.techId);
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


function getPriceBook() {
  return DS.get('price_book', DEFAULT_PRICE_BOOK);
}

function savePriceBook(book) {
  DS.set('price_book', book);
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
  const book = getPriceBook();
  return `
    <div class="section-label">Price Book</div>
    <div class="info-banner" style="margin-bottom:12px">
      <i class="ti ti-info-circle"></i>
      <p>These prices auto-fill when you select a service. Edit them to match your rates.</p>
    </div>
    <div id="pb-settings-list">
      ${book.map((item,i) => `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <div style="flex:1;font-size:13px;font-weight:600">${item.label}</div>
          <input type="number" class="form-input" style="width:90px;text-align:right"
            id="pb-price-${i}" value="${item.price}">
        </div>`).join('')}
    </div>
    <button class="btn btn-primary btn-full mt-8" onclick="savePriceBookSettings()">
      <i class="ti ti-check"></i> Save Price Book
    </button>`;
}

function savePriceBookSettings() {
  const book = getPriceBook();
  book.forEach((item, i) => {
    const el = document.getElementById(`pb-price-${i}`);
    if (el) item.price = parseFloat(el.value) || item.price;
  });
  savePriceBook(book);
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
  renderTeamScreen();
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

  renderTeamScreen();
  toast(`<i class="ti ti-check" style="color:#4ade80"></i> ${emp.name} removed`);
}


//  LINE ITEMS
// ═══════════════════════════════════════════════

function getJobLineItems(jobId) {
  return DS.get('lineitems_' + jobId, []);
}

function saveJobLineItems(jobId, items) {
  DS.set('lineitems_' + jobId, items);
}

function lineItemTotal(items) {
  return items.reduce((s, i) => s + (i.price * i.qty), 0);
}

function renderLineItems(jobId) {
  const container = document.getElementById('job-line-items');
  if (!container) return;
  const items    = getJobLineItems(jobId);
  const book     = getPriceBook();
  const total    = lineItemTotal(items);
  const categories = [...new Set(book.map(i => i.category))];

  container.innerHTML = `
    <div style="font-size:12px;font-weight:700;color:var(--hint);letter-spacing:0.5px;margin-bottom:10px">LINE ITEMS & PRICING</div>

    <!-- Existing line items -->
    ${items.length ? `
    <div class="card-flat" style="margin-bottom:10px">
      ${items.map((item, idx) => `
        <div style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:0.5px solid var(--border)">
          <div style="flex:1">
            <div style="font-size:13px;font-weight:700">${item.label}</div>
            <div style="font-size:11px;color:var(--muted)">${fmtMoney(item.price)} × ${item.qty}</div>
          </div>
          <div style="font-weight:800;color:var(--primary)">${fmtMoney(item.price * item.qty)}</div>
          <div style="display:flex;align-items:center;gap:4px">
            <button onclick="changeLineItemQty('${jobId}',${idx},-1)"
              style="width:26px;height:26px;border-radius:50%;background:var(--bg);border:1px solid var(--border);cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center">−</button>
            <span style="font-size:13px;font-weight:700;min-width:20px;text-align:center">${item.qty}</span>
            <button onclick="changeLineItemQty('${jobId}',${idx},1)"
              style="width:26px;height:26px;border-radius:50%;background:var(--bg);border:1px solid var(--border);cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center">+</button>
            <button onclick="removeLineItem('${jobId}',${idx})"
              style="width:26px;height:26px;border-radius:50%;background:var(--red-lt);border:none;cursor:pointer;color:var(--red);font-size:12px;display:flex;align-items:center;justify-content:center;margin-left:4px">
              <i class="ti ti-x"></i>
            </button>
          </div>
        </div>`).join('')}
      <div style="display:flex;justify-content:space-between;padding:12px 14px;background:var(--primary-lt)">
        <span style="font-weight:800">Total</span>
        <span style="font-size:18px;font-weight:900;color:var(--primary)">${fmtMoney(total)}</span>
      </div>
    </div>` : `
    <div style="text-align:center;padding:16px;background:#f7f8fa;border-radius:10px;margin-bottom:10px;color:var(--hint);font-size:13px">
      No line items yet — add from the price book below
    </div>`}

    <!-- Add line item -->
    <div style="background:#f7f8fa;border-radius:10px;padding:12px;margin-bottom:8px">
      <div style="font-size:12px;font-weight:700;color:var(--muted);margin-bottom:8px">ADD LINE ITEM</div>
      <div style="display:flex;gap:8px;margin-bottom:8px">
        <select class="form-input" id="li-service" style="flex:1" onchange="autoFillLineItemPrice('${jobId}')">
          <option value="">Select service…</option>
          ${categories.map(cat => `
            <optgroup label="${cat}">
              ${book.filter(i => i.category === cat).map(item =>
                `<option value="${item.id}" data-price="${item.price}" data-label="${item.label}">${item.label} — ${fmtMoney(item.price)}</option>`
              ).join('')}
            </optgroup>`).join('')}
        </select>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:8px;align-items:end">
        <div>
          <div style="font-size:11px;font-weight:700;color:var(--muted);margin-bottom:4px">PRICE ($)</div>
          <input type="number" class="form-input" id="li-price" placeholder="0">
        </div>
        <div>
          <div style="font-size:11px;font-weight:700;color:var(--muted);margin-bottom:4px">QTY</div>
          <input type="number" class="form-input" id="li-qty" value="1" min="1">
        </div>
        <button class="btn btn-primary" onclick="addLineItem('${jobId}')" style="height:44px">
          <i class="ti ti-plus"></i> Add
        </button>
      </div>
    </div>

    ${total > 0 ? `
    <button class="btn btn-green btn-full btn-sm" onclick="applyLineItemTotal('${jobId}')">
      <i class="ti ti-check"></i> Apply Total ${fmtMoney(total)} to Job Price
    </button>` : ''}`;
}

function autoFillLineItemPrice(jobId) {
  const sel = document.getElementById('li-service');
  const priceEl = document.getElementById('li-price');
  if (!sel || !priceEl) return;
  const opt = sel.options[sel.selectedIndex];
  if (opt && opt.dataset.price) priceEl.value = opt.dataset.price;
}

function addLineItem(jobId) {
  const sel    = document.getElementById('li-service');
  const priceEl= document.getElementById('li-price');
  const qtyEl  = document.getElementById('li-qty');
  if (!sel?.value) { toast('⚠️ Select a service first'); return; }
  const opt   = sel.options[sel.selectedIndex];
  const label = opt.dataset.label || opt.text.split(' —')[0];
  const price = parseFloat(priceEl?.value) || 0;
  const qty   = parseInt(qtyEl?.value) || 1;
  if (!price) { toast('⚠️ Enter a price'); return; }
  const items = getJobLineItems(jobId);
  // Check if same service exists — offer to increase qty
  const existing = items.find(i => i.serviceId === sel.value);
  if (existing) {
    existing.qty += qty;
    saveJobLineItems(jobId, items);
  } else {
    items.push({ serviceId: sel.value, label, price, qty });
    saveJobLineItems(jobId, items);
  }
  // Reset fields
  sel.value = '';
  if (priceEl) priceEl.value = '';
  if (qtyEl)  qtyEl.value  = '1';
  renderLineItems(jobId);
  toast(`<i class="ti ti-check" style="color:#4ade80"></i> ${label} × ${qty} added`);
}

function changeLineItemQty(jobId, idx, delta) {
  const items = getJobLineItems(jobId);
  if (!items[idx]) return;
  items[idx].qty = Math.max(1, items[idx].qty + delta);
  saveJobLineItems(jobId, items);
  renderLineItems(jobId);
}

function removeLineItem(jobId, idx) {
  const items = getJobLineItems(jobId);
  items.splice(idx, 1);
  saveJobLineItems(jobId, items);
  renderLineItems(jobId);
}

function applyLineItemTotal(jobId) {
  const items = getJobLineItems(jobId);
  const total = lineItemTotal(items);
  const j = getJob(jobId);
  if (!j) return;
  j.price = total;
  saveJob(j);
  const priceEl = document.getElementById('jd-price');
  if (priceEl) priceEl.value = total;
  toast(`<i class="ti ti-check" style="color:#4ade80"></i> Job price set to ${fmtMoney(total)}`);
}
