const { Sequelize } = require("sequelize");
require("dotenv").config();

const isPostgres = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.DB_DIALECT === "postgres";

let dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (dbUrl && dbUrl.includes("sslmode=")) {
    dbUrl = dbUrl.split("?")[0];
}

const sequelize = dbUrl
    ? new Sequelize(dbUrl, {
        dialect: "postgres",
        dialectModule: require("pg"),
        logging: false,
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false,
            },
        },
    })
    : new Sequelize(
        process.env.DB_NAME || "postgres",
        process.env.DB_USER || "postgres",
        process.env.DB_PASSWORD,
        {
            host: process.env.DB_HOST,
            port: process.env.DB_PORT || (isPostgres ? 5432 : 3306),
            dialect: process.env.DB_DIALECT || "mysql",
            dialectModule: isPostgres ? require("pg") : undefined,
            logging: false,
            dialectOptions: isPostgres ? {
                ssl: {
                    require: true,
                    rejectUnauthorized: false,
                },
            } : {},
        }
    );

module.exports = sequelize;
