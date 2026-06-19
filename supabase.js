/* =============================================
   Thrive — Supabase Integration
   Replaces localStorage with cloud database
   ============================================= */

const SUPABASE_URL = 'https://znjclglbjifracvrzkik.supabase.co';
const SUPABASE_KEY = 'sb_publishable_aUuw2yi8tcZCEWA5CFkg8Q_UZBnDh82';

// ─── SUPABASE CLIENT ─────────────────────────
const SB = {
  async request(method, path, body) {
    const url  = `${SUPABASE_URL}/rest/v1/${path}`;
    const opts = {
      method,
      headers: {
        'apikey':        SUPABASE_KEY,
        'Authorization': `Bearer ${Auth.token || SUPABASE_KEY}`,
        'Content-Type':  'application/json',
        'Prefer':        method === 'POST' ? 'return=representation' : 'return=representation',
      },
    };
    if (body) opts.body = JSON.stringify(body);
    const resp = await fetch(url, opts);
    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`Supabase ${method} ${path}: ${resp.status} ${err.slice(0,200)}`);
    }
    const text = await resp.text();
    return text ? JSON.parse(text) : [];
  },

  get(table, query='')    { return this.request('GET',    `${table}?${query}&order=created_at.desc`); },
  insert(table, data)     { return this.request('POST',   table, Array.isArray(data)?data:[data]); },
  update(table, id, data) { return this.request('PATCH',  `${table}?id=eq.${id}`, data); },
  upsert(table, data)     { return this.request('POST',   `${table}?on_conflict=id`, Array.isArray(data)?data:[data]); },
  delete(table, id)       { return this.request('DELETE', `${table}?id=eq.${id}`); },
  deleteWhere(table, col, val) { return this.request('DELETE', `${table}?${col}=eq.${val}`); },
};

// ─── AUTH ─────────────────────────────────────
const Auth = {
  user:  null,
  token: null,

  async signUp(email, password, name, company) {
    const resp = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await resp.json();
    if (data.error) throw new Error(data.error.message || data.msg);
    if (data.access_token) {
      this.token = data.access_token;
      this.user  = data.user;
      localStorage.setItem('thrive_token', data.access_token);
      localStorage.setItem('thrive_refresh', data.refresh_token || '');
      localStorage.setItem('thrive_user', JSON.stringify(data.user));
      // Create profile
      await SB.insert('profiles', {
        id:      data.user.id,
        name,
        company: company || 'My Company',
        email,
        initials: name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase(),
      });
    }
    return data;
  },

  async signIn(email, password) {
    const resp = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await resp.json();
    if (data.error || data.error_description) throw new Error(data.error_description || data.error);
    this.token = data.access_token;
    this.user  = data.user;
    localStorage.setItem('thrive_token', data.access_token);
    localStorage.setItem('thrive_refresh', data.refresh_token || '');
    localStorage.setItem('thrive_user', JSON.stringify(data.user));
    return data;
  },

  async signOut() {
    localStorage.removeItem('thrive_token');
    localStorage.removeItem('thrive_refresh');
    localStorage.removeItem('thrive_user');
    this.token = null;
    this.user  = null;
    showLoginScreen();
  },

  async restore() {
    const token   = localStorage.getItem('thrive_token');
    const userStr = localStorage.getItem('thrive_user');
    if (!token || !userStr) return false;
    this.token = token;
    this.user  = JSON.parse(userStr);
    // Verify token still valid
    try {
      const resp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${token}` },
      });
      if (!resp.ok) {
        // Try refresh
        const refresh = localStorage.getItem('thrive_refresh');
        if (refresh) return await this.refreshToken(refresh);
        return false;
      }
      return true;
    } catch { return false; }
  },

  async refreshToken(refreshToken) {
    try {
      const resp = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      const data = await resp.json();
      if (data.access_token) {
        this.token = data.access_token;
        this.user  = data.user;
        localStorage.setItem('thrive_token', data.access_token);
        localStorage.setItem('thrive_refresh', data.refresh_token || '');
        localStorage.setItem('thrive_user', JSON.stringify(data.user));
        return true;
      }
      return false;
    } catch { return false; }
  },

  get userId() { return this.user?.id || null; },
};

// ─── CLOUD DATASTORE ─────────────────────────
// Overrides DS methods to use Supabase instead of localStorage
const CloudDS = {

  uid() { return Auth.userId; },

  // ── CUSTOMERS ──
  async getCustomers() {
    return SB.get('customers', `user_id=eq.${this.uid()}&select=*`);
  },
  async getCustomer(id) {
    const rows = await SB.get('customers', `id=eq.${id}&user_id=eq.${this.uid()}`);
    return rows[0] || null;
  },
  async saveCustomer(c) {
    const row = {
      id:          c.id,
      user_id:     this.uid(),
      first_name:  c.firstName,
      last_name:   c.lastName || '',
      phone:       c.phone || '',
      email:       c.email || '',
      address:     c.address || '',
      notes:       c.notes || '',
      client_type: c.clientType || 'residential',
      lead_source: c.leadSource || '',
      points:      c.points || 0,
      total_spent: c.totalSpent || 0,
      jobs_count:  c.jobs || 0,
      since:       c.since || new Date().toISOString().slice(0,10),
    };
    const result = await SB.upsert('customers', row);
    return result[0] ? this._mapCustomer(result[0]) : c;
  },
  async deleteCustomer(id) {
    // Cascade: delete jobs, invoices, estimates, messages
    await SB.deleteWhere('messages',  'customer_id', id);
    await SB.deleteWhere('estimates', 'customer_id', id);
    await SB.deleteWhere('invoices',  'customer_id', id);
    await SB.deleteWhere('jobs',      'customer_id', id);
    await SB.delete('customers', id);
  },
  _mapCustomer(row) {
    return {
      id:         row.id,
      firstName:  row.first_name,
      lastName:   row.last_name,
      phone:      row.phone,
      email:      row.email,
      address:    row.address,
      notes:      row.notes,
      clientType: row.client_type,
      leadSource: row.lead_source,
      points:     row.points,
      totalSpent: row.total_spent,
      jobs:       row.jobs_count,
      since:      row.since,
    };
  },

  // ── JOBS ──
  async getJobs() {
    const rows = await SB.get('jobs', `user_id=eq.${this.uid()}&select=*`);
    return rows.map(this._mapJob);
  },
  async getJob(id) {
    const rows = await SB.get('jobs', `id=eq.${id}&user_id=eq.${this.uid()}`);
    return rows[0] ? this._mapJob(rows[0]) : null;
  },
  async getJobsForDate(date) {
    const rows = await SB.get('jobs', `user_id=eq.${this.uid()}&date=eq.${date}&order=time.asc`);
    return rows.map(this._mapJob);
  },
  async saveJob(j) {
    const row = {
      id:          j.id,
      user_id:     this.uid(),
      customer_id: j.customerId || null,
      date:        j.date,
      time:        j.time,
      time_end:    j.timeEnd || null,
      service:     j.service,
      address:     j.address || '',
      notes:       j.notes || '',
      price:       j.price || 0,
      status:      j.status || 'scheduled',
      payment:     j.payment || 'invoice',
      paid:        j.paid || false,
      tech_id:     j.techId || null,
    };
    const result = await SB.upsert('jobs', row);
    return result[0] ? this._mapJob(result[0]) : j;
  },
  async deleteJob(id) {
    await SB.deleteWhere('invoices',   'job_id', id);
    await SB.deleteWhere('job_timers', 'job_id', id);
    await SB.delete('jobs', id);
  },
  _mapJob(row) {
    return {
      id:         row.id,
      customerId: row.customer_id,
      date:       row.date,
      time:       row.time,
      timeEnd:    row.time_end,
      service:    row.service,
      address:    row.address,
      notes:      row.notes,
      price:      row.price,
      status:     row.status,
      payment:    row.payment,
      paid:       row.paid,
      techId:     row.tech_id,
    };
  },

  // ── INVOICES ──
  async getInvoices() {
    const rows = await SB.get('invoices', `user_id=eq.${this.uid()}&select=*`);
    return rows.map(this._mapInvoice);
  },
  async getInvoice(id) {
    const rows = await SB.get('invoices', `id=eq.${id}&user_id=eq.${this.uid()}`);
    return rows[0] ? this._mapInvoice(rows[0]) : null;
  },
  async saveInvoice(inv) {
    const row = {
      id:          inv.id,
      user_id:     this.uid(),
      job_id:      inv.jobId || null,
      customer_id: inv.customerId || null,
      date:        inv.date,
      items:       inv.items || [],
      status:      inv.status || 'draft',
    };
    const result = await SB.upsert('invoices', row);
    return result[0] ? this._mapInvoice(result[0]) : inv;
  },
  _mapInvoice(row) {
    return {
      id:         row.id,
      jobId:      row.job_id,
      customerId: row.customer_id,
      date:       row.date,
      items:      row.items || [],
      status:     row.status,
    };
  },

  // ── ESTIMATES ──
  async getEstimates() {
    const rows = await SB.get('estimates', `user_id=eq.${this.uid()}&select=*`);
    return rows.map(this._mapEstimate);
  },
  async getEstimate(id) {
    const rows = await SB.get('estimates', `id=eq.${id}&user_id=eq.${this.uid()}`);
    return rows[0] ? this._mapEstimate(rows[0]) : null;
  },
  async saveEstimate(est) {
    const row = {
      id:          est.id,
      user_id:     this.uid(),
      customer_id: est.customerId || null,
      date:        est.date,
      valid_days:  est.validDays || 30,
      service:     est.service,
      address:     est.address || '',
      price:       est.price || 0,
      notes:       est.notes || '',
      tech_id:     est.techId || null,
      status:      est.status || 'draft',
    };
    const result = await SB.upsert('estimates', row);
    return result[0] ? this._mapEstimate(result[0]) : est;
  },
  _mapEstimate(row) {
    return {
      id:         row.id,
      customerId: row.customer_id,
      date:       row.date,
      validDays:  row.valid_days,
      service:    row.service,
      address:    row.address,
      price:      row.price,
      notes:      row.notes,
      techId:     row.tech_id,
      status:     row.status,
    };
  },

  // ── EMPLOYEES ──
  async getEmployees() {
    const rows = await SB.get('employees', `user_id=eq.${this.uid()}&select=*`);
    return rows.map(r => ({
      id:       r.id,
      name:     r.name,
      role:     r.role,
      pin:      r.pin,
      color:    r.color,
      initials: r.initials,
      active:   r.active,
    }));
  },
  async saveEmployee(emp) {
    const row = {
      id:       emp.id,
      user_id:  this.uid(),
      name:     emp.name,
      role:     emp.role || 'technician',
      pin:      emp.pin,
      color:    emp.color || '#1a6fdb',
      initials: emp.initials,
      active:   emp.active !== false,
    };
    await SB.upsert('employees', row);
    return emp;
  },

  // ── MESSAGES ──
  async getMessages() {
    const rows = await SB.get('messages', `user_id=eq.${this.uid()}&select=*&order=created_at.desc&limit=200`);
    return rows.map(r => ({
      id:         r.id,
      customerId: r.customer_id,
      text:       r.text,
      sent:       r.sent_at,
      type:       r.type,
      direction:  r.direction,
      date:       r.date,
    }));
  },
  async logMessage(msg) {
    await SB.insert('messages', {
      id:          msg.id,
      user_id:     this.uid(),
      customer_id: msg.customerId,
      text:        msg.text,
      sent_at:     msg.sent,
      type:        msg.type,
      direction:   msg.direction || 'outbound',
      date:        msg.date,
    });
  },

  // ── PROFILE ──
  async getProfile() {
    const rows = await SB.get('profiles', `id=eq.${this.uid()}`);
    if (!rows[0]) return DS.getProfile(); // fallback to localStorage
    const r = rows[0];
    const settings = r.settings || {};
    return {
      name:             r.name || '',
      company:          r.company || '',
      phone:            r.phone || '',
      email:            r.email || '',
      initials:         r.initials || '',
      plan:             r.plan || 'solo',
      arrivalWindow:    settings.arrivalWindow || 2,
      defaultTech:      settings.defaultTech || '',
      smsReminders:     settings.smsReminders !== false,
      autoInvoice:      settings.autoInvoice !== false,
      rewardsEnabled:   settings.rewardsEnabled !== false,
      googleReviewLink: settings.googleReviewLink || '',
      googleMapsKey:    settings.googleMapsKey || '',
      emailjsPublicKey: settings.emailjsPublicKey || '',
      emailjsServiceId: settings.emailjsServiceId || '',
      emailjsTemplateId:settings.emailjsTemplateId || '',
      emailjsFromName:  settings.emailjsFromName || r.company || '',
    };
  },
  async saveProfile(profile) {
    await SB.update('profiles', this.uid(), {
      name:     profile.name,
      company:  profile.company,
      phone:    profile.phone,
      email:    profile.email,
      initials: profile.initials,
      settings: {
        arrivalWindow:     profile.arrivalWindow,
        defaultTech:       profile.defaultTech,
        smsReminders:      profile.smsReminders,
        autoInvoice:       profile.autoInvoice,
        rewardsEnabled:    profile.rewardsEnabled,
        googleReviewLink:  profile.googleReviewLink,
        googleMapsKey:     profile.googleMapsKey,
        emailjsPublicKey:  profile.emailjsPublicKey,
        emailjsServiceId:  profile.emailjsServiceId,
        emailjsTemplateId: profile.emailjsTemplateId,
        emailjsFromName:   profile.emailjsFromName,
      },
    });
    // Also save to localStorage as cache
    DS.set('profile', profile);
    return profile;
  },

  // ── INVOICE TOTAL ──
  invoiceTotal(inv) {
    return (inv.items || []).reduce((s,i) => s + Number(i.price), 0);
  },

  // ── TIER HELPERS ──
  tierForPoints(pts) { return DS.tierForPoints(pts); },
  tierDiscount(pts)  { return DS.tierDiscount(pts); },

  // ── AWARD POINTS ──
  async awardPoints(customerId, amount) {
    const c = await this.getCustomer(customerId);
    if (!c) return;
    c.points     = (c.points || 0) + Math.max(0, Math.round(amount));
    c.totalSpent = (c.totalSpent || 0) + amount;
    await this.saveCustomer(c);
    return c.points;
  },

  newId(prefix) { return DS.newId(prefix); },
};

// ─── LOGIN SCREEN ─────────────────────────────
function showLoginScreen() {
  document.getElementById('app-header').style.display    = 'none';
  document.getElementById('screens-container').style.display = 'none';
  document.getElementById('bottom-nav').style.display   = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  renderLoginPage('signin');
}

function showApp() {
  document.getElementById('app-header').style.display    = 'flex';
  document.getElementById('screens-container').style.display = 'block';
  document.getElementById('bottom-nav').style.display   = 'flex';
  document.getElementById('login-screen').style.display = 'none';
}

function renderLoginPage(mode) {
  const isSignIn = mode === 'signin';
  document.getElementById('login-screen').innerHTML = `
    <div style="width:100%;max-width:380px;padding:32px 24px">
      <!-- Logo -->
      <div style="text-align:center;margin-bottom:32px">
        <div style="font-size:36px;font-weight:900;color:var(--primary);letter-spacing:-1px">Thrive</div>
        <div style="font-size:13px;color:var(--muted);margin-top:4px">Powering Your Business</div>
      </div>

      <!-- Card -->
      <div style="background:white;border-radius:16px;padding:24px;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
        <div style="font-size:20px;font-weight:800;margin-bottom:4px">${isSignIn?'Welcome back':'Create your account'}</div>
        <div style="font-size:13px;color:var(--muted);margin-bottom:20px">${isSignIn?'Sign in to continue':'Start your free trial today'}</div>

        ${!isSignIn?`
        <div class="form-group">
          <label class="form-label">Your Name</label>
          <input class="form-input" id="auth-name" placeholder="Jake Davis" autocomplete="name" name="name">
        </div>
        <div class="form-group">
          <label class="form-label">Company Name</label>
          <input class="form-input" id="auth-company" placeholder="Junk Genies" autocomplete="organization" name="organization">
        </div>`:''}

        <div class="form-group">
          <label class="form-label">Email</label>
          <input class="form-input" id="auth-email" type="email" placeholder="you@company.com" autocomplete="email" name="email" inputmode="email">
        </div>
        <div class="form-group" style="margin-bottom:20px">
          <label class="form-label">Password</label>
          <input class="form-input" id="auth-password" type="password" placeholder="••••••••" autocomplete="current-password" name="password" inputmode="text">
        </div>

        <div id="auth-error" style="color:var(--red);font-size:12px;margin-bottom:12px;min-height:16px"></div>

        <button type="button" class="btn btn-primary btn-full" id="auth-submit" onclick="handleAuth('${mode}')">
          ${isSignIn?'Sign In':'Create Account'}
        </button>
        <div style="text-align:center;margin-top:16px;font-size:13px;color:var(--muted)">
          ${isSignIn?`Don't have an account? <span style="color:var(--primary);cursor:pointer;font-weight:600" onclick="renderLoginPage('signup')">Sign up free</span>`
          :`Already have an account? <span style="color:var(--primary);cursor:pointer;font-weight:600" onclick="renderLoginPage('signin')">Sign in</span>`}
        </div>
      </div>
    </div>`;
}

async function handleAuth(mode) {
  const btn = document.getElementById('auth-submit');
  const errEl = document.getElementById('auth-error');
  const email    = document.getElementById('auth-email')?.value.trim();
  const password = document.getElementById('auth-password')?.value;

  if (!email || !password) { errEl.textContent = 'Email and password are required'; return; }
  if (password.length < 6) { errEl.textContent = 'Password must be at least 6 characters'; return; }

  btn.disabled = true;
  btn.textContent = mode === 'signin' ? 'Signing in…' : 'Creating account…';
  errEl.textContent = '';

  try {
    if (mode === 'signup') {
      const name    = document.getElementById('auth-name')?.value.trim() || '';
      const company = document.getElementById('auth-company')?.value.trim() || '';
      await Auth.signUp(email, password, name, company);
    } else {
      await Auth.signIn(email, password);
    }
    await initApp();
  } catch(e) {
    errEl.textContent = e.message || 'Something went wrong — try again';
    btn.disabled = false;
    btn.textContent = mode === 'signin' ? 'Sign In' : 'Create Account';
  }
}

// ─── INIT WITH SUPABASE ───────────────────────
async function initWithSupabase() {
  const loggedIn = await Auth.restore();
  if (!loggedIn) {
    showLoginScreen();
    return;
  }
  await initApp();
}

async function initApp() {
  showApp();
  // Replace DS methods with CloudDS equivalents
  window._useCloud = true;
  // Load profile and update header
  try {
    const p = await CloudDS.getProfile();
    DS.set('profile', p); // cache locally
    document.getElementById('header-avatar').textContent = p.initials || 'ME';
    if (p.emailjsPublicKey) emailjs.init(p.emailjsPublicKey);
  } catch(e) { console.warn('Profile load error:', e); }

  // Seed employees if none exist
  try {
    const emps = await CloudDS.getEmployees();
    if (!emps.length) await seedCloudEmployees();
  } catch(e) { console.warn('Employee seed error:', e); }

  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(el => {
    el.addEventListener('click', e => { if (e.target === el) closeAllModals(); });
  });
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeAllModals());
  });

  showScreen('dashboard');
}

async function seedCloudEmployees() {
  const uid = Auth.userId;
  const employees = [
    { id: DS.newId('e'), name:'Matt',  role:'owner',      pin:'5931', color:'#0f2d6b', initials:'MT', active:true },
    { id: DS.newId('e'), name:'Wayne', role:'technician', pin:'5930', color:'#00a86b', initials:'WY', active:true },
    { id: DS.newId('e'), name:'John',  role:'technician', pin:'5555', color:'#e07b10', initials:'JN', active:true },
  ];
  for (const emp of employees) await CloudDS.saveEmployee(emp);
}
