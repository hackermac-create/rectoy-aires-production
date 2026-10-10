/* RECTOY MAGAZINE — page publique */

const API_ORIGIN = window.location.port === "5500" ? "http://localhost:4000" : "";

const CATS = {
  portrait: "Portrait", reportage: "Reportage", entreprise: "Entreprise & PME",
  investisseur: "Investisseur", produit: "Produit", activite: "Activité", publicite: "Publicité"
};

const $ = id => document.getElementById(id);
const listView = $("listView"), articleView = $("articleView");
let allArticles = [];
let currentCat = "all";

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function fmtDate(value) {
  const d = new Date(value);
  return isNaN(d) ? "" : d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function imgSrc(article) {
  return article.image ? API_ORIGIN + article.image : "src/logo.jpeg";
}

function meta(a) {
  const parts = [fmtDate(a.publishedAt)];
  if (a.author) parts.push("Par " + a.author);
  return parts.filter(Boolean).map(esc).join(" · ");
}

function link(a) { return "magazine.html?article=" + encodeURIComponent(a.id); }

const PLAY_ICON = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5z"/></svg>';
const videoBadge = a => a.videos ? `<span class="mag-hasvideo">${PLAY_ICON} Vidéo</span>` : "";

function card(a) {
  return `<a class="mag-card" href="${link(a)}">
    <div class="mag-card-img"><img src="${esc(imgSrc(a))}" alt="${esc(a.title)}" loading="lazy" decoding="async">${videoBadge(a)}</div>
    <span class="mag-cat">${esc(CATS[a.category] || a.category)}</span>
    <h3>${esc(a.title)}</h3><p>${esc(a.summary)}</p>
    <span class="mag-meta">${meta(a)}</span></a>`;
}

function renderList() {
  const items = currentCat === "all" ? allArticles : allArticles.filter(a => a.category === currentCat);
  const hero = $("magHero"), secondary = $("magSecondary"), grid = $("magGrid");
  hero.innerHTML = secondary.innerHTML = grid.innerHTML = "";
  const videosBand = $("magVideos");
  if (videosBand) videosBand.dataset.show = (currentCat === "all" || currentCat === "reportage") ? "1" : "0";
  $("magLoading").hidden = true;
  $("magEmpty").hidden = items.length > 0;
  $("magLatestTitle").hidden = true;
  if (!items.length) return;

  // "À la une" : articles mis en avant d'abord, puis les plus récents
  const sorted = [...items].sort((a, b) => Number(b.featured) - Number(a.featured));
  const main = sorted[0];
  const rest = items.filter(a => a.id !== main.id);
  const featuredRest = rest.filter(a => a.featured).slice(0, 3);
  const others = rest.filter(a => !featuredRest.includes(a));

  hero.innerHTML = `<a class="mag-hero" href="${link(main)}">
    <div class="mag-hero-img"><img src="${esc(imgSrc(main))}" alt="${esc(main.title)}" decoding="async">${videoBadge(main)}</div>
    <div class="mag-hero-body">
      ${main.featured ? '<span class="mag-badge-une">À LA UNE</span>' : ""}
      <span class="mag-cat">${esc(CATS[main.category] || main.category)}${main.subject ? " · " + esc(main.subject) : ""}</span>
      <h2>${esc(main.title)}</h2><p>${esc(main.summary)}</p>
      <span class="mag-meta">${meta(main)}</span>
    </div></a>`;

  secondary.innerHTML = featuredRest.map(card).join("");

  if (others.length) {
    $("magLatestTitle").hidden = false;
    grid.innerHTML = others.map(card).join("");
  }
}

async function loadList() {
  try {
    const res = await fetch(API_ORIGIN + "/api/magazine?limit=100");
    if (!res.ok) throw new Error();
    allArticles = (await res.json()).articles || [];
    renderList();
  } catch {
    $("magLoading").textContent = "Le magazine est momentanément indisponible. Réessayez dans quelques instants.";
  }
}

function paragraphs(text) {
  return String(text).split(/\n{2,}/).map(block => {
    const t = block.trim();
    if (!t) return "";
    if (t.startsWith("## ")) return `<h3>${esc(t.slice(3))}</h3>`;
    return `<p>${esc(t).replaceAll("\n", "<br>")}</p>`;
  }).join("");
}

async function loadArticle(id) {
  listView.hidden = true;
  articleView.hidden = false;
  const body = $("articleBody");
  body.innerHTML = '<p class="mag-empty">Chargement…</p>';
  try {
    const res = await fetch(API_ORIGIN + "/api/magazine/" + encodeURIComponent(id));
    if (!res.ok) throw new Error();
    const a = (await res.json()).article;
    document.title = a.title + " | RECTOY MAGAZINE";
    const shareUrl = "https://wa.me/?text=" + encodeURIComponent(a.title + " — " + window.location.href);
    body.innerHTML = `<a class="mag-back" href="magazine.html">← Retour au magazine</a><br>
      <span class="mag-cat">${esc(CATS[a.category] || a.category)}${a.subject ? " · " + esc(a.subject) : ""}</span>
      <h1>${esc(a.title)}</h1>
      <p class="mag-chapo">${esc(a.summary)}</p>
      <div class="mag-article-meta">${meta(a)}</div>
      <div id="articleActions"></div>
      <div class="mag-article-videos" id="articleVideos"></div>
      ${a.image ? `<figure class="mag-article-img"><img src="${esc(API_ORIGIN + a.image)}" alt="${esc(a.title)}"></figure>` : ""}
      <div class="mag-text">${paragraphs(a.content)}</div>
      <div class="mag-share">${window.RectoySocial ? window.RectoySocial.shareBar("/share/magazine/" + encodeURIComponent(a.id), a.title) : `<a href="${esc(shareUrl)}" target="_blank" rel="noopener noreferrer">Partager sur WhatsApp</a>`}</div>`;
    window.scrollTo(0, 0);
    if (window.RectoyVideos) RectoyVideos.forArticle(a.id, $("articleVideos"));
    addListenButton(a);
  } catch {
    body.innerHTML = '<a class="mag-back" href="magazine.html">← Retour au magazine</a><p class="mag-empty">Cet article est introuvable ou n\'est plus publié.</p>';
  }
}

// « Écouter l'article » : lecture à voix haute par l'assistant vocal
function addListenButton(a) {
  const V = window.RectoyVoice, box = $("articleActions");
  if (!V || !V.supported.tts || !box) return;
  const btn = document.createElement("button");
  btn.type = "button"; btn.className = "mag-listen"; btn.setAttribute("aria-pressed", "false");
  const idle = () => { btn.setAttribute("aria-pressed", "false"); btn.textContent = "🔊 Écouter l'article"; };
  idle();
  btn.addEventListener("click", () => {
    if (btn.getAttribute("aria-pressed") === "true") { V.stop(); idle(); return; }
    btn.setAttribute("aria-pressed", "true"); btn.textContent = "⏹ Arrêter la lecture";
    const text = [a.title, a.summary, String(a.content || "").replace(/^## /gm, "")].join(". ");
    V.speak(text, idle);
  });
  box.appendChild(btn);
}

// Filtres par rubrique
$("magFilters").addEventListener("click", e => {
  const btn = e.target.closest("button[data-cat]");
  if (!btn) return;
  document.querySelectorAll("#magFilters button").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  currentCat = btn.dataset.cat;
  renderList();
});

// Date + année (le menu est géré par menu.js)
$("magDate").textContent = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
$("year").textContent = new Date().getFullYear();

// Image manquante : logo à la place
document.addEventListener("error", e => {
  const img = e.target;
  if (img && img.tagName === "IMG" && !img.dataset.fallback) {
    img.dataset.fallback = "1";
    img.src = "src/logo.jpeg";
  }
}, true);

const articleId = new URLSearchParams(window.location.search).get("article");
if (articleId) loadArticle(articleId); else loadList();
