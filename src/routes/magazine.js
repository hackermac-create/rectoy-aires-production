/**
 * API de RECTOY MAGAZINE
 *   Public : GET /api/magazine, /api/magazine/:id, /api/magazine/:id/image
 *   Admin  : GET/POST /api/admin/magazine, PUT/DELETE /api/admin/magazine/:id
 */

const CATEGORIES = ["portrait", "reportage", "entreprise", "investisseur", "produit", "activite", "publicite"];
const STATUS = ["published", "draft"];

const LIST_COLS = `id, title, category, summary, author, subject_name,
    (image_data IS NOT NULL) AS has_image, is_featured, status,
    (SELECT COUNT(*)::int FROM site_videos v
      WHERE v.article_id = magazine_articles.id AND v.status = 'published') AS video_count,
    published_at, created_at, updated_at`;
const FULL_COLS = LIST_COLS + ", content";

const isId = value => /^\d{1,18}$/.test(String(value));
const isDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(new Date(value));
const clean = value => (typeof value === "string" ? value.trim() : value);
const toBool = value => value === true || ["true", "on", "1", "yes"].includes(String(value).toLowerCase());

function toArticle(row) {
    const article = {
        id: String(row.id),
        title: row.title,
        category: row.category,
        summary: row.summary,
        author: row.author,
        subject: row.subject_name,
        featured: row.is_featured,
        videos: row.video_count || 0,
        status: row.status,
        image: row.has_image
            ? `/api/magazine/${row.id}/image?v=${new Date(row.updated_at).getTime()}`
            : null,
        publishedAt: row.published_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
    if (row.content !== undefined) article.content = row.content;
    return article;
}

module.exports = function createMagazineRouter({ express, query, requireAuth, upload, hasValidImageSignature, fail, pushToSocial }) {

    const router = express.Router();

    // ---------- PUBLIC ----------

    router.get("/magazine", async (req, res) => {
        try {
            const params = [];
            let where = "status = 'published'";

            if (CATEGORIES.includes(req.query.category)) {
                params.push(req.query.category);
                where += ` AND category = $${params.length}`;
            }

            let limit = Number.parseInt(req.query.limit, 10);
            if (!(limit > 0)) limit = 60;
            params.push(Math.min(limit, 100));

            const result = await query(
                `SELECT ${LIST_COLS} FROM magazine_articles
                 WHERE ${where} ORDER BY published_at DESC LIMIT $${params.length}`,
                params
            );
            res.json({ success: true, articles: result.rows.map(toArticle) });
        } catch (error) {
            console.error(error);
            fail(res, 500, "Erreur lors du chargement du magazine.");
        }
    });

    router.get("/magazine/:id/image", async (req, res) => {
        try {
            if (!isId(req.params.id)) return res.sendStatus(404);

            const row = (await query(
                "SELECT image_data, image_mime, status FROM magazine_articles WHERE id = $1",
                [req.params.id]
            )).rows[0];

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

    router.get("/magazine/:id", async (req, res) => {
        try {
            if (!isId(req.params.id)) return fail(res, 404, "Article introuvable.");

            const row = (await query(
                `SELECT ${FULL_COLS} FROM magazine_articles WHERE id = $1 AND status = 'published'`,
                [req.params.id]
            )).rows[0];

            if (!row) return fail(res, 404, "Article introuvable.");
            res.json({ success: true, article: toArticle(row) });
        } catch (error) {
            console.error(error);
            fail(res, 500, "Erreur lors du chargement de l'article.");
        }
    });

    // ---------- ADMIN ----------

    router.get("/admin/magazine", requireAuth, async (req, res) => {
        try {
            const result = await query(
                `SELECT ${FULL_COLS} FROM magazine_articles ORDER BY published_at DESC`
            );
            res.json({ success: true, articles: result.rows.map(toArticle) });
        } catch (error) {
            console.error(error);
            fail(res, 500, "Erreur lors du chargement des articles.");
        }
    });

    // Valide les champs et renvoie { error } ou { values }
    function validate(body, current) {
        const has = key => body[key] !== undefined;
        const v = {
            title: has("title") ? clean(body.title) : current.title,
            category: has("category") ? body.category : current.category,
            summary: has("summary") ? clean(body.summary) : current.summary,
            content: has("content") ? clean(body.content) : current.content,
            author: has("author") ? (clean(body.author) || null) : current.author,
            subject: has("subject") ? (clean(body.subject) || null) : current.subject_name,
            featured: has("featured") ? toBool(body.featured) : current.is_featured,
            status: has("status") ? body.status : current.status,
            publishedAt: has("publishedAt") ? (clean(body.publishedAt) || null) : null
        };

        if (!v.title || !v.summary || !v.content) return { error: "Le titre, le résumé et le contenu sont obligatoires." };
        if (v.title.length > 180) return { error: "Titre trop long (180 caractères maximum)." };
        if (v.summary.length > 400) return { error: "Résumé trop long (400 caractères maximum)." };
        if (v.content.length > 20000) return { error: "Contenu trop long (20 000 caractères maximum)." };
        if ((v.author && v.author.length > 100) || (v.subject && v.subject.length > 150)) {
            return { error: "Auteur ou sujet trop long." };
        }
        if (!CATEGORIES.includes(v.category)) return { error: "Catégorie invalide." };
        if (!STATUS.includes(v.status)) return { error: "Statut invalide." };
        if (v.publishedAt && !isDate(v.publishedAt)) return { error: "Date de publication invalide." };

        return { values: v };
    }

    router.post("/admin/magazine", requireAuth, upload.single("image"), async (req, res) => {
        try {
            const { error, values: v } = validate(req.body, {
                title: "", category: undefined, summary: "", content: "",
                author: null, subject_name: null, is_featured: false, status: "published"
            });
            if (error) return fail(res, 400, error);

            let imageData = null, imageMime = null;
            if (req.file) {
                if (!hasValidImageSignature(req.file.buffer, req.file.mimetype)) {
                    return fail(res, 400, "Le fichier n'est pas une image valide.");
                }
                imageData = req.file.buffer;
                imageMime = req.file.mimetype;
            }

            const result = await query(
                `INSERT INTO magazine_articles
                 (title, category, summary, content, author, subject_name, is_featured, status,
                  image_data, image_mime, published_at)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, COALESCE($11::date, NOW()))
                 RETURNING ${FULL_COLS}`,
                [v.title, v.category, v.summary, v.content, v.author, v.subject, v.featured,
                 v.status, imageData, imageMime, v.publishedAt]
            );

            const row = result.rows[0];
            const social = pushToSocial ? await pushToSocial(req, { kind: "magazine", table: "magazine_articles",
                row: { id: row.id, status: row.status }, title: row.title, text: row.summary, hasImage: row.has_image }) : null;
            res.status(201).json({ success: true, message: "Article créé.", article: toArticle(row), social });
        } catch (error) {
            console.error(error);
            fail(res, 500, "Erreur lors de la création.");
        }
    });

    router.put("/admin/magazine/:id", requireAuth, upload.single("image"), async (req, res) => {
        try {
            if (!isId(req.params.id)) return fail(res, 404, "Article introuvable.");

            const current = (await query(
                `SELECT ${FULL_COLS} FROM magazine_articles WHERE id = $1`, [req.params.id]
            )).rows[0];
            if (!current) return fail(res, 404, "Article introuvable.");

            const { error, values: v } = validate(req.body, current);
            if (error) return fail(res, 400, error);

            const values = [v.title, v.category, v.summary, v.content, v.author, v.subject, v.featured, v.status];
            let sql = `UPDATE magazine_articles SET title=$1, category=$2, summary=$3, content=$4,
                       author=$5, subject_name=$6, is_featured=$7, status=$8`;

            if (v.publishedAt) {
                values.push(v.publishedAt);
                sql += `, published_at=$${values.length}::date`;
            }
            if (req.file) {
                if (!hasValidImageSignature(req.file.buffer, req.file.mimetype)) {
                    return fail(res, 400, "Le fichier n'est pas une image valide.");
                }
                values.push(req.file.buffer, req.file.mimetype);
                sql += `, image_data=$${values.length - 1}, image_mime=$${values.length}`;
            }

            values.push(req.params.id);
            sql += ` WHERE id=$${values.length} RETURNING ${FULL_COLS}`;

            const result = await query(sql, values);
            const row = result.rows[0];
            const social = pushToSocial ? await pushToSocial(req, { kind: "magazine", table: "magazine_articles",
                row: { id: row.id, status: row.status }, title: row.title, text: row.summary, hasImage: row.has_image }) : null;
            res.json({ success: true, message: "Article modifié.", article: toArticle(row), social });
        } catch (error) {
            console.error(error);
            fail(res, 500, "Erreur lors de la modification.");
        }
    });

    router.delete("/admin/magazine/:id", requireAuth, async (req, res) => {
        try {
            if (!isId(req.params.id)) return fail(res, 404, "Article introuvable.");

            const result = await query("DELETE FROM magazine_articles WHERE id = $1 RETURNING id", [req.params.id]);
            if (result.rowCount === 0) return fail(res, 404, "Article introuvable.");

            res.json({ success: true, message: "Article supprimé." });
        } catch (error) {
            console.error(error);
            fail(res, 500, "Erreur lors de la suppression.");
        }
    });

    return router;
};
