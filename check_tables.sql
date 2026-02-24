-- List all tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check counts for category-specific tables
SELECT 'restaurants_businesses' as table_name, COUNT(*) as count FROM restaurants_businesses
UNION ALL
SELECT 'hotels_businesses', COUNT(*) FROM hotels_businesses
UNION ALL
SELECT 'divertissement_businesses', COUNT(*) FROM divertissement_businesses
UNION ALL
SELECT 'retail_businesses', COUNT(*) FROM retail_businesses
UNION ALL
SELECT 'healthcare_businesses', COUNT(*) FROM healthcare_businesses
UNION ALL
SELECT 'technology_businesses', COUNT(*) FROM technology_businesses
UNION ALL
SELECT 'businesses', COUNT(*) FROM businesses
UNION ALL
SELECT 'business_categories', COUNT(*) FROM business_categories;
