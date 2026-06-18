/* =============================================
   Netlify Function — GMB OAuth Token Exchange
   
   Handles server-side OAuth token exchange so
   Client Secret never touches the browser.
   
   Endpoint: /.netlify/functions/gmb-token
   ============================================= */

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { code, action } = JSON.parse(event.body || '{}');

    // Exchange auth code for tokens
    if (action === 'exchange' && code) {
      const params = new URLSearchParams({
        code,
        client_id:     process.env.GMB_CLIENT_ID,
        client_secret: process.env.GMB_CLIENT_SECRET,
        redirect_uri:  process.env.GMB_REDIRECT_URI || 'https://junkgeniestest.netlify.app',
        grant_type:    'authorization_code',
      });

      const resp = await fetch('https://oauth2.googleapis.com/token', {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    params,
      });
      const data = await resp.json();

      if (data.access_token) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            access_token:  data.access_token,
            refresh_token: data.refresh_token,
            expires_in:    data.expires_in,
          }),
        };
      } else {
        return { statusCode: 400, headers, body: JSON.stringify({ error: data.error_description || 'Token exchange failed' }) };
      }
    }

    // Refresh access token using refresh token
    if (action === 'refresh') {
      const { refresh_token } = JSON.parse(event.body);
      const params = new URLSearchParams({
        refresh_token,
        client_id:     process.env.GMB_CLIENT_ID,
        client_secret: process.env.GMB_CLIENT_SECRET,
        grant_type:    'refresh_token',
      });

      const resp = await fetch('https://oauth2.googleapis.com/token', {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    params,
      });
      const data = await resp.json();

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ access_token: data.access_token, expires_in: data.expires_in }),
      };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid action' }) };

  } catch(e) {
    console.error('GMB token error:', e);
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
