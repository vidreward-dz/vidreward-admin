import Sidebar from "./Sidebar";
import ThemeToggle from "./ThemeToggle";

export default function AppLayout({ title, subtitle, children }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main">
        <div className="topbar neu">
          <div>
            <h1 className="page-title display">{title}</h1>
            {subtitle && <p className="page-sub">{subtitle}</p>}
          </div>
          <div className="topbar-right">
            <ThemeToggle />
          </div>
        </div>
        <div className="content">{children}</div>
      </main>
    </div>
  );
}
