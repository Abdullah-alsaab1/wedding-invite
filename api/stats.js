import { secHeaders } from './_guard.js';
import { mget } from './_kv.js';

const ADMIN_USER = process.env.ADMIN_USER || 'king';
const ADMIN_PASS = process.env.ADMIN_PASS || 'king2026';

function checkAuth(req) {
  const auth = req.headers['authorization'] || '';
  const [scheme, encoded] = auth.split(' ');
  if (scheme !== 'Basic' || !encoded) return false;
  const [user, pass] = Buffer.from(encoded, 'base64').toString().split(':');
  return user === ADMIN_USER && pass === ADMIN_PASS;
}

export default async function handler(req, res) {
  secHeaders(res);
  if (!checkAuth(req)) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin"');
    return res.status(401).json({ error: 'unauthorized' });
  }

  const [visits, pdfs, unlocked, videos] = await mget('wi:visits', 'wi:pdfs', 'wi:unlocked', 'wi:videos') || [];
  const v = parseInt(visits) || 0;
  const u = parseInt(unlocked) || 0;

  return res.status(200).json({
    visits:   v,
    pdfs:     parseInt(pdfs) || 0,
    videos:   parseInt(videos) || 0,
    unlocked: u,
    rate:     v > 0 ? ((u / v) * 100).toFixed(1) + '%' : '—',
  });
}
