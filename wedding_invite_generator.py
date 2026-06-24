#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════╗
║       مولّد دعوات الأعراس الفاخرة  —  Wedding Invite AI      ║
║       Python + Claude AI + wkhtmltopdf                       ║
╚══════════════════════════════════════════════════════════════╝

الاستخدام السريع:
    python3 wedding_invite_generator.py

مع مدخلات مباشرة:
    python3 wedding_invite_generator.py \
        --groom "أحمد العلي"  --bride "منى الخالد" \
        --date 2025-10-18     --template 2 \
        --style "رومانسي شاعري"

لتوليد النص بالذكاء الاصطناعي:
    export ANTHROPIC_API_KEY="sk-ant-..."
    python3 wedding_invite_generator.py --groom ... --bride ...

المتطلبات:
    pip install requests          (اختياري - للـ AI فقط)
    wkhtmltopdf                   (موجود عادةً على Ubuntu/Debian)
"""

import argparse, json, os, subprocess, sys, tempfile, textwrap
from datetime import datetime

try:
    import requests
    REQUESTS_OK = True
except ImportError:
    REQUESTS_OK = False

# ── أرقام وتواريخ عربية ──────────────────────
AR = str.maketrans('0123456789', '٠١٢٣٤٥٦٧٨٩')
MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو',
          'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
DAYS   = ['الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت','الأحد']

def arn(n): return str(n).translate(AR)

def fmt_date(s):
    try:
        d = datetime.strptime(s, "%Y-%m-%d")
        return f"{DAYS[d.weekday()]}، {arn(d.day)} {MONTHS[d.month-1]} {arn(d.year)}م"
    except Exception:
        return s

# ── قوالب ─────────────────────────────────────
TPL = {
    1: dict(name="ذهبي عاجي",
            bg="linear-gradient(155deg,#FFFBF3 0%,#F8EFDA 40%,#F0E0C0 100%)",
            col="#2C1A0E", acc="#C9A84C", acc2="#9A7820", bdr="rgba(201,168,76,.35)"),
    2: dict(name="وردي مخملي",
            bg="linear-gradient(155deg,#FFF5F7 0%,#F5D8E5 40%,#E8B8CF 100%)",
            col="#2E0A18", acc="#C07090", acc2="#903050", bdr="rgba(192,112,144,.35)"),
    3: dict(name="زمردي ليلي",
            bg="linear-gradient(155deg,#0A1A10 0%,#0F2218 40%,#0A1C12 100%)",
            col="#D5EDD8", acc="#70C070", acc2="#80C080", bdr="rgba(90,154,96,.3)"),
    4: dict(name="ملكي نيلي",
            bg="linear-gradient(155deg,#0A0F20 0%,#0C1530 40%,#08102A 100%)",
            col="#D8E0F0", acc="#9AAAD8", acc2="#9AAAD8", bdr="rgba(128,144,192,.3)"),
    5: dict(name="عنابي دافئ",
            bg="linear-gradient(155deg,#1A0508 0%,#280A10 40%,#200608 100%)",
            col="#F0D8D0", acc="#D07060", acc2="#C06050", bdr="rgba(176,80,64,.3)"),
    6: dict(name="أبيض نقي",
            bg="linear-gradient(155deg,#FFFFFF 0%,#F8F8F8 50%,#F2F2F0 100%)",
            col="#111111", acc="#999999", acc2="#666666", bdr="rgba(0,0,0,.12)"),
}

DEFAULT_TEXT = {
    "فخم رسمي":        "يشرفنا حضوركم الكريم للمشاركة في فرحتنا\nوإتمام بهجة هذه الليلة الغالية\nوإن حضوركم لنا أجمل هدية وأعظم سعادة",
    "رومانسي شاعري":   "في ليلةٍ تزيّنت بالنجوم\nوتعطّرت بأجمل الأحلام\nندعوكم لتكونوا شهوداً على أجمل قصة حبّ",
    "ديني تقليدي":     "بسم الله وعلى بركة الله\nيسعدنا دعوتكم لحضور حفل زفافنا\nسائلين المولى أن يُتمّ علينا النعمة",
    "عصري أنيق":       "نحتفل بأجمل لحظات حياتنا\nويسعدنا مشاركتكم هذا اليوم المميّز\nحضوركم يضيف بهجةً لا توصف",
}

# ── Claude AI ─────────────────────────────────
def ai_text(groom, bride, style, venue, api_key=""):
    key = api_key or os.environ.get("ANTHROPIC_API_KEY","")
    if not key or not REQUESTS_OK:
        print("⚠️  بدون API Key — سيُستخدم نص افتراضي")
        return DEFAULT_TEXT.get(style, DEFAULT_TEXT["فخم رسمي"])
    prompt = textwrap.dedent(f"""
        أنت كاتب دعوات أعراس محترف. اكتب نص دعوة زفاف قصير وجميل باللغة العربية الفصحى.
        العريس: {groom} | العروس: {bride} | النمط: {style} | المكان: {venue}
        الشروط: 3-5 سطور فقط، بدون تاريخ أو وقت، أعطِ النص فقط بدون مقدمة.
    """).strip()
    try:
        r = requests.post("https://api.anthropic.com/v1/messages",
            headers={"x-api-key":key,"anthropic-version":"2023-06-01","content-type":"application/json"},
            json={"model":"claude-sonnet-4-6","max_tokens":300,
                  "messages":[{"role":"user","content":prompt}]}, timeout=30)
        r.raise_for_status()
        return r.json()["content"][0]["text"].strip()
    except Exception as e:
        print(f"⚠️  خطأ AI: {e}")
        return DEFAULT_TEXT.get(style, DEFAULT_TEXT["فخم رسمي"])

# ── بناء HTML مستقل (بدون خطوط خارجية) ───────
def build_html(groom, bride, date_ar, time_str, venue, msg, footer, t, title="نتشرّف بدعوتكم الكريمة"):
    acc, acc2, bg, col, bdr = t["acc"], t["acc2"], t["bg"], t["col"], t["bdr"]
    csz = f"""<svg class="corner" viewBox="0 0 65 65" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 4 L4 28 M4 4 L28 4" stroke="{acc}" stroke-width="1.2" stroke-linecap="round" fill="none"/>
      <path d="M12 12 L12 22 M12 12 L22 12" stroke="{acc}" stroke-width="0.8" stroke-linecap="round" fill="none"/>
      <circle cx="4" cy="4" r="2" fill="{acc}" opacity="0.6"/>
    </svg>"""
    msg_html = msg.replace('\n','<br>')
    return f"""<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<style>
*{{margin:0;padding:0;box-sizing:border-box}}
body{{background:#111;display:flex;align-items:center;justify-content:center;min-height:100vh;
     font-family:'Arial Unicode MS',Arial,Tahoma,sans-serif}}
.card{{width:480px;background:{bg};color:{col};border:1.5px solid {bdr};
       padding:52px 42px;text-align:center;position:relative;
       box-shadow:0 20px 60px rgba(0,0,0,.7)}}
.corner{{position:absolute;width:62px;height:62px}}
.tl{{top:9px;right:9px}}.tr{{top:9px;left:9px;transform:scaleX(-1)}}
.bl{{bottom:9px;right:9px;transform:scaleY(-1)}}.br{{bottom:9px;left:9px;transform:scale(-1,-1)}}
.bism{{font-size:1.3rem;opacity:.58;margin-bottom:5px}}
.eyebrow{{font-size:.72rem;letter-spacing:.18em;color:{acc2};opacity:.65;margin-bottom:10px}}
.fl{{font-size:1.4rem;color:{acc};opacity:.42;margin:5px 0;display:block}}
.names{{margin:7px 0;line-height:1.08}}
.n1,.n2{{display:block;font-size:2.7rem;font-style:italic;color:{col}}}
.amp{{display:block;font-size:.88rem;color:{acc2};opacity:.5;margin:4px 0}}
.rule{{height:1px;background:linear-gradient(90deg,transparent,{acc},transparent);margin:15px auto;max-width:260px}}
.msg{{font-size:.88rem;line-height:2.2;max-width:340px;margin:0 auto;opacity:.84}}
.details{{margin:15px auto 0;max-width:340px}}
.det{{display:flex;align-items:center;justify-content:center;gap:9px;font-size:.78rem;padding:4px 0}}
.rule-sm{{height:1px;background:linear-gradient(90deg,transparent,{acc}44,transparent);width:48px;margin:5px auto 8px}}
.footer{{font-size:.7rem;color:{acc2};opacity:.38;letter-spacing:.08em;margin-top:13px;font-style:italic}}
</style>
</head>
<body>
<div class="card">
  <div class="tl">{csz}</div><div class="tr">{csz}</div>
  <div class="bl">{csz}</div><div class="br">{csz}</div>
  <div class="bism">&#xFDFD;</div>
  <div class="eyebrow">{title}</div>
  <span class="fl">&#x2726; &#x2767; &#x2726;</span>
  <div class="names">
    <span class="n1">{groom}</span>
    <span class="amp">— &#x648;&#x64E; —</span>
    <span class="n2">{bride}</span>
  </div>
  <span class="fl">&#x2726; &#x2767; &#x2726;</span>
  <div class="rule"></div>
  <p class="msg">{msg_html}</p>
  <div class="rule"></div>
  <div class="details">
    <div class="det"><span>&#x1F4C5;</span><span>{date_ar}</span></div>
    <div class="rule-sm"></div>
    <div class="det"><span>&#x23F0;</span><span>{time_str}</span></div>
    <div class="rule-sm"></div>
    <div class="det"><span>&#x1F4CD;</span><span>{venue}</span></div>
  </div>
  <div class="footer">{footer}</div>
</div>
</body>
</html>"""

# ── تصدير PDF ─────────────────────────────────
def to_pdf(html, out):
    with tempfile.NamedTemporaryFile(suffix=".html",delete=False,mode="w",encoding="utf-8") as f:
        f.write(html); tmp=f.name
    try:
        r = subprocess.run([
            "wkhtmltopdf",
            "--page-size","A5",
            "--margin-top","8mm","--margin-bottom","8mm",
            "--margin-left","8mm","--margin-right","8mm",
            "--encoding","UTF-8","--quiet",
            tmp, out
        ], capture_output=True, text=True, timeout=60)
        if r.returncode!=0 and "Exit with code 1" in r.stderr:
            print(f"❌ wkhtmltopdf error:\n{r.stderr}"); return False
        return os.path.exists(out) and os.path.getsize(out)>0
    finally:
        os.unlink(tmp)

# ── واجهة تفاعلية ──────────────────────────────
def interactive():
    sep = "═"*54
    print(f"\n{sep}\n  ✦  مولّد دعوات الأعراس الفاخرة  ✦\n{sep}\n")
    groom  = input("👤  اسم العريس: ").strip() or "أحمد العلي"
    bride  = input("👤  اسم العروس: ").strip() or "منى الخالد"
    di     = input("📅  التاريخ (YYYY-MM-DD): ").strip() or "2025-10-18"
    ti     = input("⏰  الوقت (مثال: الساعة ٨:٠٠ مساءً): ").strip() or "الساعة ٨:٠٠ مساءً"
    venue  = input("📍  المكان: ").strip() or "قاعة الأميرة، فندق الشيراتون، عمّان"
    footer = input("✒️   ختم الدعوة: ").strip() or f"عائلة {groom.split()[-1]} & عائلة {bride.split()[-1]}"
    styles = ["فخم رسمي","رومانسي شاعري","ديني تقليدي","عصري أنيق"]
    print("\nأنماط الكتابة:"+"".join(f"\n  {i+1}. {s}" for i,s in enumerate(styles)))
    si = input("اختر [1]: ").strip() or "1"
    style = styles[int(si)-1] if si.isdigit() and 1<=int(si)<=4 else styles[0]
    print("\nالقوالب:"+"".join(f"\n  {k}. {v['name']}" for k,v in TPL.items()))
    ti2 = input("اختر [1]: ").strip() or "1"
    tnum = int(ti2) if ti2.isdigit() and 1<=int(ti2)<=6 else 1
    use_ai = input("\n✨ توليد النص بالذكاء الاصطناعي؟ [y/N]: ").strip().lower() in ("y","yes","نعم")
    return dict(groom=groom,bride=bride,di=di,ti=ti,venue=venue,footer=footer,
                style=style,tnum=tnum,use_ai=use_ai)

# ── main ───────────────────────────────────────
def main():
    p = argparse.ArgumentParser(description="مولّد دعوات الأعراس")
    p.add_argument("--groom",default="")
    p.add_argument("--bride",default="")
    p.add_argument("--date",default="2025-10-18")
    p.add_argument("--time",default="الساعة ٧:٠٠ مساءً")
    p.add_argument("--venue",default="قاعة الأميرة، فندق الشيراتون، عمّان")
    p.add_argument("--footer",default="")
    p.add_argument("--style",default="فخم رسمي",
                   choices=["فخم رسمي","رومانسي شاعري","ديني تقليدي","عصري أنيق"])
    p.add_argument("--template",type=int,default=1,choices=range(1,7))
    p.add_argument("--no-ai",action="store_true")
    p.add_argument("--out",default="")
    p.add_argument("--api-key",default="")
    a = p.parse_args()

    if not a.groom:
        d = interactive()
        groom,bride,di,ti,venue,footer,style,tnum,use_ai = (
            d["groom"],d["bride"],d["di"],d["ti"],d["venue"],
            d["footer"],d["style"],d["tnum"],d["use_ai"])
    else:
        groom,bride,di,ti,venue = a.groom,a.bride,a.date,a.time,a.venue
        footer = a.footer or f"عائلة {groom.split()[-1]} & عائلة {bride.split()[-1]}"
        style,tnum,use_ai = a.style,a.template,not a.no_ai

    t = TPL[tnum]
    print(f"\n🎨  القالب: {t['name']}")

    if use_ai:
        print("✨  جاري توليد نص الدعوة بالذكاء الاصطناعي...")
        msg = ai_text(groom, bride, style, venue, a.api_key if a.groom else "")
    else:
        msg = DEFAULT_TEXT.get(style, DEFAULT_TEXT["فخم رسمي"])

    print(f"\n📝  نص الدعوة:\n{msg}\n")

    date_ar = fmt_date(di)
    html = build_html(groom, bride, date_ar, ti, venue, msg, footer, t)

    safe = lambda s: "".join(c for c in s if c.isalnum() or c in " -").strip()[:14]
    out = a.out or f"دعوة-{safe(groom)}-و-{safe(bride)}.pdf"
    html_out = out.replace(".pdf",".html") if out.endswith(".pdf") else out+".html"

    with open(html_out,"w",encoding="utf-8") as f: f.write(html)
    print(f"💾  HTML: {html_out}")

    print(f"📄  جاري إنشاء PDF...")
    if to_pdf(html, out):
        sz = os.path.getsize(out)
        print(f"✅  PDF جاهز: {out}  ({sz/1024:.1f} KB)")
    else:
        print(f"⚠️  استخدم HTML مباشرةً: {html_out}")

    print(f"\n{'═'*54}\n  ✦  تمّ! بالرفاه والبنين  ✦\n{'═'*54}\n")

if __name__=="__main__":
    main()
