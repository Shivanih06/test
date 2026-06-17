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
  if (DB.get('seeded')) return;
  const today = new Date().toISOString().slice(0,10);
  DB.set('customers', [
    { id:'c1', firstName:'Mike',   lastName:'Thompson', phone:'4075550143', email:'mike.t@email.com',   address:'1234 Oak St, Ocoee FL 34761',         notes:'Gate code: 1234', points:840,  jobs:4, totalSpent:840,  since:'2024-03-10' },
    { id:'c2', firstName:'Sarah',  lastName:'Chen',     phone:'4075550267', email:'sarah.c@email.com',  address:'789 Maple Ave, Winter Garden FL 34787',notes:'',               points:420,  jobs:2, totalSpent:420,  since:'2024-11-05' },
    { id:'c3', firstName:'Robert', lastName:'Garcia',   phone:'3215550198', email:'rgarcia@email.com',  address:'456 Pine Blvd, Clermont FL 34711',     notes:'3 bedrooms',     points:100,  jobs:1, totalSpent:100,  since:'2025-01-20' },
    { id:'c4', firstName:'Dana',   lastName:'Whitfield',phone:'4075550319', email:'dana.w@email.com',   address:'22 Lakeview Dr, Windermere FL 34786',  notes:'Referral: Mike', points:1240, jobs:7, totalSpent:1240, since:'2023-09-15' },
    { id:'c5', firstName:'James',  lastName:'Porter',   phone:'3215550411', email:'jporter@email.com',  address:'88 Citrus Way, Apopka FL 32703',       notes:'',               points:210,  jobs:2, totalSpent:210,  since:'2025-04-01' },
  ]);
  DB.set('jobs', [
    { id:'j1', customerId:'c1', date:today,           time:'09:00', service:'Full Truck Load',      address:'1234 Oak St, Ocoee FL',           notes:'Living room furniture',   price:280, status:'done',       paid:true  },
    { id:'j2', customerId:'c2', date:today,           time:'14:00', service:'Furniture + Appliances',address:'789 Maple Ave, Winter Garden FL', notes:'3 sofas, refrigerator',  price:590, status:'inprogress', paid:false },
    { id:'j3', customerId:'c3', date:today,           time:'17:30', service:'Estate Cleanout',      address:'456 Pine Blvd, Clermont FL',      notes:'Full 3-bedroom estate',   price:0,   status:'scheduled',  paid:false },
    { id:'j4', customerId:'c4', date:addDays(today,1),time:'10:00', service:'Half Truck Load',      address:'22 Lakeview Dr, Windermere FL',   notes:'',                        price:220, status:'scheduled',  paid:false },
    { id:'j5', customerId:'c1', date:addDays(today,1),time:'14:30', service:'Appliance Removal',    address:'1234 Oak St, Ocoee FL',           notes:'2 washing machines',      price:150, status:'scheduled',  paid:false },
  ]);
  DB.set('invoices', [
    { id:'inv1', jobId:'j1', customerId:'c1', date:today, items:[{desc:'Full Truck Load',qty:1,price:280},{desc:'Dump fee',qty:1,price:35},{desc:'Gold discount (10%)',qty:1,price:-28}], status:'paid' },
    { id:'inv2', jobId:'j2', customerId:'c2', date:today, items:[{desc:'Furniture Removal',qty:1,price:320},{desc:'Appliance Disposal',qty:1,price:180},{desc:'Dump fee',qty:1,price:75},{desc:'Silver discount (5%)',qty:1,price:-28}], status:'unpaid' },
    { id:'inv3', jobId:'j3', customerId:'c3', date:today, items:[], status:'draft' },
  ]);
  DB.set('messages', [
    { id:'m1', customerId:'c1', text:'Hi Mike! Heading your way now — Jake from HaulPro 🚛', sent:'9:47 AM', type:'sms', date:today },
    { id:'m2', customerId:'c2', text:'Hi Sarah! Your job today at 2:00 PM is confirmed. See you soon! — HaulPro', sent:'8:30 AM', type:'email', date:today },
  ]);
  DB.set('profile', {
    name:'Jake Davis', company:'Davis Junk Removal',
    phone:'4075559000', email:'jake@davisjunk.com', initials:'JD',
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
  DB.set('seeded', true);
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00'); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10);
}

// ─── DATA HELPERS ─────────────────────────────
const getCustomers = () => DB.get('customers', []);
const getJobs      = () => DB.get('jobs', []);
const getInvoices  = () => DB.get('invoices', []);
const getMessages  = () => DB.get('messages', []);
const getProfile   = () => DB.get('profile', { name:'User', initials:'U', company:'My Company' });
const getCustomer  = id => getCustomers().find(c => c.id === id);
const getJob       = id => getJobs().find(j => j.id === id);
const getInvoice   = id => getInvoices().find(i => i.id === id);
const jobsForDate  = date => getJobs().filter(j => j.date === date).sort((a,b) => a.time.localeCompare(b.time));
const invoiceTotal = inv => inv.items.reduce((s,i) => s + Number(i.price), 0);
const tierForPoints= pts => pts>=1000?{name:'Platinum',color:'var(--primary)'}:pts>=700?{name:'Gold',color:'#c47a0e'}:pts>=300?{name:'Silver',color:'#888'}:{name:'Bronze',color:'#a05a2c'};
const tierDiscount = pts => pts>=1000?0.15:pts>=700?0.10:pts>=300?0.05:0;
const newId = p => p + Date.now() + Math.random().toString(36).slice(2,5);
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

function saveCustomer(c) { const a=getCustomers(); const i=a.findIndex(x=>x.id===c.id); if(i>=0)a[i]=c;else a.unshift(c); DB.set('customers',a); }
function saveJob(j)      { const a=getJobs();      const i=a.findIndex(x=>x.id===j.id); if(i>=0)a[i]=j;else a.unshift(j); DB.set('jobs',a); }
function saveInvoice(inv){ const a=getInvoices();  const i=a.findIndex(x=>x.id===inv.id); if(i>=0)a[i]=inv;else a.unshift(inv); DB.set('invoices',a); }
function logMessage(m)   { const a=getMessages(); a.unshift(m); DB.set('messages',a.slice(0,100)); }
function deleteJob(id)      { DB.set('jobs',getJobs().filter(j=>j.id!==id)); }
function deleteCustomer(id) { DB.set('customers',getCustomers().filter(c=>c.id!==id)); }

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
  if (el) { el.classList.add('open'); State.modal = id; }
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
  ({dashboard:renderDashboard, jobs:renderJobs, customers:()=>renderCustomers(), invoices:()=>renderInvoices(), rewards:renderRewards, settings:renderSettings})[name]?.();
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
        ${j.status!=='done'&&j.status!=='cancelled'?`<button class="btn btn-primary btn-sm" onclick="sendOMW('${j.id}')"><i class="ti ti-send"></i> On My Way</button>`:''}
        ${j.status==='inprogress'?`<button class="btn btn-green btn-sm" onclick="openCompleteJob('${j.id}')"><i class="ti ti-check"></i> Complete</button>`:''}
        ${j.status!=='done'?`<button class="btn btn-secondary btn-sm" onclick="openEditJob('${j.id}')"><i class="ti ti-edit"></i> Edit</button>`:''}
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
  const days = Array.from({length:7},(_,i)=>{const d=new Date(today);d.setDate(today.getDate()-1+i);return d;});
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
        <div class="sched-bar" style="background:${bgBorder[j.status]||'#f0f2f5'};cursor:pointer" onclick="openEditJob('${j.id}')">
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

function sendInvoiceToCustomer(id) {
  const inv=getInvoice(id);
  const c=inv?getCustomer(inv.customerId):null;
  if(!c) return;
  const total=invoiceTotal(inv);
  const profile=getProfile();
  const subject=`Invoice from ${profile.company} — ${fmtMoney(total)}`;
  const body=`Hi ${c.firstName},\n\nThank you for choosing ${profile.company}! Your invoice for ${fmtMoney(total)} is ready.\n\nService: ${inv.items[0]?.desc||'Junk Removal'}\nDate: ${fmtDate(inv.date)}\nTotal: ${fmtMoney(total)}\n\nPlease call or text us to arrange payment.\n\nThanks,\n${profile.name}\n${profile.company}\n${fmtPhone(profile.phone)}`;
  sendEmailJS(c.email, fullName(c), subject, body);
  sendTwilioSMS(c.phone, `Hi ${c.firstName}! Your invoice for ${fmtMoney(total)} from ${profile.company} is ready. Call or text us to pay. Thanks! — ${profile.name}`);
  logMessage({id:newId('m'),customerId:c.id,text:`Invoice sent: ${fmtMoney(total)}`,sent:new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}),type:'invoice',date:new Date().toISOString().slice(0,10)});
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
  document.getElementById('settings-body').innerHTML=`
    <div class="section-label">Your Profile</div>
    <div class="card">
      <div class="form-group"><label class="form-label">Full Name</label><input class="form-input" id="sp-name" value="${p.name}"></div>
      <div class="form-group"><label class="form-label">Company Name</label><input class="form-input" id="sp-company" value="${p.company}"></div>
      <div class="form-group"><label class="form-label">Your Phone</label><input class="form-input" id="sp-phone" value="${fmtPhone(p.phone)}"></div>
      <div class="form-group" style="margin-bottom:0"><label class="form-label">Your Email</label><input class="form-input" id="sp-email" value="${p.email}"></div>
    </div>

    <div class="section-label">💬 SMS Setup (Twilio)</div>
    <div class="info-banner"><i class="ti ti-info-circle"></i><p>Sign up free at <strong>twilio.com</strong>. Free trial gives ~$15 credit. Get Account SID, Auth Token, and a phone number from your Twilio console.</p></div>
    <div class="card">
      <div class="form-group"><label class="form-label">Account SID</label><input class="form-input" id="sp-twilio-sid" value="${p.twilioAccountSid||''}" placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"></div>
      <div class="form-group"><label class="form-label">Auth Token</label><input class="form-input" id="sp-twilio-token" type="password" value="${p.twilioAuthToken||''}" placeholder="Your auth token"></div>
      <div class="form-group" style="margin-bottom:0"><label class="form-label">Twilio Phone Number</label><input class="form-input" id="sp-twilio-from" value="${p.twilioFromPhone||''}" placeholder="+14075550000"></div>
    </div>

    <div class="section-label">📧 Email Setup (EmailJS)</div>
    <div class="info-banner"><i class="ti ti-info-circle"></i><p>Sign up free at <strong>emailjs.com</strong> (200 emails/month free). Create a service, create a template with variables <strong>to_email</strong>, <strong>to_name</strong>, <strong>subject</strong>, <strong>message</strong>, then copy your IDs here.</p></div>
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
    <button class="btn btn-primary btn-full mt-12" onclick="saveSettings()"><i class="ti ti-check"></i> Save All Settings</button>
    <button class="btn btn-secondary btn-full mt-8" onclick="testMessaging()"><i class="ti ti-send"></i> Test SMS & Email</button>
    <button class="btn btn-secondary btn-full mt-8" style="color:var(--red)" onclick="if(confirm('Reset all data?')){localStorage.clear();location.reload()}"><i class="ti ti-refresh"></i> Reset App Data</button>
  `;
}

function saveSettings() {
  const p=getProfile();
  p.name=document.getElementById('sp-name').value.trim()||p.name;
  p.company=document.getElementById('sp-company').value.trim()||p.company;
  p.phone=document.getElementById('sp-phone').value.replace(/\D/g,'');
  p.email=document.getElementById('sp-email').value.trim();
  p.twilioAccountSid=document.getElementById('sp-twilio-sid').value.trim();
  p.twilioAuthToken=document.getElementById('sp-twilio-token').value.trim();
  p.twilioFromPhone=document.getElementById('sp-twilio-from').value.trim();
  p.emailjsPublicKey=document.getElementById('sp-ejs-pubkey').value.trim();
  p.emailjsServiceId=document.getElementById('sp-ejs-service').value.trim();
  p.emailjsTemplateId=document.getElementById('sp-ejs-template').value.trim();
  p.emailjsFromName=document.getElementById('sp-ejs-fromname').value.trim()||p.company;
  p.smsReminders=document.getElementById('tog-sms').checked;
  p.autoInvoice=document.getElementById('tog-inv').checked;
  p.rewardsEnabled=document.getElementById('tog-rew').checked;
  p.initials=p.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  DB.set('profile',p);
  document.getElementById('header-avatar').textContent=p.initials;
  if(p.emailjsPublicKey) emailjs.init(p.emailjsPublicKey);
  toast('<i class="ti ti-check" style="color:#4ade80"></i> Settings saved');
}

function testMessaging() {
  const p=getProfile();
  if(!p.twilioAccountSid&&!p.emailjsPublicKey){toast('⚠️ Enter your Twilio and/or EmailJS keys first');return;}
  if(p.emailjsPublicKey&&p.emailjsServiceId&&p.emailjsTemplateId){
    sendEmailJS(p.email,p.name,'HaulPro Test Email','This is a test email from your HaulPro app. Email is working! 🎉');
  }
  if(p.twilioAccountSid&&p.twilioAuthToken&&p.twilioFromPhone){
    sendTwilioSMS(p.phone,'HaulPro test SMS — your messaging is working! 🚛');
  }
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
async function sendEmailJS(toEmail, toName, subject, message) {
  const p=getProfile();
  if(!p.emailjsPublicKey||!p.emailjsServiceId||!p.emailjsTemplateId){
    console.warn('EmailJS not configured');
    return false;
  }
  try {
    emailjs.init(p.emailjsPublicKey);
    const result = await emailjs.send(p.emailjsServiceId, p.emailjsTemplateId, {
      to_email:  toEmail,
      to_name:   toName,
      from_name: p.emailjsFromName||p.company,
      subject:   subject,
      message:   message,
      reply_to:  p.email,
    });
    console.log('Email sent', result.status);
    return true;
  } catch(e){ console.error('EmailJS error',e); toast('⚠️ Email failed: '+e.text); return false; }
}

// Send both SMS + Email for "On My Way"
async function sendOMW(jobId) {
  const j=getJob(jobId);
  const c=j?getCustomer(j.customerId):null;
  if(!c){toast('⚠️ No customer on this job');return;}
  const p=getProfile();
  const name=p.name.split(' ')[0];
  const smsText=`Hi ${c.firstName}! This is ${name} from ${p.company}. I'm on my way to your address and should arrive in about 15 minutes. See you soon! 🚛`;
  const emailSubject=`${p.company} — On My Way!`;
  const emailBody=`Hi ${c.firstName},\n\nJust letting you know I'm headed your way now and should arrive in about 15 minutes.\n\nAddress: ${j.address}\n\nSee you soon!\n\n${name}\n${p.company}\n${fmtPhone(p.phone)}`;

  const hasKeys=p.twilioAccountSid||p.emailjsPublicKey;
  if(!hasKeys){
    toast(`<i class="ti ti-send" style="color:#4ade80"></i> Message logged (add keys in Settings to send for real)`);
    logMessage({id:newId('m'),customerId:c.id,text:smsText,sent:new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}),type:'omw',date:new Date().toISOString().slice(0,10)});
    renderMessages();
    return;
  }
  toast(`<i class="ti ti-loader"></i> Sending…`, 4000);
  const [smsOk, emailOk] = await Promise.all([
    sendTwilioSMS(c.phone, smsText),
    sendEmailJS(c.email, fullName(c), emailSubject, emailBody),
  ]);
  logMessage({id:newId('m'),customerId:c.id,text:`On My Way sent via ${[smsOk?'SMS':'',emailOk?'Email':''].filter(Boolean).join(' + ')||'attempted'}`,sent:new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}),type:'omw',date:new Date().toISOString().slice(0,10)});
  renderMessages();
  if(smsOk||emailOk) toast(`<i class="ti ti-check" style="color:#4ade80"></i> Message sent to ${c.firstName}!`);
}

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

async function sendMessage() {
  const c=getCustomer(State.viewingCustomer);
  const body=document.getElementById('sms-body').value.trim();
  if(!body){toast('⚠️ Message is empty');return;}
  const p=getProfile();
  const hasKeys=p.twilioAccountSid||p.emailjsPublicKey;

  if(!hasKeys){
    logMessage({id:newId('m'),customerId:State.viewingCustomer,text:body,sent:new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}),type:State.msgTab,date:new Date().toISOString().slice(0,10)});
    closeModal('modal-sms');
    toast(`<i class="ti ti-send" style="color:#4ade80"></i> Logged (add keys in Settings to send for real)`);
    return;
  }

  toast('<i class="ti ti-loader"></i> Sending…', 4000);
  let ok=false;
  if(State.msgTab==='sms'&&c){
    ok=await sendTwilioSMS(c.phone, body);
  } else if(State.msgTab==='email'&&c){
    const subject=document.getElementById('email-subject').value||`Message from ${p.company}`;
    ok=await sendEmailJS(c.email, fullName(c), subject, body);
  }
  if(ok||!hasKeys){
    logMessage({id:newId('m'),customerId:State.viewingCustomer,text:body,sent:new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}),type:State.msgTab,date:new Date().toISOString().slice(0,10)});
    closeModal('modal-sms');
    toast(`<i class="ti ti-check" style="color:#4ade80"></i> ${State.msgTab==='sms'?'SMS':'Email'} sent to ${c?c.firstName:'customer'}`);
  }
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
