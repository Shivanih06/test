// Cloudflare Pages Function — handles https://thrivesystems.app/p/<code>
//
// This is what makes the short link actually work once someone taps it: looks up
// the code in Supabase's short_links table and redirects to the real (long) Stripe
// URL. The row itself can only ever be created by the create-short-link edge
// function (which validates it's a genuine Stripe URL first) — this function only
// ever reads.
//
// SETUP (one-time, in the Cloudflare dashboard):
// Workers & Pages → your Pages project → Settings → Environment variables → add:
//   SUPABASE_URL       = https://<your-project-ref>.supabase.co
//   SUPABASE_ANON_KEY  = your Supabase anon/public key (same one used in supabase.js)
// These are safe to use here — the anon key can only read short_links (a public,
// read-only lookup-by-code table; see migration-short-links.sql), nothing else.

export async function onRequestGet({ params, env }) {
  const code = params.code;
  if (!code || typeof code !== 'string') {
    return new Response('Missing link code', { status: 400 });
  }

  try {
    const resp = await fetch(
      `${env.SUPABASE_URL}/rest/v1/short_links?code=eq.${encodeURIComponent(code)}&select=url`,
      { headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${env.SUPABASE_ANON_KEY}` } }
    );
    const rows = await resp.json();
    const url = rows && rows[0] && rows[0].url;
    if (!url) {
      return new Response('This link has expired or doesn\'t exist. Please ask for a new one.', { status: 404 });
    }
    return Response.redirect(url, 302);
  } catch (e) {
    return new Response('Something went wrong loading this link — please try again.', { status: 500 });
  }
}
