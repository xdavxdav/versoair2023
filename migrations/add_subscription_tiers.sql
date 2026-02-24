-- 🛸 Business Growth Engine: Subscription Tier Migration
-- Adds trial management fields and updates tier values
-- Run with: psql $DATABASE_URL -f migrations/add_subscription_tiers.sql

-- ============================================================================
-- 1. Update existing subscription_tier values from old naming to new
-- ============================================================================
UPDATE users SET subscription_tier = 'free' WHERE subscription_tier IS NULL;
UPDATE users SET subscription_tier = 'verified' WHERE subscription_tier = 'pro';

-- ============================================================================
-- 2. Add trial management columns (idempotent — safe to re-run)
-- ============================================================================
DO $$
BEGIN
  -- trial_tier: The tier being trialed
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'trial_tier'
  ) THEN
    ALTER TABLE users ADD COLUMN trial_tier VARCHAR;
  END IF;

  -- trial_started_at: When the trial began
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'trial_started_at'
  ) THEN
    ALTER TABLE users ADD COLUMN trial_started_at TIMESTAMP;
  END IF;

  -- trial_expires_at: When the trial ends
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'trial_expires_at'
  ) THEN
    ALTER TABLE users ADD COLUMN trial_expires_at TIMESTAMP;
  END IF;
END $$;

-- ============================================================================
-- 3. Add CHECK constraint for valid tier values
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_subscription_tier'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT valid_subscription_tier
      CHECK (subscription_tier IN ('free', 'essential', 'verified', 'max', 'enterprise'));
  END IF;
END $$;

-- ============================================================================
-- 4. Create index for tier-based queries
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON users(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_users_trial_expires ON users(trial_expires_at) WHERE trial_expires_at IS NOT NULL;

-- ============================================================================
-- 5. Verify migration
-- ============================================================================
SELECT
  subscription_tier,
  COUNT(*) as user_count
FROM users
GROUP BY subscription_tier
ORDER BY
  CASE subscription_tier
    WHEN 'enterprise' THEN 1
    WHEN 'max' THEN 2
    WHEN 'verified' THEN 3
    WHEN 'essential' THEN 4
    WHEN 'free' THEN 5
    ELSE 6
  END;
