import { useEffect, useState } from "react";

function getInitialTheme() {
  const saved = localStorage.getItem("vr-theme");
  if (saved === "dark" || saved === "light") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("vr-theme", theme);
  }, [theme]);

  return (
    <button
      className="theme-toggle"
      aria-label="تبديل الوضع الليلي/النهاري"
      onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
    >
      <span className="knob">{theme === "dark" ? "🌙" : "☀️"}</span>
    </button>
  );
}
