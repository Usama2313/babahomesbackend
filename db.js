const { Sequelize } = require('sequelize');
require('dotenv').config();

const useIndividual = process.env.DB_HOST && process.env.DB_USER;

console.log(`[Database] Attempting connection with user: ${process.env.DB_USER || "Not Set"}`);

const sequelize = useIndividual
  ? new Sequelize(process.env.DB_NAME || "postgres", process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  })
  : new Sequelize((process.env.DATABASE_URL || process.env.POSTGRES_URL), {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  });

module.exports = sequelize;
