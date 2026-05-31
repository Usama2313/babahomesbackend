// routes/propertyRoutes.js
const express = require("express");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const Property = require("../models/Property");
const User = require("../models/User");
const { upload } = require("../controllers/uploadLogo");

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
        res.status(401).json({ message: "Token is not valid", sms: "+973322271249" });
    }
};

// GET all properties with filters, search, pagination
router.get("/", async (req, res) => {
    try {
        const {
            country,
            city,
            type,
            propertyType,
            apartmentType,
            adType,
            category,
            possessionStatus,
            minPrice,
            maxPrice,
            search,
            owner,
            page = 1,
            limit = 20,
        } = req.query;

        const where = {};

        if (country) where.country = country;
        if (city) where.city = city;
        if (type) where.type = type;
        if (propertyType) where.propertyType = propertyType;
        if (apartmentType) where.apartmentType = apartmentType;
        if (adType) {
            if (adType === "Buy") where.adType = { [Op.in]: ["Buy", "Resale"] };
            else if (adType === "Rental") where.adType = { [Op.in]: ["Rental", "Rent"] };
            else if (adType === "Projects" || adType === "Ongoing & Upcoming Projects with EMI") {
                where[Op.or] = [
                    { adType: { [Op.in]: ["Projects", "Ongoing & Upcoming Projects with EMI"] } },
                    { propertyType: "Land/Plot" }
                ];
            } else if (adType === "Commercial") {
                where[Op.or] = [
                    { adType: "Commercial" },
                    { propertyType: "Commercial" }
                ];
            } else if (adType === "Openland") {
                where[Op.or] = [
                    { adType: { [Op.in]: ["Openland", "Open Land"] } },
                    { propertyType: "Land/Plot" }
                ];
            } else if (adType === "Sale") {
                where.adType = { [Op.in]: ["Sale", "Buy", "Resale"] };
            } else where.adType = adType;
        }
        if (category) where.category = category;
        if (possessionStatus) where.possessionStatus = possessionStatus;
        if (owner) {
            where.owner = owner;
        } else {
            const now = new Date();
            where.isApproved = true;
            where.isHidden = { [Op.not]: true };
            where[Op.and] = [
                {
                    [Op.or]: [
                        { isTrial: { [Op.not]: true } },
                        { trialExpiresAt: { [Op.gt]: now } }
                    ]
                }
            ];
        }

        // Budget / Price Range
        if (minPrice || maxPrice) {
            where[Op.or] = [
                { price: { [Op.between]: [minPrice || 0, maxPrice || 999999999] } },
                { rentAmount: { [Op.between]: [minPrice || 0, maxPrice || 999999999] } }
            ];
        }

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
        if (error.message.includes("possessionStatus")) {
            return res.status(500).json({
                message: "Database schema mismatch: 'possessionStatus' column is missing. Please visit /api/fix-db and then /api/sync to fix this.",
                fixUrl: "/api/fix-db"
            });
        }
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

        // Visibility restriction
        const now = new Date();
        const isExpiredTrial = property.isTrial && property.trialExpiresAt && new Date(property.trialExpiresAt) <= now;
        const isPubliclyHidden = !property.isApproved || property.isHidden || isExpiredTrial;

        if (isPubliclyHidden) {
            let canAccess = false;
            let reqUserId = null;
            const token = req.header("Authorization")?.replace("Bearer ", "");
            if (token) {
                try {
                    const decoded = jwt.verify(token, process.env.JWT_SECRET || "babahoms_fallback_secret_key_123");
                    reqUserId = decoded.id;
                } catch (err) { /* token invalid, ignore */ }
            }

            if (reqUserId) {
                const requester = await User.findByPk(reqUserId);
                if (requester && (requester.id === property.owner || requester.role === 'Admin' || requester.role === 'Company')) {
                    canAccess = true;
                }
            }
            if (!canAccess) {
                return res.status(403).json({ message: "This property listing is not active or has expired." });
            }
        }

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

        const isTrial = !!req.body.isTrial;

        // Limit Check
        if (isTrial) {
            const trialCount = await Property.count({ where: { owner: req.user.id, isTrial: true } });
            if (trialCount >= 5) {
                return res.status(403).json({
                    message: "You have reached your free trial limit of 5 properties. Please purchase a plan or contact support to post more properties."
                });
            }
        } else {
            const limit = user.propertyLimit !== undefined ? user.propertyLimit : 1;
            const paidCount = await Property.count({ where: { owner: req.user.id, isTrial: false } });
            if (paidCount >= limit) {
                // Instead of throwing an error, create it as hidden so they can pay for it
                const property = await Property.create({
                    ...req.body,
                    possessionStatus: req.body.possessionStatus,
                    owner: req.user.id,
                    isTrial: false,
                    trialExpiresAt: null,
                    isApproved: false,
                    isHidden: true
                });
                return res.status(201).json(property);
            }
        }

        const trialExpiresAt = isTrial ? new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) : null;
        const isApproved = true; // Both trials and paid properties (since users paid to have limits) are auto-approved

        const property = await Property.create({
            ...req.body,
            possessionStatus: req.body.possessionStatus,
            owner: req.user.id,
            isTrial,
            trialExpiresAt,
            isApproved,
            isHidden: false
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

        await property.update({
            ...req.body,
            possessionStatus: req.body.possessionStatus
        });

        res.json(property);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST route to upload AI generated video for a property
router.post('/:id/generated-video', auth, upload.single('video'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No video file provided' });
        }
        const videoUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        const property = await Property.findByPk(req.params.id);
        if (!property) {
            return res.status(404).json({ message: 'Property not found' });
        }
        // Update generatedVideo field
        await property.update({ generatedVideo: videoUrl });
        return res.json({ message: 'Generated video saved', videoUrl, property });
    } catch (err) {
        console.error('Generated video upload error:', err);
        return res.status(500).json({ message: err.message });
    }
});

// POST route to save base64 video data for a property
router.post('/:id/generated-video-base64', auth, async (req, res) => {
    try {
        const { videoData } = req.body;
        if (!videoData) {
            return res.status(400).json({ message: 'No video data provided' });
        }
        const property = await Property.findByPk(req.params.id);
        if (!property) {
            return res.status(404).json({ message: 'Property not found' });
        }
        // Store the base64 string directly in generatedVideo column
        await property.update({ generatedVideo: videoData });
        return res.json({ message: 'Generated video saved as base64', videoUrl: videoData, property });
    } catch (err) {
        console.error('Base64 video save error:', err);
        return res.status(500).json({ message: err.message });
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

// PAY for property (reactivate)
router.post("/:id/pay", auth, async (req, res) => {
    try {
        const property = await Property.findOne({
            where: { id: req.params.id, owner: req.user.id },
        });
        if (!property) {
            return res.status(404).json({ message: "Property not found or unauthorized" });
        }

        const user = await User.findByPk(req.user.id);
        const limit = user.propertyLimit !== undefined ? user.propertyLimit : 1;
        const paidCount = await Property.count({ where: { owner: req.user.id, isTrial: false } });
        if (paidCount >= limit) {
            // Keep property hidden/unapproved but allow payment simulation/request
            await property.update({
                isHidden: true,
                isApproved: false,
                isTrial: false,
                trialExpiresAt: null,
            });
            return res.json({ message: "Payment request submitted, pending admin activation", property });
        }

        // Simulate payment processing; in real app, integrate payment gateway.
        await property.update({
            isHidden: false,
            isApproved: true,
            isTrial: false,
            trialExpiresAt: null,
        });
        res.json({ message: "Payment successful, property reactivated", property });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// FREE TRIAL activation (15 days)
router.post("/:id/free-trial", auth, async (req, res) => {
    try {
        const property = await Property.findOne({
            where: { id: req.params.id, owner: req.user.id },
        });
        if (!property) {
            return res.status(404).json({ message: "Property not found or unauthorized" });
        }

        // Check if property's trial has already expired
        if (property.isTrial && property.trialExpiresAt && new Date(property.trialExpiresAt) <= new Date()) {
            return res.status(400).json({ message: "Free trial has already expired for this property. Please pay to reactivate it." });
        }

        // Check trial limit
        const trialCount = await Property.count({ where: { owner: req.user.id, isTrial: true } });
        if (trialCount >= 5) {
            return res.status(400).json({ message: "You have reached your free trial limit of 5 properties." });
        }

        const trialExpiresAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
        await property.update({
            isHidden: false,
            isApproved: true,
            isTrial: true,
            trialExpiresAt,
        });
        res.json({ message: "Free trial activated for 15 days", property });
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