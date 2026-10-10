/* RECTOY-AIRES — assistant IA avec relais vers un conseiller */
(function () {
  "use strict";

  var API = (window.location.port === "5500" ? "http://localhost:4000" : "") + "/api/assistant";
  var STORE = "ra_assistant_v1";
  var WA = "2250705801517";
  var state = { messages: [], misses: 0, open: false, busy: false, handoffDone: false };

  function load() {
    try { var s = JSON.parse(sessionStorage.getItem(STORE) || "null"); if (s && Array.isArray(s.messages)) state = Object.assign(state, s, { busy: false }); } catch (e) {}
  }
  function save() { try { sessionStorage.setItem(STORE, JSON.stringify({ messages: state.messages.slice(-30), misses: state.misses, open: state.open, handoffDone: state.handoffDone })); } catch (e) {} }

  function h(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }

  var ICON_CHAT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.2A8 8 0 1 1 21 12z"/><path d="M9 11h.01M12 11h.01M15 11h.01"/></svg>';
  var ICON_SEND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/></svg>';

  var ICON_MIC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';

  var V = window.RectoyVoice;           // voix : voice.js (lecture, dictée, visite guidée)
  var launcher, panel, log, input, sendBtn, micBtn, listening = false;

  function build() {
    launcher = h("button", "ra-ai-launcher");
    launcher.type = "button";
    launcher.setAttribute("aria-label", "Ouvrir l'assistant RECTOY-AIRES");
    launcher.innerHTML = ICON_CHAT + '<span class="dot"></span><span class="label">Assistant</span>';
    launcher.addEventListener("click", function () { if (V) V.quitTour(); toggle(true); });

    panel = h("section", "ra-ai-panel");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Assistant virtuel RECTOY-AIRES");

    var head = h("div", "ra-ai-head");
    head.appendChild(h("div", "ra-ai-avatar", "R"));
    var t = h("div", "ra-ai-title");
    t.appendChild(h("strong", null, "Assistant RECTOY-AIRES"));
    t.appendChild(h("span", null, "IA · un conseiller prend le relais si besoin"));
    head.appendChild(t);
    var reset = h("button", null, "↺"); reset.type = "button"; reset.title = "Nouvelle conversation"; reset.setAttribute("aria-label", "Nouvelle conversation");
    reset.addEventListener("click", resetChat);
    var close = h("button", null, "✕"); close.type = "button"; close.setAttribute("aria-label", "Fermer l'assistant");
    close.addEventListener("click", function () { toggle(false); });
    if (V && V.supported.tts) {
      var speaker = h("button", "ra-ai-speaker"); speaker.type = "button";
      var paintSpeaker = function () {
        var on = V.repliesOn();
        speaker.textContent = on ? "🔊" : "🔇";
        speaker.title = on ? "Lecture à voix haute activée (cliquer pour couper)" : "Lire les réponses à voix haute";
        speaker.setAttribute("aria-label", speaker.title); speaker.setAttribute("aria-pressed", on ? "true" : "false");
      };
      paintSpeaker();
      speaker.addEventListener("click", function () { V.setRepliesOn(!V.repliesOn()); paintSpeaker(); });
      head.appendChild(speaker);
    }
    head.appendChild(reset); head.appendChild(close);

    var human = h("div", "ra-ai-human");
    human.appendChild(h("span", null, "Besoin d'une personne ?"));
    var hb = h("button", null, "Parler à un conseiller"); hb.type = "button";
    hb.addEventListener("click", function () { showHandoff(); });
    human.appendChild(hb);

    log = h("div", "ra-ai-log");
    log.setAttribute("aria-live", "polite");

    var form = h("form", "ra-ai-form");
    input = h("input"); input.type = "text"; input.maxLength = 500; input.placeholder = "Posez votre question…"; input.autocomplete = "off";
    input.setAttribute("aria-label", "Votre message");
    sendBtn = h("button"); sendBtn.type = "submit"; sendBtn.setAttribute("aria-label", "Envoyer"); sendBtn.innerHTML = ICON_SEND;
    form.appendChild(input);
    if (V && V.supported.stt) {
      micBtn = h("button", "ra-ai-mic"); micBtn.type = "button"; micBtn.innerHTML = ICON_MIC;
      micBtn.title = "Parler à l'assistant"; micBtn.setAttribute("aria-label", "Parler à l'assistant (dictée vocale)"); micBtn.setAttribute("aria-pressed", "false");
      micBtn.addEventListener("click", toggleMic);
      form.appendChild(micBtn);
    }
    form.appendChild(sendBtn);
    form.addEventListener("submit", function (e) { e.preventDefault(); var v = input.value.trim(); if (v) { input.value = ""; ask(v); } });

    var foot = h("div", "ra-ai-foot", "Assistant automatique — vérifiez les informations importantes avec un conseiller.");

    [head, human, log, form, foot].forEach(function (n) { panel.appendChild(n); });
    document.body.appendChild(launcher);
    document.body.appendChild(panel);

    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && state.open) toggle(false); });
  }

  function toggle(open) {
    state.open = open;
    panel.classList.toggle("open", open);
    launcher.classList.toggle("hidden", open);
    if (open) {
      if (!log.children.length) restore();
      setTimeout(function () { input.focus(); scrollDown(); }, 60);
    } else {
      if (V) { V.stop(); V.stopListening(); }
      launcher.focus({ preventScroll: true });
    }
    save();
  }

  function scrollDown() { log.scrollTop = log.scrollHeight; }

  function addMsg(role, text, persist) {
    var m = h("div", "ra-msg " + role, text);
    log.appendChild(m); scrollDown();
    if (persist !== false) { state.messages.push({ role: role === "user" ? "user" : "assistant", content: text }); save(); }
    return m;
  }

  function addChips(items) {
    if (!items || !items.length) return;
    var box = h("div", "ra-chips");
    items.forEach(function (it) {
      var chip;
      if (typeof it === "string") {
        chip = h("button", "ra-chip", it); chip.type = "button";
        chip.addEventListener("click", function () { box.remove(); ask(it); });
      } else if (it.tour) {
        chip = h("button", "ra-chip", "🎧 " + it.label); chip.type = "button";
        chip.addEventListener("click", function () { if (V) V.startTour(); });
      } else if (it.handoff) {
        chip = h("button", "ra-chip human", "💬 " + it.label); chip.type = "button";
        chip.addEventListener("click", function () { showHandoff(); });
      } else {
        chip = h("a", "ra-chip", it.label + " →"); chip.href = it.href;
        if (/^https?:/.test(it.href)) { chip.target = "_blank"; chip.rel = "noopener noreferrer"; }
        else chip.addEventListener("click", function () { if (window.innerWidth < 700) toggle(false); });
      }
      box.appendChild(chip);
    });
    log.appendChild(box); scrollDown();
  }

  function welcome() {
    addMsg("bot", "Bonjour 👋 Je suis l'assistant virtuel de RECTOY-AIRES. Posez-moi votre question : si je n'ai pas la solution, un conseiller prendra le relais.");
    addChips(["Que fait RECTOY-AIRES ?", "Parlez-moi de RECTOY BUSINESS", "Qui sont les cofondateurs ?", { label: "Visite guidée vocale", tour: true }, { label: "Parler à un conseiller", handoff: true }]);
  }

  function restore() {
    if (!state.messages.length) { welcome(); return; }
    state.messages.forEach(function (m) { log.appendChild(h("div", "ra-msg " + (m.role === "user" ? "user" : "bot"), m.content)); });
    scrollDown();
  }

  function resetChat() {
    state = { messages: [], misses: 0, open: true, busy: false, handoffDone: false };
    log.textContent = ""; save(); welcome();
  }

  function setBusy(b) { state.busy = b; sendBtn.disabled = b; }

  async function ask(text, viaVoice) {
    if (state.busy) return;
    if (V) { V.quitTour(); V.stop(); }
    var history = state.messages.slice(-10);
    addMsg("user", text);
    setBusy(true);
    var typing = h("div", "ra-msg bot");
    typing.innerHTML = '<span class="ra-typing" aria-label="L\'assistant écrit"><i></i><i></i><i></i></span>';
    log.appendChild(typing); scrollDown();

    var started = Date.now(), data;
    try {
      var res = await fetch(API + "/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: history, misses: state.misses })
      });
      if (!res.ok) throw new Error("http " + res.status);
      data = await res.json();
    } catch (err) {
      data = { reply: "Je ne parviens pas à joindre le service pour le moment. Un conseiller peut vous répondre directement.", handoff: true, actions: [], misses: 0 };
    }
    var wait = Math.max(0, 550 - (Date.now() - started));
    setTimeout(function () {
      typing.remove();
      state.misses = data.misses || 0;
      addMsg("bot", data.reply || "…");
      if (V && (viaVoice || V.repliesOn())) V.speak(data.reply);   // réponse lue à voix haute
      addChips(data.suggestions);
      addChips(data.actions);
      if (data.handoff) showHandoff(text);
      setBusy(false); input.focus(); save();
    }, wait);
  }

  function micNote(code) {
    var msg = {
      "not-allowed": "Le micro n'est pas autorisé. Autorisez-le dans votre navigateur, ou écrivez votre question.",
      "service-not-allowed": "Le micro n'est pas autorisé. Autorisez-le dans votre navigateur, ou écrivez votre question.",
      "no-speech": "Je n'ai rien entendu. Appuyez sur le micro et parlez, ou écrivez votre question.",
      "audio-capture": "Aucun micro n'a été détecté sur cet appareil.",
      "network": "La reconnaissance vocale est indisponible pour le moment. Écrivez votre question."
    }[code];
    if (msg) addMsg("bot", msg, false);
  }

  function toggleMic() {
    if (listening) { V.stopListening(); return; }
    if (state.busy) return;
    var heard = "";
    listening = true;
    micBtn.classList.add("on"); micBtn.setAttribute("aria-pressed", "true"); input.placeholder = "Je vous écoute…";
    var started = V.listen({
      result: function (text) { heard = text; input.value = text; },
      error: micNote,
      end: function () {
        listening = false;
        micBtn.classList.remove("on"); micBtn.setAttribute("aria-pressed", "false"); input.placeholder = "Posez votre question…";
        var t = input.value.trim();
        if (t && heard) { input.value = ""; ask(t, true); }      // envoi automatique de ce qui a été dit
      }
    });
    if (!started) { listening = false; micBtn.classList.remove("on"); micBtn.setAttribute("aria-pressed", "false"); input.placeholder = "Posez votre question…"; }
  }

  function lastUserQuestion() {
    for (var i = state.messages.length - 1; i >= 0; i--) if (state.messages[i].role === "user") return state.messages[i].content;
    return "";
  }

  function waLink(message) {
    var txt = "Bonjour, je viens du site RECTOY-AIRES. " + (message || "J'aimerais échanger avec un conseiller.");
    return "https://wa.me/" + WA + "?text=" + encodeURIComponent(txt.slice(0, 800));
  }

  function showHandoff(prefill) {
    var old = log.querySelector(".ra-card.handoff"); if (old) old.remove();
    var card = h("div", "ra-card handoff");
    card.appendChild(h("h4", null, "Un conseiller vous répond"));
    card.appendChild(h("p", null, "Laissez vos coordonnées et votre question : vous serez recontacté. Pour une réponse plus rapide, utilisez WhatsApp."));

    var form = h("form"); form.noValidate = true;
    function field(label, type, name, ph, ac) { var l = h("label", null, label); l.setAttribute("for", "ra_" + name); var i = h("input"); i.id = "ra_" + name; i.type = type; i.name = name; i.placeholder = ph; i.autocomplete = ac; i.maxLength = 120; form.appendChild(l); form.appendChild(i); return i; }
    var name = field("Votre nom", "text", "name", "Nom et prénom", "name");
    var contact = field("Email ou téléphone", "text", "contact", "ex. +225 07 00 00 00 00", "email");
    var l3 = h("label", null, "Votre question"); l3.setAttribute("for", "ra_message");
    var msg = h("textarea"); msg.id = "ra_message"; msg.maxLength = 1500; msg.rows = 3; msg.value = prefill || lastUserQuestion();
    var hp = h("input", "ra-hp"); hp.type = "text"; hp.name = "_gotcha"; hp.tabIndex = -1; hp.autocomplete = "off"; hp.setAttribute("aria-hidden", "true");
    form.appendChild(l3); form.appendChild(msg); form.appendChild(hp);

    var err = h("div", "ra-err"); err.setAttribute("role", "alert");
    var row = h("div", "row");
    var send = h("button", "ra-btn primary", "Envoyer ma demande"); send.type = "submit";
    var wa = h("a", "ra-btn whatsapp", "WhatsApp"); wa.href = waLink(msg.value); wa.target = "_blank"; wa.rel = "noopener noreferrer";
    msg.addEventListener("input", function () { wa.href = waLink(msg.value); });
    row.appendChild(send); row.appendChild(wa);
    form.appendChild(err); form.appendChild(row);
    card.appendChild(form);
    log.appendChild(card); scrollDown();
    setTimeout(function () { name.focus({ preventScroll: true }); card.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, 80);

    form.addEventListener("submit", async function (e) {
      e.preventDefault(); err.textContent = "";
      if (!name.value.trim() || !contact.value.trim() || !msg.value.trim()) { err.textContent = "Merci de remplir les trois champs."; return; }
      send.disabled = true; send.classList.add("is-loading");
      try {
        var res = await fetch(API + "/handoff", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.value, contact: contact.value, message: msg.value, _gotcha: hp.value, page: location.pathname + location.hash, transcript: state.messages.slice(-20) })
        });
        var data = {}; try { data = await res.json(); } catch (x) {}
        if (!res.ok) throw new Error(data.message || "Erreur d'envoi.");
        card.remove();
        state.handoffDone = true;
        addMsg("bot", "Merci " + name.value.trim().split(" ")[0] + ", votre demande est transmise à un conseiller. Il vous recontactera via " + contact.value.trim() + ".");
        addChips([{ label: "Écrire aussi sur WhatsApp", href: waLink(msg.value) }]);
      } catch (error) {
        err.textContent = (error.message || "Envoi impossible") + " Vous pouvez nous écrire directement sur WhatsApp.";
        send.disabled = false; send.classList.remove("is-loading");
      }
    });
  }

  function init() {
    load(); build();
    if (state.open) { panel.classList.add("open"); launcher.classList.add("hidden"); restore(); }
    // ouverture via ?assistant=1 ou lien #assistant
    if (location.hash === "#assistant" || /[?&]assistant=1/.test(location.search)) toggle(true);
    window.RectoyAssistant = { open: function () { toggle(true); }, close: function () { if (state.open) toggle(false); }, handoff: function () { toggle(true); showHandoff(); } };
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
