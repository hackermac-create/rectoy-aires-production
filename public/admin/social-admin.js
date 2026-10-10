/* Administration des réseaux sociaux : entreprise + cofondateurs */

const API_ORIGIN = window.location.port === "5500" ? "http://localhost:4000" : "";
const API = API_ORIGIN + "/api";
const $ = id => document.getElementById(id);

const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");

function toast(message) {
  const t = $("toast");
  t.textContent = message; t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 4000);
}

async function api(path, options = {}) {
  const res = await fetch(API + path, { credentials: "include", ...options });
  let data = {};
  try { data = await res.json(); } catch {}
  if (res.status === 401) { $("app").hidden = true; $("notice").hidden = false; throw new Error("Session expirée."); }
  if (!res.ok) throw new Error(data.message || "Erreur du serveur.");
  return data;
}

let meta = null;

function render(data) {
  meta = data;
  const filled = slug => Object.values(slug === "company" ? data.company : (data.founders[slug] || {})).filter(Boolean).length;
  $("owners").innerHTML = data.owners.map((o, i) => {
    const links = o.slug === "company" ? data.company : (data.founders[o.slug] || {});
    const count = filled(o.slug);
    return `<details class="soc-owner" ${i === 0 ? "open" : ""} data-owner="${esc(o.slug)}">
      <summary><span>${o.slug === "company" ? "🏢" : "👤"} ${esc(o.name)}</span><small>${count} réseau${count > 1 ? "x" : ""} renseigné${count > 1 ? "s" : ""}</small></summary>
      <div class="soc-grid">${data.networks.map(n => `
        <div><label for="f-${esc(o.slug)}-${n.key}">${esc(n.label)}</label>
          <input id="f-${esc(o.slug)}-${n.key}" data-network="${n.key}" value="${esc(links[n.key] || "")}" placeholder="${esc(n.hint)}" autocomplete="off" spellcheck="false">
        </div>`).join("")}</div>
    </details>`;
  }).join("");
}

function collect() {
  const out = { company: {}, founders: {} };
  document.querySelectorAll("details[data-owner]").forEach(d => {
    const links = {};
    d.querySelectorAll("input[data-network]").forEach(i => { links[i.dataset.network] = i.value.trim(); });
    if (d.dataset.owner === "company") out.company = links; else out.founders[d.dataset.owner] = links;
  });
  return out;
}

$("form").addEventListener("submit", async e => {
  e.preventDefault();
  document.querySelectorAll("input.bad").forEach(i => i.classList.remove("bad"));
  $("save").disabled = true; $("status").textContent = "Enregistrement…";
  try {
    const data = await api("/admin/social", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(collect())
    });
    render({ ...meta, company: data.company, founders: data.founders });   // affiche les liens normalisés (ex. @pseudo → lien)
    $("status").textContent = "";
    toast("Réseaux sociaux enregistrés.");
  } catch (err) {
    $("status").textContent = "";
    toast(err.message);
  }
  $("save").disabled = false;
});

(async () => {
  try {
    const s = await (await fetch(API + "/admin/session", { credentials: "include" })).json();
    if (!s.authenticated) { $("notice").hidden = false; return; }
    $("app").hidden = false;
    render(await api("/admin/social"));
  } catch { $("notice").hidden = false; }
})();
