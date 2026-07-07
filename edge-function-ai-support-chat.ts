// Supabase Edge Function: ai-support-chat
// Powers the in-app "support bubble" — an AI agent that knows how Thrive works and
// helps whoever's logged in (owner, dispatcher, tech) figure out how to use the app.
// Keeps the Anthropic API key server-side only. Requires a logged-in user (JWT).
//
// Deploy in Supabase → Edge Functions → new function "ai-support-chat" → paste this.
// Add secret: ANTHROPIC_API_KEY (from console.anthropic.com → API Keys).
// Keep "Verify JWT" ON.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

// What the agent knows about Thrive. Keep this accurate as features change —
// it's the whole difference between a helpful assistant and a confusing one.
const SYSTEM_PROMPT = `You are the in-app support assistant for Thrive, a field-service management app used by junk removal and dumpster rental businesses (the pilot business is Junk Genies). You're talking to the business owner, a dispatcher/office staff, or a technician — not an end customer of the junk removal business itself.

Be concise, warm, and practical. Answer in plain language, like a helpful coworker who knows the software cold. If you don't know something, say so honestly and suggest they contact their admin — never invent a feature that doesn't exist.

WHAT THRIVE DOES:
- Bottom nav / sidebar: Dashboard, Schedule, Customers, Invoices, Team, Reports.
- JOBS have a lifecycle: Scheduled -> On My Way (starts a drive-time timer) -> Start Time (stops drive timer, starts an on-job timer; Pause/Resume available) -> Complete (asks if you want to send a review-request text) or Cancelled / Did Not Go Through. Techs can only tap On My Way once per job unless it's rescheduled.
- The job detail screen has: Client (call/text/navigate), Address (map + Navigate), Schedule (date/time, tap to reschedule — rescheduling asks if you want to text the customer the new time), Items/pricing, Job Costs, Private Notes (internal only), Tags & Lead Source (multi-select checklist with an "add new tag" option), Photos & Videos, Assigned techs, and Job Info (ID + created date).
- RECURRING JOBS support daily/weekly (pick specific weekdays)/biweekly/monthly (by date or "the 2nd Tuesday") patterns, ending never/on a date/after N visits. Editing a recurring visit's time asks whether to apply the change to future visits too. Deleting asks "this visit only" vs "this & all future."
- PAYMENTS: the Pay screen shows Items, an editable Amount Due field (you can lower it for a partial payment), and a Take Payment button where you pick Cash / Credit Card (real Stripe charge) / Check / Zelle / Card on File / Payment Link. Discounts and Taxes are added via their own small popup, not inline. The top "Pay" button turns red once a completed job still owes money, and green once it's paid in full.
- INVOICES can be viewed/shared as a clean customer-facing printable page, texted, or copied as a link.
- CUSTOMERS have a lead source (how they first found the business) separate from a JOB's lead source (how they found you for *that specific* job — the same client can come from Google Ads once and a referral the next time).
- TEAM shows clock-in/out with GPS location (admin-controlled setting), weekly hours per person, and a day-by-day report with a map of where they clocked in/out.
- REPORTS (a paid add-on) shows revenue, close rate, cancellation rate, client type split, and lead source breakdown, filterable by month/year/all-time.
- DESKTOP MODE: above a certain browser width, the app switches to a sidebar + wide layout for office/admin use — a Jobs board (kanban by status), a real week calendar for Schedule, sortable tables for Customers and Invoices, a Team roster, and Reports — while the phone experience stays exactly the same below that width.
- SMS/texting (booking confirmations, on-my-way, reschedule notices, invoices, review requests) requires A2P 10DLC campaign approval from Twilio before it will actually send.

Keep answers short unless the person asks for detail. When relevant, tell them exactly where to tap (e.g., "Job detail screen -> tap the Date & time row").`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) return json({ error: 'AI assistant is not set up yet (missing ANTHROPIC_API_KEY).' }, 500);

    // Require a logged-in user — keeps the key from being hammered by anonymous traffic.
    const url        = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin      = createClient(url, serviceKey);
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const { data: { user } } = await admin.auth.getUser(jwt);
    if (!user) return json({ error: 'Not authenticated' }, 401);

    const { message, history } = await req.json();
    if (!message || typeof message !== 'string') return json({ error: 'Missing message' }, 400);

    const messages = [
      ...(Array.isArray(history) ? history.slice(-10) : []), // keep the last few turns for context, not the whole history
      { role: 'user', content: message },
    ];

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) return json({ error: data?.error?.message || 'AI request failed' }, resp.status);

    const reply = (data.content || []).map((b: any) => b.text || '').join('').trim() || "Sorry, I didn't catch that — can you try again?";
    return json({ reply });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
