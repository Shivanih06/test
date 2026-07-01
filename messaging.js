/* =============================================
   HaulPro — GHL Messaging v4
   Uses v2 API (leadconnectorhq) only
   pit- keys only work with this endpoint
   ============================================= */

const GHL = {
  get apiKey()    { return DS.get('ghl_api_key', ''); },
  get locationId(){ return DS.get('ghl_location_id', ''); },
  get fromPhone() { return DS.get('ghl_from_phone', ''); },
};

function toE164(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits[0] === '1') return '+' + digits;
  return '+' + digits;
}

function ghlHeaders() {
  return {
    'Authorization': 'Bearer ' + GHL.apiKey,
    'Content-Type':  'application/json',
    'Version':       '2021-07-28',
  };
}

async function sendGHLSMS_legacy(toPhone, message) {
  const { apiKey, locationId, fromPhone } = GHL;
  if (!apiKey || !locationId || !fromPhone) {
    toast('⚠️ GHL not configured — check Settings');
    return false;
  }

  const to   = toE164(toPhone);
  const from = toE164(fromPhone);
  console.log('GHL SMS → to:', to, 'from:', from);

  try {
    // ── Step 1: Upsert contact ──
    const upsertResp = await fetch(
      'https://services.leadconnectorhq.com/contacts/upsert',
      {
        method:  'POST',
        headers: ghlHeaders(),
        body: JSON.stringify({ phone: to, locationId }),
      }
    );
    const upsertText = await upsertResp.text();
    console.log('GHL upsert:', upsertResp.status, upsertText);

    let contactId = null;
    try {
      const d = JSON.parse(upsertText);
      contactId = d?.contact?.id || d?.id || d?.contactId || null;
    } catch {}

    if (!contactId) {
      toast('⚠️ GHL upsert failed (' + upsertResp.status + '): ' + upsertText.slice(0, 100));
      return false;
    }
    console.log('GHL contactId:', contactId);

    // ── Step 2: Send SMS ──
    const msgResp = await fetch(
      'https://services.leadconnectorhq.com/conversations/messages',
      {
        method:  'POST',
        headers: ghlHeaders(),
        body: JSON.stringify({
          type:       'SMS',
          contactId,
          fromNumber: from,
          toNumber:   to,
          message,
        }),
      }
    );
    const msgText = await msgResp.text();
    console.log('GHL send:', msgResp.status, msgText);

    if (msgResp.ok) return true;

    toast('⚠️ SMS failed (' + msgResp.status + '): ' + msgText.slice(0, 100));
    return false;

  } catch(e) {
    console.error('GHL error:', e);
    toast('⚠️ GHL error: ' + e.message);
    return false;
  }
}

async function sendEmailJS(toEmail, toName, subject, message) {
  const p = getProfile();
  if (!p.emailjsPublicKey || !p.emailjsServiceId || !p.emailjsTemplateId) return false;
  try {
    emailjs.init(p.emailjsPublicKey);
    await emailjs.send(p.emailjsServiceId, p.emailjsTemplateId, {
      to_email: toEmail, to_name: toName,
      from_name: p.emailjsFromName || p.company,
      subject, message, reply_to: p.email,
    });
    return true;
  } catch(e) {
    console.error('EmailJS error:', e);
    toast('⚠️ Email failed: ' + (e.text || e.message));
    return false;
  }
}

// Twilio needs E.164 (+1XXXXXXXXXX). Phones are stored as bare digits, so normalize here.
function toE164(raw){
  const s = String(raw||'').trim();
  let d = s.replace(/\D/g,'');
  if(!d) return '';
  if(s.startsWith('+')) return '+'+d;               // already international
  if(d.length===10) return '+1'+d;                  // US 10-digit
  if(d.length===11 && d[0]==='1') return '+'+d;     // US with leading 1
  return '+'+d;                                      // assume it already carries a country code
}

// Sends an SMS through the server-side Twilio function (credentials stay server-side).
async function sendSMS(toPhone, text, fromOverride) {
  const to = toE164(toPhone);
  if (!to) return false;
  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/send-sms`, {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${Auth.token}`, 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ to, body: text, from: fromOverride || undefined, orgId: window.MY_ORG_ID }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || data.error) {
      console.warn('SMS error:', data.error || resp.status);
      toast('⚠️ SMS failed: ' + (data.error || ('HTTP ' + resp.status)), 5000);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('SMS error:', e);
    return false;
  }
}

// Builds the placeholder values that message templates can use.
function msgVars(c, p, j, extra) {
  const repFirst = (p.name || '').split(' ')[0] || '';
  // Technician = the tech assigned to the job, else whoever's logged in, else the account name.
  let techName = '';
  if (j && j.techId && typeof getTechName === 'function') techName = getTechName(j.techId) || '';
  if (!techName && typeof myClockIdentity === 'function') techName = (myClockIdentity().name || '');
  if (!techName) techName = p.name || p.company || '';
  const v = {
    customer:        c ? c.firstName : '',
    customerFull:    c ? fullName(c) : '',
    company:         p.company || '',
    rep:             p.name || repFirst,
    repFirst:        repFirst,
    technician:      techName,
    technicianFirst: (techName || '').split(' ')[0] || '',
    phone:           fmtPhone(p.phone || ''),
    address:         j ? (j.address || '') : '',
    date:            j ? fmtDate(j.date) : '',
    time:            j ? fmt12(j.time) : '',
    window:          j ? (j.timeEnd ? fmtArrivalWindow(j.time, j.timeEnd) : fmt12(j.time)) : '',
    service:         j ? (j.service || '') : '',
    price: '', total: '', reviewLink: '', validUntil: '',
  };
  return Object.assign(v, extra || {});
}

async function sendOMW(jobId) {
  const j = getJob(jobId);
  const c = j ? getCustomer(j.customerId) : null;
  if (!c) { toast('⚠️ No customer on this job'); return; }
  const p    = getProfile();
  const t    = getTemplate('omw');
  const vars = msgVars(c, p, j);
  const smsText      = fillTemplate(t.sms, vars);
  const emailSubject = fillTemplate(t.emailSubject, vars);
  const emailBody    = fillTemplate(t.emailBody, vars);
  const hasGHL   = !!(c && c.phone);
  const hasEmail = !!(p.emailjsPublicKey && p.emailjsServiceId && p.emailjsTemplateId);
  if (!hasGHL && !hasEmail) {
    logMessage({ id:newId('m'), customerId:c.id, text:smsText, sent:nowTime(), type:'omw', date:todayStr() });
    renderMessages();
    toast('Logged (no phone or email on file to send to)');
    return;
  }
  toast('<i class="ti ti-loader"></i> Sending…', 6000);
  const [smsOk, emailOk] = await Promise.all([
    hasGHL   ? sendSMS(c.phone, smsText)                               : Promise.resolve(false),
    hasEmail ? sendEmailJS(c.email, fullName(c), emailSubject, emailBody) : Promise.resolve(false),
  ]);
  logMessage({ id:newId('m'), customerId:c.id, text:smsText, sent:nowTime(), type:'omw', date:todayStr() });
  renderMessages();
  if (smsOk || emailOk) {
    const ch = [smsOk?'SMS':'', emailOk?'Email':''].filter(Boolean).join(' + ');
    toast(`<i class="ti ti-check" style="color:#4ade80"></i> Sent via ${ch} to ${c.firstName}!`);
  }
}

async function sendMessage() {
  const c    = getCustomer(State.viewingCustomer);
  const body = document.getElementById('sms-body').value.trim();
  if (!body) { toast('⚠️ Message is empty'); return; }
  const p      = getProfile();
  const hasGHL = !!(c && c.phone);
  if (!hasGHL && !p.emailjsPublicKey) {
    logMessage({ id:newId('m'), customerId:State.viewingCustomer, text:body, sent:nowTime(), type:State.msgTab, date:todayStr() });
    closeModal('modal-sms');
    toast('Logged (no phone or email on file to send to)');
    return;
  }
  toast('<i class="ti ti-loader"></i> Sending…', 5000);
  let ok = false;
  if (State.msgTab === 'sms' && c && hasGHL) {
    ok = await sendSMS(c.phone, body);
  } else if (State.msgTab === 'email' && c) {
    const subject = document.getElementById('email-subject').value || `Message from ${p.company}`;
    ok = await sendEmailJS(c.email, fullName(c), subject, body);
  }
  if (ok) {
    logMessage({ id:newId('m'), customerId:State.viewingCustomer, text:body, sent:nowTime(), type:State.msgTab, date:todayStr() });
    closeModal('modal-sms');
    toast(`<i class="ti ti-check" style="color:#4ade80"></i> ${State.msgTab==='sms'?'SMS':'Email'} sent to ${c?c.firstName:'customer'}`);
  }
}

async function sendInvoiceToCustomer(id) {
  const inv = getInvoice(id);
  const c   = inv ? getCustomer(inv.customerId) : null;
  if (!c) return;
  const total     = invoiceTotal(inv);
  const p         = getProfile();
  const t         = getTemplate('invoice');
  const vars      = msgVars(c, p, null, { total: fmtMoney(total), service: inv.items[0]?.desc || 'Junk Removal', date: fmtDate(inv.date) });
  const smsText   = fillTemplate(t.sms, vars);
  const subject   = fillTemplate(t.emailSubject, vars);
  const emailBody = fillTemplate(t.emailBody, vars);
  const hasGHL = !!(c && c.phone);
  await Promise.all([
    hasGHL ? sendSMS(c.phone, smsText) : Promise.resolve(false),
    sendEmailJS(c.email, fullName(c), subject, emailBody),
  ]);
  logMessage({ id:newId('m'), customerId:c.id, text:`Invoice sent: ${fmtMoney(total)}`, sent:nowTime(), type:'invoice', date:todayStr() });
  toast(`<i class="ti ti-check" style="color:#4ade80"></i> Invoice sent to ${c.firstName}`);
}

async function testMessaging() {
  const p        = getProfile();
  const hasPhone = !!p.phone;
  const hasEmail = !!(p.emailjsPublicKey && p.emailjsServiceId && p.emailjsTemplateId);
  if (!hasPhone && !hasEmail) { toast('⚠️ Add your phone (Profile) or set up email first'); return; }
  toast('<i class="ti ti-loader"></i> Sending test…', 8000);
  if (hasPhone) {
    const ok = await sendSMS(p.phone, `Thrive test ✅ SMS is working! ${new Date().toLocaleTimeString()}`);
    if (ok) toast('<i class="ti ti-check" style="color:#4ade80"></i> Test SMS sent! Check your phone.');
  }
  if (hasEmail) {
    const ok = await sendEmailJS(p.email, p.name, 'Thrive Test Email', 'Email is working! 🎉');
    if (ok) toast('<i class="ti ti-check" style="color:#4ade80"></i> Test email sent!');
  }
}

function nowTime()  { return new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}); }

// ─── BOOKING CONFIRMATION SMS ─────────────────
async function sendBookingConfirmation(jobId) {
  const j = getJob(jobId);
  const c = j ? getCustomer(j.customerId) : null;
  if (!c) return;
  const p    = getProfile();
  const msg  = fillTemplate(getTemplate('confirm').sms, msgVars(c, p, j));
  const hasGHL = !!(c && c.phone);
  if (hasGHL) {
    const ok = await sendSMS(c.phone, msg);
    if (ok) {
      logMessage({ id:newId('m'), customerId:c.id, text:msg, sent:nowTime(), type:'confirm', date:todayStr() });
      console.log('Booking confirmation sent to', c.firstName);
    }
  }
}

// ─── REVIEW REQUEST SMS ───────────────────────
async function sendReviewRequest(jobId) {
  const j = getJob(jobId);
  const c = j ? getCustomer(j.customerId) : null;
  if (!c) return;
  const p          = getProfile();
  const reviewLink = p.googleReviewLink || 'https://g.page/r/YOUR-REVIEW-LINK/review';
  const msg = fillTemplate(getTemplate('complete').sms, msgVars(c, p, j, { reviewLink }));
  const hasGHL = !!(c && c.phone);
  if (hasGHL) {
    const ok = await sendSMS(c.phone, msg);
    if (ok) {
      logMessage({ id:newId('m'), customerId:c.id, text:msg, sent:nowTime(), type:'review', date:todayStr() });
    }
  }
}
