const { Pool } = require("pg");

// Production (Render, Neon, Supabase...) : une seule variable DATABASE_URL.
// Local : les variables DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD.
const config = process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT || 5433),
        database: process.env.DB_NAME || "rectoy_aires",
        user: process.env.DB_USER || "rectoy_admin",
        password: process.env.DB_PASSWORD
    };

// Bases hébergées accessibles depuis Internet : DATABASE_SSL=true
if (process.env.DATABASE_SSL === "true") {
    config.ssl = { rejectUnauthorized: false };
}

const pool = new Pool({
    ...config,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
});

pool.on("error", (error) => {
    console.error("Erreur PostgreSQL :", error.message);
});

const query = (text, params) => pool.query(text, params);

async function testConnection() {
    const result = await pool.query(
        "SELECT current_database() AS database, current_user AS user"
    );
    return result.rows[0];
}

module.exports = { pool, query, testConnection };
