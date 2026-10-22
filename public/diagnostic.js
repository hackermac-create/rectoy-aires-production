/* RECTOY-AIRES — formulaire de diagnostic en 3 étapes */
(function () {
  "use strict";
  var form = document.getElementById("diagForm");
  if (!form) return;

  var API = (window.location.port === "5500" ? "http://localhost:4000" : "") + "/api/diagnostic";
  var steps = Array.prototype.slice.call(form.querySelectorAll("fieldset[data-step]"));
  var bars = Array.prototype.slice.call(form.querySelectorAll(".diag-progress span"));
  var nameEl = document.getElementById("diagStepName");
  var errEl = document.getElementById("diagError");
  var prev = document.getElementById("diagPrev");
  var next = document.getElementById("diagNext");
  var send = document.getElementById("diagSend");
  var NAMES = ["1 · Vos coordonnées", "2 · Votre besoin", "3 · Votre projet"];
  var cur = 0;

  function show(i) {
    cur = i; errEl.textContent = "";
    steps.forEach(function (s, k) { s.classList.toggle("on", k === i); });
    bars.forEach(function (b, k) { b.classList.toggle("on", k <= i); });
    nameEl.textContent = NAMES[i];
    prev.style.visibility = i === 0 ? "hidden" : "visible";
    next.hidden = i === steps.length - 1;
    send.hidden = i !== steps.length - 1;
    var f = steps[i].querySelector("input:not([type=checkbox]), select, textarea");
    if (f && document.activeElement && form.contains(document.activeElement)) f.focus({ preventScroll: true });
  }

  function validate(i) {
    var v = function (id) { return (document.getElementById(id).value || "").trim(); };
    if (i === 0) {
      if (!v("diagName")) return "Indiquez votre nom.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v("diagEmail"))) return "Indiquez un email valide.";
      var ph = v("diagPhone");
      if (ph && !/^[+\d][\d\s().-]{6,}$/.test(ph)) return "Le numéro de téléphone n'est pas valide.";
    }
    if (i === 1 && !form.querySelector("input[name=needs]:checked")) return "Choisissez au moins un besoin.";
    if (i === 2) {
      if (v("diagMessage").length < 10) return "Décrivez votre projet en quelques phrases.";
      if (!document.getElementById("diagConsent").checked) return "Cochez la case pour accepter d'être recontacté.";
    }
    return "";
  }

  // l'erreur disparaît dès que la personne corrige
  form.addEventListener("input", function () { errEl.textContent = ""; });
  form.addEventListener("change", function () { errEl.textContent = ""; });

  next.addEventListener("click", function () {
    var e = validate(cur);
    if (e) { errEl.textContent = e; return; }
    show(cur + 1);
  });
  prev.addEventListener("click", function () { if (cur > 0) show(cur - 1); });
  form.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") { e.preventDefault(); if (!next.hidden) next.click(); }
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var err = validate(0) || validate(1) || validate(2);
    if (err) { errEl.textContent = err; return; }
    var val = function (id) { return (document.getElementById(id).value || "").trim(); };
    var body = {
      name: val("diagName"), company: val("diagCompany"), email: val("diagEmail"), phone: val("diagPhone"), country: val("diagCountry"),
      sector: val("diagSector"), companySize: val("diagSize"),
      needs: Array.prototype.map.call(form.querySelectorAll("input[name=needs]:checked"), function (c) { return c.value; }),
      budget: val("diagBudget"), urgency: val("diagUrgency"), message: val("diagMessage"),
      consent: document.getElementById("diagConsent").checked, _gotcha: val("diagHp"),
      page: location.pathname + location.hash
    };
    send.disabled = true; errEl.textContent = "";
    fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (!res.ok) throw new Error(res.d.message || "Envoi impossible.");
        done(res.d.reference, body.name);
      })
      .catch(function (error) {
        send.disabled = false;
        errEl.textContent = (error.message || "Envoi impossible.") + " Vous pouvez aussi nous écrire sur WhatsApp.";
      });
  });

  function done(reference, name) {
    var box = document.createElement("div");
    box.className = "diag-done"; box.setAttribute("role", "status");
    var tick = document.createElement("div"); tick.className = "tick"; tick.textContent = "✓";
    var h = document.createElement("h3"); h.textContent = "Merci " + name.split(" ")[0] + ", votre demande est enregistrée";
    var p = document.createElement("p"); p.textContent = "Un conseiller RECTOY-AIRES étudie votre dossier et reviendra vers vous. Conservez votre numéro de référence :";
    var ref = document.createElement("div"); ref.className = "ref"; ref.textContent = reference || "";
    var wa = document.createElement("a"); wa.className = "btn btn-primary";
    wa.href = "https://wa.me/2250705801517?text=" + encodeURIComponent("Bonjour, je viens d'envoyer le diagnostic " + (reference || "") + " sur le site RECTOY-AIRES.");
    wa.target = "_blank"; wa.rel = "noopener noreferrer"; wa.textContent = "Écrire aussi sur WhatsApp";
    [tick, h, p, ref, document.createElement("br"), wa].forEach(function (n) { box.appendChild(n); });
    form.textContent = ""; form.appendChild(box);
    form.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  show(0);
})();
