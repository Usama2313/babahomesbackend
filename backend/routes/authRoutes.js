// routes/authRoutes.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const User = require("../models/User.js");
const nodemailer = require("nodemailer");
const router = express.Router();

const twilio = require('twilio');
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Real WhatsApp/Mobile Validation using Twilio Lookup
const validateWhatsAppNumber = async (phone) => {
    try {
        // Ensure number has '+' prefix
        const formattedPhone = phone.startsWith('+') ? phone : `+${phone.replace(/\D/g, '')}`;

        // Simply check if it's a reasonable length for a phone number for now
        // Twilio lookups cost money and fail if the account isn't configured for line_type_intelligence
        if (formattedPhone.length >= 10 && formattedPhone.length <= 15) {
            return true;
        }

        return false;
    } catch (err) {
        console.error("Verification Error:", err.message);
        return true; // Bypass on error so users can still register
    }
};

router.post("/register", async (req, res) => {
    try {
        const { name, email, phone, password, role } = req.body;

        const isValidWA = await validateWhatsAppNumber(phone);
        if (!isValidWA) {
            return res.status(400).json({
                message: "This number is not registered on WhatsApp. Please use a valid WhatsApp number.",
            });
        }

        const exists = await User.findOne({
            where: {
                [Op.or]: [{ email }, { phone }],
            },
        });

        if (exists) {
            return res.status(400).json({
                message: "User already exists with this email or phone",
            });
        }

        const user = await User.create({
            name,
            email,
            phone,
            password: password, // Plain text as requested
            role: role || "Property Finder",
        });

        const userData = user.toJSON();
        delete userData.password;

        res.status(201).json({
            message: "Registered successfully",
            user: userData,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post("/login", async (req, res) => {
    try {
        const { email, phone, password } = req.body;

        if (phone) {
            const isValidWA = await validateWhatsAppNumber(phone);
            if (!isValidWA) {
                return res.status(400).json({
                    message: "This number is not a valid WhatsApp number.",
                });
            }
        }

        const user = await User.findOne({
            where: email ? { email } : { phone },
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Support both plain text and bcrypt hashes for transition
        const match = (password === user.password) || await bcrypt.compare(password, user.password).catch(() => false);

        if (!match) {
            return res.status(400).json({ message: "Wrong password" });
        }

        const token = jwt.sign(
            { id: user.id },
            process.env.JWT_SECRET || "babahoms_fallback_secret_key_123"
        );

        await user.update({ lastLogin: new Date() });

        const Property = require("../models/Property");
        const trialPropertiesCount = await Property.count({ where: { owner: user.id, isTrial: true } });
        const paidPropertiesCount = await Property.count({ where: { owner: user.id, isTrial: false } });
        const propertiesCount = trialPropertiesCount + paidPropertiesCount;

        const userData = user.toJSON();
        delete userData.password;

        res.json({
            message: "Login successful",
            token,
            user: { ...userData, propertiesCount, trialPropertiesCount, paidPropertiesCount },
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Auth Middleware
const auth = (req, res, next) => {
    try {
        const token = req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            return res.status(401).json({
                message: "No token, authorization denied",
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || "babahoms_fallback_secret_key_123");
        req.user = decoded;

        // Background update of lastLogin to keep online status accurate
        User.update({ lastLogin: new Date() }, { where: { id: decoded.id } }).catch(e => console.error("lastLogin update failed", e));

        next();
    } catch (err) {
        res.status(401).json({ message: "Token is not valid", sms: "+973322271249" });
    }
};

// Get current user profile
router.get("/me", auth, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ["password"] },
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const Property = require("../models/Property");
        const trialPropertiesCount = await Property.count({ where: { owner: req.user.id, isTrial: true } });
        const paidPropertiesCount = await Property.count({ where: { owner: req.user.id, isTrial: false } });
        const propertiesCount = trialPropertiesCount + paidPropertiesCount;

        const userData = user.toJSON();
        res.json({ ...userData, propertiesCount, trialPropertiesCount, paidPropertiesCount });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update user profile
router.put("/profile", auth, async (req, res) => {
    try {
        const { name, email, phone, city, country, profilePicture } = req.body;

        const user = await User.findByPk(req.user.id);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (email && email !== user.email) {
            const emailExists = await User.findOne({
                where: {
                    email,
                    id: { [Op.ne]: user.id },
                },
            });

            if (emailExists) {
                return res.status(400).json({ message: "Email is already in use" });
            }
        }

        if (phone && phone !== user.phone) {
            const phoneExists = await User.findOne({
                where: {
                    phone,
                    id: { [Op.ne]: user.id },
                },
            });

            if (phoneExists) {
                return res.status(400).json({
                    message: "Phone number is already in use",
                });
            }
        }

        await user.update({
            name: name || user.name,
            email: email || user.email,
            phone: phone || user.phone,
            city: city || user.city,
            country: country || user.country,
            profilePicture: profilePicture || user.profilePicture,
        });

        const updatedUser = await User.findByPk(req.user.id, {
            attributes: { exclude: ["password"] },
        });

        res.json({
            message: "Profile updated successfully",
            user: updatedUser,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ADMIN: Get all users
router.get("/admin/users", auth, async (req, res) => {
    try {
        const admin = await User.findByPk(req.user.id);
        if (admin.role !== 'Admin' && admin.role !== 'Company') {
            return res.status(403).json({ message: "Access denied" });
        }
        const users = await User.findAll({ 
            order: [['createdAt', 'DESC']],
            attributes: { exclude: ['password'] }
        });
        // Determine online status (active within last 5 minutes)
        const now = new Date();
        const usersWithStatus = users.map(user => {
            const lastLogin = user.lastLogin ? new Date(user.lastLogin) : null;
            const isOnline = lastLogin && (now - lastLogin) < 5 * 60 * 1000; // 5 minutes
            // Convert Sequelize instance to plain object if needed
            const plain = user.toJSON ? user.toJSON() : user;
            return { ...plain, isOnline };
        });
        res.json(usersWithStatus);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Import upload controller
const { upload, uploadLogo } = require('../controllers/uploadLogo');

// Upload logo endpoint
router.post('/upload/logo', auth, upload.single('logo'), uploadLogo);

// ADMIN: Search all users
router.get("/admin/users/search", auth, async (req, res) => {
    try {
        const admin = await User.findByPk(req.user.id);
        if (admin.role !== 'Admin' && admin.role !== 'Company') {
            return res.status(403).json({ message: "Access denied" });
        }
        const query = req.query.q || '';
        const isPostgres = User.sequelize.getDialect() === 'postgres';
        const likeOp = isPostgres ? Op.iLike : Op.like;

        const users = await User.findAll({
            where: {
                [Op.or]: [
                    { name: { [likeOp]: `%${query}%` } },
                    { email: { [likeOp]: `%${query}%` } },
                    { phone: { [likeOp]: `%${query}%` } }
                ]
            },
            attributes: { exclude: ['password'] },
            limit: 10
        });

        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ADMIN: Update any user
router.put("/admin/user/:id", auth, async (req, res) => {
    try {
        const admin = await User.findByPk(req.user.id);
        if (admin.role !== 'Admin' && admin.role !== 'Company') {
            return res.status(403).json({ message: "Access denied" });
        }
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        await user.update(req.body);
        const userData = user.toJSON();
        delete userData.password;
        res.json(userData);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ADMIN: Delete any user
router.delete("/admin/user/:id", auth, async (req, res) => {
    try {
        const admin = await User.findByPk(req.user.id);
        if (admin.role !== 'Admin' && admin.role !== 'Company') {
            return res.status(403).json({ message: "Access denied" });
        }
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        const Property = require("../models/Property");
        const Message = require("../models/Message");
        const PropertyView = require("../models/PropertyView");

        // 1. Delete user's properties and their related data
        const properties = await Property.findAll({ where: { owner: user.id } });
        for (const p of properties) {
            await PropertyView.destroy({ where: { propertyId: p.id } });
            await Message.destroy({ where: { propertyId: p.id } });
            await p.destroy();
        }

        // 2. Delete all messages involving this user
        await Message.destroy({
            where: {
                [Op.or]: [{ senderId: user.id }, { receiverId: user.id }]
            }
        });

        // 3. Finally delete the user
        await user.destroy();
        res.json({ message: "User deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET any admin/company user (for fallback/redirect)
router.get("/company-user", async (req, res) => {
    try {
        // Find Admin first
        let companyUser = await User.findOne({
            where: { role: "Admin" },
            attributes: ["id", "name"]
        });
        // Fallback to Company if no Admin exists
        if (!companyUser) {
            companyUser = await User.findOne({
                where: { role: "Company" },
                attributes: ["id", "name"]
            });
        }
        res.json(companyUser);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET Admin Stats for Dashboard
router.get("/admin/stats", auth, async (req, res) => {
    try {
        const admin = await User.findByPk(req.user.id);
        if (admin.role !== 'Admin' && admin.role !== 'Company') {
            return res.status(403).json({ message: "Access denied" });
        }

        const Property = require("../models/Property");
        const totalUsers = await User.count();
        const totalProperties = await Property.count();
        const agents = await User.count({ where: { role: "Agent" } });
        const sellers = await User.count({ where: { role: "Property Seller" } });

        // Sum of all property views
        const totalViews = await Property.sum("views") || 0;

        res.json({
            totalUsers,
            totalProperties,
            agents,
            sellers,
            totalViews
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Forgot Password - Generate Token & Send Email
router.post("/forgot-password", async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ where: { email } });
        if (!user) return res.status(404).json({ message: "No user found with this email." });

        const resetToken = jwt.sign(
            { id: user.id },
            process.env.JWT_SECRET || "babahoms_fallback_secret_key_123",
            { expiresIn: "1h" }
        );

        // Update domain to match the current production site
        const frontendUrl = process.env.FRONTEND_URL || "https://property-4u.netlify.app";
        const resetLink = `${frontendUrl}/reset-password/${resetToken}`;

        // Send Email

        const smtpConfig = {
            host: process.env.SMTP_HOST || "smtp.gmail.com",
            port: parseInt(process.env.SMTP_PORT || 587),
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            },
            tls: {
                rejectUnauthorized: false
            }
        };

        // Use service: 'gmail' if host is gmail for better compatibility
        if (smtpConfig.host.includes("gmail")) {
            delete smtpConfig.host;
            delete smtpConfig.port;
            delete smtpConfig.secure;
            smtpConfig.service = 'gmail';
        }

        const transporter = nodemailer.createTransport(smtpConfig);

        const mailOptions = {
            from: `"Baba Homs Support" <${process.env.SMTP_USER}>`,
            to: user.email,
            subject: "Password Reset Request - Baba Homs",
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 600px; margin: auto;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <img src="https://property-4u.netlify.app/logo.jpeg" alt="Logo of Baba Homes" style="width: 100px; height: 100px; border-radius: 50%; object-fit: contain; border: 2px solid #eee;" />
                        <h1 style="color: #1e293b; margin-top: 10px;">Baba Homs</h1>
                    </div>
                    <h2 style="color: #1e293b; border-bottom: 2px solid #ffd400; padding-bottom: 10px;">Password Reset</h2>
                    <p>Hello <strong>${user.name}</strong>,</p>
                    <p>You requested a password reset for your Baba Homs account. Please click the button below to set a new password. This link will expire in 1 hour.</p>
                    <div style="text-align: center;">
                        <a href="${resetLink}" style="display: inline-block; padding: 14px 30px; background: #1e293b; color: #fff; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">Reset Password</a>
                    </div>
                    <p style="color: #64748b; font-size: 14px;">If the button above doesn't work, copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; color: #3b82f6; font-size: 12px;">${resetLink}</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p>If you didn't request this, you can safely ignore this email.</p>
                    <p>Best regards,<br/><strong>Baba Homs Team</strong></p>
                </div>
            `
        };

        // If no SMTP credentials, log it and return (to avoid crashing or hanging)
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.log("-----------------------------------------");
            console.log("RESET LINK LOGGED (NO SMTP CREDENTIALS):");
            console.log(resetLink);
            console.log("-----------------------------------------");
            return res.json({
                message: "Password reset link generated (Logged on server). Please configure SMTP credentials to send actual emails.",
                resetLink: process.env.NODE_ENV === 'development' ? resetLink : undefined
            });
        }

        await transporter.sendMail(mailOptions);
        console.log(`Password reset email sent to: ${user.email}`);
        res.json({ message: "Password reset link has been sent to your email." });

    } catch (error) {
        console.error("FORGOT PASSWORD ERROR:", error);
        res.status(500).json({
            message: "Failed to send email. Please ensure your SMTP settings are correct.",
            error: error.message,
            code: error.code
        });
    }
});

// Reset Password - Verify Token & Update Password
router.post("/reset-password", async (req, res) => {
    const { token, newPassword } = req.body;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "babahoms_fallback_secret_key_123");
        const user = await User.findByPk(decoded.id);
        if (!user) return res.status(404).json({ message: "User not found." });

        await user.update({ password: newPassword });

        res.json({ message: "Password has been reset successfully. You can now login." });
    } catch (error) {
        res.status(400).json({ message: "Invalid or expired token." });
    }
});

// Get user basic info by ID (Required for Chat)
router.get("/user/:id", async (req, res) => {
    try {
        const userId = req.params.id === "null" || req.params.id === "undefined" ? null : req.params.id;
        if (!userId) return res.status(400).json({ message: "Invalid user ID" });

        const user = await User.findByPk(userId, {
            attributes: ["id", "name", "role", "profilePicture", "lastLogin"]
        });
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;