-- ============================================================
-- SCHEMA MIGRATION: Convert audit_logs.entity_id to TEXT
-- ============================================================
-- Date: 2026-02-06
-- Purpose: Support both integer and UUID entity IDs in audit logs
-- Risk Level: LOW (backward compatible conversion)
-- ============================================================

-- Step 1: Check current column type (verification only)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'audit_logs' 
AND column_name = 'entity_id';

-- Step 2: Alter the column type (INTEGER → TEXT)
ALTER TABLE audit_logs 
ALTER COLUMN entity_id TYPE TEXT;

-- Step 3: Verify the change was successful
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'audit_logs' 
AND column_name = 'entity_id';

-- Step 4: Show sample data to confirm integrity
SELECT id, action, entity_type, entity_id, created_at 
FROM audit_logs 
ORDER BY created_at DESC 
LIMIT 10;

-- ============================================================
-- SUMMARY OF CHANGES:
-- ============================================================
-- Tables Modified: 1 (audit_logs)
-- Columns Modified: 1 (entity_id: INTEGER → TEXT)
-- Data Loss: NONE (safe conversion)
-- Backward Compatibility: YES (all existing integer IDs preserved)
-- Forward Compatibility: YES (now accepts UUID strings)
-- ============================================================
