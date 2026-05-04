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

    // Add a manual sync route to build tables in the correct Vercel Postgres branch
    app.get("/api/sync", async (req, res) => {
        try {
            const sequelize = require("./config/database");
            require("./models/associations"); // Make sure models are loaded before sync
            await sequelize.sync({ alter: true });
            res.json({ status: "ok", message: "Database tables synchronized successfully!" });
        } catch (err) {
            res.status(500).json({
                status: "error",
                message: "Sync failed: " + err.message
            });
        }
    });

    app.get("/api/create-admin", async (req, res) => {
        try {
            const createAdmin = require("./createAdminFunc"); // I will create this file
            await createAdmin();
            res.json({ status: "ok", message: "Admin user created/updated successfully!" });
        } catch (err) {
            res.status(500).json({
                status: "error",
                message: "Admin creation failed: " + err.message
            });
        }
    });

    app.get("/api/fix-db", async (req, res) => {
        try {
            const sequelize = require("./config/database");
            await sequelize.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS "isBlocked" BOOLEAN DEFAULT false;');
            await sequelize.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS "isVerified" BOOLEAN DEFAULT false;');
            await sequelize.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS "lastLogin" TIMESTAMP WITH TIME ZONE;');
            await sequelize.query('ALTER TABLE properties ADD COLUMN IF NOT EXISTS "isApproved" BOOLEAN DEFAULT true;');
            await sequelize.query('ALTER TABLE properties ADD COLUMN IF NOT EXISTS "isFeatured" BOOLEAN DEFAULT false;');
            await sequelize.query('ALTER TABLE properties ADD COLUMN IF NOT EXISTS "views" INTEGER DEFAULT 0;');
            await sequelize.query(`
                CREATE TABLE IF NOT EXISTS "property_views" (
                    "id" SERIAL PRIMARY KEY,
                    "propertyId" INTEGER NOT NULL,
                    "userId" INTEGER,
                    "ipAddress" VARCHAR(255),
                    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
                    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
                );
            `);
            res.json({ status: "ok", message: "Database raw SQL fix applied successfully!" });
        } catch (err) {
            res.status(500).json({
                status: "error",
                message: "Raw DB fix failed: " + err.message
            });
        }
    });

    app.get("/api/test-email", async (req, res) => {
        try {
            const nodemailer = require("nodemailer");
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST || "smtp.gmail.com",
                port: parseInt(process.env.SMTP_PORT || 587),
                secure: false, // true for 465, false for other ports
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                },
                tls: {
                    rejectUnauthorized: false
                }
            });

            const mailOptions = {
                from: `"Baba Homs Diagnostics" <${process.env.SMTP_USER}>`,
                to: "utanveer484@gmail.com", // Sending test to user's email
                subject: "Test Email from Vercel Backend",
                text: "If you receive this, the Vercel backend SMTP configuration is working correctly."
            };

            const info = await transporter.sendMail(mailOptions);
            res.json({
                status: "success",
                message: "Test email sent!",
                info: info,
                env_user_exists: !!process.env.SMTP_USER,
                env_pass_exists: !!process.env.SMTP_PASS
            });
        } catch (error) {
            res.status(500).json({
                status: "error",
                message: error.message,
                code: error.code,
                command: error.command
            });
        }
    });

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

    if (!process.env.VERCEL) {
        const sequelize = require("./config/database");
        sequelize.sync().then(() => {
            app.listen(PORT, () => {
                console.log(`Server running on port ${PORT}`);
            });
        }).catch(err => {
            console.error("Database connection failed:", err);
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