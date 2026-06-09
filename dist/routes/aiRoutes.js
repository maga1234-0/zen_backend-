"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const aiController_1 = require("../controllers/aiController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All AI routes require authentication
router.use(auth_1.authenticate);
/**
 * @route   POST /api/ai/chat
 * @desc    AI Chatbot for guest inquiries
 * @access  Private
 * @body    { message: string, context?: any }
 */
router.post('/chat', aiController_1.chat);
/**
 * @route   POST /api/ai/recommend-upgrade
 * @desc    Get smart room upgrade recommendations
 * @access  Private
 * @body    { guestId: number, currentRoomType: string }
 */
router.post('/recommend-upgrade', aiController_1.recommendUpgrade);
/**
 * @route   POST /api/ai/generate-message
 * @desc    Generate automated emails/messages
 * @access  Private
 * @body    { type: 'welcome' | 'checkout_reminder' | 'payment_reminder' | 'booking_confirmation', data: any }
 */
router.post('/generate-message', aiController_1.generateAutomatedMessage);
/**
 * @route   POST /api/ai/analyze-review
 * @desc    Analyze guest review sentiment
 * @access  Private
 * @body    { review: string, guestId?: number }
 */
router.post('/analyze-review', aiController_1.analyzeSentiment);
/**
 * @route   GET /api/ai/predict-trends
 * @desc    Get predictive analytics for booking patterns
 * @access  Private
 * @query   { timeframe?: string }
 */
router.get('/predict-trends', aiController_1.predictTrends);
exports.default = router;
