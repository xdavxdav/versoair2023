-- =======================================================================================
-- DISPATCH BUSINESSES DIRECTORY DATA TO DATABASE TABLES
-- =======================================================================================
-- This script syncs all business categories and their data from BusinessesDirectory
-- component to the respective database tables
-- =======================================================================================

BEGIN TRANSACTION;

-- ===========================
-- 1. ENSURE TABLES EXIST
-- ===========================

CREATE TABLE IF NOT EXISTS business_categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS businesses (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    category_id INTEGER REFERENCES business_categories(id),
    description TEXT,
    location TEXT,
    contact_info JSONB,
    owner_id INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    rating DECIMAL(3,2) DEFAULT 0.0,
    reviews INTEGER DEFAULT 0,
    tags JSONB DEFAULT '[]',
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    is_advertiser BOOLEAN DEFAULT false,
    ad_balance DECIMAL(10,2) DEFAULT 0,
    ad_status TEXT DEFAULT 'inactive',
    country_code CHAR(2) DEFAULT 'CI',
    region_id INTEGER,
    city_name TEXT
);

-- ===========================
-- 2. INSERT BUSINESS CATEGORIES
-- ===========================

INSERT INTO business_categories (name, slug, description)
VALUES
    ('Communication & Publicité', 'communication', 'Agences de communication, médias, imprimeries, événementiel et cadeaux d''entreprise.'),
    ('IT & Internet', 'it-internet', 'Services informatiques, développement web, hébergement cloud et solutions digitales.'),
    ('Immobilier', 'immobilier', 'Agences immobilières, promoteurs et gestion de propriétés.'),
    ('Conseil, Audit & Juridique', 'conseil-juridique', 'Experts-comptables, avocats, notaires et services de conseil aux entreprises.'),
    ('Santé', 'sante', 'Médecins, cliniques, hôpitaux, pharmacies et laboratoires d''analyses.'),
    ('Alimentation & Restauration', 'alimentation', 'Restaurants, traiteurs, commerces alimentaires et services culinaires.'),
    ('Animaux', 'animaux', 'Vétérinaires, animaleries, toilettage et soins pour animaux.'),
    ('Artisans', 'artisans', 'Plombiers, électriciens, menuisiers et artisans qualifiés.'),
    ('Maison & Décoration', 'maison-deco', 'Mobilier, décoration intérieure, électroménager et design.'),
    ('Mode & Textile', 'mode-textile', 'Vêtements, tissus, accessoires et créateurs de mode.'),
    ('Télécommunications', 'telecom', 'Opérateurs téléphoniques, fournisseurs internet et équipements réseau.'),
    ('Agroalimentaire', 'agroalimentaire', 'Agriculture, élevage, transformation alimentaire et agribusiness.'),
    ('Administrations', 'administrations', 'Services publics, ambassades, consulats et institutions gouvernementales.'),
    ('Associations Professionnelles', 'associations', 'Syndicats, fédérations et organisations professionnelles.'),
    ('Bien-être & Beauté', 'bien-etre', 'Spas, salons de beauté, coiffeurs et soins esthétiques.'),
    ('Emploi & RH', 'emploi', 'Cabinets de recrutement, agences d''intérim et formation professionnelle.'),
    ('Autres Services', 'autres', 'Services divers et spécialisés.')
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    slug = EXCLUDED.slug;

-- ===========================
-- 3. SAMPLE BUSINESSES DATA
-- ===========================

-- Insert sample businesses for each category
-- Communication & Publicité
INSERT INTO businesses (name, category_id, description, location, phone, email, rating, reviews, is_active, tags)
SELECT 
    'Agence Communication Plus', 
    bc.id, 
    'Agence de communication intégrée basée en Côte d''Ivoire',
    'Abidjan',
    '+225 27 22 12 34 56',
    'contact@agenceplusci.ci',
    4.5,
    120,
    true,
    '["communication", "design", "publicité"]'::JSONB
FROM business_categories bc WHERE bc.slug = 'communication'
ON CONFLICT DO NOTHING;

-- IT & Internet
INSERT INTO businesses (name, category_id, description, location, phone, email, rating, reviews, is_active, tags)
SELECT 
    'TechSolutions Africa', 
    bc.id, 
    'Solutions informatiques et développement web pour entreprises africaines',
    'Abidjan',
    '+225 27 22 34 56 78',
    'info@techsolutionsafrica.ci',
    4.8,
    250,
    true,
    '["IT", "web", "développement", "cloud"]'::JSONB
FROM business_categories bc WHERE bc.slug = 'it-internet'
ON CONFLICT DO NOTHING;

-- Immobilier
INSERT INTO businesses (name, category_id, description, location, phone, email, rating, reviews, is_active, tags)
SELECT 
    'Propriété Africaine', 
    bc.id, 
    'Agence immobilière spécialisée dans la vente et location de propriétés résidentielles et commerciales',
    'Abidjan',
    '+225 27 22 56 78 90',
    'ventes@proprietepAfricaine.ci',
    4.3,
    185,
    true,
    '["immobilier", "vente", "location", "propriétés"]'::JSONB
FROM business_categories bc WHERE bc.slug = 'immobilier'
ON CONFLICT DO NOTHING;

-- Santé
INSERT INTO businesses (name, category_id, description, location, phone, email, rating, reviews, is_active, tags)
SELECT 
    'Clinique Santé Plus', 
    bc.id, 
    'Clinique multiservices offrant des services médicaux généraux et spécialisés',
    'Abidjan',
    '+225 27 22 78 90 12',
    'urgences@santeplus.ci',
    4.7,
    310,
    true,
    '["santé", "clinique", "médecin", "urgences"]'::JSONB
FROM business_categories bc WHERE bc.slug = 'sante'
ON CONFLICT DO NOTHING;

-- Alimentation & Restauration
INSERT INTO businesses (name, category_id, description, location, phone, email, rating, reviews, is_active, tags)
SELECT 
    'Restaurant Le Gourmet Africain', 
    bc.id, 
    'Restaurant servant la cuisine africaine traditionnelle et moderne',
    'Abidjan',
    '+225 27 22 90 12 34',
    'reservations@legourmetafricain.ci',
    4.6,
    420,
    true,
    '["restaurant", "cuisine", "africaine", "réservations"]'::JSONB
FROM business_categories bc WHERE bc.slug = 'alimentation'
ON CONFLICT DO NOTHING;

-- Artisans
INSERT INTO businesses (name, category_id, description, location, phone, email, rating, reviews, is_active, tags)
SELECT 
    'Plomberie Expert', 
    bc.id, 
    'Services de plomberie, électricité et maintenance pour résidentiel et commercial',
    'Abidjan',
    '+225 27 22 12 45 67',
    'service@plomberieexpert.ci',
    4.4,
    95,
    true,
    '["plomberie", "électricité", "maintenance", "installation"]'::JSONB
FROM business_categories bc WHERE bc.slug = 'artisans'
ON CONFLICT DO NOTHING;

-- Bien-être & Beauté
INSERT INTO businesses (name, category_id, description, location, phone, email, rating, reviews, is_active, tags)
SELECT 
    'Spa Zen Africain', 
    bc.id, 
    'Centre wellness offrant massages, soins de beauté et relaxation',
    'Abidjan',
    '+225 27 22 34 67 89',
    'reservation@spazenafricain.ci',
    4.9,
    380,
    true,
    '["spa", "wellness", "beauté", "massage"]'::JSONB
FROM business_categories bc WHERE bc.slug = 'bien-etre'
ON CONFLICT DO NOTHING;

-- Emploi & RH
INSERT INTO businesses (name, category_id, description, location, phone, email, rating, reviews, is_active, tags)
SELECT 
    'Recrutement Talents Africains', 
    bc.id, 
    'Cabinet spécialisé dans le recrutement et la formation professionnelle',
    'Abidjan',
    '+225 27 22 56 89 01',
    'candidats@talentsafricains.ci',
    4.5,
    165,
    true,
    '["recrutement", "formation", "RH", "talents"]'::JSONB
FROM business_categories bc WHERE bc.slug = 'emploi'
ON CONFLICT DO NOTHING;

-- Télécommunications
INSERT INTO businesses (name, category_id, description, location, phone, email, rating, reviews, is_active, tags)
SELECT 
    'NetWorks Africains', 
    bc.id, 
    'Fournisseur de services internet, téléphonie et solutions réseau',
    'Abidjan',
    '+225 27 22 78 01 23',
    'support@networksafricains.ci',
    4.2,
    240,
    true,
    '["internet", "téléphonie", "réseau", "connectivité"]'::JSONB
FROM business_categories bc WHERE bc.slug = 'telecom'
ON CONFLICT DO NOTHING;

-- Agroalimentaire
INSERT INTO businesses (name, category_id, description, location, phone, email, rating, reviews, is_active, tags)
SELECT 
    'Agriculture Plus Côte d''Ivoire', 
    bc.id, 
    'Production et distribution de produits agricoles de qualité',
    'Yamoussoukro',
    '+225 27 22 90 23 45',
    'ventes@agricultureplus.ci',
    4.3,
    156,
    true,
    '["agriculture", "production", "produits", "distribution"]'::JSONB
FROM business_categories bc WHERE bc.slug = 'agroalimentaire'
ON CONFLICT DO NOTHING;

-- Mode & Textile
INSERT INTO businesses (name, category_id, description, location, phone, email, rating, reviews, is_active, tags)
SELECT 
    'Mode Africaine Chic', 
    bc.id, 
    'Boutique et atelier de mode proposant vêtements et accessoires africains contemporains',
    'Abidjan',
    '+225 27 22 01 45 67',
    'boutique@modeafricainechic.ci',
    4.6,
    210,
    true,
    '["mode", "vêtements", "accessoires", "tissus"]'::JSONB
FROM business_categories bc WHERE bc.slug = 'mode-textile'
ON CONFLICT DO NOTHING;

-- ===========================
-- 4. LOGGING & SUMMARY
-- ===========================

-- Display summary statistics
SELECT 
    'Categories inserted/updated' as "Status",
    COUNT(*) as "Count"
FROM business_categories;

SELECT 
    'Businesses created' as "Status",
    COUNT(*) as "Count"
FROM businesses;

-- ===========================
-- 5. VERIFY DATA INTEGRITY
-- ===========================

-- Check for orphaned businesses (should be empty)
SELECT COUNT(*) as "Orphaned Businesses"
FROM businesses b
WHERE b.category_id NOT IN (SELECT id FROM business_categories);

-- Count businesses per category
SELECT 
    bc.name,
    bc.slug,
    COUNT(b.id) as business_count
FROM business_categories bc
LEFT JOIN businesses b ON b.category_id = bc.id
GROUP BY bc.id, bc.name, bc.slug
ORDER BY business_count DESC;

COMMIT;

-- =======================================================================================
-- POST-DISPATCH VERIFICATION QUERIES
-- =======================================================================================

-- Verify all categories exist
-- SELECT * FROM business_categories ORDER BY name;

-- Verify all businesses exist with proper category links
-- SELECT b.*, bc.name as category_name FROM businesses b 
-- LEFT JOIN business_categories bc ON b.category_id = bc.id 
-- ORDER BY bc.name, b.name;

-- Get statistics
-- SELECT 
--     (SELECT COUNT(*) FROM business_categories) as total_categories,
--     (SELECT COUNT(*) FROM businesses) as total_businesses,
--     (SELECT AVG(rating) FROM businesses) as avg_rating,
--     (SELECT SUM(reviews) FROM businesses) as total_reviews;
