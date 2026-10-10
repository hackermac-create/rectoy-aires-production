/* Administration de RECTOY MAGAZINE */

const API_ORIGIN = window.location.port === "5500" ? "http://localhost:4000" : "";
const API = API_ORIGIN + "/api";
const CATS = { portrait: "Portrait", reportage: "Reportage", entreprise: "Entreprise & PME",
  investisseur: "Investisseur", produit: "Produit", activite: "Activité", publicite: "Publicité" };

const $ = id => document.getElementById(id);
let articles = [];

const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");

function toast(message) {
  const t = $("toast");
  t.textContent = message;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 3000);
}

async function api(path, options = {}) {
  const res = await fetch(API + path, { credentials: "include", ...options });
  let data = {};
  try { data = await res.json(); } catch {}
  if (res.status === 401) { $("app").hidden = true; $("notice").hidden = false; throw new Error("Session expirée."); }
  if (!res.ok) throw new Error(data.message || "Erreur du serveur.");
  return data;
}

function renderList() {
  const box = $("list");
  if (!articles.length) { box.innerHTML = '<p style="color:#8793a3;padding:10px 0">Aucun article pour le moment.</p>'; return; }
  box.innerHTML = articles.map(a => `
    <div class="mag-row">
      ${a.image ? `<img class="post-thumb" src="${esc(API_ORIGIN + a.image)}" alt="">` : '<div class="post-thumb"></div>'}
      <div class="post-info"><strong>${a.featured ? "⭐ " : ""}${esc(a.title)}</strong>
        <small>${esc(CATS[a.category] || a.category)}${a.subject ? " · " + esc(a.subject) : ""}</small><br>
        <span class="badge ${a.status}">${a.status === "published" ? "Publié" : "Brouillon"}</span></div>
      <div class="row-actions">
        <button type="button" data-act="edit" data-id="${esc(a.id)}">✏️ Modifier</button>
        <button type="button" data-act="toggle" data-id="${esc(a.id)}">${a.status === "published" ? "Masquer" : "Publier"}</button>
        <button type="button" data-act="feature" data-id="${esc(a.id)}">${a.featured ? "Retirer ⭐" : "⭐ Une"}</button>
        <a class="row-link" href="videos.html?new=reportage&article=${esc(a.id)}">🎬 Vidéo</a>
        <button type="button" data-act="delete" data-id="${esc(a.id)}">🗑️</button>
      </div>
    </div>`).join("");
}

async function load() {
  const data = await api("/admin/magazine");
  articles = data.articles || [];
  renderList();
}

function openForm(article) {
  $("formPanel").hidden = false;
  $("formTitle").textContent = article ? "Modifier l'article" : "Nouvel article";
  $("editId").value = article ? article.id : "";
  $("title").value = article ? article.title : "";
  $("category").value = article ? article.category : "portrait";
  $("subject").value = article ? (article.subject || "") : "";
  $("author").value = article ? (article.author || "") : "";
  $("publishedAt").value = article ? String(article.publishedAt).slice(0, 10) : "";
  $("status").value = article ? article.status : "published";
  $("featured").checked = article ? article.featured : false;
  $("summary").value = article ? article.summary : "";
  $("content").value = article ? article.content : "";
  $("image").value = "";
  $("formPanel").scrollIntoView({ behavior: "smooth" });
}

function closeForm() { $("formPanel").hidden = true; $("form").reset(); $("editId").value = ""; }

async function quickUpdate(id, fields) {
  const fd = new FormData();
  Object.entries(fields).forEach(([k, v]) => fd.append(k, v));
  await api("/admin/magazine/" + id, { method: "PUT", body: fd });
  await load();
}

$("list").addEventListener("click", async e => {
  const btn = e.target.closest("button[data-act]");
  if (!btn) return;
  const article = articles.find(a => a.id === btn.dataset.id);
  if (!article) return;
  try {
    if (btn.dataset.act === "edit") openForm(article);
    if (btn.dataset.act === "toggle") {
      await quickUpdate(article.id, { status: article.status === "published" ? "draft" : "published" });
      toast("Statut mis à jour.");
    }
    if (btn.dataset.act === "feature") {
      await quickUpdate(article.id, { featured: String(!article.featured) });
      toast(article.featured ? "Retiré de la une." : "Mis à la une.");
    }
    if (btn.dataset.act === "delete" && confirm("Supprimer définitivement cet article ?")) {
      await api("/admin/magazine/" + article.id, { method: "DELETE" });
      await load();
      toast("Article supprimé.");
    }
  } catch (err) { toast(err.message); }
});

$("newBtn").addEventListener("click", () => openForm(null));
$("cancel").addEventListener("click", closeForm);

$("form").addEventListener("submit", async e => {
  e.preventDefault();
  const id = $("editId").value;
  const fd = new FormData();
  ["title", "category", "subject", "author", "publishedAt", "status", "summary", "content"]
    .forEach(k => fd.append(k, $(k).value));
  fd.append("featured", $("featured").checked ? "true" : "false");
  fd.append("shareFacebook", $("shareFacebook").checked ? "true" : "false");
  fd.append("shareInstagram", $("shareInstagram").checked ? "true" : "false");
  if ($("image").files[0]) fd.append("image", $("image").files[0]);
  try {
    const out = await api(id ? "/admin/magazine/" + id : "/admin/magazine", { method: id ? "PUT" : "POST", body: fd });
    closeForm();
    await load();
    const names = { facebook: "Facebook", instagram: "Instagram" };
    const extra = out.social ? " " + Object.entries(out.social).map(([k, v]) => v.ok ? `✓ ${names[k]} publié.` : `⚠ ${names[k]} : ${v.error}`).join(" ") : "";
    toast("Article enregistré." + extra);
  } catch (err) { toast(err.message); }
});

(async () => {
  try {
    const res = await fetch(API + "/admin/session", { credentials: "include" });
    const s = await res.json();
    if (!s.authenticated) { $("notice").hidden = false; return; }
    $("app").hidden = false;
    await load();
  } catch {
    $("notice").hidden = false;
  }
})();


// Grise les réseaux non configurés sur le serveur
(async () => {
  try {
    const d = await (await fetch(API + "/admin/social/status", { credentials: "include" })).json();
    if (!d.success) return;
    [["shareFacebook", "facebook"], ["shareInstagram", "instagram"]].forEach(([id, key]) => {
      if (!d.networks[key]) { $(id).disabled = true; $(id).parentElement.classList.add("is-off"); $(id).parentElement.title = "Non configuré : voir GUIDE-RESEAUX-SOCIAUX.md"; }
    });
  } catch {}
})();
