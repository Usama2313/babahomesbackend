const express = require("express");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const Message = require("../models/Message");
const User = require("../models/User");
const Property = require("../models/Property");

const router = express.Router();

// Auth Middleware
const auth = (req, res, next) => {
    try {
        const token = req.header("Authorization")?.replace("Bearer ", "");
        if (!token) return res.status(401).json({ message: "No token, authorization denied" });
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "babahoms_fallback_secret_key_123");
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ message: "Token is not valid" });
    }
};

// Censorship function to block numbers, whatsapp, and social links
const censorContent = (text) => {
    // Regex for phone numbers/whatsapp (covers words like 'whatsapp', 'number', 'call', 'digits')
    const phoneRegex = /(\+?\d[\d\s-]{7,}\d)|(whatsapp|number|call|phone|contact|mobile|social|instagram|facebook|snapchat|linkedin|tiktok|link|http|www\.)/gi;

    if (phoneRegex.test(text)) {
        return "[Message blocked]";
    }
    return text;
};

// Send a message
router.post("/send", auth, async (req, res) => {
    try {
        const { receiverId, propertyId, content } = req.body;

        const sender = await User.findByPk(req.user.id);
        const receiver = await User.findByPk(receiverId);

        if (!sender || !receiver) return res.status(404).json({ message: "User not found" });
        if (sender.id === receiver.id) return res.status(400).json({ message: "You cannot chat with yourself." });

        const isCompany = sender.role === "Company" || sender.role === "Admin" || receiver.role === "Company" || receiver.role === "Admin";
        const isAgentFinder = (sender.role === "Agent" && receiver.role === "Property Finder") ||
            (sender.role === "Property Finder" && receiver.role === "Agent");
        const isAgentAgent = sender.role === "Agent" && receiver.role === "Agent";
        const isAgentSeller = (sender.role === "Agent" && receiver.role === "Property Seller") ||
            (sender.role === "Property Seller" && receiver.role === "Agent");
        const isFinderSeller = (sender.role === "Property Finder" && receiver.role === "Property Seller") ||
            (sender.role === "Property Seller" && receiver.role === "Property Finder");

        if (!isAgentFinder && !isCompany && !isAgentAgent && !isAgentSeller && !isFinderSeller) {
            return res.status(403).json({ message: "Chat restricted." });
        }

        // We store the ORIGINAL content now, so Company can see it.
        // We will censor it on the fly in the retrieval routes.
        const message = await Message.create({
            senderId: req.user.id,
            receiverId,
            propertyId,
            content: content,
        });
        res.status(201).json(message);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get messages for a specific property between two users
router.get("/conversation/:propertyId/:otherUserId", auth, async (req, res) => {
    try {
        const { propertyId, otherUserId } = req.params;
        if (req.user.id === parseInt(otherUserId)) {
            return res.status(400).json({ message: "You cannot chat with yourself." });
        }

        const currentUser = await User.findByPk(req.user.id);
        const isCompany = currentUser.role === "Company" || currentUser.role === "Admin";

        const where = {
            [Op.or]: [
                { senderId: req.user.id, receiverId: otherUserId },
                { senderId: otherUserId, receiverId: req.user.id },
            ],
        };

        if (propertyId !== "null" && propertyId !== "direct" && propertyId !== "0") {
            where.propertyId = propertyId;
        } else {
            where.propertyId = null;
        }

        const messages = await Message.findAll({
            where,
            include: [
                {
                    model: User,
                    as: 'sender',
                    attributes: isCompany ? ['id', 'name', 'role', 'phone', 'profilePicture'] : ['id', 'name', 'role', 'profilePicture']
                },
                {
                    model: User,
                    as: 'receiver',
                    attributes: isCompany ? ['id', 'name', 'role', 'phone', 'profilePicture'] : ['id', 'name', 'role', 'profilePicture']
                }
            ],
            order: [["createdAt", "ASC"]],
        });

        // Censor on the fly for non-company users
        const processedMessages = messages.map(msg => {
            const data = msg.toJSON();
            if (!isCompany) {
                data.content = censorContent(data.content);
            }
            return data;
        });

        res.json(processedMessages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get all conversations for the current user (Admin sees ALL)
router.get("/conversations", auth, async (req, res) => {
    try {
        const currentUser = await User.findByPk(req.user.id);
        const isAdmin = currentUser.role === "Admin" || currentUser.role === "Company";

        const where = isAdmin ? {} : {
            [Op.or]: [{ senderId: req.user.id }, { receiverId: req.user.id }],
        };

        const messages = await Message.findAll({
            where,
            include: [
                { model: Property, attributes: ["title", "id"] },
            ],
            order: [["createdAt", "DESC"]],
        });

        // Group by conversation
        const conversations = [];
        const seen = new Set();

        for (const msg of messages) {
            const otherId = msg.senderId === req.user.id ? msg.receiverId : msg.senderId;
            // For Admin, we need to distinguish conversations between user A and user B on property X
            const key = isAdmin ? `${msg.propertyId}-${msg.senderId}-${msg.receiverId}` : `${msg.propertyId}-${otherId}`;

            if (!seen.has(key)) {
                seen.add(key);

                // For admin, "otherUser" is the person they are NOT (if they are in the chat) 
                // OR just the sender if they are spectating.
                const targetId = isAdmin ? msg.senderId : otherId;

                const sender = await User.findByPk(msg.senderId, { attributes: ["id", "name", "role", "phone", "email", "profilePicture"] });
                const receiver = await User.findByPk(msg.receiverId, { attributes: ["id", "name", "role", "phone", "email", "profilePicture"] });

                conversations.push({
                    lastMessage: msg,
                    sender,
                    receiver,
                    property: msg.Property
                });
            }
        }

        res.json(conversations);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Admin Route: Get all chat records for the company
router.get("/admin/all-messages", auth, async (req, res) => {
    try {
        const currentUser = await User.findByPk(req.user.id);
        if (currentUser.role !== "Company" && currentUser.role !== "Admin") {
            return res.status(403).json({ message: "Access denied. Only company can view all chats." });
        }

        const messages = await Message.findAll({
            include: [
                { model: Property, attributes: ['title'] },
                { model: User, as: 'Sender', attributes: ['name', 'role', 'phone'] },
                { model: User, as: 'Receiver', attributes: ['name', 'role', 'phone'] }
            ],
            order: [["createdAt", "DESC"]],
        });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Check Agent availability (1 hour logic)
router.get("/check-availability/:propertyId/:agentId", auth, async (req, res) => {
    try {
        const { propertyId, agentId } = req.params;

        // Find last message from agent in this property conversation
        const lastMsg = await Message.findOne({
            where: {
                propertyId,
                senderId: agentId
            },
            order: [['createdAt', 'DESC']]
        });

        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

        // If no message ever or last message was > 1 hour ago
        const isUnavailable = !lastMsg || new Date(lastMsg.createdAt) < oneHourAgo;

        if (isUnavailable) {
            // Find a Company/Admin user to redirect to
            const companyUser = await User.findOne({
                where: { role: { [Op.or]: ["Company", "Admin"] } },
                attributes: ["id", "name"]
            });
            return res.json({ available: false, fallback: companyUser });
        }

        res.json({ available: true });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete a conversation (Admin only)
router.delete("/conversation/:propertyId/:senderId/:receiverId", auth, async (req, res) => {
    try {
        const currentUser = await User.findByPk(req.user.id);
        if (currentUser.role !== "Admin" && currentUser.role !== "Company") {
            return res.status(403).json({ message: "Access denied." });
        }

        const { propertyId, senderId, receiverId } = req.params;

        const where = {
            [Op.or]: [
                { senderId: senderId, receiverId: receiverId },
                { senderId: receiverId, receiverId: senderId },
            ],
        };

        if (propertyId === "null" || propertyId === "direct" || propertyId === "0") {
            where.propertyId = null;
        } else {
            where.propertyId = propertyId;
        }

        await Message.destroy({ where });

        res.json({ message: "Conversation deleted successfully." });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
