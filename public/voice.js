/* RECTOY-AIRES — voix : l'assistant lit à voix haute, écoute au micro et guide la visite du site.
   Utilise les fonctions vocales du navigateur (gratuit, sans clé) :
   - lecture : SpeechSynthesis (Chrome, Edge, Safari, Firefox)
   - dictée  : SpeechRecognition (Chrome, Edge, Safari ; absente de Firefox → le micro est alors masqué)
   La qualité de la voix dépend de l'appareil. Aucun enregistrement n'est conservé par RECTOY-AIRES. */
(function () {
  "use strict";

  var synth = window.speechSynthesis;
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var supported = { tts: !!(synth && window.SpeechSynthesisUtterance), stt: !!SR };
  var reduceMotion = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var KEY = "ra_voice_replies";

  // ---------- Lecture à voix haute ----------
  var token = 0, cachedVoice = null;

  function pickVoice() {
    if (cachedVoice) return cachedVoice;
    var fr = (synth.getVoices() || []).filter(function (v) { return /^fr/i.test(v.lang); });
    if (!fr.length) return null;
    var good = /google.*fran|microsoft.*(denise|eloise|vivienne|henri|remy)|am[ée]lie|thomas|audrey|marie|hortense|julie|paul/i;
    cachedVoice = fr.filter(function (v) { return good.test(v.name); })[0] ||
      fr.filter(function (v) { return /^fr-FR/i.test(v.lang); })[0] || fr[0];
    return cachedVoice;
  }
  if (supported.tts && synth.addEventListener) synth.addEventListener("voiceschanged", function () { cachedVoice = null; });

  // Les longs textes sont coupés en phrases : certains navigateurs s'arrêtent après ~15 s.
  function chunks(text) {
    var clean = String(text || "").replace(/\s+/g, " ").trim();
    if (!clean) return [];
    var parts = clean.match(/[^.!?…;:]+[.!?…;:]*\s*/g) || [clean], out = [], buf = "";
    parts.forEach(function (p) {
      if (buf && (buf + p).length > 200) { out.push(buf.trim()); buf = p; } else buf += p;
    });
    if (buf.trim()) out.push(buf.trim());
    return out;
  }

  function stop() {
    token++;
    if (supported.tts) synth.cancel();
  }

  function speak(text, onend) {
    if (!supported.tts) { if (onend) onend(); return false; }
    stop();
    var mine = token, list = chunks(text), i = 0;
    if (!list.length) { if (onend) onend(); return false; }
    (function next() {
      if (mine !== token) return;
      if (i >= list.length) { if (onend) onend(); return; }
      var u = new SpeechSynthesisUtterance(list[i++]);
      u.lang = "fr-FR"; u.rate = 1; u.pitch = 1;
      var v = pickVoice(); if (v) u.voice = v;
      u.onend = next;
      u.onerror = function (e) {
        if (mine !== token || e.error === "canceled" || e.error === "interrupted") return;
        if (onend) onend(e);
      };
      synth.speak(u);
    })();
    return true;
  }

  function repliesOn() { try { return localStorage.getItem(KEY) === "1"; } catch (e) { return false; } }
  function setRepliesOn(on) { try { localStorage.setItem(KEY, on ? "1" : "0"); } catch (e) {} if (!on) stop(); }

  // ---------- Dictée (micro) ----------
  var rec = null;
  function listen(cb) {
    if (!SR) return false;
    stopListening(); stop();
    rec = new SR();
    rec.lang = "fr-FR"; rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1;
    rec.onresult = function (e) {
      var text = "", final = false;
      for (var i = e.resultIndex; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
        if (e.results[i].isFinal) final = true;
      }
      if (cb.result) cb.result(text.trim(), final);
    };
    rec.onerror = function (e) { if (cb.error) cb.error(e.error); };
    rec.onend = function () { rec = null; if (cb.end) cb.end(); };
    try { rec.start(); } catch (e) { rec = null; if (cb.error) cb.error("start"); return false; }
    return true;
  }
  function stopListening() { if (rec) { try { rec.stop(); } catch (e) {} } }

  // ---------- Visite guidée ----------
  // Chaque étape : une section de l'accueil + le texte lu. Modifiez librement ces textes.
  var STEPS = [
    { sel: "#accueil", text: "Bonjour et bienvenue sur RECTOY-AIRES, l'entreprise technologique dont la signature est : Technologie, Innovation, Impact. Je vous propose une courte visite guidée du site." },
    { sel: "#apropos", text: "RECTOY-AIRES est une entreprise technologique orientée vers la création de solutions numériques, informatiques et innovantes. Son objectif : accompagner les entreprises, les professionnels et les populations dans leur transformation numérique, avec une technologie utile, accessible et fiable." },
    { sel: "#mission", text: "Notre mission : transformer les idées en solutions, et contribuer à la construction d'un écosystème technologique africain fort." },
    { sel: "#services", text: "Huit domaines d'intervention : développement informatique, digitalisation, cybersécurité, audiovisuel, communication numérique, innovation technologique, solutions mobiles, et électronique et technologie." },
    { sel: "#projets", text: "Trois projets principaux. RECTOY BUSINESS, le projet phare, accompagne les entreprises dans leur gestion et leur organisation. La plateforme numérique facilite l'accès aux services numériques. Et Virtual Commerce développe le commerce numérique." },
    { sel: "#videos", text: "Voici nos publicités et reportages en vidéo. Cliquez sur une vidéo pour la regarder en grand." },
    { sel: "#magazine", text: "RECTOY Magazine est le journal des entrepreneurs, des PME et des investisseurs : portraits, reportages, produits et activités." },
    { sel: "#fondateurs", text: "Sept cofondateurs aux profils complémentaires, chacun responsable d'un pôle. Le bouton Biographie de chaque carte vous présente son parcours." },
    { sel: "#vision", text: "Notre vision : de l'Afrique vers le monde, autour de quatre valeurs : l'Afrique, l'innovation, l'international et l'impact." },
    { sel: "#contact", text: "Pour nous écrire, utilisez le formulaire, WhatsApp, ou demandez un conseiller depuis l'assistant. Merci pour votre visite, et à très bientôt." }
  ];

  var tour = { active: false, i: 0, paused: false, steps: [], ui: null, timer: null, target: null };

  function visible(el) { return !!(el && el.getClientRects().length); }

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function btn(label, text, onClick, cls) {
    var b = el("button", cls || "", text); b.type = "button"; b.setAttribute("aria-label", label); b.title = label;
    b.addEventListener("click", onClick); return b;
  }

  function buildTourUI() {
    var ui = el("section", "ra-tour"); ui.setAttribute("role", "region"); ui.setAttribute("aria-label", "Visite guidée vocale");
    var head = el("div", "ra-tour-head");
    ui.count = el("strong", null, "Visite guidée");
    head.appendChild(ui.count);
    head.appendChild(btn("Quitter la visite", "✕", quitTour, "ra-tour-x"));
    ui.caption = el("p", "ra-tour-caption"); ui.caption.setAttribute("aria-live", "polite");
    var bar = el("div", "ra-tour-bar"); ui.fill = el("span"); bar.appendChild(ui.fill);
    var row = el("div", "ra-tour-row");
    ui.prev = btn("Étape précédente", "⏮", function () { go(tour.i - 1); });
    ui.pause = btn("Mettre en pause", "⏸", togglePause, "main");
    ui.next = btn("Étape suivante", "⏭", function () { go(tour.i + 1); });
    row.appendChild(ui.prev); row.appendChild(ui.pause); row.appendChild(ui.next);
    ui.appendChild(head); ui.appendChild(ui.caption); ui.appendChild(bar); ui.appendChild(row);
    document.body.appendChild(ui);
    return ui;
  }

  function clearTarget() {
    if (tour.target) { tour.target.classList.remove("ra-tour-focus"); tour.target.style.scrollMarginTop = ""; tour.target = null; }
  }

  function go(i) {
    clearTimeout(tour.timer); stop();
    if (i < 0) i = 0;
    if (i >= tour.steps.length) return finishTour();
    tour.i = i; tour.paused = false;
    var step = tour.steps[i], ui = tour.ui;
    ui.classList.remove("done");
    ui.count.textContent = "Visite guidée · " + (i + 1) + " / " + tour.steps.length;
    ui.fill.style.width = ((i + 1) / tour.steps.length * 100) + "%";
    ui.caption.textContent = step.text;
    ui.pause.textContent = "⏸"; ui.pause.setAttribute("aria-label", "Mettre en pause"); ui.pause.title = "Mettre en pause";
    ui.prev.disabled = i === 0; ui.next.disabled = false;

    clearTarget();
    var node = document.querySelector(step.sel);
    if (visible(node)) {
      tour.target = node;
      node.style.scrollMarginTop = "84px";
      node.classList.add("ra-tour-focus");
      node.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    }
    readStep();
  }

  function readStep() {
    var step = tour.steps[tour.i], mine = tour.i;
    var after = function () { if (tour.active && !tour.paused && tour.i === mine) tour.timer = setTimeout(function () { go(mine + 1); }, 700); };
    if (supported.tts) speak(step.text, after);
    else tour.timer = setTimeout(after, Math.max(4500, step.text.length * 60));   // sans voix : sous-titres seuls
  }

  function togglePause() {
    var ui = tour.ui;
    if (ui.classList.contains("done")) { go(0); return; }          // « Recommencer » après la fin
    if (tour.paused) {
      tour.paused = false; ui.pause.textContent = "⏸"; ui.pause.setAttribute("aria-label", "Mettre en pause"); ui.pause.title = "Mettre en pause";
      readStep();
    } else {
      tour.paused = true; clearTimeout(tour.timer); stop();
      ui.pause.textContent = "▶"; ui.pause.setAttribute("aria-label", "Reprendre la lecture"); ui.pause.title = "Reprendre la lecture";
    }
  }

  function finishTour() {
    clearTarget(); tour.paused = true;
    var ui = tour.ui;
    ui.classList.add("done");
    ui.count.textContent = "Visite terminée";
    ui.caption.textContent = "Merci ! Posez-moi vos questions dans l'assistant, ou parlez à un conseiller.";
    ui.fill.style.width = "100%";
    ui.pause.textContent = "↺"; ui.pause.setAttribute("aria-label", "Recommencer la visite"); ui.pause.title = "Recommencer la visite";
    ui.next.disabled = true;
  }

  function quitTour() {
    if (!tour.active) return;
    tour.active = false; clearTimeout(tour.timer); stop(); clearTarget();
    if (tour.ui) { tour.ui.remove(); tour.ui = null; }
  }

  function startTour() {
    var home = document.getElementById("accueil");
    if (!home) { location.href = "/?tour=1"; return; }          // hors accueil : on y retourne, puis on propose la visite
    if (window.RectoyAssistant && window.RectoyAssistant.close) window.RectoyAssistant.close();
    var offer = document.querySelector(".ra-tour-offer"); if (offer) offer.remove();
    quitTour();
    tour.steps = STEPS.filter(function (s) { return visible(document.querySelector(s.sel)); });
    tour.active = true; tour.ui = buildTourUI();
    var nav = document.getElementById("nav"), toggle = document.getElementById("menuToggle");
    if (nav && nav.classList.contains("active") && toggle) toggle.click();   // referme le menu mobile
    go(0);
  }

  // Proposition de visite à l'arrivée par /?tour=1 (une action de l'utilisateur est nécessaire pour parler)
  function offerTour() {
    var box = el("section", "ra-tour-offer"); box.setAttribute("role", "dialog"); box.setAttribute("aria-label", "Visite guidée");
    box.appendChild(el("strong", null, "Visite guidée vocale"));
    box.appendChild(el("p", null, supported.tts
      ? "L'assistant vous présente RECTOY-AIRES à voix haute, section par section."
      : "L'assistant vous présente RECTOY-AIRES section par section (lecture à l'écran)."));
    var row = el("div", "ra-tour-row");
    row.appendChild(btn("Lancer la visite guidée", "▶ Lancer la visite", startTour, "main"));
    row.appendChild(btn("Plus tard", "Plus tard", function () { box.remove(); }));
    box.appendChild(row);
    document.body.appendChild(box);
    box.querySelector(".main").focus({ preventScroll: true });
  }

  function stopAll() { stop(); stopListening(); quitTour(); }

  // ---------- Déclencheurs ----------
  document.addEventListener("click", function (e) {
    if (e.target.closest && e.target.closest("[data-tour-start]")) { e.preventDefault(); startTour(); }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && tour.active && !document.querySelector(".vd-modal:not([hidden])")) quitTour();
  });
  document.addEventListener("visibilitychange", function () { if (document.hidden && tour.active && !tour.paused && tour.ui) togglePause(); });
  window.addEventListener("pagehide", function () { if (supported.tts) synth.cancel(); });

  function init() {
    if (document.getElementById("accueil") && (/[?&]tour=1/.test(location.search) || location.hash === "#visite")) {
      if (window.history && history.replaceState) history.replaceState(null, "", location.pathname);
      setTimeout(offerTour, 600);
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();

  window.RectoyVoice = {
    supported: supported, speak: speak, stop: stop, stopAll: stopAll,
    listen: listen, stopListening: stopListening,
    repliesOn: repliesOn, setRepliesOn: setRepliesOn,
    startTour: startTour, quitTour: quitTour
  };
})();
