const { Sequelize } = require("sequelize");
require("dotenv").config();

const defaultNeonUrl = "postgresql://neondb_owner:npg_xKTgrU08nzHd@ep-purple-hat-anq529vu-pooler.c-6.us-east-1.aws.neon.tech/neondb";

let dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || defaultNeonUrl;

// If URL is missing, invalid, or doesn't use neondb_owner, force active Neon URL
if (!dbUrl || dbUrl.includes("supabase") || dbUrl.includes("awweck") || !dbUrl.includes("neondb_owner")) {
    dbUrl = defaultNeonUrl;
}

if (dbUrl && dbUrl.includes("sslmode=")) {
    dbUrl = dbUrl.split("?")[0];
}

const sequelize = new Sequelize(dbUrl, {
    dialect: "postgres",
    dialectModule: require("pg"),
    logging: false,
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false,
        },
    },
});

module.exports = sequelize;
