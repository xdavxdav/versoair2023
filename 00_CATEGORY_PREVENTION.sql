-- ============================================================================
-- CATEGORY CONTAMINATION PREVENTION - DATABASE SCHEMA ADDITIONS
-- ============================================================================
-- Purpose: Add constraints, validation functions, and audit logging to prevent
-- cross-category contamination issues in the businesses table
--
-- Execution: Run this as a database migration
-- Risk: LOW - Non-breaking changes with RESTRICT/CASCADE safeguards
-- Rollback: See ROLLBACK section at end
--
-- ============================================================================

-- ============================================================================
-- STEP 1: ADD FOREIGN KEY CONSTRAINT
-- ============================================================================
-- Enforces that every business category_id references a valid category

ALTER TABLE businesses
ADD CONSTRAINT fk_business_category_valid
FOREIGN KEY (category_id)
REFERENCES business_categories(id)
ON DELETE RESTRICT    -- Prevents deleting categories with businesses
ON UPDATE CASCADE;    -- Updates references if category ID changes

-- ============================================================================
-- STEP 2: ADD NOT NULL CONSTRAINT
-- ============================================================================
-- Ensures every business MUST have a category (no orphaned businesses)

ALTER TABLE businesses
ADD CONSTRAINT check_category_not_null
CHECK (category_id IS NOT NULL);

-- ============================================================================
-- STEP 3: CREATE AUDIT LOG TABLE
-- ============================================================================
-- Tracks all category changes for compliance and debugging

CREATE TABLE IF NOT EXISTS business_category_audit (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL,
  business_name VARCHAR(255),
  old_category_id INTEGER,
  new_category_id INTEGER,
  old_category_name VARCHAR(255),
  new_category_name VARCHAR(255),
  changed_by VARCHAR(100) DEFAULT CURRENT_USER,
  change_reason TEXT,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  FOREIGN KEY (old_category_id) REFERENCES business_categories(id) ON DELETE SET NULL,
  FOREIGN KEY (new_category_id) REFERENCES business_categories(id) ON DELETE SET NULL
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_audit_business_id ON business_category_audit(business_id);
CREATE INDEX IF NOT EXISTS idx_audit_changed_at ON business_category_audit(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_category_change ON business_category_audit(old_category_id, new_category_id);

-- ============================================================================
-- STEP 4: CREATE VALIDATION FUNCTION
-- ============================================================================
-- Validates category assignments before insert/update

CREATE OR REPLACE FUNCTION validate_business_category_match()
RETURNS TRIGGER AS $$
DECLARE
  v_category_exists BOOLEAN;
  v_category_active BOOLEAN;
BEGIN
  -- Check if category_id is not null and valid
  IF NEW.category_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM business_categories 
      WHERE id = NEW.category_id
    ) INTO v_category_exists;

    IF NOT v_category_exists THEN
      RAISE EXCEPTION 'Invalid category_id: % does not exist', NEW.category_id;
    END IF;

    -- Check if category is active
    SELECT is_active INTO v_category_active
    FROM business_categories
    WHERE id = NEW.category_id;

    IF v_category_active IS FALSE THEN
      RAISE EXCEPTION 'Category % is inactive', NEW.category_id;
    END IF;
  ELSE
    -- Enforce NOT NULL for category_id (duplicate check for safety)
    RAISE EXCEPTION 'category_id cannot be null';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for validation
DROP TRIGGER IF EXISTS business_category_validation ON businesses;
CREATE TRIGGER business_category_validation
BEFORE INSERT OR UPDATE ON businesses
FOR EACH ROW
EXECUTE FUNCTION validate_business_category_match();

-- ============================================================================
-- STEP 5: CREATE AUDIT LOG FUNCTION & TRIGGER
-- ============================================================================
-- Automatically logs all category changes

CREATE OR REPLACE FUNCTION log_business_category_change()
RETURNS TRIGGER AS $$
DECLARE
  v_old_cat_name VARCHAR;
  v_new_cat_name VARCHAR;
BEGIN
  -- Only log if category actually changed
  IF OLD.category_id IS DISTINCT FROM NEW.category_id THEN
    -- Get old category name
    SELECT name INTO v_old_cat_name
    FROM business_categories
    WHERE id = OLD.category_id;

    -- Get new category name
    SELECT name INTO v_new_cat_name
    FROM business_categories
    WHERE id = NEW.category_id;

    -- Insert audit log
    INSERT INTO business_category_audit 
      (business_id, business_name, old_category_id, new_category_id,
       old_category_name, new_category_name, change_reason)
    VALUES 
      (NEW.id, NEW.name, OLD.category_id, NEW.category_id,
       v_old_cat_name, v_new_cat_name, 'Category update via API');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for audit logging
DROP TRIGGER IF EXISTS log_business_category_update ON businesses;
CREATE TRIGGER log_business_category_update
AFTER UPDATE ON businesses
FOR EACH ROW
EXECUTE FUNCTION log_business_category_change();

-- ============================================================================
-- STEP 6: VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify the changes took effect

-- Verify FOREIGN KEY constraint exists
-- SELECT constraint_name FROM information_schema.table_constraints
-- WHERE table_name = 'businesses' AND constraint_type = 'FOREIGN KEY';

-- Verify NOT NULL check exists
-- SELECT constraint_name FROM information_schema.table_constraints
-- WHERE table_name = 'businesses' AND constraint_type = 'CHECK';

-- Verify audit table created
-- SELECT * FROM business_category_audit LIMIT 1;

-- Verify triggers exist
-- SELECT trigger_name FROM information_schema.triggers
-- WHERE event_object_table = 'businesses' AND event_manipulation IN ('INSERT', 'UPDATE');

-- ============================================================================
-- STEP 7: TEST VALIDATIONS
-- ============================================================================
-- Uncomment to test (will raise exceptions for invalid operations)

-- Test 1: Try to insert with invalid category (should fail)
-- INSERT INTO businesses (name, category_id, description)
-- VALUES ('Test', 99999, 'Test description');
-- Expected: ERROR - Invalid category_id: 99999 does not exist

-- Test 2: Try to update with invalid category (should fail)
-- UPDATE businesses SET category_id = 99999 WHERE id = 1;
-- Expected: ERROR - Invalid category_id: 99999 does not exist

-- Test 3: Valid category assignment (should work)
-- UPDATE businesses SET category_id = 269 WHERE id = 50;
-- Expected: SUCCESS - 1 row updated, audit log created

-- ============================================================================
-- ROLLBACK SECTION
-- ============================================================================
-- If you need to undo these changes, run:
/*
-- Remove triggers
DROP TRIGGER IF EXISTS business_category_validation ON businesses;
DROP TRIGGER IF EXISTS log_business_category_update ON businesses;

-- Remove functions
DROP FUNCTION IF EXISTS validate_business_category_match();
DROP FUNCTION IF EXISTS log_business_category_change();

-- Remove audit table
DROP TABLE IF EXISTS business_category_audit;

-- Remove constraints
ALTER TABLE businesses DROP CONSTRAINT IF EXISTS fk_business_category_valid;
ALTER TABLE businesses DROP CONSTRAINT IF EXISTS check_category_not_null;
*/

-- ============================================================================
-- Post-Migration: Verify Data Integrity
-- ============================================================================
-- Run this query to check for any existing NULL category_ids or invalid references:

SELECT COUNT(*) as null_categories
FROM businesses
WHERE category_id IS NULL;

SELECT COUNT(*) as invalid_categories
FROM businesses b
LEFT JOIN business_categories bc ON b.category_id = bc.id
WHERE b.category_id IS NOT NULL AND bc.id IS NULL;

-- Both should return 0 (zero) for a clean database
-- If not, investigate and fix manually before running this migration

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- All database-level constraints and audit logging now active
-- Application-level validation already deployed in business-validation.ts
