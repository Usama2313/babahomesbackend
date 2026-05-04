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

// Censorship function to block numbers, links, and contact details
const censorContent = (text) => {
    if (!text) return text;

    // 1. Check for links/URLs (e.g. www.google.com, http://..., example.com, and space-bypasses like 'www google com')
    const urlRegex = /(https?:\/\/|www\.)[^\s]+|([a-z0-9]+([\.\-]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?)/gi;
    const urlBypassRegex = /\b[a-z0-9]{2,}[\s\.\-]{1,3}(com|net|org|in|io|co|biz|info|website|app|online)\b/gi;

    // 2. Check for digits (6 or more, with common separators)
    const digitRegex = /(\+?\d[\d\s-]{5,}\d)/gi;

    // 3. Check for word-based numbers (e.g. "three two three")
    const numberWords = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
    // This matches 2 or more number words separated by spaces or dashes (more aggressive)
    const wordNumPattern = `(${numberWords.join("|")})[\\s-]*(?:${numberWords.join("|")})`;
    const wordNumRegex = new RegExp(wordNumPattern, "gi");

    // 4. Contact keywords
    const keywordsRegex = /(whatsapp|number|call|phone|contact|mobile|social|instagram|facebook|snapchat|linkedin|tiktok|telegram|babaair)/gi;

    if (urlRegex.test(text) || urlBypassRegex.test(text) || digitRegex.test(text) || wordNumRegex.test(text) || keywordsRegex.test(text)) {
        return "[Message blocked: Links or contact details are not allowed]";
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

        // Block restricted content for non-admin/company users
        if (!isCompany) {
            const censored = censorContent(content);
            if (censored.includes("[Message blocked")) {
                return res.status(400).json({ message: "Sharing links or contact details is not allowed." });
            }
        }

        const message = await Message.create({
            senderId: req.user.id,
            receiverId,
            propertyId,
            content: content,
        });

        // SMS Notification to Admin/Company
        if (receiver.role === "Company" || receiver.role === "Admin") {
            try {
                const { sendSMS } = require("../utils/twilio");
                const smsBody = `Baba Homs: New message from ${sender.name} (${sender.phone}). Message: ${content.substring(0, 60)}${content.length > 60 ? '...' : ''}`;
                await sendSMS(receiver.phone, smsBody);
                console.log(`SMS alert sent to admin: ${receiver.name}`);
            } catch (smsErr) {
                console.error("SMS notification skipped or failed:", smsErr.message);
            }
        }

        res.status(201).json(message);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get messages for a specific property between two users
router.get("/conversation/:propertyId/:otherUserId", auth, async (req, res) => {
    try {
        const cleanId = (id) => (id === "null" || id === "undefined" || id === "0" || id === "direct") ? null : id;
        const pId = cleanId(propertyId);
        const oUserId = cleanId(otherUserId);
        const sId = cleanId(senderId);

        const currentUser = await User.findByPk(req.user.id);
        const isCompany = currentUser.role === "Company" || currentUser.role === "Admin";

        if (!oUserId) return res.status(400).json({ message: "Invalid user ID" });

        let where;
        if (isCompany && sId) {
            // Admin spectating two other users
            where = {
                [Op.or]: [
                    { senderId: sId, receiverId: oUserId },
                    { senderId: oUserId, receiverId: sId },
                ],
            };
        } else {
            // Normal user or Admin chatting directly
            if (req.user.id === parseInt(oUserId)) {
                return res.status(400).json({ message: "You cannot chat with yourself." });
            }
            where = {
                [Op.or]: [
                    { senderId: req.user.id, receiverId: oUserId },
                    { senderId: oUserId, receiverId: req.user.id },
                ],
            };
        }

        where.propertyId = pId;

        const messages = await Message.findAll({
            where,
            include: [
                {
                    model: User,
                    as: 'sender',
                    attributes: isCompany ? ['id', 'name', 'role', 'phone', 'profilePicture', 'lastLogin'] : ['id', 'name', 'role', 'profilePicture', 'lastLogin']
                },
                {
                    model: User,
                    as: 'receiver',
                    attributes: isCompany ? ['id', 'name', 'role', 'phone', 'profilePicture', 'lastLogin'] : ['id', 'name', 'role', 'profilePicture', 'lastLogin']
                }
            ],
            order: [["createdAt", "ASC"]],
        });

        // Processing messages
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

        const conversations = [];
        const seen = new Set();

        for (const msg of messages) {
            // Create a unique key for the pair [UserA, UserB] on PropertyX
            const participants = [msg.senderId, msg.receiverId].sort();
            const key = `${msg.propertyId}-${participants[0]}-${participants[1]}`;

            if (!seen.has(key)) {
                seen.add(key);

                const sender = await User.findByPk(msg.senderId, { attributes: ["id", "name", "role", "phone", "email", "profilePicture", "lastLogin"] });
                const receiver = await User.findByPk(msg.receiverId, { attributes: ["id", "name", "role", "phone", "email", "profilePicture", "lastLogin"] });

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
        const cleanId = (id) => (id === "null" || id === "undefined" || id === "0") ? null : id;
        const pId = cleanId(req.params.propertyId);
        const aId = cleanId(req.params.agentId);

        if (!aId) return res.status(400).json({ message: "Invalid agent ID" });

        // Find last message from agent in this property conversation
        const lastMsg = await Message.findOne({
            where: {
                propertyId: pId,
                senderId: aId
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
