-- ============================================================
-- MAP EXISTING BUSINESSES TO NEW CATEGORY TAXONOMY
-- ============================================================

-- REFERENCE:
-- restaurants_businesses (4) → Restaurants (ID: 1)
-- hotellerie_businesses (2) → Hotels (ID: 2)
-- hotels_businesses (0) → Hotels (ID: 2)
-- commerce_businesses (3) → Commerce subcategories
-- technology_businesses (1) → Software Development (ID: 47)
-- healthcare_businesses (1) → Hospitals & Clinics (ID: 66)
-- retail_businesses (0) → Retail (ID: 3)
-- automobile_businesses (0) → Automotive subcategories
-- divertissement_businesses (0) → Sport/Entertainment
-- finance_businesses (0) → Finance subcategories
-- batiment_businesses (0) → Building & Construction

-- ============================================================
-- 1. RESTAURANTS - Update 4 records from restaurants_businesses
-- ============================================================
UPDATE businesses 
SET category_id = 1
WHERE id IN (
  SELECT DISTINCT b.id FROM businesses b
  INNER JOIN restaurants_businesses rb ON b.id = rb.id OR b.name = rb.name
);

-- ============================================================
-- 2. HOTELS - Update 2 records from hotellerie_businesses
-- ============================================================
UPDATE businesses 
SET category_id = 2
WHERE id IN (
  SELECT DISTINCT b.id FROM businesses b
  INNER JOIN hotellerie_businesses hb ON b.id = hb.id OR b.name = hb.name
);

-- ============================================================
-- 3. TECHNOLOGY/SOFTWARE - Update from technology_businesses
-- ============================================================
UPDATE businesses 
SET category_id = 47
WHERE id IN (
  SELECT DISTINCT b.id FROM businesses b
  INNER JOIN technology_businesses tb ON b.id = tb.id OR b.name = tb.name
);

-- ============================================================
-- 4. HEALTH/HOSPITALS - Update from healthcare_businesses
-- ============================================================
UPDATE businesses 
SET category_id = 66
WHERE id IN (
  SELECT DISTINCT b.id FROM businesses b
  INNER JOIN healthcare_businesses hb ON b.id = hb.id OR b.name = hb.name
);

-- ============================================================
-- 5. COMMERCE - Update 3 records from commerce_businesses
-- (Use Supermarkets & Grocery Stores ID: 32 as default commerce subcategory)
-- ============================================================
UPDATE businesses 
SET category_id = 32
WHERE id IN (
  SELECT DISTINCT b.id FROM businesses b
  INNER JOIN commerce_businesses cb ON b.id = cb.id OR b.name = cb.name
);

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================
-- Check mapping results
SELECT 'Before cleanup' as status, category_id, COUNT(*) as count 
FROM businesses 
GROUP BY category_id
ORDER BY category_id;

-- View category names for mapped businesses
SELECT b.id, b.name as business_name, b.category_id, bc.name as category_name
FROM businesses b
LEFT JOIN business_categories bc ON b.category_id = bc.id
ORDER BY b.id;
