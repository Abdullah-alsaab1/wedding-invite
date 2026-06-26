import crypto from 'crypto';

const SECRET = process.env.TOKEN_SECRET || 'wi-secret-2026';

function sign(saleId) {
  return crypto.createHmac('sha256', SECRET).update(saleId).digest('hex').slice(0, 24);
}

export default function handler(req, res) {
  // PayPal redirects here after payment
  // Generate a unique sale ID for this PayPal payment
  const ts = Date.now();
  const saleId = `pp-${ts}`;
  const token = sign(saleId);

  // Redirect to site with same format as Gumroad flow — site auto-unlocks
  res.redirect(302, `https://weddinginvite.space/?sale=${saleId}&token=${token}`);
}
