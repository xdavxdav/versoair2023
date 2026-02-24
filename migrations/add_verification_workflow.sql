-- ============================================================================
-- VERIFICATION WORKFLOW MIGRATION
-- Implements both Option A (Constraint-based) and Option B (State-based)
-- ============================================================================

-- Option B: Add three-state verification status field + audit trail
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) DEFAULT 'unverified' 
  CHECK (verification_status IN ('unverified', 'verified', 'rejected'));

ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS verification_reason TEXT;

ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS verification_date TIMESTAMP;

ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS verified_by INTEGER REFERENCES users(id);

-- Option A: Constraint - Business can only be active if verified
-- "is_active can only be TRUE if verification_status is 'verified'"
ALTER TABLE businesses 
ADD CONSTRAINT check_verified_before_active 
CHECK (
  is_active = false 
  OR (is_active = true AND verification_status = 'verified')
);

-- Index for verification lookups
CREATE INDEX IF NOT EXISTS idx_verification_status ON businesses(verification_status);
CREATE INDEX IF NOT EXISTS idx_verified_by ON businesses(verified_by);
CREATE INDEX IF NOT EXISTS idx_verification_date ON businesses(verification_date);

-- Sync legacy is_verified field to new verification_status
UPDATE businesses 
SET verification_status = CASE 
  WHEN is_verified = true THEN 'verified'
  ELSE 'unverified'
END,
verification_date = CASE 
  WHEN is_verified = true THEN NOW()
  ELSE NULL
END
WHERE verification_status = 'unverified';

COMMIT;
