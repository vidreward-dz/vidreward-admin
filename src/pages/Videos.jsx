import { useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";
import { callFunction, AuthError } from "../lib/supabaseClient";
import { useAuth } from "../lib/useAuth";

async function requestUploadUrl({ fileName, fileType }) {
  return callFunction("admin-get-upload-url", {
    body: { fileName, fileType },
  });
}

async function createVideoRecord(payload) {
  return callFunction("admin-create-video", { body: payload });
}

async function deleteVideoRecord(videoId) {
  return callFunction("admin-delete-video", { body: { videoId } });
}

async function uploadWithProgress(uploadUrl, buffer, onProgress) {
  return new Promise((resolve, reject) => {
    console.log("=== uploadWithProgress ===");
    console.log("uploadUrl:", uploadUrl);
    console.log("buffer size:", buffer?.byteLength);

    const xhr = new XMLHttpRequest();

    xhr.open("PUT", uploadUrl, true);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        console.log("Progress:", percent + "%");
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      console.log("UPLOAD FINISHED");
      console.log("Status:", xhr.status);
      console.log("Response:", xhr.responseText);
      console.log("Headers:", xhr.getAllResponseHeaders());

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`فشل رفع الملف إلى التخزين (HTTP ${xhr.status})`));
      }
    };

    xhr.onerror = (e) => {
      console.error("UPLOAD ERROR");
      console.error("status:", xhr.status);
      console.error("readyState:", xhr.readyState);
      console.error("response:", xhr.response);
      console.error("responseText:", xhr.responseText);
      console.error("event:", e);

      reject(new Error("تعذر الاتصال أثناء الرفع"));
    };

    xhr.onabort = () => {
      console.error("UPLOAD ABORTED");
    };

    xhr.ontimeout = () => {
      console.error("UPLOAD TIMEOUT");
    };

    console.log("Sending file...");
    xhr.send(buffer);
  });
}

function getVideoDuration(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const videoEl = document.createElement("video");
    videoEl.preload = "metadata";
    videoEl.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Math.round(videoEl.duration) || null);
    };
    videoEl.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    videoEl.src = url;
  });
}

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("ar-DZ", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function Videos() {
  const { signOut } = useAuth();
  const [videos, setVideos] = useState(null);
  const [campaigns, setCampaigns] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [toast, setToast] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  async function loadVideos() {
    setLoadError("");
    try {
      const { videos } = await callFunction("admin-list-videos", { method: "GET" });
      setVideos(videos ?? []);
    } catch (err) {
      if (err instanceof AuthError) {
        await signOut();
        return;
      }
      setLoadError("تعذّر تحميل قائمة الفيديوهات: " + err.message);
      setVideos([]);
    }
  }

  async function loadCampaigns() {
    try {
      const { campaigns } = await callFunction("admin-list-campaigns", { method: "GET" });
      setCampaigns(campaigns ?? []);
    } catch {
      setCampaigns([]);
    }
  }

  useEffect(() => {
    loadVideos();
    loadCampaigns();
  }, []);

  function showToast(type, text) {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleDelete(video) {
    if (!window.confirm(`حذف الفيديو "${video.title}"؟ هذا الإجراء لا يمكن التراجع عنه.`)) return;
    setDeletingId(video.id);
    try {
      await deleteVideoRecord(video.id);
      setVideos((prev) => prev.filter((v) => v.id !== video.id));
      showToast("success", "تم حذف الفيديو");
    } catch (err) {
      if (err instanceof AuthError) {
        await signOut();
        return;
      }
      showToast("error", err.message || "فشل حذف الفيديو");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <AppLayout title="إدارة الفيديوهات 🎥" subtitle="رفع، عرض، وحذف فيديوهات المنصة">
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 18 }}>
        <button className="neu-btn neu-btn-accent" onClick={() => setShowUpload(true)}>
          + رفع فيديو جديد
        </button>
      </div>

      <div className="neu card">
        <div className="card-header">
          <div className="card-title">📼 كل الفيديوهات {videos ? `(${videos.length})` : ""}</div>
          <button className="neu-btn" onClick={loadVideos} style={{ padding: "8px 14px", fontSize: 12 }}>
            تحديث ↻
          </button>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {videos === null && <EmptyState text="جارٍ التحميل..." />}
          {videos !== null && videos.length === 0 && !loadError && (
            <EmptyState text="لا يوجد أي فيديو بعد. ابدأي برفع أول فيديو." />
          )}
          {loadError && <EmptyState text={loadError} isError />}
          {videos && videos.length > 0 && (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)" }}>
                  {["العنوان", "المدة", "المكافأة", "المشاهدات", "الحالة", "تاريخ الإضافة", ""].map((h) => (
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
                {videos.map((v) => (
                  <VideoRow key={v.id} video={v} onDelete={handleDelete} deleting={deletingId === v.id} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showUpload && (
        <UploadModal
          campaigns={campaigns}
          onClose={() => setShowUpload(false)}
          onUploaded={(video) => {
            setVideos((prev) => [video, ...(prev ?? [])]);
            setShowUpload(false);
            showToast("success", "تم رفع الفيديو بنجاح");
          }}
          onError={(msg) => showToast("error", msg)}
          onAuthError={signOut}
        />
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

function VideoRow({ video, onDelete, deleting }) {
  return (
    <tr style={{ borderBottom: "1px solid var(--border)" }}>
      <td style={{ padding: "14px 20px", fontSize: 13, fontWeight: 700, maxWidth: 260 }}>
        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{video.title}</div>
        {video.video_url && (
          <a href={video.video_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "var(--accent)" }}>
            فتح الرابط ↗
          </a>
        )}
      </td>
      <td style={{ padding: "14px 20px", fontSize: 12, color: "var(--text-secondary)" }} className="num">
        {video.duration_secs ? `${video.duration_secs}ث` : "—"}
      </td>
      <td style={{ padding: "14px 20px", fontSize: 12 }} className="num">
        {video.reward_amount ?? "—"} دج
      </td>
      <td style={{ padding: "14px 20px", fontSize: 12, color: "var(--text-secondary)" }} className="num">
        {video.total_views ?? 0}
      </td>
      <td style={{ padding: "14px 20px" }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: "4px 10px",
            borderRadius: 20,
            background: video.is_active ? "var(--green-soft)" : "var(--red-soft)",
            color: video.is_active ? "var(--green)" : "var(--red)",
          }}
        >
          {video.is_active ? "نشط" : "معطّل"}
        </span>
      </td>
      <td style={{ padding: "14px 20px", fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap" }} className="num">
        {formatDate(video.created_at)}
      </td>
      <td style={{ padding: "14px 20px", textAlign: "left" }}>
        <button
          className="neu-btn"
          disabled={deleting}
          onClick={() => onDelete(video)}
          style={{ padding: "8px 14px", fontSize: 12, color: "var(--red)", display: "inline-flex", gap: 8, alignItems: "center" }}
        >
          {deleting && <span className="spinner spinner-dark" />}
          {deleting ? "جارٍ الحذف..." : "حذف"}
        </button>
      </td>
    </tr>
  );
}

function UploadModal({ campaigns, onClose, onUploaded, onError, onAuthError }) {
  const [campaignId, setCampaignId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [fileBuffer, setFileBuffer] = useState(null);
  const [fileReadError, setFileReadError] = useState("");
  const [durationSecs, setDurationSecs] = useState("");
  const [rewardAmount, setRewardAmount] = useState("");
  const [minWatchPct, setMinWatchPct] = useState(80);
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [whatsappUrl, setWhatsappUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("idle");

  const busy = stage !== "idle";
  const noCampaigns = campaigns !== null && campaigns.length === 0;

  async function handleFileChange(e) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setFileBuffer(null);
    setFileReadError("");
    if (f) {
      setStage("detecting");
      const [detected, buffer] = await Promise.all([
        getVideoDuration(f),
        f.arrayBuffer().catch(() => null),
      ]);
      if (detected) setDurationSecs(String(detected));
      if (buffer) setFileBuffer(buffer);
      else setFileReadError("تعذّرت قراءة الملف. جربي تختاريه من جديد وارفعي مباشرة بدون تأخير.");
      setStage("idle");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) return onError("رجاءً اختاري ملف الفيديو أولاً");
    if (!fileBuffer) return onError(fileReadError || "الملف لسه قيد التحضير أو تعذّرت قراءته، جربي تختاريه من جديد");
    if (!campaignId) return onError("رجاءً اختاري الحملة (Campaign) التي يتبعها الفيديو");
    if (!durationSecs || Number(durationSecs) <= 0) return onError("مدة الفيديو (بالثواني) مطلوبة ويجب أن تكون أكبر من صفر");
    if (!rewardAmount || Number(rewardAmount) <= 0) return onError("قيمة المكافأة مطلوبة ويجب أن تكون أكبر من صفر");

    try {
      setStage("requesting");
      console.log("=== START UPLOAD ===");
      console.log("file:", file);
      console.log("name:", file.name);
      console.log("type:", file.type);
      console.log("size:", file.size);
      console.log("buffer:", fileBuffer?.byteLength);
      const { uploadUrl, publicUrl } = await requestUploadUrl({
        fileName: file.name,
        fileType: file.type || "video/mp4",
      });
      alert("uploadUrl");
      
      console.log("uploadUrl:", uploadUrl);
      console.log("publicUrl:", publicUrl); 
      
      setStage("uploading");
      setProgress(0);
      await uploadWithProgress(uploadUrl, fileBuffer, setProgress);

      setStage("saving");
      const { video } = await createVideoRecord({
        campaignId,
        title: title.trim() || file.name,
        description: description.trim() || undefined,
        videoUrl: publicUrl,
        thumbnailUrl: thumbnailUrl.trim() || undefined,
        durationSecs: Number(durationSecs),
        rewardAmount: Number(rewardAmount),
        minWatchPct: Number(minWatchPct) || 80,
        facebookUrl: facebookUrl.trim() || undefined,
        tiktokUrl: tiktokUrl.trim() || undefined,
        whatsappUrl: whatsappUrl.trim() || undefined,
        websiteUrl: websiteUrl.trim() || undefined,
      });

      onUploaded(video);
    } catch (err) {
      if (err instanceof AuthError) {
        await onAuthError();
        return;
      }
      onError(err.message || "حدث خطأ أثناء الرفع");
      setStage("idle");
    }
  }

  const stageLabel = {
    idle: "رفع الفيديو",
    detecting: "جارٍ تحضير الملف...",
    requesting: "تجهيز الرفع...",
    uploading: `جارٍ الرفع... ${progress}%`,
    saving: "جارٍ الحفظ...",
  }[stage];

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(20,20,35,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20, overflowY: "auto",
      }}
      onClick={(e) => e.target === e.currentTarget && !busy && onClose()}
    >
      <form onSubmit={handleSubmit} className="neu" style={{ width: 480, maxWidth: "100%", borderRadius: 24, padding: 28, margin: "20px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 className="display" style={{ fontSize: 18 }}>رفع فيديو جديد</h2>
          <button type="button" onClick={onClose} disabled={busy} className="neu-btn" style={{ padding: "6px 12px", fontSize: 12 }}>
            ✕
          </button>
        </div>

        <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, display: "block" }}>الحملة (Campaign) *</label>
        {noCampaigns ? (
          <>
            <div style={{ fontSize: 12, color: "var(--gold)", background: "var(--gold-soft)", padding: "10px 14px", borderRadius: 12, marginBottom: 10 }}>
              تعذّر جلب قائمة الحملات تلقائياً (على الأغلب بسبب صلاحيات RLS). إذا متأكدة إن الحملة موجودة، الصقي الـ Campaign ID يدوياً:
            </div>
            <input
              className="neu-input"
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
              placeholder="مثال: b20a9074-3b88-4976-9ce3-ab41aa706..."
              disabled={busy}
              style={{ marginBottom: 14 }}
            />
          </>
        ) : (
          <select
            className="neu-input"
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
            disabled={busy}
            required
            style={{ marginBottom: 14 }}
          >
            <option value="">اختاري حملة...</option>
            {(campaigns ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.title} ({c.status})</option>
            ))}
          </select>
        )}

        <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, display: "block" }}>العنوان *</label>
        <input
          className="neu-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="عنوان الفيديو"
          disabled={busy}
          required
          style={{ marginBottom: 14 }}
        />

        <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, display: "block" }}>الوصف (اختياري)</label>
        <textarea
          className="neu-input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="وصف مختصر..."
          disabled={busy}
          rows={2}
          style={{ marginBottom: 14, resize: "vertical" }}
        />

        <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, display: "block" }}>ملف الفيديو *</label>
        <input
          type="file"
          accept="video/*"
          disabled={busy}
          onChange={handleFileChange}
          className="neu-input"
          required
          style={{ marginBottom: 14, padding: 10 }}
        />

        <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, display: "block" }}>المدة (ثانية) *</label>
            <input
              className="neu-input"
              type="number"
              min="1"
              value={durationSecs}
              onChange={(e) => setDurationSecs(e.target.value)}
              disabled={busy}
              required
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, display: "block" }}>المكافأة (دج) *</label>
            <input
              className="neu-input"
              type="number"
              min="0.01"
              step="0.01"
              value={rewardAmount}
              onChange={(e) => setRewardAmount(e.target.value)}
              disabled={busy}
              required
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, display: "block" }}>حد المشاهدة %</label>
            <input
              className="neu-input"
              type="number"
              min="50"
              max="100"
              value={minWatchPct}
              onChange={(e) => setMinWatchPct(e.target.value)}
              disabled={busy}
            />
          </div>
        </div>

        <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, display: "block" }}>
          رابط الصورة المصغرة (اختياري — لصق رابط فقط)
        </label>
        <input
          className="neu-input"
          value={thumbnailUrl}
          onChange={(e) => setThumbnailUrl(e.target.value)}
          placeholder="https://..."
          disabled={busy}
          style={{ marginBottom: 14 }}
        />

        <details style={{ marginBottom: 16 }}>
          <summary style={{ fontSize: 12, fontWeight: 700, cursor: "pointer", color: "var(--text-secondary)" }}>
            روابط إضافية (اختياري: فيسبوك / تيكتوك / واتساب / موقع)
          </summary>
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            <input className="neu-input" placeholder="رابط فيسبوك" value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} disabled={busy} />
            <input className="neu-input" placeholder="رابط تيكتوك" value={tiktokUrl} onChange={(e) => setTiktokUrl(e.target.value)} disabled={busy} />
            <input className="neu-input" placeholder="رابط واتساب" value={whatsappUrl} onChange={(e) => setWhatsappUrl(e.target.value)} disabled={busy} />
            <input className="neu-input" placeholder="رابط الموقع" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} disabled={busy} />
          </div>
        </details>

        {stage === "uploading" && (
          <div className="neu-in" style={{ height: 10, borderRadius: 999, marginBottom: 18, overflow: "hidden" }}>
            <div
              style={{
                height: "100%", width: `${progress}%`,
                background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                transition: "width 0.2s ease",
              }}
            />
          </div>
        )}

        <button
          type="submit"
          className="neu-btn neu-btn-accent"
          disabled={busy || !file || !fileBuffer || !campaignId}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}
        >
          {busy && <span className="spinner" />}
          {stageLabel}
        </button>
      </form>
    </div>
  );
}
