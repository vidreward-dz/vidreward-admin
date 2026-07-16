import { useEffect, useState } from "react";
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

const STATUS_LABELS = {
  pending: { text: "قيد الانتظار", bg: "var(--gold-soft)", color: "var(--gold)" },
  under_review: { text: "قيد المراجعة", bg: "var(--gold-soft)", color: "var(--gold)" },
  approved: { text: "موافق عليه", bg: "var(--accent-soft, #eef2ff)", color: "var(--accent)" },
  rejected: { text: "مرفوض", bg: "var(--red-soft)", color: "var(--red)" },
  paid: { text: "مدفوع ✓", bg: "var(--green-soft)", color: "var(--green)" },
  cancelled: { text: "ملغى", bg: "var(--red-soft)", color: "var(--red)" },
};

const METHOD_LABELS = { flexy: "فليكسي", baridimob: "BaridiMob", ccp: "CCP" };

export default function Withdrawals() {
  const { signOut } = useAuth();
  const [withdrawals, setWithdrawals] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [toast, setToast] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null); // withdrawal being rejected
  const [rejectReason, setRejectReason] = useState("");
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'approve'|'paid', withdrawal }
  const [filter, setFilter] = useState("pending"); // pending | approved | all
  const [showPdfModal, setShowPdfModal] = useState(false);

  async function load() {
    setLoadError("");
    try {
      const { withdrawals } = await callFunction("admin-list-withdrawals", { method: "GET" });
      setWithdrawals(withdrawals ?? []);
    } catch (err) {
      if (err instanceof AuthError) {
        await signOut();
        return;
      }
      setLoadError("تعذّر تحميل طلبات السحب: " + err.message);
      setWithdrawals([]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function showToast(type, text) {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleApprove(w) {
    setBusyId(w.id);
    try {
      await callFunction("admin-approve-withdrawal", { body: { withdrawalId: w.id } });
      showToast("success", "تمت الموافقة على الطلب");
      load();
    } catch (err) {
      if (err instanceof AuthError) return signOut();
      showToast("error", err.message || "فشلت الموافقة");
    } finally {
      setBusyId(null);
      setConfirmAction(null);
    }
  }

  async function handleMarkPaid(w) {
    setBusyId(w.id);
    try {
      await callFunction("admin-mark-paid-withdrawal", { body: { withdrawalId: w.id } });
      showToast("success", "تم تأكيد الدفع");
      load();
    } catch (err) {
      if (err instanceof AuthError) return signOut();
      showToast("error", err.message || "فشل تأكيد الدفع");
    } finally {
      setBusyId(null);
      setConfirmAction(null);
    }
  }

  async function handleRejectSubmit(e) {
    e.preventDefault();
    if (!rejectReason.trim()) return showToast("error", "رجاءً اكتبي سبب الرفض");
    setBusyId(rejectTarget.id);
    try {
      await callFunction("admin-reject-withdrawal", {
        body: { withdrawalId: rejectTarget.id, reason: rejectReason.trim() },
      });
      showToast("success", "تم رفض الطلب واسترجاع المبلغ للمستخدم");
      setRejectTarget(null);
      setRejectReason("");
      load();
    } catch (err) {
      if (err instanceof AuthError) return signOut();
      showToast("error", err.message || "فشل رفض الطلب");
    } finally {
      setBusyId(null);
    }
  }

  const filtered = (withdrawals ?? []).filter((w) => {
    if (filter === "all") return true;
    if (filter === "pending") return w.status === "pending" || w.status === "under_review";
    if (filter === "approved") return w.status === "approved";
    return true;
  });

  const pendingCount = (withdrawals ?? []).filter((w) => w.status === "pending" || w.status === "under_review").length;

  return (
    <AppLayout title="طلبات السحب 💳" subtitle="مراجعة والموافقة على طلبات سحب المستخدمين">
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        {[
          { key: "pending", label: `قيد الانتظار (${pendingCount})` },
          { key: "approved", label: "بانتظار الدفع" },
          { key: "all", label: "الكل" },
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
                : {}),
            }}
          >
            {f.label}
          </button>
        ))}
        <button className="neu-btn" onClick={load} style={{ padding: "8px 14px", fontSize: 12, marginRight: "auto" }}>
          تحديث ↻
        </button>
        <button
          className="neu-btn neu-btn-accent"
          onClick={() => setShowPdfModal(true)}
          style={{ padding: "8px 14px", fontSize: 12 }}
        >
          📄 عرض/تحميل PDF
        </button>
      </div>

      <div className="neu card">
        <div className="card-body" style={{ padding: 0 }}>
          {withdrawals === null && <EmptyState text="جارٍ التحميل..." />}
          {loadError && <EmptyState text={loadError} isError />}
          {withdrawals !== null && filtered.length === 0 && !loadError && (
            <EmptyState text="لا توجد طلبات بهذا التصنيف" />
          )}
          {filtered.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)" }}>
                  {["المستخدم", "المبلغ", "الطريقة", "رقم الهاتف", "الولاية", "الحالة", "التاريخ", ""].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "right",
                        fontSize: 11,
                        color: "var(--text-secondary)",
                        padding: "12px 20px",
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((w) => {
                  const st = STATUS_LABELS[w.status] ?? { text: w.status, bg: "#eee", color: "#666" };
                  const busy = busyId === w.id;
                  return (
                    <tr key={w.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "14px 20px", fontSize: 13, fontWeight: 700 }}>
                        {w.users?.name ?? "—"}
                      </td>
                      <td style={{ padding: "14px 20px", fontSize: 13, fontWeight: 800 }} className="num">
                        {w.amount} دج
                      </td>
                      <td style={{ padding: "14px 20px", fontSize: 12 }}>
                        {METHOD_LABELS[w.method] ?? w.method}
                      </td>
                      <td style={{ padding: "14px 20px", fontSize: 12, color: "var(--text-secondary)" }} className="num">
                        {w.phone_number}
                      </td>
                      <td style={{ padding: "14px 20px", fontSize: 12, color: "var(--text-secondary)" }}>
                        {w.users?.wilaya ?? "—"}
                      </td>
                      <td style={{ padding: "14px 20px" }}>
                        <span
                          style={{
                            fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20,
                            background: st.bg, color: st.color,
                          }}
                        >
                          {st.text}
                        </span>
                        {w.status === "rejected" && w.admin_note && (
                          <div style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 4 }}>{w.admin_note}</div>
                        )}
                      </td>
                      <td style={{ padding: "14px 20px", fontSize: 11, color: "var(--text-secondary)", whiteSpace: "nowrap" }} className="num">
                        {formatDate(w.created_at)}
                      </td>
                      <td style={{ padding: "14px 20px", whiteSpace: "nowrap" }}>
                        {(w.status === "pending" || w.status === "under_review") && (
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              className="neu-btn"
                              disabled={busy}
                              onClick={() => setConfirmAction({ type: "approve", withdrawal: w })}
                              style={{ padding: "7px 12px", fontSize: 11, color: "var(--green)" }}
                            >
                              {busy ? "..." : "موافقة"}
                            </button>
                            <button
                              className="neu-btn"
                              disabled={busy}
                              onClick={() => { setRejectTarget(w); setRejectReason(""); }}
                              style={{ padding: "7px 12px", fontSize: 11, color: "var(--red)" }}
                            >
                              رفض
                            </button>
                          </div>
                        )}
                        {w.status === "approved" && (
                          <button
                            className="neu-btn neu-btn-accent"
                            disabled={busy}
                            onClick={() => setConfirmAction({ type: "paid", withdrawal: w })}
                            style={{ padding: "7px 12px", fontSize: 11 }}
                          >
                            {busy ? "..." : "تأكيد الدفع ✓"}
                          </button>
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

      {rejectTarget && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(20,20,35,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20,
          }}
          onClick={(e) => e.target === e.currentTarget && setRejectTarget(null)}
        >
          <form onSubmit={handleRejectSubmit} className="neu" style={{ width: 420, maxWidth: "100%", borderRadius: 24, padding: 26 }}>
            <h2 className="display" style={{ fontSize: 17, marginBottom: 6 }}>رفض طلب السحب</h2>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 16 }}>
              سيتم استرجاع {rejectTarget.amount} دج تلقائياً لرصيد {rejectTarget.users?.name ?? "المستخدم"}.
            </p>
            <textarea
              className="neu-input"
              placeholder="سبب الرفض (سيظهر للمستخدم)..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              required
              style={{ marginBottom: 16, resize: "vertical", width: "100%" }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" className="neu-btn" onClick={() => setRejectTarget(null)} style={{ flex: 1 }}>
                إلغاء
              </button>
              <button type="submit" className="neu-btn" style={{ flex: 1, color: "var(--red)" }}>
                تأكيد الرفض
              </button>
            </div>
          </form>
        </div>
      )}

      {confirmAction && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(20,20,35,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20,
          }}
          onClick={(e) => e.target === e.currentTarget && setConfirmAction(null)}
        >
          <div className="neu" style={{ width: 400, maxWidth: "100%", borderRadius: 24, padding: 26, textAlign: "center" }}>
            <div style={{ fontSize: 34, marginBottom: 10 }}>
              {confirmAction.type === "approve" ? "✅" : "💸"}
            </div>
            <h2 className="display" style={{ fontSize: 17, marginBottom: 10 }}>
              {confirmAction.type === "approve" ? "الموافقة على طلب السحب" : "تأكيد الدفع الفعلي"}
            </h2>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 22 }}>
              {confirmAction.type === "approve" ? (
                <>الموافقة على طلب سحب بقيمة <b style={{ color: "var(--text-primary)" }}>{confirmAction.withdrawal.amount} دج</b> لـ <b style={{ color: "var(--text-primary)" }}>{confirmAction.withdrawal.users?.name ?? "مستخدم"}</b>؟</>
              ) : (
                <>تأكيد أنك حوّلتِ <b style={{ color: "var(--text-primary)" }}>{confirmAction.withdrawal.amount} دج</b> فعلياً لـ <b style={{ color: "var(--text-primary)" }}>{confirmAction.withdrawal.phone_number}</b>؟</>
              )}
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="neu-btn" onClick={() => setConfirmAction(null)} style={{ flex: 1 }}>
                إلغاء
              </button>
              <button
                className="neu-btn neu-btn-accent"
                onClick={() =>
                  confirmAction.type === "approve"
                    ? handleApprove(confirmAction.withdrawal)
                    : handleMarkPaid(confirmAction.withdrawal)
                }
                style={{ flex: 1 }}
              >
                تأكيد
              </button>
            </div>
          </div>
        </div>
      )}

      {showPdfModal && (
        <PendingWithdrawalsPdfModal
          withdrawals={(withdrawals ?? []).filter(
            (w) => w.status === "pending" || w.status === "under_review",
          )}
          onClose={() => setShowPdfModal(false)}
        />
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.text}</div>}
    </AppLayout>
  );
}

function PendingWithdrawalsPdfModal({ withdrawals, onClose }) {
  const now = new Date();
  const totalAmount = withdrawals.reduce((sum, w) => sum + Number(w.amount || 0), 0);

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(20,20,35,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 16,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="pdf-modal-overlay"
    >
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .pdf-printable, .pdf-printable * { visibility: visible; }
          .pdf-printable {
            position: absolute; inset: 0; width: 100%; padding: 24px;
            background: #fff !important; color: #000 !important;
          }
          .pdf-modal-overlay { position: static !important; background: none !important; padding: 0 !important; }
          .pdf-modal-no-print { display: none !important; }
        }
      `}</style>
      <div
        className="neu"
        style={{ width: "100%", maxWidth: 720, maxHeight: "88vh", overflowY: "auto", borderRadius: 20, padding: 22 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pdf-modal-no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>الطلبات الجديدة (قيد الانتظار) — {withdrawals.length}</h3>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="neu-btn neu-btn-accent" onClick={() => window.print()} style={{ padding: "8px 14px", fontSize: 12 }}>
              تحميل PDF
            </button>
            <button className="neu-btn" onClick={onClose} style={{ padding: "8px 12px" }}>✕</button>
          </div>
        </div>

        <div className="pdf-printable">
          <h2 style={{ fontSize: 18, marginBottom: 4, textAlign: "center" }}>VidReward DZ — طلبات السحب الجديدة</h2>
          <p style={{ fontSize: 11, textAlign: "center", color: "#666", marginBottom: 18 }}>
            تاريخ الاستخراج: {formatDate(now.toISOString())} — عدد الطلبات: {withdrawals.length} — المجموع: {totalAmount.toLocaleString("ar-DZ")} دج
          </p>

          {withdrawals.length === 0 ? (
            <p style={{ textAlign: "center", fontSize: 13, color: "#999", padding: "30px 0" }}>لا توجد طلبات قيد الانتظار حالياً.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
              <thead>
                <tr>
                  {["#", "المستخدم", "المبلغ", "الطريقة", "رقم الهاتف", "الولاية", "التاريخ"].map((h) => (
                    <th key={h} style={{ border: "1px solid #ccc", padding: "6px 8px", background: "#f2f2f2", textAlign: "right" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {withdrawals.map((w, i) => (
                  <tr key={w.id}>
                    <td style={{ border: "1px solid #ccc", padding: "6px 8px" }}>{i + 1}</td>
                    <td style={{ border: "1px solid #ccc", padding: "6px 8px" }}>{w.users?.name ?? "—"}</td>
                    <td style={{ border: "1px solid #ccc", padding: "6px 8px" }}>{w.amount} دج</td>
                    <td style={{ border: "1px solid #ccc", padding: "6px 8px" }}>{METHOD_LABELS[w.method] ?? w.method}</td>
                    <td style={{ border: "1px solid #ccc", padding: "6px 8px" }}>{w.phone_number}</td>
                    <td style={{ border: "1px solid #ccc", padding: "6px 8px" }}>{w.users?.wilaya ?? "—"}</td>
                    <td style={{ border: "1px solid #ccc", padding: "6px 8px" }}>{formatDate(w.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ text, isError }) {
  return (
    <div style={{ padding: "40px 20px", textAlign: "center", color: isError ? "var(--red)" : "var(--text-secondary)", fontSize: 13 }}>
      {text}
    </div>
  );
}
