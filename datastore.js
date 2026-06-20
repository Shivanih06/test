/* =============================================
   HaulPro — DataStore v1
   
   ALL data operations go through this file.
   
   Right now: uses localStorage (single device)
   
   When ready to go SaaS — replace the functions
   in this file with Supabase calls. The rest of
   the app (app.js, messaging.js) never changes.
   
   Future Supabase swap looks like:
   
   async function getJobs() {
     const { data } = await supabase
       .from('jobs')
       .select('*')
       .eq('location_id', Auth.locationId);
     return data;
   }
   
   That's it. One file, one swap, done.
   ============================================= */

// ─── TENANT CONTEXT ──────────────────────────
// When multi-tenant SaaS: this comes from auth session
// For now: single company stored locally
const Tenant = {
  get id()       { return DS._local('tenant_id') || 'local'; },
  get name()     { return DS._local('tenant_name') || 'Junk Genies'; },
  get plan()     { return DS._local('tenant_plan') || 'solo'; },
  get maxEmployees() {
    const plans = { solo:1, pro:5, business:999 };
    return plans[this.plan] || 1;
  },
};

// ─── DATASTORE CORE ──────────────────────────
const DS = {

  // ── Internal localStorage primitives ──
  // These are the ONLY two places localStorage is touched.
  // When switching to Supabase, these become API calls.
  _local(key, val) {
    if (val === undefined) {
      try { const v = localStorage.getItem('hp_'+key); return v ? JSON.parse(v) : null; } catch { return null; }
    } else {
      try { localStorage.setItem('hp_'+key, JSON.stringify(val)); return val; } catch { return null; }
    }
  },
  _del(key) {
    try { localStorage.removeItem('hp_'+key); } catch {}
  },

  // ── Generic get/set (replaces old DB.get/DB.set) ──
  get(key, def=null)  { const v = this._local(key); return v !== null ? v : def; },
  set(key, val)       { return this._local(key, val); },
  del(key)            { this._del(key); },

  // ════════════════════════════════════════
  //  JOBS
  // ════════════════════════════════════════
  getJobs()           { return this.get('jobs', []); },
  getJob(id)          { return this.getJobs().find(j => j.id === id) || null; },
  getJobsForDate(date){ return this.getJobs().filter(j => j.date === date).sort((a,b) => a.time.localeCompare(b.time)); },
  getJobsForCustomer(custId) { return this.getJobs().filter(j => j.customerId === custId); },

  saveJob(job) {
    const all = this.getJobs();
    const idx = all.findIndex(j => j.id === job.id);
    if (idx >= 0) all[idx] = { ...all[idx], ...job, updatedAt: now() };
    else all.unshift({ ...job, createdAt: now(), updatedAt: now() });
    this.set('jobs', all);
    return job;
  },

  deleteJob(id) {
    this.set('jobs', this.getJobs().filter(j => j.id !== id));
  },

  // ════════════════════════════════════════
  //  CUSTOMERS
  // ════════════════════════════════════════
  getCustomers()      { return this.get('customers', []); },
  getCustomer(id)     { return this.getCustomers().find(c => c.id === id) || null; },

  searchCustomers(query) {
    const q = query.toLowerCase();
    return this.getCustomers().filter(c =>
      (c.firstName+' '+c.lastName).toLowerCase().includes(q) ||
      (c.phone||'').includes(q) ||
      (c.email||'').toLowerCase().includes(q)
    );
  },

  saveCustomer(customer) {
    const all = this.getCustomers();
    const idx = all.findIndex(c => c.id === customer.id);
    if (idx >= 0) all[idx] = { ...all[idx], ...customer, updatedAt: now() };
    else all.unshift({ ...customer, createdAt: now(), updatedAt: now() });
    this.set('customers', all);
    return customer;
  },

  deleteCustomer(id) {
    this.set('customers', this.getCustomers().filter(c => c.id !== id));
  },

  // ════════════════════════════════════════
  //  INVOICES
  // ════════════════════════════════════════
  getInvoices()       { return this.get('invoices', []); },
  getInvoice(id)      { return this.getInvoices().find(i => i.id === id) || null; },
  getInvoicesForJob(jobId) { return this.getInvoices().filter(i => i.jobId === jobId); },
  getInvoicesForCustomer(custId) { return this.getInvoices().filter(i => i.customerId === custId); },

  saveInvoice(invoice) {
    const all = this.getInvoices();
    const idx = all.findIndex(i => i.id === invoice.id);
    if (idx >= 0) all[idx] = { ...all[idx], ...invoice, updatedAt: now() };
    else all.unshift({ ...invoice, createdAt: now(), updatedAt: now() });
    this.set('invoices', all);
    return invoice;
  },

  invoiceTotal(inv) {
    return (inv.items || []).reduce((s, i) => s + Number(i.price), 0);
  },

  // ════════════════════════════════════════
  //  EMPLOYEES
  // ════════════════════════════════════════
  getEmployees()      { return this.get('employees', []); },
  getEmployee(id)     { return this.getEmployees().find(e => e.id === id) || null; },
  getCurrentEmployee(){ return this.get('current_employee', null); },
  setCurrentEmployee(emp) { this.set('current_employee', emp); },

  saveEmployee(emp) {
    // Enforce plan limits
    const existing = this.getEmployee(emp.id);
    if (!existing) {
      const activeCount = this.getEmployees().filter(e => e.active).length;
      if (activeCount >= Tenant.maxEmployees) {
        return { error: `Your plan allows ${Tenant.maxEmployees} employee(s). Upgrade to add more.` };
      }
    }
    const all = this.getEmployees();
    const idx = all.findIndex(e => e.id === emp.id);
    if (idx >= 0) all[idx] = { ...all[idx], ...emp, updatedAt: now() };
    else all.unshift({ ...emp, createdAt: now(), updatedAt: now() });
    this.set('employees', all);
    return emp;
  },

  verifyPin(empId, pin) {
    const emp = this.getEmployee(empId);
    return emp && emp.pin === pin ? emp : null;
  },

  deleteEmployee(id) {
    this.set('employees', this.getEmployees().filter(e => e.id !== id));
  },

  // ════════════════════════════════════════
  //  TIME ENTRIES
  // ════════════════════════════════════════
  getTimeEntries()    { return this.get('time_entries', []); },
  getTimeEntriesForEmployee(empId) { return this.getTimeEntries().filter(e => e.empId === empId); },
  getTimeEntriesForDate(empId, date) { return this.getTimeEntries().filter(e => e.empId === empId && e.date === date); },
  getActiveEntry(empId) { return this.getTimeEntries().find(e => e.empId === empId && e.clockIn && !e.clockOut && e.type !== 'lunch') || null; },
  getActiveLunch(empId) { return this.getTimeEntries().find(e => e.empId === empId && e.type === 'lunch' && e.clockIn && !e.clockOut) || null; },

  saveTimeEntry(entry) {
    const all = this.getTimeEntries();
    const idx = all.findIndex(e => e.id === entry.id);
    if (idx >= 0) all[idx] = { ...all[idx], ...entry };
    else all.unshift(entry);
    this.set('time_entries', all);
    return entry;
  },

  getTotalHoursForDate(empId, date) {
    return this.getTimeEntriesForDate(empId, date)
      .filter(e => e.clockOut && e.type !== 'lunch')
      .reduce((s, e) => s + (new Date(e.clockOut) - new Date(e.clockIn)), 0);
  },

  getTotalHoursForWeek(empId) {
    const today = new Date();
    return this.getTimeEntries()
      .filter(e => e.empId === empId && e.clockOut && e.type !== 'lunch')
      .filter(e => (today - new Date(e.clockIn)) / 86400000 <= 7)
      .reduce((s, e) => s + (new Date(e.clockOut) - new Date(e.clockIn)), 0);
  },

  // ════════════════════════════════════════
  //  MESSAGES
  // ════════════════════════════════════════
  getMessages()       { return this.get('messages', []); },
  getMessagesForCustomer(custId) { return this.getMessages().filter(m => m.customerId === custId); },

  logMessage(msg) {
    const all = this.getMessages();
    all.unshift({ ...msg, createdAt: now() });
    this.set('messages', all.slice(0, 200));
  },

  // ════════════════════════════════════════
  //  JOB TIMERS
  // ════════════════════════════════════════
  getJobTimer(jobId)       { return this.get('timer_'+jobId, null); },
  saveJobTimer(jobId, data){ this.set('timer_'+jobId, data); },

  getElapsedMs(jobId) {
    const timer = this.getJobTimer(jobId);
    if (!timer) return 0;
    if (timer.running) return timer.elapsed + (Date.now() - timer.startedAt);
    return timer.elapsed || 0;
  },

  // ════════════════════════════════════════
  //  PROFILE / SETTINGS
  // ════════════════════════════════════════
  getProfile() {
    return this.get('profile', {
      name: 'Owner', company: 'Junk Genies',
      phone: '', email: '', initials: 'JG',
      smsReminders: true, autoInvoice: true, rewardsEnabled: true,
      googleReviewLink: '', googleMapsKey: '',
      emailjsPublicKey: '', emailjsServiceId: '',
      emailjsTemplateId: '', emailjsFromName: 'Junk Genies',
      plan: 'starter', extraSeats: 0,
    });
  },

  saveProfile(profile) {
    profile.initials = (profile.name||'').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() || 'JG';
    this.set('profile', profile);
    return profile;
  },

  // ════════════════════════════════════════
  //  REWARDS / POINTS
  // ════════════════════════════════════════
  tierForPoints(pts) {
    if (pts >= 1000) return { name:'Platinum', color:'var(--primary)' };
    if (pts >= 700)  return { name:'Gold',     color:'#c47a0e' };
    if (pts >= 300)  return { name:'Silver',   color:'#888' };
    return { name:'Bronze', color:'#a05a2c' };
  },

  tierDiscount(pts) {
    if (pts >= 1000) return 0.15;
    if (pts >= 700)  return 0.10;
    if (pts >= 300)  return 0.05;
    return 0;
  },

  awardPoints(customerId, amount) {
    const c = this.getCustomer(customerId);
    if (!c) return;
    c.points     = (c.points || 0) + Math.max(0, Math.round(amount));
    c.totalSpent = (c.totalSpent || 0) + amount;
    this.saveCustomer(c);
    return c.points;
  },

  // ════════════════════════════════════════
  //  UTILITY
  // ════════════════════════════════════════
  newId(prefix='id') {
    return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2,6);
  },

  // Full data export — for backup or migration to Supabase
  exportAll() {
    return {
      exportedAt:  new Date().toISOString(),
      tenantId:    Tenant.id,
      profile:     this.getProfile(),
      customers:   this.getCustomers(),
      jobs:        this.getJobs(),
      invoices:    this.getInvoices(),
      employees:   this.getEmployees(),
      timeEntries: this.getTimeEntries(),
      messages:    this.getMessages(),
    };
  },

  // Full data import — for restoring from backup or onboarding from old app
  importAll(data) {
    if (data.profile)     this.set('profile',       data.profile);
    if (data.customers)   this.set('customers',      data.customers);
    if (data.jobs)        this.set('jobs',           data.jobs);
    if (data.invoices)    this.set('invoices',       data.invoices);
    if (data.employees)   this.set('employees',      data.employees);
    if (data.timeEntries) this.set('time_entries',   data.timeEntries);
    if (data.messages)    this.set('messages',       data.messages);
    return true;
  },

  // Wipe everything — used by Reset App Data in settings
  reset() {
    const keys = ['jobs','customers','invoices','employees','time_entries','messages','profile','current_employee','seeded','emp_seeded','ghl_api_key','ghl_location_id','ghl_from_phone'];
    keys.forEach(k => this._del(k));
  },
};

// ─── HELPERS (used across app) ───────────────
function now() { return new Date().toISOString(); }
function todayStr() { return new Date().toISOString().slice(0,10); }
function newId(prefix='id') { return DS.newId(prefix); }

// Real RFC-4122 UUID — required for Supabase columns typed as `uuid`
// (the old newId('e') style "e_123_ab" is rejected by Postgres).
function newUUID() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
