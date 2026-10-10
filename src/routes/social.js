/**
 * Réseaux sociaux de l'entreprise et des cofondateurs.
 *   Public : GET /api/social
 *   Admin  : GET /api/admin/social, PUT /api/admin/social
 * Un lien peut être saisi en entier (https://…), en @pseudo ou, pour WhatsApp, en numéro.
 * Chaque lien est contrôlé : il doit appartenir au bon site (un lien Facebook ne peut pas pointer ailleurs).
 */

// Ordre d'affichage = ordre de cette liste
const NETWORKS = [
    { key: "facebook",  label: "Facebook",  hosts: ["facebook.com", "fb.com", "fb.me"],               handle: h => `https://www.facebook.com/${h}`, hint: "@pseudo ou lien de la page" },
    { key: "instagram", label: "Instagram", hosts: ["instagram.com"],                                  handle: h => `https://www.instagram.com/${h}`, hint: "@pseudo ou lien du profil" },
    { key: "tiktok",    label: "TikTok",    hosts: ["tiktok.com"],                                     handle: h => `https://www.tiktok.com/@${h}`, hint: "@pseudo ou lien du compte" },
    { key: "whatsapp",  label: "WhatsApp",  hosts: ["wa.me", "whatsapp.com", "api.whatsapp.com"],      handle: null, hint: "numéro avec indicatif, ex. +225 07 05 80 15 17" },
    { key: "youtube",   label: "YouTube",   hosts: ["youtube.com", "youtu.be"],                        handle: h => `https://www.youtube.com/@${h}`, hint: "@pseudo ou lien de la chaîne" },
    { key: "linkedin",  label: "LinkedIn",  hosts: ["linkedin.com"],                                   handle: null, hint: "lien complet du profil ou de la page" },
    { key: "x",         label: "X (Twitter)", hosts: ["x.com", "twitter.com"],                         handle: h => `https://x.com/${h}`, hint: "@pseudo ou lien du compte" },
    { key: "threads",   label: "Threads",   hosts: ["threads.net", "threads.com"],                     handle: h => `https://www.threads.net/@${h}`, hint: "@pseudo ou lien du compte" },
    { key: "snapchat",  label: "Snapchat",  hosts: ["snapchat.com"],                                   handle: h => `https://www.snapchat.com/add/${h}`, hint: "@pseudo ou lien du compte" },
    { key: "telegram",  label: "Telegram",  hosts: ["t.me", "telegram.me"],                            handle: h => `https://t.me/${h}`, hint: "@pseudo ou lien" }
];
const BY_KEY = Object.fromEntries(NETWORKS.map(n => [n.key, n]));

const FOUNDERS = [
    { slug: "emmanuel",    name: "Emmanuel Yann Ako" },
    { slug: "franky",      name: "Traoré Franck" },
    { slug: "louoba",      name: "Louoba Demene Carelle Emmanuella Aleba" },
    { slug: "marilyne",    name: "Mary Josephine" },
    { slug: "odilon",      name: "Odilon Silyverter N'Guessan" },
    { slug: "jean-daniel", name: "Jean-Daniel Ehiman" },
    { slug: "kablan",      name: "Kablan Raymond" }
];
const OWNERS = ["company", ...FOUNDERS.map(f => f.slug)];

function hostMatches(host, allowed) {
    host = host.replace(/^www\./, "").replace(/^m\./, "");
    return allowed.some(h => host === h || host.endsWith("." + h));
}

// Renvoie { url } (vide = « aucun lien ») ou { error }
function normalize(network, raw) {
    const def = BY_KEY[network];
    if (!def) return { error: "Réseau inconnu." };
    let value = typeof raw === "string" ? raw.trim() : "";
    if (!value) return { url: "" };
    if (value.length > 300) return { error: "Lien trop long." };

    if (network === "whatsapp" && /^\+?[\d\s().-]{7,}$/.test(value)) {
        const digits = value.replace(/\D/g, "");
        if (digits.length < 8 || digits.length > 15) return { error: "Numéro invalide (8 à 15 chiffres avec l'indicatif)." };
        return { url: `https://wa.me/${digits}` };
    }

    const handle = value.replace(/^@/, "");
    // Un pseudo (« @emmanuel.ako », « franck.traore ») n'a ni « / » ni « : » et n'est pas un nom de site du réseau
    const looksLikeUrl = /[\/:]/.test(value) || hostMatches(value.split(/[?#]/)[0].toLowerCase(), def.hosts);
    if (value.startsWith("@") || !looksLikeUrl) {
        if (!def.handle) return { error: "Collez le lien complet." };
        if (!/^[A-Za-z0-9._-]{2,50}$/.test(handle)) return { error: "Pseudo invalide (lettres, chiffres, point, tiret, tiret bas)." };
        return { url: def.handle(handle) };
    }

    if (!/^https?:\/\//i.test(value)) value = "https://" + value;
    let url;
    try { url = new URL(value); } catch (error) { return { error: "Lien invalide." }; }
    if (!hostMatches(url.hostname, def.hosts)) return { error: `Ce lien n'est pas une adresse ${def.label}.` };
    url.protocol = "https:";
    url.username = url.password = "";
    return { url: url.href };
}

module.exports = function createSocialRouter({ express, query, requireAuth, fail }) {

    const router = express.Router();

    async function readAll() {
        const rows = (await query("SELECT owner, network, url FROM social_links")).rows;
        const company = {}, founders = {};
        FOUNDERS.forEach(f => { founders[f.slug] = {}; });
        rows.forEach(r => {
            if (!BY_KEY[r.network]) return;
            if (r.owner === "company") company[r.network] = r.url;
            else if (founders[r.owner]) founders[r.owner][r.network] = r.url;
        });
        return { company, founders };
    }

    router.get("/social", async (req, res) => {
        try {
            res.set("Cache-Control", "public, max-age=60");
            res.json({ success: true, ...(await readAll()) });
        } catch (error) {
            console.error(error);
            fail(res, 500, "Erreur lors du chargement des réseaux sociaux.");
        }
    });

    router.get("/admin/social", requireAuth, async (req, res) => {
        try {
            res.json({
                success: true,
                networks: NETWORKS.map(({ key, label, hint }) => ({ key, label, hint })),
                owners: [{ slug: "company", name: "RECTOY-AIRES (liens de l'entreprise)" }, ...FOUNDERS],
                ...(await readAll())
            });
        } catch (error) {
            console.error(error);
            fail(res, 500, "Erreur lors du chargement des réseaux sociaux.");
        }
    });

    // Corps : { company: { facebook: "…", … }, founders: { emmanuel: { … }, … } }
    // Les propriétaires envoyés sont remplacés en entier (champ vide = lien supprimé).
    router.put("/admin/social", requireAuth, async (req, res) => {
        try {
            const body = req.body || {};
            const incoming = { company: body.company, ...(body.founders || {}) };
            const owners = [], rowOwner = [], rowNetwork = [], rowUrl = [];

            for (const owner of Object.keys(incoming)) {
                if (!OWNERS.includes(owner)) return fail(res, 400, "Cofondateur inconnu.");
                const links = incoming[owner];
                if (links == null || typeof links !== "object" || Array.isArray(links)) continue;
                const who = owner === "company" ? "Entreprise" : FOUNDERS.find(f => f.slug === owner).name;
                owners.push(owner);

                for (const key of Object.keys(links)) {
                    const out = normalize(key, links[key]);
                    if (out.error) return fail(res, 400, `${who} — ${BY_KEY[key] ? BY_KEY[key].label : key} : ${out.error}`);
                    if (out.url) { rowOwner.push(owner); rowNetwork.push(key); rowUrl.push(out.url); }
                }
            }
            if (!owners.length) return fail(res, 400, "Aucune donnée à enregistrer.");

            // Une seule requête atomique : supprime les liens retirés, ajoute ou met à jour les autres
            await query(
                `WITH incoming AS (
                     SELECT * FROM unnest($2::text[], $3::text[], $4::text[]) AS t(owner, network, url)
                 ),
                 removed AS (
                     DELETE FROM social_links s
                     WHERE s.owner = ANY($1::text[])
                       AND NOT EXISTS (SELECT 1 FROM incoming i WHERE i.owner = s.owner AND i.network = s.network)
                     RETURNING 1
                 )
                 INSERT INTO social_links (owner, network, url)
                 SELECT owner, network, url FROM incoming
                 ON CONFLICT (owner, network) DO UPDATE SET url = EXCLUDED.url, updated_at = NOW()`,
                [owners, rowOwner, rowNetwork, rowUrl]);

            res.json({ success: true, message: "Réseaux sociaux enregistrés.", ...(await readAll()) });
        } catch (error) {
            console.error(error);
            fail(res, 500, "Erreur lors de l'enregistrement.");
        }
    });

    return router;
};

module.exports.normalize = normalize;
