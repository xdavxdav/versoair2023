-- ═══════════════════════════════════════════════════════════
-- SYNC BUSINESSES TO THEIR RESPECTIVE CATEGORY POOLS
-- ═══════════════════════════════════════════════════════════
-- This script ensures all 6 mapped businesses are stored in their
-- correct category-specific tables based on their new category_id

-- STEP 1: Insert Boutique Hotel (ID 2) into hotellerie_businesses
-- Currently missing from its category table
INSERT INTO hotellerie_businesses (id, nom, description, localisation, actif, date_creation)
SELECT b.id, b.name, b.description, b.location, b.is_active, b.created_at
FROM businesses b
WHERE b.id = 2 AND NOT EXISTS (SELECT 1 FROM hotellerie_businesses WHERE id = 2);

-- STEP 2: Insert Retail businesses into retail_businesses
-- Tech Store (ID 3) should be in retail_businesses
INSERT INTO retail_businesses (id, nom, description, localisation, actif, date_creation)
SELECT b.id, b.name, b.description, b.location, b.is_active, b.created_at
FROM businesses b
WHERE b.id = 3 AND NOT EXISTS (SELECT 1 FROM retail_businesses WHERE id = 3);

-- STEP 3: Verify all placements
\echo ''
\echo '════════════════════════════════════════════════════════════'
\echo 'BUSINESSES IN THEIR RESPECTIVE CATEGORY POOLS'
\echo '════════════════════════════════════════════════════════════'

\echo ''
\echo '[Food & Beverage Pool - Restaurants]'
SELECT id, nom as business_name FROM restaurants_businesses WHERE id IN (1,2,3,11) ORDER BY id;

\echo ''
\echo '[Tourism & Leisure Pool - Hotellerie]'
SELECT id, nom as business_name FROM hotellerie_businesses WHERE id = 2;

\echo ''
\echo '[Commerce Pool - Retail]'
SELECT id, nom as business_name FROM retail_businesses WHERE id = 3;

\echo ''
\echo '[IT & Internet Pool - Technology]'
SELECT id, nom as business_name FROM technology_businesses WHERE id = 4;

\echo ''
\echo '[Health Pool - Healthcare]'
SELECT id, nom as business_name FROM healthcare_businesses WHERE id = 5;

\echo ''
\echo '════════════════════════════════════════════════════════════'
\echo 'COMPLETE POOL DISTRIBUTION'
\echo '════════════════════════════════════════════════════════════'

SELECT 'restaurants_businesses (Food & Beverage)' as pool, COUNT(*) as business_count FROM restaurants_businesses
UNION ALL
SELECT 'hotellerie_businesses (Tourism & Leisure)', COUNT(*) FROM hotellerie_businesses
UNION ALL
SELECT 'retail_businesses (Commerce)', COUNT(*) FROM retail_businesses
UNION ALL
SELECT 'technology_businesses (IT & Internet)', COUNT(*) FROM technology_businesses
UNION ALL
SELECT 'healthcare_businesses (Health)', COUNT(*) FROM healthcare_businesses
UNION ALL
SELECT 'commerce_businesses (Commerce)', COUNT(*) FROM commerce_businesses
UNION ALL
SELECT 'automobile_businesses (Automotive)', COUNT(*) FROM automobile_businesses;
