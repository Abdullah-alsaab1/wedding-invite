import crypto from 'crypto';
import { rateLimit, getIP, secHeaders } from './_guard.js';

const PP_CLIENT  = process.env.PAYPAL_CLIENT_ID     || '';
const PP_SECRET  = process.env.PAYPAL_CLIENT_SECRET || '';
const PP_BASE    = 'https://api-m.paypal.com'; // live
const EXPECTED_AMOUNT = '2.00';
const EXPECTED_CURRENCY = 'USD';
const EXPECTED_PAYEE = process.env.PAYPAL_PAYEE_EMAIL || 'abdkingsaab@gmail.com';
const TOKEN_SECRET = process.env.TOKEN_SECRET || 'wi-secret-2026';

// Cache PayPal access token briefly
let _ppToken = null;
let _ppTokenExp = 0;

async function getPayPalToken() {
  if (_ppToken && Date.now() < _ppTokenExp) return _ppToken;

  const res = await fetch(`${PP_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${PP_CLIENT}:${PP_SECRET}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  if (!res.ok) throw new Error('PayPal auth failed: ' + res.status);
  const data = await res.json();
  _ppToken = data.access_token;
  _ppTokenExp = Date.now() + (data.expires_in - 60) * 1000;
  return _ppToken;
}

async function verifyOrder(orderId) {
  const token = await getPayPalToken();
  const res = await fetch(`${PP_BASE}/v2/checkout/orders/${encodeURIComponent(orderId)}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!res.ok) return { valid: false, reason: 'order_not_found' };
  const order = await res.json();

  // Must be COMPLETED
  if (order.status !== 'COMPLETED') {
    return { valid: false, reason: `status_${order.status}` };
  }

  // Check each purchase unit
  const units = order.purchase_units || [];
  const validUnit = units.find(u => {
    const amount = u.amount || {};
    const payee  = u.payee  || {};
    const amountOk   = amount.value === EXPECTED_AMOUNT && amount.currency_code === EXPECTED_CURRENCY;
    const payeeOk    = !EXPECTED_PAYEE || payee.email_address?.toLowerCase() === EXPECTED_PAYEE.toLowerCase();
    return amountOk && payeeOk;
  });

  if (!validUnit) {
    return { valid: false, reason: 'amount_or_payee_mismatch' };
  }

  return { valid: true };
}

function generateToken(orderId) {
  const saleId = `pp-ord-${orderId}`;
  const token = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(saleId)
    .digest('hex')
    .slice(0, 32);
  return { saleId, token };
}

export default async function handler(req, res) {
  secHeaders(res);
  res.setHeader('Access-Control-Allow-Origin', 'https://weddinginvite.space');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  // Rate limit: max 5 verifications per minute per IP
  if (rateLimit(getIP(req), { max: 5, windowMs: 60000 })) {
    return res.status(429).json({ ok: false, error: 'too_many_requests' });
  }

  if (!PP_CLIENT || !PP_SECRET) {
    return res.status(503).json({ ok: false, error: 'payment_verification_not_configured' });
  }

  const { orderId } = req.body || {};
  if (!orderId || typeof orderId !== 'string' || orderId.length > 80) {
    return res.status(400).json({ ok: false, error: 'invalid_order_id' });
  }

  // Sanitize: only allow alphanumeric + dash
  if (!/^[A-Z0-9\-]+$/i.test(orderId)) {
    return res.status(400).json({ ok: false, error: 'invalid_order_id_format' });
  }

  try {
    const result = await verifyOrder(orderId);
    if (!result.valid) {
      return res.status(402).json({ ok: false, error: result.reason });
    }

    const { saleId, token } = generateToken(orderId);
    return res.status(200).json({ ok: true, sale: saleId, token });

  } catch (err) {
    console.error('[paypal-verify]', err.message);
    return res.status(500).json({ ok: false, error: 'verification_failed' });
  }
}
