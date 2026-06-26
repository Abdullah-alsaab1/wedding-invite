import crypto from 'crypto';

const SELLER_ID = process.env.GUMROAD_SELLER_ID || '';
const SECRET    = process.env.TOKEN_SECRET    || 'wi-secret-2026';

function sign(saleId) {
  return crypto
    .createHmac('sha256', SECRET)
    .update(saleId)
    .digest('hex')
    .slice(0, 32); // 32 chars = 128 bits (was 24)
}

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://weddinginvite.space');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const body = req.method === 'POST' ? req.body : req.query;

  // Require SELLER_ID if configured — block if mismatch
  const sellerId = body?.seller_id;
  if (SELLER_ID) {
    if (!sellerId || sellerId !== SELLER_ID) {
      return res.status(403).json({ error: 'unauthorized seller' });
    }
  }

  const saleId = body?.sale_id || body?.id || ('test-' + Date.now());
  const token  = sign(saleId);

  if (req.method === 'GET') {
    return res.redirect(302,
      `https://weddinginvite.space/?sale=${saleId}&token=${token}`
    );
  }

  return res.status(200).json({ success: true });
}
