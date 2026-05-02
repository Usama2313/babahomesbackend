// server.js
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const sequelize = require("./config/database");

const propertyRoutes = require("./routes/propertyRoutes");
const authRoutes = require("./routes/authRoutes");
const chatRoutes = require("./routes/chatRoutes");
require("./models/associations"); // Load associations

const app = express();

app.use(cors({
    origin: "*", // Temporarily allow all for debugging
    credentials: true
}));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use("/api/properties", propertyRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.get("/api/health", async (req, res) => {
    try {
        await sequelize.authenticate();
        res.json({ status: "ok", database: "connected", time: new Date() });
    } catch (err) {
        res.json({
            status: "error",
            database: "disconnected",
            message: err.message,
            tip: "Check your Vercel Environment Variables.",
            time: new Date()
        });
    }
});
app.get("/", (req, res) => res.json({ message: "Baba Homs API is running", status: "ok" }));

// Global Error Handler
app.use((err, req, res, next) => {
    console.error("Global Error:", err);
    res.status(500).json({
        error: "Internal Server Error",
        message: err.message,
        tip: "Check if your Database environment variables are set correctly in Vercel."
    });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        // Database connectivity check
        await sequelize.authenticate();
        console.log("Database connected successfully");

        const dialect = sequelize.getDialect();

        // MySQL specific optimizations
        if (dialect === "mysql") {
            try {
                await sequelize.query("SET GLOBAL max_allowed_packet=67108864;");
                console.log("MySQL max_allowed_packet increased to 64MB");
            } catch (err) {
                console.warn("Warning: Could not set max_allowed_packet globally.", err.message);
            }
        }

        // Create/update tables automatically
        if (dialect === "mysql") await sequelize.query("SET FOREIGN_KEY_CHECKS = 0;");

        await sequelize.sync();

        // Manual schema update for large columns (MySQL specific)
        if (dialect === "mysql") {
            try {
                await sequelize.query("ALTER TABLE properties MODIFY image LONGTEXT;");
                await sequelize.query("ALTER TABLE properties MODIFY gallery LONGTEXT;");
                console.log("Property table columns updated to LONGTEXT (MySQL)");
            } catch (err) {
                console.log("Note: Column updates skipped or already applied.");
            }
        }

        if (dialect === "mysql") await sequelize.query("SET FOREIGN_KEY_CHECKS = 1;");

        console.log("Database synced successfully");

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Unable to connect to database:", error.message);
        process.exit(1);
    }
};

if (process.env.NODE_ENV !== "production") {
    startServer();
} else {
    // On Vercel, attempt sync but don't crash if it fails
    sequelize.sync()
        .then(() => console.log("Database synced for production"))
        .catch(err => console.error("Production DB Sync Error:", err.message));
}

module.exports = app;