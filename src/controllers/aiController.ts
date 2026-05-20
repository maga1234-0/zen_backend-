import { Request, Response } from 'express';
import {
  chatWithGuest,
  recommendRoomUpgrade,
  generateMessage,
  analyzeGuestReview,
  predictBookingTrends
} from '../services/aiService';

/**
 * AI Chatbot endpoint
 * POST /api/ai/chat
 */
export async function chat(req: Request, res: Response) {
  try {
    const { message, context } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    const result = await chatWithGuest(message, context);
    return res.json(result);
  } catch (error: any) {
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
export async function recommendUpgrade(req: Request, res: Response) {
  try {
    const { guestId, currentRoomType } = req.body;

    if (!guestId || !currentRoomType) {
      return res.status(400).json({
        success: false,
        message: 'Guest ID and current room type are required'
      });
    }

    const result = await recommendRoomUpgrade(guestId, currentRoomType);
    return res.json(result);
  } catch (error: any) {
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
export async function generateAutomatedMessage(req: Request, res: Response) {
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

    const result = await generateMessage(type, data);
    return res.json(result);
  } catch (error: any) {
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
export async function analyzeSentiment(req: Request, res: Response) {
  try {
    const { review, guestId } = req.body;

    if (!review) {
      return res.status(400).json({
        success: false,
        message: 'Review text is required'
      });
    }

    const result = await analyzeGuestReview(review, guestId);
    return res.json(result);
  } catch (error: any) {
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
export async function predictTrends(req: Request, res: Response) {
  try {
    const { timeframe } = req.query;

    const result = await predictBookingTrends(timeframe as string);
    return res.json(result);
  } catch (error: any) {
    console.error('Predict trends endpoint error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

export default {
  chat,
  recommendUpgrade,
  generateAutomatedMessage,
  analyzeSentiment,
  predictTrends
};
