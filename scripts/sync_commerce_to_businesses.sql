-- Safe sync: commerce_businesses -> businesses
-- 1) create a timestamped backup table of `businesses`
-- 2) upsert only rows from `commerce_businesses` where `actif = true`
-- 3) only overwrite target columns when source values are present
-- The operation is contained in a transaction; it will CREATE a unique backup table.

-- Create a timestamped backup table
DO $$
DECLARE
  backup_name text := 'businesses_backup_' || to_char(now(), 'YYYYMMDD_HH24MISS');
BEGIN
  EXECUTE format('CREATE TABLE %I AS TABLE businesses', backup_name);
  RAISE NOTICE 'Created backup table: %', backup_name;
END$$;

BEGIN;

WITH upsert AS (
  INSERT INTO businesses (
    id,
    name,
    category_id,
    description,
    location,
    contact_info,
    address,
    phone,
    email,
    rating,
    reviews,
    is_active,
    created_at,
    featured
  )
  SELECT
    cb.id,
    cb.nom,
    COALESCE(
      (SELECT id FROM business_categories bc WHERE lower(bc.slug) = lower(cb.type_commerce) LIMIT 1),
      (SELECT id FROM business_categories bc WHERE cb.categories_produits IS NOT NULL AND bc.slug = ANY(cb.categories_produits) LIMIT 1),
      (SELECT id FROM business_categories bc WHERE bc.name ILIKE cb.type_commerce LIMIT 1),
      (SELECT id FROM business_categories bc WHERE cb.categories_produits IS NOT NULL AND EXISTS (SELECT 1 FROM unnest(cb.categories_produits) AS cat WHERE bc.name ILIKE cat) LIMIT 1),
      (SELECT id FROM business_categories bc LIMIT 1)
    ) AS category_id,
    cb.description,
    cb.localisation,
    jsonb_build_object('address', cb.adresse, 'phone', cb.telephone, 'email', cb.email)::jsonb,
    cb.adresse,
    cb.telephone,
    cb.email,
    CASE WHEN cb.note IS NULL THEN NULL WHEN trim(cb.note::text) ~ '^[0-9]+(\\.[0-9]+)?$' THEN trim(cb.note::text)::numeric ELSE NULL END,
    CASE WHEN cb.avis IS NULL THEN NULL WHEN trim(cb.avis::text) ~ '^[0-9]+$' THEN trim(cb.avis::text)::integer ELSE NULL END,
    cb.actif,
    COALESCE(cb.date_creation, now()),
    cb.en_vedette
  FROM commerce_businesses cb
  WHERE cb.actif = true
  ON CONFLICT (id) DO UPDATE
  SET
    name = COALESCE(EXCLUDED.name, businesses.name),
    category_id = COALESCE(EXCLUDED.category_id, businesses.category_id),
    description = COALESCE(EXCLUDED.description, businesses.description),
    location = COALESCE(EXCLUDED.location, businesses.location),
    contact_info = COALESCE(EXCLUDED.contact_info, businesses.contact_info),
    address = COALESCE(EXCLUDED.address, businesses.address),
    phone = COALESCE(EXCLUDED.phone, businesses.phone),
    email = COALESCE(EXCLUDED.email, businesses.email),
    rating = COALESCE(EXCLUDED.rating, businesses.rating),
    reviews = COALESCE(EXCLUDED.reviews, businesses.reviews),
    is_active = COALESCE(EXCLUDED.is_active, businesses.is_active),
    created_at = COALESCE(EXCLUDED.created_at, businesses.created_at),
    featured = COALESCE(EXCLUDED.featured, businesses.featured)
  RETURNING id
)
SELECT COUNT(*) AS affected_rows FROM upsert;

-- Reporting: how many commerce rows exist and how many now present in businesses
SELECT 'rows_in_commerce' AS source, COUNT(*) FROM commerce_businesses WHERE actif = true;
SELECT 'rows_present_in_businesses' AS target, COUNT(*) FROM businesses WHERE id IN (SELECT id FROM commerce_businesses WHERE actif = true);

COMMIT;

-- To run this file (from shell):
-- PGPASSWORD=versoair2025 psql -U versoair -d versoair_business_intelligence -h localhost -p 5432 -f scripts/sync_commerce_to_businesses.sql
-- The script creates a backup table named businesses_backup_YYYYMMDD_HH24MISS in the same database.
