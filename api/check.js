import crypto from 'crypto';
import { rateLimit, getIP, secHeaders } from './_guard.js';

const TOKEN_LEN = 32; // 128 bits

function sign(saleId) {
  return crypto
    .createHmac('sha256', process.env.TOKEN_SECRET || 'wi-secret-2026')
    .update(saleId)
    .digest('hex')
    .slice(0, TOKEN_LEN);
}

export default function handler(req, res) {
  secHeaders(res);
  res.setHeader('Access-Control-Allow-Origin', 'https://weddinginvite.space');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).end();

  if (rateLimit(getIP(req), { max: 30, windowMs: 60000 })) {
    return res.status(429).json({ valid: false, error: 'too many requests' });
  }

  const { sale, token } = req.query;
  if (!sale || !token) return res.status(400).json({ valid: false });
  if (typeof sale !== 'string' || sale.length > 80) return res.status(400).json({ valid: false });
  if (typeof token !== 'string' || token.length > 64) return res.status(400).json({ valid: false });

  const expected = sign(sale);
  // Support both old 24-char and new 32-char tokens during transition
  const len = Math.min(token.length, TOKEN_LEN);
  const valid = crypto.timingSafeEqual(
    Buffer.from(token.slice(0, len).padEnd(len, '0')),
    Buffer.from(expected.slice(0, len).padEnd(len, '0'))
  );

  return res.status(200).json({ valid });
}
