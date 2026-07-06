import { useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/useAuth";
import ThemeToggle from "../components/ThemeToggle";

export default function Login() {
  const { session, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (loading) return null;
  if (session) return <Navigate to="/" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setError(error.message === "Invalid login credentials"
        ? "البريد أو كلمة المرور غير صحيحة"
        : error.message);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        position: "relative",
      }}
    >
      <div style={{ position: "absolute", top: 20, left: 20 }}>
        <ThemeToggle />
      </div>

      <form onSubmit={handleSubmit} className="neu" style={{ width: 380, maxWidth: "100%", borderRadius: 24, padding: "36px 32px" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            className="logo-icon glow-icon"
            style={{ width: 60, height: 60, borderRadius: 18, margin: "0 auto 14px", fontSize: 28 }}
          >
            🎬
          </div>
          <h1 className="display" style={{ fontSize: 22 }}>VidReward DZ</h1>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 6, letterSpacing: 1 }}>
            ADMIN PANEL
          </p>
        </div>

        <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, display: "block" }}>
          البريد الإلكتروني
        </label>
        <input
          className="neu-input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@vidreward.dz"
          required
          autoFocus
          style={{ marginBottom: 16 }}
        />

        <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, display: "block" }}>
          كلمة المرور
        </label>
        <input
          className="neu-input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          style={{ marginBottom: 20 }}
        />

        {error && (
          <div
            style={{
              background: "var(--red-soft)",
              color: "var(--red)",
              fontSize: 12,
              fontWeight: 700,
              padding: "10px 14px",
              borderRadius: 12,
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          className="neu-btn neu-btn-accent"
          disabled={busy}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}
        >
          {busy && <span className="spinner" />}
          {busy ? "جارٍ الدخول..." : "تسجيل الدخول"}
        </button>
      </form>
    </div>
  );
}
