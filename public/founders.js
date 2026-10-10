/* RECTOY-AIRES — biographies des cofondateurs
   Pour enrichir une biographie : modifiez l'entrée correspondante ci-dessous
   (bio = paragraphes, apports = liste à puces, domaines = pastilles). */
(function () {
  "use strict";

  var FOUNDERS = {
    "emmanuel": {
      nom: "Emmanuel Yann Ako",
      role: "FONDATEUR & DIRECTEUR GÉNÉRAL (CEO)",
      domaines: ["Direction générale", "Vision", "Technologie", "Innovation"],
      bio: [
        "Fondateur et Directeur Général de RECTOY-AIRES, Emmanuel Yann Ako est passionné par l'informatique, la programmation et les nouvelles technologies.",
        "Il porte la vision de l'entreprise, coordonne les pôles et veille à ce que toutes les activités restent cohérentes avec la mission, les objectifs et l'image de RECTOY-AIRES."
],
      apports: [
        "Définir la vision, la mission, les valeurs et les objectifs de l'entreprise",
        "Superviser l'ensemble des directions et assurer leur coordination",
        "Valider les projets, partenariats, budgets et engagements importants",
        "Piloter les projets numériques et technologiques",
        "Représenter RECTOY-AIRES auprès des investisseurs, institutions, mairies, grandes entreprises et partenaires",
        "Veiller à la protection du nom, de l'image, des données et des actifs de l'entreprise"
]
    },
    "franky": {
      nom: "Traoré Franck",
      role: "DIRECTEUR MARKETING, COMMERCIAL & DÉVELOPPEMENT DES AFFAIRES",
      domaines: ["Marketing", "Commercial", "Développement des affaires", "Partenariats"],
      bio: [
        "Cofondateur de RECTOY-AIRES, Traoré Franck possède une formation en marketing de niveau Master et une expérience commerciale.",
        "Il prend la responsabilité de transformer les offres de l'entreprise en opportunités commerciales et de développer son portefeuille de clients et de partenaires."
],
      apports: [
        "Élaborer la stratégie marketing et commerciale",
        "Identifier les marchés cibles : PME, grandes entreprises, commerçants et institutions",
        "Prospecter et convertir de nouveaux clients",
        "Construire les offres commerciales, tarifs, abonnements et packages publicitaires",
        "Développer les partenariats commerciaux et piloter les campagnes avec la communication et le design"
]
    },
    "louoba": {
      nom: "Louoba Demene Carelle Emmanuella Aleba",
      role: "DIRECTRICE COMMUNICATION VISUELLE & IMAGE DE MARQUE",
      domaines: ["Communication visuelle", "Image de marque", "Audiovisuel", "Création"],
      bio: [
        "Cofondatrice de RECTOY-AIRES, Louoba Demene Carelle Emmanuella Aleba est actrice dans le domaine de l'audiovisuel et de la communication.",
        "Spécialisée en communication visuelle, elle assure la cohérence de l'image publique de l'entreprise et la manière dont RECTOY-AIRES se raconte et se rend visible."
],
      apports: [
        "Définir et maintenir l'identité visuelle de RECTOY-AIRES",
        "Concevoir les supports de communication et les publicités",
        "Préparer les contenus destinés aux réseaux sociaux et aux campagnes",
        "Veiller à la cohérence du logo, des couleurs et des typographies"
]
    },
    "marilyne": {
      nom: "Mary Josephine",
      role: "DIRECTRICE ARCHITECTURE & PROJETS",
      domaines: ["Architecture", "Conduite de projets", "Gouvernance", "Produits"],
      bio: [
        "Architecte inscrite à l'Ordre des architectes et doctorante en développement urbain durable, Mary Josephine apporte à RECTOY-AIRES son expertise en architecture, en stratégie, en gouvernance et en structuration des projets.",
        "PDG de MACERAT.S, elle participe au cadrage des projets, au positionnement de l'entreprise ainsi qu'à la conception des produits et des offres, dans le respect des règles professionnelles applicables."
],
      apports: [
        "Conseiller la Direction sur les projets architecturaux",
        "Contribuer à la conception et à la supervision des projets de son domaine",
        "Développer les relations avec architectes, bureaux d'études, promoteurs et entreprises partenaires",
        "Identifier des opportunités dans l'architecture, l'immobilier, l'aménagement et les espaces professionnels"
]
    },
    "odilon": {
      nom: "Odilon Silyverter N'Guessan",
      role: "DIRECTEUR DESIGN, INFOGRAPHIE & CRÉATION",
      domaines: ["Design", "Infographie", "UI / UX", "Anglais"],
      bio: [
        "Cofondateur de RECTOY-AIRES, Odilon Silyverter N'Guessan est en Master 2 d'anglais et très performant en design et en infographie.",
        "Il prend en charge la création graphique ainsi qu'une partie de l'expérience visuelle des produits et supports numériques de l'entreprise."
],
      apports: [
        "Créer les maquettes graphiques des sites, applications et plateformes",
        "Produire les supports d'infographie et de présentation",
        "Contribuer à l'UI/UX des produits numériques avec le pôle technique",
        "Préparer des présentations professionnelles pour les clients et investisseurs"
]
    },
    "jean-daniel": {
      nom: "Jean-Daniel Ehiman",
      role: "DIRECTEUR ORGANISATION, ÉVÉNEMENTIEL & RELATIONS INSTITUTIONNELLES",
      domaines: ["Organisation", "Événementiel", "Relations institutionnelles", "Partenariats"],
      bio: [
        "Géographe de formation, Jean-Daniel Ehiman contribue à la structuration et à l'organisation de RECTOY-AIRES.",
        "Fort d'une expérience dans l'organisation de réunions et de grandes cérémonies, il est chargé de la coordination opérationnelle des rencontres, événements et activités qui demandent une forte organisation logistique."
],
      apports: [
        "Organiser les réunions internes et externes",
        "Coordonner les événements, conférences, présentations et rencontres professionnelles",
        "Faciliter les relations avec les institutions et partenaires lors des événements",
        "Assurer le suivi des décisions prises pendant les réunions"
]
    },
    "kablan": {
      nom: "Kablan Raymond",
      role: "DIRECTEUR TECHNIQUE, MAINTENANCE & SOLUTIONS INDUSTRIELLES",
      domaines: ["Maintenance", "Solutions industrielles", "B2B", "Réseau de techniciens"],
      bio: [
        "Cofondateur de RECTOY-AIRES, Kablan Raymond travaille en freelance dans la maintenance de grandes machines d'entreprises.",
        "Il apporte à l'entreprise une compétence technique orientée vers les entreprises et les environnements industriels, et développe son potentiel B2B dans l'industrie."
],
      apports: [
        "Identifier les besoins techniques et de maintenance des entreprises clientes",
        "Développer les offres de services techniques et de maintenance",
        "Construire un réseau de techniciens et de prestataires spécialisés",
        "Participer aux diagnostics et aux propositions techniques de son domaine"
]
    }
  };

  var order = Object.keys(FOUNDERS);
  var overlay, modal, lastFocus, currentKey;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function photoFor(key) {
    var card = document.querySelector('.founder-card[data-founder="' + key + '"] .founder-image img');
    return card ? card.getAttribute("src") : "src/logo.jpeg";
  }

  function build() {
    overlay = el("div", "bio-overlay");
    overlay.setAttribute("aria-hidden", "true");
    modal = el("div", "bio-modal");
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "bioTitle");
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
    document.addEventListener("keydown", function (e) {
      if (!overlay.classList.contains("open")) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "Tab") trap(e);
    });
  }

  function render(key) {
    var f = FOUNDERS[key]; currentKey = key;
    modal.textContent = "";

    var side = el("div", "bio-side");
    var img = el("img", "bio-photo");
    img.src = photoFor(key); img.alt = f.nom;
    img.addEventListener("error", function () { img.src = "src/logo.jpeg"; }, { once: true });
    var name = el("h3", null, f.nom); name.id = "bioTitle";
    side.appendChild(img);
    side.appendChild(el("span", "bio-role", f.role));
    side.appendChild(name);
    var chips = el("ul", "bio-chips");
    f.domaines.forEach(function (d) { chips.appendChild(el("li", null, d)); });
    side.appendChild(chips);

    var body = el("div", "bio-body");
    body.appendChild(el("h4", null, "Biographie"));
    f.bio.forEach(function (p) { body.appendChild(el("p", null, p)); });
    if (f.apports && f.apports.length) {
      body.appendChild(el("h4", null, "Responsabilités"));
      var ul = el("ul");
      f.apports.forEach(function (a) { ul.appendChild(el("li", null, a)); });
      body.appendChild(ul);
    }

    var actions = el("div", "bio-actions");
    var wa = el("a", "ra-btn whatsapp", "Écrire sur WhatsApp");
    wa.href = "https://wa.me/2250705801517?text=" + encodeURIComponent("Bonjour, je souhaite échanger avec " + f.nom + ".");
    wa.target = "_blank"; wa.rel = "noopener noreferrer";
    var team = el("button", "ra-btn", "Voir toute l'équipe");
    team.type = "button"; team.addEventListener("click", close);
    actions.appendChild(wa); actions.appendChild(team);
    body.appendChild(actions);

    var nav = el("div", "bio-nav");
    var prev = el("button", null, "← " + FOUNDERS[order[(order.indexOf(key) + order.length - 1) % order.length]].nom.split(" ")[0]);
    var next = el("button", null, FOUNDERS[order[(order.indexOf(key) + 1) % order.length]].nom.split(" ")[0] + " →");
    prev.type = next.type = "button";
    prev.addEventListener("click", function () { step(-1); });
    next.addEventListener("click", function () { step(1); });
    nav.appendChild(prev); nav.appendChild(next);
    body.appendChild(nav);

    var closeBtn = el("button", "bio-close", "✕");
    closeBtn.type = "button"; closeBtn.setAttribute("aria-label", "Fermer la biographie");
    closeBtn.addEventListener("click", close);

    modal.appendChild(closeBtn); modal.appendChild(side); modal.appendChild(body);
    modal.scrollTop = 0;
  }

  function open(key, trigger) {
    if (!FOUNDERS[key]) return;
    if (!overlay) build();
    lastFocus = trigger || document.activeElement;
    render(key);
    overlay.classList.add("open"); overlay.setAttribute("aria-hidden", "false");
    document.documentElement.style.overflow = "hidden";
    modal.querySelector(".bio-close").focus();
  }
  function close() {
    if (!overlay) return;
    overlay.classList.remove("open"); overlay.setAttribute("aria-hidden", "true");
    document.documentElement.style.overflow = "";
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function step(dir) {
    var i = (order.indexOf(currentKey) + dir + order.length) % order.length;
    render(order[i]);
    modal.querySelector(".bio-close").focus();
  }
  function trap(e) {
    var f = modal.querySelectorAll("button, a[href]");
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-bio]");
    if (b) open(b.getAttribute("data-bio"), b);
  });

  // Lien direct : /#fondateurs?bio=marilyne  ou  ?bio=marilyne
  var q = new URLSearchParams(location.search).get("bio");
  if (q && FOUNDERS[q]) setTimeout(function () { open(q); }, 300);
})();
