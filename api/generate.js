export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { groom, bride, style, venue } = req.body;

  if (!groom || !bride) {
    return res.status(400).json({ error: 'groom and bride are required' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `أنت كاتب دعوات أعراس محترف. اكتب نص دعوة زفاف قصير وجميل باللغة العربية الفصحى.
البيانات:
- اسم العريس: ${groom}
- اسم العروس: ${bride}
- نمط الكتابة: ${style || 'فخم رسمي'}
- المكان: ${venue || ''}
الشروط:
- النص بين 3 و5 سطور فقط
- لا تذكر التاريخ أو الوقت
- أعطِ فقط النص الجاهز بدون مقدمة أو شرح`
        }]
      })
    });

    const data = await response.json();
    const text = data.content?.[0]?.text?.trim();

    if (!text) return res.status(500).json({ error: 'No response from AI' });
    res.status(200).json({ text });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}
