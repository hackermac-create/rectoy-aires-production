/**
 * Assistant IA + relais vers un conseiller humain
 *   Public : POST /api/assistant/chat, POST /api/assistant/handoff
 *   Admin  : GET /api/admin/assistant-requests,
 *            PATCH /api/admin/assistant-requests/:id, DELETE /api/admin/assistant-requests/:id
 *
 * Fonctionnement : l'assistant répond à partir de la base de connaissances
 * (src/assistant/knowledge.js). Si ANTHROPIC_API_KEY est défini, un modèle
 * Claude reformule/répond en s'appuyant UNIQUEMENT sur cette base. Dans tous les
 * cas, dès qu'il n'a pas de solution (ou que la personne le demande), la main
 * passe à un conseiller : demande enregistrée + lien WhatsApp / email.
 */

const { CONTACT, SUGGESTIONS, A, findAnswer, knowledgeAsText } = require("../assistant/knowledge");

const clean = value => (typeof value === "string" ? value.trim() : "");
const isId = value => /^\d{1,18}$/.test(String(value));

// --- limitation de débit (mémoire) --------------------------------------
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

// --- modèle optionnel -----------------------------------------------------
async function askModel(message, history) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) return null;

    const system =
        "Tu es l'assistant virtuel du site RECTOY-AIRES (entreprise technologique africaine, Côte d'Ivoire). " +
        "Réponds en français, de façon courte, claire et professionnelle (4 phrases maximum). " +
        "Appuie-toi UNIQUEMENT sur les informations ci-dessous. N'invente jamais de prix, délai, date, nom ou promesse. " +
        "Si l'information n'est pas dans la base, si la demande est sensible, commerciale (devis, prix) ou si la personne veut un humain, " +
        "réponds exactement : [[CONSEILLER]]\n\nBASE D'INFORMATIONS :\n" + knowledgeAsText();

    const messages = [...history.slice(-8), { role: "user", content: message }];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            signal: controller.signal,
            headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
            body: JSON.stringify({
                model: process.env.ASSISTANT_MODEL || "claude-sonnet-5-5",
                max_tokens: 400,
                system,
                messages
            })
        });
        if (!res.ok) throw new Error("API " + res.status);
        const data = await res.json();
        const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("").trim();
        return text || null;
    } catch (error) {
        console.error("Assistant (modèle) :", error.message);
        return null; // repli sur la base locale
    } finally {
        clearTimeout(timer);
    }
}

function sanitizeHistory(raw) {
    if (!Array.isArray(raw)) return [];
    const out = [];
    for (const m of raw.slice(-10)) {
        if (!m || (m.role !== "user" && m.role !== "assistant")) continue;
        const content = clean(m.content).slice(0, 600);
        if (!content) continue;
        // l'API exige une alternance user / assistant commençant par user
        if (!out.length && m.role !== "user") continue;
        if (out.length && out[out.length - 1].role === m.role) continue;
        out.push({ role: m.role, content });
    }
    if (out.length && out[out.length - 1].role === "user") out.pop(); // le message courant est ajouté ensuite
    return out;
}

module.exports = function ({ express, query, requireAuth, fail }) {
    const router = express.Router();

    // ---------------------------------------------------------------- chat
    router.post("/assistant/chat", async (req, res) => {
        try {
            if (limited("chat:" + req.ip, 40, 10 * 60 * 1000)) {
                return res.json({ success: true, reply: "Vous envoyez beaucoup de messages. Un conseiller peut prendre le relais pour vous répondre.", actions: [A.conseiller], handoff: true });
            }

            const message = clean(req.body.message).slice(0, 500);
            if (!message) return fail(res, 400, "Message vide.");

            const history = sanitizeHistory(req.body.history);
            const misses = Math.min(Number(req.body.misses) || 0, 5);
            const local = findAnswer(message);

            // 1) demande explicite d'un humain
            if (local.type === "human") {
                return res.json({
                    success: true,
                    reply: "Bien sûr, je transmets la main à un conseiller. Laissez-moi vos coordonnées et votre question : vous serez recontacté, ou écrivez-nous directement sur WhatsApp pour aller plus vite.",
                    actions: [], handoff: true, misses: 0
                });
            }

            // 2) réponse du modèle (si configuré), sinon base locale
            const modelReply = local.type === "answer" || local.type === "unknown"
                ? await askModel(message, history)
                : null;

            if (modelReply) {
                if (modelReply.includes("[[CONSEILLER]]")) {
                    return res.json({
                        success: true,
                        reply: "Je n'ai pas la réponse précise à cette question : je préfère passer la main à un conseiller plutôt que de vous donner une information approximative.",
                        actions: [], handoff: true, misses: 0
                    });
                }
                return res.json({
                    success: true,
                    reply: modelReply,
                    actions: local.type === "answer" ? local.entry.actions : [A.conseiller],
                    handoff: false, misses: 0
                });
            }

            // 3) base locale
            if (local.type === "smalltalk") {
                return res.json({ success: true, reply: local.entry.answer, actions: [], suggestions: local.entry.id === "hello" ? SUGGESTIONS : [], handoff: false, misses: 0 });
            }
            if (local.type === "answer") {
                return res.json({ success: true, reply: local.entry.answer, actions: local.entry.actions || [], handoff: !!local.entry.handoff, misses: 0 });
            }

            // 4) pas de solution : reformulation une fois, puis relais conseiller
            if (misses >= 1) {
                return res.json({
                    success: true,
                    reply: "Je n'ai toujours pas la bonne réponse. Je vous mets en relation avec un conseiller qui pourra vous aider personnellement.",
                    actions: [], handoff: true, misses: 0
                });
            }
            return res.json({
                success: true,
                reply: "Je ne suis pas sûr d'avoir bien compris. Pouvez-vous reformuler, ou choisir un sujet ci-dessous ? Vous pouvez aussi demander un conseiller à tout moment.",
                actions: [A.conseiller], suggestions: SUGGESTIONS, handoff: false, misses: misses + 1
            });
        } catch (error) {
            console.error(error);
            // En cas d'erreur, on ne laisse jamais la personne sans solution.
            res.json({ success: true, reply: "Une difficulté technique est survenue. Un conseiller peut vous répondre directement.", actions: [], handoff: true, misses: 0 });
        }
    });

    // ------------------------------------------------------------- relais
    router.post("/assistant/handoff", async (req, res) => {
        try {
            if (clean(req.body._gotcha)) return res.json({ success: true });
            if (limited("handoff:" + req.ip, 5, 60 * 60 * 1000)) {
                return fail(res, 429, "Trop de demandes. Écrivez-nous sur WhatsApp.");
            }

            const name = clean(req.body.name).slice(0, 100);
            const contact = clean(req.body.contact).slice(0, 120);
            const message = clean(req.body.message).slice(0, 1500);
            const page = clean(req.body.page).slice(0, 200) || null;

            if (!name || !contact || !message) return fail(res, 400, "Nom, moyen de contact et message sont obligatoires.");

            const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contact);
            const isPhone = /^[+\d][\d\s().-]{6,}$/.test(contact);
            if (!isEmail && !isPhone) return fail(res, 400, "Indiquez un email ou un numéro de téléphone valide.");

            const transcript = Array.isArray(req.body.transcript)
                ? req.body.transcript.slice(-20)
                    .map(m => ({ role: m && m.role === "assistant" ? "assistant" : "user", content: clean(m && m.content).slice(0, 600) }))
                    .filter(m => m.content)
                : [];

            const result = await query(
                `INSERT INTO assistant_requests (name, contact, message, transcript, page)
                 VALUES ($1,$2,$3,$4,$5) RETURNING id`,
                [name, contact, message, JSON.stringify(transcript), page]
            );

            res.status(201).json({
                success: true,
                id: String(result.rows[0].id),
                message: "Votre demande a bien été transmise. Un conseiller vous recontactera.",
                whatsapp: CONTACT.whatsapp,
                email: CONTACT.email
            });
        } catch (error) {
            console.error(error);
            fail(res, 500, "Impossible d'enregistrer la demande. Écrivez-nous sur WhatsApp.");
        }
    });

    // ---------------------------------------------------------------- admin
    router.get("/admin/assistant-requests", requireAuth, async (req, res) => {
        try {
            const result = await query(
                `SELECT id, name, contact, message, transcript, page, status, created_at, handled_at
                 FROM assistant_requests ORDER BY (status = 'new') DESC, created_at DESC LIMIT 300`
            );
            res.json({
                success: true,
                requests: result.rows.map(r => ({
                    id: String(r.id), name: r.name, contact: r.contact, message: r.message,
                    transcript: r.transcript || [], page: r.page, status: r.status,
                    createdAt: r.created_at, handledAt: r.handled_at
                }))
            });
        } catch (error) {
            console.error(error);
            fail(res, 500, "Erreur lors du chargement des demandes.");
        }
    });

    router.patch("/admin/assistant-requests/:id", requireAuth, async (req, res) => {
        try {
            if (!isId(req.params.id)) return fail(res, 404, "Demande introuvable.");
            const status = req.body.status === "handled" ? "handled" : "new";
            const result = await query(
                `UPDATE assistant_requests
                 SET status = $1, handled_at = CASE WHEN $1 = 'handled' THEN NOW() ELSE NULL END
                 WHERE id = $2 RETURNING id`, [status, req.params.id]
            );
            if (!result.rowCount) return fail(res, 404, "Demande introuvable.");
            res.json({ success: true });
        } catch (error) {
            console.error(error);
            fail(res, 500, "Erreur lors de la mise à jour.");
        }
    });

    router.delete("/admin/assistant-requests/:id", requireAuth, async (req, res) => {
        try {
            if (!isId(req.params.id)) return fail(res, 404, "Demande introuvable.");
            const result = await query("DELETE FROM assistant_requests WHERE id = $1 RETURNING id", [req.params.id]);
            if (!result.rowCount) return fail(res, 404, "Demande introuvable.");
            res.json({ success: true });
        } catch (error) {
            console.error(error);
            fail(res, 500, "Erreur lors de la suppression.");
        }
    });

    return router;
};
