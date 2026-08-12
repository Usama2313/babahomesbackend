const { Sequelize } = require("sequelize");
require("dotenv").config();

const defaultNeonUrl = "postgresql://neondb_owner:npg_xKTgrU08nzHd@ep-purple-hat-anq529vu-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require";

let dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;

// If URL is missing, points to old Supabase, or is not Neon, force active Neon URL
if (!dbUrl || dbUrl.includes("supabase") || dbUrl.includes("awweck") || !dbUrl.includes("neon.tech")) {
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
