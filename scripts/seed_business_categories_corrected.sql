-- ============================================================
-- MASTER BUSINESS CATEGORY TAXONOMY - CORRECTED
-- 32 Main Categories + 150+ Subcategories
-- Proper parent-child hierarchy FIXED
-- ============================================================

-- MAIN CATEGORIES FIRST (parent_id = NULL)
INSERT INTO business_categories (id, name, slug, description, main_category, parent_id) VALUES
(1, 'Communication & Advertising', 'communication-advertising', 'Communication and advertising companies', 'communication', NULL),
(2, 'Building & Construction', 'building-construction', 'Building companies, civil engineering, public works', 'building', NULL),
(3, 'Finance', 'finance', 'Banking, insurance and financial services', 'finance', NULL),
(4, 'Commerce', 'commerce', 'Retail shops, stores and commercial services', 'commerce', NULL),
(5, 'Automotive & Motorbike', 'automotive-motorbike', 'Automobile and motorcycle services', 'automotive', NULL),
(6, 'IT & Internet', 'it-internet', 'IT, internet and digital technology services', 'it', NULL),
(7, 'Real Estate', 'real-estate', 'Real estate listings, agencies and development', 'real-estate', NULL),
(8, 'Accounting, Legal & Advisory Services', 'accounting-legal-advisory', 'Accounting, legal and business advisory services', 'advisory', NULL),
(9, 'Tourism & Leisure', 'tourism-leisure', 'Tours, hospitality, transport, events and leisure', 'tourism', NULL),
(10, 'Health', 'health', 'Medical and healthcare services', 'health', NULL),
(11, 'Administrations', 'administrations', 'Public institutions and government services', 'admin', NULL),
(12, 'Food & Beverage', 'food-beverage', 'Restaurants, food shops and culinary services', 'food', NULL),
(13, 'Animals', 'animals', 'Animal care and pet-related services', 'animals', NULL),
(14, 'Artisans', 'artisans', 'Skilled artisans and craft professionals', 'artisans', NULL),
(15, 'Home & Interior Design', 'home-interior-design', 'Home, furniture and interior decoration', 'home', NULL),
(16, 'Fashion, Clothing & Textiles', 'fashion-clothing-textiles', 'Apparel, fabrics and textile services', 'fashion', NULL),
(17, 'Telecommunications', 'telecommunications', 'Telecom operators and network services', 'telecom', NULL),
(18, 'Agri-Food & Agribusiness', 'agri-food-agribusiness', 'Agriculture, food production and processing', 'agribusiness', NULL),
(19, 'Professional Associations', 'professional-associations', 'Trade bodies and professional organizations', 'associations', NULL),
(20, 'Wellness', 'wellness', 'Wellness, beauty and relaxation services', 'wellness', NULL),
(21, 'Employment', 'employment', 'Jobs, recruitment and staffing services', 'employment', NULL),
(22, 'Energy', 'energy', 'Energy production and power solutions', 'energy', NULL),
(23, 'Education & Training', 'education-training', 'Schools, universities and training centers', 'education', NULL),
(24, 'Hygiene', 'hygiene', 'Personal hygiene and cleaning products', 'hygiene', NULL),
(25, 'Import & Export', 'import-export', 'International trade and wholesale services', 'import-export', NULL),
(26, 'Industries', 'industries', 'Manufacturing, mining and industrial activities', 'industries', NULL),
(27, 'Security', 'security', 'Security services and protection solutions', 'security', NULL),
(28, 'Services (General)', 'services-general', 'Professional and specialized service providers', 'services', NULL),
(29, 'Sport', 'sport', 'Sports clubs, facilities and activities', 'sport', NULL),
(30, 'Transport & Logistics', 'transport-logistics', 'Transport, logistics and mobility services', 'transport', NULL),
(31, 'Emergency Services', 'emergency-services', 'Emergency response and public safety services', 'emergency', NULL),
(32, 'Others', 'others', 'Unclassified or exceptional activities', 'others', NULL);

-- COMMUNICATION & ADVERTISING SUBCATEGORIES
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Communication Agencies', 'communication-agencies', 'Communications and PR agencies', 'communication', 1),
('Advertising Agencies', 'advertising-agencies', 'Advertising and marketing agencies', 'communication', 1),
('Media & Broadcasting', 'media-broadcasting', 'Media companies and broadcasting services', 'communication', 1),
('Radio Stations', 'radio-stations', 'Radio broadcasting stations', 'communication', 1),
('Television Channels', 'television-channels', 'Television broadcasting channels', 'communication', 1),
('Event & Promotion Companies', 'event-promotion-companies', 'Event organization and promotion services', 'communication', 1),
('Publishing Houses', 'publishing-houses', 'Book and publication publishers', 'communication', 1),
('Printing Companies', 'printing-companies', 'Commercial and industrial printing', 'communication', 1),
('Promotional Items & Corporate Gifts', 'promotional-items-corporate-gifts', 'Promotional merchandise and corporate gifts', 'communication', 1);

-- BUILDING & CONSTRUCTION SUBCATEGORIES
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Construction Companies', 'construction-companies', 'General construction and building contractors', 'building', 2),
('Civil Engineering & Public Works', 'civil-engineering-public-works', 'Civil engineering and infrastructure projects', 'building', 2),
('Construction Materials', 'construction-materials', 'Construction materials suppliers', 'building', 2),
('Heavy Machinery & Equipment', 'heavy-machinery-equipment', 'Heavy equipment and machinery rentals/sales', 'building', 2),
('Water Supply Systems', 'water-supply-systems', 'Water supply and installation services', 'building', 2),
('Aluminum & Metal Structures', 'aluminum-metal-structures', 'Aluminum and metal structural work', 'building', 2),
('Roads & Infrastructure', 'roads-infrastructure', 'Road construction and infrastructure', 'building', 2);

-- FINANCE SUBCATEGORIES
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Banks & Financial Institutions', 'banks-financial-institutions', 'Commercial and investment banks', 'finance', 3),
('Insurance Providers', 'insurance-providers', 'Insurance companies and providers', 'finance', 3),
('Insurance Brokers', 'insurance-brokers', 'Insurance brokerage services', 'finance', 3),
('Microfinance Institutions', 'microfinance-institutions', 'Microfinance and small loan providers', 'finance', 3),
('Investment & Asset Management', 'investment-asset-management', 'Investment and asset management services', 'finance', 3),
('Payment & Fintech Services', 'payment-fintech-services', 'Payment processing and fintech services', 'finance', 3);

-- COMMERCE SUBCATEGORIES
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Supermarkets & Grocery Stores', 'supermarkets-grocery-stores', 'Grocery and supermarket retailers', 'commerce', 4),
('Hardware Stores', 'hardware-stores', 'Hardware and DIY stores', 'commerce', 4),
('Wholesale & Distribution', 'wholesale-distribution', 'Wholesale suppliers and distributors', 'commerce', 4),
('Convenience Stores', 'convenience-stores', '24/7 convenience shops', 'commerce', 4),
('E-commerce & Online Shops', 'e-commerce-online-shops', 'Online retail and e-commerce platforms', 'commerce', 4),
('Retail', 'retail', 'General retail and specialty stores', 'commerce', 4);

-- AUTOMOTIVE & MOTORBIKE SUBCATEGORIES
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Car Sales & Dealerships', 'car-sales-dealerships', 'Car and automobile sales', 'automotive', 5),
('Motorcycle & Scooter Sales', 'motorcycle-scooter-sales', 'Motorcycle and scooter sales', 'automotive', 5),
('Auto Repair & Garages', 'auto-repair-garages', 'Vehicle repair and maintenance services', 'automotive', 5),
('Spare Parts & Accessories', 'spare-parts-accessories', 'Auto parts and accessories shops', 'automotive', 5),
('Vehicle Inspection & Testing', 'vehicle-inspection-testing', 'Vehicle inspection and certification services', 'automotive', 5);

-- IT & INTERNET SUBCATEGORIES
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('IT Services & Consulting', 'it-services-consulting', 'IT consulting and services', 'it', 6),
('Internet Cafés', 'internet-cafes', 'Internet cafés and computer lounges', 'it', 6),
('Cloud Hosting & Data Centers', 'cloud-hosting-data-centers', 'Cloud hosting and data center services', 'it', 6),
('Software Development', 'software-development', 'Software development and programming', 'it', 6),
('Cybersecurity Services', 'cybersecurity-services', 'Cybersecurity and data protection services', 'it', 6),
('Digital Marketing Services', 'digital-marketing-services', 'Digital marketing and online advertising', 'it', 6),
('Technology', 'technology', 'General technology companies and services', 'it', 6);

-- REAL ESTATE SUBCATEGORIES
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Real Estate Agencies', 'real-estate-agencies', 'Property sales and rental agencies', 'real-estate', 7),
('Real Estate Developers', 'real-estate-developers', 'Real estate development and construction', 'real-estate', 7),
('Property Management', 'property-management', 'Property management and maintenance services', 'real-estate', 7),
('Real Estate Valuation', 'real-estate-valuation', 'Property valuation and appraisal services', 'real-estate', 7),
('Real Estate Promotion', 'real-estate-promotion', 'Real estate marketing and promotion', 'real-estate', 7);

-- ACCOUNTING, LEGAL & ADVISORY SERVICES SUBCATEGORIES
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Audit & Consulting', 'audit-consulting', 'Audit and business consulting', 'advisory', 8),
('Chartered Accountants', 'chartered-accountants', 'Professional accounting services', 'advisory', 8),
('Law Firms', 'law-firms', 'Legal services and law firms', 'advisory', 8),
('Tax Advisory', 'tax-advisory', 'Tax planning and advisory services', 'advisory', 8),
('Business Advisory', 'business-advisory', 'General business consulting and advisory', 'advisory', 8);

-- TOURISM & LEISURE SUBCATEGORIES
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Travel Agencies', 'travel-agencies', 'Travel booking and tour agencies', 'tourism', 9),
('Hotels', 'hotels', 'Hotel accommodations', 'tourism', 9),
('Hostels & Guesthouses', 'hostels-guesthouses', 'Budget accommodations and guesthouses', 'tourism', 9),
('Tour Operators', 'tour-operators', 'Tour operations and excursions', 'tourism', 9),
('Event & Leisure Activities', 'event-leisure-activities', 'Entertainment and leisure activities', 'tourism', 9);

-- HEALTH SUBCATEGORIES
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Hospitals & Clinics', 'hospitals-clinics', 'Hospitals, clinics and medical centers', 'health', 10),
('Doctors & Specialists', 'doctors-specialists', 'Medical practitioners and specialists', 'health', 10),
('Pharmacies', 'pharmacies', 'Pharmacies and drug stores', 'health', 10),
('Medical Laboratories', 'medical-laboratories', 'Medical testing and laboratory services', 'health', 10),
('Imaging Centers', 'imaging-centers', 'Medical imaging facilities (X-ray, MRI, CT)', 'health', 10),
('Dental Clinics', 'dental-clinics', 'Dental care and clinics', 'health', 10),
('Veterinary Clinics', 'veterinary-clinics', 'Veterinary and animal healthcare', 'health', 10);

-- ADMINISTRATIONS SUBCATEGORIES
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Government Institutions', 'government-institutions', 'Government offices and institutions', 'admin', 11),
('Ministries & Agencies', 'ministries-agencies', 'Government ministries and agencies', 'admin', 11),
('Embassies & Consulates', 'embassies-consulates', 'Foreign diplomatic missions', 'admin', 11),
('Associations & NGOs', 'associations-ngos', 'Non-governmental organizations and associations', 'admin', 11),
('Public Authorities', 'public-authorities', 'Public regulatory and municipal authorities', 'admin', 11);

-- FOOD & BEVERAGE SUBCATEGORIES
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Restaurants', 'restaurants', 'Dining establishments and restaurants', 'food', 12),
('Caterers', 'caterers', 'Catering and food service providers', 'food', 12),
('Bakeries & Pastry Shops', 'bakeries-pastry-shops', 'Bakeries and pastry shops', 'food', 12),
('Fishmongers', 'fishmongers', 'Fish and seafood retailers', 'food', 12),
('Food Processing', 'food-processing', 'Food processing and manufacturing', 'food', 12),
('Beverage Production', 'beverage-production', 'Beverage manufacturing and production', 'food', 12);

-- ANIMALS SUBCATEGORIES
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Veterinarians', 'veterinarians', 'Veterinary medical services', 'animals', 13),
('Veterinary Pharmacies', 'veterinary-pharmacies', 'Animal medicine and veterinary supplies', 'animals', 13),
('Pet Shops', 'pet-shops', 'Pet supplies and pet stores', 'animals', 13),
('Animal Breeding', 'animal-breeding', 'Animal breeding and husbandry', 'animals', 13),
('Animal Feed & Nutrition', 'animal-feed-nutrition', 'Animal feed and nutrition products', 'animals', 13);

-- ARTISANS SUBCATEGORIES
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Plumbers', 'plumbers', 'Plumbing services and installations', 'artisans', 14),
('Electricians', 'electricians', 'Electrical services and installations', 'artisans', 14),
('Carpenters', 'carpenters', 'Carpentry and woodworking services', 'artisans', 14),
('Glass & Glazing', 'glass-glazing', 'Glass and glazing services', 'artisans', 14),
('Welders', 'welders', 'Welding and metal work services', 'artisans', 14),
('Painters', 'painters', 'Painting and decoration services', 'artisans', 14);

-- HOME & INTERIOR DESIGN SUBCATEGORIES
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Furniture Stores', 'furniture-stores', 'Furniture retailers and manufacturers', 'home', 15),
('Interior Designers', 'interior-designers', 'Interior design and decoration services', 'home', 15),
('Home Decoration', 'home-decoration', 'Home decor and accessories shops', 'home', 15),
('Art Galleries', 'art-galleries', 'Art galleries and exhibitions', 'home', 15),
('Lighting & Fixtures', 'lighting-fixtures', 'Lighting products and fixtures', 'home', 15);

-- FASHION, CLOTHING & TEXTILES SUBCATEGORIES
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Ready-to-Wear Clothing', 'ready-to-wear-clothing', 'Clothing stores and fashion retailers', 'fashion', 16),
('Tailoring & Sewing', 'tailoring-sewing', 'Custom tailoring and sewing services', 'fashion', 16),
('Fabrics & Textiles', 'fabrics-textiles', 'Fabric and textile wholesalers', 'fashion', 16),
('Uniforms & Workwear', 'uniforms-workwear', 'Uniforms and workwear suppliers', 'fashion', 16),
('Fashion Accessories', 'fashion-accessories', 'Fashion accessories and jewelry stores', 'fashion', 16);

-- TELECOMMUNICATIONS SUBCATEGORIES
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Telephone Operators', 'telephone-operators', 'Mobile and telephone service providers', 'telecom', 17),
('Internet Service Providers', 'internet-service-providers', 'Internet and broadband providers', 'telecom', 17),
('VoIP Services', 'voip-services', 'Voice over IP and telephony services', 'telecom', 17),
('Network Installation', 'network-installation', 'Network setup and installation services', 'telecom', 17),
('Telecommunications Equipment', 'telecommunications-equipment', 'Telecom equipment and supplies', 'telecom', 17);

-- AGRI-FOOD & AGRIBUSINESS SUBCATEGORIES
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Farming & Agriculture', 'farming-agriculture', 'Agricultural production and farming', 'agribusiness', 18),
('Slaughterhouses & Meat Processing', 'slaughterhouses-meat-processing', 'Meat processing and butcheries', 'agribusiness', 18),
('Agrochemicals', 'agrochemicals', 'Fertilizers and agricultural chemicals', 'agribusiness', 18),
('Food Processing Industries', 'food-processing-industries', 'Industrial food processing', 'agribusiness', 18),
('Agricultural Equipment', 'agricultural-equipment', 'Farm machinery and equipment', 'agribusiness', 18);

-- PROFESSIONAL ASSOCIATIONS SUBCATEGORIES
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Confederations', 'confederations', 'Business confederations and federations', 'associations', 19),
('Professional Regulatory Bodies', 'professional-regulatory-bodies', 'Professional regulatory and licensing bodies', 'associations', 19),
('Trade Associations', 'trade-associations', 'Industry and trade associations', 'associations', 19),
('Chambers of Commerce', 'chambers-of-commerce', 'Chambers of commerce and business councils', 'associations', 19);

-- WELLNESS SUBCATEGORIES
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Beauty & Aesthetic Salons', 'beauty-aesthetic-salons', 'Beauty salons and spas', 'wellness', 20),
('Spas & Saunas', 'spas-saunas', 'Spa and sauna facilities', 'wellness', 20),
('Massage & Relaxation', 'massage-relaxation', 'Massage therapy and relaxation services', 'wellness', 20),
('Fitness & Yoga Centers', 'fitness-yoga-centers', 'Gyms, fitness and yoga studios', 'wellness', 20);

-- EMPLOYMENT SUBCATEGORIES
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Recruitment Agencies', 'recruitment-agencies', 'Recruitment and staffing agencies', 'employment', 21),
('Temporary Employment Agencies', 'temporary-employment-agencies', 'Temporary staffing and labor agencies', 'employment', 21),
('HR Consulting', 'hr-consulting', 'Human resources consulting services', 'employment', 21),
('Career Training Centers', 'career-training-centers', 'Career development and training centers', 'employment', 21);

-- ENERGY SUBCATEGORIES
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Energy Production', 'energy-production', 'Power generation and energy production', 'energy', 22),
('Renewable Energy', 'renewable-energy', 'Solar, wind and renewable energy solutions', 'energy', 22),
('Electrical Engineering', 'electrical-engineering', 'Electrical engineering services', 'energy', 22),
('Electromechanical Engineering', 'electromechanical-engineering', 'Electromechanical engineering services', 'energy', 22),
('Power Equipment', 'power-equipment', 'Power equipment and generators', 'energy', 22);

-- EDUCATION & TRAINING SUBCATEGORIES
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Primary Schools', 'primary-schools', 'Primary and elementary schools', 'education', 23),
('Secondary Schools', 'secondary-schools', 'Secondary and high schools', 'education', 23),
('Technical & Vocational Schools', 'technical-vocational-schools', 'Technical and vocational training', 'education', 23),
('Universities & Colleges', 'universities-colleges', 'Universities and higher education institutions', 'education', 23),
('Training Centers', 'training-centers', 'Professional and skills training centers', 'education', 23);

-- HYGIENE SUBCATEGORIES
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Cleaning Products', 'cleaning-products', 'Cleaning supplies and products', 'hygiene', 24),
('Personal Hygiene Products', 'personal-hygiene-products', 'Personal care and hygiene products', 'hygiene', 24),
('Industrial Cleaning Supplies', 'industrial-cleaning-supplies', 'Industrial cleaning equipment and supplies', 'hygiene', 24);

-- IMPORT & EXPORT SUBCATEGORIES
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Trading Companies', 'trading-companies', 'International trading companies', 'import-export', 25),
('Purchasing Groups', 'purchasing-groups', 'Bulk purchasing and group buying', 'import-export', 25),
('Importers', 'importers', 'Import and distribution companies', 'import-export', 25),
('Exporters', 'exporters', 'Export trading and logistics', 'import-export', 25),
('Logistics & Customs Services', 'logistics-customs-services', 'Freight forwarding and customs brokerage', 'import-export', 25);

-- INDUSTRIES SUBCATEGORIES
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Manufacturing', 'manufacturing', 'General manufacturing and production', 'industries', 26),
('Mining', 'mining', 'Mining and mineral extraction', 'industries', 26),
('Brewery', 'brewery', 'Breweries and beer production', 'industries', 26),
('Cardboard Manufacturing', 'cardboard-manufacturing', 'Cardboard and packaging manufacturing', 'industries', 26),
('Industrial Processing', 'industrial-processing', 'Industrial processing and transformation', 'industries', 26);

-- SECURITY SUBCATEGORIES
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Security Guarding', 'security-guarding', 'Security guards and protective services', 'security', 27),
('Alarm & Surveillance Systems', 'alarm-surveillance-systems', 'Security systems and surveillance equipment', 'security', 27),
('Cybersecurity', 'cybersecurity', 'Cybersecurity and information protection', 'security', 27),
('Access Control Systems', 'access-control-systems', 'Access control and entry systems', 'security', 27);

-- SERVICES (GENERAL) SUBCATEGORIES
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Industrial Cleaning', 'industrial-cleaning', 'Industrial facility cleaning services', 'services', 28),
('Express Courier Services', 'express-courier-services', 'Courier and delivery services', 'services', 28),
('Maintenance Services', 'maintenance-services', 'General maintenance and repair services', 'services', 28),
('Outsourcing Services', 'outsourcing-services', 'Business process outsourcing services', 'services', 28);

-- SPORT SUBCATEGORIES
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Sporting Goods Stores', 'sporting-goods-stores', 'Sports equipment and apparel retailers', 'sport', 29),
('Sports Clubs', 'sports-clubs', 'Sports clubs and teams', 'sport', 29),
('Sports Complexes & Stadiums', 'sports-complexes-stadiums', 'Sports facilities and stadiums', 'sport', 29),
('Fitness Facilities', 'fitness-facilities', 'Gyms and fitness centers', 'sport', 29);

-- TRANSPORT & LOGISTICS SUBCATEGORIES
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Airports', 'airports', 'Airport facilities and services', 'transport', 30),
('Air Transport', 'air-transport', 'Airlines and air freight services', 'transport', 30),
('Road Transport', 'road-transport', 'Trucking and road haulage services', 'transport', 30),
('Maritime Transport', 'maritime-transport', 'Shipping and maritime services', 'transport', 30),
('Logistics & Freight', 'logistics-freight', 'Logistics and freight forwarding', 'transport', 30);

-- EMERGENCY SERVICES SUBCATEGORIES
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Ambulance Services', 'ambulance-services', 'Medical transportation and ambulance services', 'emergency', 31),
('Fire Services', 'fire-services', 'Fire department and firefighting services', 'emergency', 31),
('Police', 'police', 'Police and law enforcement services', 'emergency', 31),
('Civil Protection', 'civil-protection', 'Civil protection and disaster response', 'emergency', 31);

-- OTHERS SUBCATEGORIES
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Religious Institutions & Places of Worship', 'religious-institutions-places-of-worship', 'Temples, churches, mosques and religious centers', 'others', 32),
('Marine Engines', 'marine-engines', 'Marine engines and nautical equipment', 'others', 32),
('Specialized Niche Services', 'specialized-niche-services', 'Specialized and niche business services', 'others', 32);
