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

    const resp = await fetch(
      `https://mybusiness.googleapis.com/v4/${locationName}/localPosts`,
      {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify(postBody),
      }
    );

    const data = await resp.json();
    console.log('GMB post response:', resp.status, JSON.stringify(data));

    if (resp.ok && data.name) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, postName: data.name }) };
    } else {
      return { statusCode: resp.status, headers, body: JSON.stringify({ error: data.error?.message || 'Post failed', details: data }) };
    }

  } catch(e) {
    console.error('GMB post error:', e);
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
