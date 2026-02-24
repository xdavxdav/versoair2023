-- db/seed_categories.sql
-- Idempotent seed to create business categories and subcategories per user instructions
BEGIN;

-- Parents
INSERT INTO categories (name, description, category_type, level)
SELECT 'Communication and Advertising', 'Communication and advertising companies. Media, radio, television, events, publishers, printers, promotional items and corporate gifts.', 'business', 1
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Communication and Advertising' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, level)
SELECT 'Building & Construction', 'Building companies, civil engineering, public works, construction materials and equipment.', 'business', 1
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Building & Construction' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, level)
SELECT 'Finance', 'Banking, insurance and financial services.', 'business', 1
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Finance' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, level)
SELECT 'Commerce', 'Retail shops, stores and commercial services.', 'business', 1
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Commerce' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, level)
SELECT 'Automotive & Motorbike', 'Automobile and motorcycle services and dealers.', 'business', 1
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Automotive & Motorbike' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, level)
SELECT 'IT & Internet', 'IT, internet and digital technology services.', 'business', 1
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'IT & Internet' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, level)
SELECT 'Real Estate', 'Real estate listings, agencies and developers.', 'business', 1
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Real Estate' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, level)
SELECT 'Accounting, Legal & Advisory Services', 'Accounting, legal and business advisory services.', 'business', 1
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Accounting, Legal & Advisory Services' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, level)
SELECT 'Tourism and leisure', 'Tours, hospitality, transport, events and leisure activities.', 'business', 1
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Tourism and leisure' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, level)
SELECT 'Health', 'Medical services: doctors, clinics, hospitals, labs.', 'business', 1
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Health' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, level)
SELECT 'Administrations', 'Public institutions and government services.', 'business', 1
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Administrations' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, level)
SELECT 'Food & Beverage', 'Restaurants, food shops and culinary services.', 'business', 1
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Food & Beverage' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, level)
SELECT 'Animals', 'Animal care and pet-related services.', 'business', 1
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Animals' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, level)
SELECT 'Artisans', 'Skilled artisans and craft professionals.', 'business', 1
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Artisans' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, level)
SELECT 'Home & Interior Design', 'Home, furniture and interior decoration.', 'business', 1
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Home & Interior Design' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, level)
SELECT 'Fashion, Clothing & Textiles', 'Apparel, fabrics, tailoring and textile sourcing.', 'business', 1
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Fashion, Clothing & Textiles' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, level)
SELECT 'Telecommunications', 'Telecom operators, ISPs and network services.', 'business', 1
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Telecommunications' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, level)
SELECT 'Agri-Food & Agribusiness', 'Agriculture, food production and processing.', 'business', 1
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Agri-Food & Agribusiness' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, level)
SELECT 'Professional Associations', 'Trade bodies and professional organizations.', 'business', 1
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Professional Associations' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, level)
SELECT 'Others', 'Miscellaneous and unclassified services.', 'business', 1
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Others' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, level)
SELECT 'Wellness', 'Wellness, beauty and relaxation services.', 'business', 1
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Wellness' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, level)
SELECT 'Employment', 'Jobs, recruitment and staffing services.', 'business', 1
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Employment' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, level)
SELECT 'Energy', 'Energy production and power solutions.', 'business', 1
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Energy' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, level)
SELECT 'Education & Training', 'Schools, universities and training centers.', 'business', 1
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Education & Training' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, level)
SELECT 'Hygiène', 'Cleaning products and personal hygiene.', 'business', 1
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Hygiène' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, level)
SELECT 'Import et export', 'International trade and logistics services.', 'business', 1
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Import et export' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, level)
SELECT 'Industries', 'Industrial manufacturers and processing.', 'business', 1
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Industries' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, level)
SELECT 'Sécurité', 'Security services and alarm/guarding.', 'business', 1
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Sécurité' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, level)
SELECT 'Services', 'General services like cleaning, courier, etc.', 'business', 1
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Services' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, level)
SELECT 'Sport', 'Sport shops and facilities.', 'business', 1
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Sport' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, level)
SELECT 'Transports', 'Transport infrastructure and services.', 'business', 1
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Transports' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, level)
SELECT 'Urgence', 'Emergency services.', 'business', 1
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Urgence' AND category_type = 'business');

-- Children (examples mapped from the provided list)
-- Communication and Advertising
INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Communication Agencies', 'Communication agencies and consultancies.', 'business', (SELECT id FROM categories WHERE name = 'Communication and Advertising' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Communication Agencies' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Printing Companies', 'Printing, publishers and graphic services.', 'business', (SELECT id FROM categories WHERE name = 'Communication and Advertising' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Printing Companies' AND category_type = 'business');

-- Building & Construction children
INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Construction Companies', 'Building companies and contractors.', 'business', (SELECT id FROM categories WHERE name = 'Building & Construction' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Construction Companies' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Civil Engineering', 'Civil engineering and public works.', 'business', (SELECT id FROM categories WHERE name = 'Building & Construction' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Civil Engineering' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Construction Materials & Equipment', 'Suppliers of construction materials and equipment.', 'business', (SELECT id FROM categories WHERE name = 'Building & Construction' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Construction Materials & Equipment' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Water Supply Systems', 'Water supply and treatment systems.', 'business', (SELECT id FROM categories WHERE name = 'Building & Construction' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Water Supply Systems' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Aluminum', 'Aluminum suppliers and fabricators.', 'business', (SELECT id FROM categories WHERE name = 'Building & Construction' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Aluminum' AND category_type = 'business');

-- Finance children
INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Insurance Providers', 'Insurance companies and underwriters.', 'business', (SELECT id FROM categories WHERE name = 'Finance' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Insurance Providers' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Insurance Brokers', 'Independent brokers and agents.', 'business', (SELECT id FROM categories WHERE name = 'Finance' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Insurance Brokers' AND category_type = 'business');

-- Commerce children
INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Supermarkets', 'Large grocery and supermarket chains.', 'business', (SELECT id FROM categories WHERE name = 'Commerce' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Supermarkets' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Hardware Stores', 'Hardware, tools and DIY suppliers.', 'business', (SELECT id FROM categories WHERE name = 'Commerce' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Hardware Stores' AND category_type = 'business');

-- Automotive children
INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Car Sales', 'New and used car dealerships.', 'business', (SELECT id FROM categories WHERE name = 'Automotive & Motorbike' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Car Sales' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Motorcycle & Scooter', 'Motorcycle and scooter dealers and services.', 'business', (SELECT id FROM categories WHERE name = 'Automotive & Motorbike' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Motorcycle & Scooter' AND category_type = 'business');

-- IT children
INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Internet Cafés', 'Public internet access and cafés.', 'business', (SELECT id FROM categories WHERE name = 'IT & Internet' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Internet Cafés' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Cloud Hosting', 'Cloud hosting and infrastructure providers.', 'business', (SELECT id FROM categories WHERE name = 'IT & Internet' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Cloud Hosting' AND category_type = 'business');

-- Real Estate children
INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Real Estate Agencies', 'Estate agents and brokers.', 'business', (SELECT id FROM categories WHERE name = 'Real Estate' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Real Estate Agencies' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Real Estate Developers', 'Developers and construction of residential/commercial projects.', 'business', (SELECT id FROM categories WHERE name = 'Real Estate' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Real Estate Developers' AND category_type = 'business');

-- Accounting, Legal & Advisory children
INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Audit & Consulting', 'Audit and business consulting.', 'business', (SELECT id FROM categories WHERE name = 'Accounting, Legal & Advisory Services' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Audit & Consulting' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Chartered Accountants', 'Certified accountants and tax advisors.', 'business', (SELECT id FROM categories WHERE name = 'Accounting, Legal & Advisory Services' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Chartered Accountants' AND category_type = 'business');

-- Tourism children
INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Travel Agencies', 'Travel agencies and tour operators.', 'business', (SELECT id FROM categories WHERE name = 'Tourism and leisure' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Travel Agencies' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Hostels', 'Budget accommodations and hostels.', 'business', (SELECT id FROM categories WHERE name = 'Tourism and leisure' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Hostels' AND category_type = 'business');

-- Health children
INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Cardiologists', 'Heart specialists and clinics.', 'business', (SELECT id FROM categories WHERE name = 'Health' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Cardiologists' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Surgeons', 'Surgical specialists and centers.', 'business', (SELECT id FROM categories WHERE name = 'Health' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Surgeons' AND category_type = 'business');

-- Administrations children
INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Embassies and Consulates', 'Diplomatic missions and consular services.', 'business', (SELECT id FROM categories WHERE name = 'Administrations' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Embassies and Consulates' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Associations', 'Professional and civic associations.', 'business', (SELECT id FROM categories WHERE name = 'Administrations' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Associations' AND category_type = 'business');

-- Food & Beverage children
INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Fishmongers', 'Fresh fish markets and suppliers.', 'business', (SELECT id FROM categories WHERE name = 'Food & Beverage' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Fishmongers' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Caterers', 'Event and catering services.', 'business', (SELECT id FROM categories WHERE name = 'Food & Beverage' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Caterers' AND category_type = 'business');

-- Animals children
INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Veterinary Pharmacies', 'Pharmacies specializing in veterinary medicines.', 'business', (SELECT id FROM categories WHERE name = 'Animals' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Veterinary Pharmacies' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Veterinarians', 'Veterinary clinics and vets.', 'business', (SELECT id FROM categories WHERE name = 'Animals' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Veterinarians' AND category_type = 'business');

-- Artisans children
INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Plumbers', 'Plumbing and sanitation services.', 'business', (SELECT id FROM categories WHERE name = 'Artisans' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Plumbers' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Glass & Glazing', 'Glassworks, windows and glazing services.', 'business', (SELECT id FROM categories WHERE name = 'Artisans' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Glass & Glazing' AND category_type = 'business');

-- Home & Interior Design children
INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Furniture', 'Furniture stores and manufacturers.', 'business', (SELECT id FROM categories WHERE name = 'Home & Interior Design' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Furniture' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Art galleries', 'Galleries and interior art suppliers.', 'business', (SELECT id FROM categories WHERE name = 'Home & Interior Design' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Art galleries' AND category_type = 'business');

-- Fashion children
INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Fabrics and textiles', 'Textiles, fabrics and raw materials.', 'business', (SELECT id FROM categories WHERE name = 'Fashion, Clothing & Textiles' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Fabrics and textiles' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Ready-to-wear', 'Retail ready-to-wear clothing.', 'business', (SELECT id FROM categories WHERE name = 'Fashion, Clothing & Textiles' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Ready-to-wear' AND category_type = 'business');

-- Telecommunications children
INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Telephone operators', 'Mobile and fixed-line telephone operators.', 'business', (SELECT id FROM categories WHERE name = 'Telecommunications' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Telephone operators' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Networks - Telecommunications', 'Telecom network infrastructure and services.', 'business', (SELECT id FROM categories WHERE name = 'Telecommunications' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Networks - Telecommunications' AND category_type = 'business');

-- Agri-Food children
INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Slaughterhouses & Meat Processing', 'Meat processing and slaughterhouses.', 'business', (SELECT id FROM categories WHERE name = 'Agri-Food & Agribusiness' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Slaughterhouses & Meat Processing' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Agrochemicals', 'Fertilizers, pesticides and agrochemical suppliers.', 'business', (SELECT id FROM categories WHERE name = 'Agri-Food & Agribusiness' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Agrochemicals' AND category_type = 'business');

-- Professional Associations children
INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Confederations', 'National or regional confederations and chambers.', 'business', (SELECT id FROM categories WHERE name = 'Professional Associations' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Confederations' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Professional Regulatory Bodies', 'Regulatory and licensing organizations.', 'business', (SELECT id FROM categories WHERE name = 'Professional Associations' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Professional Regulatory Bodies' AND category_type = 'business');

-- Others children
INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Religions & Places of Worship', 'Religious institutions and places of worship.', 'business', (SELECT id FROM categories WHERE name = 'Others' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Religions & Places of Worship' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Marine engines', 'Marine engine suppliers and services.', 'business', (SELECT id FROM categories WHERE name = 'Others' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Marine engines' AND category_type = 'business');

-- Wellness children
INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Beauty & Aesthetic Salons', 'Beauty salons and aesthetic services.', 'business', (SELECT id FROM categories WHERE name = 'Wellness' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Beauty & Aesthetic Salons' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Spas & Saunas', 'Spas and wellness centers.', 'business', (SELECT id FROM categories WHERE name = 'Wellness' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Spas & Saunas' AND category_type = 'business');

-- Employment children
INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Recruitment agencies', 'Staffing and recruitment firms.', 'business', (SELECT id FROM categories WHERE name = 'Employment' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Recruitment agencies' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Temporary Employment Agencies', 'Temporary staffing and temp agencies.', 'business', (SELECT id FROM categories WHERE name = 'Employment' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Temporary Employment Agencies' AND category_type = 'business');

-- Energy children
INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Electromechanical Engineering', 'Electromechanical engineering services.', 'business', (SELECT id FROM categories WHERE name = 'Energy' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Electromechanical Engineering' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Electrical Engineering', 'Electrical engineering and contractors.', 'business', (SELECT id FROM categories WHERE name = 'Energy' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Electrical Engineering' AND category_type = 'business');

-- Education children
INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Primary schools', 'Primary and elementary schools.', 'business', (SELECT id FROM categories WHERE name = 'Education & Training' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Primary schools' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Technical secondary schools', 'Technical and vocational secondary education.', 'business', (SELECT id FROM categories WHERE name = 'Education & Training' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Technical secondary schools' AND category_type = 'business');

-- Hygiène children
INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Cleaning products', 'Suppliers of cleaning products.', 'business', (SELECT id FROM categories WHERE name = 'Hygiène' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Cleaning products' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Hygiène corporelle', 'Personal care and hygiene products.', 'business', (SELECT id FROM categories WHERE name = 'Hygiène' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Hygiène corporelle' AND category_type = 'business');

-- Import et export children
INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Négoce', 'Trading and merchant activities.', 'business', (SELECT id FROM categories WHERE name = 'Import et export' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Négoce' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Centrales d''achats', 'Buying groups and purchasing centers.', 'business', (SELECT id FROM categories WHERE name = 'Import et export' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Centrales d''achats' AND category_type = 'business');

-- Industries children
INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Brasserie', 'Breweries and beverage manufacturers.', 'business', (SELECT id FROM categories WHERE name = 'Industries' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Brasserie' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Cartonnerie', 'Cardboard and packaging manufacturers.', 'business', (SELECT id FROM categories WHERE name = 'Industries' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Cartonnerie' AND category_type = 'business');

-- Sécurité children
INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Alarmes - Surveillance', 'Alarm and surveillance providers.', 'business', (SELECT id FROM categories WHERE name = 'Sécurité' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Alarmes - Surveillance' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Gardiennage -Sécurité', 'Guarding and security services.', 'business', (SELECT id FROM categories WHERE name = 'Sécurité' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Gardiennage -Sécurité' AND category_type = 'business');

-- Services children
INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Industrial Cleaning', 'Industrial and commercial cleaning services.', 'business', (SELECT id FROM categories WHERE name = 'Services' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Industrial Cleaning' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Courrier express', 'Express courier and delivery services.', 'business', (SELECT id FROM categories WHERE name = 'Services' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Courrier express' AND category_type = 'business');

-- Sport children
INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Magasins de sport', 'Sporting goods and stores.', 'business', (SELECT id FROM categories WHERE name = 'Sport' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Magasins de sport' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Centres omnisports - Stades', 'Multi-sport centers and stadiums.', 'business', (SELECT id FROM categories WHERE name = 'Sport' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Centres omnisports - Stades' AND category_type = 'business');

-- Transports children
INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Aéroports', 'Airport facilities and services.', 'business', (SELECT id FROM categories WHERE name = 'Transports' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Aéroports' AND category_type = 'business');

INSERT INTO categories (name, description, category_type, parent_id, level)
SELECT 'Transport aérien', 'Air transport and airlines.', 'business', (SELECT id FROM categories WHERE name = 'Transports' AND category_type = 'business'), 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Transport aérien' AND category_type = 'business');

COMMIT;

-- End seed
