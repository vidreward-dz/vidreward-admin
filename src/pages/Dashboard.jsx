import { useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";
import { callFunction, AuthError } from "../lib/supabaseClient";
import { useAuth } from "../lib/useAuth";

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
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await callFunction("admin-dashboard-stats", { method: "GET" });
        if (active) setStats(data);
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
    </AppLayout>
  );
}
