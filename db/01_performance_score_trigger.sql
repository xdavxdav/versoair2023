-- ============================================
-- PERFORMANCE SCORE AUTO-UPDATE TRIGGER
-- Automatically calculates business performance
-- ============================================

-- Create the trigger function
CREATE OR REPLACE FUNCTION update_performance_score()
RETURNS TRIGGER AS $$
DECLARE
    v_review_score DECIMAL := 0.0;
    v_ad_bonus DECIMAL := 0.0;
    v_verified_bonus DECIMAL := 0.0;
BEGIN
    -- 1. Review Score: Count * 0.5 per review
    SELECT COALESCE(COUNT(*) * 0.5, 0.0) INTO v_review_score
    FROM business_reviews
    WHERE business_id = NEW.id
    AND is_verified = true;

    -- 2. Advertiser Bonus: +10 points if active advertiser
    v_ad_bonus := CASE 
        WHEN NEW.is_advertiser THEN 10.0 
        ELSE 0.0 
    END;

    -- 3. Verification Bonus: +5 points if verified
    v_verified_bonus := CASE 
        WHEN NEW.is_verified THEN 5.0 
        ELSE 0.0 
    END;

    -- Calculate final score (cap at 100)
    NEW.performance_score := LEAST(
        ROUND(v_review_score + v_ad_bonus + v_verified_bonus, 2),
        100.0
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trg_performance_update ON businesses;

-- Create the trigger
CREATE TRIGGER trg_performance_update
BEFORE INSERT OR UPDATE ON businesses
FOR EACH ROW
EXECUTE FUNCTION update_performance_score();

-- Create separate trigger for review inserts (updates parent business score)
CREATE OR REPLACE FUNCTION update_business_score_on_review()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE businesses
    SET updated_at = NOW()
    WHERE id = NEW.business_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_business_review_update ON business_reviews;

CREATE TRIGGER trg_business_review_update
AFTER INSERT OR UPDATE ON business_reviews
FOR EACH ROW
EXECUTE FUNCTION update_business_score_on_review();

-- Create index for performance ranking queries
CREATE INDEX IF NOT EXISTS idx_perf_advertiser 
ON businesses(performance_score DESC, is_advertiser DESC)
WHERE is_advertiser = true AND deleted_at IS NULL;

-- Create index for search optimization
CREATE INDEX IF NOT EXISTS idx_business_search
ON businesses(search_vector)
WHERE deleted_at IS NULL;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- SELECT 
--   id, name, 
--   performance_score, 
--   is_advertiser, 
--   is_verified,
--   (SELECT COUNT(*) FROM business_reviews WHERE business_id = businesses.id) as review_count
-- FROM businesses 
-- ORDER BY performance_score DESC 
-- LIMIT 10;
