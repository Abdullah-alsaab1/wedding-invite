import https from 'https';
import { rateLimit, getIP, sanitize, secHeaders } from './_guard.js';

export default function handler(req, res) {
  secHeaders(res);
  res.setHeader('Access-Control-Allow-Origin', 'https://weddinginvite.space');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Rate limit: max 10 generations per minute per IP
  if (rateLimit(getIP(req), { max: 10, windowMs: 60000 })) {
    return res.status(429).json({ error: 'طلبات كثيرة، انتظر دقيقة.' });
  }

  const key = (process.env.ANTHROPIC_API_KEY || '').trim();
  if (!key) return res.status(500).json({ error: 'API key missing' });

  const { groom, bride, style, venue } = req.body || {};
  if (!groom || !bride) return res.status(400).json({ error: 'groom and bride required' });

  // Sanitize all inputs
  const sg = sanitize(groom, 60);
  const sb = sanitize(bride, 60);
  const ss = sanitize(style, 60);
  const sv = sanitize(venue, 100);

  if (!sg || !sb) return res.status(400).json({ error: 'invalid names' });

  const prompt = `أنت كاتب دعوات أعراس محترف. اكتب نص دعوة زفاف قصير وجميل باللغة العربية الفصحى.
العريس: ${sg} | العروس: ${sb} | النمط: ${ss || 'فخم رسمي'} | المكان: ${sv || ''}
الشروط: 3-5 سطور فقط، بدون تاريخ أو وقت، أعطِ النص فقط بدون مقدمة، ولا تستخدم أي تنسيق markdown.`;

  const body = JSON.stringify({
    model: 'claude-haiku-4-5-20251001',
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
        const text = parsed.content?.[0]?.text?.trim();
        if (text) {
          res.status(200).json({ text });
        } else {
          res.status(500).json({ error: parsed.error?.message || 'No text in response' });
        }
      } catch (e) {
        res.status(500).json({ error: 'Parse error' });
      }
    });
  });

  apiReq.on('error', (e) => res.status(500).json({ error: e.message }));
  apiReq.write(body);
  apiReq.end();
}
