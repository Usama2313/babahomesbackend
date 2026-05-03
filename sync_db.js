const sequelize = require("./config/database");
require("./models/associations");
const Property = require("./models/Property");
const User = require("./models/User");
const Message = require("./models/Message");

async function syncDB() {
  try {
    await sequelize.authenticate();
    console.log("Connected to database.");
    
    // sync { alter: true } will add missing columns like 'views'
    await sequelize.sync({ alter: true });
    console.log("Database synced with alter: true");
    
    process.exit(0);
  } catch (err) {
    console.error("Sync failed:", err);
    process.exit(1);
  }
}

syncDB();
