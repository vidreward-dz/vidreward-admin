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

function initials(email) {
  if (!email) return "أ";
  return email[0].toUpperCase();
}

export default function Sidebar() {
  const { session, signOut } = useAuth();
  const email = session?.user?.email;

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-brand-icon">🎬</span>
        <span className="sidebar-brand-text">VidReward DZ</span>
      </div>

      <div className="sidebar-profile">
        <div className="sidebar-avatar">{initials(email)}</div>
        <div className="sidebar-name">{email ?? "أدمن"}</div>
        <div className="sidebar-email">Administrator</div>
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
                    `nav-item ${isActive ? "active" : ""}`
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
        <button className="logout-link" onClick={signOut}>
          تسجيل الخروج
        </button>
      </div>
    </aside>
  );
}
