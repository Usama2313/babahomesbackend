try {
    // index.js
    const express = require("express");
    const cors = require("cors");
    require("dotenv").config();

    const app = express();
const path = require('path');
const fs = require('fs');
    const uploadsPath = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsPath)) {
      fs.mkdirSync(uploadsPath);
    }
    app.use('/uploads', express.static(uploadsPath));
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

    app.get("/api/db-info", async (req, res) => {
        try {
            const sequelize = require("./config/database");
            const [results] = await sequelize.query(`
                SELECT table_name, column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name ILIKE 'properties';
            `);
            res.json({ status: "ok", columns: results });
        } catch (err) {
            res.status(500).json({ status: "error", message: err.message });
        }
    });

    app.get("/api/fix-db", async (req, res) => {
        try {
            const sequelize = require("./config/database");
            const { DataTypes } = require("sequelize");
            const queryInterface = sequelize.getQueryInterface();

            // Attempt to add columns using queryInterface (more reliable across dialects)
            const addColumnSafe = async (table, col, type) => {
                try {
                    await queryInterface.addColumn(table, col, type);
                } catch (e) {
                    // Column likely already exists
                }
            };

            await addColumnSafe('properties', 'possessionStatus', { type: DataTypes.STRING, allowNull: true });
            await addColumnSafe('properties', 'isApproved', { type: DataTypes.BOOLEAN, defaultValue: true });
            await addColumnSafe('properties', 'isFeatured', { type: DataTypes.BOOLEAN, defaultValue: false });
            await addColumnSafe('properties', 'views', { type: DataTypes.INTEGER, defaultValue: 0 });

            await addColumnSafe('properties', 'isBlocked', { type: DataTypes.BOOLEAN, defaultValue: false });
            await addColumnSafe('properties', 'isTrial', { type: DataTypes.BOOLEAN, defaultValue: false });
            await addColumnSafe('properties', 'trialExpiresAt', { type: DataTypes.DATE, allowNull: true });
            await addColumnSafe('properties', 'isHidden', { type: DataTypes.BOOLEAN, defaultValue: false });
            await addColumnSafe('properties', 'generatedVideo', { type: DataTypes.TEXT, allowNull: true });
            await addColumnSafe('properties', 'shopName', { type: DataTypes.STRING, allowNull: true });
            await addColumnSafe('properties', 'shopType', { type: DataTypes.STRING, allowNull: true });
            await addColumnSafe('properties', 'shopFloorArea', { type: DataTypes.FLOAT, allowNull: true });

            await addColumnSafe('users', 'isBlocked', { type: DataTypes.BOOLEAN, defaultValue: false });
            await addColumnSafe('users', 'isVerified', { type: DataTypes.BOOLEAN, defaultValue: false });
            await addColumnSafe('users', 'lastLogin', { type: DataTypes.DATE });
            await addColumnSafe('users', 'propertyLimit', { type: DataTypes.INTEGER, defaultValue: 1 });
            await addColumnSafe('users', 'subscriptionStatus', { type: DataTypes.STRING, defaultValue: 'Free' });

            res.json({ status: "ok", message: "Database repair completed using QueryInterface!" });
        } catch (err) {
            res.status(500).json({
                status: "error",
                message: "Repair failed: " + err.message
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


    const uploadsPath = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsPath)) {
      fs.mkdirSync(uploadsPath);
    }
    app.use('/uploads', express.static(uploadsPath));
    app.all("*", (req, res) => {
        res.status(500).json({
            error: "Critical Startup Error",
            message: globalError.message,
            stack: globalError.stack
        });
    });
    module.exports = app;
}/ /  
 f o r c e  
 r e b u i l d  
 v e r c e l  
 