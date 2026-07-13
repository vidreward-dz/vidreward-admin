import { useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";
import { callFunction, AuthError } from "../lib/supabaseClient";
import { useAuth } from "../lib/useAuth";

// تعريف الأقسام والحقول المعروضة (بترتيب العرض) — كل حقل مرتبط بمفتاح حقيقي فـ app_settings
const SECTIONS = [
  {
    title: "الإحالة 🤝",
    fields: [
      { key: "referral_bonus_amount", label: "مكافأة الإحالة الثابتة (دج)", type: "number" },
      { key: "referral_reward_amount", label: "مكافأة المُحيل عند كل تسجيل (دج)", type: "number" },
    ],
  },
  {
    title: "حدود السحب 💳",
    fields: [
      { key: "min_withdrawal_amount", label: "الحد الأدنى لمبلغ السحب (دج)", type: "number" },
      { key: "max_withdrawals_per_day", label: "أقصى عدد لطلبات السحب فاليوم", type: "number" },
    ],
  },
  {
    title: "الأرباح والعمولة 💰",
    fields: [
      { key: "daily_earning_limit", label: "الحد الأقصى للأرباح اليومية (دج)", type: "number" },
      { key: "platform_fee_percentage", label: "نسبة أرباح المنصة (%)", type: "number" },
    ],
  },
  {
    title: "وضع التطبيق ⚙️",
    fields: [
      { key: "maintenance_mode", label: "تفعيل وضع الصيانة", type: "boolean" },
      { key: "registration_enabled", label: "تفعيل التسجيل الجديد", type: "boolean" },
    ],
  },
  {
    title: "الدعم الفني 📞",
    fields: [
      { key: "support_email", label: "إيميل الدعم الفني", type: "string" },
      { key: "support_phone", label: "رقم هاتف الدعم الفني", type: "string" },
    ],
  },
];

export default function Settings() {
  const { signOut } = useAuth();
  const [original, setOriginal] = useState(null); // { key: value }
  const [values, setValues] = useState({});
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  function showToast(type, text) {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  }

  async function load() {
    setLoadError("");
    try {
      const { settings } = await callFunction("admin-list-settings", { method: "GET" });
      const map = {};
      (settings ?? []).forEach((s) => (map[s.key] = s.value));
      setOriginal(map);
      setValues(map);
    } catch (err) {
      if (err instanceof AuthError) return signOut();
      setLoadError("تعذّر تحميل الإعدادات: " + err.message);
      setOriginal({});
      setValues({});
    }
  }

  useEffect(() => {
    load();
  }, []);

  function setField(key, val) {
    setValues((prev) => ({ ...prev, [key]: val }));
  }

  const dirtyKeys = original
    ? Object.keys(values).filter((k) => JSON.stringify(values[k]) !== JSON.stringify(original[k]))
    : [];

  async function handleSave() {
    if (dirtyKeys.length === 0) return;
    setSaving(true);
    try {
      const updates = dirtyKeys.map((key) => ({ key, value: values[key] }));
      await callFunction("admin-update-settings", { body: { updates } });
      showToast("success", "تم حفظ الإعدادات بنجاح");
      setOriginal(values);
    } catch (err) {
      if (err instanceof AuthError) return signOut();
      showToast("error", err.message || "فشل الحفظ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout title="الإعدادات العامة ⚙️" subtitle="التحكم فإعدادات المنصة الأساسية">
      {original === null && !loadError && (
        <div className="neu card">
          <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-secondary)", fontSize: 13 }}>
            جارٍ التحميل...
          </div>
        </div>
      )}

      {loadError && (
        <div className="neu card">
          <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--red)", fontSize: 13 }}>
            {loadError}
          </div>
        </div>
      )}

      {original !== null && !loadError && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {SECTIONS.map((section) => (
            <div key={section.title} className="neu card">
              <div
                style={{
                  padding: "14px 20px",
                  borderBottom: "2px solid var(--border)",
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                {section.title}
              </div>
              <div
                className="card-body"
                style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 18 }}
              >
                {section.fields.map((f) => (
                  <div key={f.key}>
                    <label
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "var(--text-secondary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 6,
                      }}
                    >
                      {f.label}
                      {values[f.key] === undefined && (
                        <span style={{ fontSize: 10, color: "var(--red)" }}>غير موجود فقاعدة البيانات</span>
                      )}
                    </label>

                    {f.type === "boolean" ? (
                      <button
                        type="button"
                        onClick={() => setField(f.key, !values[f.key])}
                        className="neu-btn"
                        style={{
                          padding: "10px 18px",
                          fontSize: 12,
                          fontWeight: 700,
                          width: "100%",
                          ...(values[f.key]
                            ? { background: "var(--accent)", color: "#fff" }
                            : {}),
                        }}
                      >
                        {values[f.key] ? "مفعّل ✓" : "معطّل"}
                      </button>
                    ) : f.type === "number" ? (
                      <input
                        className="neu-input"
                        type="number"
                        value={values[f.key] ?? ""}
                        onChange={(e) => setField(f.key, e.target.value === "" ? "" : Number(e.target.value))}
                      />
                    ) : (
                      <input
                        className="neu-input"
                        type="text"
                        value={values[f.key] ?? ""}
                        onChange={(e) => setField(f.key, e.target.value)}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div
            style={{
              position: "sticky",
              bottom: 16,
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              paddingTop: 4,
            }}
          >
            {dirtyKeys.length > 0 && (
              <button className="neu-btn" onClick={() => setValues(original)} style={{ padding: "12px 20px", fontSize: 12 }}>
                إلغاء التعديلات
              </button>
            )}
            <button
              className="neu-btn neu-btn-accent"
              onClick={handleSave}
              disabled={saving || dirtyKeys.length === 0}
              style={{ padding: "12px 26px", fontSize: 13 }}
            >
              {saving ? "..." : dirtyKeys.length > 0 ? `حفظ التغييرات (${dirtyKeys.length})` : "لا توجد تغييرات"}
            </button>
          </div>
        </div>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.text}</div>}
    </AppLayout>
  );
}
