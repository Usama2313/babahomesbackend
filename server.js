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
    origin: "*",
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
        res.status(500).json({
            status: "error",
            database: "disconnected",
            message: err.message,
            time: new Date()
        });
    }
});

app.get("/", (req, res) => res.json({ message: "Baba Homs API is running", status: "ok" }));

const PORT = process.env.PORT || 5000;

// Development only: Start server and sync DB
if (process.env.NODE_ENV !== "production") {
    const startServer = async () => {
        try {
            await sequelize.authenticate();
            console.log("Database connected successfully");
            await sequelize.sync();
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
}

// Export for Vercel
module.exports = app;