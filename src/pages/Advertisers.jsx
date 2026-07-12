import { useEffect, useMemo, useState } from "react";
import AppLayout from "../components/AppLayout";
import { callFunction, AuthError } from "../lib/supabaseClient";
import { useAuth } from "../lib/useAuth";

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("ar-DZ", { dateStyle: "medium" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

const emptyCreateForm = {
  companyName: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  loginEmail: "",
  password: "",
  confirmPassword: "",
};

export default function Advertisers() {
  const { signOut } = useAuth();
  const [advertisers, setAdvertisers] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const [createForm, setCreateForm] = useState(null); // فتح modal إنشاء
  const [busy, setBusy] = useState(false);

  const [confirmToggle, setConfirmToggle] = useState(null); // { advertiser, nextActive }
  const [resetTarget, setResetTarget] = useState(null); // { advertiser, password, confirmPassword }

  async function load() {
    setLoadError("");
    try {
      const { advertisers } = await callFunction("admin-list-advertisers", { method: "GET" });
      setAdvertisers(advertisers ?? []);
    } catch (err) {
      if (err instanceof AuthError) return signOut();
      setLoadError("تعذّر تحميل المعلنين: " + err.message);
      setAdvertisers([]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function showToast(type, text) {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleCreate() {
    const f = createForm;
    if (!f.companyName.trim()) return showToast("error", "أدخل اسم الشركة");
    if (!f.loginEmail.trim()) return showToast("error", "أدخل إيميل الدخول");
    if (f.password.length < 6) return showToast("error", "كلمة السر يجب أن تكون 6 أحرف على الأقل");
    if (f.password !== f.confirmPassword) return showToast("error", "كلمتا السر غير متطابقتين");

    setBusy(true);
    try {
      await callFunction("admin-create-advertiser", {
        body: {
          companyName: f.companyName,
          contactName: f.contactName,
          contactEmail: f.contactEmail,
          contactPhone: f.contactPhone,
          loginEmail: f.loginEmail,
          password: f.password,
        },
      });
      showToast("success", "تم إنشاء حساب المعلن");
      setCreateForm(null);
      load();
    } catch (err) {
      if (err instanceof AuthError) return signOut();
      showToast("error", err.message || "فشلت العملية");
    } finally {
      setBusy(false);
    }
  }

  async function handleToggle() {
    const { advertiser, nextActive } = confirmToggle;
    setBusy(true);
    try {
      await callFunction("admin-toggle-advertiser-status", {
        body: { advertiserId: advertiser.id, isActive: nextActive },
      });
      showToast("success", nextActive ? `تم تفعيل ${advertiser.company_name}` : `تم تعطيل ${advertiser.company_name}`);
      load();
    } catch (err) {
      if (err instanceof AuthError) return signOut();
      showToast("error", err.message || "فشلت العملية");
    } finally {
      setBusy(false);
      setConfirmToggle(null);
    }
  }

  async function handleResetPassword() {
    const { advertiser, password, confirmPassword } = resetTarget;
    if (password.length < 6) return showToast("error", "كلمة السر يجب أن تكون 6 أحرف على الأقل");
    if (password !== confirmPassword) return showToast("error", "كلمتا السر غير متطابقتين");

    setBusy(true);
    try {
      await callFunction("admin-reset-advertiser-password", {
        body: { advertiserId: advertiser.id, newPassword: password },
      });
      showToast("success", `تم تغيير كلمة سر ${advertiser.company_name}`);
      setResetTarget(null);
    } catch (err) {
      if (err instanceof AuthError) return signOut();
      showToast("error", err.message || "فشلت العملية");
    } finally {
      setBusy(false);
    }
  }

  const activeCount = (advertisers ?? []).filter((a) => a.is_active).length;
  const inactiveCount = (advertisers ?? []).filter((a) => !a.is_active).length;

  const filtered = useMemo(() => {
    let list = advertisers ?? [];
    if (filter === "active") list = list.filter((a) => a.is_active);
    if (filter === "inactive") list = list.filter((a) => !a.is_active);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (a) =>
          (a.company_name ?? "").toLowerCase().includes(q) ||
          (a.contact_name ?? "").toLowerCase().includes(q) ||
          (a.loginEmail ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [advertisers, filter, search]);

  return (
    <AppLayout title="المعلنون 🏢" subtitle="إدارة حسابات المعلنين وحسابات دخولهم">
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        {[
          { key: "all", label: `الكل (${(advertisers ?? []).length})` },
          { key: "active", label: `نشطين (${activeCount})` },
          { key: "inactive", label: `معطّلين (${inactiveCount})` },
        ].map((f) => (
          <button
            key={f.key}
            className="neu-btn"
            onClick={() => setFilter(f.key)}
            style={{ padding: "8px 16px", fontSize: 12, fontWeight: 700, ...(filter === f.key ? { background: "var(--accent)", color: "#fff" } : {}) }}
          >
            {f.label}
          </button>
        ))}
        <button
          className="neu-btn neu-btn-accent"
          onClick={() => setCreateForm({ ...emptyCreateForm })}
          style={{ padding: "8px 18px", fontSize: 12, marginRight: "auto" }}
        >
          + معلن جديد
        </button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <input
          className="neu-input"
          placeholder="بحث باسم الشركة، جهة الاتصال، أو الإيميل..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", maxWidth: 420 }}
        />
      </div>

      <div className="neu card">
        <div className="card-body" style={{ padding: 0 }}>
          {advertisers === null && <EmptyState text="جارٍ التحميل..." />}
          {loadError && <EmptyState text={loadError} isError />}
          {advertisers !== null && filtered.length === 0 && !loadError && <EmptyState text="لا يوجد معلنون بهذا التصنيف" />}
          {filtered.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 950 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--border)" }}>
                    {["الشركة", "جهة الاتصال", "إيميل الدخول", "الحملات", "تاريخ الإنشاء", "الحالة", ""].map((h) => (
                      <th key={h} style={{ textAlign: "right", fontSize: 11, color: "var(--text-secondary)", padding: "12px 20px", fontWeight: 700, whiteSpace: "nowrap" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => (
                    <tr key={a.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "14px 20px", fontSize: 13, fontWeight: 700 }}>
                        {a.company_name}
                        {a.is_verified && <span style={{ marginRight: 6, fontSize: 10, color: "var(--green)" }}>✓ موثّق</span>}
                      </td>
                      <td style={{ padding: "14px 20px", fontSize: 12, color: "var(--text-secondary)" }}>
                        <div>{a.contact_name || "—"}</div>
                        {a.contact_phone && <div style={{ fontSize: 11 }} className="num">{a.contact_phone}</div>}
                      </td>
                      <td style={{ padding: "14px 20px", fontSize: 12 }}>{a.loginEmail ?? "—"}</td>
                      <td style={{ padding: "14px 20px", fontSize: 12 }} className="num">{a.campaignCount}</td>
                      <td style={{ padding: "14px 20px", fontSize: 11, color: "var(--text-secondary)", whiteSpace: "nowrap" }} className="num">
                        {formatDate(a.created_at)}
                      </td>
                      <td style={{ padding: "14px 20px" }}>
                        <span
                          style={{
                            fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20,
                            background: a.is_active ? "var(--green-soft)" : "var(--red-soft)",
                            color: a.is_active ? "var(--green)" : "var(--red)",
                          }}
                        >
                          {a.is_active ? "نشط" : "معطّل"}
                        </span>
                      </td>
                      <td style={{ padding: "14px 20px", whiteSpace: "nowrap", display: "flex", gap: 6 }}>
                        <button
                          className="neu-btn"
                          onClick={() => setResetTarget({ advertiser: a, password: "", confirmPassword: "" })}
                          style={{ padding: "7px 10px", fontSize: 11 }}
                        >
                          🔑 كلمة السر
                        </button>
                        <button
                          className="neu-btn"
                          onClick={() => setConfirmToggle({ advertiser: a, nextActive: !a.is_active })}
                          style={{ padding: "7px 10px", fontSize: 11, color: a.is_active ? "var(--red)" : "var(--green)" }}
                        >
                          {a.is_active ? "تعطيل" : "تفعيل"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ---------- Modal: إنشاء معلن ---------- */}
      {createForm && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(20,20,35,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }}
          onClick={(e) => e.target === e.currentTarget && !busy && setCreateForm(null)}
        >
          <div className="neu" style={{ width: 480, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto", borderRadius: 24, padding: 26 }}>
            <h2 className="display" style={{ fontSize: 17, marginBottom: 18 }}>معلن جديد</h2>

            <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, display: "block" }}>اسم الشركة *</label>
            <input className="neu-input" value={createForm.companyName} onChange={(e) => setCreateForm({ ...createForm, companyName: e.target.value })} disabled={busy} style={{ marginBottom: 14 }} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, display: "block" }}>اسم جهة الاتصال</label>
                <input className="neu-input" value={createForm.contactName} onChange={(e) => setCreateForm({ ...createForm, contactName: e.target.value })} disabled={busy} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, display: "block" }}>هاتف الاتصال</label>
                <input className="neu-input" value={createForm.contactPhone} onChange={(e) => setCreateForm({ ...createForm, contactPhone: e.target.value })} disabled={busy} />
              </div>
            </div>

            <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, display: "block" }}>إيميل التواصل (اختياري، إن اختلف عن إيميل الدخول)</label>
            <input className="neu-input" type="email" value={createForm.contactEmail} onChange={(e) => setCreateForm({ ...createForm, contactEmail: e.target.value })} disabled={busy} style={{ marginBottom: 14 }} />

            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: "var(--accent)" }}>🔑 بيانات دخول الداشبورد</div>

              <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, display: "block" }}>إيميل الدخول *</label>
              <input className="neu-input" type="email" value={createForm.loginEmail} onChange={(e) => setCreateForm({ ...createForm, loginEmail: e.target.value })} disabled={busy} style={{ marginBottom: 14 }} />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, display: "block" }}>كلمة السر *</label>
                  <input className="neu-input" type="password" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} disabled={busy} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, display: "block" }}>تأكيد كلمة السر *</label>
                  <input className="neu-input" type="password" value={createForm.confirmPassword} onChange={(e) => setCreateForm({ ...createForm, confirmPassword: e.target.value })} disabled={busy} />
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button className="neu-btn" onClick={() => setCreateForm(null)} disabled={busy} style={{ flex: 1 }}>إلغاء</button>
              <button className="neu-btn neu-btn-accent" onClick={handleCreate} disabled={busy} style={{ flex: 1 }}>
                {busy ? "جارٍ الإنشاء..." : "إنشاء الحساب"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Modal: تأكيد تفعيل/تعطيل ---------- */}
      {confirmToggle && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(20,20,35,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }}
          onClick={(e) => e.target === e.currentTarget && !busy && setConfirmToggle(null)}
        >
          <div className="neu" style={{ width: 400, maxWidth: "100%", borderRadius: 24, padding: 26, textAlign: "center" }}>
            <div style={{ fontSize: 34, marginBottom: 10 }}>{confirmToggle.nextActive ? "✅" : "🚫"}</div>
            <h2 className="display" style={{ fontSize: 17, marginBottom: 10 }}>
              {confirmToggle.nextActive ? "تفعيل الحساب" : "تعطيل الحساب"}
            </h2>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 22 }}>
              {confirmToggle.nextActive ? (
                <>تأكيد تفعيل <b style={{ color: "var(--text-primary)" }}>{confirmToggle.advertiser.company_name}</b>؟ سيتمكن من الدخول لداشبوردو من جديد.</>
              ) : (
                <>تأكيد تعطيل <b style={{ color: "var(--text-primary)" }}>{confirmToggle.advertiser.company_name}</b>؟ لن يتمكن من الدخول حتى تُلغى العملية.</>
              )}
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="neu-btn" onClick={() => setConfirmToggle(null)} disabled={busy} style={{ flex: 1 }}>إلغاء</button>
              <button className="neu-btn neu-btn-accent" onClick={handleToggle} disabled={busy} style={{ flex: 1 }}>تأكيد</button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Modal: إعادة تعيين كلمة السر ---------- */}
      {resetTarget && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(20,20,35,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }}
          onClick={(e) => e.target === e.currentTarget && !busy && setResetTarget(null)}
        >
          <div className="neu" style={{ width: 400, maxWidth: "100%", borderRadius: 24, padding: 26 }}>
            <h2 className="display" style={{ fontSize: 16, marginBottom: 6 }}>إعادة تعيين كلمة السر</h2>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 18 }}>
              لـ <b style={{ color: "var(--text-primary)" }}>{resetTarget.advertiser.company_name}</b>
            </p>

            <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, display: "block" }}>كلمة السر الجديدة</label>
            <input
              className="neu-input" type="password"
              value={resetTarget.password}
              onChange={(e) => setResetTarget({ ...resetTarget, password: e.target.value })}
              disabled={busy}
              style={{ marginBottom: 14 }}
            />
            <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, display: "block" }}>تأكيد كلمة السر</label>
            <input
              className="neu-input" type="password"
              value={resetTarget.confirmPassword}
              onChange={(e) => setResetTarget({ ...resetTarget, confirmPassword: e.target.value })}
              disabled={busy}
              style={{ marginBottom: 20 }}
            />

            <div style={{ display: "flex", gap: 10 }}>
              <button className="neu-btn" onClick={() => setResetTarget(null)} disabled={busy} style={{ flex: 1 }}>إلغاء</button>
              <button className="neu-btn neu-btn-accent" onClick={handleResetPassword} disabled={busy} style={{ flex: 1 }}>
                {busy ? "جارٍ الحفظ..." : "حفظ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.text}</div>}
    </AppLayout>
  );
}

function EmptyState({ text, isError }) {
  return (
    <div style={{ padding: "40px 20px", textAlign: "center", color: isError ? "var(--red)" : "var(--text-secondary)", fontSize: 13 }}>
      {text}
    </div>
  );
}
