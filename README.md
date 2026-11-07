# CloudCode — CloudCompiler AI ⚡

منصة سحابية متكاملة لتجميع وتشغيل الأكواد البرمجية مع مساعد ذكاء اصطناعي (Gemini) لشرح وتصحيح الأخطاء، مبنية على بنية Vercel Serverless Functions + **Node.js (Express)** + CodeMirror 6 + Judge0 API.

---

## 🌟 مميزات المشروع

- **تصميم عصري متطابق بالكامل مع التصميم المعتمد (CloudCode UI Mockups)**:
  - ثيم داكن احترافي (Dark Theme) مطابق لصور التصميم.
  - شريط تنقل علوي (`Compiler` / `My Snippets` / `Help` / `Yasin · Logout`).
  - شريط تحكم كامل (تعديل عنوان الكود `Title`، اختيار اللغة `Language`، مؤشر الحالة `Completed / Running / Error`، أزرار `Save` و `▶ Run` و `AI Explain`).
- **محرر أكواد متقدم (CodeMirror 6 + Standalone Resilient Fallback)**:
  - ترقيم أسطر، تمييز صيغة، دعم اختصارات لوحة المفاتيح (`Ctrl + Enter` للتشغيل، `Ctrl + S` للحفظ).
  - مدمج معه محرر احترافي احتياطي يعمل بلا إنترنت وبدون أي اعتماديات خارجية في حال تعذر الاتصال بـ CDN.
- **لوحة تفاعلية للإدخال والإخراج (Input / Output Tabs)**:
  - بطاقة الإدخال القياسي `Input (stdin)`.
  - تبويبات: `Output`، `Errors`، `Compile`، و `✨ AI Explain`.
  - تفاصيل الأداء: وقت التنفيذ (Time)، استهلاك الذاكرة (Memory)، وكود الخروج (Exit Code).
  - سجل التشغيل الأخير `Recent runs` مع إمكانية مراجعة أي نتيجة سابقة بنقرة واحدة.
- **إدارة كاملة للمقتطفات البرمجية (My Snippets)**:
  - حفظ المقتطفات وتعديلها وحذفها.
  - بحث فوري بالعنوان (`Search by title`).
  - زر إنشاء مقتطف جديد `+ New snippet`.
- **تنفيذ الأكواد الآمن عبر Judge0 API**:
  - دعم لغات C++, Python, Java, JavaScript.
  - إمكانية العمل مع RapidAPI Judge0 أو النسخة الذاتية الاستضافة (Judge0 CE).
  - محاكي تشغيل محلي آمن للاختبار والتطوير بدون مفاتيح خارجية.
- **مساعد تصحيح الأخطاء الذكي (Gemini AI Debugger)**:
  - تحليل فوري لأسباب الخطأ وسطر العطل مع اقتراح كود بديل مصحح.
  - محلل تشخيصي مدمج (Static Analyzer) يعمل حتى في حال عدم تفعيل مفتاح Gemini.

---

## 🏗️ هيكلية المشروع (Architecture)

```text
User Browser
     │
     ▼
Vercel Project
 ├── Frontend (public/)            HTML / CSS / JS + CodeMirror 6
 │        │
 │        │  POST /api/run , POST /api/debug
 │        ▼
 └── Express Backend (app.js)
          ├── Judge0 API    (تنفيذ الكود)
          └── Gemini API    (شرح وتصحيح الأخطاء)
```

---

## 🚀 التشغيل المحلي (Local Development)

### 1. المتطلبات:
- **Node.js 22 LTS** أو أحدث
- npm

### 2. تثبيت المكتبات:
```bash
npm install
```

### 3. إعداد ملف البيئة (اختياري للربط المباشر):
انسخ ملف `.env.example` إلى `.env`:
```bash
cp .env.example .env
```
وقم بإضافة مفاتيحك:
```env
JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_API_KEY=your_rapidapi_key
JUDGE0_API_HOST=judge0-ce.p.rapidapi.com
GEMINI_API_KEY=your_gemini_api_key
```

### 4. تشغيل خادم التطوير:
```bash
npm start
```
أو مع Vercel CLI:
```bash
vercel dev
```
افتح المتصفح على: `http://localhost:5000`

### 5. تشغيل الاختبارات الآلية:
```bash
npm test
```

---

## ☁️ خطوات النشر على Vercel (Deployment)

1. **ارفع المشروع على مستودع GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial CloudCompiler Express deployment"
   git branch -M main
   git remote add origin YOUR_GITHUB_REPOSITORY_URL
   git push -u origin main
   ```

2. **الربط مع Vercel**:
   - ادخل إلى [vercel.com](https://vercel.com) واضغط **Add New Project**.
   - اختر مستودع المشروع من GitHub.
   - اترك إعدادات Build بدون تغيير (Vercel سيكتشف ملفات `public/` و `app.js` تلقائيًا عبر `vercel.json`).

3. **إضافة متغيرات البيئة في Vercel**:
   - توجه إلى: **Settings → Environment Variables**
   - أضف المتغيرات:
     - `JUDGE0_API_URL`: عنوان مزود Judge0
     - `JUDGE0_API_KEY`: مفتاح RapidAPI أو Judge0
     - `GEMINI_API_KEY`: مفتاح Google AI Studio Gemini
   - اضغط **Deploy**!


## Deploying to Vercel

This repository includes a Vercel configuration for the existing Express app and its
`public` frontend. Import the repository into Vercel with the project root as the
Root Directory; do not select a subfolder.

Add these Environment Variables in Vercel (Production and Preview as needed):

- `DATABASE_URL` — MongoDB Atlas connection string
- `JWT_SECRET` — a long, random secret (required in production)
- `GEMINI_API_KEY` — optional; without it, the built-in static diagnostics are used
- `JUDGE0_API_URL` — optional; defaults to `https://ce.judge0.com`
- `JUDGE0_API_KEY` — optional; only needed if your Judge0 provider requires it
- `COOKIE_SECURE` — set to `true` on Vercel
- `COOKIE_SAMESITE` — `lax` for the same-origin deployment

The Vercel Hobby plan is intended for personal/non-commercial use and has usage
limits. MongoDB, Gemini, and Judge0 have their own separate limits and availability.
Keep secrets out of GitHub and never put API keys in `public/script.js`.

After deployment, verify `/`, `/languages`, `/api/health`, registration/login, code
execution, and AI debugging. The deployment configuration cannot guarantee that
external MongoDB, Judge0, or Gemini services are reachable or within their free
quotas.
