-- ============================================
-- SECTOR DATA MIGRATION TO ATTRIBUTES COLUMN
-- Safe migration script for consolidating
-- sector-specific tables into JSONB attributes
-- ============================================

-- Enable transaction with error handling
BEGIN;

-- ============================================
-- 1. BACKUP CHECK: Verify businesses table exists
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'businesses' AND column_name = 'attributes'
    ) THEN
        RAISE EXCEPTION 'ERROR: attributes column does not exist in businesses table. Create it first.';
    END IF;
END $$;

-- ============================================
-- 2. HEALTHCARE MIGRATION
-- ============================================
DO $$
DECLARE
    v_count INTEGER := 0;
    v_migrated INTEGER := 0;
BEGIN
    -- Check if table exists
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'healthcare_businesses') THEN
        
        -- Count records to migrate
        SELECT COUNT(*) INTO v_count FROM healthcare_businesses;
        RAISE NOTICE '🏥 Healthcare: Found % records to migrate', v_count;
        
        -- Migrate healthcare data
        UPDATE businesses b
        SET attributes = COALESCE(attributes, '{}'::jsonb) || jsonb_build_object(
            'sector', 'healthcare',
            'specialty', hb.specialty,
            'insurance_accepted', hb.insurance_accepted,
            'license_number', hb.license_number
        )
        FROM healthcare_businesses hb
        WHERE b.id = hb.business_id
        AND hb.business_id IS NOT NULL;
        
        GET DIAGNOSTICS v_migrated = ROW_COUNT;
        RAISE NOTICE '✅ Successfully migrated % healthcare records', v_migrated;
        
        IF v_migrated <> v_count THEN
            RAISE WARNING '⚠️  WARNING: Only migrated % of % records', v_migrated, v_count;
        END IF;
        
    ELSE
        RAISE NOTICE '⏭️  healthcare_businesses table does not exist - skipping';
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ERROR during healthcare migration: %', SQLERRM;
    ROLLBACK;
    RAISE;
END $$;

-- ============================================
-- 3. AUTOMOBILE MIGRATION
-- ============================================
DO $$
DECLARE
    v_count INTEGER := 0;
    v_migrated INTEGER := 0;
BEGIN
    -- Check if table exists
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'automobile_businesses') THEN
        
        -- Count records to migrate
        SELECT COUNT(*) INTO v_count FROM automobile_businesses;
        RAISE NOTICE '🚗 Automobile: Found % records to migrate', v_count;
        
        -- Migrate automobile data
        UPDATE businesses b
        SET attributes = COALESCE(attributes, '{}'::jsonb) || jsonb_build_object(
            'sector', 'automobile',
            'specialization', ab.specialization,
            'license_number', ab.license_number,
            'certifications', ab.certifications
        )
        FROM automobile_businesses ab
        WHERE b.id = ab.business_id
        AND ab.business_id IS NOT NULL;
        
        GET DIAGNOSTICS v_migrated = ROW_COUNT;
        RAISE NOTICE '✅ Successfully migrated % automobile records', v_migrated;
        
        IF v_migrated <> v_count THEN
            RAISE WARNING '⚠️  WARNING: Only migrated % of % records', v_migrated, v_count;
        END IF;
        
    ELSE
        RAISE NOTICE '⏭️  automobile_businesses table does not exist - skipping';
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ERROR during automobile migration: %', SQLERRM;
    ROLLBACK;
    RAISE;
END $$;

-- ============================================
-- 4. FINANCE MIGRATION (if exists)
-- ============================================
DO $$
DECLARE
    v_count INTEGER := 0;
    v_migrated INTEGER := 0;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'finance_businesses') THEN
        
        SELECT COUNT(*) INTO v_count FROM finance_businesses;
        RAISE NOTICE '💰 Finance: Found % records to migrate', v_count;
        
        UPDATE businesses b
        SET attributes = COALESCE(attributes, '{}'::jsonb) || jsonb_build_object(
            'sector', 'finance',
            'service_type', fb.service_type,
            'license_number', fb.license_number,
            'regulation_body', fb.regulation_body
        )
        FROM finance_businesses fb
        WHERE b.id = fb.business_id
        AND fb.business_id IS NOT NULL;
        
        GET DIAGNOSTICS v_migrated = ROW_COUNT;
        RAISE NOTICE '✅ Successfully migrated % finance records', v_migrated;
        
    ELSE
        RAISE NOTICE '⏭️  finance_businesses table does not exist - skipping';
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ERROR during finance migration: %', SQLERRM;
    ROLLBACK;
    RAISE;
END $$;

-- ============================================
-- 5. RESTAURANTS MIGRATION (if exists)
-- ============================================
DO $$
DECLARE
    v_count INTEGER := 0;
    v_migrated INTEGER := 0;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'restaurants_businesses') THEN
        
        SELECT COUNT(*) INTO v_count FROM restaurants_businesses;
        RAISE NOTICE '🍽️  Restaurants: Found % records to migrate', v_count;
        
        UPDATE businesses b
        SET attributes = COALESCE(attributes, '{}'::jsonb) || jsonb_build_object(
            'sector', 'restaurants',
            'cuisine_type', rb.cuisine_type,
            'seating_capacity', rb.seating_capacity,
            'has_delivery', rb.has_delivery
        )
        FROM restaurants_businesses rb
        WHERE b.id = rb.business_id
        AND rb.business_id IS NOT NULL;
        
        GET DIAGNOSTICS v_migrated = ROW_COUNT;
        RAISE NOTICE '✅ Successfully migrated % restaurant records', v_migrated;
        
    ELSE
        RAISE NOTICE '⏭️  restaurants_businesses table does not exist - skipping';
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ERROR during restaurants migration: %', SQLERRM;
    ROLLBACK;
    RAISE;
END $$;

-- ============================================
-- 6. VERIFICATION REPORT
-- ============================================
DO $$
DECLARE
    v_total_businesses INTEGER;
    v_with_attributes INTEGER;
    v_empty_attributes INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total_businesses FROM businesses;
    SELECT COUNT(*) INTO v_with_attributes FROM businesses 
        WHERE attributes IS NOT NULL 
        AND attributes != '{}'::jsonb;
    SELECT COUNT(*) INTO v_empty_attributes FROM businesses 
        WHERE attributes IS NULL 
        OR attributes = '{}'::jsonb;
    
    RAISE NOTICE '
    ========================================
    📊 MIGRATION VERIFICATION REPORT
    ========================================
    Total Businesses: %
    With Attributes: %
    Without Attributes: %
    ========================================
    ', v_total_businesses, v_with_attributes, v_empty_attributes;
END $$;

COMMIT;

-- ============================================
-- 7. OPTIONAL: VIEW MIGRATED DATA
-- ============================================
-- Uncomment to see examples of migrated data:
-- SELECT id, name, attributes FROM businesses 
-- WHERE attributes IS NOT NULL AND attributes != '{}' 
-- LIMIT 5;

-- ============================================
-- 8. OPTIONAL: DROP OLD TABLES
-- ============================================
-- AFTER VERIFICATION, run this to clean up:
-- 
-- DROP TABLE IF EXISTS healthcare_businesses CASCADE;
-- DROP TABLE IF EXISTS automobile_businesses CASCADE;
-- DROP TABLE IF EXISTS finance_businesses CASCADE;
-- DROP TABLE IF EXISTS restaurants_businesses CASCADE;
--
-- Or use individual statements for each table
