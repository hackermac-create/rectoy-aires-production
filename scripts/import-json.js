/**
 * Importe l'ancien fichier publications.json (et les images du dossier uploads/)
 * dans PostgreSQL.   Utilisation :  npm run db:import
 * Option : node scripts/import-json.js chemin/vers/publications.json
 */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { pool } = require("../src/config/database");
const { migrate } = require("../src/config/migrate");

const MIME = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

async function run() {
    const root = path.join(__dirname, "..");
    const jsonPath = process.argv[2] || path.join(root, "data", "publications.json");
    if (!fs.existsSync(jsonPath)) throw new Error("Fichier introuvable : " + jsonPath);

    await migrate();
    const items = JSON.parse(fs.readFileSync(jsonPath, "utf8") || "[]");
    let added = 0, skipped = 0;

    for (const p of items) {
        const createdAt = p.createdAt || new Date().toISOString();
        const exists = await pool.query(
            "SELECT 1 FROM site_publications WHERE title = $1 AND created_at = $2",
            [p.title, createdAt]
        );
        if (exists.rowCount) { skipped++; continue; }

        let data = null, mime = null;
        if (p.image) {
            const file = path.join(root, "uploads", path.basename(p.image));
            if (fs.existsSync(file)) {
                data = fs.readFileSync(file);
                mime = MIME[path.extname(file).toLowerCase()] || null;
            } else {
                console.warn("Image introuvable (ignorée) :", file);
            }
        }

        await pool.query(
            `INSERT INTO site_publications
             (title, type, description, event_date, location, link, status, image_data, image_mime, created_at, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
            [(p.title || "").trim(), p.type, p.description, p.date || null,
             (p.location || "").trim() || null, p.link || null,
             p.status === "draft" ? "draft" : "published",
             data, mime, createdAt, p.updatedAt || createdAt]
        );
        added++;
    }
    console.log(`Import terminé : ${added} ajoutée(s), ${skipped} déjà présente(s).`);
}

run()
    .catch(error => { console.error("ERREUR :", error.message); process.exitCode = 1; })
    .finally(() => pool.end());
