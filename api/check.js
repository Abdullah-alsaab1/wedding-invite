// Client calls this to verify their sale token before PDF export
import crypto from 'crypto';

function sign(saleId) {
  return crypto
    .createHmac('sha256', process.env.TOKEN_SECRET || 'wi-secret-2026')
    .update(saleId)
    .digest('hex')
    .slice(0, 24);
}

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://weddinginvite.space');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { sale, token } = req.query;
  if (!sale || !token) return res.status(400).json({ valid: false });

  const expected = sign(sale);
  const valid = crypto.timingSafeEqual(
    Buffer.from(token.slice(0, 24).padEnd(24)),
    Buffer.from(expected.padEnd(24))
  );

  return res.status(200).json({ valid });
}
