/* =============================================
   HaulPro PWA — app.js
   Full data + UI logic
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
};

// ─── STORAGE ─────────────────────────────────
const DB = {
  get(key, def) {
    try { const v = localStorage.getItem('hp_' + key); return v ? JSON.parse(v) : def; } catch { return def; }
  },
  set(key, val) {
    try { localStorage.setItem('hp_' + key, JSON.stringify(val)); } catch {}
  },
};

// ─── SEED DATA ────────────────────────────────
function seedData() {
  if (DB.get('seeded')) return;
  const today = new Date().toISOString().slice(0,10);
  const customers = [
    { id:'c1', firstName:'Mike',    lastName:'Thompson', phone:'(407) 555-0143', email:'mike.t@email.com',    address:'1234 Oak St, Ocoee FL 34761',        notes:'Has a gate code: 1234', points:840,  jobs:4, totalSpent:840,  since:'2024-03-10' },
    { id:'c2', firstName:'Sarah',   lastName:'Chen',     phone:'(407) 555-0267', email:'sarah.c@email.com',   address:'789 Maple Ave, Winter Garden FL 34787',notes:'',                  points:420,  jobs:2, totalSpent:420,  since:'2024-11-05' },
    { id:'c3', firstName:'Robert',  lastName:'Garcia',   phone:'(321) 555-0198', email:'rgarcia@email.com',   address:'456 Pine Blvd, Clermont FL 34711',    notes:'Full estate — 3 bedrooms', points:100, jobs:1, totalSpent:100, since:'2025-01-20' },
    { id:'c4', firstName:'Dana',    lastName:'Whitfield',phone:'(407) 555-0319', email:'dana.w@email.com',    address:'22 Lakeview Dr, Windermere FL 34786', notes:'Referral from Mike T.', points:1240, jobs:7, totalSpent:1240, since:'2023-09-15' },
    { id:'c5', firstName:'James',   lastName:'Porter',   phone:'(321) 555-0411', email:'jporter@email.com',   address:'88 Citrus Way, Apopka FL 32703',      notes:'',                  points:210,  jobs:2, totalSpent:210,  since:'2025-04-01' },
  ];
  const jobs = [
    { id:'j1', customerId:'c1', date:today, time:'09:00', service:'Full Truck Load',    address:'1234 Oak St, Ocoee FL',          notes:'Living room furniture',         price:280, status:'done',       paid:true  },
    { id:'j2', customerId:'c2', date:today, time:'14:00', service:'Furniture + Appliances', address:'789 Maple Ave, Winter Garden FL', notes:'3 sofas, refrigerator',        price:590, status:'inprogress', paid:false },
    { id:'j3', customerId:'c3', date:today, time:'17:30', service:'Estate Cleanout',    address:'456 Pine Blvd, Clermont FL',     notes:'Full 3-bedroom estate',         price:0,   status:'scheduled',  paid:false },
    { id:'j4', customerId:'c4', date:addDays(today,1), time:'10:00', service:'Half Truck Load', address:'22 Lakeview Dr, Windermere FL', notes:'',                    price:220, status:'scheduled', paid:false },
    { id:'j5', customerId:'c1', date:addDays(today,1), time:'14:30', service:'Appliance Removal', address:'1234 Oak St, Ocoee FL',    notes:'2 washing machines',          price:150, status:'scheduled', paid:false },
    { id:'j6', customerId:'c5', date:addDays(today,2), time:'09:00', service:'Single Item Pickup', address:'88 Citrus Way, Apopka FL',  notes:'Old sofa',                  price:95,  status:'scheduled', paid:false },
  ];
  const invoices = [
    { id:'inv1', jobId:'j1', customerId:'c1', date:today, items:[{desc:'Full Truck Load',qty:1,price:280},{desc:'Dump fee',qty:1,price:35},{desc:'Gold discount (10%)',qty:1,price:-28}], status:'paid' },
    { id:'inv2', jobId:'j2', customerId:'c2', date:today, items:[{desc:'Furniture Removal (5 items)',qty:1,price:320},{desc:'Appliance Disposal',qty:1,price:180},{desc:'Dump fee',qty:1,price:75},{desc:'Silver discount (5%)',qty:1,price:-28}], status:'unpaid' },
    { id:'inv3', jobId:'j3', customerId:'c3', date:today, items:[], status:'draft' },
  ];
  const messages = [
    { id:'m1', customerId:'c1', text:'Hi Mike! Heading your way now! ETA 10 min — Jake from HaulPro 🚛', sent:'09:47', type:'omw', date:today },
    { id:'m2', customerId:'c2', text:'Hi Sarah! Confirming your junk removal today at 2:00 PM. See you soon! — HaulPro', sent:'08:30', type:'confirm', date:today },
  ];
  DB.set('customers', customers);
  DB.set('jobs', jobs);
  DB.set('invoices', invoices);
  DB.set('messages', messages);
  DB.set('profile', { name:'Jake Davis', company:'Davis Junk Removal', phone:'(407) 555-9000', email:'jake@davisjunk.com', initials:'JD', smsReminders:true, autoInvoice:true, rewardsEnabled:true });
  DB.set('seeded', true);
}

function addDays(dateStr, n) {
  const d = new Date(dateStr); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10);
}

// ─── DATA HELPERS ─────────────────────────────
function getCustomers() { return DB.get('customers', []); }
function getJobs()      { return DB.get('jobs', []); }
function getInvoices()  { return DB.get('invoices', []); }
function getMessages()  { return DB.get('messages', []); }
function getProfile()   { return DB.get('profile', { name:'User', initials:'U', company:'My Company' }); }

function getCustomer(id) { return getCustomers().find(c => c.id === id); }
function getJob(id)      { return getJobs().find(j => j.id === id); }
function getInvoice(id)  { return getInvoices().find(i => i.id === id); }

function jobsForDate(date) { return getJobs().filter(j => j.date === date).sort((a,b) => a.time.localeCompare(b.time)); }
function invoiceTotal(inv) { return inv.items.reduce((s,i) => s + i.price, 0); }

function tierForPoints(pts) {
  if (pts >= 1000) return { name:'Platinum', color:'#e8520a' };
  if (pts >= 700)  return { name:'Gold',     color:'#c47a0e' };
  if (pts >= 300)  return { name:'Silver',   color:'#888' };
  return { name:'Bronze', color:'#a05a2c' };
}
function tierDiscount(pts) {
  if (pts >= 1000) return 0.15;
  if (pts >= 700)  return 0.10;
  if (pts >= 300)  return 0.05;
  return 0;
}

function newId(prefix) { return prefix + Date.now() + Math.random().toString(36).slice(2,6); }

function saveCustomer(c) {
  const all = getCustomers();
  const idx = all.findIndex(x => x.id === c.id);
  if (idx >= 0) all[idx] = c; else all.unshift(c);
  DB.set('customers', all);
}
function saveJob(j) {
  const all = getJobs();
  const idx = all.findIndex(x => x.id === j.id);
  if (idx >= 0) all[idx] = j; else all.unshift(j);
  DB.set('jobs', all);
}
function saveInvoice(inv) {
  const all = getInvoices();
  const idx = all.findIndex(x => x.id === inv.id);
  if (idx >= 0) all[idx] = inv; else all.unshift(inv);
  DB.set('invoices', all);
}
function deleteJob(id) { DB.set('jobs', getJobs().filter(j => j.id !== id)); }
function deleteCustomer(id) { DB.set('customers', getCustomers().filter(c => c.id !== id)); }
function logMessage(msg) {
  const msgs = getMessages();
  msgs.unshift(msg);
  DB.set('messages', msgs.slice(0, 100));
}

// ─── TOAST ────────────────────────────────────
function toast(msg, ms=2800) {
  const el = document.getElementById('toast');
  el.innerHTML = msg;
  el.classList.add('show');
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
  const screen = document.getElementById('screen-' + name);
  const nav    = document.getElementById('nav-' + name);
  if (screen) screen.classList.add('active');
  if (nav)    nav.classList.add('active');
  State.screen = name;
  renderScreen(name);
}

function renderScreen(name) {
  switch(name) {
    case 'dashboard':  renderDashboard();  break;
    case 'jobs':       renderJobs();       break;
    case 'customers':  renderCustomers();  break;
    case 'invoices':   renderInvoices();   break;
    case 'rewards':    renderRewards();    break;
    case 'settings':   renderSettings();   break;
  }
}

// ─── FORMAT HELPERS ──────────────────────────
function fmt12(time24) {
  const [h,m] = time24.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${h%12||12}:${String(m).padStart(2,'0')} ${suffix}`;
}
function fmtDate(str) {
  return new Date(str + 'T12:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
}
function fmtMoney(n) { return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits:0, maximumFractionDigits:0 }); }
function initials(c) { return (c.firstName[0]||'') + (c.lastName[0]||''); }
function fullName(c) { return c.firstName + ' ' + c.lastName; }
const avatarColors = [
  ['#e3f5e9','#145c2c'], ['#e3eef8','#143a6e'], ['#fdeee6','#b84000'],
  ['#f0eeea','#4a4a4a'], ['#fce8e8','#8a1a1a'], ['#fff4e0','#7a4d00']
];
function avatarStyle(id) {
  const idx = id.charCodeAt(id.length-1) % avatarColors.length;
  const [bg,tx] = avatarColors[idx];
  return `background:${bg};color:${tx}`;
}
function statusPill(status) {
  const map = {
    done:       '<span class="pill pill-green"><i class="ti ti-check"></i> Done</span>',
    inprogress: '<span class="pill pill-orange"><i class="ti ti-loader"></i> In Progress</span>',
    scheduled:  '<span class="pill pill-blue"><i class="ti ti-calendar"></i> Scheduled</span>',
    cancelled:  '<span class="pill pill-gray"><i class="ti ti-x"></i> Cancelled</span>',
  };
  return map[status] || '';
}
function invStatusPill(s) {
  const map = {
    paid:   '<span class="pill pill-green">Paid</span>',
    unpaid: '<span class="pill pill-orange">Unpaid</span>',
    draft:  '<span class="pill pill-gray">Draft</span>',
  };
  return map[s] || '';
}

// ─── DASHBOARD ───────────────────────────────
function renderDashboard() {
  const today = new Date().toISOString().slice(0,10);
  const todayJobs = jobsForDate(today);
  const doneJobs  = todayJobs.filter(j => j.status === 'done');
  const invoices  = getInvoices();
  const todayRev  = invoices.filter(i => i.date === today && i.status === 'paid').reduce((s,i) => s + invoiceTotal(i), 0);
  const activeJob = todayJobs.find(j => j.status === 'inprogress');
  const profile   = getProfile();

  // AI insight
  const hour = new Date().getHours();
  let aiMsg = 'Your day looks smooth. All jobs are on track.';
  if (activeJob) {
    const c = getCustomer(activeJob.customerId);
    aiMsg = `You have an in-progress job with ${c ? fullName(c) : 'a customer'}. Tap "On My Way" to send them an SMS update.`;
  } else if (hour < 8) {
    aiMsg = `Good morning, ${profile.name.split(' ')[0]}! You have ${todayJobs.length} job${todayJobs.length!==1?'s':''} scheduled today.`;
  }

  document.getElementById('dash-stats').innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Today's Revenue</div>
      <div class="stat-value">${fmtMoney(todayRev)}</div>
      <div class="stat-sub">${doneJobs.length} of ${todayJobs.length} jobs complete</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Jobs Today</div>
      <div class="stat-value">${todayJobs.length}</div>
      <div class="stat-sub">${todayJobs.filter(j=>j.status==='scheduled').length} upcoming</div>
    </div>
  `;

  document.getElementById('dash-ai').innerHTML = `
    <div class="ai-banner">
      <i class="ti ti-sparkles"></i>
      <p><strong>AI Insight:</strong> ${aiMsg}</p>
    </div>`;

  document.getElementById('dash-jobs').innerHTML = todayJobs.length ? todayJobs.map(j => {
    const c = getCustomer(j.customerId);
    const isActive = j.status === 'inprogress';
    const cls = j.status === 'done' ? 'done-job' : j.status === 'inprogress' ? 'active-job' : 'upcoming';
    return `
    <div class="job-card ${cls}">
      <div class="flex-between mb-8">
        <div class="job-time">${fmt12(j.time)}${isActive ? ' — NOW' : ''}</div>
        ${statusPill(j.status)}
      </div>
      <div class="job-name">${c ? fullName(c) : 'Unknown'}</div>
      <div class="job-addr"><i class="ti ti-map-pin" style="font-size:12px"></i> ${j.address}</div>
      <div class="job-type">${j.service}</div>
      <div class="job-actions">
        ${j.status !== 'done' ? `<button class="btn btn-primary btn-sm" onclick="sendOMW('${j.id}')"><i class="ti ti-send"></i> On My Way</button>` : ''}
        ${j.status === 'inprogress' ? `<button class="btn btn-green btn-sm" onclick="openCompleteJob('${j.id}')"><i class="ti ti-check"></i> Complete</button>` : ''}
        ${j.status !== 'done' ? `<button class="btn btn-secondary btn-sm" onclick="openEditJob('${j.id}')"><i class="ti ti-edit"></i> Edit</button>` : ''}
        <button class="btn btn-secondary btn-sm" onclick="openJobInvoice('${j.id}')"><i class="ti ti-receipt"></i> Invoice</button>
      </div>
    </div>`;
  }).join('') : '<div class="empty-state"><i class="ti ti-calendar-off"></i><p>No jobs scheduled today.</p><button class="btn btn-primary" onclick="openNewJob()"><i class="ti ti-plus"></i> Schedule a Job</button></div>';
}

// ─── JOBS SCREEN ─────────────────────────────
function renderJobs() {
  const date = State.selectedDay;
  const jobs = jobsForDate(date);

  // Week strip (today ± 3)
  const today = new Date();
  const days = [];
  for (let i = -1; i <= 5; i++) {
    const d = new Date(today); d.setDate(today.getDate() + i);
    days.push(d);
  }
  const dayNames = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
  document.getElementById('jobs-week-strip').innerHTML = days.map(d => {
    const ds = d.toISOString().slice(0,10);
    const sel = ds === date ? 'selected' : '';
    const hasJobs = jobsForDate(ds).length > 0;
    return `<button class="day-chip ${sel}" onclick="selectDay('${ds}')">
      <div class="d-name">${dayNames[d.getDay()]}</div>
      <div class="d-num">${d.getDate()}</div>
      ${hasJobs && ds !== date ? `<div style="width:5px;height:5px;border-radius:50%;background:var(--accent);margin:2px auto 0"></div>` : '<div style="height:9px"></div>'}
    </button>`;
  }).join('');

  // Schedule slots
  const slots = ['8:00','9:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00'];
  document.getElementById('jobs-schedule').innerHTML = slots.map(slot => {
    const slotJobs = jobs.filter(j => j.time.slice(0,5) === slot || (j.time.slice(0,2) === slot.slice(0,2) && slot.length===4));
    // simpler match
    const match = jobs.filter(j => j.time.startsWith(slot.split(':')[0].padStart(2,'0')));
    const [hh] = slot.split(':');
    const matchedJobs = jobs.filter(j => j.time.startsWith(hh.padStart(2,'0') + ':'));

    if (!matchedJobs.length) return `
      <div class="sched-slot">
        <div class="sched-time">${slot}</div>
        <div class="sched-bar" style="background:#f7f6f3;min-height:34px;display:flex;align-items:center">
          <span style="font-size:11px;color:#ccc">—</span>
        </div>
      </div>`;

    return matchedJobs.map(j => {
      const c = getCustomer(j.customerId);
      const colors = { done:'#e3f5e9;border-left:3px solid var(--green)', inprogress:'#fdeee6;border-left:3px solid var(--accent)', scheduled:'#e3eef8;border-left:3px solid var(--blue)' };
      const txColors = { done:'var(--success-tx)', inprogress:'var(--orange-tx)', scheduled:'var(--info-tx)' };
      return `
      <div class="sched-slot">
        <div class="sched-time">${fmt12(j.time)}</div>
        <div class="sched-bar" style="background:${colors[j.status]||'#f0eeea'};cursor:pointer" onclick="openEditJob('${j.id}')">
          <div style="font-size:13px;font-weight:700;color:${txColors[j.status]||'var(--text)'}">
            ${c ? fullName(c) : '?'}
            ${j.status === 'inprogress' ? ' ← ACTIVE' : j.status === 'done' ? ' ✓' : ''}
          </div>
          <div style="font-size:11px;color:var(--muted)">${j.service} · ${j.address.split(',')[0]}</div>
        </div>
      </div>`;
    }).join('');
  }).join('');

  // Route summary
  document.getElementById('jobs-route').innerHTML = jobs.length ? `
    <div class="card">
      <div class="flex-between mb-8">
        <div style="font-weight:700">Route — ${fmtDate(date)}</div>
        <span class="pill pill-blue">${jobs.length} stop${jobs.length!==1?'s':''}</span>
      </div>
      <div class="timeline">
        ${jobs.map((j,i) => {
          const c = getCustomer(j.customerId);
          const dotCls = j.status === 'done' ? 'done' : j.status === 'scheduled' ? 'pending' : '';
          return `<div class="tl-item">
            <div class="tl-dot ${dotCls}"></div>
            <div class="tl-time">${fmt12(j.time)}</div>
            <div class="tl-label">${j.address}</div>
            <div class="tl-sub">${c ? fullName(c) : ''} · ${j.service}${j.price ? ' · ' + fmtMoney(j.price) : ''}</div>
          </div>`;
        }).join('')}
      </div>
    </div>` : `<div class="card" style="text-align:center;padding:24px;color:var(--muted)">No jobs on this day.</div>`;
}

function selectDay(dateStr) {
  State.selectedDay = dateStr;
  renderJobs();
}

// ─── CUSTOMERS SCREEN ────────────────────────
let custFilter = '';
function renderCustomers(filter) {
  if (filter !== undefined) custFilter = filter.toLowerCase();
  let custs = getCustomers();
  if (custFilter) custs = custs.filter(c =>
    fullName(c).toLowerCase().includes(custFilter) ||
    c.phone.includes(custFilter) || c.email.toLowerCase().includes(custFilter)
  );

  document.getElementById('customers-list').innerHTML = custs.length ? `
    <div class="card-flat">
      ${custs.map(c => {
        const tier = tierForPoints(c.points);
        return `<div class="card-inner-row" style="cursor:pointer" onclick="openCustomerDetail('${c.id}')">
          <div class="cust-avatar" style="${avatarStyle(c.id)}">${initials(c)}</div>
          <div style="flex:1">
            <div style="font-size:14px;font-weight:700">${fullName(c)}</div>
            <div class="text-sm text-muted">${c.jobs} job${c.jobs!==1?'s':''} · ${c.phone}</div>
          </div>
          <div>
            <div class="cust-pts">${c.points.toLocaleString()} pts</div>
            <div class="cust-tier" style="color:${tier.color}">${tier.name}</div>
          </div>
        </div>`;
      }).join('')}
    </div>` : `<div class="empty-state"><i class="ti ti-users"></i><p>No customers found.</p></div>`;
}

function openCustomerDetail(id) {
  State.viewingCustomer = id;
  const c = getCustomer(id);
  if (!c) return;
  const tier = tierForPoints(c.points);
  const custJobs = getJobs().filter(j => j.customerId === id).sort((a,b) => b.date.localeCompare(a.date));

  document.getElementById('cust-detail-body').innerHTML = `
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">
      <div class="cust-avatar" style="width:54px;height:54px;font-size:18px;${avatarStyle(c.id)}">${initials(c)}</div>
      <div style="flex:1">
        <div style="font-size:20px;font-weight:800">${fullName(c)}</div>
        <span class="pill pill-orange mt-4" style="border:1px solid;border-color:${tier.color};background:transparent;color:${tier.color}">
          ★ ${tier.name} Member · ${c.points.toLocaleString()} pts
        </span>
      </div>
    </div>
    <div class="card" style="background:#fafaf8;margin-bottom:12px">
      <div class="inv-row"><span class="text-muted"><i class="ti ti-phone"></i> Phone</span><a href="tel:${c.phone}" style="color:var(--blue);font-weight:600">${c.phone}</a></div>
      <div class="inv-row"><span class="text-muted"><i class="ti ti-mail"></i> Email</span><a href="mailto:${c.email}" style="color:var(--blue);font-weight:600">${c.email||'—'}</a></div>
      <div class="inv-row"><span class="text-muted"><i class="ti ti-map-pin"></i> Address</span><span style="font-size:12px;text-align:right;max-width:200px">${c.address}</span></div>
      ${c.notes ? `<div class="inv-row"><span class="text-muted"><i class="ti ti-notes"></i> Notes</span><span style="font-size:12px;max-width:200px">${c.notes}</span></div>` : ''}
      <div class="inv-row" style="border:none"><span class="text-muted"><i class="ti ti-calendar"></i> Member since</span><span>${fmtDate(c.since)}</span></div>
    </div>
    <div class="stats-grid mb-12">
      <div class="stat-card"><div class="stat-label">Total Jobs</div><div class="stat-value">${c.jobs}</div></div>
      <div class="stat-card"><div class="stat-label">Total Spent</div><div class="stat-value">${fmtMoney(c.totalSpent)}</div></div>
    </div>
    ${custJobs.length ? `
    <div class="section-label">Job History</div>
    <div class="card-flat mb-12">
      ${custJobs.slice(0,5).map(j => `
        <div class="card-inner-row">
          <div style="flex:1">
            <div style="font-size:13px;font-weight:600">${j.service}</div>
            <div class="text-sm text-muted">${fmtDate(j.date)}</div>
          </div>
          <div style="text-align:right">
            ${j.price ? `<div style="font-weight:700">${fmtMoney(j.price)}</div>` : ''}
            ${statusPill(j.status)}
          </div>
        </div>`).join('')}
    </div>` : ''}
    <div class="btn-grid">
      <button class="btn btn-primary btn-full" onclick="openNewJobForCustomer('${c.id}')"><i class="ti ti-calendar-plus"></i> Book Job</button>
      <button class="btn btn-secondary btn-full" onclick="openSMSModal('${c.id}')"><i class="ti ti-message"></i> SMS</button>
      <button class="btn btn-outline btn-full" onclick="openEditCustomer('${c.id}')"><i class="ti ti-edit"></i> Edit</button>
      <button class="btn btn-secondary btn-full" onclick="confirmDeleteCustomer('${c.id}')"><i class="ti ti-trash" style="color:var(--danger-tx)"></i> Delete</button>
    </div>`;
  openModal('modal-cust-detail');
}

function openEditCustomer(id) {
  State.editingCustomer = id;
  const c = id ? getCustomer(id) : null;
  const title = c ? 'Edit Customer' : 'Add Customer';
  document.getElementById('cust-form-title').textContent = title;
  document.getElementById('cf-first').value  = c?.firstName || '';
  document.getElementById('cf-last').value   = c?.lastName || '';
  document.getElementById('cf-phone').value  = c?.phone || '';
  document.getElementById('cf-email').value  = c?.email || '';
  document.getElementById('cf-addr').value   = c?.address || '';
  document.getElementById('cf-notes').value  = c?.notes || '';
  closeModal('modal-cust-detail');
  openModal('modal-cust-form');
}

function saveCustomerForm() {
  const firstName = document.getElementById('cf-first').value.trim();
  const lastName  = document.getElementById('cf-last').value.trim();
  if (!firstName) { toast('⚠️ First name is required'); return; }
  const id = State.editingCustomer || newId('c');
  const existing = State.editingCustomer ? getCustomer(id) : null;
  const c = {
    id,
    firstName, lastName,
    phone:      document.getElementById('cf-phone').value.trim(),
    email:      document.getElementById('cf-email').value.trim(),
    address:    document.getElementById('cf-addr').value.trim(),
    notes:      document.getElementById('cf-notes').value.trim(),
    points:     existing?.points || 0,
    jobs:       existing?.jobs || 0,
    totalSpent: existing?.totalSpent || 0,
    since:      existing?.since || new Date().toISOString().slice(0,10),
  };
  saveCustomer(c);
  State.editingCustomer = null;
  closeAllModals();
  renderCustomers();
  toast(`<i class="ti ti-check" style="color:#4ade80"></i> Customer saved`);
}

function confirmDeleteCustomer(id) {
  const c = getCustomer(id);
  if (!c) return;
  if (confirm(`Delete ${fullName(c)}? This cannot be undone.`)) {
    deleteCustomer(id);
    closeAllModals();
    renderCustomers();
    toast('Customer deleted');
  }
}

// ─── INVOICES SCREEN ─────────────────────────
let invFilter = 'all';
function renderInvoices(filter) {
  if (filter) invFilter = filter;
  let invs = getInvoices();
  if (invFilter !== 'all') invs = invs.filter(i => i.status === invFilter);
  invs = invs.sort((a,b) => b.date.localeCompare(a.date));

  const allInvs = getInvoices();
  const totalInv  = allInvs.reduce((s,i) => s + invoiceTotal(i), 0);
  const collected = allInvs.filter(i => i.status === 'paid').reduce((s,i) => s + invoiceTotal(i), 0);
  const outstanding = allInvs.filter(i => i.status === 'unpaid').reduce((s,i) => s + invoiceTotal(i), 0);

  document.getElementById('inv-summary').innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-label">Total Invoiced</div><div class="stat-value">${fmtMoney(totalInv)}</div></div>
      <div class="stat-card"><div class="stat-label">Outstanding</div><div class="stat-value" style="color:var(--warning)">${fmtMoney(outstanding)}</div></div>
    </div>`;

  const filters = ['all','paid','unpaid','draft'];
  document.getElementById('inv-filters').innerHTML = filters.map(f =>
    `<button class="btn btn-sm ${invFilter===f?'btn-primary':'btn-secondary'}" onclick="renderInvoices('${f}')">${f.charAt(0).toUpperCase()+f.slice(1)}</button>`
  ).join('');

  document.getElementById('invoices-list').innerHTML = invs.length ? invs.map(inv => {
    const c = getCustomer(inv.customerId);
    const total = invoiceTotal(inv);
    return `<div class="card" style="cursor:pointer" onclick="openInvoiceDetail('${inv.id}')">
      <div class="flex-between">
        <div>
          <div style="font-size:13px;font-weight:700">#${inv.id.toUpperCase()}</div>
          <div class="text-sm text-muted">${c ? fullName(c) : '?'} · ${fmtDate(inv.date)}</div>
        </div>
        <div class="text-right">
          <div style="font-size:17px;font-weight:800">${total > 0 ? fmtMoney(total) : '—'}</div>
          ${invStatusPill(inv.status)}
        </div>
      </div>
      ${inv.status === 'unpaid' ? `<div class="btn-grid mt-8">
        <button class="btn btn-green btn-full btn-sm" onclick="event.stopPropagation();sendInvoice('${inv.id}')"><i class="ti ti-send"></i> Send</button>
        <button class="btn btn-blue btn-full btn-sm" onclick="event.stopPropagation();markPaid('${inv.id}')"><i class="ti ti-credit-card"></i> Mark Paid</button>
      </div>` : ''}
    </div>`;
  }).join('') : `<div class="empty-state"><i class="ti ti-receipt-off"></i><p>No invoices found.</p></div>`;
}

function openInvoiceDetail(id) {
  State.activeInvoiceId = id;
  const inv = getInvoice(id);
  if (!inv) return;
  const c = getCustomer(inv.customerId);
  const total = invoiceTotal(inv);
  const cust = c ? getCustomer(inv.customerId) : null;
  const discount = cust ? tierDiscount(cust.points) : 0;

  document.getElementById('inv-detail-body').innerHTML = `
    <div class="flex-between mb-12">
      <div>
        <div style="font-size:18px;font-weight:800">#${inv.id.toUpperCase()}</div>
        <div class="text-sm text-muted">${fmtDate(inv.date)}</div>
      </div>
      ${invStatusPill(inv.status)}
    </div>
    <div class="flex-between mb-12">
      <div><div class="text-sm text-muted">Customer</div><div style="font-weight:700">${c ? fullName(c) : '?'}</div></div>
      ${c ? `<div class="text-right"><div class="text-sm text-muted">Phone</div><div style="font-weight:600;color:var(--blue)">${c.phone}</div></div>` : ''}
    </div>
    <div class="card" style="background:#fafaf8;padding:0">
      <div style="padding:10px 14px;border-bottom:0.5px solid var(--border);font-size:11px;font-weight:700;color:var(--hint);letter-spacing:0.5px">LINE ITEMS</div>
      ${inv.items.map(item => `
        <div class="inv-row" style="padding:10px 14px">
          <span>${item.desc}</span>
          <span style="font-weight:600;color:${item.price<0?'var(--green)':''}">${item.price<0?'-'+fmtMoney(Math.abs(item.price)):fmtMoney(item.price)}</span>
        </div>`).join('')}
      <div class="inv-row" style="padding:12px 14px;border-top:2px solid var(--border);background:#f5f4f0">
        <span style="font-weight:800">Total</span>
        <span class="inv-total">${fmtMoney(total)}</span>
      </div>
    </div>
    ${c && c.points ? `<div style="background:var(--orange-bg);border-radius:9px;padding:10px 14px;margin-top:10px;font-size:12px">
      <i class="ti ti-trophy" style="color:var(--accent);margin-right:4px"></i>
      ${c.firstName} will earn <strong>${Math.max(0,total)} reward points</strong> — ${tierForPoints(c.points).name} tier
    </div>` : ''}
    <div id="inv-detail-actions" class="mt-12">
      ${inv.status === 'unpaid' ? `
        <div class="btn-grid">
          <button class="btn btn-primary btn-full" onclick="sendInvoice('${inv.id}');closeModal('modal-inv-detail')"><i class="ti ti-send"></i> Send</button>
          <button class="btn btn-green btn-full" onclick="markPaid('${inv.id}');closeModal('modal-inv-detail')"><i class="ti ti-credit-card"></i> Mark Paid</button>
        </div>` : ''}
      ${inv.status === 'draft' ? `
        <button class="btn btn-primary btn-full" onclick="openInvoiceEditor('${inv.id}')"><i class="ti ti-edit"></i> Edit & Finalize</button>` : ''}
    </div>`;
  openModal('modal-inv-detail');
}

function openJobInvoice(jobId) {
  const job = getJob(jobId);
  if (!job) return;
  const inv = getInvoices().find(i => i.jobId === jobId);
  if (inv) { openInvoiceDetail(inv.id); return; }
  // create draft
  openNewInvoice(jobId);
}

function openNewInvoice(jobId) {
  const job = jobId ? getJob(jobId) : null;
  const c = job ? getCustomer(job.customerId) : null;
  const discount = c ? tierDiscount(c.points) : 0;

  document.getElementById('inv-job-sel').innerHTML = `
    <option value="">— Select Job —</option>
    ${getJobs().map(j => {
      const cj = getCustomer(j.customerId);
      return `<option value="${j.id}" ${j.id===jobId?'selected':''}>${cj?fullName(cj):'?'} — ${j.service} (${fmtDate(j.date)})</option>`;
    }).join('')}`;

  document.getElementById('inv-items-container').innerHTML = job ? `
    <div class="card" style="background:#fafaf8;padding:12px">
      <div class="form-group"><label class="form-label">Item / Service</label><input class="form-input" id="ii-desc" value="${job.service}" placeholder="Description"></div>
      <div class="input-row">
        <div class="form-group"><label class="form-label">Price ($)</label><input class="form-input" id="ii-price" type="number" value="${job.price||0}"></div>
        <div class="form-group"><label class="form-label">Qty</label><input class="form-input" id="ii-qty" type="number" value="1"></div>
      </div>
      ${discount ? `<div style="font-size:12px;color:var(--success-tx);margin-top:4px"><i class="ti ti-percentage"></i> ${(discount*100).toFixed(0)}% loyalty discount applied automatically</div>` : ''}
    </div>` : `
    <div class="card" style="background:#fafaf8;padding:12px">
      <div class="form-group"><label class="form-label">Item / Service</label><input class="form-input" id="ii-desc" placeholder="Description"></div>
      <div class="input-row">
        <div class="form-group"><label class="form-label">Price ($)</label><input class="form-input" id="ii-price" type="number" value="0"></div>
        <div class="form-group"><label class="form-label">Qty</label><input class="form-input" id="ii-qty" type="number" value="1"></div>
      </div>
    </div>`;

  State.editingInvoice = jobId;
  openModal('modal-new-invoice');
}

function saveNewInvoice() {
  const jobId = document.getElementById('inv-job-sel').value;
  const job = jobId ? getJob(jobId) : null;
  const c = job ? getCustomer(job.customerId) : null;
  const desc  = document.getElementById('ii-desc')?.value || 'Service';
  const price = parseFloat(document.getElementById('ii-price')?.value) || 0;
  const qty   = parseInt(document.getElementById('ii-qty')?.value) || 1;
  const discount = c ? tierDiscount(c.points) : 0;
  const items = [{ desc, qty, price: price * qty }];
  if (discount) items.push({ desc: `${tierForPoints(c.points).name} loyalty discount (${(discount*100).toFixed(0)}%)`, qty:1, price: -Math.round(price * qty * discount) });

  const inv = {
    id: newId('inv'),
    jobId,
    customerId: job?.customerId || '',
    date: new Date().toISOString().slice(0,10),
    items,
    status: 'unpaid',
  };
  saveInvoice(inv);
  closeAllModals();
  renderInvoices();
  toast('<i class="ti ti-check" style="color:#4ade80"></i> Invoice created');
}

function sendInvoice(id) {
  const inv = getInvoice(id);
  const c = inv ? getCustomer(inv.customerId) : null;
  if (!inv) return;
  toast(`<i class="ti ti-send" style="color:#4ade80"></i> Invoice sent to ${c ? c.phone : 'customer'}`);
}

function markPaid(id) {
  const inv = getInvoice(id);
  if (!inv) return;
  inv.status = 'paid';
  saveInvoice(inv);
  // award points
  const c = getCustomer(inv.customerId);
  if (c) {
    const earned = Math.max(0, Math.round(invoiceTotal(inv)));
    c.points = (c.points || 0) + earned;
    c.totalSpent = (c.totalSpent || 0) + invoiceTotal(inv);
    saveCustomer(c);
    toast(`<i class="ti ti-trophy" style="color:#f9c74f"></i> Paid! +${earned} reward pts to ${c.firstName}`);
  } else {
    toast('<i class="ti ti-check" style="color:#4ade80"></i> Marked as paid');
  }
  renderInvoices();
}

// ─── REWARDS SCREEN ──────────────────────────
function renderRewards() {
  const custs = getCustomers().sort((a,b) => b.points - a.points);
  const top = custs[0];

  document.getElementById('rewards-hero').innerHTML = top ? `
    <div style="font-size:12px;opacity:0.85;margin-bottom:4px">${fullName(top)} — ${tierForPoints(top.points).name} Member</div>
    <div class="rewards-pts">${top.points.toLocaleString()}</div>
    <div class="rewards-pts-label">reward points (top customer)</div>
    <div class="progress-bar"><div class="progress-fill" style="width:${Math.min(100,(top.points/2000)*100).toFixed(1)}%"></div></div>
    <div class="flex-between mt-4" style="font-size:11px;opacity:0.8">
      <span>${top.points.toLocaleString()} pts</span>
      <span>${Math.max(0,2000-top.points).toLocaleString()} pts to max tier</span>
    </div>` : '<div>No customers yet.</div>';

  document.getElementById('rewards-leaderboard').innerHTML = custs.slice(0,6).map((c,i) => {
    const tier = tierForPoints(c.points);
    return `<div class="card-inner-row" style="cursor:pointer" onclick="openCustomerDetail('${c.id}')">
      <div class="lb-rank ${i===0?'r1':i===1?'r2':i===2?'r3':''}">${i+1}</div>
      <div class="cust-avatar" style="${avatarStyle(c.id)}">${initials(c)}</div>
      <div style="flex:1">
        <div style="font-size:14px;font-weight:700">${fullName(c)}</div>
        <div class="text-sm" style="color:${tier.color}">${tier.name}</div>
      </div>
      <div class="cust-pts">${c.points.toLocaleString()} pts</div>
    </div>`;
  }).join('');
}

// ─── SETTINGS ────────────────────────────────
function renderSettings() {
  const p = getProfile();
  document.getElementById('settings-body').innerHTML = `
    <div class="section-label">Your Profile</div>
    <div class="card">
      <div class="form-group"><label class="form-label">Full Name</label><input class="form-input" id="sp-name" value="${p.name}"></div>
      <div class="form-group"><label class="form-label">Company</label><input class="form-input" id="sp-company" value="${p.company}"></div>
      <div class="form-group"><label class="form-label">Phone</label><input class="form-input" id="sp-phone" value="${p.phone}"></div>
      <div class="form-group" style="margin-bottom:0"><label class="form-label">Email</label><input class="form-input" id="sp-email" value="${p.email}"></div>
    </div>
    <div class="section-label">Preferences</div>
    <div class="card">
      <div class="setting-row">
        <div><div class="s-label">Auto-send SMS Reminders</div><div class="s-sub">1 hour before each job</div></div>
        <div class="toggle-wrap"><input type="checkbox" class="toggle" id="tog-sms" ${p.smsReminders?'checked':''}></div>
      </div>
      <div class="setting-row">
        <div><div class="s-label">Auto-create Invoices</div><div class="s-sub">When a job is marked complete</div></div>
        <div class="toggle-wrap"><input type="checkbox" class="toggle" id="tog-inv" ${p.autoInvoice?'checked':''}></div>
      </div>
      <div class="setting-row" style="border:none">
        <div><div class="s-label">Loyalty Rewards Program</div><div class="s-sub">Award points to customers</div></div>
        <div class="toggle-wrap"><input type="checkbox" class="toggle" id="tog-rew" ${p.rewardsEnabled?'checked':''}></div>
      </div>
    </div>
    <div class="section-label">Rewards Tiers</div>
    <div class="card-flat">
      <div class="card-inner-row"><div style="width:10px;height:10px;border-radius:50%;background:#a05a2c"></div><div style="flex:1;margin-left:10px"><div style="font-weight:600">Bronze</div><div class="text-sm text-muted">0–299 pts · Priority scheduling</div></div></div>
      <div class="card-inner-row"><div style="width:10px;height:10px;border-radius:50%;background:#888"></div><div style="flex:1;margin-left:10px"><div style="font-weight:600">Silver</div><div class="text-sm text-muted">300–699 pts · 5% off, free same-day booking</div></div></div>
      <div class="card-inner-row"><div style="width:10px;height:10px;border-radius:50%;background:#c47a0e"></div><div style="flex:1;margin-left:10px"><div style="font-weight:600">Gold</div><div class="text-sm text-muted">700–999 pts · 10% off, $25 credit at 500 pts</div></div></div>
      <div class="card-inner-row" style="border:none"><div style="width:10px;height:10px;border-radius:50%;background:var(--accent)"></div><div style="flex:1;margin-left:10px"><div style="font-weight:600;color:var(--accent)">Platinum</div><div class="text-sm text-muted">1000+ pts · 15% off, $60 credit, 2x referral pts</div></div></div>
    </div>
    <div class="section-label">About</div>
    <div class="card">
      <div class="inv-row"><span class="text-muted">App Version</span><span>1.0.0</span></div>
      <div class="inv-row" style="border:none"><span class="text-muted">Data Storage</span><span>Local (on-device)</span></div>
    </div>
    <button class="btn btn-primary btn-full mt-12" onclick="saveSettings()"><i class="ti ti-check"></i> Save Settings</button>
    <button class="btn btn-secondary btn-full mt-8" onclick="if(confirm('Reset all data?')){localStorage.clear();location.reload()}"><i class="ti ti-refresh"></i> Reset App Data</button>
  `;
}

function saveSettings() {
  const p = getProfile();
  p.name         = document.getElementById('sp-name').value.trim() || p.name;
  p.company      = document.getElementById('sp-company').value.trim() || p.company;
  p.phone        = document.getElementById('sp-phone').value.trim();
  p.email        = document.getElementById('sp-email').value.trim();
  p.smsReminders = document.getElementById('tog-sms').checked;
  p.autoInvoice  = document.getElementById('tog-inv').checked;
  p.rewardsEnabled = document.getElementById('tog-rew').checked;
  p.initials     = p.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  DB.set('profile', p);
  document.querySelector('.avatar').textContent = p.initials;
  toast('<i class="ti ti-check" style="color:#4ade80"></i> Settings saved');
}

// ─── JOB FORM ────────────────────────────────
function openNewJob() { openNewJobForCustomer(null); }
function openNewJobForCustomer(custId) {
  State.editingJob = null;
  const custs = getCustomers();
  document.getElementById('jf-title').textContent = 'New Job';
  document.getElementById('jf-customer').innerHTML = `<option value="">Select customer...</option>` +
    custs.map(c => `<option value="${c.id}" ${c.id===custId?'selected':''}>${fullName(c)}</option>`).join('');
  document.getElementById('jf-date').value  = new Date().toISOString().slice(0,10);
  document.getElementById('jf-time').value  = '09:00';
  document.getElementById('jf-service').value = 'Full Truck Load';
  document.getElementById('jf-address').value = custId ? (getCustomer(custId)?.address || '') : '';
  document.getElementById('jf-price').value  = '';
  document.getElementById('jf-notes').value  = '';
  document.getElementById('jf-status').value = 'scheduled';
  closeModal('modal-cust-detail');
  openModal('modal-job-form');
}

function openEditJob(id) {
  State.editingJob = id;
  const j = getJob(id);
  if (!j) return;
  const custs = getCustomers();
  document.getElementById('jf-title').textContent = 'Edit Job';
  document.getElementById('jf-customer').innerHTML = `<option value="">Select customer...</option>` +
    custs.map(c => `<option value="${c.id}" ${c.id===j.customerId?'selected':''}>${fullName(c)}</option>`).join('');
  document.getElementById('jf-date').value    = j.date;
  document.getElementById('jf-time').value    = j.time;
  document.getElementById('jf-service').value = j.service;
  document.getElementById('jf-address').value = j.address;
  document.getElementById('jf-price').value   = j.price || '';
  document.getElementById('jf-notes').value   = j.notes || '';
  document.getElementById('jf-status').value  = j.status;
  openModal('modal-job-form');
}

function saveJobForm() {
  const custId = document.getElementById('jf-customer').value;
  const date   = document.getElementById('jf-date').value;
  const time   = document.getElementById('jf-time').value;
  const svc    = document.getElementById('jf-service').value;
  const addr   = document.getElementById('jf-address').value.trim();
  if (!custId) { toast('⚠️ Please select a customer'); return; }
  if (!date || !time) { toast('⚠️ Date and time required'); return; }

  const id = State.editingJob || newId('j');
  const existing = State.editingJob ? getJob(id) : null;
  const j = {
    id,
    customerId: custId,
    date, time,
    service:  svc,
    address:  addr || getCustomer(custId)?.address || '',
    price:    parseFloat(document.getElementById('jf-price').value) || 0,
    notes:    document.getElementById('jf-notes').value.trim(),
    status:   document.getElementById('jf-status').value,
    paid:     existing?.paid || false,
  };
  saveJob(j);

  // Update customer job count
  const c = getCustomer(custId);
  if (c && !State.editingJob) {
    c.jobs = (c.jobs || 0) + 1;
    saveCustomer(c);
  }

  State.editingJob = null;
  closeAllModals();
  renderDashboard();
  if (State.screen === 'jobs') renderJobs();
  toast(`<i class="ti ti-check" style="color:#4ade80"></i> Job ${State.editingJob ? 'updated' : 'scheduled'}`);
}

function deleteJobFromForm() {
  if (!State.editingJob) return;
  if (confirm('Delete this job?')) {
    deleteJob(State.editingJob);
    State.editingJob = null;
    closeAllModals();
    renderDashboard();
    if (State.screen === 'jobs') renderJobs();
    toast('Job deleted');
  }
}

// ─── COMPLETE JOB ────────────────────────────
function openCompleteJob(jobId) {
  State.editingJob = jobId;
  const j = getJob(jobId);
  const c = j ? getCustomer(j.customerId) : null;
  document.getElementById('cj-title').textContent = `Complete — ${c ? fullName(c) : 'Job'}`;
  document.getElementById('cj-price').value = j?.price || '';
  document.getElementById('cj-notes').value = j?.notes || '';
  openModal('modal-complete-job');
}

function saveCompleteJob() {
  const j = getJob(State.editingJob);
  if (!j) return;
  j.status = 'done';
  j.price  = parseFloat(document.getElementById('cj-price').value) || j.price;
  j.notes  = document.getElementById('cj-notes').value;
  j.paid   = document.getElementById('cj-payment').value === 'cash';
  saveJob(j);

  // Auto-create invoice
  const p = getProfile();
  if (p.autoInvoice) {
    const c = getCustomer(j.customerId);
    const discount = c ? tierDiscount(c.points) : 0;
    const items = [{ desc: j.service, qty: 1, price: j.price }];
    if (j.notes) items.push({ desc: 'Additional items: ' + j.notes, qty:1, price:0 });
    if (discount) items.push({ desc: `${c ? tierForPoints(c.points).name : ''} loyalty discount (${(discount*100).toFixed(0)}%)`, qty:1, price: -Math.round(j.price * discount) });
    const inv = { id: newId('inv'), jobId: j.id, customerId: j.customerId, date: j.date, items, status: j.paid ? 'paid' : 'unpaid' };
    saveInvoice(inv);
    if (j.paid && c) {
      const earned = Math.max(0, Math.round(invoiceTotal(inv)));
      c.points = (c.points||0) + earned;
      c.totalSpent = (c.totalSpent||0) + invoiceTotal(inv);
      saveCustomer(c);
    }
  }

  closeAllModals();
  renderDashboard();
  toast(`<i class="ti ti-check" style="color:#4ade80"></i> Job complete! Invoice created.`);
}

// ─── SMS ─────────────────────────────────────
function sendOMW(jobId) {
  const j = getJob(jobId);
  const c = j ? getCustomer(j.customerId) : null;
  if (!c) return;
  const profile = getProfile();
  const msg = `Hi ${c.firstName}! This is ${profile.name.split(' ')[0]} from ${profile.company}. I'm on my way to your address and should arrive in about 15 minutes. See you soon! 🚛`;
  logMessage({ id: newId('m'), customerId: c.id, text: msg, sent: new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}), type:'omw', date: new Date().toISOString().slice(0,10) });
  renderMessages();
  toast(`<i class="ti ti-send" style="color:#4ade80"></i> SMS sent to ${c.firstName} (${c.phone})`);
}

function openSMSModal(custId) {
  State.viewingCustomer = custId;
  const c = getCustomer(custId);
  const profile = getProfile();
  if (!c) return;
  document.getElementById('sms-to').textContent = `${fullName(c)} · ${c.phone}`;
  document.getElementById('sms-body').value = `Hi ${c.firstName}! This is ${profile.name.split(' ')[0]} from ${profile.company}. `;
  document.getElementById('sms-template').innerHTML = `
    <option value="">Quick templates...</option>
    <option value="omw">On My Way (ETA 15 min)</option>
    <option value="confirm">Job Confirmation</option>
    <option value="followup">Follow-up / Review Request</option>
    <option value="reward">Reward Points Update</option>`;
  closeModal('modal-cust-detail');
  openModal('modal-sms');
}

function applySMSTemplate() {
  const c = getCustomer(State.viewingCustomer);
  const profile = getProfile();
  const tpl = document.getElementById('sms-template').value;
  const name = c ? c.firstName : 'there';
  const from = profile.name.split(' ')[0];
  const co   = profile.company;
  const templates = {
    omw:      `Hi ${name}! This is ${from} from ${co}. I'm on my way and should arrive in about 15 minutes. See you soon! 🚛`,
    confirm:  `Hi ${name}! Your junk removal job with ${co} is confirmed. We'll see you at the scheduled time. Reply STOP to cancel.`,
    followup: `Hi ${name}! Thanks for choosing ${co}. We'd love a review — it takes 30 seconds and really helps us out! 🙏`,
    reward:   `Hi ${name}! Just a reminder you have ${c?.points||0} reward points with ${co}. Use them for discounts on your next job! 🏆`,
  };
  if (templates[tpl]) document.getElementById('sms-body').value = templates[tpl];
}

function sendSMS() {
  const c = getCustomer(State.viewingCustomer);
  const body = document.getElementById('sms-body').value.trim();
  if (!body) { toast('⚠️ Message is empty'); return; }
  logMessage({ id: newId('m'), customerId: State.viewingCustomer, text: body, sent: new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}), type:'manual', date: new Date().toISOString().slice(0,10) });
  renderMessages();
  closeModal('modal-sms');
  toast(`<i class="ti ti-send" style="color:#4ade80"></i> SMS sent to ${c ? c.phone : 'customer'}`);
}

function renderMessages() {
  const msgs = getMessages();
  document.getElementById('sms-sent-list').innerHTML = msgs.slice(0,8).map(m => {
    const c = getCustomer(m.customerId);
    return `<div style="padding:10px 0;border-bottom:0.5px solid var(--border)">
      <div class="text-sm text-muted">${m.sent} · ${c ? fullName(c) : '?'}</div>
      <div style="font-size:13px;margin-top:3px">${m.text}</div>
    </div>`;
  }).join('') || '<div class="text-sm text-muted">No messages sent yet.</div>';
}

function openMessagesPanel() {
  renderMessages();
  openModal('modal-messages');
}

// ─── RENDER ENGINE ───────────────────────────
function init() {
  seedData();
  const profile = getProfile();
  document.querySelector('.avatar').textContent = profile.initials || 'JD';
  document.querySelector('.header-logo').innerHTML = `Haul<span>Pro</span>`;

  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(el => {
    el.addEventListener('click', e => { if (e.target === el) closeAllModals(); });
  });

  // Back buttons on modals
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeAllModals());
  });

  showScreen('dashboard');
}

document.addEventListener('DOMContentLoaded', init);
