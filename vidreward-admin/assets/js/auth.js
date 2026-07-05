// ============================================================
// تسجيل الدخول: يسجّل الجلسة بـ Supabase Auth، ثم يتحقق من صلاحية
// الأدمن عبر استدعاء admin-dashboard-stats (403 = ماشي أدمن).
// هذا يتجنب الاعتماد على RLS بالمتصفح لقراءة role مباشرة.
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const errorMsg = document.getElementById("errorMsg");
  const submitBtn = document.getElementById("submitBtn");

  // إذا كاين جلسة صالحة أصلاً، حاول ندخلو مباشرة للـ Dashboard
  checkExistingSession();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorMsg.textContent = "";
    submitBtn.disabled = true;
    submitBtn.textContent = "جاري التحقق...";

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data?.session) {
        errorMsg.textContent = "البريد أو كلمة المرور غير صحيحة";
        return;
      }

      const isAdmin = await verifyAdmin(data.session.access_token);
      if (!isAdmin) {
        errorMsg.textContent = "هذا الحساب لا يملك صلاحية أدمن";
        await supabaseClient.auth.signOut();
        return;
      }

      window.location.href = "dashboard.html";
    } catch (err) {
      console.error(err);
      errorMsg.textContent = "خطأ غير متوقع، حاولي مرة أخرى";
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "دخول";
    }
  });

  async function checkExistingSession() {
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();
    if (!session) return;

    const isAdmin = await verifyAdmin(session.access_token);
    if (isAdmin) {
      window.location.href = "dashboard.html";
    }
  }

  async function verifyAdmin(accessToken) {
    try {
      const res = await fetch(`${FUNCTIONS_URL}/admin-dashboard-stats`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return res.ok;
    } catch {
      return false;
    }
  }
});
