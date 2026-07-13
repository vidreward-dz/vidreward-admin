import { useEffect, useRef, useState } from "react";
import AppLayout from "../components/AppLayout";
import { supabase, callFunction, AuthError } from "../lib/supabaseClient";
import { useAuth } from "../lib/useAuth";

export default function PromoBanners() {
  const { signOut } = useAuth();
  const fileInputRef = useRef(null);

  const [banners, setBanners] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState(null); // id ديال البانر اللي فيه عملية جارية (toggle/reorder/delete)
  const [toast, setToast] = useState(null);

  function showToast(type, text) {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  }

  async function load() {
    setLoadError("");
    try {
      const { banners } = await callFunction("admin-list-banners", { method: "GET" });
      setBanners(banners ?? []);
    } catch (err) {
      if (err instanceof AuthError) return signOut();
      setLoadError("تعذّر تحميل الصور: " + err.message);
      setBanners([]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleFileSelected(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // باش نقدر نعاود نختار نفس الملف مرة أخرى إذا حاب
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      return showToast("error", "لازم تختار صورة");
    }
    if (file.size > 5 * 1024 * 1024) {
      return showToast("error", "الصورة كبيرة برشا (أقصى 5MB)");
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `banner_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("promo-banners")
        .upload(path, file, { cacheControl: "3600", upsert: false });

      if (uploadError) throw new Error(uploadError.message);

      const nextOrder = banners && banners.length > 0
        ? Math.max(...banners.map((b) => b.display_order)) + 1
        : 0;

      await callFunction("admin-save-banner", {
        body: { storage_path: path, display_order: nextOrder },
      });

      showToast("success", "تم رفع الصورة بنجاح");
      load();
    } catch (err) {
      if (err instanceof AuthError) return signOut();
      showToast("error", err.message || "فشل الرفع");
    } finally {
      setUploading(false);
    }
  }

  async function toggleActive(banner) {
    setBusyId(banner.id);
    try {
      await callFunction("admin-update-banner", {
        body: { banner_id: banner.id, is_active: !banner.is_active },
      });
      setBanners((prev) =>
        prev.map((b) => (b.id === banner.id ? { ...b, is_active: !b.is_active } : b))
      );
    } catch (err) {
      if (err instanceof AuthError) return signOut();
      showToast("error", err.message || "فشل التحديث");
    } finally {
      setBusyId(null);
    }
  }

  async function move(banner, direction) {
    const idx = banners.findIndex((b) => b.id === banner.id);
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= banners.length) return;

    const target = banners[targetIdx];
    setBusyId(banner.id);
    try {
      await Promise.all([
        callFunction("admin-update-banner", {
          body: { banner_id: banner.id, display_order: target.display_order },
        }),
        callFunction("admin-update-banner", {
          body: { banner_id: target.id, display_order: banner.display_order },
        }),
      ]);
      const updated = [...banners];
      updated[idx] = { ...target, display_order: banner.display_order };
      updated[targetIdx] = { ...banner, display_order: target.display_order };
      setBanners(updated.sort((a, b) => a.display_order - b.display_order));
    } catch (err) {
      if (err instanceof AuthError) return signOut();
      showToast("error", err.message || "فشل تبديل الترتيب");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(banner) {
    if (!window.confirm("متأكد بغيتي تحذف هاد الصورة؟")) return;
    setBusyId(banner.id);
    try {
      await callFunction("admin-delete-banner", { body: { banner_id: banner.id } });
      setBanners((prev) => prev.filter((b) => b.id !== banner.id));
      showToast("success", "تم حذف الصورة");
    } catch (err) {
      if (err instanceof AuthError) return signOut();
      showToast("error", err.message || "فشل الحذف");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AppLayout title="البرومو 🖼️" subtitle="إدارة صور العرض الظاهرة فالصفحة الرئيسية للتطبيق">
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelected}
          style={{ display: "none" }}
        />
        <button
          className="neu-btn neu-btn-accent"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={{ padding: "11px 22px", fontSize: 13 }}
        >
          {uploading ? "جارٍ الرفع..." : "+ إضافة صورة"}
        </button>
      </div>

      {banners === null && !loadError && (
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

      {banners && banners.length === 0 && !loadError && (
        <div className="neu card">
          <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-secondary)", fontSize: 13 }}>
            لا توجد صور برومو حالياً
          </div>
        </div>
      )}

      {banners && banners.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 18 }}>
          {banners.map((b, i) => (
            <div key={b.id} className="neu card" style={{ overflow: "hidden", opacity: busyId === b.id ? 0.6 : 1 }}>
              <img
                src={b.public_url}
                alt="بانر"
                style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }}
              />
              <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    الترتيب: {b.display_order}
                  </span>
                  <button
                    className="neu-btn"
                    onClick={() => toggleActive(b)}
                    disabled={busyId === b.id}
                    style={{
                      padding: "6px 14px",
                      fontSize: 11,
                      fontWeight: 700,
                      ...(b.is_active ? { background: "var(--accent)", color: "#fff" } : {}),
                    }}
                  >
                    {b.is_active ? "مفعّلة ✓" : "معطّلة"}
                  </button>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="neu-btn"
                    onClick={() => move(b, "up")}
                    disabled={busyId === b.id || i === 0}
                    style={{ flex: 1, padding: "8px", fontSize: 12 }}
                  >
                    ↑ فوق
                  </button>
                  <button
                    className="neu-btn"
                    onClick={() => move(b, "down")}
                    disabled={busyId === b.id || i === banners.length - 1}
                    style={{ flex: 1, padding: "8px", fontSize: 12 }}
                  >
                    ↓ تحت
                  </button>
                  <button
                    className="neu-btn"
                    onClick={() => handleDelete(b)}
                    disabled={busyId === b.id}
                    style={{ flex: 1, padding: "8px", fontSize: 12, color: "var(--red)" }}
                  >
                    حذف
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.text}</div>}
    </AppLayout>
  );
}
