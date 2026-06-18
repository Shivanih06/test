/* =============================================
   Netlify Function — GMB Post v6
   Caches account ID to avoid repeated API calls
   ============================================= */

const sleep = ms => new Promise(r => setTimeout(r, ms));

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
    const { accessToken, locationName, caption, photoDataUrl, cachedAccountId } = JSON.parse(event.body || '{}');

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

    let accountId = cachedAccountId || null;

    // Only fetch account if not cached
    if (!accountId) {
      console.log('Fetching GMB account ID (first time only)...');
      const accountsResp = await fetch(
        'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
        { headers: authHeader }
      );
      const accountsText = await accountsResp.text();
      console.log('Accounts:', accountsResp.status, accountsText.slice(0, 200));

      if (accountsResp.status === 429) {
        return {
          statusCode: 429,
          headers,
          body: JSON.stringify({
            error: 'Rate limited by Google. Wait 1 minute and try again.',
            retryAfter: 60,
          }),
        };
      }

      if (!accountsResp.ok) {
        return {
          statusCode: accountsResp.status,
          headers,
          body: JSON.stringify({ error: `Accounts API failed: ${accountsResp.status}`, details: accountsText.slice(0,200) }),
        };
      }

      const accountsData = JSON.parse(accountsText);
      accountId = accountsData.accounts?.[0]?.name?.replace('accounts/', '');
      console.log('Got account ID:', accountId);

      if (!accountId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'No GMB accounts found' }) };
      }
    } else {
      console.log('Using cached account ID:', accountId);
    }

    // Post to GMB
    const fullPath = `accounts/${accountId}/locations/${locationId}`;
    console.log('Posting to:', fullPath);

    const postResp = await fetch(
      `https://mybusiness.googleapis.com/v4/${fullPath}/localPosts`,
      { method: 'POST', headers: authHeader, body: JSON.stringify(postBody) }
    );
    const postText = await postResp.text();
    console.log('Post response:', postResp.status, postText.slice(0, 300));

    if (postResp.ok) {
      const data = JSON.parse(postText);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success:   true,
          postName:  data.name,
          accountId, // Return so client can cache it
        }),
      };
    }

    if (postResp.status === 401) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Token expired — re-authorize in Settings' }) };
    }

    return {
      statusCode: postResp.status,
      headers,
      body: JSON.stringify({
        error:     'Post failed',
        status:    postResp.status,
        accountId,
        locationId,
        response:  postText.slice(0, 300),
      }),
    };

  } catch(e) {
    console.error('GMB post error:', e);
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
