import crypto from 'crypto';
import { secHeaders } from './_guard.js';

const ADMIN_USER = process.env.ADMIN_USER || 'king';
const ADMIN_PASS = process.env.ADMIN_PASS || 'king2026';

function checkAuth(req) {
  const auth = req.headers['authorization'] || '';
  const [scheme, encoded] = auth.split(' ');
  if (scheme !== 'Basic' || !encoded) return false;
  const [user, pass] = Buffer.from(encoded, 'base64').toString().split(':');
  return user === ADMIN_USER && pass === ADMIN_PASS;
}

export default function handler(req, res) {
  secHeaders(res);
  if (!checkAuth(req)) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin"');
    return res.status(401).json({ error: 'unauthorized' });
  }

  // Basic stats from env counters (Vercel doesn't expose logs via API easily)
  // These will show "—" until a DB is wired up — at least endpoint exists now
  return res.status(200).json({
    visits:   process.env.STAT_VISITS   || null,
    pdfs:     process.env.STAT_PDFS     || null,
    unlocked: process.env.STAT_UNLOCKED || null,
    rate:     process.env.STAT_RATE     || null,
    _note:    'Connect Vercel KV for live counters'
  });
}
