-- ============================================================================
-- CLEANUP SCRIPT - Remove Test Data Before Production Deployment
-- ============================================================================
-- Copy and paste this entire script into your database client
-- ============================================================================

-- ============================================================================
-- STEP 1: REMOVE TEST FINANCE BUSINESSES (The ones we added for testing)
-- ============================================================================

DELETE FROM businesses 
WHERE category_id = 5 
AND slug IN (
  'global-banking-solutions',
  'forex-exchange-pro',
  'investment-capital-group',
  'microfinance-international',
  'digital-wallet-services',
  'stock-brokerage-plus',
  'insurance-protect-ltd',
  'asset-management-pro',
  'fintech-innovations-inc',
  'crypto-exchange-hub'
);

-- ============================================================================
-- STEP 2: REMOVE INITIAL TEST BUSINESSES
-- ============================================================================

DELETE FROM businesses WHERE id IN (1, 2);

-- ============================================================================
-- STEP 3: VERIFY CLEANUP
-- ============================================================================

-- Check if businesses table is now empty (expected: 0 records)
SELECT 'Businesses' as table_name, COUNT(*) as record_count FROM businesses;

-- ============================================================================
-- STEP 4: VERIFY CATEGORIES (These should be KEPT - 6 categories)
-- ============================================================================

SELECT 'Categories' as table_name, COUNT(*) as record_count FROM business_categories;
SELECT id, name, slug FROM business_categories ORDER BY id;

-- ============================================================================
-- FINAL STATUS SUMMARY
-- ============================================================================

SELECT 'Businesses' as table_name, COUNT(*) as count FROM businesses
UNION ALL
SELECT 'Categories', COUNT(*) FROM business_categories
UNION ALL
SELECT 'Users', COUNT(*) FROM users;
