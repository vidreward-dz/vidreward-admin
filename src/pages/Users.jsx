import { useEffect, useMemo, useState } from "react";
import AppLayout from "../components/AppLayout";
import { callFunction, AuthError } from "../lib/supabaseClient"; 
import { useAuth } from "../lib/useAuth"; 

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("ar-DZ", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function Users() {
  const { signOut } = useAuth();
  const [users, setUsers] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [toast, setToast] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null); // { user, nextActive }
  const [deleteTarget, setDeleteTarget] = useState(null); // user
  const [tempBlockTarget, setTempBlockTarget] = useState(null); // user
  const [search, setSearch] = useState("");

  const initialFilter = new URLSearchParams(window.location.search).get("filter");
  const [filter, setFilter] = useState(initialFilter === "suspicious" ? "suspicious" : "all");

  async function load() {
    setLoadError("");
    try {
      const { users } = await callFunction("admin-list-users", { method: "GET" });
      setUsers(users ?? []);
    } catch (err) {
      if (err instanceof AuthError) {
        await signOut();
        return;
      }
      setLoadError("تعذّر تحميل المستخدمين: " + err.message);
      setUsers([]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function showToast(type, text) {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleToggleStatus(u, nextActive) {
    setBusyId(u.id);
    try {
      await callFunction("admin-toggle-user-status", {
        body: { userId: u.id, isActive: nextActive },
      });
      showToast("success", nextActive ? `تم إلغاء حظر ${u.name}` : `تم حظر ${u.name}`);
      load();
    } catch (err) {
      if (err instanceof AuthError) return signOut();
      showToast("error", err.message || "فشلت العملية");
    } finally {
      setBusyId(null);
      setConfirmTarget(null);
    }
  }

  async function handleDelete(u) {
    setBusyId(u.id);
    try {
      await callFunction("admin-delete-user", { body: { userId: u.id } });
      showToast("success", `تم حذف ${u.name} نهائياً`);
      load();
    } catch (err) {
      if (err instanceof AuthError) return signOut();
      showToast("error", err.message || "فشل الحذف");
    } finally {
      setBusyId(null);
      setDeleteTarget(null);
    }
  }

  async function handleTempBlock(u, hours) {
    setBusyId(u.id);
    try {
      await callFunction("admin-temp-block-user", { body: { userId: u.id, hours } });
      const label = hours === 24 ? "24 ساعة" : hours === 72 ? "3 أيام" : "7 أيام";
      showToast("success", `تم حظر ${u.name} مؤقتاً لمدة ${label}`);
      load();
    } catch (err) {
      if (err instanceof AuthError) return signOut();
      showToast("error", err.message || "فشلت العملية");
    } finally {
      setBusyId(null);
      setTempBlockTarget(null);
    }
  }

  const suspiciousCount = (users ?? []).filter((u) => u.isSuspicious).length;
  const blockedCount = (users ?? []).filter((u) => !u.is_active).length;

  const filtered = useMemo(() => {
    let list = users ?? [];
    if (filter === "active") list = list.filter((u) => u.is_active);
    if (filter === "blocked") list = list.filter((u) => !u.is_active);
    if (filter === "suspicious") list = list.filter((u) => u.isSuspicious);

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (u) =>
          (u.name ?? "").toLowerCase().includes(q) ||
          (u.email ?? "").toLowerCase().includes(q) ||
          (u.phone ?? "").includes(q) ||
          (u.referral_code ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [users, filter, search]);

  return (
    <AppLayout title="المستخدمون 👥" subtitle="إدارة الحسابات، البلوكاج، والحسابات المشبوهة">
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        {[
          { key: "all", label: `الكل (${(users ?? []).length})` },
          { key: "active", label: "نشطين" },
          { key: "blocked", label: `محظورين (${blockedCount})` },
          { key: "suspicious", label: `حسابات مشبوهة 🚩 (${suspiciousCount})` },
        ].map((f) => (
          <button
            key={f.key}
            className="neu-btn"
            onClick={() => setFilter(f.key)}
            style={{
              padding: "8px 16px",
              fontSize: 12,
              fontWeight: 700,
              ...(filter === f.key
                ? { background: "var(--accent)", color: "#fff" }
                : f.key === "suspicious"
                ? { color: "var(--red)" }
                : {}),
            }}
          >
            {f.label}
          </button>
        ))}
        <button className="neu-btn" onClick={load} style={{ padding: "8px 14px", fontSize: 12, marginRight: "auto" }}>
          تحديث ↻
        </button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <input
          className="neu-input"
          placeholder="بحث بالاسم، الإيميل، الهاتف، أو كود الإحالة..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", maxWidth: 420 }}
        />
      </div>

      {filter === "suspicious" && suspiciousCount > 0 && (
        <div
          className="neu"
          style={{
            padding: "12px 18px", borderRadius: 14, marginBottom: 16,
            fontSize: 12, color: "var(--red)", lineHeight: 1.7,
          }}
        >
          🚩 هاذو الحسابات مرتبطة بنفس الجهاز (device_id) مع حساب آخر أو أكثر — مؤشر محتمل لاستغلال نظام الإحالة. راجعهم يدوياً قبل أي إجراء.
        </div>
      )}

      <div className="neu card">
        <div className="card-body" style={{ padding: 0 }}>
          {users === null && <EmptyState text="جارٍ التحميل..." />}
          {loadError && <EmptyState text={loadError} isError />}
          {users !== null && filtered.length === 0 && !loadError && (
            <EmptyState text="لا يوجد مستخدمون بهذا التصنيف" />
          )}
          {filtered.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--border)" }}>
                    {["المستخدم", "الهاتف", "الولاية", "الإحالة", "تاريخ التسجيل", "آخر دخول", "الحالة", ""].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: "right", fontSize: 11, color: "var(--text-secondary)",
                          padding: "12px 20px", fontWeight: 700, whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => {
                    const busy = busyId === u.id;
                    return (
                      <tr key={u.id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "14px 20px", fontSize: 13 }}>
                          <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                            {u.name ?? "—"}
                            {u.isSuspicious && <span title={`نفس الجهاز مع ${u.sharedDeviceCount - 1} حساب آخر`}>🚩</span>}
                            {u.role === "admin" && (
                              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "var(--accent-soft, #eef2ff)", color: "var(--accent)" }}>
                                أدمن
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{u.email}</div>
                        </td>
                        <td style={{ padding: "14px 20px", fontSize: 12, color: "var(--text-secondary)" }} className="num">
                          {u.phone ?? "—"}
                        </td>
                        <td style={{ padding: "14px 20px", fontSize: 12, color: "var(--text-secondary)" }}>
                          {u.wilaya ?? "—"}
                        </td>
                        <td style={{ padding: "14px 20px", fontSize: 12 }}>
                          <span style={{ fontFamily: "var(--font-num)" }}>{u.referral_code ?? "—"}</span>
                          {u.referralCount > 0 && (
                            <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>{u.referralCount} محال</div>
                          )}
                        </td>
                        <td style={{ padding: "14px 20px", fontSize: 11, color: "var(--text-secondary)", whiteSpace: "nowrap" }} className="num">
                          {formatDate(u.created_at)}
                        </td>
                        <td style={{ padding: "14px 20px", fontSize: 11, color: "var(--text-secondary)", whiteSpace: "nowrap" }} className="num">
                          {formatDate(u.last_login_at)}
                        </td>
                        <td style={{ padding: "14px 20px" }}>
                          <span
                            style={{
                              fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20,
                              background: u.is_active ? "var(--green-soft)" : "var(--red-soft)",
                              color: u.is_active ? "var(--green)" : "var(--red)",
                            }}
                          >
                            {u.is_active
                              ? "نشط"
                              : u.blocked_until && new Date(u.blocked_until) > new Date()
                              ? "محظور مؤقتاً"
                              : "محظور"}
                          </span>
                          {!u.is_active && u.blocked_until && new Date(u.blocked_until) > new Date() && (
                            <div style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 4 }}>
                              حتى {formatDate(u.blocked_until)}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "14px 20px", whiteSpace: "nowrap" }}>
                          {u.role !== "admin" && (
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              <button
                                className="neu-btn"
                                disabled={busy}
                                onClick={() => setConfirmTarget({ user: u, nextActive: !u.is_active })}
                                style={{ padding: "7px 12px", fontSize: 11, color: u.is_active ? "var(--red)" : "var(--green)" }}
                              >
                                {busy ? "..." : u.is_active ? "حظر" : "إلغاء الحظر"}
                              </button>
                              <button
                                className="neu-btn"
                                disabled={busy}
                                onClick={() => setTempBlockTarget(u)}
                                style={{ padding: "7px 12px", fontSize: 11, color: "var(--gold, #b8860b)" }}
                              >
                                ⏳ بلوك مؤقت
                              </button>
                              <button
                                className="neu-btn"
                                disabled={busy}
                                onClick={() => setDeleteTarget(u)}
                                style={{ padding: "7px 12px", fontSize: 11, color: "var(--red)" }}
                              >
                                🗑️ حذف
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {confirmTarget && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(20,20,35,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20,
          }}
          onClick={(e) => e.target === e.currentTarget && setConfirmTarget(null)}
        >
          <div className="neu" style={{ width: 400, maxWidth: "100%", borderRadius: 24, padding: 26, textAlign: "center" }}>
            <div style={{ fontSize: 34, marginBottom: 10 }}>
              {confirmTarget.nextActive ? "✅" : "🚫"}
            </div>
            <h2 className="display" style={{ fontSize: 17, marginBottom: 10 }}>
              {confirmTarget.nextActive ? "إلغاء حظر الحساب" : "حظر الحساب"}
            </h2>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 22 }}>
              {confirmTarget.nextActive ? (
                <>تأكيد إلغاء حظر <b style={{ color: "var(--text-primary)" }}>{confirmTarget.user.name}</b>؟ سيتمكن من الدخول للتطبيق من جديد.</>
              ) : (
                <>تأكيد حظر <b style={{ color: "var(--text-primary)" }}>{confirmTarget.user.name}</b>؟ لن يتمكن من الدخول للتطبيق حتى تُلغى العملية.</>
              )}
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="neu-btn" onClick={() => setConfirmTarget(null)} style={{ flex: 1 }}>
                إلغاء
              </button>
              <button
                className="neu-btn neu-btn-accent"
                onClick={() => handleToggleStatus(confirmTarget.user, confirmTarget.nextActive)}
                style={{ flex: 1 }}
              >
                تأكيد
              </button>
            </div>
          </div>
        </div>
      )}

      {tempBlockTarget && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(20,20,35,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20,
          }}
          onClick={(e) => e.target === e.currentTarget && setTempBlockTarget(null)}
        >
          <div className="neu" style={{ width: 400, maxWidth: "100%", borderRadius: 24, padding: 26, textAlign: "center" }}>
            <div style={{ fontSize: 34, marginBottom: 10 }}>⏳</div>
            <h2 className="display" style={{ fontSize: 17, marginBottom: 10 }}>بلوك مؤقت</h2>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 22 }}>
              اختاري مدة حظر <b style={{ color: "var(--text-primary)" }}>{tempBlockTarget.name}</b>. سيُفك الحظر تلقائياً بعد انتهاء المدة.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { hours: 24, label: "24 ساعة" },
                { hours: 72, label: "3 أيام" },
                { hours: 168, label: "7 أيام" },
              ].map((opt) => (
                <button
                  key={opt.hours}
                  className="neu-btn neu-btn-accent"
                  onClick={() => handleTempBlock(tempBlockTarget, opt.hours)}
                  style={{ padding: "10px" }}
                >
                  {opt.label}
                </button>
              ))}
              <button className="neu-btn" onClick={() => setTempBlockTarget(null)} style={{ padding: "10px" }}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(20,20,35,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20,
          }}
          onClick={(e) => e.target === e.currentTarget && setDeleteTarget(null)}
        >
          <div className="neu" style={{ width: 400, maxWidth: "100%", borderRadius: 24, padding: 26, textAlign: "center" }}>
            <div style={{ fontSize: 34, marginBottom: 10 }}>🗑️</div>
            <h2 className="display" style={{ fontSize: 17, marginBottom: 10, color: "var(--red)" }}>
              حذف نهائي — لا رجعة فيه
            </h2>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 22 }}>
              سيُحذف حساب <b style={{ color: "var(--text-primary)" }}>{deleteTarget.name}</b> وكل بياناته
              (المحفظة، المشاهدات، السحوبات، الإحالات) بشكل نهائي. هاذ الإجراء ما يمكنش التراجع عنه.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="neu-btn" onClick={() => setDeleteTarget(null)} style={{ flex: 1 }}>
                إلغاء
              </button>
              <button
                className="neu-btn"
                onClick={() => handleDelete(deleteTarget)}
                style={{ flex: 1, background: "var(--red)", color: "#fff" }}
              >
                تأكيد الحذف النهائي
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
