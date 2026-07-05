// ============================================================
// Dashboard الرئيسية: تتحقق من الجلسة، تجلب الإحصائيات من
// admin-dashboard-stats، وتعرضها بكروت ملونة (بنفسجي/أخضر/ذهبي/أحمر).
// ============================================================

const STAT_CARDS = [
  { key: "totalUsers", label: "عدد المستخدمين", icon: "👥", color: "purple", format: "int" },
  { key: "activeToday", label: "نشطون اليوم", icon: "🟢", color: "green", format: "int" },
  { key: "earningsToday", label: "أرباح اليوم", icon: "💰", color: "gold", format: "money" },
  { key: "earningsWeek", label: "أرباح آخر 7 أيام", icon: "📅", color: "gold", format: "money" },
  { key: "earningsMonth", label: "أرباح آخر 30 يوم", icon: "📈", color: "gold", format: "money" },
  { key: "totalViews", label: "عدد المشاهدات", icon: "🎥", color: "purple", format: "int" },
  { key: "pendingWithdrawals", label: "طلبات سحب معلقة", icon: "💳", color: "red", format: "int" },
  { key: "activeCampaigns", label: "حملات نشطة", icon: "📢", color: "purple", format: "int" },
  { key: "fraudAttempts", label: "محاولات الغش", icon: "🚨", color: "red", format: "na" },
];

document.addEventListener("DOMContentLoaded", async () => {
  const statsGrid = document.getElementById("statsGrid");
  const logoutBtn = document.getElementById("logoutBtn");
  const adminEmailEl = document.getElementById("adminEmail");

  renderCards(null);

  const {
    data: { session },
  } = await supabaseClient.auth.getSession();

  if (!session) {
    window.location.href = "index.html";
    return;
  }

  if (adminEmailEl && session.user?.email) {
    adminEmailEl.textContent = session.user.email;
  }

  try {
    const res = await fetch(`${FUNCTIONS_URL}/admin-dashboard-stats`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (res.status === 401 || res.status === 403) {
      await supabaseClient.auth.signOut();
      window.location.href = "index.html";
      return;
    }

    if (!res.ok) throw new Error("فشل جلب الإحصائيات");

    const stats = await res.json();
    renderCards(stats);
  } catch (err) {
    console.error(err);
    renderCards({ error: true });
  }

  logoutBtn.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    window.location.href = "index.html";
  });

  function renderCards(stats) {
    statsGrid.innerHTML = STAT_CARDS.map((card) => {
      const value = stats ? stats[card.key] : undefined;
      const loaded = !!stats && !stats.error;
      return `
        <div class="neu stat-card">
          <div class="stat-icon si-${card.color}">${card.icon}</div>
          ${renderValue(value, card.format, loaded)}
          <div class="stat-lbl">${card.label}</div>
        </div>
      `;
    }).join("");
  }

  function renderValue(value, format, loaded) {
    if (!loaded) {
      return `<div class="stat-val num" style="color: var(--text-secondary); font-size: 15px;">...</div>`;
    }
    if (value === null || value === undefined) {
      return `<div class="stat-na">غير متوفر بعد</div>`;
    }
    if (format === "money") {
      return `<div class="stat-val num">${formatNumber(value)} <span style="font-size:14px">دج</span></div>`;
    }
    return `<div class="stat-val num">${formatNumber(value)}</div>`;
  }

  function formatNumber(n) {
    return new Intl.NumberFormat("ar-DZ").format(n);
  }
});
