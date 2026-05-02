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
    "https://babahomesbackend.vercel.app"
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);

        const isAllowed = allowedOrigins.indexOf(origin) !== -1 ||
            origin.includes("localhost") ||
            origin.includes("127.0.0.1") ||
            origin.endsWith(".netlify.app") ||
            origin.endsWith(".vercel.app");

        if (isAllowed) {
            return callback(null, true);
        } else {
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
app.get("/", (req, res) => res.json({ message: "Baba Homs API is running", status: "ok" }));

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await sequelize.authenticate();
        console.log("Database connected successfully");
        await sequelize.sync();
        console.log("Database synced successfully");

        if (process.env.NODE_ENV !== "production") {
            app.listen(PORT, () => {
                console.log(`Server running on port ${PORT}`);
            });
        }
    } catch (error) {
        console.error("Unable to connect to database:", error.message);
        if (process.env.NODE_ENV !== "production") process.exit(1);
    }
};

// Start initialization
startServer();

// Export for Vercel
module.exports = app;