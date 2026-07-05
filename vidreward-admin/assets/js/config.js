// ============================================================
// إعدادات الاتصال — كل القيم هنا عامة وآمنة (anon key مصمم
// للاستخدام بالمتصفح، الحماية الحقيقية موجودة بـ RLS بالسيرفر)
// ============================================================

const SUPABASE_URL = "https://fqyejhsqyoijptdqdiqr.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_P1NgS17bUaAJ7s_BDjyhCg_cDkoWgpz";

// رابط الـ Edge Functions الأساسي
const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

// عميل Supabase (مكتبة محمّلة عبر CDN بملف HTML)
const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
);
