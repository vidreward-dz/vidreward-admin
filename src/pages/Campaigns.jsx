import { useEffect, useMemo, useState } from "react";
import AppLayout from "../components/AppLayout";
import { callFunction, AuthError } from "../lib/supabaseClient";
import { useAuth } from "../lib/useAuth";

const STATUS_LABELS = {
  pending: "قيد المراجعة",
  active: "نشطة",
  paused: "متوقفة مؤقتاً",
  completed: "مكتملة",
  rejected: "مرفوضة",
};

const STATUS_COLORS = {
  pending: { bg: "var(--gold-soft)", fg: "var(--gold)" },
  active: { bg: "var(--green-soft)", fg: "var(--green)" },
  paused: { bg: "var(--border)", fg: "var(--text-secondary)" },
  completed: { bg: "var(--accent-soft, #eef2ff)", fg: "var(--accent)" },
  rejected: { bg: "var(--red-soft)", fg: "var(--red)" },
};

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("ar-DZ", { dateStyle: "medium" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function toDateInputValue(iso) {
  if (!iso) return "";
  return String(iso).slice(0, 10);
}

const ALL_WILAYAS = [
  'أدرار', 'الشلف', 'الأغواط', 'أم البواقي', 'باتنة', 'بجاية', 'بسكرة',
  'بشار', 'البليدة', 'البويرة', 'تمنراست', 'تبسة', 'تلمسان', 'تيارت',
  'تيزي وزو', 'الجزائر العاصمة', 'الجلفة', 'جيجل', 'سطيف', 'سعيدة',
  'سكيكدة', 'سيدي بلعباس', 'عنابة', 'قالمة', 'قسنطينة', 'المدية',
  'مستغانم', 'المسيلة', 'معسكر', 'ورقلة', 'وهران', 'البيض', 'إليزي',
  'برج بوعريريج', 'بومرداس', 'الطارف', 'تندوف', 'تيسمسيلت', 'الوادي',
  'خنشلة', 'سوق أهراس', 'تيبازة', 'ميلة', 'عين الدفلى', 'النعامة',
  'عين تموشنت', 'غرداية', 'غليزان', 'تيميمون', 'برج باجي مختار',
  'أولاد جلال', 'بني عباس', 'عين صالح', 'عين قزام', 'تقرت', 'جانت',
  'المغير', 'المنيعة', 'آفلو', 'بريكة', 'القنطرة', 'بئر العاتر',
  'العريشة', 'قصر الشلالة', 'عين وسارة', 'مسعد', 'قصر البخاري',
  'بوسعادة', 'الأبيض سيدي الشيخ',
];

const emptyForm = {
  advertiserId: "",
  title: "",
  description: "",
  totalBudget: "",
  costPerView: "",
  targetViews: "",
  status: "pending",
  startsAt: "",
  targetWilayas: [], // فاضية = كل الولايات (بلا استهداف)
  adminNote: "",
};

export default function Campaigns() {
  const { signOut } = useAuth();
  const [campaigns, setCampaigns] = useState(null);
  const [advertisers, setAdvertisers] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modal, setModal] = useState(null); // { mode: "create" | "edit", form, campaignId? }
  const [busy, setBusy] = useState(false);

  async function loadCampaigns() {
    setLoadError("");
    try {
      const { campaigns } = await callFunction("admin-list-campaigns", { method: "GET" });
      setCampaigns(campaigns ?? []);
    } catch (err) {
      if (err instanceof AuthError) return signOut();
      setLoadError("تعذّر تحميل الحملات: " + err.message);
      setCampaigns([]);
    }
  }

  async function loadAdvertisers() {
    try {
      const { advertisers } = await callFunction("admin-list-advertisers", { method: "GET" });
      setAdvertisers(advertisers ?? []);
    } catch {
      setAdvertisers([]);
    }
  }

  useEffect(() => {
    loadCampaigns();
    loadAdvertisers();
  }, []);

  function showToast(type, text) {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  }

  function openCreate() {
    setModal({ mode: "create", form: { ...emptyForm } });
  }

  function openEdit(c) {
    setModal({
      mode: "edit",
      campaignId: c.id,
      form: {
        advertiserId: c.advertiser_id ?? "",
        title: c.title ?? "",
        description: c.description ?? "",
        totalBudget: c.total_budget ?? "",
        costPerView: c.cost_per_view ?? "",
        targetViews: c.target_views ?? "",
        status: c.status ?? "pending",
        startsAt: toDateInputValue(c.starts_at),
        targetWilayas: Array.isArray(c.target_wilayas) ? c.target_wilayas : [],
        adminNote: c.admin_note ?? "",
      },
    });
  }

  function updateForm(patch) {
    setModal((m) => ({ ...m, form: { ...m.form, ...patch } }));
  }

  async function handleSubmit() {
    const f = modal.form;
    if (!f.advertiserId) return showToast("error", "اختر المعلن");
    if (!f.title.trim()) return showToast("error", "أدخل عنوان الحملة");
    if (!f.totalBudget || Number(f.totalBudget) <= 0) return showToast("error", "أدخل ميزانية صحيحة");
    if (!f.costPerView || Number(f.costPerView) <= 0) return showToast("error", "أدخل تكلفة مشاهدة صحيحة");
    if (!f.targetViews || Number(f.targetViews) <= 0) return showToast("error", "أدخل عدد مشاهدات مستهدف صحيح");

    setBusy(true);
    try {
      const payload = {
        advertiserId: f.advertiserId,
        title: f.title,
        description: f.description,
        totalBudget: Number(f.totalBudget),
        costPerView: Number(f.costPerView),
        targetViews: Number(f.targetViews),
        status: f.status,
        startsAt: f.startsAt || null,
        targetWilayas: f.targetWilayas,
        adminNote: f.adminNote,
      };

      if (modal.mode === "create") {
        await callFunction("admin-create-campaign", { body: payload });
        showToast("success", "تم إنشاء الحملة");
      } else {
        await callFunction("admin-update-campaign", { body: { campaignId: modal.campaignId, ...payload } });
        showToast("success", "تم تحديث الحملة");
      }
      setModal(null);
      loadCampaigns();
    } catch (err) {
      if (err instanceof AuthError) return signOut();
      showToast("error", err.message || "فشلت العملية");
    } finally {
      setBusy(false);
    }
  }

  const filtered = useMemo(() => {
    let list = campaigns ?? [];
    if (statusFilter !== "all") list = list.filter((c) => c.status === statusFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          (c.title ?? "").toLowerCase().includes(q) ||
          (c.advertiserName ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [campaigns, statusFilter, search]);

  const advertisersReady = advertisers !== null;
  const noAdvertisers = advertisersReady && advertisers.length === 0;

  return (
    <AppLayout title="الحملات 📢" subtitle="إنشاء وتعديل حملات المعلنين">
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        {[{ key: "all", label: `الكل (${(campaigns ?? []).length})` }, ...Object.entries(STATUS_LABELS).map(([key, label]) => ({ key, label }))].map((f) => (
          <button
            key={f.key}
            className="neu-btn"
            onClick={() => setStatusFilter(f.key)}
            style={{
              padding: "8px 16px", fontSize: 12, fontWeight: 700,
              ...(statusFilter === f.key ? { background: "var(--accent)", color: "#fff" } : {}),
            }}
          >
            {f.label}
          </button>
        ))}
        <button className="neu-btn neu-btn-accent" onClick={openCreate} style={{ padding: "8px 18px", fontSize: 12, marginRight: "auto" }}>
          + حملة جديدة
        </button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <input
          className="neu-input"
          placeholder="بحث بعنوان الحملة أو اسم المعلن..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", maxWidth: 420 }}
        />
      </div>

      <div className="neu card">
        <div className="card-body" style={{ padding: 0 }}>
          {campaigns === null && <EmptyState text="جارٍ التحميل..." />}
          {loadError && <EmptyState text={loadError} isError />}
          {campaigns !== null && filtered.length === 0 && !loadError && <EmptyState text="لا توجد حملات بهذا التصنيف" />}
          {filtered.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 950 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--border)" }}>
                    {["الحملة", "المعلن", "الميزانية", "المشاهدات", "التكلفة/مشاهدة", "المدة", "الحالة", ""].map((h) => (
                      <th key={h} style={{ textAlign: "right", fontSize: 11, color: "var(--text-secondary)", padding: "12px 20px", fontWeight: 700, whiteSpace: "nowrap" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => {
                    const pctSpent = c.total_budget > 0 ? Math.min(100, Math.round((Number(c.spent_budget) / Number(c.total_budget)) * 100)) : 0;
                    const pctViews = c.target_views > 0 ? Math.min(100, Math.round((Number(c.completed_views) / Number(c.target_views)) * 100)) : 0;
                    const colors = STATUS_COLORS[c.status] ?? STATUS_COLORS.pending;
                    return (
                      <tr key={c.id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "14px 20px", fontSize: 13, fontWeight: 700, maxWidth: 200 }}>{c.title}</td>
                        <td style={{ padding: "14px 20px", fontSize: 12, color: "var(--text-secondary)" }}>{c.advertiserName}</td>
                        <td style={{ padding: "14px 20px", fontSize: 12 }} className="num">
                          <div>{Number(c.spent_budget).toLocaleString("ar-DZ")} / {Number(c.total_budget).toLocaleString("ar-DZ")} دج</div>
                          <div style={{ height: 4, background: "var(--border)", borderRadius: 4, marginTop: 4, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pctSpent}%`, background: "var(--accent)" }} />
                          </div>
                        </td>
                        <td style={{ padding: "14px 20px", fontSize: 12 }} className="num">
                          <div>{Number(c.completed_views).toLocaleString("ar-DZ")} / {Number(c.target_views).toLocaleString("ar-DZ")}</div>
                          <div style={{ height: 4, background: "var(--border)", borderRadius: 4, marginTop: 4, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pctViews}%`, background: "var(--green)" }} />
                          </div>
                        </td>
                        <td style={{ padding: "14px 20px", fontSize: 12 }} className="num">{Number(c.cost_per_view).toLocaleString("ar-DZ")} دج</td>
                        <td style={{ padding: "14px 20px", fontSize: 11, color: "var(--text-secondary)", whiteSpace: "nowrap" }} className="num">
                          {formatDate(c.starts_at)} — {formatDate(c.ends_at)}
                          <div style={{ marginTop: 3 }}>
                            {Array.isArray(c.target_wilayas) && c.target_wilayas.length > 0 ? (
                              <span title={c.target_wilayas.join("، ")} style={{ fontSize: 10, color: "var(--accent)" }}>
                                📍 {c.target_wilayas.length} ولاية
                              </span>
                            ) : (
                              <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>🌍 كل الولايات</span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: "14px 20px" }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20, background: colors.bg, color: colors.fg }}>
                            {STATUS_LABELS[c.status] ?? c.status}
                          </span>
                        </td>
                        <td style={{ padding: "14px 20px", whiteSpace: "nowrap" }}>
                          <button className="neu-btn" onClick={() => openEdit(c)} style={{ padding: "7px 12px", fontSize: 11 }}>
                            تعديل
                          </button>
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

      {modal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(20,20,35,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }}
          onClick={(e) => e.target === e.currentTarget && !busy && setModal(null)}
        >
          <div className="neu" style={{ width: 520, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto", borderRadius: 24, padding: 26 }}>
            <h2 className="display" style={{ fontSize: 17, marginBottom: 18 }}>
              {modal.mode === "create" ? "حملة جديدة" : "تعديل الحملة"}
            </h2>

            {noAdvertisers && (
              <div style={{ fontSize: 12, color: "var(--gold)", background: "var(--gold-soft)", padding: "10px 14px", borderRadius: 12, marginBottom: 14 }}>
                لا يوجد أي معلن مسجل بعد — لازم يكون عندك معلن واحد على الأقل قبل إنشاء حملة.
              </div>
            )}

            <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, display: "block" }}>المعلن *</label>
            <select
              className="neu-input"
              value={modal.form.advertiserId}
              onChange={(e) => updateForm({ advertiserId: e.target.value })}
              disabled={busy}
              style={{ marginBottom: 14 }}
            >
              <option value="">اختر معلناً...</option>
              {(advertisers ?? []).map((a) => (
                <option key={a.id} value={a.id}>{a.company_name}</option>
              ))}
            </select>

            <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, display: "block" }}>عنوان الحملة *</label>
            <input
              className="neu-input"
              value={modal.form.title}
              onChange={(e) => updateForm({ title: e.target.value })}
              disabled={busy}
              style={{ marginBottom: 14 }}
            />

            <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, display: "block" }}>الوصف</label>
            <textarea
              className="neu-input"
              value={modal.form.description}
              onChange={(e) => updateForm({ description: e.target.value })}
              disabled={busy}
              rows={2}
              style={{ marginBottom: 14, resize: "vertical" }}
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, display: "block" }}>الميزانية الكلية (دج) *</label>
                <input
                  className="neu-input" type="number" min="0" step="0.01"
                  value={modal.form.totalBudget}
                  onChange={(e) => updateForm({ totalBudget: e.target.value })}
                  disabled={busy}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, display: "block" }}>تكلفة المشاهدة (دج) *</label>
                <input
                  className="neu-input" type="number" min="0" step="0.01"
                  value={modal.form.costPerView}
                  onChange={(e) => updateForm({ costPerView: e.target.value })}
                  disabled={busy}
                />
              </div>
            </div>

            <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, display: "block" }}>عدد المشاهدات المستهدف *</label>
            <input
              className="neu-input" type="number" min="0" step="1"
              value={modal.form.targetViews}
              onChange={(e) => updateForm({ targetViews: e.target.value })}
              disabled={busy}
              style={{ marginBottom: 14 }}
            />

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, display: "block" }}>تاريخ البداية</label>
              <input
                className="neu-input" type="date" value={modal.form.startsAt}
                onChange={(e) => updateForm({ startsAt: e.target.value })}
                disabled={busy}
                style={{ maxWidth: 220 }}
              />
              <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 6 }}>
                📌 تاريخ النهاية تلقائي — يُسجَّل بنفسه فور بلوغ عدد المشاهدات المستهدف.
              </div>
            </div>

            <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, display: "block" }}>
              الولاية المستهدفة
              <span style={{ fontWeight: 400, color: "var(--text-secondary)" }}>
                {" "}({modal.form.targetWilayas.length === 0 ? "كل الولايات" : `${modal.form.targetWilayas.length} محددة`})
              </span>
            </label>
            <div
              className="neu-input"
              style={{ marginBottom: 14, padding: 10, maxHeight: 180, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}
            >
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, padding: "6px 4px", fontWeight: 700, borderBottom: "1px solid var(--border)", marginBottom: 4 }}>
                <input
                  type="checkbox"
                  checked={modal.form.targetWilayas.length === 0}
                  onChange={() => updateForm({ targetWilayas: [] })}
                  disabled={busy}
                />
                كل الولايات (بلا استهداف)
              </label>
              {ALL_WILAYAS.map((w) => (
                <label key={w} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, padding: "4px 4px" }}>
                  <input
                    type="checkbox"
                    checked={modal.form.targetWilayas.includes(w)}
                    disabled={busy}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...modal.form.targetWilayas, w]
                        : modal.form.targetWilayas.filter((x) => x !== w);
                      updateForm({ targetWilayas: next });
                    }}
                  />
                  {w}
                </label>
              ))}
            </div>

            <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, display: "block" }}>الحالة</label>
            <select
              className="neu-input"
              value={modal.form.status}
              onChange={(e) => updateForm({ status: e.target.value })}
              disabled={busy}
              style={{ marginBottom: 14 }}
            >
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>

            <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, display: "block" }}>ملاحظة إدارية (اختياري)</label>
            <textarea
              className="neu-input"
              value={modal.form.adminNote}
              onChange={(e) => updateForm({ adminNote: e.target.value })}
              disabled={busy}
              rows={2}
              style={{ marginBottom: 20, resize: "vertical" }}
            />

            <div style={{ display: "flex", gap: 10 }}>
              <button className="neu-btn" onClick={() => setModal(null)} disabled={busy} style={{ flex: 1 }}>
                إلغاء
              </button>
              <button className="neu-btn neu-btn-accent" onClick={handleSubmit} disabled={busy} style={{ flex: 1 }}>
                {busy ? "جارٍ الحفظ..." : modal.mode === "create" ? "إنشاء" : "حفظ التعديلات"}
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
