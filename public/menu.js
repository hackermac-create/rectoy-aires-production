/* RECTOY-AIRES — menu : panneau mobile, sous-menu, section active, progression de lecture */
(function () {
  "use strict";

  var header = document.getElementById("header");
  var toggle = document.getElementById("menuToggle");
  var nav = document.getElementById("nav");
  var bar = document.getElementById("scrollProgress");
  var html = document.documentElement;
  if (!nav) return;

  // ---------- Panneau mobile ----------
  function setOpen(open) {
    nav.classList.toggle("active", open);
    html.classList.toggle("menu-open", open);
    if (toggle) {
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
    }
  }
  if (toggle) toggle.addEventListener("click", function () { setOpen(!nav.classList.contains("active")); });
  nav.addEventListener("click", function (e) { if (e.target.closest("a")) setOpen(false); });
  window.addEventListener("resize", function () { if (window.innerWidth > 960) setOpen(false); });

  // ---------- Sous-menus (Entreprise, Médias…) : survol, clavier, tactile ----------
  var navGroups = Array.prototype.slice.call(nav.querySelectorAll(".nav-group"));
  function setGroup(group, open) {
    group.classList.toggle("open", open);
    var btn = group.querySelector(".nav-drop");
    if (btn) btn.setAttribute("aria-expanded", open ? "true" : "false");
  }
  function closeDrops(except) { navGroups.forEach(function (g) { if (g !== except) setGroup(g, false); }); }
  navGroups.forEach(function (group) {
    var btn = group.querySelector(".nav-drop");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var open = !group.classList.contains("open");
      closeDrops(group);
      setGroup(group, open);
    });
    // Flèche bas : ouvre et place le focus sur la première entrée
    btn.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowDown") return;
      e.preventDefault(); closeDrops(group); setGroup(group, true);
      var first = group.querySelector(".nav-sub a"); if (first) first.focus();
    });
    group.addEventListener("focusout", function (e) {
      if (!group.contains(e.relatedTarget)) setGroup(group, false);
    });
  });
  document.addEventListener("click", function (e) { if (!nav.contains(e.target)) closeDrops(); });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    var openGroup = navGroups.filter(function (g) { return g.classList.contains("open"); })[0];
    closeDrops();
    if (openGroup) { var b = openGroup.querySelector(".nav-drop"); if (b) b.focus(); }
    if (nav.classList.contains("active")) { setOpen(false); if (toggle) toggle.focus(); }
  });

  // ---------- Section active (scrollspy) ----------
  var links = Array.prototype.slice.call(document.querySelectorAll("[data-spy]"));
  var groups = Array.prototype.slice.call(nav.querySelectorAll("[data-spy-group]"));
  var sections = [];
  links.forEach(function (a) {
    var id = a.getAttribute("data-spy"), el = document.getElementById(id);
    if (el && sections.indexOf(el) === -1) sections.push(el);
  });
  sections.sort(function (a, b) { return a.offsetTop - b.offsetTop; });

  function setActive(id) {
    links.forEach(function (a) {
      var on = a.getAttribute("data-spy") === id;
      a.classList.toggle("is-active", on);
      if (on) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
    });
    groups.forEach(function (g) {
      g.classList.toggle("is-active", g.getAttribute("data-spy-group").split(" ").indexOf(id) !== -1);
    });
  }

  function update() {
    var y = window.scrollY + (header ? header.offsetHeight : 78) + 80, current = "", best = -1;
    var bottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
    sections.forEach(function (s) {
      if (!s.getClientRects().length) return;            // section masquée (ex. vidéos pas encore publiées)
      if (s.offsetTop <= y && s.offsetTop >= best) { best = s.offsetTop; current = s.id; }
    });
    if (bottom && document.getElementById("contact")) current = "contact";
    setActive(current);
    if (bar) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = "scaleX(" + (max > 0 ? Math.min(window.scrollY / max, 1) : 0) + ")";
    }
  }
  var ticking = false;
  window.addEventListener("scroll", function () {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () { update(); ticking = false; });
  }, { passive: true });
  window.addEventListener("load", function () { sections.sort(function (a, b) { return a.offsetTop - b.offsetTop; }); update(); });
  update();
})();
