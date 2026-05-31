const sequelize = require("./config/database");

async function seedAdmin() {
  try {
    await sequelize.query(`
      INSERT INTO users (name, email, password, role, phone, createdAt, updatedAt)
      VALUES ('Baba Admin', 'admin@babahoms.com', '$2b$10$NA7NZl4RDfInbPYClyEvle3/xrDo6hG1R8P11fvbO5LmrQlINftBy', 'Admin', '+910000000000', NOW(), NOW())
      ON DUPLICATE KEY UPDATE role='Admin'
    `);
    console.log("Admin user seeded successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Error seeding admin:", err);
    process.exit(1);
  }
}

seedAdmin();
