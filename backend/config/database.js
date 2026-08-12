// Explicitly clear Vercel System Env variables injected by Amazon Aurora integration
delete process.env.PGHOST;
delete process.env.PGUSER;
delete process.env.PGPASSWORD;
delete process.env.PGDATABASE;
delete process.env.PGPORT;
delete process.env.POSTGRES_URL;

const { Sequelize } = require("sequelize");
require("dotenv").config();

const defaultNeonUrl = "postgresql://neondb_owner:npg_xKTgrU08nzHd@ep-purple-hat-anq529vu-pooler.c-6.us-east-1.aws.neon.tech/neondb";

let dbUrl = process.env.DATABASE_URL || defaultNeonUrl;

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
