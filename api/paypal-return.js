// This endpoint is disabled — payment verification is handled by /api/paypal-verify
export default function handler(req, res) {
  return res.status(410).json({ error: 'gone' });
}
