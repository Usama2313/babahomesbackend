const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = (process.env.DATABASE_URL || process.env.POSTGRES_URL)
  ? new Sequelize((process.env.DATABASE_URL || process.env.POSTGRES_URL), {
    dialect: 'postgres',
    logging: false,
  })
  : new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
  });

module.exports = sequelize;
