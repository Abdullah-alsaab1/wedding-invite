import crypto from 'crypto';
import { rateLimit, getIP, secHeaders } from './_guard.js';

function sign(saleId) {
  return crypto
    .createHmac('sha256', process.env.TOKEN_SECRET || 'wi-secret-2026')
    .update(saleId)
    .digest('hex')
    .slice(0, 24);
}

export default function handler(req, res) {
  secHeaders(res);
  res.setHeader('Access-Control-Allow-Origin', 'https://weddinginvite.space');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).end();

  // Rate limit: max 30 checks per minute per IP (brute-force protection)
  if (rateLimit(getIP(req), { max: 30, windowMs: 60000 })) {
    return res.status(429).json({ valid: false, error: 'too many requests' });
  }

  const { sale, token } = req.query;
  if (!sale || !token) return res.status(400).json({ valid: false });

  // Basic format check before HMAC (avoids unnecessary compute)
  if (typeof sale !== 'string' || sale.length > 80) return res.status(400).json({ valid: false });
  if (typeof token !== 'string' || token.length > 40) return res.status(400).json({ valid: false });

  const expected = sign(sale);
  const valid = crypto.timingSafeEqual(
    Buffer.from(token.slice(0, 24).padEnd(24)),
    Buffer.from(expected.padEnd(24))
  );

  return res.status(200).json({ valid });
}
