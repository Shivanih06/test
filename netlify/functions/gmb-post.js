/* =============================================
   Netlify Function — GMB Post Creation v4
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

    const locationId = locationName.replace(/.*\//, '');
    const authHeader = { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

    const postBody = {
      languageCode: 'en-US',
      summary:      caption,
      topicType:    'STANDARD',
    };
    if (photoDataUrl && photoDataUrl.startsWith('data:image')) {
      postBody.media = [{ mediaFormat: 'PHOTO', sourceUrl: photoDataUrl }];
    }

    // Step 1: Get account ID from Account Management API
    console.log('Fetching accounts...');
    const accountsResp = await fetch(
      'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
      { headers: authHeader }
    );
    const accountsText = await accountsResp.text();
    console.log('Accounts response:', accountsResp.status, accountsText.slice(0, 400));

    let accountId = null;
    if (accountsResp.ok) {
      try {
        const accountsData = JSON.parse(accountsText);
        // accounts[0].name = "accounts/123456789"
        accountId = accountsData.accounts?.[0]?.name?.replace('accounts/', '');
        console.log('Found account ID:', accountId);
      } catch(e) { console.log('Could not parse accounts'); }
    }

    if (!accountId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Could not get GMB account — make sure "My Business Account Management API" is enabled in Google Cloud Console',
          accountsStatus: accountsResp.status,
        }),
      };
    }

    // Step 2: Post using full path accounts/{accountId}/locations/{locationId}
    const fullPath = `accounts/${accountId}/locations/${locationId}`;
    console.log('Posting to:', fullPath);

    const postResp = await fetch(
      `https://mybusiness.googleapis.com/v4/${fullPath}/localPosts`,
      { method: 'POST', headers: authHeader, body: JSON.stringify(postBody) }
    );
    const postText = await postResp.text();
    console.log('Post response:', postResp.status, postText.slice(0, 400));

    if (postResp.ok) {
      const data = JSON.parse(postText);
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, postName: data.name }) };
    }

    // Try v1 Business Information API as fallback
    console.log('Trying v1 Business Information API...');
    const v1Resp = await fetch(
      `https://mybusinessbusinessinformation.googleapis.com/v1/accounts/${accountId}/locations/${locationId}`,
      { headers: authHeader }
    );
    const v1Text = await v1Resp.text();
    console.log('V1 location lookup:', v1Resp.status, v1Text.slice(0, 200));

    return {
      statusCode: postResp.status,
      headers,
      body: JSON.stringify({
        error: 'Post failed',
        status: postResp.status,
        path: fullPath,
        accountId,
        locationId,
        response: postText.slice(0, 300),
      }),
    };

  } catch(e) {
    console.error('GMB post error:', e);
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
