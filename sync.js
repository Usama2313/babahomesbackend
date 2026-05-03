
const sequelize = require('./config/database');
const Property = require('./models/Property');
const User = require('./models/User');
const PropertyView = require('./models/PropertyView');
// Add other models if necessary

async function syncDB() {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');
        
        // Sync models
        await sequelize.sync({ alter: true });
        console.log('All models were synchronized successfully.');
        
        process.exit(0);
    } catch (error) {
        console.error('Unable to connect to the database:', error);
        process.exit(1);
    }
}

syncDB();
