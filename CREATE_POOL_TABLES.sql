-- ============================================================================
-- POOL TABLES CREATION SCRIPT
-- ============================================================================
-- This script creates all 9 category-specific pool tables
-- Copy and paste into your database to create them
-- ============================================================================

-- 1. RESTAURANTS BUSINESSES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS restaurants_businesses (
  id SERIAL PRIMARY KEY,
  business_name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  description TEXT,
  phone VARCHAR(20),
  email VARCHAR(100),
  address TEXT,
  city VARCHAR(100),
  postal_code VARCHAR(20),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  website VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_restaurants_active ON restaurants_businesses(is_active);
CREATE INDEX IF NOT EXISTS idx_restaurants_city ON restaurants_businesses(city);

-- 2. HOTELLERIE BUSINESSES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS hotellerie_businesses (
  id SERIAL PRIMARY KEY,
  business_name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  description TEXT,
  phone VARCHAR(20),
  email VARCHAR(100),
  address TEXT,
  city VARCHAR(100),
  postal_code VARCHAR(20),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  website VARCHAR(255),
  stars NUMERIC(3, 1),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hotellerie_active ON hotellerie_businesses(is_active);
CREATE INDEX IF NOT EXISTS idx_hotellerie_city ON hotellerie_businesses(city);

-- 3. TECHNOLOGY BUSINESSES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS technology_businesses (
  id SERIAL PRIMARY KEY,
  business_name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  description TEXT,
  phone VARCHAR(20),
  email VARCHAR(100),
  address TEXT,
  city VARCHAR(100),
  postal_code VARCHAR(20),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  website VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_technology_active ON technology_businesses(is_active);
CREATE INDEX IF NOT EXISTS idx_technology_city ON technology_businesses(city);

-- 4. HEALTHCARE BUSINESSES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS healthcare_businesses (
  id SERIAL PRIMARY KEY,
  business_name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  description TEXT,
  phone VARCHAR(20),
  email VARCHAR(100),
  address TEXT,
  city VARCHAR(100),
  postal_code VARCHAR(20),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  website VARCHAR(255),
  specialization VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_healthcare_active ON healthcare_businesses(is_active);
CREATE INDEX IF NOT EXISTS idx_healthcare_city ON healthcare_businesses(city);

-- 5. COMMERCE BUSINESSES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS commerce_businesses (
  id SERIAL PRIMARY KEY,
  business_name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  description TEXT,
  phone VARCHAR(20),
  email VARCHAR(100),
  address TEXT,
  city VARCHAR(100),
  postal_code VARCHAR(20),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  website VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_commerce_active ON commerce_businesses(is_active);
CREATE INDEX IF NOT EXISTS idx_commerce_city ON commerce_businesses(city);

-- 6. RETAIL BUSINESSES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS retail_businesses (
  id SERIAL PRIMARY KEY,
  business_name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  description TEXT,
  phone VARCHAR(20),
  email VARCHAR(100),
  address TEXT,
  city VARCHAR(100),
  postal_code VARCHAR(20),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  website VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_retail_active ON retail_businesses(is_active);
CREATE INDEX IF NOT EXISTS idx_retail_city ON retail_businesses(city);

-- 7. AUTOMOBILE BUSINESSES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS automobile_businesses (
  id SERIAL PRIMARY KEY,
  business_name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  description TEXT,
  phone VARCHAR(20),
  email VARCHAR(100),
  address TEXT,
  city VARCHAR(100),
  postal_code VARCHAR(20),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  website VARCHAR(255),
  specialization VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_automobile_active ON automobile_businesses(is_active);
CREATE INDEX IF NOT EXISTS idx_automobile_city ON automobile_businesses(city);

-- 8. ADVERTISING BUSINESSES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS advertising_businesses (
  id SERIAL PRIMARY KEY,
  business_name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  description TEXT,
  phone VARCHAR(20),
  email VARCHAR(100),
  address TEXT,
  city VARCHAR(100),
  postal_code VARCHAR(20),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  website VARCHAR(255),
  services TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_advertising_active ON advertising_businesses(is_active);
CREATE INDEX IF NOT EXISTS idx_advertising_city ON advertising_businesses(city);

-- 9. DIVERTISSEMENT BUSINESSES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS divertissement_businesses (
  id SERIAL PRIMARY KEY,
  business_name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  description TEXT,
  phone VARCHAR(20),
  email VARCHAR(100),
  address TEXT,
  city VARCHAR(100),
  postal_code VARCHAR(20),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  website VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_divertissement_active ON divertissement_businesses(is_active);
CREATE INDEX IF NOT EXISTS idx_divertissement_city ON divertissement_businesses(city);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check that all tables were created
SELECT COUNT(*) as table_count
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE '%_businesses';

-- Show the tables that were created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE '%_businesses'
ORDER BY table_name;

-- ============================================================================
-- SAMPLE DATA INSERTION (as examples)
-- ============================================================================

-- Insert sample restaurants data
INSERT INTO restaurants_businesses (
  business_name, category, description, phone, email, address, city, website, is_active
) VALUES
  ('Le Petit Bistro', 'Fine Dining', 'Classic French cuisine', '+33-1-23-45-67-89', 'contact@bistro.fr', '123 Rue de Paris', 'Paris', 'https://bistro.fr', TRUE),
  ('Pizzeria Italia', 'Casual', 'Authentic Italian pizza', '+33-2-34-56-78-90', 'info@pizzeria.fr', '456 Rue de Lyon', 'Lyon', 'https://pizzeria.fr', TRUE),
  ('Burger Palace', 'Fast Food', 'Premium burgers and shakes', '+33-3-45-67-89-01', 'hello@burgers.fr', '789 Rue de Marseille', 'Marseille', 'https://burgers.fr', TRUE);

-- Insert sample hotel data
INSERT INTO hotellerie_businesses (
  business_name, category, description, phone, email, address, city, website, stars, is_active
) VALUES
  ('Hotel Grand Paris', 'Luxury', 'Five-star luxury hotel', '+33-1-99-99-99-99', 'booking@grandparis.fr', '100 Champs-Élysées', 'Paris', 'https://grandparis.fr', 5.0, TRUE),
  ('Hotel Provence', 'Mid-Range', 'Comfortable 3-star hotel', '+33-4-77-88-99-00', 'info@provence.fr', '200 Cours Mirabeau', 'Aix-en-Provence', 'https://provence.fr', 3.0, TRUE);

-- ============================================================================
-- NOTES
-- ============================================================================

-- 1. The is_active column is CRITICAL - the API only returns records where is_active = true
-- 2. All tables have created_at and updated_at timestamps for audit trails
-- 3. Indexes are created on is_active and city for fast searching
-- 4. All columns can be extended with additional fields as needed
-- 5. Keep the business_name column consistent across all tables
-- 6. Latitude/Longitude can be used for location-based services later

-- ============================================================================
-- TO USE THIS SCRIPT
-- ============================================================================
-- 1. Copy everything above
-- 2. Open your database client (psql, pgAdmin, etc.)
-- 3. Connect to your database
-- 4. Paste this entire script
-- 5. Execute
-- 6. All 9 tables will be created with proper indexes
-- 7. Run the verification queries to confirm

-- ============================================================================
