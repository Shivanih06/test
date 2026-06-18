/* =============================================
   Netlify Function — GMB Post Creation
   Proxies Google My Business API to avoid CORS
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

    // Format location name correctly
    // Google expects: accounts/{accountId}/locations/{locationId}
    // If just a number is passed, we need to find the account first
    let fullLocationName = locationName;
    if (!locationName.includes('/')) {
      // Just a location ID — need to find account first
      const accountsResp = await fetch(
        'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );
      const accountsText = await accountsResp.text();
      console.log('Accounts response:', accountsResp.status, accountsText.slice(0,200));
      const accountsData = JSON.parse(accountsText);
      if (accountsData.accounts?.length) {
        const accountName = accountsData.accounts[0].name; // e.g. accounts/123456
        fullLocationName = `${accountName}/locations/${locationName}`;
      } else {
        fullLocationName = `locations/${locationName}`;
      }
    }
    console.log('Using location:', fullLocationName);

    const resp = await fetch(
      `https://mybusiness.googleapis.com/v4/${fullLocationName}/localPosts`,
      {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify(postBody),
      }
    );

    const respText = await resp.text();
    console.log('GMB post response:', resp.status, respText.slice(0,300));

    let data;
    try { data = JSON.parse(respText); } catch { data = { raw: respText.slice(0,200) }; }

    if (resp.ok && data.name) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, postName: data.name }) };
    } else {
      return { statusCode: resp.status, headers, body: JSON.stringify({ error: data.error?.message || 'Post failed', status: resp.status, details: data }) };
    }

  } catch(e) {
    console.error('GMB post error:', e);
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
