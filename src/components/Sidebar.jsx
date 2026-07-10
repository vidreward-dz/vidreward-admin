import { NavLink } from "react-router-dom";
import { useAuth } from "../lib/useAuth";

const NAV = [
  {
    section: "الرئيسية",
    items: [{ to: "/", label: "Dashboard", icon: "🏠", end: true }],
  },
  {
    section: "المستخدمون",
    items: [
      { label: "المستخدمين", icon: "👥", disabled: true },
      { label: "حسابات مشبوهة", icon: "🚩", disabled: true },
    ],
  },
  {
    section: "الإعلانات",
    items: [
      { to: "/videos", label: "الفيديوهات", icon: "🎥" },
      { label: "الحملات", icon: "📢", disabled: true },
      { label: "المعلنين", icon: "🏢", disabled: true },
    ],
  },
  {
    section: "المالية",
    items: [{ to: "/withdrawals", label: "السحوبات", icon: "💳" }],
  },
  {
    section: "الأدوات",
    items: [
      { label: "الإشعارات", icon: "🔔", disabled: true },
      { label: "الإعدادات", icon: "⚙️", disabled: true },
    ],
  },
];

export default function Sidebar() {
  const { session, signOut } = useAuth();

  return (
    <aside className="sidebar neu">
      <div className="logo">
        <div className="logo-icon glow-icon">🎬</div>
        <div>
          <div className="logo-name display">VidReward DZ</div>
          <div className="logo-sub">ADMIN PANEL</div>
        </div>
      </div>

      <nav className="nav">
        {NAV.map((group) => (
          <div key={group.section}>
            <div className="nav-section">{group.section}</div>
            {group.items.map((item) =>
              item.disabled ? (
                <div className="nav-item disabled" key={item.label}>
                  <span>{item.icon}</span>
                  <span className="label">{item.label}</span>
                </div>
              ) : (
                <NavLink
                  key={item.label}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `nav-item ${isActive ? "active neu-sm" : ""}`
                  }
                >
                  <span>{item.icon}</span>
                  <span className="label">{item.label}</span>
                </NavLink>
              )
            )}
          </div>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="admin-card neu-in">
          <div className="admin-av">👤</div>
          <div>
            <div className="admin-name">{session?.user?.email ?? "أدمن"}</div>
            <div className="admin-role">Administrator</div>
          </div>
        </div>
        <button className="logout-link" onClick={signOut}>
          تسجيل الخروج
        </button>
      </div>
    </aside>
  );
}
