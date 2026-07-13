import { useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";
import { callFunction, AuthError } from "../lib/supabaseClient";
import { useAuth } from "../lib/useAuth";

const WILAYAS = [
  "أدرار", "الشلف", "الأغواط", "أم البواقي", "باتنة", "بجاية", "بسكرة", "بشار",
  "البليدة", "البويرة", "تمنراست", "تبسة", "تلمسان", "تيارت", "تيزي وزو", "الجزائر",
  "الجلفة", "جيجل", "سطيف", "سعيدة", "سكيكدة", "سيدي بلعباس", "عنابة", "قالمة",
  "قسنطينة", "المدية", "مستغانم", "المسيلة", "معسكر", "ورقلة", "وهران", "البيض",
  "إليزي", "برج بوعريريج", "بومرداس", "الطارف", "تندوف", "تيسمسيلت", "الوادي",
  "خنشلة", "سوق أهراس", "تيبازة", "ميلة", "عين الدفلى", "النعامة", "عين تموشنت",
  "غرداية", "غليزان", "تيميمون", "برج باجي مختار", "أولاد جلال", "بني عباس",
  "عين صالح", "عين قزام", "تقرت", "جانت", "المغير", "المنيعة",
];

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("ar-DZ", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function Notifications() {
  const { signOut } = useAuth();
  const [tab, setTab] = useState("send"); // send | internal
  const [toast, setToast] = useState(null);

  // --- إرسال إشعار ---
  const [type, setType] = useState("broadcast");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [selectedWilayas, setSelectedWilayas] = useState([]);
  const [targetUserId, setTargetUserId] = useState("");
  const [sending, setSending] = useState(false);

  // --- إشعارات الأدمن الداخلية ---
  const [notifs, setNotifs] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadError, setLoadError] = useState("");

  function showToast(type, text) {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  }

  async function loadInternal() {
    setLoadError("");
    try {
      const data = await callFunction("admin-list-notifications", { method: "GET" });
      setNotifs(data.notifications ?? []);
      setUnreadCount(data.unread_count ?? 0);
    } catch (err) {
      if (err instanceof AuthError) return signOut();
      setLoadError("تعذّر تحميل الإشعارات: " + err.message);
      setNotifs([]);
    }
  }

  useEffect(() => {
    if (tab === "internal") loadInternal();
  }, [tab]);

  async function markAsRead(id) {
    try {
      await callFunction("admin-mark-notification-read", { body: { notification_id: id } });
      setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      if (err instanceof AuthError) return signOut();
    }
  }

  function toggleWilaya(w) {
    setSelectedWilayas((prev) => (prev.includes(w) ? prev.filter((x) => x !== w) : [...prev, w]));
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return showToast("error", "لازم تعبي العنوان والنص");
    if (type === "wilaya" && selectedWilayas.length === 0) return showToast("error", "اختر ولاية وحدة على الأقل");
    if (type === "user" && !targetUserId.trim()) return showToast("error", "لازم تدخل User ID");

    setSending(true);
    try {
      const body = { type, title: title.trim(), message: message.trim() };
      if (type === "wilaya") body.target_wilayas = selectedWilayas;
      if (type === "user") body.target_user_id = targetUserId.trim();

      await callFunction("admin-send-notification", { body });
      showToast("success", "تم إرسال الإشعار بنجاح");
      setTitle("");
      setMessage("");
      setSelectedWilayas([]);
      setTargetUserId("");
    } catch (err) {
      if (err instanceof AuthError) return signOut();
      showToast("error", err.message || "فشل الإرسال");
    } finally {
      setSending(false);
    }
  }

  return (
    <AppLayout title="الإشعارات 🔔" subtitle="إرسال إشعارات للمستخدمين ومتابعة إشعارات النظام">
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        {[
          { key: "send", label: "إرسال إشعار" },
          { key: "internal", label: `إشعارات الأدمن${unreadCount > 0 ? ` (${unreadCount})` : ""}` },
        ].map((t) => (
          <button
            key={t.key}
            className="neu-btn"
            onClick={() => setTab(t.key)}
            style={{
              padding: "8px 16px",
              fontSize: 12,
              fontWeight: 700,
              ...(tab === t.key ? { background: "var(--accent)", color: "#fff" } : {}),
            }}
          >
            {t.label}
          </button>
        ))}
        {tab === "internal" && (
          <button className="neu-btn" onClick={loadInternal} style={{ padding: "8px 14px", fontSize: 12, marginRight: "auto" }}>
            تحديث ↻
          </button>
        )}
      </div>

      {tab === "send" && (
        <div className="neu card" style={{ maxWidth: 640 }}>
          <form onSubmit={handleSend} className="card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
                نوع الإشعار
              </label>
              <select className="neu-input" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="broadcast">للجميع (Broadcast)</option>
                <option value="wilaya">حسب الولاية</option>
                <option value="user">مستخدم محدد</option>
              </select>
            </div>

            {type === "wilaya" && (
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
                  اختر الولايات {selectedWilayas.length > 0 && `(${selectedWilayas.length})`}
                </label>
                <div
                  className="neu-in"
                  style={{
                    display: "flex", flexWrap: "wrap", gap: 8, padding: 14,
                    borderRadius: "var(--radius-md)", maxHeight: 220, overflowY: "auto",
                  }}
                >
                  {WILAYAS.map((w) => {
                    const active = selectedWilayas.includes(w);
                    return (
                      <button
                        type="button"
                        key={w}
                        onClick={() => toggleWilaya(w)}
                        className="neu-btn"
                        style={{
                          padding: "6px 13px",
                          fontSize: 11.5,
                          fontWeight: 700,
                          borderRadius: 20,
                          ...(active ? { background: "var(--accent)", color: "#fff" } : {}),
                        }}
                      >
                        {w}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {type === "user" && (
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
                  معرّف المستخدم (User ID)
                </label>
                <input
                  className="neu-input"
                  type="text"
                  placeholder="الصق User ID من صفحة المستخدمين"
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                />
              </div>
            )}

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
                العنوان
              </label>
              <input
                className="neu-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="عنوان الإشعار"
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
                النص
              </label>
              <textarea
                className="neu-input"
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="نص الإشعار الكامل"
                style={{ resize: "vertical", width: "100%" }}
              />
            </div>

            <button
              type="submit"
              className="neu-btn neu-btn-accent"
              disabled={sending}
              style={{ alignSelf: "flex-start", padding: "12px 26px", fontSize: 13 }}
            >
              {sending ? "..." : "إرسال الإشعار"}
            </button>
          </form>
        </div>
      )}

      {tab === "internal" && (
        <div className="neu card">
          <div className="card-body" style={{ padding: 0 }}>
            {notifs === null && <EmptyState text="جارٍ التحميل..." />}
            {loadError && <EmptyState text={loadError} isError />}
            {notifs !== null && notifs.length === 0 && !loadError && <EmptyState text="لا توجد إشعارات" />}
            {notifs && notifs.length > 0 && (
              <div>
                {notifs.map((n, i) => (
                  <div
                    key={n.id}
                    onClick={() => !n.is_read && markAsRead(n.id)}
                    style={{
                      padding: "16px 20px",
                      borderBottom: i < notifs.length - 1 ? "1px solid var(--border)" : "none",
                      cursor: n.is_read ? "default" : "pointer",
                      opacity: n.is_read ? 0.6 : 1,
                      borderInlineStart: n.is_read ? "none" : "3px solid var(--gold)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 14,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>{n.title}</div>
                      <div style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.6 }}>{n.body}</div>
                    </div>
                    <span style={{ fontSize: 11, color: "var(--text-secondary)", whiteSpace: "nowrap" }} className="num">
                      {formatDate(n.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
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
