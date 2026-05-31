const sequelize = require("./config/database");
const Property = require("./models/Property");
const PropertyView = require("./models/PropertyView");

async function resetViews() {
    try {
        console.log("Resetting views...");
        
        // 1. Reset views in Property table
        await Property.update({ views: 0 }, { where: {} });
        console.log("All property view counts reset to 0.");
        
        // 2. Delete all records from PropertyView table
        await PropertyView.destroy({ where: {} });
        console.log("PropertyView history cleared.");
        
        process.exit(0);
    } catch (err) {
        console.error("Failed to reset views:", err);
        process.exit(1);
    }
}

resetViews();
