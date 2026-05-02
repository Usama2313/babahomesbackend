const { Sequelize } = require("sequelize");
require("dotenv").config();

const isPostgres = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.DB_DIALECT === "postgres";

const sequelize = (process.env.DATABASE_URL || process.env.POSTGRES_URL)
    ? new Sequelize((process.env.DATABASE_URL || process.env.POSTGRES_URL), {
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
