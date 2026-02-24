-- db/preview_migration.sql
-- Preview migration that ensures target tables exist and migrates rows from
-- specialized tables into the unified `businesses` and `categories` tables,
-- only if the source tables exist. This file is safe to inspect and run.

BEGIN;

-- 1) Ensure `businesses` exists with expected columns
CREATE TABLE IF NOT EXISTS businesses (
  id BIGINT PRIMARY KEY,
  name TEXT,
  description TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  address TEXT,
  city_id BIGINT,
  region_id BIGINT,
  country_id BIGINT,
  latitude NUMERIC,
  longitude NUMERIC,
  rating NUMERIC,
  reviews_count INTEGER,
  is_verified BOOLEAN DEFAULT FALSE,
  is_premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  business_type VARCHAR(100),
  migrated_from_table VARCHAR(100)
);

-- Ensure common columns exist on pre-existing `businesses` table (safe ALTERs)
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS city_id BIGINT,
  ADD COLUMN IF NOT EXISTS region_id BIGINT,
  ADD COLUMN IF NOT EXISTS country_id BIGINT,
  ADD COLUMN IF NOT EXISTS latitude NUMERIC,
  ADD COLUMN IF NOT EXISTS longitude NUMERIC,
  ADD COLUMN IF NOT EXISTS rating NUMERIC,
  ADD COLUMN IF NOT EXISTS reviews_count INTEGER,
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS business_type VARCHAR(100),
  ADD COLUMN IF NOT EXISTS migrated_from_table VARCHAR(100);

-- 2) Ensure `categories` exists with expected columns
CREATE TABLE IF NOT EXISTS categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT UNIQUE,
  description TEXT,
  category_type VARCHAR(50) DEFAULT 'business',
  parent_id BIGINT,
  level INT DEFAULT 1
);

-- Helper: function to safely insert from source table when it exists
-- For each source table we guard the INSERT with a check for its existence.

-- Automobile
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'automobile_businesses') THEN
    INSERT INTO businesses (id, name, description, phone, email, website, address, city_id, region_id, country_id, latitude, longitude, rating, reviews_count, is_verified, is_premium, created_at, updated_at, business_type, migrated_from_table)
    SELECT
      src.id,
      src.nom,
      src.description,
      src.telephone,
      src.email,
      NULL,
      src.adresse,
      NULL,
      NULL,
      NULL,
      NULL,
      NULL,
      NULL,
      NULL,
      COALESCE(src.actif, FALSE),
      COALESCE(src.en_vedette, FALSE),
      COALESCE(src.date_creation, now()),
      now(),
      'automobile'::varchar,
      'automobile_businesses'::varchar
    FROM automobile_businesses src
    WHERE NOT EXISTS (SELECT 1 FROM businesses b WHERE b.id = src.id);
  END IF;
END$$;

-- Finance
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'finance_businesses') THEN
    INSERT INTO businesses (id, name, description, phone, email, website, address, city_id, region_id, country_id, latitude, longitude, rating, reviews_count, is_verified, is_premium, created_at, updated_at, business_type, migrated_from_table)
    SELECT
      src.id,
      src.nom,
      src.description,
      src.telephone,
      src.email,
      NULL,
      src.adresse,
      NULL,NULL,NULL,NULL,NULL,NULL,NULL,
      COALESCE(src.actif, FALSE),
      COALESCE(src.en_vedette, FALSE),
      COALESCE(src.date_creation, now()),
      now(),
      'finance'::varchar,
      'finance_businesses'::varchar
    FROM finance_businesses src
    WHERE NOT EXISTS (SELECT 1 FROM businesses b WHERE b.id = src.id);
  END IF;
END$$;

-- Healthcare
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'healthcare_businesses') THEN
    INSERT INTO businesses (id, name, description, phone, email, website, address, city_id, region_id, country_id, latitude, longitude, rating, reviews_count, is_verified, is_premium, created_at, updated_at, business_type, migrated_from_table)
    SELECT
      src.id,
      src.nom,
      src.description,
      src.telephone,
      src.email,
      NULL,
      src.adresse,
      NULL,NULL,NULL,NULL,NULL,NULL,NULL,
      COALESCE(src.actif, FALSE),
      COALESCE(src.en_vedette, FALSE),
      COALESCE(src.date_creation, now()),
      now(),
      'healthcare'::varchar,
      'healthcare_businesses'::varchar
    FROM healthcare_businesses src
    WHERE NOT EXISTS (SELECT 1 FROM businesses b WHERE b.id = src.id);
  END IF;
END$$;

-- Restaurants (restaurants_businesses)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'restaurants_businesses') THEN
    INSERT INTO businesses (id, name, description, phone, email, website, address, city_id, region_id, country_id, latitude, longitude, rating, reviews_count, is_verified, is_premium, created_at, updated_at, business_type, migrated_from_table)
    SELECT
      src.id,
      src.nom,
      src.description,
      src.telephone,
      src.email,
      NULL,
      src.adresse,
      NULL,NULL,NULL,NULL,NULL,NULL,NULL,
      COALESCE(src.actif, FALSE),
      COALESCE(src.en_vedette, FALSE),
      COALESCE(src.date_creation, now()),
      now(),
      'restaurant'::varchar,
      'restaurants_businesses'::varchar
    FROM restaurants_businesses src
    WHERE NOT EXISTS (SELECT 1 FROM businesses b WHERE b.id = src.id);
  END IF;
END$$;

-- Retail
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'retail_businesses') THEN
    INSERT INTO businesses (id, name, description, phone, email, website, address, city_id, region_id, country_id, latitude, longitude, rating, reviews_count, is_verified, is_premium, created_at, updated_at, business_type, migrated_from_table)
    SELECT
      src.id,
      src.nom,
      src.description,
      src.telephone,
      src.email,
      NULL,
      src.adresse,
      NULL,NULL,NULL,NULL,NULL,NULL,NULL,
      COALESCE(src.actif, FALSE),
      COALESCE(src.en_vedette, FALSE),
      COALESCE(src.date_creation, now()),
      now(),
      'retail'::varchar,
      'retail_businesses'::varchar
    FROM retail_businesses src
    WHERE NOT EXISTS (SELECT 1 FROM businesses b WHERE b.id = src.id);
  END IF;
END$$;

-- Technology
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'technology_businesses') THEN
    INSERT INTO businesses (id, name, description, phone, email, website, address, city_id, region_id, country_id, latitude, longitude, rating, reviews_count, is_verified, is_premium, created_at, updated_at, business_type, migrated_from_table)
    SELECT
      src.id,
      src.nom,
      src.description,
      src.telephone,
      src.email,
      NULL,
      src.adresse,
      NULL,NULL,NULL,NULL,NULL,NULL,NULL,
      COALESCE(src.actif, FALSE),
      COALESCE(src.en_vedette, FALSE),
      COALESCE(src.date_creation, now()),
      now(),
      'technology'::varchar,
      'technology_businesses'::varchar
    FROM technology_businesses src
    WHERE NOT EXISTS (SELECT 1 FROM businesses b WHERE b.id = src.id);
  END IF;
END$$;

-- Hotels (merge hotels_businesses and hotellerie_businesses)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'hotels_businesses') THEN
    INSERT INTO businesses (id, name, description, phone, email, website, address, city_id, region_id, country_id, latitude, longitude, rating, reviews_count, is_verified, is_premium, created_at, updated_at, business_type, migrated_from_table)
    SELECT
      src.id,
      src.nom,
      src.description,
      src.telephone,
      src.email,
      NULL,
      src.adresse,
      NULL,NULL,NULL,NULL,NULL,NULL,NULL,
      COALESCE(src.actif, FALSE),
      COALESCE(src.en_vedette, FALSE),
      COALESCE(src.date_creation, now()),
      now(),
      'hotel'::varchar,
      'hotels_businesses'::varchar
    FROM hotels_businesses src
    WHERE NOT EXISTS (SELECT 1 FROM businesses b WHERE b.id = src.id);
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'hotellerie_businesses') THEN
    INSERT INTO businesses (id, name, description, phone, email, website, address, city_id, region_id, country_id, latitude, longitude, rating, reviews_count, is_verified, is_premium, created_at, updated_at, business_type, migrated_from_table)
    SELECT
      src.id,
      src.nom,
      src.description,
      src.telephone,
      src.email,
      NULL,
      src.adresse,
      NULL,NULL,NULL,NULL,NULL,NULL,NULL,
      COALESCE(src.actif, FALSE),
      COALESCE(src.en_vedette, FALSE),
      COALESCE(src.date_creation, now()),
      now(),
      'hotel'::varchar,
      'hotellerie_businesses'::varchar
    FROM hotellerie_businesses src
    WHERE NOT EXISTS (SELECT 1 FROM businesses b WHERE b.id = src.id);
  END IF;
END$$;

-- Commerce
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'commerce_businesses') THEN
    INSERT INTO businesses (id, name, description, phone, email, website, address, city_id, region_id, country_id, latitude, longitude, rating, reviews_count, is_verified, is_premium, created_at, updated_at, business_type, migrated_from_table)
    SELECT
      src.id,
      src.nom,
      src.description,
      src.telephone,
      src.email,
      NULL,
      src.adresse,
      NULL,NULL,NULL,NULL,NULL,NULL,NULL,
      COALESCE(src.actif, FALSE),
      COALESCE(src.en_vedette, FALSE),
      COALESCE(src.date_creation, now()),
      now(),
      'commerce'::varchar,
      'commerce_businesses'::varchar
    FROM commerce_businesses src
    WHERE NOT EXISTS (SELECT 1 FROM businesses b WHERE b.id = src.id);
  END IF;
END$$;

-- Entertainment / divertissement
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'divertissement_businesses') THEN
    INSERT INTO businesses (id, name, description, phone, email, website, address, city_id, region_id, country_id, latitude, longitude, rating, reviews_count, is_verified, is_premium, created_at, updated_at, business_type, migrated_from_table)
    SELECT
      src.id,
      src.nom,
      src.description,
      src.telephone,
      src.email,
      NULL,
      src.adresse,
      NULL,NULL,NULL,NULL,NULL,NULL,NULL,
      COALESCE(src.actif, FALSE),
      COALESCE(src.en_vedette, FALSE),
      COALESCE(src.date_creation, now()),
      now(),
      'divertissement'::varchar,
      'divertissement_businesses'::varchar
    FROM divertissement_businesses src
    WHERE NOT EXISTS (SELECT 1 FROM businesses b WHERE b.id = src.id);
  END IF;
END$$;

-- Construction / batiment
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'batiment_businesses') THEN
    INSERT INTO businesses (id, name, description, phone, email, website, address, city_id, region_id, country_id, latitude, longitude, rating, reviews_count, is_verified, is_premium, created_at, updated_at, business_type, migrated_from_table)
    SELECT
      src.id,
      src.nom,
      src.description,
      src.telephone,
      src.email,
      NULL,
      src.adresse,
      NULL,NULL,NULL,NULL,NULL,NULL,NULL,
      COALESCE(src.actif, FALSE),
      COALESCE(src.en_vedette, FALSE),
      COALESCE(src.date_creation, now()),
      now(),
      'construction'::varchar,
      'batiment_businesses'::varchar
    FROM batiment_businesses src
    WHERE NOT EXISTS (SELECT 1 FROM businesses b WHERE b.id = src.id);
  END IF;
END$$;

-- 3) Categories consolidation (guarded)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'business_categories') THEN
    INSERT INTO categories (name, description, category_type)
    SELECT DISTINCT
      COALESCE((to_jsonb(src) ->> 'name'), (to_jsonb(src) ->> 'nom'), (to_jsonb(src) ->> 'titre'), (to_jsonb(src) ->> 'label'), (to_jsonb(src) ->> 'title')) AS name,
      COALESCE((to_jsonb(src) ->> 'description'), (to_jsonb(src) ->> 'desc'), (to_jsonb(src) ->> 'description_fr'), '') AS description,
      'business'::varchar
    FROM business_categories src
    WHERE NOT EXISTS (SELECT 1 FROM categories c WHERE c.name = COALESCE((to_jsonb(src) ->> 'name'), (to_jsonb(src) ->> 'nom'), (to_jsonb(src) ->> 'titre')) AND c.category_type = 'business');
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'commerce_categories') THEN
    INSERT INTO categories (name, description, category_type)
    SELECT DISTINCT
      COALESCE((to_jsonb(src) ->> 'name'), (to_jsonb(src) ->> 'nom'), (to_jsonb(src) ->> 'titre'), (to_jsonb(src) ->> 'label'), (to_jsonb(src) ->> 'title')) AS name,
      COALESCE((to_jsonb(src) ->> 'description'), (to_jsonb(src) ->> 'desc'), (to_jsonb(src) ->> 'description_fr'), '') AS description,
      'business'::varchar
    FROM commerce_categories src
    WHERE NOT EXISTS (SELECT 1 FROM categories c WHERE c.name = COALESCE((to_jsonb(src) ->> 'name'), (to_jsonb(src) ->> 'nom'), (to_jsonb(src) ->> 'titre')) AND c.category_type = 'business');
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'page_categories') THEN
    INSERT INTO categories (name, description, category_type)
    SELECT DISTINCT
      COALESCE((to_jsonb(src) ->> 'name'), (to_jsonb(src) ->> 'nom'), (to_jsonb(src) ->> 'titre'), (to_jsonb(src) ->> 'label'), (to_jsonb(src) ->> 'title')) AS name,
      COALESCE((to_jsonb(src) ->> 'description'), (to_jsonb(src) ->> 'desc'), (to_jsonb(src) ->> 'description_fr'), '') AS description,
      'page'::varchar
    FROM page_categories src
    WHERE NOT EXISTS (SELECT 1 FROM categories c WHERE c.name = COALESCE((to_jsonb(src) ->> 'name'), (to_jsonb(src) ->> 'nom'), (to_jsonb(src) ->> 'titre')) AND c.category_type = 'page');
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'content_categories') THEN
    INSERT INTO categories (name, description, category_type)
    SELECT DISTINCT
      COALESCE((to_jsonb(src) ->> 'name'), (to_jsonb(src) ->> 'nom'), (to_jsonb(src) ->> 'titre'), (to_jsonb(src) ->> 'label'), (to_jsonb(src) ->> 'title')) AS name,
      COALESCE((to_jsonb(src) ->> 'description'), (to_jsonb(src) ->> 'desc'), (to_jsonb(src) ->> 'description_fr'), '') AS description,
      'content'::varchar
    FROM content_categories src
    WHERE NOT EXISTS (SELECT 1 FROM categories c WHERE c.name = COALESCE((to_jsonb(src) ->> 'name'), (to_jsonb(src) ->> 'nom'), (to_jsonb(src) ->> 'titre')) AND c.category_type = 'content');
  END IF;
END$$;

-- 4) Enrich migrated `businesses` rows with additional fields where available
DO $$
DECLARE
  tbl text;
  source_tables text[] := ARRAY[
    'automobile_businesses','finance_businesses','healthcare_businesses','restaurants_businesses',
    'retail_businesses','technology_businesses','hotels_businesses','hotellerie_businesses',
    'commerce_businesses','divertissement_businesses','batiment_businesses'
  ];
BEGIN
  FOREACH tbl IN ARRAY source_tables LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = tbl) THEN
      EXECUTE format($f$
        UPDATE businesses b
        SET
          website = COALESCE(b.website, (to_jsonb(s) ->> 'website')),
          email = COALESCE(b.email, (to_jsonb(s) ->> 'email')),
          latitude = COALESCE(b.latitude, NULLIF((to_jsonb(s) ->> 'latitude'), '')::numeric),
          longitude = COALESCE(b.longitude, NULLIF((to_jsonb(s) ->> 'longitude'), '')::numeric),
          rating = COALESCE(b.rating, NULLIF((to_jsonb(s) ->> 'rating'), '')::numeric),
          updated_at = now()
        FROM %I s
        WHERE b.id = s.id AND b.migrated_from_table = %L
      $f$, tbl, tbl);
    END IF;
  END LOOP;
END$$;

COMMIT;

-- End preview migration
