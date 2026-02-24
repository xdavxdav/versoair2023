-- ════════════════════════════════════════════════════════════════════════
-- VERIFY ALL BUSINESS POOLS ARE POPULATED CORRECTLY
-- ════════════════════════════════════════════════════════════════════════

\echo '════════════════════════════════════════════════════════════════════════'
\echo 'POOL POPULATION VERIFICATION REPORT'
\echo '════════════════════════════════════════════════════════════════════════'

-- Restaurants & Food & Beverage (Category 258)
\echo ''
\echo '[1/7] Restaurants Pool (Food & Beverage - Category 258)'
SELECT 
  id,
  nom,
  date_creation,
  actif
FROM restaurants_businesses
WHERE actif = true
ORDER BY id;

-- Hotellerie & Tourism & Leisure (Category 242)
\echo ''
\echo '[2/7] Hotellerie Pool (Tourism & Leisure - Category 242)'
SELECT 
  id,
  nom,
  date_creation,
  actif
FROM hotellerie_businesses
WHERE actif = true
ORDER BY id;

-- Technology & IT & Internet (Category 227)
\echo ''
\echo '[3/7] Technology Pool (IT & Internet - Category 227)'
SELECT 
  id,
  nom,
  date_creation,
  actif
FROM technology_businesses
WHERE actif = true
ORDER BY id;

-- Healthcare & Health (Category 246)
\echo ''
\echo '[4/7] Healthcare Pool (Health - Category 246)'
SELECT 
  id,
  nom,
  date_creation,
  actif
FROM healthcare_businesses
WHERE actif = true
ORDER BY id;

-- Retail & Commerce (Category 218)
\echo ''
\echo '[5/7] Retail Pool (Commerce - Category 218)'
SELECT 
  id,
  nom,
  date_creation,
  actif
FROM retail_businesses
WHERE actif = true
ORDER BY id;

-- Commerce & Commerce (Category 290)
\echo ''
\echo '[6/7] Commerce Pool (Commerce - Category 290)'
SELECT 
  id,
  nom,
  date_creation,
  actif
FROM commerce_businesses
WHERE actif = true
ORDER BY id;

-- Automobile & Automotive (Category 343)
\echo ''
\echo '[7/7] Automobile Pool (Automotive - Category 343)'
SELECT 
  id,
  nom,
  date_creation,
  actif
FROM automobile_businesses
WHERE actif = true
ORDER BY id;

-- Distribution Summary
\echo ''
\echo '════════════════════════════════════════════════════════════════════════'
\echo 'DISTRIBUTION SUMMARY'
\echo '════════════════════════════════════════════════════════════════════════'

SELECT 
  'restaurants_businesses (Food & Beverage)' as pool,
  COUNT(*) as active_count
FROM restaurants_businesses
WHERE actif = true
UNION ALL
SELECT 
  'hotellerie_businesses (Tourism & Leisure)',
  COUNT(*)
FROM hotellerie_businesses
WHERE actif = true
UNION ALL
SELECT 
  'technology_businesses (IT & Internet)',
  COUNT(*)
FROM technology_businesses
WHERE actif = true
UNION ALL
SELECT 
  'healthcare_businesses (Health)',
  COUNT(*)
FROM healthcare_businesses
WHERE actif = true
UNION ALL
SELECT 
  'retail_businesses (Commerce)',
  COUNT(*)
FROM retail_businesses
WHERE actif = true
UNION ALL
SELECT 
  'commerce_businesses (Commerce)',
  COUNT(*)
FROM commerce_businesses
WHERE actif = true
UNION ALL
SELECT 
  'automobile_businesses (Automotive)',
  COUNT(*)
FROM automobile_businesses
WHERE actif = true
ORDER BY active_count DESC;

-- Verify the 6 target businesses are in correct pools
\echo ''
\echo '════════════════════════════════════════════════════════════════════════'
\echo 'TARGET BUSINESSES VERIFICATION'
\echo '════════════════════════════════════════════════════════════════════════'

SELECT
  b.id,
  b.name,
  b.category_id,
  bc.name as category_name,
  CASE
    WHEN b.id IN (SELECT id FROM restaurants_businesses) THEN '✓ restaurants_businesses'
    WHEN b.id IN (SELECT id FROM hotellerie_businesses) THEN '✓ hotellerie_businesses'
    WHEN b.id IN (SELECT id FROM technology_businesses) THEN '✓ technology_businesses'
    WHEN b.id IN (SELECT id FROM healthcare_businesses) THEN '✓ healthcare_businesses'
    WHEN b.id IN (SELECT id FROM retail_businesses) THEN '✓ retail_businesses'
    WHEN b.id IN (SELECT id FROM commerce_businesses) THEN '✓ commerce_businesses'
    WHEN b.id IN (SELECT id FROM automobile_businesses) THEN '✓ automobile_businesses'
    ELSE '✗ NOT IN ANY POOL'
  END as pool_location
FROM businesses b
LEFT JOIN business_categories bc ON b.category_id = bc.id
WHERE b.is_active = true
ORDER BY b.id;

\echo ''
\echo '════════════════════════════════════════════════════════════════════════'
\echo 'VERIFICATION COMPLETE'
\echo '════════════════════════════════════════════════════════════════════════'
