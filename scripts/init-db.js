require("dotenv").config();
const { pool } = require("../src/config/database");
const { migrate } = require("../src/config/migrate");

migrate()
    .then(() => console.log("Base de données prête (tables créées ou déjà présentes)."))
    .catch(error => { console.error("ERREUR :", error.message); process.exitCode = 1; })
    .finally(() => pool.end());
