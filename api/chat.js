export const config = { maxDuration: 30 };

const SYSTEM = `أنت مساعد ذكي لموقع weddinginvite.space — موقع تصميم دعوات الأعراس الفاخرة.
مهمتك: مساعدة الزوار بلطف وإيجاز بالعربية.

معلومات الموقع:
- يوفر 23 قالباً لدعوات الأعراس
- يمكن تخصيص الأسماء والتاريخ والوقت والمكان ونص الدعوة
- توليد نص الدعوة بالذكاء الاصطناعي
- تحميل PNG مجاني (مع علامة مائية)
- تحميل PDF عالي الجودة بدون علامة مائية: أول 3 مرات مجانية، ثم $2 للدعوة الواحدة
- الدفع عبر Gumroad (يدعم الدفع من الأردن والدول العربية)
- بعد الدفع يصلك كود فتح تلقائياً
- للتواصل: kingdeed130@gmail.com

قواعد:
- أجب بإيجاز (جملة أو جملتين)
- لا تخترع معلومات غير موجودة أعلاه
- إذا لم تعرف الإجابة قل "تواصل معنا على kingdeed130@gmail.com"
- لا تذكر أنك Claude أو Anthropic`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { message, history = [] } = req.body || {};
  if (!message) return res.status(400).json({ error: 'message required' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'not configured' });

  const messages = [
    ...history.slice(-6).map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: message }
  ];

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        system: SYSTEM,
        messages
      })
    });
    const d = await r.json();
    const reply = d.content?.[0]?.text || 'عذراً، حدث خطأ. تواصل معنا على kingdeed130@gmail.com';
    res.json({ reply });
  } catch (e) {
    res.status(500).json({ reply: 'عذراً، حدث خطأ مؤقت. تواصل معنا على kingdeed130@gmail.com' });
  }
}
