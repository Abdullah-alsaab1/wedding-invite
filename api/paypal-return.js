import crypto from 'crypto';

const SECRET = process.env.TOKEN_SECRET || 'wi-secret-2026';

function sign(saleId) {
  return crypto.createHmac('sha256', SECRET).update(saleId).digest('hex').slice(0, 32);
}

export default function handler(req, res) {
  // Unique sale ID: timestamp + random suffix = no collision risk
  const ts  = Date.now();
  const rnd = crypto.randomBytes(4).toString('hex');
  const saleId = `pp-${ts}-${rnd}`;
  const token  = sign(saleId);

  res.redirect(302, `https://weddinginvite.space/?sale=${saleId}&token=${token}`);
}
