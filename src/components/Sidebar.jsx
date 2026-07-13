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
      { to: "/users", label: "المستخدمين", icon: "👥" },
      { to: "/users?filter=suspicious", label: "حسابات مشبوهة", icon: "🚩" },
    ],
  },
  {
    section: "الإعلانات",
    items: [
      { to: "/videos", label: "الفيديوهات", icon: "🎥" },
      { to: "/campaigns", label: "الحملات", icon: "📢" },
      { to: "/advertisers", label: "المعلنين", icon: "🏢" }, 
      { to: "/PromoBanners", label: "صور الواجهة برومو", icon: "🎥" },
    ],
  },
  {
    section: "المالية",
    items: [{ to: "/withdrawals", label: "السحوبات", icon: "💳" }],
  },
  {
    section: "الأدوات",
    items: [
      { to: "/notifications", label: "الإشعارات", icon: "🔔" },
      { to: "/settings", label: "الإعدادات", icon: "⚙️" }
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
        <span className="sidebar-brand-text">VidReward DZ</span>
      </div>

      <div className="sidebar-profile">
      <div className="sidebar-avatar">
        <img
          src="/favicon.png"
          alt="VidReward"
          className="sidebar-avatar-logo"
       />
     </div>
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
