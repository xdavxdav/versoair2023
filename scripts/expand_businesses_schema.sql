-- ============================================================================
-- EXPAND BUSINESSES TABLE SCHEMA
-- ============================================================================
-- This migration adds all planned columns to the businesses table
-- to support full business management functionality

BEGIN;

-- Add missing columns to businesses table
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS contact_info JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS owner_id INTEGER,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS reviews INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8),
ADD COLUMN IF NOT EXISTS is_advertiser BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ad_balance DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS ad_status VARCHAR(50) DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS country_code CHAR(2) DEFAULT 'CI',
ADD COLUMN IF NOT EXISTS region_id INTEGER,
ADD COLUMN IF NOT EXISTS city_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Create business_hours table
CREATE TABLE IF NOT EXISTS business_hours (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL UNIQUE REFERENCES businesses(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  open_time TIME,
  close_time TIME,
  is_closed BOOLEAN DEFAULT FALSE,
  break_start TIME,
  break_end TIME,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create business_services table
CREATE TABLE IF NOT EXISTS business_services (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'USD',
  duration_minutes INTEGER,
  is_available BOOLEAN DEFAULT TRUE,
  category VARCHAR(100),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create business_reviews table
CREATE TABLE IF NOT EXISTS business_reviews (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id INTEGER,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255),
  content TEXT,
  pros JSONB,
  cons JSONB,
  is_verified BOOLEAN DEFAULT FALSE,
  helpful_count INTEGER DEFAULT 0,
  images JSONB,
  status VARCHAR(20) DEFAULT 'published',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create analytics table
CREATE TABLE IF NOT EXISTS analytics (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES businesses(id) ON DELETE SET NULL,
  category_id INTEGER REFERENCES business_categories(id) ON DELETE SET NULL,
  total_reservations INTEGER DEFAULT 0,
  revenue DECIMAL(12,2) DEFAULT 0,
  recorded_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_businesses_category_id ON businesses(category_id);
CREATE INDEX IF NOT EXISTS idx_businesses_is_active ON businesses(is_active);
CREATE INDEX IF NOT EXISTS idx_businesses_rating ON businesses(rating DESC);
CREATE INDEX IF NOT EXISTS idx_business_services_business_id ON business_services(business_id);
CREATE INDEX IF NOT EXISTS idx_business_reviews_business_id ON business_reviews(business_id);
CREATE INDEX IF NOT EXISTS idx_analytics_business_id ON analytics(business_id);

-- Create view for business stats
CREATE OR REPLACE VIEW v_business_stats AS
SELECT 
  b.id,
  b.name,
  b.category_id,
  bc.name as category_name,
  b.rating,
  b.reviews,
  COALESCE(COUNT(DISTINCT br.id), 0) as total_reviews,
  COALESCE(AVG(br.rating), 0) as avg_rating,
  COALESCE(COUNT(DISTINCT bs.id), 0) as total_services,
  a.total_reservations,
  a.revenue,
  b.is_active,
  b.created_at
FROM businesses b
LEFT JOIN business_categories bc ON b.category_id = bc.id
LEFT JOIN business_reviews br ON b.id = br.business_id
LEFT JOIN business_services bs ON b.id = bs.business_id
LEFT JOIN analytics a ON b.id = a.business_id
GROUP BY b.id, b.name, b.category_id, bc.name, b.rating, b.reviews, a.total_reservations, a.revenue, b.is_active, b.created_at;

COMMIT;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Database schema expansion completed successfully';
  RAISE NOTICE 'New tables: business_hours, business_services, business_reviews, analytics';
  RAISE NOTICE 'New columns: description, location, contact_info, rating, reviews, tags, coordinates';
  RAISE NOTICE 'New indexes and views created for performance';
END $$;
