// ============================================================
// تبديل الوضع الليلي/النهاري — يُحفظ الاختيار بالمتصفح (localStorage)
// ============================================================

(function initTheme() {
  const saved = localStorage.getItem("vidreward_theme");
  const prefersDark =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = saved || (prefersDark ? "dark" : "light");
  document.documentElement.setAttribute("data-theme", theme);
})();

document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn = document.getElementById("themeToggle");
  if (!toggleBtn) return;

  const knob = toggleBtn.querySelector(".knob");
  const syncIcon = () => {
    const current = document.documentElement.getAttribute("data-theme");
    knob.textContent = current === "dark" ? "☀️" : "🌙";
  };
  syncIcon();

  toggleBtn.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("vidreward_theme", next);
    syncIcon();
  });
});
