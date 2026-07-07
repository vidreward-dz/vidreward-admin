import { createClient } from "@supabase/supabase-js";

// ============================================================
// نفس القيم المستخدمة بمشروعك الحالي (assets/js/config.js)
// كل هذه القيم عامة وآمنة (anon key مصمم للاستخدام بالمتصفح)
// ============================================================
export const SUPABASE_URL = "https://fqyejhsqyoijptdqdiqr.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_P1NgS17bUaAJ7s_BDjyhCg_cDkoWgpz";

export const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// طلب مساعد لأي Edge Function — يرفق التوكن تلقائياً ويتعامل مع 401/403
export async function callFunction(name, { method = "POST", body } = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new AuthError("لا توجد جلسة نشطة");
  }

  const res = await fetch(`${FUNCTIONS_URL}/${name}`, {
    method,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 || res.status === 403) {
    throw new AuthError("انتهت الجلسة أو لا تملك صلاحية");
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.error || data?.message || `فشل الطلب: ${name}`);
  }

  return data;
}

export class AuthError extends Error {
  constructor(message) {
    super(message);
    this.name = "AuthError";
  }
}
