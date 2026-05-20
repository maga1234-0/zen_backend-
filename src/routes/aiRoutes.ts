import { Router } from 'express';
import {
  chat,
  recommendUpgrade,
  generateAutomatedMessage,
  analyzeSentiment,
  predictTrends
} from '../controllers/aiController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All AI routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/ai/chat
 * @desc    AI Chatbot for guest inquiries
 * @access  Private
 * @body    { message: string, context?: any }
 */
router.post('/chat', chat);

/**
 * @route   POST /api/ai/recommend-upgrade
 * @desc    Get smart room upgrade recommendations
 * @access  Private
 * @body    { guestId: number, currentRoomType: string }
 */
router.post('/recommend-upgrade', recommendUpgrade);

/**
 * @route   POST /api/ai/generate-message
 * @desc    Generate automated emails/messages
 * @access  Private
 * @body    { type: 'welcome' | 'checkout_reminder' | 'payment_reminder' | 'booking_confirmation', data: any }
 */
router.post('/generate-message', generateAutomatedMessage);

/**
 * @route   POST /api/ai/analyze-review
 * @desc    Analyze guest review sentiment
 * @access  Private
 * @body    { review: string, guestId?: number }
 */
router.post('/analyze-review', analyzeSentiment);

/**
 * @route   GET /api/ai/predict-trends
 * @desc    Get predictive analytics for booking patterns
 * @access  Private
 * @query   { timeframe?: string }
 */
router.get('/predict-trends', predictTrends);

export default router;
