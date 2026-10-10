/**
 * Vidéos du site : publicités, reportages du magazine, présentation.
 *   Public : GET /api/videos, GET /api/videos/:id/stream (lecture progressive), GET /api/videos/:id/poster
 *   Admin  : GET/POST /api/admin/videos, PUT/DELETE /api/admin/videos/:id
 *
 * Deux sources : un fichier MP4/WEBM envoyé (stocké dans PostgreSQL, servi par tranches
 * avec prise en charge de « Range » pour pouvoir avancer dans la vidéo), ou un lien
 * YouTube / Vimeo (conseillé pour les vidéos longues : aucun poids pour la base).
 */

const multer = require("multer");

const KINDS = ["publicite", "reportage", "presentation"];
const STATUS = ["published", "draft"];
const VIDEO_TYPES = ["video/mp4", "video/webm"];
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_MB = Math.max(1, Number(process.env.VIDEO_MAX_MB) || 40);
const MAX_BYTES = MAX_MB * 1024 * 1024;
const POSTER_MAX = 5 * 1024 * 1024;
const CHUNK = 1024 * 1024; // lecture de la base par tranches de 1 Mo

const COLS = `id, title, description, kind, source, embed_url,
    (video_data IS NOT NULL) AS has_video, video_size,
    (poster_data IS NOT NULL) AS has_poster,
    cta_label, cta_link, article_id, is_featured, status, created_at, updated_at`;

const isId = value => /^\d{1,18}$/.test(String(value));
const clean = value => (typeof value === "string" ? value.trim() : value);
const toBool = value => value === true || ["true", "on", "1", "yes"].includes(String(value).toLowerCase());

// Reconnaît un lien YouTube ou Vimeo et renvoie l'adresse de lecture intégrée.
function parseEmbed(value) {
    let url;
    try { url = new URL(String(value || "").trim()); } catch (error) { return null; }
    if (!/^https?:$/.test(url.protocol)) return null;
    const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "");

    let id = null;
    if (host === "youtu.be") id = url.pathname.slice(1).split("/")[0];
    else if (host === "youtube.com" || host === "youtube-nocookie.com") {
        if (url.pathname === "/watch") id = url.searchParams.get("v");
        else {
            const m = url.pathname.match(/^\/(?:embed|shorts|live|v)\/([\w-]{11})/);
            if (m) id = m[1];
        }
    }
    if (id && /^[\w-]{11}$/.test(id)) {
        return { provider: "youtube", id, embed: `https://www.youtube-nocookie.com/embed/${id}`,
                 thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` };
    }

    if (host === "vimeo.com" || host === "player.vimeo.com") {
        const m = url.pathname.match(/(?:\/video)?\/(\d{6,12})/);
        if (m) return { provider: "vimeo", id: m[1], embed: `https://player.vimeo.com/video/${m[1]}`, thumb: null };
    }
    return null;
}

// Liens d'action : http(s) ou chemin interne du site (/magazine.html, /#contact)
function isSafeLink(value) {
    if (/^\/(?!\/)[^\s]*$/.test(value)) return true;
    try { const u = new URL(value); return u.protocol === "http:" || u.protocol === "https:"; }
    catch (error) { return false; }
}

// Vérifie le contenu réel du fichier (pas seulement le type annoncé).
function hasValidVideoSignature(buffer, mime) {
    if (!buffer || buffer.length < 16) return false;
    if (mime === "video/mp4") return buffer.slice(4, 8).toString("ascii") === "ftyp";
    if (mime === "video/webm") return buffer.slice(0, 4).equals(Buffer.from([0x1A, 0x45, 0xDF, 0xA3]));
    return false;
}

function toVideo(row) {
    const embed = row.source === "embed" ? parseEmbed(row.embed_url) : null;
    const stamp = new Date(row.updated_at).getTime();
    return {
        id: String(row.id),
        title: row.title,
        description: row.description,
        kind: row.kind,
        source: row.source,
        provider: embed ? embed.provider : null,
        embedUrl: embed ? embed.embed : null,
        watchUrl: row.source === "embed" ? row.embed_url : null,
        videoUrl: row.has_video ? `/api/videos/${row.id}/stream?v=${stamp}` : null,
        size: row.video_size ? Number(row.video_size) : null,
        poster: row.has_poster ? `/api/videos/${row.id}/poster?v=${stamp}` : (embed && embed.thumb) || null,
        ctaLabel: row.cta_label,
        ctaLink: row.cta_link,
        articleId: row.article_id ? String(row.article_id) : null,
        featured: row.is_featured,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

module.exports = function createVideosRouter({ express, query, requireAuth, fail, hasValidImageSignature }) {

    const router = express.Router();

    const upload = multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: MAX_BYTES, files: 2 },
        fileFilter: (req, file, cb) => {
            if (file.fieldname === "video") {
                if (!VIDEO_TYPES.includes(file.mimetype)) return cb(new Error("Format de vidéo non autorisé (MP4 ou WEBM uniquement)."));
            } else if (file.fieldname === "poster") {
                if (!IMAGE_TYPES.includes(file.mimetype)) return cb(new Error("Format d'image non autorisé (JPG, PNG ou WEBP uniquement)."));
            } else {
                return cb(new Error("Envoi de fichier invalide."));
            }
            cb(null, true);
        }
    });
    const uploadFields = upload.fields([{ name: "video", maxCount: 1 }, { name: "poster", maxCount: 1 }]);

    // ---------- PUBLIC ----------

    router.get("/videos", async (req, res) => {
        try {
            const params = [];
            let where = "status = 'published'";

            if (KINDS.includes(req.query.kind)) { params.push(req.query.kind); where += ` AND kind = $${params.length}`; }
            if (isId(req.query.article)) { params.push(req.query.article); where += ` AND article_id = $${params.length}`; }
            if (req.query.featured === "1") where += " AND is_featured = TRUE";

            let limit = Number.parseInt(req.query.limit, 10);
            if (!(limit > 0)) limit = 60;
            params.push(Math.min(limit, 100));

            const result = await query(
                `SELECT ${COLS} FROM site_videos WHERE ${where}
                 ORDER BY is_featured DESC, created_at DESC LIMIT $${params.length}`, params);
            res.set("Cache-Control", "public, max-age=30");
            res.json({ success: true, videos: result.rows.map(toVideo) });
        } catch (error) {
            console.error(error);
            fail(res, 500, "Erreur lors du chargement des vidéos.");
        }
    });

    router.get("/videos/:id/poster", async (req, res) => {
        try {
            if (!isId(req.params.id)) return res.sendStatus(404);
            const row = (await query(
                "SELECT poster_data, poster_mime, status FROM site_videos WHERE id = $1", [req.params.id])).rows[0];
            if (!row || !row.poster_data) return res.sendStatus(404);
            const isAdmin = !!(req.session && req.session.isAdmin);
            if (row.status !== "published" && !isAdmin) return res.sendStatus(404);
            res.set({ "Content-Type": row.poster_mime,
                      "Cache-Control": `${row.status === "published" ? "public" : "private"}, max-age=86400` });
            res.send(row.poster_data);
        } catch (error) {
            console.error(error);
            res.sendStatus(500);
        }
    });

    // Lecture progressive : prend en charge l'en-tête Range (avance/retour dans la vidéo).
    router.get("/videos/:id/stream", async (req, res) => {
        try {
            if (!isId(req.params.id)) return res.sendStatus(404);

            const meta = (await query(
                `SELECT video_mime, octet_length(video_data) AS size, status
                 FROM site_videos WHERE id = $1 AND video_data IS NOT NULL`, [req.params.id])).rows[0];
            if (!meta) return res.sendStatus(404);

            const isAdmin = !!(req.session && req.session.isAdmin);
            if (meta.status !== "published" && !isAdmin) return res.sendStatus(404);

            const size = Number(meta.size);
            let start = 0, end = size - 1, code = 200;

            if (req.headers.range) {
                const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
                if (!m || (m[1] === "" && m[2] === "")) {
                    return res.status(416).set("Content-Range", `bytes */${size}`).end();
                }
                if (m[1] === "") {                       // « les N derniers octets »
                    start = Math.max(size - Number(m[2]), 0);
                } else {
                    start = Number(m[1]);
                    if (m[2] !== "") end = Math.min(Number(m[2]), size - 1);
                    else end = Math.min(start + 4 * CHUNK - 1, size - 1);
                }
                if (start >= size || start > end) {
                    return res.status(416).set("Content-Range", `bytes */${size}`).end();
                }
                code = 206;
            }

            res.status(code).set({
                "Content-Type": meta.video_mime,
                "Accept-Ranges": "bytes",
                "Content-Length": String(end - start + 1),
                "Cache-Control": `${meta.status === "published" ? "public" : "private"}, max-age=86400`
            });
            if (code === 206) res.set("Content-Range", `bytes ${start}-${end}/${size}`);

            for (let pos = start; pos <= end; pos += CHUNK) {
                if (res.destroyed || res.writableEnded) return;   // le visiteur a quitté ou avancé
                const len = Math.min(CHUNK, end - pos + 1);
                const part = (await query(
                    "SELECT substring(video_data FROM $2::int FOR $3::int) AS part FROM site_videos WHERE id = $1",
                    [req.params.id, pos + 1, len])).rows[0];
                if (!part || !part.part) break;
                if (!res.write(part.part)) await new Promise(resolve => res.once("drain", resolve).once("close", resolve));
            }
            res.end();
        } catch (error) {
            console.error(error.message);
            if (!res.headersSent) res.sendStatus(500); else res.destroy();
        }
    });

    // ---------- ADMIN ----------

    router.get("/admin/videos", requireAuth, async (req, res) => {
        try {
            const result = await query(`SELECT ${COLS} FROM site_videos ORDER BY created_at DESC`);
            res.json({ success: true, maxMb: MAX_MB, videos: result.rows.map(toVideo) });
        } catch (error) {
            console.error(error);
            fail(res, 500, "Erreur lors du chargement des vidéos.");
        }
    });

    // Contrôle les champs ; renvoie { error } ou { v } (v = valeurs prêtes pour la base)
    async function validate(req, current) {
        const b = req.body;
        const has = key => b[key] !== undefined;
        const file = req.files && req.files.video && req.files.video[0];
        const poster = req.files && req.files.poster && req.files.poster[0];

        const v = {
            title: has("title") ? clean(b.title) : current.title,
            description: has("description") ? (clean(b.description) || null) : current.description,
            kind: has("kind") ? b.kind : current.kind,
            status: has("status") ? b.status : current.status,
            featured: has("featured") ? toBool(b.featured) : current.is_featured,
            ctaLabel: has("ctaLabel") ? (clean(b.ctaLabel) || null) : current.cta_label,
            ctaLink: has("ctaLink") ? (clean(b.ctaLink) || null) : current.cta_link,
            articleId: has("articleId") ? (clean(b.articleId) || null) : (current.article_id ? String(current.article_id) : null),
            source: current.source,
            embedUrl: current.embed_url,
            file: null, poster: null, clearVideo: false
        };

        if (!v.title) return { error: "Le titre est obligatoire." };
        if (v.title.length > 150) return { error: "Titre trop long (150 caractères maximum)." };
        if (v.description && v.description.length > 1500) return { error: "Description trop longue (1 500 caractères maximum)." };
        if (!KINDS.includes(v.kind)) return { error: "Type de vidéo invalide." };
        if (!STATUS.includes(v.status)) return { error: "Statut invalide." };
        if (v.ctaLabel && v.ctaLabel.length > 40) return { error: "Texte du bouton trop long (40 caractères maximum)." };
        if (v.ctaLink && !isSafeLink(v.ctaLink)) return { error: "Le lien du bouton doit commencer par http://, https:// ou /" };
        if (v.ctaLink && !v.ctaLabel) v.ctaLabel = "En savoir plus";

        if (v.articleId) {
            if (!isId(v.articleId)) return { error: "Article du magazine invalide." };
            const found = (await query("SELECT 1 FROM magazine_articles WHERE id = $1", [v.articleId])).rows[0];
            if (!found) return { error: "L'article du magazine choisi n'existe plus." };
        }

        if (file) {
            if (!hasValidVideoSignature(file.buffer, file.mimetype)) return { error: "Le fichier n'est pas une vidéo MP4 ou WEBM valide." };
            v.source = "upload"; v.file = file; v.embedUrl = null;
        } else if (has("embedUrl") && clean(b.embedUrl)) {
            if (!parseEmbed(b.embedUrl)) return { error: "Lien non reconnu : collez une adresse YouTube ou Vimeo." };
            v.source = "embed"; v.embedUrl = clean(b.embedUrl); v.clearVideo = true;
        }
        if (!v.source) return { error: "Ajoutez un fichier vidéo (MP4/WEBM) ou un lien YouTube / Vimeo." };

        if (poster) {
            if (poster.size > POSTER_MAX) return { error: "L'image de couverture est trop lourde (5 Mo maximum)." };
            if (!hasValidImageSignature(poster.buffer, poster.mimetype)) return { error: "La couverture n'est pas une image valide." };
            v.poster = poster;
        }
        return { v };
    }

    router.post("/admin/videos", requireAuth, uploadFields, async (req, res) => {
        try {
            const { error, v } = await validate(req, { source: null, embed_url: null, is_featured: false,
                status: "published", kind: undefined, title: "", description: null, cta_label: null, cta_link: null, article_id: null });
            if (error) return fail(res, 400, error);

            const result = await query(
                `INSERT INTO site_videos (title, description, kind, source, embed_url, video_data, video_mime, video_size,
                    poster_data, poster_mime, cta_label, cta_link, article_id, is_featured, status)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING ${COLS}`,
                [v.title, v.description, v.kind, v.source, v.embedUrl,
                 v.file ? v.file.buffer : null, v.file ? v.file.mimetype : null, v.file ? v.file.size : null,
                 v.poster ? v.poster.buffer : null, v.poster ? v.poster.mimetype : null,
                 v.ctaLabel, v.ctaLink, v.articleId, v.featured, v.status]);
            res.status(201).json({ success: true, message: "Vidéo enregistrée.", video: toVideo(result.rows[0]) });
        } catch (error) {
            console.error(error);
            fail(res, 500, "Erreur lors de l'enregistrement de la vidéo.");
        }
    });

    router.put("/admin/videos/:id", requireAuth, uploadFields, async (req, res) => {
        try {
            if (!isId(req.params.id)) return fail(res, 404, "Vidéo introuvable.");
            const current = (await query(`SELECT ${COLS} FROM site_videos WHERE id = $1`, [req.params.id])).rows[0];
            if (!current) return fail(res, 404, "Vidéo introuvable.");

            const { error, v } = await validate(req, current);
            if (error) return fail(res, 400, error);

            const values = [v.title, v.description, v.kind, v.status, v.featured, v.ctaLabel, v.ctaLink, v.articleId, v.source, v.embedUrl];
            let sql = `UPDATE site_videos SET title=$1, description=$2, kind=$3, status=$4, is_featured=$5,
                       cta_label=$6, cta_link=$7, article_id=$8, source=$9, embed_url=$10`;

            if (v.file) {
                values.push(v.file.buffer, v.file.mimetype, v.file.size);
                sql += `, video_data=$${values.length - 2}, video_mime=$${values.length - 1}, video_size=$${values.length}`;
            } else if (v.clearVideo) {
                sql += ", video_data=NULL, video_mime=NULL, video_size=NULL";   // passage à un lien : on libère la base
            }
            if (v.poster) {
                values.push(v.poster.buffer, v.poster.mimetype);
                sql += `, poster_data=$${values.length - 1}, poster_mime=$${values.length}`;
            }
            values.push(req.params.id);
            sql += ` WHERE id=$${values.length} RETURNING ${COLS}`;

            const result = await query(sql, values);
            res.json({ success: true, message: "Vidéo modifiée.", video: toVideo(result.rows[0]) });
        } catch (error) {
            console.error(error);
            fail(res, 500, "Erreur lors de la modification de la vidéo.");
        }
    });

    router.delete("/admin/videos/:id", requireAuth, async (req, res) => {
        try {
            if (!isId(req.params.id)) return fail(res, 404, "Vidéo introuvable.");
            const result = await query("DELETE FROM site_videos WHERE id = $1 RETURNING id", [req.params.id]);
            if (result.rowCount === 0) return fail(res, 404, "Vidéo introuvable.");
            res.json({ success: true, message: "Vidéo supprimée." });
        } catch (error) {
            console.error(error);
            fail(res, 500, "Erreur lors de la suppression.");
        }
    });

    return router;
};

module.exports.MAX_MB = MAX_MB;
