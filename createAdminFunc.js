const User = require("./models/User");
const bcrypt = require("bcryptjs");

async function createAdminFunc() {
  try {
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

    if (!created) {
      user.role = "Admin";
      user.password = hashedPassword;
      await user.save();
      console.log("Admin user already existed, updated role and password.");
    } else {
      console.log("Admin user created successfully.");
    }
  } catch (err) {
    console.error("Error creating admin:", err);
    throw err;
  }
}

module.exports = createAdminFunc;
