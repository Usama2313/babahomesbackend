// routes/propertyRoutes.js
const express = require("express");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const Property = require("../models/Property");
const User = require("../models/User");

const router = express.Router();

// Auth Middleware
const auth = (req, res, next) => {
    try {
        const token = req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            return res.status(401).json({ message: "No token, authorization denied" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || "babahoms_fallback_secret_key_123");
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ message: "Token is not valid" });
    }
};

// GET all properties with filters, search, pagination
router.get("/", async (req, res) => {
    try {
        const {
            country,
            city,
            type,
            category,
            search,
            owner,
            page = 1,
            limit = 20,
        } = req.query;

        const where = {};

        if (country) where.country = country;
        if (city) where.city = city;
        if (type) where.type = type;
        if (category) where.category = category;
        if (owner) where.owner = owner;

        if (search) {
            const isPostgres = Property.sequelize.getDialect() === 'postgres';
            const likeOp = isPostgres ? Op.iLike : Op.like;

            where[Op.or] = [
                { title: { [likeOp]: `%${search}%` } },
                { city: { [likeOp]: `%${search}%` } },
                { country: { [likeOp]: `%${search}%` } },
                { address: { [likeOp]: `%${search}%` } },
            ];
        }


        const pageNumber = parseInt(page, 10);
        const limitNumber = parseInt(limit, 10);
        const offset = (pageNumber - 1) * limitNumber;

        const totalProperties = await Property.count({ where });

        const properties = await Property.findAll({
            where,
            order: [["createdAt", "DESC"]],
            offset,
            limit: limitNumber,
            attributes: { exclude: ["gallery"] }, // Exclude heavy base64 images from list view
        });

        res.json({
            data: properties,
            currentPage: pageNumber,
            totalPages: Math.ceil(totalProperties / limitNumber),
            totalProperties,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// WhatsApp Notification Helper (Simulated)
const sendWhatsAppNotification = (message) => {
    // In a real app, you would use Twilio or WhatsApp Business API here
    console.log("-----------------------------------------");
    console.log("WHATSAPP NOTIFICATION TO COMPANY:");
    console.log(message);
    console.log("-----------------------------------------");
};

// GET single property by id
router.get("/:id", async (req, res) => {
    try {
        const property = await Property.findByPk(req.params.id, {
            include: [
                {
                    model: User,
                    as: "ownerDetails",
                    attributes: ["id", "name", "phone", "profilePicture", "role"]
                }
            ]
        });

        if (!property) return res.status(404).json({ message: "Property not found" });

        // Unique View Tracking
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        let userId = null;
        const token = req.header("Authorization")?.replace("Bearer ", "");
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET || "babahoms_fallback_secret_key_123");
                userId = decoded.id;
            } catch (err) { /* token invalid, ignore */ }
        }

        // Check if this user/IP has viewed this property in the last 24 hours
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const PropertyView = require("../models/PropertyView");

        let viewWhere = {
            propertyId: property.id,
            createdAt: { [Op.gt]: twentyFourHoursAgo }
        };

        if (userId) {
            // If logged in, track by userId (ignore IP to allow multiple accounts on same machine)
            viewWhere.userId = userId;
        } else {
            // If guest, track by IP
            viewWhere.ipAddress = ip;
            viewWhere.userId = null;
        }

        const existingView = await PropertyView.findOne({ where: viewWhere });

        if (!existingView) {
            await property.increment("views");
            await PropertyView.create({
                propertyId: property.id,
                userId,
                ipAddress: ip
            });
            // Reload to get the updated view count
            await property.reload();

            // Notify company about the NEW view
            if (userId) {
                const viewer = await User.findByPk(userId);
                if (viewer) {
                    sendWhatsAppNotification(
                        `*Property View Alert*\nProperty: ${property.title}\nViewer: ${viewer.name}\nWhatsApp: ${viewer.phone}\nRole: ${viewer.role}`
                    );
                }
            }
        }

        res.json(property);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// CREATE property
router.post("/", auth, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (user.role === "Property Finder") {
            return res.status(403).json({ message: "Property Finders are not allowed to post properties." });
        }

        const property = await Property.create({
            ...req.body,
            owner: req.user.id,
        });

        res.status(201).json(property);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// UPDATE property
router.put("/:id", auth, async (req, res) => {
    try {
        const property = await Property.findOne({
            where: {
                id: req.params.id,
                owner: req.user.id,
            },
        });

        if (!property) {
            return res.status(404).json({
                message: "Property not found or unauthorized",
            });
        }

        await property.update(req.body);

        res.json(property);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// DELETE property
router.delete("/:id", auth, async (req, res) => {
    try {
        const property = await Property.findOne({
            where: {
                id: req.params.id,
                owner: req.user.id,
            },
        });

        if (!property) {
            return res.status(404).json({
                message: "Property not found or unauthorized",
            });
        }

        await property.destroy();

        res.json({ message: "Property deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// AI Generate Description
router.post("/generate-description", async (req, res) => {
    try {
        const { bhkType, builtUpArea, city, locality, apartmentType, rentAmount, amenities } = req.body;

        const adjectives = ["luxurious", "spacious", "modern", "well-ventilated", "centrally located", "premium"];
        const adj = adjectives[Math.floor(Math.random() * adjectives.length)];

        const description = `Discover this ${adj} ${bhkType} ${apartmentType} in the heart of ${locality}, ${city}. 
Spanning over ${builtUpArea} sq.ft., this home is designed for comfort and style. 
Located in a vibrant neighborhood, it offers easy access to local essentials. 
${amenities && amenities.length > 0 ? `Comes equipped with premium amenities including ${amenities.join(", ")}.` : ""}
Ideal for families or professionals looking for a high-quality living experience. 
Available for rent at ₹${rentAmount}/month. Contact us for a private viewing.`;

        res.json({ description });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ADMIN: Get all properties for moderation
router.get("/admin/all", auth, async (req, res) => {
    try {
        const admin = await User.findByPk(req.user.id);
        if (admin.role !== 'Admin' && admin.role !== 'Company') {
            return res.status(403).json({ message: "Access denied" });
        }
        const properties = await Property.findAll({
            order: [['createdAt', 'DESC']],
            include: [{ model: User, as: 'ownerDetails', attributes: ['name', 'email'] }]
        });
        res.json(properties);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ADMIN: Update any property
router.put("/admin/:id", auth, async (req, res) => {
    try {
        const admin = await User.findByPk(req.user.id);
        if (admin.role !== 'Admin' && admin.role !== 'Company') {
            return res.status(403).json({ message: "Access denied" });
        }
        const property = await Property.findByPk(req.params.id);
        if (!property) return res.status(404).json({ message: "Property not found" });
        await property.update(req.body);
        res.json(property);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ADMIN: Delete any property
router.delete("/admin/:id", auth, async (req, res) => {
    try {
        const admin = await User.findByPk(req.user.id);
        if (admin.role !== 'Admin' && admin.role !== 'Company') {
            return res.status(403).json({ message: "Access denied" });
        }
        const property = await Property.findByPk(req.params.id);
        if (!property) return res.status(404).json({ message: "Property not found" });
        await property.destroy();
        res.json({ message: "Property deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;