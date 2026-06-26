// Logs unanswered questions so admin can add them to faq.json
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).end();

  const { question } = req.body || {};
  if (!question) return res.status(400).end();

  // Log to Vercel logs (visible in dashboard)
  console.log(`[FAQ-MISSING] ${new Date().toISOString()} | ${question}`);

  // Send email notification if SMTP configured (optional)
  // For now just log — admin checks Vercel logs and adds to faq.json
  res.status(200).json({ ok: true });
}
