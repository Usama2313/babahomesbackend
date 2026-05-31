const User = require("./models/User");
const sequelize = require("./config/database");

async function checkAdmin() {
  try {
    await sequelize.authenticate();
    const user = await User.findOne({ where: { email: "admin@babahoms.com" } });
    if (user) {
      console.log("Admin User Found:");
      console.log("- Email:", user.email);
      console.log("- Role:", user.role);
      console.log("- Created At:", user.createdAt);
    } else {
      console.log("Admin user NOT found!");
    }
    process.exit(0);
  } catch (err) {
    console.error("Check failed:", err);
    process.exit(1);
  }
}

checkAdmin();
