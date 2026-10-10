/* Barre de navigation commune à toutes les pages d'administration (même ordre, même libellés). */
(function () {
  "use strict";
  var page = location.pathname.split("/").pop() || "index.html";
  var ITEMS = [
    ["index.html", "📊 Tableau de bord"],
    ["magazine.html", "📖 Magazine"],
    ["videos.html", "🎬 Vidéos"],
    ["social.html", "🔗 Réseaux"],
    ["conseiller.html", "💬 Conseiller"]
  ];
  var bar = document.getElementById("adminbar");
  if (!bar) return;
  bar.className = "adminbar";
  bar.setAttribute("aria-label", "Navigation de l'administration");
  bar.innerHTML = ITEMS.map(function (i) {
    return '<a href="' + i[0] + '"' + (i[0] === page ? ' class="is-active" aria-current="page"' : "") + ">" + i[1] + "</a>";
  }).join("") + '<a class="adminbar-site" href="/" target="_blank" rel="noopener">🌐 Voir le site</a>';
})();
