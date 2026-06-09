"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chat = chat;
exports.recommendUpgrade = recommendUpgrade;
exports.generateAutomatedMessage = generateAutomatedMessage;
exports.analyzeSentiment = analyzeSentiment;
exports.predictTrends = predictTrends;
const aiService_1 = require("../services/aiService");
/**
 * AI Chatbot endpoint
 * POST /api/ai/chat
 */
async function chat(req, res) {
    try {
        const { message, context } = req.body;
        if (!message) {
            return res.status(400).json({
                success: false,
                message: 'Message is required'
            });
        }
        const result = await (0, aiService_1.chatWithGuest)(message, context);
        return res.json(result);
    }
    catch (error) {
        console.error('Chat endpoint error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}
/**
 * Room upgrade recommendations
 * POST /api/ai/recommend-upgrade
 */
async function recommendUpgrade(req, res) {
    try {
        const { guestId, currentRoomType } = req.body;
        if (!guestId || !currentRoomType) {
            return res.status(400).json({
                success: false,
                message: 'Guest ID and current room type are required'
            });
        }
        const result = await (0, aiService_1.recommendRoomUpgrade)(guestId, currentRoomType);
        return res.json(result);
    }
    catch (error) {
        console.error('Recommend upgrade endpoint error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}
/**
 * Generate automated messages
 * POST /api/ai/generate-message
 */
async function generateAutomatedMessage(req, res) {
    try {
        const { type, data } = req.body;
        if (!type || !data) {
            return res.status(400).json({
                success: false,
                message: 'Message type and data are required'
            });
        }
        const validTypes = ['welcome', 'checkout_reminder', 'payment_reminder', 'booking_confirmation'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({
                success: false,
                message: `Invalid message type. Valid types: ${validTypes.join(', ')}`
            });
        }
        const result = await (0, aiService_1.generateMessage)(type, data);
        return res.json(result);
    }
    catch (error) {
        console.error('Generate message endpoint error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}
/**
 * Analyze guest review sentiment
 * POST /api/ai/analyze-review
 */
async function analyzeSentiment(req, res) {
    try {
        const { review, guestId } = req.body;
        if (!review) {
            return res.status(400).json({
                success: false,
                message: 'Review text is required'
            });
        }
        const result = await (0, aiService_1.analyzeGuestReview)(review, guestId);
        return res.json(result);
    }
    catch (error) {
        console.error('Analyze sentiment endpoint error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}
/**
 * Predict booking trends
 * GET /api/ai/predict-trends
 */
async function predictTrends(req, res) {
    try {
        const { timeframe } = req.query;
        const result = await (0, aiService_1.predictBookingTrends)(timeframe);
        return res.json(result);
    }
    catch (error) {
        console.error('Predict trends endpoint error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}
exports.default = {
    chat,
    recommendUpgrade,
    generateAutomatedMessage,
    analyzeSentiment,
    predictTrends
};
