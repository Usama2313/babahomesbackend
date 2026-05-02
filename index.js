try {
    // index.js
    const express = require("express");
    const cors = require("cors");
    require("dotenv").config();

    const app = express();

    app.use(cors({
        origin: "*",
        credentials: true
    }));

    app.use(express.json({ limit: "50mb" }));
    app.use(express.urlencoded({ limit: "50mb", extended: true }));

    // Basic routes that don't need the database immediately
    app.get("/", (req, res) => res.json({ message: "Baba Homs API is running", status: "ok" }));
    app.get("/api/health", async (req, res) => {
        try {
            const sequelize = require("./config/database");
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

    // Load other routes
    app.use("/api/properties", require("./routes/propertyRoutes"));
    app.use("/api/auth", require("./routes/authRoutes"));
    app.use("/api/chat", require("./routes/chatRoutes"));

    // Initialize associations lazily
    require("./models/associations");

    const PORT = process.env.PORT || 5000;

    if (process.env.NODE_ENV !== "production") {
        const sequelize = require("./config/database");
        sequelize.sync().then(() => {
            app.listen(PORT, () => {
                console.log(`Server running on port ${PORT}`);
            });
        });
    }

    module.exports = app;

} catch (globalError) {
    console.error("CRITICAL STARTUP ERROR:", globalError);
    const express = require("express");
    const app = express();
    app.all("*", (req, res) => {
        res.status(500).json({
            error: "Critical Startup Error",
            message: globalError.message,
            stack: globalError.stack
        });
    });
    module.exports = app;
}