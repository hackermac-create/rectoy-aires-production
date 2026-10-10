/* RECTOY-AIRES — interactions professionnelles (boutons, formulaires, liens) */
(function () {
  "use strict";

  // Effet d'onde au clic sur les boutons
  var RIPPLE_SEL = ".btn, .primary-btn, .secondary-btn, .filter-btn, .btn-bio, .ra-btn";
  document.addEventListener("pointerdown", function (e) {
    var btn = e.target.closest && e.target.closest(RIPPLE_SEL);
    if (!btn || btn.disabled || btn.getAttribute("aria-disabled") === "true") return;
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var r = btn.getBoundingClientRect(), size = Math.max(r.width, r.height);
    var s = document.createElement("span");
    s.className = "ripple";
    s.style.width = s.style.height = size + "px";
    s.style.left = (e.clientX - r.left - size / 2) + "px";
    s.style.top = (e.clientY - r.top - size / 2) + "px";
    btn.appendChild(s);
    setTimeout(function () { s.remove(); }, 650);
  }, { passive: true });

  // Bouton d'envoi : état « chargement » automatique quand le script le désactive
  function watchSubmit(btn) {
    new MutationObserver(function () {
      var busy = btn.disabled;
      btn.classList.toggle("is-loading", busy);
      btn.setAttribute("aria-busy", busy ? "true" : "false");
    }).observe(btn, { attributes: true, attributeFilter: ["disabled"] });
  }
  document.querySelectorAll("form button[type='submit']").forEach(watchSubmit);

  // Liens « # » sans destination : pas de saut en haut de page
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href='#']");
    if (!a) return;
    e.preventDefault();
    if (a.closest(".founder-socials, .footer-links")) {
      a.classList.add("is-soon");
      a.setAttribute("aria-disabled", "true");
      a.title = "Bientôt disponible";
    }
  });
  document.querySelectorAll(".founder-socials a[href='#'], .footer-links a[href='#']").forEach(function (a) {
    a.classList.add("is-soon"); a.setAttribute("aria-disabled", "true"); a.title = "Bientôt disponible"; a.tabIndex = -1;
  });
})();
