require('dotenv').config();
const sequelize = require('./config/database');
require('./models/associations'); // Ensure all models are loaded and associated

async function syncDb() {
    try {
        console.log('Authenticating with database...');
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');
        
        console.log('Synchronizing tables (this may take a few seconds)...');
        await sequelize.sync({ alter: true }); // creates tables if they don't exist
        
        console.log('Database synchronized successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Unable to sync the database:', error);
        process.exit(1);
    }
}

syncDb();
