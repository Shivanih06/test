/* =============================================
   HaulPro — GHL Messaging
   Sends SMS via Go High Level API
   ============================================= */

const GHL = {
  // These are set from Settings and stored locally
  get apiKey()    { return DB.get('ghl_api_key', ''); },
  get locationId(){ return DB.get('ghl_location_id', ''); },
  get fromPhone() { return DB.get('ghl_from_phone', ''); },
};

// Format phone to E.164
function toE164(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits[0] === '1') return '+' + digits;
  return '+' + digits;
}

// Send SMS via GHL
async function sendGHLSMS(toPhone, message) {
  const apiKey    = GHL.apiKey;
  const locationId= GHL.locationId;
  const fromPhone = GHL.fromPhone;

  if (!apiKey || !locationId || !fromPhone) {
    console.warn('GHL not configured');
    return false;
  }

  const to = toE164(toPhone);
  const from = toE164(fromPhone);

  try {
    // First find or create contact in GHL
    const contactId = await findOrCreateGHLContact(toPhone, apiKey, locationId);
    if (!contactId) { toast('⚠️ Could not find contact in GHL'); return false; }

    // Send message via GHL conversations API
    const resp = await fetch('https://rest.gohighlevel.com/v1/conversations/messages', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
        'Version': '2021-04-15',
      },
      body: JSON.stringify({
        type: 'SMS',
        contactId: contactId,
        fromNumber: from,
        toNumber: to,
        message: message,
      }),
    });

    const data = await resp.json();
    console.log('GHL SMS response:', data);

    if (resp.ok && (data.messageId || data.id || data.conversationId)) {
      return true;
    } else {
      console.error('GHL SMS error:', data);
      toast('⚠️ SMS failed: ' + (data.message || data.msg || 'Unknown error'));
      return false;
    }
  } catch(e) {
    console.error('GHL fetch error:', e);
    toast('⚠️ SMS error — check console');
    return false;
  }
}

// Find or create a GHL contact by phone number
async function findOrCreateGHLContact(phone, apiKey, locationId) {
  const e164 = toE164(phone);
  try {
    // Search for existing contact
    const searchResp = await fetch(
      `https://rest.gohighlevel.com/v1/contacts/?locationId=${locationId}&query=${encodeURIComponent(e164)}`,
      { headers: { 'Authorization': 'Bearer ' + apiKey } }
    );
    const searchData = await searchResp.json();
    if (searchData.contacts && searchData.contacts.length > 0) {
      return searchData.contacts[0].id;
    }

    // Create new contact if not found
    const createResp = await fetch('https://rest.gohighlevel.com/v1/contacts/', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone: e164, locationId }),
    });
    const createData = await createResp.json();
    return createData.contact?.id || createData.id || null;
  } catch(e) {
    console.error('GHL contact error:', e);
    return null;
  }
}

// Send email via EmailJS (unchanged)
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

// Main "On My Way" sender — SMS via GHL + Email via EmailJS
async function sendOMW(jobId) {
  const j = getJob(jobId);
  const c = j ? getCustomer(j.customerId) : null;
  if (!c) { toast('⚠️ No customer on this job'); return; }

  const p    = getProfile();
  const name = p.name.split(' ')[0];
  const smsText = `Hi ${c.firstName}! This is ${name} from ${p.company}. I'm on my way to your address and should arrive in about 15 minutes. See you soon! 🚛`;
  const emailSubject = `${p.company} — On My Way!`;
  const emailBody    = `Hi ${c.firstName},\n\nJust letting you know I'm headed your way now and should arrive in about 15 minutes.\n\nAddress: ${j.address}\n\nSee you soon!\n\n${name}\n${p.company}\n${fmtPhone(p.phone)}`;

  const hasGHL   = GHL.apiKey && GHL.locationId && GHL.fromPhone;
  const hasEmail = p.emailjsPublicKey && p.emailjsServiceId && p.emailjsTemplateId;

  if (!hasGHL && !hasEmail) {
    toast(`<i class="ti ti-send" style="color:#4ade80"></i> Logged (finish setup in Settings)`);
    logMessage({ id:newId('m'), customerId:c.id, text:smsText, sent:now(), type:'omw', date:today() });
    return;
  }

  toast('<i class="ti ti-loader"></i> Sending…', 4000);

  const [smsOk, emailOk] = await Promise.all([
    hasGHL   ? sendGHLSMS(c.phone, smsText) : Promise.resolve(false),
    hasEmail ? sendEmailJS(c.email, fullName(c), emailSubject, emailBody) : Promise.resolve(false),
  ]);

  const channels = [smsOk ? 'SMS' : '', emailOk ? 'Email' : ''].filter(Boolean).join(' + ');
  logMessage({ id:newId('m'), customerId:c.id, text:smsText, sent:now(), type:'omw', date:today() });
  renderMessages();

  if (smsOk || emailOk) {
    toast(`<i class="ti ti-check" style="color:#4ade80"></i> Sent via ${channels} to ${c.firstName}!`);
  }
}

// Manual message send (SMS modal)
async function sendMessage() {
  const c    = getCustomer(State.viewingCustomer);
  const body = document.getElementById('sms-body').value.trim();
  if (!body) { toast('⚠️ Message is empty'); return; }

  const hasGHL = GHL.apiKey && GHL.locationId && GHL.fromPhone;
  const p = getProfile();

  if (!hasGHL && !p.emailjsPublicKey) {
    logMessage({ id:newId('m'), customerId:State.viewingCustomer, text:body, sent:now(), type:State.msgTab, date:today() });
    closeModal('modal-sms');
    toast(`<i class="ti ti-send" style="color:#4ade80"></i> Logged (finish setup in Settings)`);
    return;
  }

  toast('<i class="ti ti-loader"></i> Sending…', 4000);
  let ok = false;

  if (State.msgTab === 'sms' && c && hasGHL) {
    ok = await sendGHLSMS(c.phone, body);
  } else if (State.msgTab === 'email' && c) {
    const subject = document.getElementById('email-subject').value || `Message from ${p.company}`;
    ok = await sendEmailJS(c.email, fullName(c), subject, body);
  }

  if (ok) {
    logMessage({ id:newId('m'), customerId:State.viewingCustomer, text:body, sent:now(), type:State.msgTab, date:today() });
    closeModal('modal-sms');
    toast(`<i class="ti ti-check" style="color:#4ade80"></i> ${State.msgTab === 'sms' ? 'SMS' : 'Email'} sent to ${c ? c.firstName : 'customer'}`);
  }
}

// Send invoice notification
async function sendInvoiceToCustomer(id) {
  const inv = getInvoice(id);
  const c   = inv ? getCustomer(inv.customerId) : null;
  if (!c) return;
  const total   = invoiceTotal(inv);
  const p       = getProfile();
  const smsText = `Hi ${c.firstName}! Your invoice for ${fmtMoney(total)} from ${p.company} is ready. Call or text us to pay. Thanks! — ${p.name.split(' ')[0]}`;
  const subject = `Invoice from ${p.company} — ${fmtMoney(total)}`;
  const emailBody = `Hi ${c.firstName},\n\nThank you for choosing ${p.company}!\n\nService: ${inv.items[0]?.desc || 'Junk Removal'}\nDate: ${fmtDate(inv.date)}\nTotal: ${fmtMoney(total)}\n\nPlease call or text us to arrange payment.\n\nThanks,\n${p.name}\n${p.company}\n${fmtPhone(p.phone)}`;

  const hasGHL = GHL.apiKey && GHL.locationId && GHL.fromPhone;
  await Promise.all([
    hasGHL ? sendGHLSMS(c.phone, smsText) : Promise.resolve(false),
    sendEmailJS(c.email, fullName(c), subject, emailBody),
  ]);
  logMessage({ id:newId('m'), customerId:c.id, text:`Invoice sent: ${fmtMoney(total)}`, sent:now(), type:'invoice', date:today() });
  toast(`<i class="ti ti-check" style="color:#4ade80"></i> Invoice sent to ${c.firstName}`);
}

// Test messaging
async function testMessaging() {
  const p = getProfile();
  const hasGHL = GHL.apiKey && GHL.locationId && GHL.fromPhone;
  if (!hasGHL && !p.emailjsPublicKey) { toast('⚠️ Enter your GHL keys in Settings first'); return; }
  toast('<i class="ti ti-loader"></i> Sending test…', 4000);
  if (hasGHL) {
    const ok = await sendGHLSMS(p.phone, `HaulPro test SMS — your GHL messaging is working! 🚛 — ${new Date().toLocaleTimeString()}`);
    if (ok) toast('<i class="ti ti-check" style="color:#4ade80"></i> Test SMS sent to your number!');
  }
  if (p.emailjsPublicKey && p.emailjsServiceId && p.emailjsTemplateId) {
    await sendEmailJS(p.email, p.name, 'HaulPro Test Email', 'This is a test email from your HaulPro app. Email is working! 🎉');
  }
}

// Helpers used by messaging
function now()   { return new Date().toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' }); }
function today() { return new Date().toISOString().slice(0, 10); }
