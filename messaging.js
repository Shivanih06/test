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

async function sendGHLSMS(toPhone, message) {
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

async function sendOMW(jobId) {
  const j = getJob(jobId);
  const c = j ? getCustomer(j.customerId) : null;
  if (!c) { toast('⚠️ No customer on this job'); return; }
  const p    = getProfile();
  const name = p.name.split(' ')[0];
  const smsText      = `Hi ${c.firstName}! This is ${name} from ${p.company}. I'm on my way to your address and should arrive in about 15 minutes. See you soon! 🚛`;
  const emailSubject = `${p.company} — On My Way!`;
  const emailBody    = `Hi ${c.firstName},\n\nJust letting you know I'm headed your way and should arrive in about 15 minutes.\n\nAddress: ${j.address}\n\nSee you soon!\n${name}\n${p.company}\n${fmtPhone(p.phone)}`;
  const hasGHL   = !!(GHL.apiKey && GHL.locationId && GHL.fromPhone);
  const hasEmail = !!(p.emailjsPublicKey && p.emailjsServiceId && p.emailjsTemplateId);
  if (!hasGHL && !hasEmail) {
    logMessage({ id:newId('m'), customerId:c.id, text:smsText, sent:nowTime(), type:'omw', date:todayStr() });
    renderMessages();
    toast('Logged — add GHL keys in Settings to send for real');
    return;
  }
  toast('<i class="ti ti-loader"></i> Sending…', 6000);
  const [smsOk, emailOk] = await Promise.all([
    hasGHL   ? sendGHLSMS(c.phone, smsText)                               : Promise.resolve(false),
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
  const hasGHL = !!(GHL.apiKey && GHL.locationId && GHL.fromPhone);
  if (!hasGHL && !p.emailjsPublicKey) {
    logMessage({ id:newId('m'), customerId:State.viewingCustomer, text:body, sent:nowTime(), type:State.msgTab, date:todayStr() });
    closeModal('modal-sms');
    toast('Logged — add GHL keys in Settings to send for real');
    return;
  }
  toast('<i class="ti ti-loader"></i> Sending…', 5000);
  let ok = false;
  if (State.msgTab === 'sms' && c && hasGHL) {
    ok = await sendGHLSMS(c.phone, body);
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
  const smsText   = `Hi ${c.firstName}! Your invoice for ${fmtMoney(total)} from ${p.company} is ready. Call or text us to pay. — ${p.name.split(' ')[0]}`;
  const subject   = `Invoice from ${p.company} — ${fmtMoney(total)}`;
  const emailBody = `Hi ${c.firstName},\n\nThank you for choosing ${p.company}!\n\nService: ${inv.items[0]?.desc||'Junk Removal'}\nDate: ${fmtDate(inv.date)}\nTotal: ${fmtMoney(total)}\n\nPlease call or text us to pay.\n\nThanks,\n${p.name}\n${p.company}\n${fmtPhone(p.phone)}`;
  const hasGHL = !!(GHL.apiKey && GHL.locationId && GHL.fromPhone);
  await Promise.all([
    hasGHL ? sendGHLSMS(c.phone, smsText) : Promise.resolve(false),
    sendEmailJS(c.email, fullName(c), subject, emailBody),
  ]);
  logMessage({ id:newId('m'), customerId:c.id, text:`Invoice sent: ${fmtMoney(total)}`, sent:nowTime(), type:'invoice', date:todayStr() });
  toast(`<i class="ti ti-check" style="color:#4ade80"></i> Invoice sent to ${c.firstName}`);
}

async function testMessaging() {
  const p      = getProfile();
  const hasGHL = !!(GHL.apiKey && GHL.locationId && GHL.fromPhone);
  if (!hasGHL && !p.emailjsPublicKey) { toast('⚠️ Enter your GHL keys in Settings first'); return; }
  toast('<i class="ti ti-loader"></i> Sending test…', 8000);
  if (hasGHL) {
    const testPhone = p.phone || GHL.fromPhone;
    console.log('Testing to:', testPhone, '| API key starts with:', GHL.apiKey.slice(0,10));
    const ok = await sendGHLSMS(testPhone, `HaulPro test ✅ GHL v2 working! ${new Date().toLocaleTimeString()}`);
    if (ok) toast('<i class="ti ti-check" style="color:#4ade80"></i> Test SMS sent! Check your phone.');
  }
  if (p.emailjsPublicKey && p.emailjsServiceId && p.emailjsTemplateId) {
    const ok = await sendEmailJS(p.email, p.name, 'HaulPro Test Email', 'Email is working! 🎉');
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
  const name = p.name.split(' ')[0];
  const msg  = `Hi ${c.firstName}! Your junk removal job with Junk Genies is confirmed ✅\n\nDate: ${fmtDate(j.date)}\nTime: ${fmt12(j.time)}\nService: ${j.service}\nAddress: ${j.address}\n\nQuestions? Call or text us anytime!\n— ${name} | Junk Genies`;
  const hasGHL = !!(GHL.apiKey && GHL.locationId && GHL.fromPhone);
  if (hasGHL) {
    const ok = await sendGHLSMS(c.phone, msg);
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
  const p        = getProfile();
  const name     = p.name.split(' ')[0];
  const reviewLink = p.googleReviewLink || 'https://g.page/r/YOUR-REVIEW-LINK/review';
  const msg = `Hi ${c.firstName}! Thank you for choosing Junk Genies! 🙏 We hope everything went smoothly today.\n\nIf you're happy with our service, we'd love a quick Google review — it means the world to us!\n\n👉 ${reviewLink}\n\nThanks so much!\n— ${name} | Junk Genies`;
  const hasGHL = !!(GHL.apiKey && GHL.locationId && GHL.fromPhone);
  if (hasGHL) {
    const ok = await sendGHLSMS(c.phone, msg);
    if (ok) {
      logMessage({ id:newId('m'), customerId:c.id, text:msg, sent:nowTime(), type:'review', date:todayStr() });
    }
  }
}
