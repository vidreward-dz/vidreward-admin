# VidReward DZ — لوحة تحكم الأدمن

## تجربة سريعة (بدون نشر)
افتحي ملف `index.html` مباشرة بالمتصفح (Chrome) بضغطة نقر مزدوج — تشتغل فوراً بدون أي تثبيت.

⚠️ إذا واجهتي مشكلة "CORS" أو الصفحة ما تخدمش صح وأنتِ فاتحاها كملف مباشر، هذا طبيعي بمتصفحات قليلة، والحل النشر (تحت) بدل التجربة المحلية.

---

## النشر النهائي على Cloudflare Pages (خطوة بخطوة)

### 1. رفع المشروع على GitHub
1. روحي لـ [github.com/new](https://github.com/new)
2. اسم المستودع (Repository name): `vidreward-admin`
3. خليه **Public** أو **Private** (الاثنين يخدمو مع Cloudflare Pages)
4. اضغطي **Create repository**
5. بصفحة المستودع الجديدة، دور على زر **"uploading an existing file"**
6. اسحبي (Drag & Drop) **كل ملفات ومجلدات هذا المشروع** (بما فيها مجلد `assets` كامل)
7. اكتبي أي رسالة بالأسفل (مثلاً "أول نسخة") واضغطي **Commit changes**

### 2. ربط GitHub بـ Cloudflare Pages
1. Cloudflare Dashboard → من القائمة الجانبية دور على **Workers & Pages**
2. اضغطي **Create application** → تبويب **Pages** → **Connect to Git**
3. اختاري حساب GitHub، ثم المستودع `vidreward-admin`
4. بإعدادات البناء (Build settings):
   - **Framework preset:** None
   - **Build command:** اتركيه **فارغ**
   - **Build output directory:** `/` (نقطة واحدة أو سلاش، يعني جذر المشروع)
5. اضغطي **Save and Deploy**

بعد دقيقة أو اثنين، راح يعطيكِ رابط دائم شكله:
```
https://vidreward-admin.pages.dev
```

هذا هو رابط لوحة التحكم النهائي، تقدري تفتحيه من أي جهاز أو موبايل.

---

## تحديث المشروع لاحقاً
أي مرة نبني جزء جديد (صفحة مستخدمين، سحوبات...)، الطريقة:
1. نبعتلك الملفات الجديدة
2. تضيفيها/تستبدليها بنفس مستودع GitHub (نفس طريقة الرفع تحت "Add file" → "Upload files")
3. Cloudflare Pages ينشر التحديث **تلقائياً** خلال ثواني، بدون أي خطوة إضافية

---

## بنية المشروع
```
vidreward-admin/
├── index.html          ← صفحة تسجيل الدخول
├── dashboard.html       ← الصفحة الرئيسية بعد الدخول
└── assets/
    ├── css/
    │   └── theme.css    ← نظام التصميم (Neumorphism + Dark/Light)
    └── js/
        ├── config.js    ← إعدادات الاتصال بـ Supabase
        ├── theme.js     ← منطق تبديل الوضع الليلي/النهاري
        ├── auth.js      ← منطق تسجيل الدخول
        └── dashboard.js ← منطق جلب وعرض الإحصائيات
```
