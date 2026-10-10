/* RECTOY-AIRES — JavaScript principal (corrigé) */

// Menu : voir menu.js

// Header au scroll
const header = document.getElementById("header");
function updateHeader() {
  if (header) header.classList.toggle("scrolled", window.scrollY > 50);
}
window.addEventListener("scroll", updateHeader, { passive: true });
updateHeader();

// Animation au défilement (classe "visible", comme dans le CSS)
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll(".reveal").forEach(el => revealObserver.observe(el));

// Compteurs
const counters = document.querySelectorAll("[data-target]");
let countersStarted = false;
function animateCounters() {
  if (countersStarted) return;
  countersStarted = true;
  counters.forEach(counter => {
    const target = Number(counter.dataset.target);
    const duration = 1200;
    const start = performance.now();
    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      counter.textContent = Math.floor(progress * target);
      if (progress < 1) requestAnimationFrame(tick);
      else counter.textContent = target;
    }
    requestAnimationFrame(tick);
  });
}
const stats = document.querySelector(".stats");
if (stats) {
  const statsObserver = new IntersectionObserver(entries => {
    if (entries.some(e => e.isIntersecting)) {
      animateCounters();
      statsObserver.disconnect();
    }
  }, { threshold: 0.3 });
  statsObserver.observe(stats);
}

// Année automatique
const year = document.getElementById("year");
if (year) year.textContent = new Date().getFullYear();

// Formulaire de contact (Formspree)
const FORMSPREE_URL = "https://formspree.io/f/xeaoblje";
const contactForm = document.getElementById("contactForm");
const formMessage = document.getElementById("formMessage");
if (contactForm) {
  contactForm.addEventListener("submit", async event => {
    event.preventDefault();
    const btn = contactForm.querySelector("button[type='submit']");
    btn.disabled = true;
    formMessage.className = "";
    formMessage.textContent = "Envoi en cours...";
    try {
      const res = await fetch(FORMSPREE_URL, {
        method: "POST",
        body: new FormData(contactForm),
        headers: { Accept: "application/json" }
      });
      if (!res.ok) {
        let detail = "";
        try {
          const data = await res.json();
          detail = (data.errors && data.errors.map(e => e.message).join(" ")) || data.error || "";
        } catch {}
        console.error("Formspree", res.status, detail);
        formMessage.className = "form-msg err";
        formMessage.textContent =
          "Erreur d'envoi (code " + res.status + ")" + (detail ? " : " + detail : "") +
          ". Écrivez-nous sur WhatsApp ou par email.";
      } else {
        formMessage.className = "form-msg ok";
        formMessage.textContent = "Merci ! Votre message a bien été envoyé.";
        contactForm.reset();
      }
    } catch (err) {
      console.error("Réseau", err);
      formMessage.className = "form-msg err";
      formMessage.textContent =
        "Connexion impossible avec le service d'envoi. Vérifiez internet puis réessayez, ou écrivez-nous sur WhatsApp.";
    }
    btn.disabled = false;
  });
}

// Effet 3D léger sur les cartes (bureau uniquement)
document.querySelectorAll(".service-card, .founder-card").forEach(card => {
  card.addEventListener("mousemove", e => {
    if (window.innerWidth < 900) return;
    const r = card.getBoundingClientRect();
    const rx = ((e.clientY - r.top - r.height / 2) / (r.height / 2)) * -2;
    const ry = ((e.clientX - r.left - r.width / 2) / (r.width / 2)) * 2;
    card.style.transform =
      `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-5px)`;
  });
  card.addEventListener("mouseleave", () => { card.style.transform = ""; });
});

// Actualités : chargées depuis l'API (publications créées dans /admin/)
const API_ORIGIN = window.location.port === "5500" ? "http://localhost:4000" : "";
const newsContainer = document.getElementById("newsContainer");
const TYPE_LABELS = { annonce: "Annonce", evenement: "Événement", publicite: "Publicité" };
const BADGE_CLASS = { annonce: "", evenement: " event", publicite: " ads" };

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function safeUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : null;
  } catch { return null; }
}
function formatDate(value) {
  if (!value) return TYPE_LABELS.annonce;
  const d = new Date(value);
  return isNaN(d) ? esc(value)
    : d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}
function newsCardHTML(p) {
  const image = p.image ? API_ORIGIN + p.image : "src/logo.jpeg";
  const link = safeUrl(p.link);
  const text = p.description.length > 180 ? p.description.slice(0, 180) + "…" : p.description;
  const place = p.location ? `<br><small>📍 ${esc(p.location)}</small>` : "";
  return `<article class="news-card" data-type="${esc(p.type)}">
    <div class="news-image"><img src="${esc(image)}" alt="${esc(p.title)}" loading="lazy" decoding="async">
    <span class="news-badge${BADGE_CLASS[p.type] || ""}">${esc(TYPE_LABELS[p.type] || p.type)}</span></div>
    <div class="news-content"><span class="news-date">${formatDate(p.date || p.createdAt)}</span>
    <h3>${esc(p.title)}</h3><p>${esc(text)}${place}</p>
    ${link ? `<a href="${esc(link)}" class="news-link" target="_blank" rel="noopener noreferrer">En savoir plus →</a>` : ""}
    ${window.RectoySocial ? window.RectoySocial.shareBar("/share/publication/" + encodeURIComponent(p.id), p.title) : ""}
    </div></article>`;
}
async function loadNews() {
  if (!newsContainer) return;
  try {
    const res = await fetch(API_ORIGIN + "/api/publications");
    if (!res.ok) throw new Error();
    const list = (await res.json()).publications || [];
    newsContainer.innerHTML = list.length
      ? list.map(newsCardHTML).join("")
      : '<p style="grid-column:1/-1;text-align:center;color:#667085">Aucune actualité pour le moment.</p>';
  } catch {
    /* API indisponible : on garde les cartes d'exemple du HTML */
  }
}
loadNews();

// Filtres actualités (fonctionnent aussi sur les cartes chargées dynamiquement)
const filterButtons = document.querySelectorAll(".filter-btn");
filterButtons.forEach(b => b.setAttribute("aria-pressed", b.classList.contains("active") ? "true" : "false"));
filterButtons.forEach(button => {
  button.addEventListener("click", () => {
    filterButtons.forEach(b => { b.classList.remove("active"); b.setAttribute("aria-pressed", "false"); });
    button.classList.add("active");
    button.setAttribute("aria-pressed", "true");
    const filter = button.dataset.filter;
    document.querySelectorAll(".news-card").forEach(card => {
      const show = filter === "all" || card.dataset.type === filter;
      if (show) {
        card.style.display = "block";
        setTimeout(() => { card.style.opacity = "1"; card.style.transform = "translateY(0)"; }, 50);
      } else {
        card.style.opacity = "0";
        card.style.transform = "translateY(15px)";
        setTimeout(() => { card.style.display = "none"; }, 250);
      }
    });
  });
});

// Image manquante ou cassée : on affiche le logo à la place
function imageFallback(img) {
  if (img.dataset.fallback) return;
  img.dataset.fallback = "1";
  img.classList.add("is-placeholder");
  img.src = "src/logo.jpeg";
}
document.addEventListener("error", e => {
  if (e.target && e.target.tagName === "IMG") imageFallback(e.target);
}, true);
document.querySelectorAll("img").forEach(img => {
  if (img.complete && img.naturalWidth === 0 && img.getAttribute("src")) imageFallback(img);
});


// Aperçu de RECTOY MAGAZINE sur l'accueil
(async function loadMagazineTeaser() {
  const box = document.getElementById("magazineTeaser");
  if (!box) return;
  try {
    const res = await fetch(API_ORIGIN + "/api/magazine?limit=12");
    if (!res.ok) throw new Error();
    const list = ((await res.json()).articles || [])
      .sort((a, b) => Number(b.featured) - Number(a.featured))
      .slice(0, 3);
    if (!list.length) return;
    const labels = { portrait: "Portrait", reportage: "Reportage", entreprise: "Entreprise & PME",
      investisseur: "Investisseur", produit: "Produit", activite: "Activité", publicite: "Publicité" };
    box.innerHTML = list.map(a => `<a class="teaser-card" href="magazine.html?article=${encodeURIComponent(a.id)}">
      <div class="teaser-img"><img src="${esc(a.image ? API_ORIGIN + a.image : "src/logo.jpeg")}" alt="${esc(a.title)}" loading="lazy" decoding="async"></div>
      <span class="teaser-cat">${a.featured ? "À LA UNE · " : ""}${esc(labels[a.category] || a.category)}</span>
      <h3>${esc(a.title)}</h3><p>${esc(a.summary)}</p></a>`).join("");
  } catch {
    /* magazine indisponible : le bandeau reste affiché sans articles */
  }
})();
