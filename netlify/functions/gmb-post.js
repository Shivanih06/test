/* =============================================
   Netlify Function — GMB Post Creation v5
   With retry logic for rate limits
   ============================================= */

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchWithRetry(url, options, retries=3) {
  for (let i=0; i<retries; i++) {
    const resp = await fetch(url, options);
    if (resp.status !== 429) return resp;
    console.log(`Rate limited (429) — waiting ${(i+1)*2}s before retry ${i+1}/${retries}`);
    await sleep((i+1) * 2000);
  }
  return fetch(url, options);
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { accessToken, locationName, caption, photoDataUrl } = JSON.parse(event.body || '{}');
    if (!accessToken) return { statusCode: 401, headers, body: JSON.stringify({ error: 'No access token' }) };
    if (!locationName) return { statusCode: 400, headers, body: JSON.stringify({ error: 'No location name' }) };

    const locationId = locationName.replace(/.*\//, '');
    const authHeader = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type':  'application/json',
    };

    const postBody = {
      languageCode: 'en-US',
      summary:      caption,
      topicType:    'STANDARD',
    };
    if (photoDataUrl && photoDataUrl.startsWith('data:image')) {
      postBody.media = [{ mediaFormat: 'PHOTO', sourceUrl: photoDataUrl }];
    }

    // Step 1: Get account ID with retry
    console.log('Fetching GMB accounts...');
    const accountsResp = await fetchWithRetry(
      'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
      { headers: authHeader }
    );
    const accountsText = await accountsResp.text();
    console.log('Accounts:', accountsResp.status, accountsText.slice(0, 400));

    if (!accountsResp.ok) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: `Accounts API returned ${accountsResp.status}`,
          details: accountsText.slice(0, 300),
        }),
      };
    }

    const accountsData = JSON.parse(accountsText);
    const accounts = accountsData.accounts || [];
    console.log(`Found ${accounts.length} account(s)`);

    if (!accounts.length) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'No GMB accounts found for this Google account' }) };
    }

    // Try posting to each account
    for (const account of accounts) {
      const accountId = account.name.replace('accounts/', '');
      const fullPath  = `accounts/${accountId}/locations/${locationId}`;
      console.log(`Trying post to: ${fullPath}`);

      const postResp = await fetchWithRetry(
        `https://mybusiness.googleapis.com/v4/${fullPath}/localPosts`,
        { method: 'POST', headers: authHeader, body: JSON.stringify(postBody) }
      );
      const postText = await postResp.text();
      console.log(`Post response (${fullPath}):`, postResp.status, postText.slice(0, 300));

      if (postResp.ok) {
        const data = JSON.parse(postText);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, postName: data.name, accountId, locationId }),
        };
      }

      if (postResp.status === 401) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: 'Access token expired — re-authorize in the app' }) };
      }
    }

    // All accounts tried — still failing
    // Return full debug info
    const accountIds = accounts.map(a => a.name);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: `Post failed for all ${accounts.length} account(s)`,
        accountsTried: accountIds,
        locationId,
        hint: 'Make sure location ID matches the account. Check Netlify logs for full response.',
      }),
    };

  } catch(e) {
    console.error('GMB post error:', e);
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message, stack: e.stack?.slice(0,300) }) };
  }
};
