/* =============================================
   Netlify Function — GMB Post Creation v3
   Tries multiple location path formats
   ============================================= */

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

    const postBody = {
      languageCode: 'en-US',
      summary:      caption,
      topicType:    'STANDARD',
    };

    if (photoDataUrl && photoDataUrl.startsWith('data:image')) {
      postBody.media = [{ mediaFormat: 'PHOTO', sourceUrl: photoDataUrl }];
    }

    const authHeader = { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

    // Step 1: Get account ID
    console.log('Fetching accounts...');
    const accountsResp = await fetch(
      'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
      { headers: authHeader }
    );
    const accountsText = await accountsResp.text();
    console.log('Accounts:', accountsResp.status, accountsText.slice(0, 300));

    let accountName = null;
    try {
      const accountsData = JSON.parse(accountsText);
      accountName = accountsData.accounts?.[0]?.name;
    } catch(e) {
      console.log('Could not parse accounts response');
    }

    // Step 2: Try multiple path formats until one works
    const locationId = locationName.replace(/.*\//, ''); // extract just the number
    const pathsToTry = [
      accountName ? `${accountName}/locations/${locationId}` : null,
      `locations/${locationId}`,
      locationName.includes('/') ? locationName : null,
    ].filter(Boolean);

    console.log('Will try these paths:', pathsToTry);

    for (const path of pathsToTry) {
      console.log('Trying path:', path);
      const resp = await fetch(
        `https://mybusiness.googleapis.com/v4/${path}/localPosts`,
        { method: 'POST', headers: authHeader, body: JSON.stringify(postBody) }
      );
      const text = await resp.text();
      console.log('Response for', path, ':', resp.status, text.slice(0, 200));

      if (resp.ok) {
        try {
          const data = JSON.parse(text);
          if (data.name) {
            return { statusCode: 200, headers, body: JSON.stringify({ success: true, postName: data.name, path }) };
          }
        } catch(e) {}
      }

      // 404 = wrong path, try next
      // 401 = token expired, stop
      if (resp.status === 401) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: 'Access token expired — re-authorize in Settings' }) };
      }
    }

    // All paths failed — return detailed debug info
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: 'Could not find GMB location — check Location ID in Settings',
        triedPaths: pathsToTry,
        accountFound: accountName || 'none',
        locationId,
      }),
    };

  } catch(e) {
    console.error('GMB post error:', e);
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
