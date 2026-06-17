/* =============================================
   HaulPro — GHL Messaging v2
   ============================================= */

const GHL = {
  get apiKey()    { return DB.get('ghl_api_key', ''); },
  get locationId(){ return DB.get('ghl_location_id', ''); },
  get fromPhone() { return DB.get('ghl_from_phone', ''); },
};

function toE164(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits[0] === '1') return '+' + digits;
  return '+' + digits;
}

// Send SMS via GHL — creates contact if needed, then sends
async function sendGHLSMS(toPhone, message) {
  const apiKey     = GHL.apiKey;
  const locationId = GHL.locationId;
  const fromPhone  = GHL.fromPhone;

  if (!apiKey || !locationId || !fromPhone) {
    console.warn('GHL not configured');
    return false;
  }

  const to   = toE164(toPhone);
  const from = toE164(fromPhone);

  try {
    // Step 1: Upsert contact (create or update — never fails on existing)
    const upsertResp = await fetch('https://rest.gohighlevel.com/v1/contacts/', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: to,
        locationId: locationId,
      }),
    });

    const upsertData = await upsertResp.json();
    console.log('GHL upsert response:', upsertData);

    // GHL returns contact in different shapes depending on new vs existing
    const contactId =
      upsertData?.contact?.id ||
      upsertData?.id ||
      upsertData?.contactId ||
      null;

    if (!contactId) {
      console.error('No contact ID returned:', upsertData);
      toast('⚠️ GHL: Could not create contact — check API key & Location ID');
      return false;
    }

    // Step 2: Send the SMS
    const msgResp = await fetch('https://rest.gohighlevel.com/v1/conversations/messages', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'SMS',
        contactId: contactId,
        fromNumber: from,
        toNumber: to,
        message: message,
      }),
    });

    const msgData = await msgResp.json();
    console.log('GHL send response:', msgData);

    if (msgResp.ok && (msgData.messageId || msgData.id || msgData.conversationId || msgData.msg)) {
      return true;
    } else {
      console.error('GHL send error:', msgData);
      toast('⚠️ SMS failed: ' + (msgData.message || msgData.msg || JSON.stringify(msgData)));
      return false;
    }

  } catch(e) {
    console.error('GHL error:', e);
    toast('⚠️ SMS error — check console');
    return false;
  }
}

// EmailJS
async function sendEmailJS(toEmail, toName, subject, message) {
  const p = getProfile();
  if (!p.emailjsPublicKey || !p.emailjsServiceId || !p.emailjsTemplateId) {
    console.warn('EmailJS not configured');
    return false;
  }
  try {
    emailjs.init(p.emailjsPublicKey);
    const result = await emailjs.send(p.emailjsServiceId, p.emailjsTemplateId, {
      to_email:  toEmail,
      to_name:   toName,
      from_name: p.emailjsFromName || p.company,
      subject:   subject,
      message:   message,
      reply_to:  p.email,
    });
    console.log('Email sent', result.status);
    return true;
  } catch(e) {
    console.error('EmailJS error:', e);
    toast('⚠️ Email failed: ' + (e.text || e.message));
    return false;
  }
}

// On My Way — SMS + Email
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
    toast(`<i class="ti ti-send" style="color:#4ade80"></i> Logged — add GHL keys in Settings to send for real`);
    return;
  }

  toast('<i class="ti ti-loader"></i> Sending…', 5000);

  const [smsOk, emailOk] = await Promise.all([
    hasGHL   ? sendGHLSMS(c.phone, smsText)                                        : Promise.resolve(false),
    hasEmail ? sendEmailJS(c.email, fullName(c), emailSubject, emailBody) : Promise.resolve(false),
  ]);

  logMessage({ id:newId('m'), customerId:c.id, text:smsText, sent:nowTime(), type:'omw', date:todayStr() });
  renderMessages();

  if (smsOk || emailOk) {
    const channels = [smsOk?'SMS':'', emailOk?'Email':''].filter(Boolean).join(' + ');
    toast(`<i class="ti ti-check" style="color:#4ade80"></i> Sent via ${channels} to ${c.firstName}!`);
  }
}

// Manual send from SMS modal
async function sendMessage() {
  const c    = getCustomer(State.viewingCustomer);
  const body = document.getElementById('sms-body').value.trim();
  if (!body) { toast('⚠️ Message is empty'); return; }

  const p      = getProfile();
  const hasGHL = !!(GHL.apiKey && GHL.locationId && GHL.fromPhone);

  if (!hasGHL && !p.emailjsPublicKey) {
    logMessage({ id:newId('m'), customerId:State.viewingCustomer, text:body, sent:nowTime(), type:State.msgTab, date:todayStr() });
    closeModal('modal-sms');
    toast(`Logged — add GHL keys in Settings to send for real`);
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

// Invoice notification
async function sendInvoiceToCustomer(id) {
  const inv = getInvoice(id);
  const c   = inv ? getCustomer(inv.customerId) : null;
  if (!c) return;
  const total    = invoiceTotal(inv);
  const p        = getProfile();
  const smsText  = `Hi ${c.firstName}! Your invoice for ${fmtMoney(total)} from ${p.company} is ready. Call or text us to pay. — ${p.name.split(' ')[0]}`;
  const subject  = `Invoice from ${p.company} — ${fmtMoney(total)}`;
  const emailBody= `Hi ${c.firstName},\n\nThank you for choosing ${p.company}!\n\nService: ${inv.items[0]?.desc||'Junk Removal'}\nDate: ${fmtDate(inv.date)}\nTotal: ${fmtMoney(total)}\n\nPlease call or text us to arrange payment.\n\nThanks,\n${p.name}\n${p.company}\n${fmtPhone(p.phone)}`;

  const hasGHL = !!(GHL.apiKey && GHL.locationId && GHL.fromPhone);
  const [smsOk, emailOk] = await Promise.all([
    hasGHL ? sendGHLSMS(c.phone, smsText) : Promise.resolve(false),
    sendEmailJS(c.email, fullName(c), subject, emailBody),
  ]);
  logMessage({ id:newId('m'), customerId:c.id, text:`Invoice sent: ${fmtMoney(total)}`, sent:nowTime(), type:'invoice', date:todayStr() });
  toast(`<i class="ti ti-check" style="color:#4ade80"></i> Invoice sent to ${c.firstName}`);
}

// Test button in Settings
async function testMessaging() {
  const p      = getProfile();
  const hasGHL = !!(GHL.apiKey && GHL.locationId && GHL.fromPhone);
  if (!hasGHL && !p.emailjsPublicKey) {
    toast('⚠️ Enter your GHL keys in Settings first');
    return;
  }
  toast('<i class="ti ti-loader"></i> Sending test…', 6000);
  if (hasGHL) {
    const testPhone = p.phone || GHL.fromPhone;
    const ok = await sendGHLSMS(testPhone, `HaulPro test SMS ✅ — GHL messaging is working! ${new Date().toLocaleTimeString()}`);
    if (ok) toast('<i class="ti ti-check" style="color:#4ade80"></i> Test SMS sent! Check your phone.');
  }
  if (p.emailjsPublicKey && p.emailjsServiceId && p.emailjsTemplateId) {
    await sendEmailJS(p.email, p.name, 'HaulPro Test Email', 'This is a test from your HaulPro app. Email is working! 🎉');
  }
}

function nowTime()  { return new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}); }
function todayStr() { return new Date().toISOString().slice(0,10); }
