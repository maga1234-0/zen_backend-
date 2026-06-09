"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatWithGuest = chatWithGuest;
exports.recommendRoomUpgrade = recommendRoomUpgrade;
exports.generateMessage = generateMessage;
exports.analyzeGuestReview = analyzeGuestReview;
exports.predictBookingTrends = predictBookingTrends;
const generative_ai_1 = require("@google/generative-ai");
const database_1 = __importDefault(require("../config/database"));
// Initialize Gemini AI
const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
// Get Gemini Pro model
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
/**
 * AI Chatbot for Guest Inquiries
 */
async function chatWithGuest(message, context) {
    try {
        const prompt = `You are a helpful hotel concierge assistant. A guest has asked: "${message}"
    
Hotel Context:
- We offer various room types: Standard, Deluxe, Suite, Presidential
- Check-in time: 3:00 PM, Check-out time: 11:00 AM
- Amenities: Pool, Gym, Restaurant, Spa, Free WiFi
- Room service available 24/7

${context ? `Additional context: ${JSON.stringify(context)}` : ''}

Provide a helpful, professional, and friendly response.`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return {
            success: true,
            message: response.text()
        };
    }
    catch (error) {
        console.error('AI Chatbot Error:', error);
        return {
            success: false,
            message: 'I apologize, but I am unable to assist at the moment. Please contact our front desk.'
        };
    }
}
/**
 * Smart Room Upgrade Recommendations
 */
async function recommendRoomUpgrade(guestId, currentRoomType) {
    try {
        // Get guest booking history
        const guestHistory = await database_1.default.query(`SELECT b.*, r.room_type, r.price_per_night 
       FROM bookings b 
       JOIN rooms r ON b.room_id = r.id 
       WHERE b.guest_id = $1 
       ORDER BY b.created_at DESC LIMIT 5`, [guestId]);
        // Get available room types
        const availableRooms = await database_1.default.query(`SELECT DISTINCT room_type, price_per_night, amenities 
       FROM rooms 
       WHERE status = 'available' AND room_type != $1
       ORDER BY price_per_night DESC`, [currentRoomType]);
        const prompt = `You are a hotel sales assistant. Analyze this guest's booking history and recommend room upgrades.

Current Room: ${currentRoomType}
Guest History: ${JSON.stringify(guestHistory.rows)}
Available Upgrades: ${JSON.stringify(availableRooms.rows)}

Provide 2-3 personalized upgrade recommendations with reasons why each would suit this guest. Be persuasive but not pushy.`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return {
            success: true,
            recommendations: response.text(),
            availableRooms: availableRooms.rows
        };
    }
    catch (error) {
        console.error('Room Recommendation Error:', error);
        return {
            success: false,
            message: 'Unable to generate recommendations at this time.'
        };
    }
}
/**
 * Automated Email/Message Generation
 */
async function generateMessage(type, data) {
    try {
        let prompt = '';
        switch (type) {
            case 'welcome':
                prompt = `Generate a warm welcome email for a hotel guest with these details:
Guest Name: ${data.guestName}
Room Number: ${data.roomNumber}
Check-in Date: ${data.checkInDate}
Check-out Date: ${data.checkOutDate}

Include: Welcome message, room details, hotel amenities, check-out time, and contact information.`;
                break;
            case 'checkout_reminder':
                prompt = `Generate a polite checkout reminder email:
Guest Name: ${data.guestName}
Room Number: ${data.roomNumber}
Checkout Time: 11:00 AM
Current Date: ${new Date().toLocaleDateString()}

Include: Reminder about checkout time, express checkout options, and thank them for staying.`;
                break;
            case 'payment_reminder':
                prompt = `Generate a professional payment reminder:
Guest Name: ${data.guestName}
Amount Due: $${data.amount}
Due Date: ${data.dueDate}

Be polite but clear about the payment requirement.`;
                break;
            case 'booking_confirmation':
                prompt = `Generate a booking confirmation email:
Guest Name: ${data.guestName}
Room Type: ${data.roomType}
Check-in: ${data.checkInDate}
Check-out: ${data.checkOutDate}
Total Amount: $${data.totalAmount}

Include: Confirmation details, cancellation policy, and contact information.`;
                break;
            default:
                prompt = `Generate a professional hotel message for: ${type}. Data: ${JSON.stringify(data)}`;
        }
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return {
            success: true,
            message: response.text(),
            type
        };
    }
    catch (error) {
        console.error('Message Generation Error:', error);
        return {
            success: false,
            message: 'Unable to generate message at this time.'
        };
    }
}
/**
 * Sentiment Analysis of Guest Reviews
 */
async function analyzeGuestReview(review, guestId) {
    try {
        const prompt = `Analyze this hotel guest review and provide:
1. Overall sentiment (Positive/Neutral/Negative)
2. Sentiment score (0-100)
3. Key topics mentioned (service, cleanliness, amenities, etc.)
4. Action items for management
5. Brief summary

Review: "${review}"

Provide response in JSON format.`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const analysisText = response.text();
        // Try to parse JSON response
        let analysis;
        try {
            // Extract JSON from markdown code blocks if present
            const jsonMatch = analysisText.match(/```json\n([\s\S]*?)\n```/) ||
                analysisText.match(/```\n([\s\S]*?)\n```/);
            const jsonText = jsonMatch ? jsonMatch[1] : analysisText;
            analysis = JSON.parse(jsonText);
        }
        catch {
            // If parsing fails, return raw text
            analysis = {
                sentiment: 'Unknown',
                score: 50,
                summary: analysisText
            };
        }
        // Store analysis in database if guestId provided
        if (guestId) {
            await database_1.default.query(`INSERT INTO guest_reviews (guest_id, review_text, sentiment, sentiment_score, analysis, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`, [guestId, review, analysis.sentiment, analysis.score, JSON.stringify(analysis)]);
        }
        return {
            success: true,
            analysis
        };
    }
    catch (error) {
        console.error('Sentiment Analysis Error:', error);
        return {
            success: false,
            message: 'Unable to analyze review at this time.'
        };
    }
}
/**
 * Predictive Analytics for Booking Patterns
 */
async function predictBookingTrends(timeframe = '30days') {
    try {
        // Get historical booking data
        const bookings = await database_1.default.query(`SELECT 
        DATE(check_in_date) as date,
        COUNT(*) as booking_count,
        AVG(total_amount) as avg_amount,
        r.room_type
       FROM bookings b
       JOIN rooms r ON b.room_id = r.id
       WHERE check_in_date >= NOW() - INTERVAL '6 months'
       GROUP BY DATE(check_in_date), r.room_type
       ORDER BY date DESC`);
        // Get current occupancy
        const occupancy = await database_1.default.query(`SELECT 
        COUNT(CASE WHEN status = 'occupied' THEN 1 END) as occupied,
        COUNT(*) as total
       FROM rooms`);
        const prompt = `You are a hotel revenue management analyst. Analyze this booking data and provide predictions:

Historical Bookings (last 6 months): ${JSON.stringify(bookings.rows.slice(0, 50))}
Current Occupancy: ${occupancy.rows[0].occupied}/${occupancy.rows[0].total} rooms

Provide:
1. Booking trend analysis (increasing/decreasing/stable)
2. Peak booking periods identified
3. Room type preferences
4. Revenue predictions for next ${timeframe}
5. Pricing recommendations
6. Marketing suggestions

Format as JSON with clear sections.`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const predictionText = response.text();
        // Try to parse JSON response
        let predictions;
        try {
            const jsonMatch = predictionText.match(/```json\n([\s\S]*?)\n```/) ||
                predictionText.match(/```\n([\s\S]*?)\n```/);
            const jsonText = jsonMatch ? jsonMatch[1] : predictionText;
            predictions = JSON.parse(jsonText);
        }
        catch {
            predictions = {
                summary: predictionText,
                trend: 'stable'
            };
        }
        return {
            success: true,
            predictions,
            dataPoints: bookings.rows.length,
            currentOccupancy: occupancy.rows[0]
        };
    }
    catch (error) {
        console.error('Predictive Analytics Error:', error);
        return {
            success: false,
            message: 'Unable to generate predictions at this time.'
        };
    }
}
exports.default = {
    chatWithGuest,
    recommendRoomUpgrade,
    generateMessage,
    analyzeGuestReview,
    predictBookingTrends
};
