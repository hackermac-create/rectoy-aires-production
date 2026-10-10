const fs = require("fs");
const path = require("path");
const { pool } = require("./database");

// Applique database/schema.sql (idempotent : peut être relancé sans risque).
async function migrate() {
    const file = path.join(__dirname, "..", "..", "database", "schema.sql");
    await pool.query(fs.readFileSync(file, "utf8"));
}

module.exports = { migrate };
