-- Hotels table
CREATE TABLE IF NOT EXISTS hotels (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  location VARCHAR(255) NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  category VARCHAR(50),
  amenities TEXT[],
  image_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Hôtellerie analytics table
CREATE TABLE IF NOT EXISTS hotellerie_analytics (
  id SERIAL PRIMARY KEY,
  hotel_id INTEGER REFERENCES hotels(id),
  taux_occupation DECIMAL(5,2),
  prix_moyen_journalier DECIMAL(10,2),
  satisfaction_clients DECIMAL(3,2),
  revenu_par_chambre DECIMAL(10,2),
  month DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Données d'occupation pour les graphiques
CREATE TABLE IF NOT EXISTS donnees_occupation (
  id SERIAL PRIMARY KEY,
  mois VARCHAR(20),
  taux_occupation DECIMAL(5,2),
  annee INTEGER
);

-- Données de revenus pour les graphiques  
CREATE TABLE IF NOT EXISTS donnees_revenus (
  id SERIAL PRIMARY KEY,
  categorie VARCHAR(100),
  montant DECIMAL(12,2)
);

-- Clear existing data
TRUNCATE TABLE hotels CASCADE;
TRUNCATE TABLE hotellerie_analytics CASCADE;
TRUNCATE TABLE donnees_occupation CASCADE;
TRUNCATE TABLE donnees_revenus CASCADE;

-- Insert sample hotel data with English descriptions for better search
INSERT INTO hotels (name, description, location, rating, category, amenities, image_url) VALUES
('Grand Plaza Hotel', 'Luxury 5-star hotel with premium amenities and exceptional service in the heart of the city. Features include spa, swimming pool, fine dining restaurant, and 24/7 concierge service.', 'Paris, France', 5, '5-star', '{"spa", "pool", "restaurant", "gym", "concierge", "wifi", "parking"}', 'https://images.unsplash.com/photo-1566073771259-6a8506099945'),
('Oceanview Resort', 'Beachfront resort offering stunning ocean views and comprehensive wellness facilities. Perfect for family vacations and romantic getaways with direct beach access.', 'Nice, France', 4, 'resort', '{"beach", "pool", "spa", "restaurant", "water-sports", "kids-club", "bar"}', 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa'),
('Metropolitan Boutique Hotel', 'Charming boutique hotel with unique design and personalized service in downtown area. Ideal for business travelers and urban explorers.', 'Lyon, France', 4, 'boutique', '{"restaurant", "bar", "concierge", "business-center", "wifi", "terrace"}', 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4'),
('Business Tower Hotel', 'Modern high-rise hotel with state-of-the-art conference facilities and executive lounges. Located in the financial district.', 'London, UK', 4, 'business', '{"conference", "wifi", "restaurant", "gym", "business-center", "lounge"}', 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb'),
('Mountain Retreat Lodge', 'Secluded lodge in the mountains offering peaceful accommodation and outdoor activities. Perfect for nature lovers and adventure seekers.', 'Chamonix, France', 3, 'lodge', '{"fireplace", "restaurant", "hiking", "skiing", "spa", "view"}', 'https://images.unsplash.com/photo-1586375300773-8384e3e4916f');

-- Add analytics data
INSERT INTO hotellerie_analytics (hotel_id, taux_occupation, prix_moyen_journalier, satisfaction_clients, revenu_par_chambre, month) VALUES
(1, 85.50, 450.00, 4.75, 384.75, '2024-01-01'),
(2, 78.20, 320.00, 4.60, 250.24, '2024-01-01'),
(3, 92.10, 280.00, 4.85, 257.88, '2024-01-01'),
(4, 88.30, 380.00, 4.70, 335.54, '2024-01-01'),
(5, 65.80, 180.00, 4.90, 118.44, '2024-01-01');

-- Add occupancy data for charts
INSERT INTO donnees_occupation (mois, taux_occupation, annee) VALUES
('January', 85.5, 2024),
('February', 82.3, 2024),
('March', 88.7, 2024),
('April', 91.2, 2024),
('May', 94.1, 2024),
('June', 96.5, 2024);

-- Add revenue data for charts
INSERT INTO donnees_revenus (categorie, montant) VALUES
('Room Revenue', 1250000.00),
('Food & Beverage', 450000.00),
('Spa Services', 280000.00),
('Other Services', 150000.00),
('Conference', 320000.00),
('Parking', 75000.00);

-- Create a comprehensive search view that includes all searchable content
CREATE OR REPLACE VIEW searchable_content AS
-- Hotels search
SELECT 
    'hotel-' || id as id,
    name as title,
    description,
    'Hospitality' as category,
    'business' as type,
    'Hotel' as icon,
    '/hotels/' || id as href,
    ARRAY[category, location, 'hotel', 'accommodation', 'lodging', 'dwelling'] || amenities as tags,
    90 as relevance
FROM hotels

UNION ALL

-- Analytics search
SELECT 
    'analytics-' || id as id,
    'Hospitality Analytics - ' || h.name as title,
    'Performance metrics and business intelligence data for ' || h.name as description,
    'Business Intelligence' as category,
    'analytics' as type,
    'BarChart3' as icon,
    '/analytics/hospitality/' || ha.hotel_id as href,
    ARRAY['analytics', 'hospitality', 'performance', 'metrics', 'occupancy', 'revenue', h.category] as tags,
    85 as relevance
FROM hotellerie_analytics ha
JOIN hotels h ON ha.hotel_id = h.id

UNION ALL

-- Occupancy data search
SELECT 
    'occupancy-' || id as id,
    'Occupancy Rate - ' || mois as title,
    'Hotel occupancy rate data for ' || mois || ' ' || annee as description,
    'Analytics' as category,
    'analytics' as type,
    'TrendingUp' as icon,
    '/analytics/occupancy/' || id as href,
    ARRAY['occupancy', 'rate', 'analytics', 'performance', 'hospitality', 'dwellings'] as tags,
    80 as relevance
FROM donnees_occupation

UNION ALL

-- Revenue data search
SELECT 
    'revenue-' || id as id,
    'Revenue Data - ' || categorie as title,
    'Revenue analytics and financial data for ' || categorie as description,
    'Finance' as category,
    'analytics' as type,
    'CreditCard' as icon,
    '/analytics/revenue/' || id as href,
    ARRAY['revenue', 'finance', 'analytics', 'income', 'revenue-streams', categorie] as tags,
    75 as relevance
FROM donnees_revenus;

-- Create indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_hotels_name ON hotels USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_hotels_description ON hotels USING gin(to_tsvector('english', description));
CREATE INDEX IF NOT EXISTS idx_hotels_location ON hotels USING gin(to_tsvector('english', location));
CREATE INDEX IF NOT EXISTS idx_hotels_amenities ON hotels USING gin(amenities);

CREATE INDEX IF NOT EXISTS idx_search_content ON searchable_content USING gin(
    to_tsvector('english', title || ' ' || description || ' ' || array_to_string(tags, ' '))
);

-- Enable full-text search extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- Create a function for fuzzy search
CREATE OR REPLACE FUNCTION search_hospitality_data(search_query TEXT)
RETURNS TABLE (
    id TEXT,
    title TEXT,
    description TEXT,
    category TEXT,
    type TEXT,
    icon TEXT,
    href TEXT,
    tags TEXT[],
    relevance INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sc.id,
        sc.title,
        sc.description,
        sc.category,
        sc.type,
        sc.icon,
        sc.href,
        sc.tags,
        sc.relevance +
        CASE 
            WHEN sc.title ILIKE '%' || search_query || '%' THEN 20
            WHEN sc.description ILIKE '%' || search_query || '%' THEN 10
            ELSE 0
        END as boosted_relevance
    FROM searchable_content sc
    WHERE 
        to_tsvector('english', sc.title || ' ' || sc.description || ' ' || array_to_string(sc.tags, ' ')) 
        @@ plainto_tsquery('english', search_query)
        OR sc.title ILIKE '%' || search_query || '%'
        OR sc.description ILIKE '%' || search_query || '%'
        OR search_query = ANY(sc.tags)
    ORDER BY boosted_relevance DESC, sc.relevance DESC
    LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- Create materialized view for faster searches (optional for large datasets)
CREATE MATERIALIZED VIEW IF NOT EXISTS fast_search_content AS
SELECT * FROM searchable_content;

CREATE INDEX IF NOT EXISTS idx_fast_search ON fast_search_content 
USING gin(to_tsvector('english', title || ' ' || description || ' ' || array_to_string(tags, ' ')));

-- Refresh materialized view
REFRESH MATERIALIZED VIEW fast_search_content;

-- Grant permissions (adjust as needed)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO public;