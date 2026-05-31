const bcrypt = require("bcryptjs");
const User = require("./models/User");
const sequelize = require("./config/database");

async function createAdmin() {
  try {
    await sequelize.authenticate();
    console.log("Connected to database.");

    const hashedPassword = await bcrypt.hash("admin123", 10);
    
    const [user, created] = await User.findOrCreate({
      where: { email: "admin@babahoms.com" },
      defaults: {
        name: "Baba Admin",
        password: hashedPassword,
        role: "Admin",
        phone: "+910000000000"
      }
    });

    if (created) {
      console.log("Admin user created successfully!");
    } else {
      // Update existing user to be Admin just in case
      user.role = "Admin";
      user.password = hashedPassword;
      await user.save();
      console.log("Admin user already existed, credentials updated.");
    }
    
    console.log("---------------------------------");
    console.log("Email: admin@babahoms.com");
    console.log("Password: admin123");
    console.log("---------------------------------");

    process.exit(0);
  } catch (err) {
    console.error("Error creating admin:", err);
    process.exit(1);
  }
}

createAdmin();
