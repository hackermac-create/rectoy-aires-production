/* Administration — demandes transmises par l'assistant à un conseiller */
const API_ORIGIN = window.location.port === "5500" ? "http://localhost:4000" : "";
const API = API_ORIGIN + "/api";
const $ = id => document.getElementById(id);
let requests = [];

const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");

function toast(message) {
  const t = $("toast");
  t.textContent = message; t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 3000);
}

async function api(path, options = {}) {
  const res = await fetch(API + path, { credentials: "include", headers: { "Content-Type": "application/json" }, ...options });
  let data = {};
  try { data = await res.json(); } catch {}
  if (res.status === 401) { $("app").hidden = true; $("notice").hidden = false; throw new Error("Session expirée."); }
  if (!res.ok) throw new Error(data.message || "Erreur du serveur.");
  return data;
}

const fmt = d => new Date(d).toLocaleString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

function contactLinks(contact, name, message) {
  const c = String(contact).trim();
  if (c.includes("@")) {
    return `<a href="mailto:${esc(c)}?subject=${encodeURIComponent("Votre demande à RECTOY-AIRES")}">✉️ Répondre par email</a>`;
  }
  const digits = c.replace(/[^\d]/g, "");
  const wa = `https://wa.me/${digits}?text=${encodeURIComponent("Bonjour " + name + ", ici RECTOY-AIRES, suite à votre demande sur notre site.")}`;
  return `<a href="tel:${esc(c.replace(/[^\d+]/g, ""))}">📞 Appeler</a><a href="${esc(wa)}" target="_blank" rel="noopener noreferrer">💬 WhatsApp</a>`;
}

function render() {
  const open = requests.filter(r => r.status === "new").length;
  $("summary").textContent = requests.length
    ? `${open} demande(s) à traiter · ${requests.length} au total`
    : "Aucune demande pour le moment.";
  $("list").innerHTML = requests.map(r => `
    <div class="req">
      <div class="req-head"><strong>${esc(r.name)}</strong>
        <span class="chip ${r.status === "new" ? "chip-new" : "chip-done"}">${r.status === "new" ? "À traiter" : "Traité"}</span></div>
      <div class="req-meta">${esc(r.contact)} · ${esc(fmt(r.createdAt))}${r.page ? " · page " + esc(r.page) : ""}</div>
      <div class="req-msg">${esc(r.message)}</div>
      ${r.transcript && r.transcript.length ? `<details><summary>Voir la conversation avec l'assistant (${r.transcript.length})</summary>
        <div class="tr">${r.transcript.map(m => `<div class="${m.role === "user" ? "u" : "a"}">${esc(m.content)}</div>`).join("")}</div></details>` : ""}
      <div class="links">${contactLinks(r.contact, r.name, r.message)}</div>
      <div class="row-actions" style="margin-top:10px">
        <button type="button" data-act="toggle" data-id="${esc(r.id)}">${r.status === "new" ? "✅ Marquer traité" : "↩️ Rouvrir"}</button>
        <button type="button" data-act="delete" data-id="${esc(r.id)}">🗑️ Supprimer</button>
      </div>
    </div>`).join("");
}

async function load() {
  const data = await api("/admin/assistant-requests");
  requests = data.requests || [];
  render();
}

$("list").addEventListener("click", async e => {
  const b = e.target.closest("button[data-act]");
  if (!b) return;
  const r = requests.find(x => x.id === b.dataset.id);
  if (!r) return;
  try {
    if (b.dataset.act === "toggle") {
      await api("/admin/assistant-requests/" + r.id, { method: "PATCH", body: JSON.stringify({ status: r.status === "new" ? "handled" : "new" }) });
      toast(r.status === "new" ? "Demande marquée comme traitée." : "Demande rouverte.");
    } else if (b.dataset.act === "delete") {
      if (!confirm("Supprimer définitivement cette demande ?")) return;
      await api("/admin/assistant-requests/" + r.id, { method: "DELETE" });
      toast("Demande supprimée.");
    }
    await load();
  } catch (err) { toast(err.message); }
});

$("refresh").addEventListener("click", () => load().then(() => toast("Liste actualisée.")).catch(err => toast(err.message)));

(async function init() {
  try {
    const s = await (await fetch(API + "/admin/session", { credentials: "include" })).json();
    if (!s.authenticated) { $("notice").hidden = false; return; }
    $("app").hidden = false;
    await load();
  } catch { $("notice").hidden = false; }
})();
