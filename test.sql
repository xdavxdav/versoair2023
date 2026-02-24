# Just paste this entire block into terminal
PGPASSWORD=versoair2025 psql -U versoair -d versoair_business_intelligence -h localhost -p 5432 << 'EOF'

-- Quick test
SELECT '=== DATABASE STATUS ===' as title;

-- What tables do we have?
SELECT '1. Specialized tables:' as question;
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE '%_businesses'
ORDER BY tablename;

-- What's in commerce?
SELECT '2. Commerce businesses:' as question;
SELECT id, nom, localisation 
FROM commerce_businesses 
WHERE actif = true
LIMIT 5;

-- What's in hotellerie?
SELECT '3. Hotellerie businesses:' as question;
SELECT id, nom, localisation 
FROM hotellerie_businesses 
WHERE actif = true
LIMIT 5;

-- Check Verso Air
SELECT '4. Verso Air status:' as question;
SELECT nom, type_commerce, localisation 
FROM commerce_businesses 
WHERE nom ILIKE '%verso%' OR nom ILIKE '%air%';

EOF