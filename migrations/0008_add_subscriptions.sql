-- Add subscription-related columns to users table
ALTER TABLE users ADD COLUMN subscriptionTier TEXT DEFAULT 'free';
ALTER TABLE users ADD COLUMN polarCustomerId TEXT;
ALTER TABLE users ADD COLUMN polarSubscriptionId TEXT;
ALTER TABLE users ADD COLUMN subscriptionStatus TEXT DEFAULT 'none';
ALTER TABLE users ADD COLUMN creditsResetAt DATETIME;
ALTER TABLE users ADD COLUMN carryoverCredits INTEGER DEFAULT 0;

-- Update default credits to 100 for free tier
-- Note: Existing users keep their current credits, new users get 100
