const https = require('https');

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const key = (process.env.ANTHROPIC_API_KEY || '').trim();
  if (!key) { res.status(500).json({ error: 'API key missing' }); return; }

  const { groom, bride, style, venue } = req.body || {};
  if (!groom || !bride) { res.status(400).json({ error: 'groom and bride required' }); return; }

  const prompt = `أنت كاتب دعوات أعراس محترف. اكتب نص دعوة زفاف قصير وجميل باللغة العربية الفصحى.
العريس: ${groom} | العروس: ${bride} | النمط: ${style || 'فخم رسمي'} | المكان: ${venue || ''}
الشروط: 3-5 سطور فقط، بدون تاريخ أو وقت، أعطِ النص فقط بدون مقدمة، ولا تستخدم أي تنسيق markdown مثل ** أو # أو _ أو أي رموز تنسيق.`;

  const body = JSON.stringify({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }]
  });

  const options = {
    hostname: 'api.anthropic.com',
    path: '/v1/messages',
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(body)
    }
  };

  const apiReq = https.request(options, (apiRes) => {
    let data = '';
    apiRes.on('data', chunk => data += chunk);
    apiRes.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        console.log('Anthropic status:', apiRes.statusCode);
        console.log('Anthropic response:', JSON.stringify(parsed).slice(0, 300));
        const text = parsed.content?.[0]?.text?.trim();
        if (text) {
          res.status(200).json({ text });
        } else {
          res.status(500).json({ 
            error: parsed.error?.message || 'No text in response',
            type: parsed.error?.type,
            status: apiRes.statusCode
          });
        }
      } catch (e) {
        res.status(500).json({ error: 'Parse error', raw: data.slice(0, 200) });
      }
    });
  });

  apiReq.on('error', (e) => {
    console.error('Request error:', e.message);
    res.status(500).json({ error: e.message });
  });

  apiReq.write(body);
  apiReq.end();
};
