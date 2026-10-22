/* Administration — diagnostics clients et suivi commercial */
const API_ORIGIN = window.location.port === "5500" ? "http://localhost:4000" : "";
const API = API_ORIGIN + "/api";
const $ = id => document.getElementById(id);

const STATUS = [
  ["nouveau", "Nouveau"], ["contacte", "Contacté"], ["diagnostic", "Diagnostic réalisé"],
  ["proposition", "Proposition envoyée"], ["negociation", "Négociation"], ["gagne", "Gagné"], ["perdu", "Perdu"]
];
const NEEDS = { site_web: "Site web / application", digitalisation: "Digitalisation", cybersecurite: "Cybersécurité", audiovisuel: "Audiovisuel",
  communication: "Communication numérique", mobile: "Solutions mobiles", rectoy_business: "RECTOY BUSINESS", virtual_commerce: "VIRTUAL COMMERCE", autre: "Autre" };
const BUDGET = { "<500k": "< 500 000 FCFA", "500k-2m": "500 000 – 2 M FCFA", "2m-5m": "2 – 5 M FCFA", ">5m": "> 5 M FCFA", a_definir: "Budget à définir" };
const URG = { urgent: "Dès que possible", "3mois": "D'ici 3 mois", "6mois": "D'ici 6 mois", exploration: "S'informe" };

let data = { requests: [], stats: {}, dueFollowups: 0 };
let filter = "";
let timer;

const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const money = n => Number(n).toLocaleString("fr-FR") + " FCFA";
const today = () => new Date().toISOString().slice(0, 10);
const fmt = d => new Date(d).toLocaleString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

function toast(m) { const t = $("toast"); t.textContent = m; t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 3000); }

async function api(path, options = {}) {
  const res = await fetch(API + path, { credentials: "include", headers: { "Content-Type": "application/json" }, ...options });
  let d = {}; try { d = await res.json(); } catch {}
  if (res.status === 401) { $("app").hidden = true; $("notice").hidden = false; throw new Error("Session expirée."); }
  if (!res.ok) throw new Error(d.message || "Erreur du serveur.");
  return d;
}

function renderPipe() {
  const total = Object.values(data.stats).reduce((a, s) => a + s.count, 0);
  $("pipe").innerHTML =
    `<button type="button" data-f="" class="${filter === "" ? "on" : ""}"><small>Tous</small><b>${total}</b></button>` +
    STATUS.map(([k, l]) => {
      const s = data.stats[k] || { count: 0, value: 0 };
      return `<button type="button" data-f="${k}" class="${filter === k ? "on" : ""}"><small>${l}</small><b>${s.count}</b>${s.value ? `<i>${esc(money(s.value))}</i>` : ""}</button>`;
    }).join("");
  $("alert").innerHTML = data.dueFollowups ? `<div class="alert">⏰ ${data.dueFollowups} relance(s) à effectuer aujourd'hui ou en retard.</div>` : "";
}

function scoreBadge(n) {
  const [c, l] = n >= 60 ? ["s-hot", "Prioritaire"] : n >= 35 ? ["s-warm", "À qualifier"] : ["s-cold", "Exploration"];
  return `<span class="score ${c}" title="Aide à la priorisation, calculée à partir du budget, de l'urgence et du besoin">${l} · ${n}</span>`;
}

function contactLinks(r) {
  let h = `<a href="mailto:${esc(r.email)}?subject=${encodeURIComponent("Votre demande " + r.reference + " — RECTOY-AIRES")}">✉️ Email</a>`;
  if (r.phone) {
    const digits = r.phone.replace(/[^\d]/g, "");
    h += `<a href="tel:${esc(r.phone.replace(/[^\d+]/g, ""))}">📞 Appeler</a>`;
    h += `<a href="https://wa.me/${digits}?text=${encodeURIComponent("Bonjour " + r.name + ", ici RECTOY-AIRES au sujet de votre demande " + r.reference + ".")}" target="_blank" rel="noopener noreferrer">💬 WhatsApp</a>`;
  }
  return h;
}

function card(r) {
  const late = r.nextFollowup && r.nextFollowup <= today() && !["gagne", "perdu"].includes(r.status);
  return `<article class="lead${late ? " late" : ""}" data-id="${esc(r.id)}">
    <div class="lead-head"><div><strong>${esc(r.name)}</strong>${r.company ? " · " + esc(r.company) : ""}<div class="ref">${esc(r.reference)} · reçu le ${esc(fmt(r.createdAt))}</div></div>${scoreBadge(r.score)}</div>
    <div class="meta"><span>✉️ ${esc(r.email)}</span>${r.phone ? `<span>📞 ${esc(r.phone)}</span>` : ""}${r.country ? `<span>📍 ${esc(r.country)}</span>` : ""}${r.sector ? `<span>🏷️ ${esc(r.sector)}</span>` : ""}${r.companySize ? `<span>👥 ${esc(r.companySize)}</span>` : ""}<span>💰 ${esc(BUDGET[r.budget] || "—")}</span><span>⏱️ ${esc(URG[r.urgency] || "—")}</span></div>
    <div class="needs">${r.needs.map(n => `<span>${esc(NEEDS[n] || n)}</span>`).join("")}</div>
    <div class="msg">${esc(r.message)}</div>
    <div class="edit">
      <div><label>Étape</label><select data-f="status">${STATUS.map(([k, l]) => `<option value="${k}"${r.status === k ? " selected" : ""}>${l}</option>`).join("")}</select></div>
      <div><label>Responsable</label><input data-f="assignedTo" maxlength="80" value="${esc(r.assignedTo || "")}" placeholder="Nom"></div>
      <div><label>Valeur estimée (FCFA)</label><input data-f="estimatedValue" type="number" min="0" step="1000" value="${r.estimatedValue ?? ""}"></div>
      <div><label>Prochaine relance</label><input data-f="nextFollowup" type="date" value="${esc(r.nextFollowup || "")}"></div>
      ${r.status === "perdu" ? `<div><label>Motif de perte</label><input data-f="lostReason" maxlength="200" value="${esc(r.lostReason || "")}"></div>` : ""}
    </div>
    <div class="acts"><button class="primary-btn" type="button" data-act="save">Enregistrer</button>${contactLinks(r)}<span style="flex:1"></span><button class="secondary-btn" type="button" data-act="delete">🗑️</button></div>
    <details data-hist><summary>Historique et notes</summary>
      <div class="noteform"><input maxlength="2000" placeholder="Ajouter une note interne…" aria-label="Note interne"><button class="secondary-btn" type="button" data-act="note">Ajouter</button></div>
      <div class="tl">Chargement…</div></details>
  </article>`;
}

function render() {
  renderPipe();
  $("list").innerHTML = data.requests.length ? data.requests.map(card).join("") : `<div class="panel"><p>Aucun dossier pour ce filtre.</p></div>`;
}

async function load() {
  const qs = new URLSearchParams();
  if (filter) qs.set("status", filter);
  if ($("search").value.trim()) qs.set("q", $("search").value.trim());
  data = await api("/admin/diagnostics?" + qs.toString());
  render();
}

async function loadHistory(article) {
  const box = article.querySelector(".tl");
  try {
    const d = await api("/admin/diagnostics/" + article.dataset.id);
    box.innerHTML = d.events.map(e => `<div class="${e.kind === "note" ? "note" : ""}"><small>${esc(fmt(e.createdAt))} · ${esc(e.kind)}</small>${esc(e.detail)}</div>`).join("") || "Aucun événement.";
  } catch (err) { box.textContent = err.message; }
}

$("pipe").addEventListener("click", e => {
  const b = e.target.closest("button[data-f]"); if (!b) return;
  filter = b.dataset.f; load().catch(err => toast(err.message));
});
$("refresh").addEventListener("click", () => load().then(() => toast("Liste actualisée.")).catch(err => toast(err.message)));
$("search").addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(() => load().catch(err => toast(err.message)), 350); });

$("list").addEventListener("toggle", e => { if (e.target.matches("details[data-hist]") && e.target.open) loadHistory(e.target.closest("article")); }, true);

$("list").addEventListener("click", async e => {
  const b = e.target.closest("button[data-act]"); if (!b) return;
  const art = b.closest("article"); const id = art.dataset.id;
  try {
    if (b.dataset.act === "save") {
      const body = {};
      art.querySelectorAll("[data-f]").forEach(el => { body[el.dataset.f] = el.value; });
      body.estimatedValue = body.estimatedValue === "" ? null : Number(body.estimatedValue);
      await api("/admin/diagnostics/" + id, { method: "PATCH", body: JSON.stringify(body) });
      toast("Dossier mis à jour."); await load();
    } else if (b.dataset.act === "note") {
      const inp = art.querySelector(".noteform input"); const text = inp.value.trim(); if (!text) return;
      await api("/admin/diagnostics/" + id + "/notes", { method: "POST", body: JSON.stringify({ text }) });
      inp.value = ""; toast("Note ajoutée."); loadHistory(art);
    } else if (b.dataset.act === "delete") {
      if (!confirm("Supprimer définitivement ce dossier et son historique ?")) return;
      await api("/admin/diagnostics/" + id, { method: "DELETE" });
      toast("Dossier supprimé."); await load();
    }
  } catch (err) { toast(err.message); }
});

(async function init() {
  try {
    const s = await (await fetch(API + "/admin/session", { credentials: "include" })).json();
    if (!s.authenticated) { $("notice").hidden = false; return; }
    $("app").hidden = false; await load();
  } catch { $("notice").hidden = false; }
})();
