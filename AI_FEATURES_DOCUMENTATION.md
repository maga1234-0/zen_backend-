# AI Features Documentation - Gemini Integration

## Overview
This hotel management system now includes 5 AI-powered features using Google's Gemini AI:

1. **AI Chatbot** - Guest inquiry assistant
2. **Smart Room Recommendations** - Personalized upgrade suggestions
3. **Automated Message Generation** - Email/message templates
4. **Sentiment Analysis** - Guest review analysis
5. **Predictive Analytics** - Booking pattern predictions

---

## Setup Instructions

### 1. Database Setup
Run this SQL in your Supabase SQL Editor:

```sql
-- Create guest_reviews table
CREATE TABLE IF NOT EXISTS guest_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
    review_text TEXT NOT NULL,
    sentiment VARCHAR(20) CHECK (sentiment IN ('Positive', 'Neutral', 'Negative', 'Unknown')),
    sentiment_score INTEGER CHECK (sentiment_score >= 0 AND sentiment_score <= 100),
    analysis JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_guest_reviews_guest ON guest_reviews(guest_id);
CREATE INDEX IF NOT EXISTS idx_guest_reviews_sentiment ON guest_reviews(sentiment);
CREATE INDEX IF NOT EXISTS idx_guest_reviews_created ON guest_reviews(created_at DESC);

CREATE TRIGGER update_guest_reviews_updated_at 
BEFORE UPDATE ON guest_reviews 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();
```

### 2. Environment Variable Setup

**⚠️ IMPORTANT SECURITY NOTE:**
The API key shared in chat should be **REVOKED IMMEDIATELY** at https://aistudio.google.com/app/apikey

After creating a new API key:

**On Render:**
1. Go to your Render dashboard
2. Select your backend service
3. Go to "Environment" tab
4. Add: `GEMINI_API_KEY=your_new_api_key_here`
5. Save changes (will trigger auto-deploy)

---

## API Endpoints

### Base URL
```
https://zen-backend-jzjh.onrender.com/api/ai
```

All endpoints require authentication (Bearer token in Authorization header).

---

### 1. AI Chatbot

**Endpoint:** `POST /api/ai/chat`

**Description:** Interactive chatbot for guest inquiries about hotel services, amenities, policies, etc.

**Request Body:**
```json
{
  "message": "What time is check-in?",
  "context": {
    "guestName": "John Doe",
    "roomNumber": "101"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Check-in time is at 3:00 PM. If you arrive earlier, we'll be happy to store your luggage..."
}
```

**Use Cases:**
- Guest service inquiries
- Hotel policy questions
- Amenity information
- General assistance

---

### 2. Smart Room Upgrade Recommendations

**Endpoint:** `POST /api/ai/recommend-upgrade`

**Description:** Analyzes guest booking history and suggests personalized room upgrades.

**Request Body:**
```json
{
  "guestId": "uuid-here",
  "currentRoomType": "Standard"
}
```

**Response:**
```json
{
  "success": true,
  "recommendations": "Based on your previous stays, here are personalized upgrades:\n\n1. Deluxe Suite - Perfect for...",
  "availableRooms": [
    {
      "room_type": "Deluxe",
      "price_per_night": 150.00,
      "amenities": {...}
    }
  ]
}
```

**Use Cases:**
- Upselling opportunities
- Personalized guest experience
- Revenue optimization

---

### 3. Automated Message Generation

**Endpoint:** `POST /api/ai/generate-message`

**Description:** Generates professional emails and messages for various scenarios.

**Message Types:**
- `welcome` - Welcome email for new guests
- `checkout_reminder` - Checkout time reminder
- `payment_reminder` - Payment due notification
- `booking_confirmation` - Booking confirmation email

**Request Body (Welcome Email):**
```json
{
  "type": "welcome",
  "data": {
    "guestName": "John Doe",
    "roomNumber": "101",
    "checkInDate": "2026-05-20",
    "checkOutDate": "2026-05-25"
  }
}
```

**Request Body (Payment Reminder):**
```json
{
  "type": "payment_reminder",
  "data": {
    "guestName": "Jane Smith",
    "amount": 500.00,
    "dueDate": "2026-05-25"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Dear John Doe,\n\nWelcome to Grand Seafoam Hotel! We're delighted to have you...",
  "type": "welcome"
}
```

**Use Cases:**
- Automated guest communications
- Consistent messaging
- Time-saving for staff
- Professional correspondence

---

### 4. Sentiment Analysis

**Endpoint:** `POST /api/ai/analyze-review`

**Description:** Analyzes guest reviews to extract sentiment, key topics, and actionable insights.

**Request Body:**
```json
{
  "review": "The room was clean and the staff was very friendly. However, the WiFi was slow.",
  "guestId": "uuid-here"
}
```

**Response:**
```json
{
  "success": true,
  "analysis": {
    "sentiment": "Positive",
    "score": 75,
    "topics": {
      "cleanliness": "positive",
      "service": "positive",
      "amenities": "negative"
    },
    "actionItems": [
      "Investigate WiFi speed issues",
      "Acknowledge positive staff feedback"
    ],
    "summary": "Overall positive experience with room cleanliness and staff service. WiFi connectivity needs improvement."
  }
}
```

**Features:**
- Automatically stores analysis in database
- Sentiment scoring (0-100)
- Key topic extraction
- Management action items

**Use Cases:**
- Guest feedback analysis
- Service improvement identification
- Staff performance insights
- Quality monitoring

---

### 5. Predictive Analytics

**Endpoint:** `GET /api/ai/predict-trends?timeframe=30days`

**Description:** Analyzes historical booking data to predict future trends and provide recommendations.

**Query Parameters:**
- `timeframe` (optional): `30days`, `60days`, `90days` (default: `30days`)

**Response:**
```json
{
  "success": true,
  "predictions": {
    "trend": "increasing",
    "peakPeriods": ["2026-06-15 to 2026-06-30", "2026-07-01 to 2026-07-15"],
    "roomTypePreferences": {
      "Deluxe": "35%",
      "Standard": "45%",
      "Suite": "20%"
    },
    "revenuePrediction": {
      "next30days": "$45,000 - $52,000",
      "confidence": "high"
    },
    "pricingRecommendations": [
      "Increase Deluxe room rates by 10% during peak periods",
      "Offer early bird discounts for Standard rooms"
    ],
    "marketingSuggestions": [
      "Target business travelers for Suite bookings",
      "Promote weekend packages for families"
    ]
  },
  "dataPoints": 180,
  "currentOccupancy": {
    "occupied": 45,
    "total": 100
  }
}
```

**Use Cases:**
- Revenue management
- Dynamic pricing strategies
- Marketing campaign planning
- Inventory optimization
- Staff scheduling

---

## Integration Examples

### Frontend Integration (React/TypeScript)

```typescript
// services/aiService.ts
import api from './api';

export const aiService = {
  // Chatbot
  async chat(message: string, context?: any) {
    const response = await api.post('/ai/chat', { message, context });
    return response.data;
  },

  // Room recommendations
  async getUpgradeRecommendations(guestId: string, currentRoomType: string) {
    const response = await api.post('/ai/recommend-upgrade', {
      guestId,
      currentRoomType
    });
    return response.data;
  },

  // Generate message
  async generateMessage(type: string, data: any) {
    const response = await api.post('/ai/generate-message', { type, data });
    return response.data;
  },

  // Analyze review
  async analyzeReview(review: string, guestId?: string) {
    const response = await api.post('/ai/analyze-review', { review, guestId });
    return response.data;
  },

  // Predict trends
  async predictTrends(timeframe: string = '30days') {
    const response = await api.get(`/ai/predict-trends?timeframe=${timeframe}`);
    return response.data;
  }
};
```

### Example: Chatbot Component

```typescript
// components/AIChatbot.tsx
import { useState } from 'react';
import { aiService } from '../services/aiService';

export function AIChatbot() {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    setLoading(true);
    try {
      const result = await aiService.chat(message);
      setResponse(result.message);
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chatbot">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Ask me anything about the hotel..."
      />
      <button onClick={handleSend} disabled={loading}>
        {loading ? 'Thinking...' : 'Send'}
      </button>
      {response && <div className="response">{response}</div>}
    </div>
  );
}
```

---

## Testing the API

### Using cURL

```bash
# 1. Login to get token
curl -X POST https://zen-backend-jzjh.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hotel.com","password":"your_password"}'

# 2. Test Chatbot
curl -X POST https://zen-backend-jzjh.onrender.com/api/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"message":"What time is breakfast?"}'

# 3. Test Sentiment Analysis
curl -X POST https://zen-backend-jzjh.onrender.com/api/ai/analyze-review \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"review":"Great hotel, loved the service!"}'

# 4. Test Predictive Analytics
curl -X GET "https://zen-backend-jzjh.onrender.com/api/ai/predict-trends?timeframe=30days" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description here"
}
```

**Common Error Codes:**
- `400` - Bad Request (missing/invalid parameters)
- `401` - Unauthorized (missing/invalid token)
- `500` - Internal Server Error (AI service error)

---

## Performance Considerations

1. **Rate Limiting**: Gemini API has rate limits. Consider implementing request caching for frequently asked questions.

2. **Response Time**: AI responses typically take 2-5 seconds. Use loading states in UI.

3. **Cost Management**: Each API call costs tokens. Monitor usage in Google AI Studio.

4. **Fallback Responses**: Service includes fallback messages if AI is unavailable.

---

## Security Best Practices

1. ✅ All endpoints require authentication
2. ✅ API key stored in environment variables
3. ✅ Never expose API key in frontend code
4. ✅ Input validation on all endpoints
5. ⚠️ **REVOKE the old API key immediately**
6. ✅ Use HTTPS for all API calls

---

## Next Steps

1. **Run the SQL script** in Supabase to create guest_reviews table
2. **Add GEMINI_API_KEY** to Render environment variables
3. **Test each endpoint** using the examples above
4. **Create frontend components** for each AI feature
5. **Monitor usage** in Google AI Studio dashboard

---

## Support & Resources

- **Gemini API Docs**: https://ai.google.dev/docs
- **API Key Management**: https://aistudio.google.com/app/apikey
- **Backend Repo**: https://github.com/maga1234-0/zen_backend-
- **Frontend Repo**: https://github.com/maga1234-0/Zen

---

## Files Created/Modified

### New Files:
- `src/services/aiService.ts` - AI service implementation
- `src/controllers/aiController.ts` - API endpoint controllers
- `src/routes/aiRoutes.ts` - Route definitions
- `database/create-guest-reviews-table.sql` - Database schema

### Modified Files:
- `src/routes/index.ts` - Added AI routes
- `package.json` - Added @google/generative-ai dependency

---

**Last Updated:** May 20, 2026
**Version:** 1.0.0
