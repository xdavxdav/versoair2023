-- STEP 1: BACKUP EXISTING DATA (KEEP IMPORTANT DATA)
-- Data migration from industry-specific tables to unified businesses table

-- First, we'll consolidate all business type data into the main businesses table
-- Add new column to businesses if not exists
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS business_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS migrated_from_table VARCHAR(100);

-- Migrate automobile businesses
INSERT INTO businesses 
SELECT 
  id, name, description, phone, email, website, address, city_id, region_id, country_id, 
  latitude, longitude, rating, reviews_count, is_verified, is_premium, 
  created_at, updated_at,
  'automobile' as business_type,
  'automobile_businesses' as migrated_from_table
FROM automobile_businesses
WHERE id NOT IN (SELECT id FROM businesses);

-- Migrate finance businesses
INSERT INTO businesses 
SELECT 
  id, name, description, phone, email, website, address, city_id, region_id, country_id, 
  latitude, longitude, rating, reviews_count, is_verified, is_premium, 
  created_at, updated_at,
  'finance' as business_type,
  'finance_businesses' as migrated_from_table
FROM finance_businesses
WHERE id NOT IN (SELECT id FROM businesses);

-- Migrate healthcare businesses
INSERT INTO businesses 
SELECT 
  id, name, description, phone, email, website, address, city_id, region_id, country_id, 
  latitude, longitude, rating, reviews_count, is_verified, is_premium, 
  created_at, updated_at,
  'healthcare' as business_type,
  'healthcare_businesses' as migrated_from_table
FROM healthcare_businesses
WHERE id NOT IN (SELECT id FROM businesses);

-- Migrate restaurant businesses
INSERT INTO businesses 
SELECT 
  id, name, description, phone, email, website, address, city_id, region_id, country_id, 
  latitude, longitude, rating, reviews_count, is_verified, is_premium, 
  created_at, updated_at,
  'restaurant' as business_type,
  'restaurants_businesses' as migrated_from_table
FROM restaurants_businesses
WHERE id NOT IN (SELECT id FROM businesses);

-- Migrate retail businesses
INSERT INTO businesses 
SELECT 
  id, name, description, phone, email, website, address, city_id, region_id, country_id, 
  latitude, longitude, rating, reviews_count, is_verified, is_premium, 
  created_at, updated_at,
  'retail' as business_type,
  'retail_businesses' as migrated_from_table
FROM retail_businesses
WHERE id NOT IN (SELECT id FROM businesses);

-- Migrate technology businesses
INSERT INTO businesses 
SELECT 
  id, name, description, phone, email, website, address, city_id, region_id, country_id, 
  latitude, longitude, rating, reviews_count, is_verified, is_premium, 
  created_at, updated_at,
  'technology' as business_type,
  'technology_businesses' as migrated_from_table
FROM technology_businesses
WHERE id NOT IN (SELECT id FROM businesses);

-- Migrate hotel businesses (consolidate both hotels_businesses and hotellerie_businesses)
INSERT INTO businesses 
SELECT 
  id, name, description, phone, email, website, address, city_id, region_id, country_id, 
  latitude, longitude, rating, reviews_count, is_verified, is_premium, 
  created_at, updated_at,
  'hotel' as business_type,
  'hotels_businesses' as migrated_from_table
FROM hotels_businesses
WHERE id NOT IN (SELECT id FROM businesses);

-- Migrate commerce businesses
INSERT INTO businesses 
SELECT 
  id, name, description, phone, email, website, address, city_id, region_id, country_id, 
  latitude, longitude, rating, reviews_count, is_verified, is_premium, 
  created_at, updated_at,
  'commerce' as business_type,
  'commerce_businesses' as migrated_from_table
FROM commerce_businesses
WHERE id NOT IN (SELECT id FROM businesses);

-- Migrate entertainment businesses
INSERT INTO businesses 
SELECT 
  id, name, description, phone, email, website, address, city_id, region_id, country_id, 
  latitude, longitude, rating, reviews_count, is_verified, is_premium, 
  created_at, updated_at,
  'divertissement' as business_type,
  'divertissement_businesses' as migrated_from_table
FROM divertissement_businesses
WHERE id NOT IN (SELECT id FROM businesses);

-- Migrate construction/building businesses
INSERT INTO businesses 
SELECT 
  id, name, description, phone, email, website, address, city_id, region_id, country_id, 
  latitude, longitude, rating, reviews_count, is_verified, is_premium, 
  created_at, updated_at,
  'construction' as business_type,
  'batiment_businesses' as migrated_from_table
FROM batiment_businesses
WHERE id NOT IN (SELECT id FROM businesses);

-- STEP 2: CONSOLIDATE CATEGORIES (Merge all category types into unified table)
-- First, ensure categories table has proper structure
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS category_type VARCHAR(50) DEFAULT 'business',
ADD COLUMN IF NOT EXISTS parent_id BIGINT,
ADD COLUMN IF NOT EXISTS level INT DEFAULT 1;

-- Migrate business categories
INSERT INTO categories (name, description, category_type)
SELECT DISTINCT name, description, 'business' FROM business_categories
WHERE name NOT IN (SELECT name FROM categories WHERE category_type = 'business');

-- Migrate commerce categories
INSERT INTO categories (name, description, category_type)
SELECT DISTINCT name, description, 'business' FROM commerce_categories
WHERE name NOT IN (SELECT name FROM categories WHERE category_type = 'business');

-- Migrate page categories
INSERT INTO categories (name, description, category_type)
SELECT DISTINCT name, description, 'page' FROM page_categories
WHERE name NOT IN (SELECT name FROM categories WHERE category_type = 'page');

-- Migrate content categories
INSERT INTO categories (name, description, category_type)
SELECT DISTINCT name, description, 'content' FROM content_categories
WHERE name NOT IN (SELECT name FROM categories WHERE category_type = 'content');

-- STEP 3: VERIFY DATA MIGRATION
-- Check records before deletion
-- SELECT COUNT(*) FROM businesses WHERE business_type IS NOT NULL;
-- SELECT COUNT(*) FROM categories WHERE category_type IN ('business', 'page', 'content');

-- STEP 4: DROP REDUNDANT TABLES (After verifying data is migrated)
-- Uncomment when you're confident data is properly migrated

-- DROP TABLE IF EXISTS automobile_businesses CASCADE;
-- DROP TABLE IF EXISTS finance_businesses CASCADE;
-- DROP TABLE IF EXISTS commerce_businesses CASCADE;
-- DROP TABLE IF EXISTS healthcare_businesses CASCADE;
-- DROP TABLE IF EXISTS hotels_businesses CASCADE;
-- DROP TABLE IF EXISTS hotellerie_businesses CASCADE;
-- DROP TABLE IF EXISTS restaurants_businesses CASCADE;
-- DROP TABLE IF EXISTS retail_businesses CASCADE;
-- DROP TABLE IF EXISTS technology_businesses CASCADE;
-- DROP TABLE IF EXISTS divertissement_businesses CASCADE;
-- DROP TABLE IF EXISTS batiment_businesses CASCADE;
-- DROP TABLE IF EXISTS business_categories CASCADE;
-- DROP TABLE IF EXISTS commerce_categories CASCADE;
-- DROP TABLE IF EXISTS page_categories CASCADE;
-- DROP TABLE IF EXISTS content_categories CASCADE;

-- STEP 5: CLEAN UP BACKUPS
-- DROP TABLE IF EXISTS businesses_backup_20260107_152044;
-- DROP TABLE IF EXISTS businesses_backup_20260107_152120;
-- DROP TABLE IF EXISTS businesses_backup_20260107_152133;
-- DROP TABLE IF EXISTS businesses_backup_20260107_152201;
-- DROP TABLE IF EXISTS businesses_backup_20260107_152423;
-- DROP TABLE IF EXISTS businesses_backup_20260107_152442;
-- DROP TABLE IF EXISTS backup_businesses;
-- DROP TABLE IF EXISTS backup_jobs;

-- STEP 6: VERIFY SCHEMA AFTER CLEANUP
-- Your database will now have a normalized structure:
-- Main entities: users, businesses, categories, jobs, content_pages, reservations
-- Supporting: locations (countries, regions, cities)
-- Relations: business_categories, business_hours, business_services, business_media, business_reviews, business_attributes, user_favorites, saved_jobs
-- Operations: transactions, billing_history, notifications, search_logs, analytics, data_audit_trail
-- Marketing: ad_campaigns, ad_creatives, ad_audiences, ad_performance
-- Music (optional): music_artists, music_tracks, music_analytics
