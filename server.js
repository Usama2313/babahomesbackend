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

// CORS Configuration
const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://thriving-alpaca-0d058a.netlify.app",
    "https://cool-results-search.loca.lt"
];




app.use(cors({
    origin: function (origin, callback) {
        // allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        const isAllowed = allowedOrigins.indexOf(origin) !== -1 || 
                         origin.includes("localhost") ||
                         origin.includes("127.0.0.1") ||
                         origin.endsWith(".loca.lt") || 
                         origin.endsWith(".ngrok-free.app") ||
                         origin.endsWith(".ngrok.io");

        if (isAllowed) {
            return callback(null, true);
        } else {
            console.log("CORS Blocked for Origin:", origin);
            return callback(new Error('CORS policy error'), false);
        }
    },
    credentials: true
}));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use("/api/properties", propertyRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.get("/api/health", (req, res) => res.json({ status: "ok", time: new Date() }));

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

startServer();