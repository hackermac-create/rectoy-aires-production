/* RECTOY-AIRES — vidéos : publicités, reportages du magazine, présentation.
   Alimenté par l'API /api/videos (ajout et gestion dans /admin/videos.html).
   Utilisé par : l'accueil (#videos + carte du hero), le magazine (#magVideos, article), videos.html (#vdPage). */
(function () {
  "use strict";

  var ORIGIN = window.location.port === "5500" ? "http://localhost:4000" : "";
  var KINDS = { publicite: "Publicité", reportage: "Reportage", presentation: "Présentation" };
  var PLAY = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5z"/></svg>';
  var cache = {};

  function esc(v) {
    return String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }
  function abs(p) { return /^https?:/.test(p) ? p : ORIGIN + p; }
  function safeLink(v) { return /^\/(?!\/)/.test(v) || /^https?:\/\//i.test(v); }

  function load(params) {
    var q = Object.keys(params || {}).map(function (k) { return k + "=" + encodeURIComponent(params[k]); }).join("&");
    return fetch(ORIGIN + "/api/videos" + (q ? "?" + q : "")).then(function (r) {
      if (!r.ok) throw new Error("http " + r.status);
      return r.json();
    }).then(function (d) { (d.videos || []).forEach(function (v) { cache[v.id] = v; }); return d.videos || []; });
  }

  // ---------- Cartes ----------
  function thumb(v) {
    var media = v.poster
      ? '<img src="' + esc(abs(v.poster)) + '" alt="" loading="lazy" decoding="async">'
      : v.videoUrl
        ? '<video class="vd-frame" data-src="' + esc(abs(v.videoUrl)) + '#t=0.8" muted playsinline preload="none" tabindex="-1" aria-hidden="true"></video>'
        : '<img class="is-placeholder" src="/src/logo.jpeg" alt="" loading="lazy">';
    return '<div class="vd-thumb">' + media + '<span class="vd-play">' + PLAY + "</span>" +
      '<span class="vd-kind ' + esc(v.kind) + '">' + esc(KINDS[v.kind] || v.kind) + "</span>" +
      (v.featured ? '<span class="vd-mark">À la une</span>' : "") + "</div>";
  }

  function card(v) {
    cache[v.id] = v;
    return '<button type="button" class="vd-card" data-vid="' + esc(v.id) + '" aria-label="Lire la vidéo : ' + esc(v.title) + '">' +
      thumb(v) + '<div class="vd-body"><h3>' + esc(v.title) + "</h3>" +
      (v.description ? "<p>" + esc(v.description) + "</p>" : "") + "</div></button>";
  }

  // Image d'aperçu des vidéos sans couverture : on charge la 1re image seulement quand la carte est visible.
  var frameObserver = "IntersectionObserver" in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      var el = en.target; frameObserver.unobserve(el);
      el.preload = "metadata"; el.src = el.getAttribute("data-src");
    });
  }, { rootMargin: "200px" }) : null;
  function lazyFrames(root) {
    root.querySelectorAll("video.vd-frame[data-src]").forEach(function (el) {
      if (frameObserver) frameObserver.observe(el); else { el.preload = "metadata"; el.src = el.getAttribute("data-src"); }
    });
  }
  function paint(el, html) { el.innerHTML = html; lazyFrames(el); }

  // ---------- Fenêtre de lecture ----------
  var modal, stage, lastFocus, current, listenBtn;

  function build() {
    if (modal) return;
    modal = document.createElement("div");
    modal.className = "vd-modal"; modal.hidden = true;
    modal.setAttribute("role", "dialog"); modal.setAttribute("aria-modal", "true"); modal.setAttribute("aria-label", "Lecteur vidéo");
    modal.innerHTML = '<div class="vd-box"><button class="vd-close" type="button" aria-label="Fermer la vidéo">✕</button>' +
      '<div class="vd-stage"></div><div class="vd-info"><h3></h3><p></p><div class="vd-actions"></div></div></div>';
    document.body.appendChild(modal);
    stage = modal.querySelector(".vd-stage");
    modal.addEventListener("click", function (e) { if (e.target === modal || e.target.closest(".vd-close")) close(); });
    document.addEventListener("keydown", function (e) {
      if (modal.hidden) return;
      if (e.key === "Escape") { e.preventDefault(); close(); return; }
      if (e.key !== "Tab") return;
      var f = Array.prototype.slice.call(modal.querySelectorAll("button, a[href], video[controls], iframe"))
        .filter(function (n) { return !n.disabled && n.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  function player(v) {
    if (v.embedUrl) {
      var sep = v.embedUrl.indexOf("?") === -1 ? "?" : "&";
      var extra = v.provider === "youtube" ? "autoplay=1&rel=0&playsinline=1" : "autoplay=1";
      return '<iframe src="' + esc(v.embedUrl + sep + extra) + '" title="' + esc(v.title) + '" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>';
    }
    return '<video controls autoplay playsinline preload="auto"' + (v.poster ? ' poster="' + esc(abs(v.poster)) + '"' : "") +
      ' src="' + esc(abs(v.videoUrl)) + '">Votre navigateur ne peut pas lire cette vidéo.</video>';
  }

  function open(v, from) {
    build();
    if (window.RectoyVoice) window.RectoyVoice.stopAll();       // l'assistant se tait pendant la vidéo
    current = v; lastFocus = from || document.activeElement;
    stage.innerHTML = player(v);
    modal.querySelector("h3").textContent = v.title;
    var p = modal.querySelector(".vd-info p");
    p.textContent = v.description || ""; p.hidden = !v.description;

    var acts = modal.querySelector(".vd-actions");
    acts.textContent = "";
    function add(el) { acts.appendChild(el); return el; }
    function mk(tag, cls, text) { var n = document.createElement(tag); n.className = "vd-act" + (cls ? " " + cls : ""); n.textContent = text; if (tag === "button") n.type = "button"; return n; }

    if (v.ctaLink && safeLink(v.ctaLink)) {
      var cta = add(mk("a", "primary", v.ctaLabel || "En savoir plus"));
      cta.href = v.ctaLink;
      if (/^https?:/i.test(v.ctaLink)) { cta.target = "_blank"; cta.rel = "noopener noreferrer"; }
      else cta.addEventListener("click", close);
    }
    if (v.articleId) { var art = add(mk("a", "", "Lire l'article")); art.href = "/magazine.html?article=" + encodeURIComponent(v.articleId); }
    if (window.RectoyVoice && window.RectoyVoice.supported.tts && v.description) {
      listenBtn = add(mk("button", "", "🔊 Écouter la présentation"));
      listenBtn.addEventListener("click", function () {
        var on = listenBtn.getAttribute("aria-pressed") === "true";
        if (on) { window.RectoyVoice.stop(); listenBtn.setAttribute("aria-pressed", "false"); listenBtn.textContent = "🔊 Écouter la présentation"; return; }
        listenBtn.setAttribute("aria-pressed", "true"); listenBtn.textContent = "⏹ Arrêter la lecture";
        var vid = stage.querySelector("video"); if (vid) vid.pause();
        window.RectoyVoice.speak(v.title + ". " + v.description, function () { listenBtn.setAttribute("aria-pressed", "false"); listenBtn.textContent = "🔊 Écouter la présentation"; });
      });
    }
    var copy = add(mk("button", "", "Copier le lien"));
    copy.addEventListener("click", function () {
      var url = location.origin + "/videos.html?v=" + encodeURIComponent(v.id);
      var done = function () { copy.textContent = "Lien copié ✓"; setTimeout(function () { copy.textContent = "Copier le lien"; }, 1800); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, function () { window.prompt("Copiez ce lien :", url); });
      else window.prompt("Copiez ce lien :", url);
    });

    modal.hidden = false;
    document.documentElement.classList.add("vd-lock");
    modal.querySelector(".vd-close").focus({ preventScroll: true });
    if (document.getElementById("vdPage")) history.replaceState(null, "", "?v=" + encodeURIComponent(v.id));
  }

  function close() {
    if (!modal || modal.hidden) return;
    if (window.RectoyVoice) window.RectoyVoice.stop();
    modal.hidden = true; stage.innerHTML = "";               // coupe la lecture et la connexion
    document.documentElement.classList.remove("vd-lock");
    if (document.getElementById("vdPage")) history.replaceState(null, "", location.pathname);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    current = null;
  }

  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-vid]");
    if (!b) return;
    var v = cache[b.getAttribute("data-vid")];
    if (v) { e.preventDefault(); open(v, b); }
  });

  // Aperçu manquant ou cassé : logo à la place
  document.addEventListener("error", function (e) {
    var img = e.target;
    if (img && img.tagName === "IMG" && img.closest && img.closest(".vd-thumb") && !img.dataset.fb) {
      img.dataset.fb = "1"; img.classList.add("is-placeholder"); img.src = "/src/logo.jpeg";
    }
  }, true);

  // ---------- Accueil : section + vidéo à l'affiche dans le hero ----------
  function initHome() {
    var section = document.getElementById("videos");
    var heroCard = document.querySelector(".hero-card");
    if (!section && !heroCard) return;

    load({ limit: 12 }).then(function (list) {
      if (!list.length) return;

      var spot = list.filter(function (v) { return v.featured && v.kind !== "reportage"; })[0];
      if (spot && heroCard) {
        heroCard.classList.add("has-video");
        paint(heroCard, '<button type="button" class="vd-card" data-vid="' + esc(spot.id) + '" aria-label="Lire la vidéo : ' + esc(spot.title) + '">' +
          thumb(spot) + '<div class="vd-over"><small>À l\'affiche</small><strong>' + esc(spot.title) + "</strong></div></button>");
      }

      if (section) {
        var main = list[0], side = list.slice(1, 4);
        paint(document.getElementById("vdMain"), card(main));
        var sideBox = document.getElementById("vdSide");
        paint(sideBox, side.length ? '<p class="vd-side-label">À voir aussi</p>' + side.map(card).join("") : "");
        section.hidden = false;
      }
    }).catch(function () { /* API indisponible : la section reste masquée */ });
  }

  // ---------- Magazine : bandeau « Reportages vidéo » ----------
  function initMagazine() {
    var box = document.getElementById("magVideos");
    if (!box) return;
    load({ kind: "reportage", limit: 4 }).then(function (list) {
      if (!list.length) return;
      paint(document.getElementById("magVideosGrid"), list.map(card).join(""));
      box.hidden = false;
    }).catch(function () {});
  }

  // Vidéos intégrées dans un article (lecture directe dans la page)
  function forArticle(articleId, container) {
    if (!container) return Promise.resolve(0);
    return load({ article: articleId }).then(function (list) {
      container.innerHTML = list.map(function (v) {
        var media = v.embedUrl
          ? '<iframe loading="lazy" src="' + esc(v.embedUrl) + '" title="' + esc(v.title) + '" allow="fullscreen; picture-in-picture; encrypted-media" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>'
          : '<video controls playsinline preload="metadata"' + (v.poster ? ' poster="' + esc(abs(v.poster)) + '"' : "") + ' src="' + esc(abs(v.videoUrl)) + '"></video>';
        return '<figure class="vd-inline"><div class="vd-stage">' + media + "</div><figcaption><strong>" + esc(v.title) + "</strong>" + esc(v.description || "") + "</figcaption></figure>";
      }).join("");
      return list.length;
    }).catch(function () { return 0; });
  }

  // ---------- Page Vidéos ----------
  function initPage() {
    var grid = document.getElementById("vdGrid");
    if (!grid) return;
    var tabs = document.getElementById("vdTabs"), all = [], kind = "all";

    function render() {
      var items = kind === "all" ? all : all.filter(function (v) { return v.kind === kind; });
      paint(grid, items.length ? items.map(card).join("")
        : '<p class="vd-empty">Aucune vidéo dans cette rubrique pour le moment. Revenez très vite.</p>');
    }
    tabs.addEventListener("click", function (e) {
      var b = e.target.closest("[data-kind]"); if (!b) return;
      kind = b.getAttribute("data-kind");
      tabs.querySelectorAll("[data-kind]").forEach(function (t) { t.setAttribute("aria-selected", t === b ? "true" : "false"); });
      render();
    });

    load({ limit: 100 }).then(function (list) {
      all = list;
      // On masque les rubriques vides
      tabs.querySelectorAll("[data-kind]").forEach(function (t) {
        var k = t.getAttribute("data-kind");
        if (k !== "all" && !all.some(function (v) { return v.kind === k; })) t.hidden = true;
      });
      render();
      var wanted = new URLSearchParams(location.search).get("v");
      if (wanted && cache[wanted]) open(cache[wanted]);
    }).catch(function () {
      grid.innerHTML = '<p class="vd-empty">Les vidéos sont momentanément indisponibles. Réessayez dans quelques instants.</p>';
    });
  }

  window.RectoyVideos = { load: load, card: card, open: open, forArticle: forArticle };

  function init() { initHome(); initMagazine(); initPage(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
