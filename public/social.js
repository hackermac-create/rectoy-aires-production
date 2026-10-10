/* RECTOY-AIRES — réseaux sociaux : icônes, liens et partage
   Les adresses se règlent dans social-config.js (un seul fichier). */
(function () {
  "use strict";

  var CFG = window.RECTOY_SOCIAL || {};      // valeurs par défaut (social-config.js)
  var API = (window.location.port === "5500" ? "http://localhost:4000" : "") + "/api/social";

  // L'ordre ci-dessous est l'ordre d'affichage partout sur le site
  var NAMES = { facebook: "Facebook", instagram: "Instagram", tiktok: "TikTok", whatsapp: "WhatsApp",
    youtube: "YouTube", linkedin: "LinkedIn", x: "X", threads: "Threads", snapchat: "Snapchat", telegram: "Telegram" };

  // Liens en vigueur : valeurs par défaut, complétées par celles saisies dans l'administration
  var state = { company: merge(CFG, {}), founders: window.RECTOY_FOUNDER_LINKS || {} };

  function merge(base, extra) {
    var out = {}, k;
    for (k in base) if (base[k]) out[k] = base[k];
    for (k in extra) if (extra[k]) out[k] = extra[k];
    return out;
  }

  // Icônes dessinées en traits (sobres, nettes à toutes les tailles)
  var ICONS = {
    facebook: '<path d="M14.5 8.5h2.5V5h-2.8C11.6 5 10 6.7 10 9.2V11H7.5v3.4H10V21h3.5v-6.6h2.6l.6-3.4h-3.2V9.4c0-.5.4-.9 1-.9z"/>',
    instagram: '<rect x="4" y="4" width="16" height="16" rx="4.5"/><circle cx="12" cy="12" r="3.6"/><circle cx="16.9" cy="7.1" r=".6" fill="currentColor"/>',
    linkedin: '<rect x="4" y="9.5" width="3.2" height="10"/><circle cx="5.6" cy="5.8" r="1.8" fill="currentColor" stroke="none"/><path d="M10.5 19.5v-10h3v1.5c.6-1 1.8-1.8 3.4-1.8 2.6 0 3.6 1.7 3.6 4.4v5.9h-3.2v-5.2c0-1.3-.4-2.1-1.6-2.1-1.3 0-2 .9-2 2.2v5.1z" fill="currentColor" stroke="none"/>',
    tiktok: '<path d="M14 4v10.2a3.7 3.7 0 1 1-3.7-3.7"/><path d="M14 4c.3 2.3 1.8 3.9 4.2 4.1"/>',
    youtube: '<rect x="3" y="6" width="18" height="12" rx="3.5"/><path d="M10.2 9.6v4.8l4.3-2.4z" fill="currentColor" stroke="none"/>',
    x: '<path d="M5 5l14 14M19 5L5 19"/>',
    whatsapp: '<path d="M4.5 19.5l1.2-4A7.6 7.6 0 1 1 8.6 18z"/><path d="M9.2 8.8c.2 2.6 2.2 4.6 4.9 5.1l1-1.1-1.8-.9-.7.6c-.8-.4-1.5-1.1-1.9-1.9l.6-.7-.9-1.8z" fill="currentColor" stroke="none"/>',
    threads: '<path d="M16.6 10.9c-.4-2.4-2-3.9-4.6-3.9-3 0-4.8 2.1-4.8 5s1.8 5 4.8 5c2.3 0 3.8-1.1 3.8-2.8 0-2-1.9-2.7-3.8-2.5-1.1.1-1.6.7-1.6 1.4 0 .8.6 1.3 1.5 1.3 1.4 0 2.1-1 2.1-3.1"/>',
    snapchat: '<path d="M12 4.5c-2.6 0-4.2 1.9-4.2 4.3v1.8c-.7.3-1.4.5-2.2.5.5.9 1.2 1.3 2.1 1.6-.4 1-1.1 1.7-2.2 2.1 1.1.5 2 .6 2.9.8.3.7.8 1 1.5 1s1.1-.5 2.1-.5 1.4.5 2.1.5 1.2-.3 1.5-1c.9-.2 1.8-.3 2.9-.8-1.1-.4-1.8-1.1-2.2-2.1.9-.3 1.6-.7 2.1-1.6-.8 0-1.5-.2-2.2-.5V8.8c0-2.4-1.6-4.3-4.2-4.3z"/>',
    telegram: '<path d="M20.5 4.5 3.6 11.1l5.3 2 2 5.4 2.8-3.7 4.6 3.4z"/><path d="m8.9 13.1 7.5-6"/>',
    share: '<circle cx="6.5" cy="12" r="2.2"/><circle cx="17" cy="6" r="2.2"/><circle cx="17" cy="18" r="2.2"/><path d="M8.5 11l6.5-4M8.5 13l6.5 4"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'
  };

  function svg(name) {
    return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (ICONS[name] || "") + "</svg>";
  }

  function safe(url) {
    try { var u = new URL(url); return /^https?:$/.test(u.protocol) ? u.href : null; } catch (e) { return null; }
  }

  // Construit une rangée d'icônes. links = { facebook:"https://…", … } (par défaut : réseaux de l'entreprise)
  function row(container, links, opts) {
    opts = opts || {};
    links = links || state.company;
    var keys = opts.only || Object.keys(NAMES);
    container.textContent = "";
    var shown = 0;
    keys.forEach(function (key) {
      var href = safe(links[key]);
      if (!href && !opts.showSoon) return;
      if (opts.max && shown >= opts.max) return;
      var a = document.createElement("a");
      a.className = "soc soc-" + key + (href ? "" : " is-soon");
      a.innerHTML = svg(key) + (opts.labels && href ? "<span>" + NAMES[key] + "</span>" : "");
      a.setAttribute("aria-label", NAMES[key] + (href ? "" : " (bientôt disponible)"));
      if (href) { a.href = href; a.target = "_blank"; a.rel = "noopener noreferrer"; a.title = NAMES[key]; }
      else { a.href = "#"; a.setAttribute("aria-disabled", "true"); a.tabIndex = -1; a.title = "Bientôt disponible"; }
      container.appendChild(a); shown++;
    });
    container.classList.toggle("is-empty", shown === 0);
    return shown;
  }

  var FOUNDER_KEYS = ["linkedin", "facebook", "instagram", "tiktok", "x", "youtube", "threads", "snapchat", "telegram", "whatsapp"];

  function render() {
    document.querySelectorAll("[data-social]").forEach(function (box) {
      var variant = box.getAttribute("data-social");
      row(box, state.company, { labels: variant === "labels", max: variant === "header" ? 4 : 0, showSoon: false });
    });
    // Cartes des cofondateurs : liens personnels + WhatsApp de l'entreprise par défaut
    document.querySelectorAll("[data-founder-socials]").forEach(function (box) {
      var card = box.closest("[data-founder]");
      var mine = (card && state.founders[card.getAttribute("data-founder")]) || {};
      var links = merge(mine, {});
      if (!links.whatsapp && state.company.whatsapp) links.whatsapp = state.company.whatsapp;
      row(box, links, { only: FOUNDER_KEYS });
    });
  }

  function init() {
    render();                                    // affichage immédiat avec les valeurs par défaut
    if (!window.fetch) return;
    fetch(API).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      if (!d || !d.success) return;
      state.company = merge(CFG, d.company || {});
      var base = window.RECTOY_FOUNDER_LINKS || {}, all = {};
      Object.keys(base).concat(Object.keys(d.founders || {})).forEach(function (slug) {
        all[slug] = merge(base[slug] || {}, (d.founders || {})[slug] || {});
      });
      state.founders = all;
      render();
    }).catch(function () { /* hors ligne : on garde les valeurs par défaut */ });
  }

  // ---------- Partage d'une publication par les visiteurs ----------
  function shareUrl(network, url, title) {
    var u = encodeURIComponent(url), t = encodeURIComponent(title || "");
    return {
      facebook: "https://www.facebook.com/sharer/sharer.php?u=" + u,
      whatsapp: "https://wa.me/?text=" + encodeURIComponent((title ? title + " — " : "") + url),
      linkedin: "https://www.linkedin.com/sharing/share-offsite/?url=" + u,
      x: "https://twitter.com/intent/tweet?text=" + t + "&url=" + u
    }[network];
  }

  // Renvoie le HTML d'une barre « Partager » (utilisée par les cartes d'actualité et le magazine)
  function shareBar(url, title) {
    var abs = new URL(url, location.origin).href;
    var esc = function (s) { return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;"); };
    var items = ["facebook", "whatsapp", "linkedin", "x"].map(function (n) {
      return '<a class="soc" href="' + esc(shareUrl(n, abs, title)) + '" target="_blank" rel="noopener noreferrer" ' +
        'aria-label="Partager sur ' + NAMES[n] + '" title="Partager sur ' + NAMES[n] + '">' + svg(n) + "</a>";
    }).join("");
    items += '<button class="soc soc-copy" type="button" data-copy="' + esc(abs) + '" aria-label="Copier le lien" title="Copier le lien">' + svg("link") + "</button>";
    return '<div class="share-bar"><span class="share-label">' + svg("share") + " Partager</span>" + items + "</div>";
  }

  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-copy]");
    if (!b) return;
    var url = b.getAttribute("data-copy");
    var done = function () { b.classList.add("copied"); b.title = "Lien copié !"; setTimeout(function () { b.classList.remove("copied"); b.title = "Copier le lien"; }, 1800); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, function () { window.prompt("Copiez ce lien :", url); });
    else window.prompt("Copiez ce lien :", url);
  });

  window.RectoySocial = { row: row, svg: svg, shareBar: shareBar, names: NAMES, render: render };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
