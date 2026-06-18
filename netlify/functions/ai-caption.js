/* =============================================
   Netlify Function — AI Caption Generation
   Proxies Anthropic API to avoid CORS
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
    const { job, customerName, company } = JSON.parse(event.body || '{}');
    const city = (job.address || '').split(',').slice(1,2).join('').trim() || 'the area';

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':            'application/json',
        'x-api-key':               process.env.ANTHROPIC_API_KEY,
        'anthropic-version':       '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages: [{
          role:    'user',
          content: `Write a Google My Business post for a junk removal company called "${company}".
Job details:
- Service: ${job.service}
- Location: ${city}
- Items removed: ${job.notes || 'household items and furniture'}
${job.price ? `- Job value: $${job.price}` : ''}

Requirements:
- 2-3 sentences max
- Local SEO focused — mention the city naturally  
- Sound human and enthusiastic
- End with 3-5 relevant hashtags
- No quotation marks around the post
- No call to action like "call us"
- Under 200 characters before hashtags`,
        }],
      }),
    });

    const data = await resp.json();
    const caption = data.content?.[0]?.text?.trim() || null;
    return { statusCode: 200, headers, body: JSON.stringify({ caption }) };

  } catch(e) {
    console.error('AI caption error:', e);
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
