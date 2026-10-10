const path = require("path");

require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const bcrypt = require("bcryptjs");
const multer = require("multer");

const { pool, query } = require("./src/config/database");
const { migrate } = require("./src/config/migrate");
const social = require("./src/social/publisher");

const app = express();
const PORT = process.env.PORT || 4000;
const IS_PROD = process.env.NODE_ENV === "production";


// ================================
// VARIABLES D'ENVIRONNEMENT REQUISES
// ================================

const missingEnv = ["SESSION_SECRET", "ADMIN_USERNAME", "ADMIN_PASSWORD_HASH"]
    .filter(key => !process.env[key]);

if (missingEnv.length > 0) {
    console.error("Variables d'environnement manquantes : " + missingEnv.join(", "));
    console.error("En local : fichier .env dans " + __dirname);
    console.error("Sur Render : onglet Environment du service.");
    process.exit(1);
}


// ================================
// CONFIGURATION
// ================================

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean);

const renderUrl = (process.env.RENDER_EXTERNAL_URL || "").replace(/\/$/, "");
if (renderUrl) allowedOrigins.push(renderUrl);

app.set("trust proxy", 1);

// Le site et l'API sont sur le même domaine : on autorise toujours cette origine.
app.use(cors((req, callback) => {
    const origin = req.get("Origin");
    const sameOrigin = origin && origin === `${req.protocol}://${req.get("host")}`;

    if (!origin || sameOrigin || allowedOrigins.includes(origin)) {
        return callback(null, { origin: true, credentials: true });
    }
    return callback(new Error("Origine non autorisée par CORS."));
}));

// En-têtes de sécurité
const CSP = [
    "default-src 'self'",
    "img-src 'self' data: https://i.ytimg.com",
    "media-src 'self' blob:",
    "frame-src https://www.youtube-nocookie.com https://player.vimeo.com",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self'",
    "connect-src 'self' https://formspree.io",
    "form-action 'self' https://formspree.io",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "object-src 'none'"
].join("; ");

app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(self), geolocation=()"); // micro : dictée vocale de l'assistant
    if (IS_PROD) {
        res.setHeader("Strict-Transport-Security", "max-age=15552000");
    }

    // La politique stricte s'applique au site public. L'admin (/admin) et la
    // page /reunion.html utilisent du JavaScript intégré et en sont exclus.
    const relaxed = req.path.startsWith("/admin") || req.path === "/reunion.html";
    if (process.env.CSP_DISABLED !== "true" && !relaxed) {
        res.setHeader("Content-Security-Policy", CSP);
    }

    res.removeHeader("X-Powered-By");
    next();
});

app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

// Contrôle de santé (Render) : vérifie aussi la base.
app.get("/healthz", async (req, res) => {
    try {
        await query("SELECT 1");
        res.status(200).send("ok");
    } catch (error) {
        res.status(503).send("base de données indisponible");
    }
});

// Sessions stockées dans PostgreSQL : elles survivent aux redémarrages.
app.use(session({
    store: new pgSession({ pool, tableName: "session" }),
    name: "rectoy.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: IS_PROD,
        maxAge: 1000 * 60 * 60 * 8 // 8 heures
    }
}));

// Site public + administration (/admin/)
app.use(express.static(path.join(__dirname, "public")));


// ================================
// AUTHENTIFICATION ADMIN
// ================================

function requireAuth(req, res, next) {
    if (req.session && req.session.isAdmin) return next();
    return res.status(401).json({ success: false, message: "Authentification requise." });
}

const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function isRateLimited(key) {
    const entry = loginAttempts.get(key);
    if (!entry) return false;
    if (Date.now() - entry.firstAttempt > WINDOW_MS) {
        loginAttempts.delete(key);
        return false;
    }
    return entry.count >= MAX_ATTEMPTS;
}

function registerFailedAttempt(key) {
    const entry = loginAttempts.get(key);
    if (!entry || Date.now() - entry.firstAttempt > WINDOW_MS) {
        loginAttempts.set(key, { count: 1, firstAttempt: Date.now() });
        return;
    }
    entry.count += 1;
}

app.post("/api/admin/login", async (req, res) => {
    const ip = req.ip;

    if (isRateLimited(ip)) {
        return res.status(429).json({
            success: false,
            message: "Trop de tentatives. Réessayez dans quelques minutes."
        });
    }

    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: "Identifiant et mot de passe requis." });
    }

    // Le hash est toujours comparé, même si l'identifiant est faux
    // (évite de révéler par le temps de réponse si l'identifiant existe).
    const passwordOk = await bcrypt.compare(String(password), process.env.ADMIN_PASSWORD_HASH);
    const validUsername = username === process.env.ADMIN_USERNAME;

    if (!validUsername || !passwordOk) {
        registerFailedAttempt(ip);
        return res.status(401).json({ success: false, message: "Identifiants invalides." });
    }

    loginAttempts.delete(ip);
    // Nouvelle session à chaque connexion (protège contre la fixation de session)
    req.session.regenerate(error => {
        if (error) return fail(res, 500, "Erreur de session.");
        req.session.isAdmin = true;
        req.session.username = username;
        res.json({ success: true, message: "Connexion réussie." });
    });
});

app.post("/api/admin/logout", (req, res) => {
    req.session.destroy(() => {
        res.clearCookie("rectoy.sid");
        res.json({ success: true });
    });
});

app.get("/api/admin/session", (req, res) => {
    res.json({
        success: true,
        authenticated: !!(req.session && req.session.isAdmin),
        username: req.session ? req.session.username : null
    });
});


// ================================
// IMAGES (stockées dans PostgreSQL)
// ================================

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 Mo
    fileFilter: (req, file, cb) => {
        if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
            return cb(new Error("Format d'image non autorisé (JPG, PNG ou WEBP uniquement)."));
        }
        cb(null, true);
    }
});

// Vérifie le contenu réel du fichier (et pas seulement le type annoncé).
function hasValidImageSignature(buffer, mime) {
    if (!buffer || buffer.length < 12) return false;
    if (mime === "image/jpeg") return buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
    if (mime === "image/png") return buffer.slice(0, 4).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47]));
    if (mime === "image/webp") {
        return buffer.slice(0, 4).toString("ascii") === "RIFF" &&
               buffer.slice(8, 12).toString("ascii") === "WEBP";
    }
    return false;
}


// ================================
// OUTILS
// ================================

const ALLOWED_TYPES = ["annonce", "evenement", "publicite"];
const ALLOWED_STATUS = ["published", "draft"];

const COLUMNS = `id, title, type, description,
    to_char(event_date, 'YYYY-MM-DD') AS date,
    location, link, status,
    (image_data IS NOT NULL) AS has_image,
    created_at, updated_at`;

function toPublication(row) {
    return {
        id: String(row.id),
        title: row.title,
        type: row.type,
        description: row.description,
        date: row.date,
        location: row.location,
        link: row.link,
        status: row.status,
        image: row.has_image
            ? `/api/publications/${row.id}/image?v=${new Date(row.updated_at).getTime()}`
            : null,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

// Refuse javascript:, data:, etc. (seuls http/https sont acceptés)
function isSafeLink(value) {
    try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch (error) {
        return false;
    }
}

const isValidDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(new Date(value));
const isValidId = value => /^\d{1,18}$/.test(value);
const clean = value => (typeof value === "string" ? value.trim() : value);
const fail = (res, status, message) => res.status(status).json({ success: false, message });


// ================================
// ROUTES PUBLIQUES
// ================================

app.get("/api", (req, res) => {
    res.json({ success: true, message: "API RECTOY-AIRES opérationnelle", version: "2.0.0" });
});

app.get("/api/publications", async (req, res) => {
    try {
        const result = await query(
            `SELECT ${COLUMNS} FROM site_publications
             WHERE status = 'published' ORDER BY created_at DESC`
        );
        res.json({ success: true, publications: result.rows.map(toPublication) });
    } catch (error) {
        console.error(error);
        fail(res, 500, "Erreur lors du chargement des publications.");
    }
});

app.get("/api/publications/:id/image", async (req, res) => {
    try {
        if (!isValidId(req.params.id)) return res.sendStatus(404);

        const result = await query(
            "SELECT image_data, image_mime, status FROM site_publications WHERE id = $1",
            [req.params.id]
        );
        const row = result.rows[0];

        if (!row || !row.image_data) return res.sendStatus(404);

        const isAdmin = !!(req.session && req.session.isAdmin);
        if (row.status !== "published" && !isAdmin) return res.sendStatus(404);

        res.set({
            "Content-Type": row.image_mime,
            "Cache-Control": `${row.status === "published" ? "public" : "private"}, max-age=86400`
        });
        res.send(row.image_data);
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
});


// ================================
// ROUTES ADMIN
// ================================

app.get("/api/admin/publications", requireAuth, async (req, res) => {
    try {
        const result = await query(
            `SELECT ${COLUMNS} FROM site_publications ORDER BY created_at DESC`
        );
        res.json({ success: true, publications: result.rows.map(toPublication) });
    } catch (error) {
        console.error(error);
        fail(res, 500, "Erreur lors du chargement des publications.");
    }
});

app.post("/api/admin/publications", requireAuth, upload.single("image"), async (req, res) => {
    try {
        const title = clean(req.body.title);
        const type = req.body.type;
        const description = clean(req.body.description);
        const date = clean(req.body.date) || null;
        const location = clean(req.body.location) || null;
        const link = clean(req.body.link) || null;
        const status = ALLOWED_STATUS.includes(req.body.status) ? req.body.status : "published";

        if (!title || !type || !description) {
            return fail(res, 400, "Le titre, le type et la description sont obligatoires.");
        }
        if (title.length > 150 || (location && location.length > 150)) {
            return fail(res, 400, "Titre ou lieu trop long (150 caractères maximum).");
        }
        if (!ALLOWED_TYPES.includes(type)) return fail(res, 400, "Type de publication invalide.");
        if (date && !isValidDate(date)) return fail(res, 400, "Date invalide.");
        if (link && !isSafeLink(link)) return fail(res, 400, "Le lien doit commencer par http:// ou https://");

        let imageData = null, imageMime = null;
        if (req.file) {
            if (!hasValidImageSignature(req.file.buffer, req.file.mimetype)) {
                return fail(res, 400, "Le fichier n'est pas une image valide.");
            }
            imageData = req.file.buffer;
            imageMime = req.file.mimetype;
        }

        const result = await query(
            `INSERT INTO site_publications
             (title, type, description, event_date, location, link, status, image_data, image_mime)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
             RETURNING ${COLUMNS}`,
            [title, type, description, date, location, link, status, imageData, imageMime]
        );

        const row = result.rows[0];
        const socialResult = await pushToSocial(req, { kind: "publication", table: "site_publications",
            row: { id: row.id, status: row.status }, title, text: description, hasImage: row.has_image });

        res.status(201).json({
            success: true,
            message: "Publication créée avec succès.",
            publication: toPublication(row),
            social: socialResult
        });
    } catch (error) {
        console.error(error);
        fail(res, 500, "Erreur lors de la création.");
    }
});

app.put("/api/admin/publications/:id", requireAuth, upload.single("image"), async (req, res) => {
    try {
        if (!isValidId(req.params.id)) return fail(res, 404, "Publication introuvable.");

        const current = (await query(
            `SELECT ${COLUMNS} FROM site_publications WHERE id = $1`, [req.params.id]
        )).rows[0];

        if (!current) return fail(res, 404, "Publication introuvable.");

        const b = req.body;
        const has = key => b[key] !== undefined;

        const title = has("title") ? clean(b.title) : current.title;
        const type = has("type") ? b.type : current.type;
        const description = has("description") ? clean(b.description) : current.description;
        const date = has("date") ? (clean(b.date) || null) : current.date;
        const location = has("location") ? (clean(b.location) || null) : current.location;
        const link = has("link") ? (clean(b.link) || null) : current.link;
        const status = has("status") ? b.status : current.status;

        if (!title || !description) return fail(res, 400, "Le titre et la description sont obligatoires.");
        if (title.length > 150 || (location && location.length > 150)) {
            return fail(res, 400, "Titre ou lieu trop long (150 caractères maximum).");
        }
        if (!ALLOWED_TYPES.includes(type)) return fail(res, 400, "Type de publication invalide.");
        if (!ALLOWED_STATUS.includes(status)) return fail(res, 400, "Statut invalide.");
        if (date && !isValidDate(date)) return fail(res, 400, "Date invalide.");
        if (link && !isSafeLink(link)) return fail(res, 400, "Le lien doit commencer par http:// ou https://");

        const values = [title, type, description, date, location, link, status];
        let sql = `UPDATE site_publications SET
            title=$1, type=$2, description=$3, event_date=$4, location=$5, link=$6, status=$7`;

        if (req.file) {
            if (!hasValidImageSignature(req.file.buffer, req.file.mimetype)) {
                return fail(res, 400, "Le fichier n'est pas une image valide.");
            }
            values.push(req.file.buffer, req.file.mimetype);
            sql += `, image_data=$8, image_mime=$9`;
        }

        values.push(req.params.id);
        sql += ` WHERE id=$${values.length} RETURNING ${COLUMNS}`;

        const result = await query(sql, values);

        const row = result.rows[0];
        const socialResult = await pushToSocial(req, { kind: "publication", table: "site_publications",
            row: { id: row.id, status: row.status }, title: row.title, text: row.description, hasImage: row.has_image });

        res.json({
            success: true,
            message: "Publication modifiée.",
            publication: toPublication(row),
            social: socialResult
        });
    } catch (error) {
        console.error(error);
        fail(res, 500, "Erreur lors de la modification.");
    }
});

app.delete("/api/admin/publications/:id", requireAuth, async (req, res) => {
    try {
        if (!isValidId(req.params.id)) return fail(res, 404, "Publication introuvable.");

        const result = await query(
            "DELETE FROM site_publications WHERE id = $1 RETURNING id", [req.params.id]
        );
        if (result.rowCount === 0) return fail(res, 404, "Publication introuvable.");

        res.json({ success: true, message: "Publication supprimée." });
    } catch (error) {
        console.error(error);
        fail(res, 500, "Erreur lors de la suppression.");
    }
});



// ================================
// PARTAGE SUR LES RÉSEAUX SOCIAUX
// ================================
// /share/publication/:id et /share/magazine/:id renvoient une page avec les balises
// Open Graph (titre, texte, image) : Facebook, WhatsApp, LinkedIn… affichent ainsi
// une belle carte, puis le visiteur est redirigé vers le site.

const escHtml = v => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function sharePage(res, { base, title, description, image, target }) {
    const url = base + target;
    res.set("Cache-Control", "public, max-age=300").type("html").send(
        `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">` +
        `<title>${escHtml(title)} | RECTOY-AIRES</title>` +
        `<meta name="description" content="${escHtml(description)}">` +
        `<meta property="og:type" content="article"><meta property="og:site_name" content="RECTOY-AIRES">` +
        `<meta property="og:title" content="${escHtml(title)}"><meta property="og:description" content="${escHtml(description)}">` +
        `<meta property="og:image" content="${escHtml(image)}"><meta property="og:url" content="${escHtml(url)}">` +
        `<meta name="twitter:card" content="summary_large_image">` +
        `<meta http-equiv="refresh" content="0;url=${escHtml(target)}"></head>` +
        `<body style="font-family:Arial,sans-serif;text-align:center;padding:60px 20px">` +
        `<p><a href="${escHtml(target)}">Ouvrir l'article sur RECTOY-AIRES →</a></p></body></html>`
    );
}

app.get("/share/publication/:id", async (req, res) => {
    try {
        if (!isValidId(req.params.id)) return res.redirect("/#actualites");
        const row = (await query(
            "SELECT id, title, description, (image_data IS NOT NULL) AS has_image FROM site_publications WHERE id=$1 AND status='published'",
            [req.params.id])).rows[0];
        if (!row) return res.redirect("/#actualites");
        const base = social.siteUrl(req);
        sharePage(res, { base, title: row.title, description: social.buildMessage("", row.description, 200),
            image: row.has_image ? `${base}/api/publications/${row.id}/image` : `${base}/src/logo.jpeg`,
            target: "/#actualites" });
    } catch (error) { console.error(error); res.redirect("/#actualites"); }
});

app.get("/share/magazine/:id", async (req, res) => {
    try {
        if (!isValidId(req.params.id)) return res.redirect("/magazine.html");
        const row = (await query(
            "SELECT id, title, summary, (image_data IS NOT NULL) AS has_image FROM magazine_articles WHERE id=$1 AND status='published'",
            [req.params.id])).rows[0];
        if (!row) return res.redirect("/magazine.html");
        const base = social.siteUrl(req);
        sharePage(res, { base, title: row.title, description: row.summary,
            image: row.has_image ? `${base}/api/magazine/${row.id}/image` : `${base}/src/logo.jpeg`,
            target: `/magazine.html?article=${row.id}` });
    } catch (error) { console.error(error); res.redirect("/magazine.html"); }
});

// Quels réseaux sont prêts pour l'envoi automatique ? (admin)
app.get("/api/admin/social/status", requireAuth, (req, res) => {
    res.json({ success: true, networks: social.configured() });
});

// Envoi vers les réseaux demandés par l'administrateur.
// kind = "publication" | "magazine" ; renvoie le résultat par réseau et le mémorise.
async function pushToSocial(req, { kind, table, row, title, text, hasImage }) {
    const wanted = [];
    if (req.body.shareFacebook === "true" || req.body.shareFacebook === "on") wanted.push("facebook");
    if (req.body.shareInstagram === "true" || req.body.shareInstagram === "on") wanted.push("instagram");
    if (!wanted.length || row.status !== "published") return null;

    const base = social.siteUrl(req);
    const path = kind === "magazine" ? "magazine" : "publication";
    const imageRoute = kind === "magazine" ? "magazine" : "publications";
    const result = await social.publish(wanted, {
        message: social.buildMessage(title, text),
        shareUrl: `${base}/share/${path}/${row.id}`,
        imageUrl: hasImage ? `${base}/api/${imageRoute}/${row.id}/image` : null
    });
    try {
        await query(`UPDATE ${table} SET social_posts = social_posts || $1::jsonb WHERE id = $2`,
            [JSON.stringify(Object.fromEntries(Object.entries(result).map(([k, v]) => [k, { ...v, at: new Date().toISOString() }]))), row.id]);
    } catch (error) { console.error(error.message); }
    return result;
}

// ================================
// RECTOY MAGAZINE
// ================================

app.use("/api", require("./src/routes/magazine")({
    express, query, requireAuth, upload, hasValidImageSignature, fail, pushToSocial
}));


// ================================
// VIDÉOS (publicités, reportages, présentation)
// ================================

app.use("/api", require("./src/routes/videos")({
    express, query, requireAuth, fail, hasValidImageSignature
}));


// ================================
// RÉSEAUX SOCIAUX (entreprise + cofondateurs)
// ================================

app.use("/api", require("./src/routes/social")({ express, query, requireAuth, fail }));


// ================================
// ASSISTANT IA + RELAIS CONSEILLER
// ================================

app.use("/api", require("./src/routes/assistant")({ express, query, requireAuth, fail }));


// ================================
// ROUTES INTROUVABLES
// ================================

app.use("/api", (req, res) => fail(res, 404, "Route introuvable."));

app.use((req, res) => {
    res.status(404).type("html").send(
        '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">' +
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
        '<title>Page introuvable | RECTOY-AIRES</title></head>' +
        '<body style="font-family:Arial,sans-serif;text-align:center;padding:80px 20px;color:#16263d">' +
        '<h1>404</h1><p>Cette page n\'existe pas.</p>' +
        '<p><a href="/" style="color:#0b6bcb">Retour à l\'accueil</a></p></body></html>'
    );
});


// ================================
// GESTION D'ERREURS GLOBALE
// ================================

app.use((error, req, res, next) => {
    console.error(error.message);

    if (error instanceof multer.MulterError) {
        const videoMax = require("./src/routes/videos").MAX_MB;
        const message = error.code === "LIMIT_FILE_SIZE"
            ? (error.field === "video"
                ? `La vidéo est trop lourde (${videoMax} Mo maximum). Compressez-la ou collez un lien YouTube / Vimeo.`
                : "L'image est trop lourde (5 Mo maximum).")
            : "Envoi de fichier invalide.";
        return fail(res, 400, message);
    }
    if (error.message === "Origine non autorisée par CORS.") return fail(res, 403, error.message);
    if (/Format (d'image|de vidéo) non autorisé|Envoi de fichier invalide/.test(error.message)) return fail(res, 400, error.message);

    return fail(res, 500, "Erreur interne du serveur.");
});


// ================================
// DEMARRAGE
// ================================

(async () => {
    try {
        if (process.env.AUTO_MIGRATE !== "false") await migrate();
    } catch (error) {
        console.error("Base de données indisponible :", error.message);
        process.exit(1);
    }

    const server = app.listen(PORT, () => {
        console.log("");
        console.log("================================");
        console.log(" RECTOY-AIRES BACKEND");
        console.log("================================");
        console.log(`Site : http://localhost:${PORT}`);
        console.log(`Admin : http://localhost:${PORT}/admin/`);
        console.log("================================");
        console.log("");
    });

    // Arrêt propre quand Render redémarre le service
    process.on("SIGTERM", () => {
        server.close(() => pool.end().finally(() => process.exit(0)));
    });
})();
