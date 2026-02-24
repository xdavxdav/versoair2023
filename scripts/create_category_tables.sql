-- Create per-category business tables if they don't exist
-- Categories detected: restaurants, hotels, retail, technology, healthcare
-- Each table follows a conservative schema matching `commerce_businesses`.

BEGIN;

CREATE TABLE IF NOT EXISTS restaurants_businesses (
  id bigint PRIMARY KEY,
  type_commerce text,
  categories_produits text[],
  livraison_disponible boolean DEFAULT false,
  cartes_credit_acceptees boolean DEFAULT false,
  nom text,
  description text,
  localisation text,
  adresse text,
  telephone text,
  email text,
  note numeric,
  avis integer,
  actif boolean DEFAULT true,
  en_vedette boolean DEFAULT false,
  date_creation timestamp without time zone DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_restaurants_nom ON restaurants_businesses USING btree(nom);
CREATE INDEX IF NOT EXISTS idx_restaurants_localisation ON restaurants_businesses USING btree(localisation);
CREATE INDEX IF NOT EXISTS idx_restaurants_actif ON restaurants_businesses USING btree(actif);

CREATE TABLE IF NOT EXISTS hotels_businesses (
  id bigint PRIMARY KEY,
  type_commerce text,
  categories_produits text[],
  livraison_disponible boolean DEFAULT false,
  cartes_credit_acceptees boolean DEFAULT false,
  nom text,
  description text,
  localisation text,
  adresse text,
  telephone text,
  email text,
  note numeric,
  avis integer,
  actif boolean DEFAULT true,
  en_vedette boolean DEFAULT false,
  date_creation timestamp without time zone DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hotels_nom ON hotels_businesses USING btree(nom);
CREATE INDEX IF NOT EXISTS idx_hotels_localisation ON hotels_businesses USING btree(localisation);
CREATE INDEX IF NOT EXISTS idx_hotels_actif ON hotels_businesses USING btree(actif);

CREATE TABLE IF NOT EXISTS retail_businesses (
  id bigint PRIMARY KEY,
  type_commerce text,
  categories_produits text[],
  livraison_disponible boolean DEFAULT false,
  cartes_credit_acceptees boolean DEFAULT false,
  nom text,
  description text,
  localisation text,
  adresse text,
  telephone text,
  email text,
  note numeric,
  avis integer,
  actif boolean DEFAULT true,
  en_vedette boolean DEFAULT false,
  date_creation timestamp without time zone DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_retail_nom ON retail_businesses USING btree(nom);
CREATE INDEX IF NOT EXISTS idx_retail_localisation ON retail_businesses USING btree(localisation);
CREATE INDEX IF NOT EXISTS idx_retail_actif ON retail_businesses USING btree(actif);

CREATE TABLE IF NOT EXISTS technology_businesses (
  id bigint PRIMARY KEY,
  type_commerce text,
  categories_produits text[],
  livraison_disponible boolean DEFAULT false,
  cartes_credit_acceptees boolean DEFAULT false,
  nom text,
  description text,
  localisation text,
  adresse text,
  telephone text,
  email text,
  note numeric,
  avis integer,
  actif boolean DEFAULT true,
  en_vedette boolean DEFAULT false,
  date_creation timestamp without time zone DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_technology_nom ON technology_businesses USING btree(nom);
CREATE INDEX IF NOT EXISTS idx_technology_localisation ON technology_businesses USING btree(localisation);
CREATE INDEX IF NOT EXISTS idx_technology_actif ON technology_businesses USING btree(actif);

CREATE TABLE IF NOT EXISTS healthcare_businesses (
  id bigint PRIMARY KEY,
  type_commerce text,
  categories_produits text[],
  livraison_disponible boolean DEFAULT false,
  cartes_credit_acceptees boolean DEFAULT false,
  nom text,
  description text,
  localisation text,
  adresse text,
  telephone text,
  email text,
  note numeric,
  avis integer,
  actif boolean DEFAULT true,
  en_vedette boolean DEFAULT false,
  date_creation timestamp without time zone DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_healthcare_nom ON healthcare_businesses USING btree(nom);
CREATE INDEX IF NOT EXISTS idx_healthcare_localisation ON healthcare_businesses USING btree(localisation);
CREATE INDEX IF NOT EXISTS idx_healthcare_actif ON healthcare_businesses USING btree(actif);

COMMIT;

-- Run with:
-- PGPASSWORD=versoair2025 psql -U versoair -d versoair_business_intelligence -h localhost -p 5432 -f scripts/create_category_tables.sql
