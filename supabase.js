/* =============================================
   Thrive — Supabase Integration
   Replaces localStorage with cloud database
   ============================================= */

const SUPABASE_URL = 'https://znjclglbjifracvrzkik.supabase.co';
const SUPABASE_KEY = 'sb_publishable_aUuw2yi8tcZCEWA5CFkg8Q_UZBnDh82';

// ─── SUPABASE CLIENT ─────────────────────────
const SB = {
  async request(method, path, body, _retried) {
    const url  = `${SUPABASE_URL}/rest/v1/${path}`;
    const opts = {
      method,
      headers: {
        'apikey':        SUPABASE_KEY,
        'Authorization': `Bearer ${Auth.token || SUPABASE_KEY}`,
        'Content-Type':  'application/json',
        // POSTs are upserts (on_conflict=id) — merge-duplicates makes a conflict UPDATE the row
        // instead of throwing 23505 duplicate-key, so editing/re-saving a record actually syncs.
        'Prefer':        method === 'POST' ? 'resolution=merge-duplicates,return=representation' : 'return=representation',
      },
    };
    if (body) opts.body = JSON.stringify(body);
    const resp = await fetch(url, opts);
    // Token expired mid-session → refresh once and retry before giving up.
    if ((resp.status === 401 || resp.status === 403) && !_retried && Auth.token) {
      const refresh = localStorage.getItem('thrive_refresh');
      if (refresh && await Auth.refreshToken(refresh)) {
        return this.request(method, path, body, true);
      }
      window._authBroken = true;   // surfaced in Settings → Sync status
    }
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
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(data.error_description || data.msg || (data.error && (data.error.message || data.error)) || 'Could not create account');
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
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || !data.access_token) {
      throw new Error(data.error_description || data.msg || data.error || 'Invalid email or password');
    }
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
    window.MY_ROLE = null;
    window.MY_ORG_ID = null;
    window.MY_EMPLOYEE_ID = null;
    try { DS.set('current_employee', null); } catch(e) {}
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
        if (refresh && await this.refreshToken(refresh)) return true;
        // Dead session → clear it so the app doesn't run cloud-mode without a token.
        this.token = null; this.user = null;
        localStorage.removeItem('thrive_token');
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

  // Start a session from tokens delivered in an invite/recovery link.
  async setSessionFromTokens(accessToken, refreshToken) {
    this.token = accessToken;
    localStorage.setItem('thrive_token', accessToken);
    if (refreshToken) localStorage.setItem('thrive_refresh', refreshToken);
    const resp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${accessToken}` },
    });
    if (!resp.ok) throw new Error('Could not establish session from invite link');
    this.user = await resp.json();
    localStorage.setItem('thrive_user', JSON.stringify(this.user));
    return this.user;
  },

  // Update the current user (e.g. set a password).
  async updateUser(attrs) {
    const resp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method: 'PUT',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(attrs),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(data.msg || data.error_description || data.error || 'Could not update account');
    this.user = data;
    localStorage.setItem('thrive_user', JSON.stringify(data));
    return data;
  },
};

// ─── CLOUD DATASTORE ─────────────────────────
// Overrides DS methods to use Supabase instead of localStorage
const CloudDS = {

  uid() { return Auth.userId; },

  // Query scope: filter by business (org) when known, else fall back to the
  // individual login — so the owner is never blanked if org isn't resolved.
  scope() { return window.MY_ORG_ID ? `org_id=eq.${window.MY_ORG_ID}` : `${this.scope()}`; },
  orgId() { return window.MY_ORG_ID || null; },

  // ── CUSTOMERS ──
  async getCustomers() {
    const rows = await SB.get('customers', `${this.scope()}&select=*`);
    return rows.map(this._mapCustomer);
  },
  async getCustomer(id) {
    const rows = await SB.get('customers', `id=eq.${id}&${this.scope()}`);
    return rows[0] ? this._mapCustomer(rows[0]) : null;
  },
  async saveCustomer(c) {
    const row = {
      id:          c.id,
      user_id:     this.uid(),
      org_id:      this.orgId(),
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
    const rows = await SB.get('jobs', `${this.scope()}&select=*`);
    return rows.map(this._mapJob);
  },
  async getJob(id) {
    const rows = await SB.get('jobs', `id=eq.${id}&${this.scope()}`);
    return rows[0] ? this._mapJob(rows[0]) : null;
  },
  async getJobsForDate(date) {
    const rows = await SB.get('jobs', `${this.scope()}&date=eq.${date}&order=time.asc`);
    return rows.map(this._mapJob);
  },
  async saveJob(j) {
    const row = {
      id:          j.id,
      user_id:     this.uid(),
      org_id:      this.orgId(),
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
      confirmed:   j.confirmed !== false,
    };
    const result = await SB.upsert('jobs', row);
    return result[0] ? this._mapJob(result[0]) : j;
  },
  async deleteJob(id) {
    await SB.deleteWhere('invoices',   'job_id', id);
    await SB.deleteWhere('job_timers', 'job_id', id);
    try { await SB.delete('job_extras', id); } catch(e){}
    await SB.delete('jobs', id);
  },
  // ── JOB EXTRAS (per-job side data synced as one JSON blob: schedule/recurrence,
  //    discounts, tax rate, payments, job costs, line items, multi-assignees). id = job id. ──
  async getJobExtras() {
    const rows = await SB.get('job_extras', `${this.scope()}&select=id,data`);
    const map = {};
    rows.forEach(r => { map[r.id] = r.data || {}; });
    return map;
  },
  async saveJobExtras(jobId, data) {
    const row = { id: jobId, user_id: this.uid(), org_id: this.orgId(), data: data || {}, updated_at: new Date().toISOString() };
    return SB.upsert('job_extras', row);
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
      confirmed:  row.confirmed !== false,
    };
  },

  // ── INVOICES ──
  async getInvoices() {
    const rows = await SB.get('invoices', `${this.scope()}&select=*`);
    return rows.map(this._mapInvoice);
  },
  async getInvoice(id) {
    const rows = await SB.get('invoices', `id=eq.${id}&${this.scope()}`);
    return rows[0] ? this._mapInvoice(rows[0]) : null;
  },
  async saveInvoice(inv) {
    const row = {
      id:          inv.id,
      user_id:     this.uid(),
      org_id:      this.orgId(),
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
    const rows = await SB.get('estimates', `${this.scope()}&select=*`);
    return rows.map(this._mapEstimate);
  },
  async getEstimate(id) {
    const rows = await SB.get('estimates', `id=eq.${id}&${this.scope()}`);
    return rows[0] ? this._mapEstimate(rows[0]) : null;
  },
  async saveEstimate(est) {
    const row = {
      id:          est.id,
      user_id:     this.uid(),
      org_id:      this.orgId(),
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
    const rows = await SB.get('employees', `${this.scope()}&select=*`);
    return rows.map(r => ({
      id:        r.id,
      firstName: r.first_name || (r.name||'').split(' ')[0] || '',
      lastName:  r.last_name  || (r.name||'').split(' ').slice(1).join(' ') || '',
      name:      r.name,
      phone:     r.phone || '',
      email:     r.email || '',
      role:      r.role,
      pin:       r.pin,
      payRate:   Number(r.pay_rate) || 0,
      color:     r.color,
      initials:  r.initials,
      active:    r.active,
    }));
  },
  async saveEmployee(emp) {
    const row = {
      id:         emp.id,
      user_id:    this.uid(),
      org_id:      this.orgId(),
      name:       emp.name || `${emp.firstName||''} ${emp.lastName||''}`.trim(),
      first_name: emp.firstName || '',
      last_name:  emp.lastName  || '',
      phone:      emp.phone || '',
      email:      emp.email || '',
      role:       emp.role || 'tech',
      pin:        emp.pin || null,
      pay_rate:   Number(emp.payRate) || 0,
      color:      emp.color || '#1a6fdb',
      initials:   emp.initials,
      active:     emp.active !== false,
    };
    await SB.upsert('employees', row);
    return emp;
  },
  async deleteEmployee(id) {
    await SB.delete('employees', id);
  },

  // ── MESSAGES ──
  async getMessages() {
    const rows = await SB.get('messages', `${this.scope()}&select=*&order=created_at.desc&limit=200`);
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
      org_id:      this.orgId(),
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
      plan:             settings.plan || r.plan || 'starter',
      extraSeats:        Number(settings.extraSeats) || 0,
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
    await SB.upsert('profiles', {
      id:       this.uid(),
      org_id:   window.MY_ORG_ID || null,
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
        plan:              profile.plan,
        extraSeats:        profile.extraSeats,
      },
    });
    // Also save to localStorage as cache
    DS.set('profile', profile);
    return profile;
  },

  // ── ORG-WIDE SHARED SETTINGS (price book, message templates, …) ──
  // Stored on the organizations row so every device in the business loads
  // the same config. Read by all members; written by admins (RLS-enforced).
  async getOrgSettings() {
    if (!window.MY_ORG_ID) return {};
    try {
      const rows = await SB.get('organizations', `id=eq.${window.MY_ORG_ID}&select=settings`);
      return (rows && rows[0] && rows[0].settings) ? rows[0].settings : {};
    } catch (e) { console.warn('getOrgSettings failed:', e); return {}; }
  },
  async saveOrgSettings(patch) {
    if (!window.MY_ORG_ID) return false;
    try {
      const current = await this.getOrgSettings();
      const merged  = Object.assign({}, current, patch);
      await SB.update('organizations', window.MY_ORG_ID, { settings: merged });
      return true;
    } catch (e) { console.warn('saveOrgSettings failed:', e); return false; }
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

  async getReportsAddon() {
    if (!this.orgId()) return false;
    const rows = await SB.get('organizations', `id=eq.${this.orgId()}&select=reports_addon`);
    return !!(rows && rows[0] && rows[0].reports_addon);
  },
  newId(prefix) { return DS.newId(prefix); },
};

// CRITICAL: app.js gates every cloud read/write/sync behind `window.CloudDS` and `window.Auth`.
// These are top-level `const`s, which are NOT auto-attached to window in browsers — so without
// these two lines, every cloud WRITE/push/hydrate silently no-ops and the session check reads false.
window.Auth    = Auth;
window.CloudDS = CloudDS;

// ─── LOGIN SCREEN ─────────────────────────────
function showLoginScreen() {
  document.getElementById('app-header').style.display    = 'none';
  document.getElementById('screens-container').style.display = 'none';
  document.getElementById('bottom-nav').style.display   = 'none';
  const fabA = document.getElementById('fab-add'); if (fabA) fabA.style.display = 'none';
  if (typeof closeFab === 'function') closeFab();
  document.getElementById('login-screen').style.display = 'flex';
  if (typeof renderWelcome === 'function') renderWelcome(); else renderLoginPage('signin');
}

function showApp() {
  document.getElementById('app-header').style.display    = 'flex';
  document.getElementById('screens-container').style.display = 'block';
  document.getElementById('bottom-nav').style.display   = 'flex';
  const fabA = document.getElementById('fab-add'); if (fabA) fabA.style.display = 'flex';
  document.getElementById('login-screen').style.display = 'none';
}

function renderLoginPage(mode) {
  const isSignIn = mode === 'signin';
  const _ls = document.getElementById('login-screen');
  if (_ls) _ls.style.background = 'linear-gradient(135deg,#0f2d6b 0%,#1a4a8a 50%,#00a86b 100%)';
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
          ${isSignIn?`Don't have an account? <span style="color:var(--primary);cursor:pointer;font-weight:600" onclick="startSignup()">Sign up free</span>`
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
  // Invite / password-reset links return here with tokens in the URL hash.
  const hash = window.location.hash || '';
  if (hash.includes('access_token') &&
      (hash.includes('type=invite') || hash.includes('type=recovery') || hash.includes('type=signup'))) {
    const params = new URLSearchParams(hash.replace(/^#/, ''));
    try {
      await Auth.setSessionFromTokens(params.get('access_token'), params.get('refresh_token'));
      // Clear the hash so a refresh doesn't re-trigger this flow.
      history.replaceState(null, '', window.location.pathname + window.location.search);
      showSetPasswordScreen();
      return;
    } catch (e) {
      console.warn('Invite link error:', e);
      // fall through to the normal flow
    }
  }

  const loggedIn = await Auth.restore();
  if (!loggedIn) {
    showLoginScreen();
    return;
  }
  await initApp();
}

// Welcome screen shown to an invited employee so they set a password.
function showSetPasswordScreen() {
  const email = (Auth.user && Auth.user.email) || '';
  let el = document.getElementById('setpw-overlay');
  if (el) el.remove();
  el = document.createElement('div');
  el.id = 'setpw-overlay';
  el.style.cssText = 'position:fixed;inset:0;z-index:9999;background:var(--bg,#0f1117);display:flex;align-items:center;justify-content:center;padding:22px';
  el.innerHTML = `
    <div style="width:100%;max-width:380px">
      <div style="text-align:center;margin-bottom:22px">
        <div style="width:60px;height:60px;border-radius:16px;background:var(--primary);color:#fff;font-size:28px;font-weight:800;display:flex;align-items:center;justify-content:center;margin:0 auto 14px">T</div>
        <div style="font-size:22px;font-weight:800" id="setpw-title">Welcome aboard 👋</div>
        <div style="color:var(--muted);font-size:14px;margin-top:6px">Set a password to finish setting up your account.</div>
        ${ email ? `<div style="color:var(--muted);font-size:13px;margin-top:8px">${email}</div>` : '' }
      </div>
      <div style="display:flex;flex-direction:column;gap:12px">
        <input id="setpw-pass" type="password" placeholder="Create a password" autocomplete="new-password"
          style="width:100%;padding:14px;border-radius:12px;border:1px solid var(--border);background:var(--surface,#fff);font-size:15px">
        <input id="setpw-pass2" type="password" placeholder="Confirm password" autocomplete="new-password"
          style="width:100%;padding:14px;border-radius:12px;border:1px solid var(--border);background:var(--surface,#fff);font-size:15px">
        <div id="setpw-err" style="color:#d03030;font-size:13px;min-height:16px"></div>
        <button id="setpw-btn" class="btn btn-full" style="font-weight:700" onclick="submitSetPassword()">Set Password &amp; Continue</button>
      </div>
    </div>`;
  document.body.appendChild(el);
  setTimeout(() => { const i = document.getElementById('setpw-pass'); if (i) i.focus(); }, 100);

  // Personalize the heading with the business name if we can find it.
  (async () => {
    try {
      const mems = await SB.get('memberships', `user_id=eq.${Auth.userId}&select=org_id`);
      if (mems && mems.length) {
        const orgs = await SB.get('organizations', `id=eq.${mems[0].org_id}&select=name`);
        const name = orgs && orgs[0] && orgs[0].name;
        const t = document.getElementById('setpw-title');
        if (name && t) t.textContent = `Welcome to ${name} 👋`;
      }
    } catch (e) { /* generic heading is fine */ }
  })();
}

async function submitSetPassword() {
  const p1 = document.getElementById('setpw-pass').value;
  const p2 = document.getElementById('setpw-pass2').value;
  const err = document.getElementById('setpw-err');
  const btn = document.getElementById('setpw-btn');
  err.textContent = '';
  if (!p1 || p1.length < 6) { err.textContent = 'Password must be at least 6 characters.'; return; }
  if (p1 !== p2) { err.textContent = 'Passwords don\'t match.'; return; }
  btn.disabled = true; btn.textContent = 'Setting up…';
  try {
    await Auth.updateUser({ password: p1 });
    const ov = document.getElementById('setpw-overlay');
    if (ov) ov.remove();
    await initApp();
  } catch (e) {
    err.textContent = e.message || 'Something went wrong — try again.';
    btn.disabled = false; btn.textContent = 'Set Password & Continue';
  }
}

// After returning from Stripe checkout, give the webhook a moment to flip the
// org to active/trialing before deciding whether to show the gate.
async function waitForActivation() {
  for (let i = 0; i < 6; i++) {
    try {
      const rows = await SB.get('organizations', `id=eq.${window.MY_ORG_ID}&select=subscription_status`);
      const st = rows && rows[0] ? rows[0].subscription_status : null;
      if (st === 'active' || st === 'trialing') { window._subActive = true; return true; }
    } catch (e) { /* keep polling */ }
    await new Promise(r => setTimeout(r, 1500));
  }
  return false;
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

    // Resolve which business this login belongs to, and their role.
    try {
      const mems = await SB.get('memberships', `user_id=eq.${Auth.userId}&select=org_id,role`);
      if (mems && mems.length) {
        window.MY_ORG_ID = mems[0].org_id;
        window.MY_ROLE   = mems[0].role || 'admin';
      } else {
        // No membership = a brand-new self-serve signup. Auto-create their
        // workspace (org + admin membership) via the secure platform function.
        try {
          const resp = await fetch(`${SUPABASE_URL}/functions/v1/provision-org`, {
            method:  'POST',
            headers: { 'Authorization': `Bearer ${Auth.token}`, 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
            body:    JSON.stringify({ companyName: p.company || '' }),
          });
          const pr = await resp.json().catch(() => ({}));
          if (resp.ok && pr.org_id) {
            window.MY_ORG_ID = pr.org_id;
            window.MY_ROLE   = pr.role || 'admin';
            if (pr.created) window._justProvisioned = true;   // first-run → show welcome
          } else {
            window.MY_ORG_ID = null;
            window.MY_ROLE   = 'tech';
            console.warn('Provision-org returned no org:', pr.error);
          }
        } catch (e) {
          window.MY_ORG_ID = null;
          window.MY_ROLE   = 'tech';
          console.warn('Provision-org failed:', e);
        }
      }
    } catch(e) {
      // Fail CLOSED: if we can't confirm the role, grant the least privilege
      // rather than defaulting to admin (which would be a privilege-escalation hole).
      window.MY_ORG_ID = null;
      window.MY_ROLE   = 'tech';
      console.warn('Membership lookup failed:', e);
    }
    // Load the business's SHARED settings (price book + message templates +
    // business info) so every device — admin or tech — uses the same config.
    try {
      if (window.MY_ORG_ID) {
        const os = await CloudDS.getOrgSettings();
        if (os && os.price_book)    DS.set('price_book',    os.price_book);
        if (os && os.msg_templates) DS.set('msg_templates', os.msg_templates);
        ['job_types','job_tags','lead_sources','job_costs'].forEach(k => {
          if (os && Array.isArray(os[k])) DS.set(k, os[k]);
        });
        if (os && os.business && typeof applyBusinessSettings === 'function') {
          applyBusinessSettings(os.business);
          Object.assign(p, DS.get('profile', {}));   // sync the local copy used below
          if (p.emailjsPublicKey && window.emailjs) emailjs.init(p.emailjsPublicKey);
        }
      }
    } catch (e) { console.warn('Org settings load failed:', e); }
    // Subscription gate: only LOCK on a positively-inactive status. Unknown /
    // missing column / read error → fail OPEN (never lock out a real user).
    window._subActive = true;
    try {
      if (window.MY_ORG_ID) {
        const orows = await SB.get('organizations', `id=eq.${window.MY_ORG_ID}&select=subscription_status,reports_addon`);
        const orow = orows && orows[0] ? orows[0] : null;
        const st = orow ? orow.subscription_status : null;
        if (st === 'inactive' || st === 'canceled' || st === 'past_due') window._subActive = false;
        // Reports add-on entitlement comes from real billing (Stripe webhook → reports_addon).
        try { const prof = DS.getProfile(); const on = !!(orow && orow.reports_addon); if (prof && prof.reportsAddon !== on) { prof.reportsAddon = on; DS.saveProfile(prof); } } catch (e2) {}
      }
    } catch (e) { console.warn('Subscription check skipped:', e); }
    // Link this login to its employee record (by email) and cache the team
    // locally so the dashboard can resolve names + the clock card synchronously.
    try {
      const emps = await CloudDS.getEmployees();
      DS.set('employees', emps);
      const myEmail = (Auth.user && Auth.user.email ? Auth.user.email : (p.email || '')).toLowerCase();
      const me = emps.find(e => (e.email || '').toLowerCase() === myEmail);
      window.MY_EMPLOYEE_ID = me ? me.id : null;
      if (me && window.MY_ROLE === 'tech') DS.setCurrentEmployee(me);
    } catch (e) {
      window.MY_EMPLOYEE_ID = null;
      console.warn('Employee link failed:', e);
    }

    if (typeof applyRoleGating === 'function') applyRoleGating();
    // Pull the org's jobs/customers/invoices/estimates DOWN so every device shows the same data
    // (UI renders from local storage). Merge-based, so a device's un-pushed local rows survive.
    if (typeof hydrateCloudToLocal === 'function') { try { await hydrateCloudToLocal(); } catch(e){ console.warn('Cloud→local hydrate failed:', e); } }
    // Pull per-job extras (schedule/recurrence, discounts, tax, payments, costs,
    // line items, assignees) down into local storage so the synchronous getters work.
    if (typeof hydrateJobExtras === 'function') { try { await hydrateJobExtras(); } catch(e){ console.warn('Job extras hydrate failed:', e); } }
    // Keep this device current automatically (on focus + light background poll).
    if (typeof startAutoSync === 'function') { try { startAutoSync(); } catch(e){} }
    // Load Google Maps for address autocomplete on startup. This boot path
    // (Supabase) is the one that actually runs, so the key must be loaded here.
    if (p.googleMapsKey && typeof loadGooglePlaces === 'function') {
      window.GOOGLE_MAPS_KEY = p.googleMapsKey;
      loadGooglePlaces();
    }
  } catch(e) { console.warn('Profile load error:', e); }

  // Seed employees if none exist
  // DISABLED — real accounts start with an empty team and onboard real people.
  // (Re-enable for demo data only.)
  // try {
  //   const emps = await CloudDS.getEmployees();
  //   if (!emps.length) await seedCloudEmployees();
  // } catch(e) { console.warn('Employee seed error:', e); }

  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(el => {
    el.addEventListener('click', e => { if (e.target === el) closeAllModals(); });
  });
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeAllModals());
  });

  // Subscription gate — no active plan = no access (no free accounts).
  if (window._subActive === false) {
    const justSubscribed = new URLSearchParams(location.search).get('subscribed') === '1';
    if (justSubscribed && await waitForActivation()) {
      history.replaceState({}, '', location.pathname);   // activated → fall through to app
    } else {
      if (typeof showSubscribeScreen === 'function') showSubscribeScreen();
      return;
    }
  }
  showScreen('dashboard');
  // If we just came back from a Stripe on-device payment, mark the invoice paid.
  if (typeof handleReturnFromStripe === 'function') handleReturnFromStripe();
  if (typeof handleReturnFromReports === 'function') handleReturnFromReports();
  // Brand-new signup → show the GET STARTED checklist (also after the Stripe trial redirect).
  if ((window._justProvisioned || (typeof DS !== 'undefined' && DS.get('pending_signup', null))) && typeof showOnboarding === 'function') showOnboarding();
}

async function seedCloudEmployees() {
  const uid = Auth.userId;
  const employees = [
    { id: newUUID(), name:'Matt',  role:'owner',      pin:'5931', color:'#0f2d6b', initials:'MT', active:true },
    { id: newUUID(), name:'Wayne', role:'technician', pin:'5930', color:'#00a86b', initials:'WY', active:true },
    { id: newUUID(), name:'John',  role:'technician', pin:'5555', color:'#e07b10', initials:'JN', active:true },
  ];
  for (const emp of employees) await CloudDS.saveEmployee(emp);
}
