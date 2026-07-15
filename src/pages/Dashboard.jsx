import { useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";
import { callFunction, AuthError } from "../lib/supabaseClient";
import { useAuth } from "../lib/useAuth";

const STAT_CARDS = [
  // نظرة عامة
  { key: "totalUsers", label: "عدد المستخدمين", icon: "👥", color: "purple", format: "int" },
  { key: "activeToday", label: "نشطون اليوم", icon: "🟢", color: "green", format: "int" },
  { key: "totalViews", label: "عدد المشاهدات", icon: "🎥", color: "purple", format: "int" },
  { key: "activeCampaigns", label: "حملات نشطة", icon: "📢", color: "purple", format: "int" },

  // الأرباح (يومي / أسبوعي / شهري)
  { key: "earningsToday", label: "أرباح اليوم", icon: "💰", color: "gold", format: "money" },
  { key: "earningsWeek", label: "أرباح آخر 7 أيام", icon: "📅", color: "gold", format: "money" },
  { key: "earningsMonth", label: "أرباح آخر 30 يوم", icon: "📈", color: "gold", format: "money" },

  // الملخص المالي الأسبوعي (حملات ↔ مشاهدين ↔ صافي المنصة)
  { key: "weeklyCampaignRevenue", label: "مداخيل الحملات (هذا الأسبوع)", icon: "🟣", color: "purple", format: "money" },
  { key: "weeklyViewerEarnings", label: "صافي أرباح المشاهدين (هذا الأسبوع)", icon: "🟢", color: "green", format: "money" },
  { key: "weeklyPlatformProfit", label: "صافي أرباح المنصة (هذا الأسبوع)", icon: "🟡", color: "gold", format: "money" },

  // تنبيهات
  { key: "pendingWithdrawals", label: "طلبات سحب معلقة", icon: "💳", color: "red", format: "int" },
  { key: "fraudAttempts", label: "محاولات الغش", icon: "🚨", color: "red", format: "na" },
];

function formatNumber(n) {
  return new Intl.NumberFormat("ar-DZ").format(n);
}

function StatCard({ card, stats, loaded }) {
  const value = stats ? stats[card.key] : undefined;

  let valueNode;
  if (!loaded) {
    valueNode = <div className="stat-val num" style={{ color: "var(--text-secondary)", fontSize: 15 }}>...</div>;
  } else if (value === null || value === undefined) {
    valueNode = <div className="stat-na">غير متوفر بعد</div>;
  } else if (card.format === "money") {
    valueNode = (
      <div className="stat-val num">
        {formatNumber(value)} <span style={{ fontSize: 14 }}>دج</span>
      </div>
    );
  } else {
    valueNode = <div className="stat-val num">{formatNumber(value)}</div>;
  }

  return (
    <div className="neu stat-card">
      <div className={`stat-icon si-${card.color} glow-icon`}>{card.icon}</div>
      {valueNode}
      <div className="stat-lbl">{card.label}</div>
    </div>
  );
}

export default function Dashboard() {
  const { signOut } = useAuth();
  const [stats, setStats] = useState(null);
  const [weeklyHistory, setWeeklyHistory] = useState([]);
  const [errored, setErrored] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await callFunction("admin-dashboard-stats", { method: "GET" });
        if (!active) return;
        const current = data.weeklyStats?.current;
        setStats({
          ...data,
          weeklyCampaignRevenue: current?.campaignRevenue,
          weeklyViewerEarnings: current?.viewerEarnings,
          weeklyPlatformProfit: current?.platformProfit,
        });
        setWeeklyHistory(data.weeklyStats?.history ?? []);
      } catch (err) {
        if (!active) return;
        if (err instanceof AuthError) {
          await signOut();
          return;
        }
        setErrored(true);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loaded = !!stats && !errored;

  return (
    <AppLayout title="مرحباً 👋" subtitle="نظرة عامة على أداء المنصة">
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button
          className="neu-btn"
          style={{ fontSize: 13, padding: "8px 16px" }}
          onClick={() => setShowHistory(true)}
          disabled={!loaded}
        >
          📊 عرض سجل الأسابيع السابقة
        </button>
      </div>
      <section className="stats-grid">
        {STAT_CARDS.map((card) => (
          <StatCard key={card.key} card={card} stats={stats} loaded={loaded} />
        ))}
      </section>
      {errored && (
        <p style={{ marginTop: 16, fontSize: 13, color: "var(--red)" }}>
          تعذّر جلب الإحصائيات، حدّثي الصفحة أو حاولي لاحقاً.
        </p>
      )}
      {showHistory && (
        <WeeklyHistoryModal history={weeklyHistory} onClose={() => setShowHistory(false)} />
      )}
    </AppLayout>
  );
}

function WeeklyHistoryModal({ history, onClose }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="neu"
        style={{
          width: "100%",
          maxWidth: 640,
          maxHeight: "80vh",
          overflowY: "auto",
          padding: 20,
          borderRadius: 16,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>سجل الإحصائيات الأسبوعية</h3>
          <button className="neu-btn" style={{ padding: "4px 12px" }} onClick={onClose}>✕</button>
        </div>

        {history.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>لا يوجد سجل بعد.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr style={{ textAlign: "right", color: "var(--text-secondary)" }}>
                  <th style={{ padding: "6px 8px" }}>الأسبوع</th>
                  <th style={{ padding: "6px 8px" }}>مداخيل الحملات</th>
                  <th style={{ padding: "6px 8px" }}>أرباح المشاهدين</th>
                  <th style={{ padding: "6px 8px" }}>صافي ربح المنصة</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr key={row.week_start} style={{ borderTop: "1px solid var(--border-color, #333)" }}>
                    <td style={{ padding: "8px" }}>
                      {row.week_start} → {row.week_end}
                    </td>
                    <td style={{ padding: "8px" }}>{formatNumber(row.campaign_revenue)} دج</td>
                    <td style={{ padding: "8px" }}>{formatNumber(row.viewer_earnings)} دج</td>
                    <td style={{ padding: "8px" }}>{formatNumber(row.platform_profit)} دج</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
