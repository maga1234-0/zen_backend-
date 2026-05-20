# 🤖 AI Features Setup Guide

## ✅ What's Been Done

All 5 AI features have been successfully integrated into your backend:

1. ✅ **AI Chatbot** - Guest inquiry assistant
2. ✅ **Smart Room Recommendations** - Personalized upgrade suggestions  
3. ✅ **Automated Message Generation** - Email/message templates
4. ✅ **Sentiment Analysis** - Guest review analysis
5. ✅ **Predictive Analytics** - Booking pattern predictions

### Files Created:
- ✅ `src/services/aiService.ts` - Core AI logic
- ✅ `src/controllers/aiController.ts` - API endpoints
- ✅ `src/routes/aiRoutes.ts` - Route definitions
- ✅ `database/create-guest-reviews-table.sql` - Database schema
- ✅ `AI_FEATURES_DOCUMENTATION.md` - Complete API documentation

### Changes Pushed:
- ✅ Committed to backend repo (commit: 8928525)
- ✅ Pushed to https://github.com/maga1234-0/zen_backend-

---

## 🚨 CRITICAL: Security Issue

**⚠️ YOUR API KEY WAS EXPOSED IN CHAT!**

The Gemini API key you shared (`AIzaSyADtaN1hdLVayAmOY7dJ3kjtBfzxNFggLo`) is now public and **MUST BE REVOKED IMMEDIATELY**.

### Step 1: Revoke Old Key
1. Go to: https://aistudio.google.com/app/apikey
2. Find the exposed key
3. Click "Delete" or "Revoke"

### Step 2: Create New Key
1. On the same page, click "Create API Key"
2. Select your Google Cloud project (or create new)
3. Copy the new key (keep it secret!)

---

## 📋 Setup Steps (Do These Now)

### Step 1: Run SQL in Supabase

1. Go to your Supabase dashboard
2. Click "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy and paste this SQL:

```sql
-- Create guest_reviews table for AI sentiment analysis
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

5. Click "Run" button
6. You should see "Success. No rows returned"

---

### Step 2: Add API Key to Render

1. Go to: https://dashboard.render.com
2. Find your backend service (zen_backend)
3. Click on it
4. Go to "Environment" tab on the left
5. Click "Add Environment Variable"
6. Add:
   - **Key:** `GEMINI_API_KEY`
   - **Value:** `your_new_api_key_here` (paste the NEW key from Step 2 above)
7. Click "Save Changes"
8. Render will automatically redeploy (takes 2-3 minutes)

---

### Step 3: Test the AI Features

Once Render finishes deploying, test the endpoints:

#### Test 1: Health Check
```bash
curl https://zen-backend-jzjh.onrender.com/health
```
Should return: `OK`

#### Test 2: Login (Get Token)
```bash
curl -X POST https://zen-backend-jzjh.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hotel.com","password":"your_password"}'
```
Copy the `token` from the response.

#### Test 3: AI Chatbot
```bash
curl -X POST https://zen-backend-jzjh.onrender.com/api/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"message":"What time is check-in?"}'
```

#### Test 4: Sentiment Analysis
```bash
curl -X POST https://zen-backend-jzjh.onrender.com/api/ai/analyze-review \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"review":"Great hotel! The staff was amazing and the room was very clean."}'
```

#### Test 5: Predictive Analytics
```bash
curl -X GET "https://zen-backend-jzjh.onrender.com/api/ai/predict-trends?timeframe=30days" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 📚 Available AI Endpoints

All endpoints are at: `https://zen-backend-jzjh.onrender.com/api/ai`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/chat` | POST | AI chatbot for guest inquiries |
| `/recommend-upgrade` | POST | Smart room upgrade recommendations |
| `/generate-message` | POST | Generate automated emails/messages |
| `/analyze-review` | POST | Sentiment analysis of guest reviews |
| `/predict-trends` | GET | Predictive analytics for bookings |

**Full documentation:** See `AI_FEATURES_DOCUMENTATION.md`

---

## 🎯 Next Steps

### For Backend:
- ✅ Revoke old API key
- ✅ Create new API key
- ✅ Run SQL in Supabase
- ✅ Add GEMINI_API_KEY to Render
- ✅ Test all 5 endpoints

### For Frontend:
You'll need to create UI components to use these features:

1. **AI Chatbot Widget** - Floating chat button for guests
2. **Room Upgrade Modal** - Show recommendations during booking
3. **Message Generator** - Button to auto-generate emails
4. **Review Analysis Dashboard** - Display sentiment trends
5. **Analytics Dashboard** - Show booking predictions

Would you like me to create the frontend components next?

---

## 🔍 Monitoring & Costs

### Check API Usage:
- Go to: https://aistudio.google.com/app/apikey
- Click on your API key
- View usage statistics

### Free Tier Limits:
- Gemini API has generous free tier
- Monitor usage to avoid unexpected charges
- Consider implementing rate limiting for production

---

## 🆘 Troubleshooting

### "API key not valid" error:
- Make sure you added `GEMINI_API_KEY` to Render environment variables
- Check that the key is correct (no extra spaces)
- Wait for Render to finish redeploying

### "Table guest_reviews does not exist":
- Run the SQL script in Supabase SQL Editor
- Make sure you're connected to the correct database

### "Unauthorized" error:
- Make sure you're sending the Bearer token in Authorization header
- Token format: `Authorization: Bearer YOUR_TOKEN`

### AI responses are slow:
- Normal! AI responses take 2-5 seconds
- Use loading states in your frontend
- Consider caching common questions

---

## 📞 Support

- **Backend Repo:** https://github.com/maga1234-0/zen_backend-
- **Frontend Repo:** https://github.com/maga1234-0/Zen
- **Backend URL:** https://zen-backend-jzjh.onrender.com
- **Gemini Docs:** https://ai.google.dev/docs

---

**Status:** ✅ Backend integration complete, ready for testing!
**Last Updated:** May 20, 2026
