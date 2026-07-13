import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import "./notifications.css";

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
  const [targetUserSearch, setTargetUserSearch] = useState("");
  const [targetUserId, setTargetUserId] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);

  // --- إشعارات الأدمن الداخلية ---
  const [internalNotifs, setInternalNotifs] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingInternal, setLoadingInternal] = useState(false);

  useEffect(() => {
    if (activeTab === "internal") {
      fetchInternalNotifications();
    }
  }, [activeTab]);

  async function fetchInternalNotifications() {
    setLoadingInternal(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-list-notifications`,
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
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
    setSendResult(null);

    if (!title.trim() || !message.trim()) {
      setSendResult({ ok: false, msg: "لازم تعبي العنوان والنص" });
      return;
    }
    if (type === "wilaya" && selectedWilayas.length === 0) {
      setSendResult({ ok: false, msg: "لازم تختار ولاية وحدة على الأقل" });
      return;
    }
    if (type === "user" && !targetUserId) {
      setSendResult({ ok: false, msg: "لازم تختار مستخدم" });
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
        setSendResult({ ok: true, msg: "تم إرسال الإشعار بنجاح" });
        setTitle("");
        setMessage("");
        setSelectedWilayas([]);
        setTargetUserId("");
        setTargetUserSearch("");
      } else {
        setSendResult({ ok: false, msg: data.error || "فشل الإرسال" });
      }
    } catch (err) {
      setSendResult({ ok: false, msg: "خطأ فالشبكة" });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="page-container">
      <h1 className="page-title">الإشعارات</h1>

      <div className="neu-tabs" style={{ marginBottom: 24 }}>
        <button
          className={`neu-tab ${activeTab === "send" ? "active" : ""}`}
          onClick={() => setActiveTab("send")}
        >
          إرسال إشعار
        </button>
        <button
          className={`neu-tab ${activeTab === "internal" ? "active" : ""}`}
          onClick={() => setActiveTab("internal")}
        >
          إشعارات الأدمن {unreadCount > 0 && <span className="badge-dot">{unreadCount}</span>}
        </button>
      </div>

      {activeTab === "send" && (
        <div className="neu-card" style={{ padding: 24, maxWidth: 600 }}>
          <form onSubmit={handleSend}>
            <div className="form-group">
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
              <div className="form-group">
                <label>اختر الولايات ({selectedWilayas.length} مختارة)</label>
                <div className="wilaya-multiselect">
                  {WILAYAS.map((w) => (
                    <button
                      type="button"
                      key={w}
                      className={`wilaya-chip ${selectedWilayas.includes(w) ? "selected" : ""}`}
                      onClick={() => toggleWilaya(w)}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {type === "user" && (
              <div className="form-group">
                <label>معرّف المستخدم (User ID)</label>
                <input
                  className="neu-input"
                  type="text"
                  placeholder="الصق User ID من صفحة المستخدمين"
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                />
                <small style={{ color: "#888" }}>
                  نصيحة: زيد بحث بالإيميل/الاسم فصفحة المستخدمين وانسخ الـ ID من هناك
                </small>
              </div>
            )}

            <div className="form-group">
              <label>العنوان</label>
              <input
                className="neu-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="عنوان الإشعار"
              />
            </div>

            <div className="form-group">
              <label>النص</label>
              <textarea
                className="neu-input"
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="نص الإشعار الكامل"
              />
            </div>

            {sendResult && (
              <div className={`alert ${sendResult.ok ? "alert-success" : "alert-error"}`}>
                {sendResult.msg}
              </div>
            )}

            <button type="submit" className="neu-button primary" disabled={sending}>
              {sending ? "جاري الإرسال..." : "إرسال الإشعار"}
            </button>
          </form>
        </div>
      )}

      {activeTab === "internal" && (
        <div className="neu-card" style={{ padding: 24 }}>
          {loadingInternal ? (
            <p>جاري التحميل...</p>
          ) : internalNotifs.length === 0 ? (
            <p>لا توجد إشعارات</p>
          ) : (
            <ul className="notif-list">
              {internalNotifs.map((n) => (
                <li
                  key={n.id}
                  className={`notif-item ${n.is_read ? "read" : "unread"}`}
                  onClick={() => !n.is_read && markAsRead(n.id)}
                >
                  <div className="notif-item-header">
                    <strong>{n.title}</strong>
                    <span className="notif-date">
                      {new Date(n.created_at).toLocaleString("ar-DZ")}
                    </span>
                  </div>
                  <p>{n.body}</p>
                  {!n.is_read && <span className="badge-dot small">جديد</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
