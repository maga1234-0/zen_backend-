# 🔧 AI Features Troubleshooting Guide

## ❌ Problem: Cannot Interact with AI

If you're unable to use the AI features, follow these steps:

---

## ✅ Step 1: Check Render Deployment Status

1. Go to: https://dashboard.render.com
2. Find your backend service (`zen_backend`)
3. Check the deployment status:
   - ✅ **Live** = Deployment successful
   - 🔄 **Building** = Wait for it to finish
   - ❌ **Failed** = Check logs for errors

---

## ✅ Step 2: Verify Environment Variable

The AI won't work without the Gemini API key!

### Check if GEMINI_API_KEY is set:

1. Go to Render dashboard
2. Click your backend service
3. Go to "Environment" tab
4. Look for `GEMINI_API_KEY`

### If Missing:
1. Click "Add Environment Variable"
2. Key: `GEMINI_API_KEY`
3. Value: Your new Gemini API key (NOT the old exposed one!)
4. Click "Save Changes"
5. Wait for auto-redeploy (2-3 minutes)

### Get a New API Key:
1. Go to: https://aistudio.google.com/app/apikey
2. **Delete the old key** (AIzaSyADtaN1hdLVayAmOY7dJ3kjtBfzxNFggLo)
3. Click "Create API Key"
4. Copy the new key
5. Add it to Render

---

## ✅ Step 3: Check Database Table

The sentiment analysis feature needs the `guest_reviews` table.

### Run this SQL in Supabase:

```sql
-- Check if table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_name = 'guest_reviews'
);

-- If it returns false, create the table:
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

CREATE TRIGGER update_guest_reviews_updated_at 
BEFORE UPDATE ON guest_reviews 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();
```

---

## ✅ Step 4: Test the Backend

### Test Health Endpoint:

```bash
curl https://zen-backend-jzjh.onrender.com/health
```

**Expected:** `OK`

### Test Login:

```bash
curl -X POST https://zen-backend-jzjh.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hotel.com","password":"password123"}'
```

**Expected:** JSON with `token` and `user`

### Test AI Chatbot:

```bash
# Replace YOUR_TOKEN with the token from login
curl -X POST https://zen-backend-jzjh.onrender.com/api/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"message":"What time is check-in?"}'
```

**Expected:** JSON with AI response

---

## ✅ Step 5: Check Render Logs

If tests fail, check the logs:

1. Go to Render dashboard
2. Click your backend service
3. Click "Logs" tab
4. Look for errors

### Common Errors:

**Error:** `GEMINI_API_KEY is not defined`
- **Fix:** Add the environment variable (Step 2)

**Error:** `Invalid API key`
- **Fix:** Your API key is wrong or revoked. Get a new one.

**Error:** `Table guest_reviews does not exist`
- **Fix:** Run the SQL script (Step 3)

**Error:** `authenticate is not a function`
- **Fix:** Already fixed in commit d21bba2

---

## ✅ Step 6: Check Frontend Connection

### Verify API URL in Vercel:

1. Go to: https://vercel.com/dashboard
2. Find your frontend project
3. Go to Settings → Environment Variables
4. Check `VITE_API_URL`

**Should be:** `https://zen-backend-jzjh.onrender.com/api`

If wrong or missing:
1. Add/Update the variable
2. Redeploy the frontend

---

## 🧪 Quick Test Checklist

Run these tests in order:

- [ ] Backend is deployed and live on Render
- [ ] `GEMINI_API_KEY` is set in Render environment
- [ ] Health endpoint returns `OK`
- [ ] Login endpoint returns a token
- [ ] AI chat endpoint returns a response
- [ ] `guest_reviews` table exists in Supabase
- [ ] Frontend `VITE_API_URL` is correct in Vercel

---

## 🎯 Most Common Issues

### 1. **Missing API Key** (90% of cases)
- Symptom: AI endpoints return 500 error
- Fix: Add `GEMINI_API_KEY` to Render

### 2. **Wrong API Key**
- Symptom: "Invalid API key" error
- Fix: Get a new key from Google AI Studio

### 3. **Old Exposed Key**
- Symptom: Key works but you're worried about security
- Fix: Revoke old key, create new one

### 4. **Table Missing**
- Symptom: Sentiment analysis fails
- Fix: Run the SQL script in Supabase

### 5. **Frontend Can't Connect**
- Symptom: Network errors in browser console
- Fix: Check `VITE_API_URL` in Vercel

---

## 📞 Still Not Working?

### Check These:

1. **Render Service Status**
   - Is it actually running?
   - Check the "Events" tab for deployment issues

2. **API Rate Limits**
   - Gemini free tier: 15 requests/minute
   - Wait a minute and try again

3. **CORS Issues**
   - Backend should allow your frontend domain
   - Check `CORS_ORIGIN` in Render environment

4. **Network Issues**
   - Try from a different network
   - Check if Render is having outages

---

## 🔍 Debug Commands

### Check if backend is accessible:
```bash
curl -I https://zen-backend-jzjh.onrender.com
```

### Check AI routes are registered:
```bash
curl https://zen-backend-jzjh.onrender.com/api
```

### Test with verbose output:
```bash
curl -v -X POST https://zen-backend-jzjh.onrender.com/api/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"message":"test"}'
```

---

## ✅ Success Indicators

You'll know it's working when:

1. ✅ Render shows "Live" status
2. ✅ Health endpoint returns `OK`
3. ✅ Login returns a valid token
4. ✅ AI chat returns a helpful response
5. ✅ No errors in Render logs
6. ✅ No errors in browser console

---

## 📚 Related Documentation

- `AI_FEATURES_DOCUMENTATION.md` - Complete API reference
- `AI_SETUP_GUIDE.md` - Initial setup instructions
- Render Docs: https://render.com/docs
- Gemini API Docs: https://ai.google.dev/docs

---

**Last Updated:** May 20, 2026
