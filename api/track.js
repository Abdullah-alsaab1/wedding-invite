import { incr } from './_kv.js';
import { secHeaders, rateLimit, getIP } from './_guard.js';

export default async function handler(req, res) {
  secHeaders(res);
  res.setHeader('Access-Control-Allow-Origin', 'https://weddinginvite.space');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  if (rateLimit(getIP(req), { max: 20, windowMs: 60000 })) {
    return res.status(429).end();
  }

  const { event } = req.body || {};
  const allowed = { visit:'wi:visits', pdf:'wi:pdfs', video:'wi:videos' };
  if (!allowed[event]) return res.status(400).end();

  await incr(allowed[event]).catch(() => {});
  return res.status(200).json({ ok: true });
}
