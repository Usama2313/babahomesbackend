// routes/authRoutes.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const User = require("../models/User.js");

const router = express.Router();

const twilio = require('twilio');
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Real WhatsApp/Mobile Validation using Twilio Lookup
const validateWhatsAppNumber = async (phone) => {
    try {
        // Ensure number has '+' prefix
        const formattedPhone = phone.startsWith('+') ? phone : `+${phone.replace(/\D/g, '')}`;

        // Use Twilio Lookup v2
        const lookup = await client.lookups.v2.phoneNumbers(formattedPhone)
            .fetch({ fields: 'line_type_intelligence' });

        // If the number is a valid mobile number, we consider it a potential WhatsApp number
        // (Most WhatsApp accounts are linked to mobile numbers)
        if (lookup.lineTypeIntelligence && lookup.lineTypeIntelligence.type === 'mobile') {
            return true;
        }

        return false;
    } catch (err) {
        console.error("Twilio Verification Error:", err.message);
        return false;
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

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            name,
            email,
            phone,
            password: hashedPassword,
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

        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.status(400).json({ message: "Wrong password" });
        }

        const token = jwt.sign(
            { id: user.id },
            process.env.JWT_SECRET
        );

        const userData = user.toJSON();
        delete userData.password;

        res.json({
            message: "Login successful",
            token,
            user: userData,
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

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;

        next();
    } catch (err) {
        res.status(401).json({ message: "Token is not valid" });
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

        res.json(user);
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
        const users = await User.findAll({ order: [['createdAt', 'DESC']] });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

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
        res.json(user);
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

        await user.destroy();
        res.json({ message: "User deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET any company/admin user (for fallback/redirect)
router.get("/company-user", async (req, res) => {
    try {
        const companyUser = await User.findOne({
            where: { role: { [Op.or]: ["Company", "Admin"] } },
            attributes: ["id", "name"]
        });
        res.json(companyUser);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get user basic info by ID (Required for Chat)
router.get("/user/:id", async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id, {
            attributes: ["id", "name", "role", "profilePicture"]
        });
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;