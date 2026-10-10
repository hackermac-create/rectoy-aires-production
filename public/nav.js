/* RECTOY-AIRES — menu et pied de page UNIQUES pour toutes les pages publiques.
   Pour ajouter ou renommer une entrée : modifiez NAV ci-dessous (une seule fois, partout).
   Chargé de façon synchrone juste après <header id="header"> et <footer id="siteFooter">
   (aucun saut d'affichage). */
(function () {
  "use strict";

  var script = document.currentScript;
  var part = script && script.getAttribute("data-part");

  var path = location.pathname.replace(/index\.html$/, "").replace(/\/+$/, "") || "/";
  var isHome = path === "/";

  // t = libellé · d = sous-titre · id = section de l'accueil · page = page dédiée
  var NAV = [
    { t: "Accueil", id: "accueil", home: true },
    { t: "Entreprise", kids: [
      { t: "À propos", d: "Qui sommes-nous ?", id: "apropos" },
      { t: "Mission", d: "Ce qui nous guide", id: "mission" },
      { t: "Vision", d: "De l'Afrique vers le monde", id: "vision" },
      { t: "Équipe fondatrice", d: "Les sept cofondateurs", id: "fondateurs" }
    ] },
    { t: "Expertises", id: "services" },
    { t: "Projets", id: "projets" },
    { t: "Médias", kids: [
      { t: "RECTOY Magazine", d: "Portraits, reportages, investisseurs", id: "magazine", page: "/magazine.html" },
      { t: "Vidéos", d: "Publicités et reportages en vidéo", id: "videos", page: "/videos.html" },
      { t: "Actualités", d: "Annonces et événements", id: "actualites" }
    ] }
  ];

  var ICON_HEADPHONES = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4.5" height="6.5" rx="1.6"/><rect x="16.5" y="14" width="4.5" height="6.5" rx="1.6"/></svg>';

  function href(item) {
    if (item.page) return item.page;
    if (item.home) return isHome ? "#accueil" : "/";
    return (isHome ? "#" : "/#") + item.id;
  }
  function isCurrent(item) { return !!item.page && item.page === path; }

  function link(item, sub) {
    var cur = isCurrent(item);
    var attrs = ' href="' + href(item) + '"' +
      (isHome && item.id ? ' data-spy="' + item.id + '"' : "") +
      (cur ? ' class="is-active" aria-current="page"' : "");
    return sub
      ? "<a" + attrs + "><strong>" + item.t + "</strong><small>" + item.d + "</small></a>"
      : "<a" + attrs + ">" + item.t + "</a>";
  }

  function buildHeader(header) {
    var items = NAV.map(function (item) {
      if (!item.kids) return link(item, false);
      var active = item.kids.some(isCurrent);
      var spy = isHome ? ' data-spy-group="' + item.kids.map(function (k) { return k.id; }).join(" ") + '"' : "";
      return '<div class="nav-group' + (active ? " is-active" : "") + '"' + spy + ">" +
        '<button class="nav-drop" type="button" aria-expanded="false" aria-haspopup="true">' + item.t +
        ' <span class="caret" aria-hidden="true"></span></button>' +
        '<div class="nav-sub">' + item.kids.map(function (k) { return link(k, true); }).join("") + "</div></div>";
    }).join("");

    var contact = (isHome ? "#contact" : "/#contact");
    header.className = "header" + (isHome ? "" : " scrolled");
    header.innerHTML =
      '<span class="scroll-progress" id="scrollProgress" aria-hidden="true"></span>' +
      '<div class="container nav-container">' +
      '<a href="' + (isHome ? "#accueil" : "/") + '" class="logo" aria-label="RECTOY-AIRES — Accueil">' +
      '<img src="/src/logo.jpeg" alt="Logo RECTOY-AIRES" width="44" height="44" decoding="async"><span>RECTOY<span>-AIRES</span></span></a>' +
      '<nav class="nav" id="nav" aria-label="Navigation principale">' + items +
      '<div class="nav-mobile-foot"><button class="nav-tour" type="button" data-tour-start>' + ICON_HEADPHONES + ' Visite guidée vocale</button>' +
      '<span class="nav-foot-label">Suivez-nous</span><div class="social-row" data-social></div>' +
      '<a href="' + contact + '" class="btn btn-primary btn-full">Nous contacter</a></div></nav>' +
      '<div class="nav-actions"><div class="social-row social-row-header" data-social="header"></div>' +
      '<button class="nav-tour" type="button" data-tour-start title="Écouter une présentation guidée du site" aria-label="Lancer la visite guidée vocale">' + ICON_HEADPHONES + "<span>Visite guidée</span></button>" +
      '<a href="' + contact + '" class="btn btn-primary nav-cta"' + (isHome ? ' data-spy="contact"' : "") + ">Nous contacter</a></div>" +
      '<button class="menu-toggle" id="menuToggle" type="button" aria-label="Ouvrir le menu" aria-controls="nav" aria-expanded="false">' +
      '<span class="bars" aria-hidden="true"><i></i><i></i><i></i></span></button></div>';
  }

  function buildFooter(footer) {
    var root = isHome ? "#" : "/#";
    footer.className = "footer";
    footer.innerHTML =
      '<div class="container footer-grid">' +
      '<div class="footer-brand"><a href="' + (isHome ? "#accueil" : "/") + '" class="logo"><img src="/src/logo.jpeg" alt="RECTOY-AIRES" width="44" height="44" loading="lazy"><span>RECTOY<span>-AIRES</span></span></a>' +
      "<p>Technologie, innovation et impact au service du monde.</p></div>" +
      '<div class="footer-links"><h4>Entreprise</h4><a href="' + root + 'apropos">À propos</a><a href="' + root + 'mission">Mission</a><a href="' + root + 'vision">Vision</a>' +
      '<a href="' + root + 'fondateurs">Équipe fondatrice</a><a href="' + root + 'services">Expertises</a><a href="' + root + 'projets">Projets</a></div>' +
      '<div class="footer-links"><h4>Médias</h4><a href="/magazine.html">RECTOY Magazine</a><a href="/videos.html">Vidéos</a><a href="' + root + 'actualites">Actualités</a><a href="' + root + 'contact">Nous contacter</a></div>' +
      '<div class="footer-links"><h4>Suivez-nous</h4><div class="social-row social-row-labels footer-social" data-social="labels"></div></div></div>' +
      '<div class="footer-bottom"><div class="container"><p>© <span id="year">' + new Date().getFullYear() + '</span> RECTOY-AIRES. Tous droits réservés.</p></div></div>';
  }

  if (part === "footer") {
    var f = document.getElementById("siteFooter");
    if (f) buildFooter(f);
  } else {
    var h = document.getElementById("header");
    if (h) buildHeader(h);
  }
})();
