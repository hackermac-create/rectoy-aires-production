/* Administration des vidéos : publicités, reportages du magazine, présentation */

const API_ORIGIN = window.location.port === "5500" ? "http://localhost:4000" : "";
const API = API_ORIGIN + "/api";
const KINDS = { publicite: "Publicité", reportage: "Reportage", presentation: "Présentation" };

const $ = id => document.getElementById(id);
let videos = [], articles = [], filter = "all", maxMb = 40;

const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");

function toast(message) {
  const t = $("toast");
  t.textContent = message; t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 3500);
}

async function api(path, options = {}) {
  const res = await fetch(API + path, { credentials: "include", ...options });
  let data = {};
  try { data = await res.json(); } catch {}
  if (res.status === 401) { $("app").hidden = true; $("notice").hidden = false; throw new Error("Session expirée."); }
  if (!res.ok) throw new Error(data.message || "Erreur du serveur.");
  return data;
}

const fmtSize = n => n >= 1048576 ? (n / 1048576).toFixed(1).replace(".", ",") + " Mo" : Math.round(n / 1024) + " Ko";

function renderList() {
  const items = filter === "all" ? videos : videos.filter(v => v.kind === filter);
  const box = $("list");
  if (!items.length) { box.innerHTML = '<p style="color:#8793a3;padding:10px 0">Aucune vidéo pour le moment.</p>'; return; }
  box.innerHTML = items.map(v => {
    const art = v.articleId ? articles.find(a => a.id === v.articleId) : null;
    const src = v.source === "embed" ? (v.provider === "vimeo" ? "Vimeo" : "YouTube") : "Fichier " + fmtSize(v.size || 0);
    const bg = v.poster ? `style="background-image:url('${esc(v.poster.startsWith("http") ? v.poster : API_ORIGIN + v.poster)}')"` : "";
    return `<div class="vid-row">
      <div class="vid-thumb" ${bg}>${v.poster ? "" : "🎬"}</div>
      <div class="vid-meta"><strong>${v.featured ? "⭐ " : ""}${esc(v.title)}</strong><br>
        <span class="badge kind-${esc(v.kind)}">${esc(KINDS[v.kind])}</span>
        <span class="badge ${esc(v.status)}">${v.status === "published" ? "Publié" : "Brouillon"}</span>
        <small>${esc(src)}${art ? " · Article : " + esc(art.title) : ""}</small></div>
      <div class="row-actions">
        <button type="button" data-act="edit" data-id="${esc(v.id)}">✏️ Modifier</button>
        <button type="button" data-act="toggle" data-id="${esc(v.id)}">${v.status === "published" ? "Masquer" : "Publier"}</button>
        <button type="button" data-act="feature" data-id="${esc(v.id)}">${v.featured ? "Retirer ⭐" : "⭐ Une"}</button>
        <button type="button" data-act="delete" data-id="${esc(v.id)}">🗑️</button>
      </div></div>`;
  }).join("");
}

async function load() {
  const data = await api("/admin/videos");
  videos = data.videos || [];
  maxMb = data.maxMb || 40;
  $("maxMb").textContent = maxMb;
  renderList();
}

async function loadArticles() {
  try {
    articles = (await api("/admin/magazine")).articles || [];
    $("articleId").innerHTML = '<option value="">— Aucun —</option>' +
      articles.map(a => `<option value="${esc(a.id)}">${esc(a.title)}</option>`).join("");
  } catch {}
}

function setSource(kind) {
  document.querySelectorAll('input[name="src"]').forEach(r => { r.checked = r.value === kind; });
  $("embedBox").hidden = kind !== "embed";
  $("fileBox").hidden = kind !== "upload";
}
function syncKind() { $("articleBox").hidden = $("kind").value !== "reportage"; }

function openForm(video, preset = {}) {
  $("formPanel").hidden = false;
  $("formTitle").textContent = video ? "Modifier la vidéo" : "Nouvelle vidéo";
  $("editId").value = video ? video.id : "";
  $("title").value = video ? video.title : "";
  $("kind").value = video ? video.kind : (preset.kind || "publicite");
  $("status").value = video ? video.status : "published";
  $("articleId").value = video ? (video.articleId || "") : (preset.article || "");
  $("featured").checked = video ? video.featured : false;
  $("description").value = video ? (video.description || "") : "";
  $("ctaLabel").value = video ? (video.ctaLabel || "") : "";
  $("ctaLink").value = video ? (video.ctaLink || "") : "";
  $("embedUrl").value = video && video.source === "embed" ? video.watchUrl : "";
  $("video").value = ""; $("poster").value = "";
  $("progress").hidden = true;
  setSource(video && video.source === "upload" ? "upload" : "embed");
  $("fileHint").textContent = video && video.source === "upload"
    ? `Fichier actuel : ${fmtSize(video.size || 0)}. Laissez vide pour le conserver.`
    : `MP4 (H.264) ou WEBM — ${maxMb} Mo maximum.`;
  syncKind();
  $("formPanel").scrollIntoView({ behavior: "smooth" });
}

function closeForm() { $("formPanel").hidden = true; $("form").reset(); $("editId").value = ""; }

async function quickUpdate(id, fields) {
  const fd = new FormData();
  Object.entries(fields).forEach(([k, v]) => fd.append(k, v));
  await api("/admin/videos/" + id, { method: "PUT", body: fd });
  await load();
}

$("list").addEventListener("click", async e => {
  const btn = e.target.closest("button[data-act]");
  if (!btn) return;
  const video = videos.find(v => v.id === btn.dataset.id);
  if (!video) return;
  try {
    if (btn.dataset.act === "edit") openForm(video);
    if (btn.dataset.act === "toggle") {
      await quickUpdate(video.id, { status: video.status === "published" ? "draft" : "published" });
      toast("Statut mis à jour.");
    }
    if (btn.dataset.act === "feature") {
      await quickUpdate(video.id, { featured: String(!video.featured) });
      toast(video.featured ? "Retirée de la une." : "Mise à la une.");
    }
    if (btn.dataset.act === "delete" && confirm("Supprimer définitivement cette vidéo ?")) {
      await api("/admin/videos/" + video.id, { method: "DELETE" });
      await load(); toast("Vidéo supprimée.");
    }
  } catch (err) { toast(err.message); }
});

$("filters").addEventListener("click", e => {
  const b = e.target.closest("button[data-filter]"); if (!b) return;
  document.querySelectorAll("#filters button").forEach(x => x.classList.remove("active"));
  b.classList.add("active"); filter = b.dataset.filter; renderList();
});
document.querySelectorAll('input[name="src"]').forEach(r => r.addEventListener("change", () => setSource(r.value)));
$("kind").addEventListener("change", syncKind);
$("newBtn").addEventListener("click", () => openForm(null));
$("cancel").addEventListener("click", closeForm);

// Envoi avec barre de progression (les fichiers vidéo peuvent être lourds)
function send(method, url, fd, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url); xhr.withCredentials = true;
    xhr.upload.onprogress = e => { if (e.lengthComputable) onProgress(e.loaded / e.total); };
    xhr.onerror = () => reject(new Error("Connexion interrompue pendant l'envoi."));
    xhr.onload = () => {
      let data = {}; try { data = JSON.parse(xhr.responseText); } catch {}
      if (xhr.status === 401) { $("app").hidden = true; $("notice").hidden = false; return reject(new Error("Session expirée.")); }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data); else reject(new Error(data.message || "Erreur du serveur."));
    };
    xhr.send(fd);
  });
}

$("form").addEventListener("submit", async e => {
  e.preventDefault();
  const id = $("editId").value;
  const useFile = document.querySelector('input[name="src"]:checked').value === "upload";
  const file = $("video").files[0];

  if (useFile && file && file.size > maxMb * 1048576) { toast(`Fichier trop lourd (${maxMb} Mo maximum). Compressez-le ou utilisez un lien YouTube / Vimeo.`); return; }
  if (!id && useFile && !file) { toast("Choisissez un fichier vidéo."); return; }
  if (!id && !useFile && !$("embedUrl").value.trim()) { toast("Collez le lien YouTube ou Vimeo."); return; }

  const fd = new FormData();
  ["title", "kind", "status", "description", "ctaLabel", "ctaLink"].forEach(k => fd.append(k, $(k).value));
  fd.append("articleId", $("kind").value === "reportage" ? $("articleId").value : "");
  fd.append("featured", $("featured").checked ? "true" : "false");
  if (useFile) { if (file) fd.append("video", file); }
  else if ($("embedUrl").value.trim()) fd.append("embedUrl", $("embedUrl").value.trim());
  if ($("poster").files[0]) fd.append("poster", $("poster").files[0]);

  const save = $("save"), bar = $("progress");
  save.disabled = true;
  if (file && useFile) { bar.hidden = false; bar.firstElementChild.style.width = "0"; }
  try {
    await send(id ? "PUT" : "POST", API + "/admin/videos" + (id ? "/" + id : ""), fd,
      p => { bar.firstElementChild.style.width = Math.round(p * 100) + "%"; });
    closeForm(); await load(); toast("Vidéo enregistrée.");
  } catch (err) { toast(err.message); }
  save.disabled = false;
});

(async () => {
  try {
    const s = await (await fetch(API + "/admin/session", { credentials: "include" })).json();
    if (!s.authenticated) { $("notice").hidden = false; return; }
    $("app").hidden = false;
    await loadArticles();
    await load();
    // Liens « Ajouter une vidéo » depuis le tableau de bord ou le magazine
    const q = new URLSearchParams(location.search);
    if (q.get("new")) openForm(null, { kind: q.get("new"), article: q.get("article") || "" });
  } catch { $("notice").hidden = false; }
})();
