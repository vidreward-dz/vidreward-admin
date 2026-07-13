import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import "../styles/notifications.css";

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

export default function Notifications() {
  const [activeTab, setActiveTab] = useState("send"); // "send" | "internal"

  // --- إرسال إشعار ---
  const [type, setType] = useState("broadcast");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [selectedWilayas, setSelectedWilayas] = useState([]);
  const [targetUserId, setTargetUserId] = useState("");
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success'|'error', msg }

  // --- إشعارات الأدمن الداخلية ---
  const [internalNotifs, setInternalNotifs] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingInternal, setLoadingInternal] = useState(false);

  useEffect(() => {
    if (activeTab === "internal") fetchInternalNotifications();
  }, [activeTab]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  async function fetchInternalNotifications() {
    setLoadingInternal(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-list-notifications`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );
      const data = await res.json();
      if (res.ok) {
        setInternalNotifs(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
      }
    } catch (err) {
      console.error("خطأ فجلب الإشعارات:", err);
    } finally {
      setLoadingInternal(false);
    }
  }

  async function markAsRead(notificationId) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-mark-notification-read`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ notification_id: notificationId }),
        }
      );
      if (res.ok) {
        setInternalNotifs((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("خطأ فتعليم الإشعار كمقروء:", err);
    }
  }

  function toggleWilaya(wilaya) {
    setSelectedWilayas((prev) =>
      prev.includes(wilaya) ? prev.filter((w) => w !== wilaya) : [...prev, wilaya]
    );
  }

  async function handleSend(e) {
    e.preventDefault();

    if (!title.trim() || !message.trim()) {
      setToast({ type: "error", msg: "لازم تعبي العنوان والنص" });
      return;
    }
    if (type === "wilaya" && selectedWilayas.length === 0) {
      setToast({ type: "error", msg: "لازم تختار ولاية وحدة على الأقل" });
      return;
    }
    if (type === "user" && !targetUserId) {
      setToast({ type: "error", msg: "لازم تدخل User ID" });
      return;
    }

    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const payload = { type, title, message };
      if (type === "wilaya") payload.target_wilayas = selectedWilayas;
      if (type === "user") payload.target_user_id = targetUserId;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-send-notification`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();

      if (res.ok) {
        setToast({ type: "success", msg: "تم إرسال الإشعار بنجاح" });
        setTitle("");
        setMessage("");
        setSelectedWilayas([]);
        setTargetUserId("");
      } else {
        setToast({ type: "error", msg: data.error || "فشل الإرسال" });
      }
    } catch (err) {
      setToast({ type: "error", msg: "خطأ فالشبكة" });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="notif-page">
      <div className="notif-page-head">
        <h1 className="display">الإشعارات</h1>

        <div className="notif-tabs neu-in">
          <button
            className={`notif-tab ${activeTab === "send" ? "active" : ""}`}
            onClick={() => setActiveTab("send")}
          >
            إرسال إشعار
          </button>
          <button
            className={`notif-tab ${activeTab === "internal" ? "active" : ""}`}
            onClick={() => setActiveTab("internal")}
          >
            إشعارات الأدمن
            {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
          </button>
        </div>
      </div>

      {activeTab === "send" && (
        <div className="card neu notif-send-card">
          <div className="card-header">
            <div className="card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              إرسال إشعار جديد
            </div>
          </div>

          <form className="card-body notif-form" onSubmit={handleSend}>
            <div className="notif-field">
              <label>نوع الإشعار</label>
              <select
                className="neu-input"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="broadcast">للجميع (Broadcast)</option>
                <option value="wilaya">حسب الولاية</option>
                <option value="user">مستخدم محدد</option>
              </select>
            </div>

            {type === "wilaya" && (
              <div className="notif-field">
                <label>
                  اختر الولايات{" "}
                  {selectedWilayas.length > 0 && (
                    <span className="notif-count-pill">{selectedWilayas.length}</span>
                  )}
                </label>
                <div className="wilaya-grid neu-in">
                  {WILAYAS.map((w) => (
                    <button
                      type="button"
                      key={w}
                      className={`wilaya-chip ${selectedWilayas.includes(w) ? "active" : ""}`}
                      onClick={() => toggleWilaya(w)}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {type === "user" && (
              <div className="notif-field">
                <label>معرّف المستخدم (User ID)</label>
                <input
                  className="neu-input"
                  type="text"
                  placeholder="الصق User ID من صفحة المستخدمين"
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                />
                <span className="notif-hint">
                  نصيحة: انسخ الـ ID من صفحة المستخدمين
                </span>
              </div>
            )}

            <div className="notif-field">
              <label>العنوان</label>
              <input
                className="neu-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="عنوان الإشعار"
              />
            </div>

            <div className="notif-field">
              <label>النص</label>
              <textarea
                className="neu-input"
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="نص الإشعار الكامل"
              />
            </div>

            <button type="submit" className="neu-btn-accent notif-send-btn" disabled={sending}>
              {sending ? <span className="spinner" /> : "إرسال الإشعار"}
            </button>
          </form>
        </div>
      )}

      {activeTab === "internal" && (
        <div className="card neu">
          <div className="card-header">
            <div className="card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              إشعارات النظام
            </div>
          </div>

          <div className="card-body">
            {loadingInternal ? (
              <div className="notif-loading">
                <span className="spinner-dark" />
              </div>
            ) : internalNotifs.length === 0 ? (
              <p className="notif-empty">لا توجد إشعارات</p>
            ) : (
              <ul className="notif-list">
                {internalNotifs.map((n) => (
                  <li
                    key={n.id}
                    className={`notif-item neu-sm ${n.is_read ? "read" : "unread"}`}
                    onClick={() => !n.is_read && markAsRead(n.id)}
                  >
                    <div className="notif-item-top">
                      <strong>{n.title}</strong>
                      <span className="notif-item-date">
                        {new Date(n.created_at).toLocaleString("ar-DZ")}
                      </span>
                    </div>
                    <p>{n.body}</p>
                    {!n.is_read && <span className="notif-new-dot" />}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast ${toast.type === "success" ? "toast-success" : "toast-error"}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
