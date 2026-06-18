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
    done:       '<span class="pill pill-green"><i class="ti ti-check"></i> Done</span>',
    inprogress: '<span class="pill pill-orange"><i class="ti ti-loader"></i> In Progress</span>',
    scheduled:  '<span class="pill pill-blue"><i class="ti ti-calendar"></i> Scheduled</span>',
    cancelled:  '<span class="pill pill-gray"><i class="ti ti-x"></i> Cancelled</span>',
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
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('screen-'+name)?.classList.add('active');
  document.getElementById('nav-'+name)?.classList.add('active');
  State.screen = name;
  renderScreen(name);
}
function renderScreen(name) {
  ({dashboard:renderDashboard, jobs:renderJobs, customers:()=>renderCustomers(), invoices:()=>renderInvoices(), rewards:renderRewards, settings:renderSettings, team:renderTeamScreen})[name]?.();
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
    const cls = {done:'done-job',inprogress:'active-job',scheduled:'upcoming',cancelled:'cancelled'}[j.status]||'upcoming';
    return `<div class="job-card ${cls}">
      <div class="flex-between mb-8">
        <div class="job-time">${fmt12(j.time)}${j.status==='inprogress'?' — NOW':''}</div>
        ${statusPill(j.status)}
      </div>
      <div class="job-name">${c?fullName(c):'Unknown Customer'}</div>
      <div class="job-addr"><i class="ti ti-map-pin" style="font-size:11px"></i> ${j.address}</div>
      <div class="job-type">${j.service}${j.price?` · ${fmtMoney(j.price)}`:''}</div>
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
      <button class="btn btn-secondary btn-full" onclick="openSMSModal('${c.id}')"><i class="ti ti-message"></i> Message</button>
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
  document.getElementById('cf-email').value=c?.email||'';
  document.getElementById('cf-addr').value=c?.address||'';
  document.getElementById('cf-notes').value=c?.notes||'';
  closeModal('modal-cust-detail');
  openModal('modal-cust-form');
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
  p.initials=p.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  DS.saveProfile(p);
  document.getElementById('header-avatar').textContent=p.initials;
  if(p.emailjsPublicKey) emailjs.init(p.emailjsPublicKey);
  toast('<i class="ti ti-check" style="color:#4ade80"></i> Settings saved');
}




// ─── JOB FORM ────────────────────────────────
function openNewJob() { openNewJobForCustomer(null); }
function openNewJobForCustomer(custId) {
  State.editingJob=null;
  const custs=getCustomers();
  document.getElementById('jf-title').textContent='New Job';
  document.getElementById('jf-customer').innerHTML=`<option value="">Select customer...</option>`+
    custs.map(c=>`<option value="${c.id}" ${c.id===custId?'selected':''}>${fullName(c)}</option>`).join('');
  document.getElementById('jf-date').value=new Date().toISOString().slice(0,10);
  document.getElementById('jf-time').value='09:00';
  document.getElementById('jf-service').value='Full Truck Load';
  document.getElementById('jf-address').value=custId?(getCustomer(custId)?.address||''):'';
  document.getElementById('jf-price').value='';
  document.getElementById('jf-notes').value='';
  document.getElementById('jf-status').value='scheduled';
  closeModal('modal-cust-detail');
  openModal('modal-job-form');
}

function openEditJob(id) {
  State.editingJob=id;
  const j=getJob(id); if(!j) return;
  const custs=getCustomers();
  document.getElementById('jf-title').textContent='Edit Job';
  document.getElementById('jf-customer').innerHTML=`<option value="">Select customer...</option>`+
    custs.map(c=>`<option value="${c.id}" ${c.id===j.customerId?'selected':''}>${fullName(c)}</option>`).join('');
  document.getElementById('jf-date').value=j.date;
  document.getElementById('jf-time').value=j.time;
  document.getElementById('jf-service').value=j.service;
  document.getElementById('jf-address').value=j.address;
  document.getElementById('jf-price').value=j.price||'';
  document.getElementById('jf-notes').value=j.notes||'';
  document.getElementById('jf-status').value=j.status;
  openModal('modal-job-form');
}

function saveJobForm() {
  const custId=document.getElementById('jf-customer').value;
  const date=document.getElementById('jf-date').value;
  const time=document.getElementById('jf-time').value;
  if(!custId){toast('⚠️ Please select a customer');return;}
  if(!date||!time){toast('⚠️ Date and time required');return;}
  const id=State.editingJob||newId('j');
  const existing=State.editingJob?getJob(id):null;
  const j={id,customerId:custId,date,time,service:document.getElementById('jf-service').value,
    address:document.getElementById('jf-address').value.trim()||getCustomer(custId)?.address||'',
    price:parseFloat(document.getElementById('jf-price').value)||0,
    notes:document.getElementById('jf-notes').value.trim(),
    status:document.getElementById('jf-status').value,paid:existing?.paid||false};
  saveJob(j);
  if(!State.editingJob){const c=getCustomer(custId);if(c){c.jobs=(c.jobs||0)+1;saveCustomer(c);}}
  State.editingJob=null; closeAllModals(); renderDashboard();
  if(State.screen==='jobs') renderJobs();
  toast(`<i class="ti ti-check" style="color:#4ade80"></i> Job saved`);
}

function deleteJobFromForm() {
  if(!State.editingJob) return;
  if(confirm('Delete this job?')){deleteJob(State.editingJob);State.editingJob=null;closeAllModals();renderDashboard();if(State.screen==='jobs')renderJobs();toast('Job deleted');}
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

  document.querySelectorAll('.modal-overlay').forEach(el=>{
    el.addEventListener('click', e=>{ if(e.target===el) closeAllModals(); });
  });
  document.querySelectorAll('[data-close]').forEach(btn=>{
    btn.addEventListener('click', ()=>closeAllModals());
  });

  showScreen('dashboard');
}

document.addEventListener('DOMContentLoaded', init);

// ─── AUTO-EXTRACT GMB TOKEN FROM URL ─────────
// After Google OAuth redirect, token is in the URL hash
(function extractGMBToken() {
  const hash = window.location.hash;
  if (!hash.includes('access_token=')) return;
  const params = new URLSearchParams(hash.replace('#',''));
  const token  = params.get('access_token');
  if (token) {
    DS.set('gmb_access_token', token);
    // Clean URL so token isn't visible
    window.history.replaceState(null, '', window.location.pathname);
    // Show success after app loads
    setTimeout(() => {
      toast('<i class="ti ti-check" style="color:#4ade80"></i> Google authorized! Tap Find Location in Settings.', 5000);
      showScreen('settings');
    }, 1000);
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
      const items = [{ desc: j.service, qty: 1, price: j.price || 0 }];
      if (j.notes) items.push({ desc: 'Items: ' + j.notes, qty: 1, price: 0 });
      if (disc) items.push({ desc: `${tierForPoints(c.points).name} discount (${(disc*100).toFixed(0)}%)`, qty:1, price: -Math.round((j.price||0) * disc) });
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
        const svc = new google.maps.places.AutocompleteService();
        svc.getPlacePredictions({
          input: val,
          sessionToken,
          componentRestrictions: { country: 'us' },
          types: ['address'],
        }, (predictions, status) => {
          if (status !== google.maps.places.PlacesServiceStatus.OK || !predictions) {
            box.style.display = 'none'; return;
          }
          showSuggestions(box, predictions.map(p => ({
            label: p.description,
            value: p.description,
          })), newInput, () => { sessionToken = null; });
        });
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
    const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&countrycodes=us&q=${encodeURIComponent(query)}`;
    const resp = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    const data = await resp.json();
    if (!data.length) { box.style.display = 'none'; return; }
    const suggestions = data.map(item => {
      const a = item.address;
      const street = [a.house_number, a.road].filter(Boolean).join(' ');
      const city   = a.city || a.town || a.village || a.county || '';
      const state  = a.state || '';
      const zip    = a.postcode || '';
      const label  = [street, city, state, zip].filter(Boolean).join(', ');
      return { label: label || item.display_name.split(',').slice(0,3).join(','), value: label || item.display_name.split(',').slice(0,3).join(',') };
    }).filter(s => s.label.length > 5);
    showSuggestions(box, suggestions, input, null);
  } catch(e) {
    console.warn('Nominatim error:', e);
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
  const isDone = j.status === 'done' || j.status === 'cancelled';

  document.getElementById('job-detail-body').innerHTML = `
    <!-- HCP-style top action bar -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:16px">
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
      <button class="btn btn-sm btn-full ${isDone?'btn-secondary':'btn-green'}"
        onclick="setJobStatus('${jobId}','done')" ${isDone?'disabled style="opacity:0.4"':''}>
        <i class="ti ti-check"></i><span style="font-size:11px">${isDone?'Done ✓':'Complete'}</span>
      </button>
    </div>

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

  // Load photos async
  setTimeout(() => renderJobPhotos(jobId), 100);
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
function renderTimesheets() {
  const employees = getEmployees();
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

  document.getElementById('timesheets-body').innerHTML = `
    <div class="section-label">This Week</div>
    ${employees.filter(e=>e.active).map(emp => {
      const empEntries = entries.filter(e => e.empId === emp.id && e.clockOut);
      const weekMs = empEntries.filter(e => {
        const d = new Date(e.clockIn);
        const diff = (today - d) / 86400000;
        return diff <= 7 && e.type !== 'lunch';
      }).reduce((s,e) => s + (new Date(e.clockOut) - new Date(e.clockIn)), 0);

      return `<div class="card" style="margin-bottom:10px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
          <div style="width:38px;height:38px;border-radius:50%;background:${emp.color};color:white;font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center">${emp.initials}</div>
          <div style="flex:1"><div style="font-weight:700">${emp.name}</div><div class="text-sm text-muted">${emp.role}</div></div>
          <div style="text-align:right"><div style="font-size:18px;font-weight:800;color:var(--primary)">${fmtElapsed(weekMs)}</div><div class="text-sm text-muted">this week</div></div>
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
    <button class="btn btn-outline btn-full mt-12" onclick="openModal('modal-add-employee')"><i class="ti ti-user-plus"></i> Add Employee</button>
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
  const ok = saveEmployee(emp);
  if (ok === false) return; // plan limit hit — toast shown by saveEmployee
  closeModal('modal-add-employee');
  renderTimesheets();
  toast(`<i class="ti ti-check" style="color:#4ade80"></i> ${name} added`);
}

// ─── TEAM SCREEN ENTRY ───────────────────────
function renderTeamScreen() {
  seedEmployees();
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

  renderTimesheets();
}

function openLoginModal() {
  seedEmployees();
  renderLoginScreen();
  openModal('modal-login');
}
