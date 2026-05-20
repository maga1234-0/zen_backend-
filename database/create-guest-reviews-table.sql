-- Guest Reviews Table for AI Sentiment Analysis
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

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_guest_reviews_guest ON guest_reviews(guest_id);
CREATE INDEX IF NOT EXISTS idx_guest_reviews_sentiment ON guest_reviews(sentiment);
CREATE INDEX IF NOT EXISTS idx_guest_reviews_created ON guest_reviews(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_guest_reviews_updated_at 
BEFORE UPDATE ON guest_reviews 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();
