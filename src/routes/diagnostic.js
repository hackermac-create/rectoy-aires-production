/**
 * Diagnostic client + suivi commercial
 *   Public : POST /api/diagnostic
 *   Admin  : GET    /api/admin/diagnostics            (liste + statistiques du pipeline)
 *            GET    /api/admin/diagnostics/:id        (fiche + historique)
 *            PATCH  /api/admin/diagnostics/:id        (statut, responsable, valeur, relance)
 *            POST   /api/admin/diagnostics/:id/notes  (note interne)
 *            DELETE /api/admin/diagnostics/:id
 *            GET    /api/admin/diagnostics-export.csv
 */

const NEEDS = {
    site_web: "Site web / application",
    digitalisation: "Digitalisation de l'entreprise",
    cybersecurite: "Cybersécurité",
    audiovisuel: "Audiovisuel & contenus",
    communication: "Communication numérique",
    mobile: "Solutions mobiles",
    rectoy_business: "RECTOY BUSINESS (gestion)",
    virtual_commerce: "VIRTUAL COMMERCE",
    autre: "Autre besoin"
};
const SECTORS = ["commerce", "services", "industrie", "education", "sante", "administration", "agriculture", "autre"];
const SIZES = ["independant", "2-10", "11-50", "50+"];
const BUDGETS = { "<500k": 1, "500k-2m": 2, "2m-5m": 3, ">5m": 4, "a_definir": 0 };
const URGENCIES = { urgent: 3, "3mois": 2, "6mois": 1, exploration: 0 };
const STATUSES = ["nouveau", "contacte", "diagnostic", "proposition", "negociation", "gagne", "perdu"];
const STATUS_LABELS = {
    nouveau: "Nouveau", contacte: "Contacté", diagnostic: "Diagnostic réalisé",
    proposition: "Proposition envoyée", negociation: "Négociation", gagne: "Gagné", perdu: "Perdu"
};

const clean = v => (typeof v === "string" ? v.trim() : "");
const isId = v => /^\d{1,18}$/.test(String(v));
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[+\d][\d\s().-]{6,}$/;

// Aide à la priorisation (0–100) — jamais une décision automatique.
function computeScore({ needs, budget, urgency, phone, company, size }) {
    let s = 0;
    s += Math.min(needs.length, 3) * 8;               // jusqu'à 24
    s += (BUDGETS[budget] || 0) * 10;                 // jusqu'à 40
    s += (URGENCIES[urgency] || 0) * 8;               // jusqu'à 24
    if (phone) s += 4;
    if (company) s += 4;
    if (size && size !== "independant") s += 4;
    return Math.min(100, s);
}

// Limitation de débit en mémoire.
const buckets = new Map();
function limited(key, max, windowMs) {
    const now = Date.now();
    const b = buckets.get(key);
    if (!b || now - b.start > windowMs) { buckets.set(key, { start: now, count: 1 }); return false; }
    b.count += 1;
    return b.count > max;
}
setInterval(() => {
    const now = Date.now();
    for (const [k, b] of buckets) if (now - b.start > 3600 * 1000) buckets.delete(k);
}, 10 * 60 * 1000).unref();

// Neutralise l'injection de formules dans Excel / LibreOffice.
function csvCell(value) {
    let s = value == null ? "" : String(value);
    // numéros internationaux (+225 …) laissés tels quels ; toute autre formule est neutralisée
    if (/^[=+\-@\t\r]/.test(s) && !/^\+[\d\s().-]+$/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
}

const mapRow = r => ({
    id: String(r.id), reference: r.reference, name: r.name, company: r.company, email: r.email, phone: r.phone,
    country: r.country, sector: r.sector, companySize: r.company_size, needs: r.needs || [],
    budget: r.budget, urgency: r.urgency, message: r.message, score: r.score, status: r.status,
    assignedTo: r.assigned_to, estimatedValue: r.estimated_value == null ? null : Number(r.estimated_value),
    nextFollowup: r.next_followup ? new Date(r.next_followup).toISOString().slice(0, 10) : null,
    lostReason: r.lost_reason, sourcePage: r.source_page,
    createdAt: r.created_at, updatedAt: r.updated_at, statusChangedAt: r.status_changed_at
});

const COLUMNS = `id, reference, name, company, email, phone, country, sector, company_size, needs, budget, urgency,
    message, score, status, assigned_to, estimated_value, to_char(next_followup,'YYYY-MM-DD') AS next_followup,
    lost_reason, source_page, created_at, updated_at, status_changed_at`;

module.exports = function ({ express, query, requireAuth, fail }) {
    const router = express.Router();

    // ------------------------------------------------------------ public
    router.post("/diagnostic", async (req, res) => {
        try {
            if (clean(req.body._gotcha)) return res.json({ success: true });          // robot
            if (limited("diag-all:" + req.ip, 60, 60 * 60 * 1000)) {
                return fail(res, 429, "Trop de requêtes. Réessayez plus tard ou écrivez-nous sur WhatsApp.");
            }

            const name = clean(req.body.name).slice(0, 100);
            const company = clean(req.body.company).slice(0, 150);
            const email = clean(req.body.email).slice(0, 150).toLowerCase();
            const phone = clean(req.body.phone).slice(0, 40);
            const country = clean(req.body.country).slice(0, 60);
            const sector = SECTORS.includes(req.body.sector) ? req.body.sector : null;
            const size = SIZES.includes(req.body.companySize) ? req.body.companySize : null;
            const budget = Object.keys(BUDGETS).includes(req.body.budget) ? req.body.budget : "a_definir";
            const urgency = Object.keys(URGENCIES).includes(req.body.urgency) ? req.body.urgency : "exploration";
            const message = clean(req.body.message).slice(0, 2000);
            const needs = [...new Set((Array.isArray(req.body.needs) ? req.body.needs : []).filter(n => NEEDS[n]))].slice(0, 9);
            const page = clean(req.body.page).slice(0, 200) || null;

            if (!name) return fail(res, 400, "Indiquez votre nom.");
            if (!EMAIL_RE.test(email)) return fail(res, 400, "Indiquez un email valide.");
            if (phone && !PHONE_RE.test(phone)) return fail(res, 400, "Le numéro de téléphone n'est pas valide.");
            if (!needs.length) return fail(res, 400, "Choisissez au moins un besoin.");
            if (message.length < 10) return fail(res, 400, "Décrivez votre projet en quelques phrases (10 caractères minimum).");
            if (req.body.consent !== true) return fail(res, 400, "Vous devez accepter d'être recontacté pour envoyer la demande.");

            // Seules les demandes valides comptent dans la limite (une faute de frappe ne bloque personne).
            if (limited("diag:" + req.ip, 5, 60 * 60 * 1000)) {
                return fail(res, 429, "Trop de demandes envoyées. Réessayez plus tard ou écrivez-nous sur WhatsApp.");
            }

            const score = computeScore({ needs, budget, urgency, phone, company, size });

            const ins = await query(
                `INSERT INTO diagnostic_requests
                 (name, company, email, phone, country, sector, company_size, needs, budget, urgency, message, score, source_page)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
                [name, company || null, email, phone || null, country || null, sector, size, needs, budget, urgency, message, score, page]
            );
            const id = ins.rows[0].id;
            const ref = await query(
                `UPDATE diagnostic_requests SET reference = 'DIAG-' || to_char(created_at,'YYYY') || '-' || lpad(id::text, 5, '0')
                 WHERE id = $1 RETURNING reference`, [id]
            );
            await query(`INSERT INTO diagnostic_events (request_id, kind, detail) VALUES ($1,'creation','Demande reçue via le formulaire de diagnostic.')`, [id]);

            res.status(201).json({ success: true, reference: ref.rows[0].reference });
        } catch (error) {
            console.error(error);
            fail(res, 500, "Impossible d'enregistrer votre demande pour le moment. Écrivez-nous sur WhatsApp.");
        }
    });

    // ------------------------------------------------------------- admin
    router.get("/admin/diagnostics", requireAuth, async (req, res) => {
        try {
            const status = STATUSES.includes(req.query.status) ? req.query.status : null;
            const q = clean(req.query.q).slice(0, 80);
            const where = []; const params = [];
            if (status) { params.push(status); where.push(`status = $${params.length}`); }
            if (q) {
                params.push("%" + q.replace(/[\\%_]/g, m => "\\" + m) + "%");
                where.push(`(name ILIKE $${params.length} OR company ILIKE $${params.length} OR email ILIKE $${params.length} OR reference ILIKE $${params.length})`);
            }
            const list = await query(
                `SELECT ${COLUMNS} FROM diagnostic_requests
                 ${where.length ? "WHERE " + where.join(" AND ") : ""}
                 ORDER BY (status IN ('gagne','perdu')) ASC, created_at DESC LIMIT 300`, params
            );
            const stats = await query(
                `SELECT status, COUNT(*)::int AS n, COALESCE(SUM(estimated_value),0)::bigint AS value
                 FROM diagnostic_requests GROUP BY status`
            );
            const due = await query(
                `SELECT COUNT(*)::int AS n FROM diagnostic_requests
                 WHERE next_followup IS NOT NULL AND next_followup <= CURRENT_DATE AND status NOT IN ('gagne','perdu')`
            );
            const byStatus = {};
            STATUSES.forEach(s => { byStatus[s] = { count: 0, value: 0 }; });
            stats.rows.forEach(r => { byStatus[r.status] = { count: r.n, value: Number(r.value) }; });

            res.json({ success: true, requests: list.rows.map(mapRow), stats: byStatus, dueFollowups: due.rows[0].n });
        } catch (error) {
            console.error(error);
            fail(res, 500, "Erreur lors du chargement des diagnostics.");
        }
    });

    router.get("/admin/diagnostics-export.csv", requireAuth, async (req, res) => {
        try {
            const result = await query(`SELECT ${COLUMNS} FROM diagnostic_requests ORDER BY created_at DESC LIMIT 5000`);
            const head = ["Référence", "Date", "Statut", "Nom", "Entreprise", "Email", "Téléphone", "Pays", "Secteur", "Taille",
                "Besoins", "Budget", "Urgence", "Score", "Responsable", "Valeur estimée (FCFA)", "Prochaine relance", "Message"];
            const lines = [head.map(csvCell).join(";")];
            for (const r of result.rows.map(mapRow)) {
                lines.push([r.reference, r.createdAt && new Date(r.createdAt).toISOString().slice(0, 10), STATUS_LABELS[r.status], r.name,
                    r.company, r.email, r.phone, r.country, r.sector, r.companySize, r.needs.map(n => NEEDS[n] || n).join(", "),
                    r.budget, r.urgency, r.score, r.assignedTo, r.estimatedValue, r.nextFollowup, r.message].map(csvCell).join(";"));
            }
            res.setHeader("Content-Type", "text/csv; charset=utf-8");
            res.setHeader("Content-Disposition", 'attachment; filename="diagnostics-rectoy-aires.csv"');
            res.send("\uFEFF" + lines.join("\r\n"));
        } catch (error) {
            console.error(error);
            fail(res, 500, "Erreur lors de l'export.");
        }
    });

    router.get("/admin/diagnostics/:id", requireAuth, async (req, res) => {
        try {
            if (!isId(req.params.id)) return fail(res, 404, "Dossier introuvable.");
            const r = await query(`SELECT ${COLUMNS} FROM diagnostic_requests WHERE id = $1`, [req.params.id]);
            if (!r.rowCount) return fail(res, 404, "Dossier introuvable.");
            const e = await query(
                `SELECT id, kind, detail, created_at FROM diagnostic_events WHERE request_id = $1 ORDER BY created_at DESC, id DESC LIMIT 100`,
                [req.params.id]
            );
            res.json({ success: true, request: mapRow(r.rows[0]),
                events: e.rows.map(x => ({ id: String(x.id), kind: x.kind, detail: x.detail, createdAt: x.created_at })) });
        } catch (error) {
            console.error(error);
            fail(res, 500, "Erreur lors du chargement du dossier.");
        }
    });

    router.patch("/admin/diagnostics/:id", requireAuth, async (req, res) => {
        try {
            if (!isId(req.params.id)) return fail(res, 404, "Dossier introuvable.");
            const cur = await query(`SELECT status, assigned_to, estimated_value, to_char(next_followup,'YYYY-MM-DD') AS next_followup
                                     FROM diagnostic_requests WHERE id = $1`, [req.params.id]);
            if (!cur.rowCount) return fail(res, 404, "Dossier introuvable.");
            const before = cur.rows[0];
            const b = req.body || {};
            const sets = []; const params = []; const events = [];
            const add = (col, val) => { params.push(val); sets.push(`${col} = $${params.length}`); };

            if (b.status !== undefined) {
                if (!STATUSES.includes(b.status)) return fail(res, 400, "Statut invalide.");
                if (b.status !== before.status) {
                    add("status", b.status); sets.push("status_changed_at = NOW()");
                    events.push(["statut", `${STATUS_LABELS[before.status]} → ${STATUS_LABELS[b.status]}`]);
                    if (b.status !== "perdu") add("lost_reason", null);
                }
            }
            if (b.lostReason !== undefined) add("lost_reason", clean(b.lostReason).slice(0, 200) || null);
            if (b.assignedTo !== undefined) {
                const v = clean(b.assignedTo).slice(0, 80) || null;
                if (v !== before.assigned_to) { add("assigned_to", v); events.push(["suivi", v ? `Responsable : ${v}` : "Responsable retiré"]); }
            }
            if (b.estimatedValue !== undefined) {
                let v = null;
                if (b.estimatedValue !== null && b.estimatedValue !== "") {
                    v = Number(b.estimatedValue);
                    if (!Number.isFinite(v) || v < 0 || v > 1e12) return fail(res, 400, "Valeur estimée invalide.");
                    v = Math.round(v);
                }
                const prev = before.estimated_value == null ? null : Number(before.estimated_value);
                if (v !== prev) { add("estimated_value", v); events.push(["suivi", v == null ? "Valeur estimée retirée" : `Valeur estimée : ${v.toLocaleString("fr-FR")} FCFA`]); }
            }
            if (b.nextFollowup !== undefined) {
                const v = b.nextFollowup ? String(b.nextFollowup) : null;
                if (v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) return fail(res, 400, "Date de relance invalide.");
                if (v !== before.next_followup) { add("next_followup", v); events.push(["suivi", v ? `Prochaine relance : ${v}` : "Relance retirée"]); }
            }

            if (!sets.length) return res.json({ success: true, unchanged: true });
            params.push(req.params.id);
            await query(`UPDATE diagnostic_requests SET ${sets.join(", ")} WHERE id = $${params.length}`, params);
            for (const [kind, detail] of events) {
                await query(`INSERT INTO diagnostic_events (request_id, kind, detail) VALUES ($1,$2,$3)`, [req.params.id, kind, detail]);
            }
            res.json({ success: true });
        } catch (error) {
            console.error(error);
            fail(res, 500, "Erreur lors de la mise à jour du dossier.");
        }
    });

    router.post("/admin/diagnostics/:id/notes", requireAuth, async (req, res) => {
        try {
            if (!isId(req.params.id)) return fail(res, 404, "Dossier introuvable.");
            const text = clean(req.body.text).slice(0, 2000);
            if (!text) return fail(res, 400, "La note est vide.");
            const r = await query(`INSERT INTO diagnostic_events (request_id, kind, detail)
                                   SELECT id, 'note', $2 FROM diagnostic_requests WHERE id = $1 RETURNING id`, [req.params.id, text]);
            if (!r.rowCount) return fail(res, 404, "Dossier introuvable.");
            res.status(201).json({ success: true });
        } catch (error) {
            console.error(error);
            fail(res, 500, "Erreur lors de l'ajout de la note.");
        }
    });

    router.delete("/admin/diagnostics/:id", requireAuth, async (req, res) => {
        try {
            if (!isId(req.params.id)) return fail(res, 404, "Dossier introuvable.");
            const r = await query("DELETE FROM diagnostic_requests WHERE id = $1 RETURNING id", [req.params.id]);
            if (!r.rowCount) return fail(res, 404, "Dossier introuvable.");
            res.json({ success: true });
        } catch (error) {
            console.error(error);
            fail(res, 500, "Erreur lors de la suppression.");
        }
    });

    return router;
};

module.exports.constants = { NEEDS, STATUSES, STATUS_LABELS };
