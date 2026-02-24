-- ============================================================
-- MASTER BUSINESS CATEGORY TAXONOMY SEED DATA
-- Complete 27 Main Categories + 130+ Subcategories
-- ============================================================

-- Backup existing categories (optional, comment out if not needed)
-- CREATE TABLE business_categories_backup AS SELECT * FROM business_categories;

-- Clear existing categories (WARNING: This will delete current data)
-- Uncomment only if you have a backup
-- TRUNCATE TABLE business_categories CASCADE;

-- ============================================================
-- CATEGORY INSERTION STRATEGY:
-- Main categories have NULL parent_id
-- Subcategories have parent_id pointing to their main category
-- ============================================================

-- MAIN CATEGORIES
-- 1. COMMUNICATION & ADVERTISING
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Communication & Advertising', 'communication-advertising', 'Communication and advertising companies. Media, radio, television, events, publishers, printers, promotional items, corporate gifts.', 'communication', NULL);
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

-- 2. BUILDING & CONSTRUCTION
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Building & Construction', 'building-construction', 'Building companies, civil engineering, public works, construction materials and equipment.', 'building', NULL);
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Construction Companies', 'construction-companies', 'General construction and building contractors', 'building', 11),
('Civil Engineering & Public Works', 'civil-engineering-public-works', 'Civil engineering and infrastructure projects', 'building', 11),
('Construction Materials', 'construction-materials', 'Construction materials suppliers', 'building', 11),
('Heavy Machinery & Equipment', 'heavy-machinery-equipment', 'Heavy equipment and machinery rentals/sales', 'building', 11),
('Water Supply Systems', 'water-supply-systems', 'Water supply and installation services', 'building', 11),
('Aluminum & Metal Structures', 'aluminum-metal-structures', 'Aluminum and metal structural work', 'building', 11),
('Roads & Infrastructure', 'roads-infrastructure', 'Road construction and infrastructure', 'building', 11);

-- 3. FINANCE
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Finance', 'finance', 'Banking, insurance and financial services.', 'finance', NULL);
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Banks & Financial Institutions', 'banks-financial-institutions', 'Commercial and investment banks', 'finance', 19),
('Insurance Providers', 'insurance-providers', 'Insurance companies and providers', 'finance', 19),
('Insurance Brokers', 'insurance-brokers', 'Insurance brokerage services', 'finance', 19),
('Microfinance Institutions', 'microfinance-institutions', 'Microfinance and small loan providers', 'finance', 19),
('Investment & Asset Management', 'investment-asset-management', 'Investment and asset management services', 'finance', 19),
('Payment & Fintech Services', 'payment-fintech-services', 'Payment processing and fintech services', 'finance', 19);

-- 4. COMMERCE
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Commerce', 'commerce', 'Retail shops, stores and general commercial services.', 'commerce', NULL);
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Supermarkets & Grocery Stores', 'supermarkets-grocery-stores', 'Grocery and supermarket retailers', 'commerce', 26),
('Hardware Stores', 'hardware-stores', 'Hardware and DIY stores', 'commerce', 26),
('Wholesale & Distribution', 'wholesale-distribution', 'Wholesale suppliers and distributors', 'commerce', 26),
('Convenience Stores', 'convenience-stores', '24/7 convenience shops', 'commerce', 26),
('E-commerce & Online Shops', 'e-commerce-online-shops', 'Online retail and e-commerce platforms', 'commerce', 26);

-- 5. AUTOMOTIVE & MOTORBIKE
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Automotive & Motorbike', 'automotive-motorbike', 'Automobile and motorcycle services.', 'automotive', NULL);
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Car Sales & Dealerships', 'car-sales-dealerships', 'Car and automobile sales', 'automotive', 32),
('Motorcycle & Scooter Sales', 'motorcycle-scooter-sales', 'Motorcycle and scooter sales', 'automotive', 32),
('Auto Repair & Garages', 'auto-repair-garages', 'Vehicle repair and maintenance services', 'automotive', 32),
('Spare Parts & Accessories', 'spare-parts-accessories', 'Auto parts and accessories shops', 'automotive', 32),
('Vehicle Inspection & Testing', 'vehicle-inspection-testing', 'Vehicle inspection and certification services', 'automotive', 32);

-- 6. IT & INTERNET
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('IT & Internet', 'it-internet', 'IT, internet and digital technology services.', 'it', NULL);
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('IT Services & Consulting', 'it-services-consulting', 'IT consulting and services', 'it', 38),
('Internet Cafés', 'internet-cafes', 'Internet cafés and computer lounges', 'it', 38),
('Cloud Hosting & Data Centers', 'cloud-hosting-data-centers', 'Cloud hosting and data center services', 'it', 38),
('Software Development', 'software-development', 'Software development and programming', 'it', 38),
('Cybersecurity Services', 'cybersecurity-services', 'Cybersecurity and data protection services', 'it', 38),
('Digital Marketing Services', 'digital-marketing-services', 'Digital marketing and online advertising', 'it', 38);

-- 7. REAL ESTATE
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Real Estate', 'real-estate', 'Real estate listings, agencies and development.', 'real-estate', NULL);
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Real Estate Agencies', 'real-estate-agencies', 'Property sales and rental agencies', 'real-estate', 45),
('Real Estate Developers', 'real-estate-developers', 'Real estate development and construction', 'real-estate', 45),
('Property Management', 'property-management', 'Property management and maintenance services', 'real-estate', 45),
('Real Estate Valuation', 'real-estate-valuation', 'Property valuation and appraisal services', 'real-estate', 45),
('Real Estate Promotion', 'real-estate-promotion', 'Real estate marketing and promotion', 'real-estate', 45);

-- 8. ACCOUNTING, LEGAL & ADVISORY SERVICES
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Accounting, Legal & Advisory Services', 'accounting-legal-advisory', 'Accounting, legal and business advisory services.', 'advisory', NULL);
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Audit & Consulting', 'audit-consulting', 'Audit and business consulting', 'advisory', 51),
('Chartered Accountants', 'chartered-accountants', 'Professional accounting services', 'advisory', 51),
('Law Firms', 'law-firms', 'Legal services and law firms', 'advisory', 51),
('Tax Advisory', 'tax-advisory', 'Tax planning and advisory services', 'advisory', 51),
('Business Advisory', 'business-advisory', 'General business consulting and advisory', 'advisory', 51);

-- 9. TOURISM & LEISURE
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Tourism & Leisure', 'tourism-leisure', 'Tours, hospitality, transport, events and leisure.', 'tourism', NULL);
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Travel Agencies', 'travel-agencies', 'Travel booking and tour agencies', 'tourism', 57),
('Hotels', 'hotels', 'Hotel accommodations', 'tourism', 57),
('Hostels & Guesthouses', 'hostels-guesthouses', 'Budget accommodations and guesthouses', 'tourism', 57),
('Tour Operators', 'tour-operators', 'Tour operations and excursions', 'tourism', 57),
('Event & Leisure Activities', 'event-leisure-activities', 'Entertainment and leisure activities', 'tourism', 57);

-- 10. HEALTH
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Health', 'health', 'Medical and healthcare services.', 'health', NULL);
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Hospitals & Clinics', 'hospitals-clinics', 'Hospitals, clinics and medical centers', 'health', 63),
('Doctors & Specialists', 'doctors-specialists', 'Medical practitioners and specialists', 'health', 63),
('Pharmacies', 'pharmacies', 'Pharmacies and drug stores', 'health', 63),
('Medical Laboratories', 'medical-laboratories', 'Medical testing and laboratory services', 'health', 63),
('Imaging Centers', 'imaging-centers', 'Medical imaging facilities (X-ray, MRI, CT)', 'health', 63),
('Dental Clinics', 'dental-clinics', 'Dental care and clinics', 'health', 63),
('Veterinary Clinics', 'veterinary-clinics', 'Veterinary and animal healthcare', 'health', 63);

-- 11. ADMINISTRATIONS
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Administrations', 'administrations', 'Public institutions and government services.', 'admin', NULL);
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Government Institutions', 'government-institutions', 'Government offices and institutions', 'admin', 71),
('Ministries & Agencies', 'ministries-agencies', 'Government ministries and agencies', 'admin', 71),
('Embassies & Consulates', 'embassies-consulates', 'Foreign diplomatic missions', 'admin', 71),
('Associations & NGOs', 'associations-ngos', 'Non-governmental organizations and associations', 'admin', 71),
('Public Authorities', 'public-authorities', 'Public regulatory and municipal authorities', 'admin', 71);

-- 12. FOOD & BEVERAGE
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Food & Beverage', 'food-beverage', 'Restaurants, food shops and culinary services.', 'food', NULL);
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Restaurants', 'restaurants', 'Dining establishments and restaurants', 'food', 77),
('Caterers', 'caterers', 'Catering and food service providers', 'food', 77),
('Bakeries & Pastry Shops', 'bakeries-pastry-shops', 'Bakeries and pastry shops', 'food', 77),
('Fishmongers', 'fishmongers', 'Fish and seafood retailers', 'food', 77),
('Food Processing', 'food-processing', 'Food processing and manufacturing', 'food', 77),
('Beverage Production', 'beverage-production', 'Beverage manufacturing and production', 'food', 77);

-- 13. ANIMALS
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Animals', 'animals', 'Animal care and pet-related services.', 'animals', NULL);
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Veterinarians', 'veterinarians', 'Veterinary medical services', 'animals', 84),
('Veterinary Pharmacies', 'veterinary-pharmacies', 'Animal medicine and veterinary supplies', 'animals', 84),
('Pet Shops', 'pet-shops', 'Pet supplies and pet stores', 'animals', 84),
('Animal Breeding', 'animal-breeding', 'Animal breeding and husbandry', 'animals', 84),
('Animal Feed & Nutrition', 'animal-feed-nutrition', 'Animal feed and nutrition products', 'animals', 84);

-- 14. ARTISANS
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Artisans', 'artisans', 'Skilled artisans and craft professionals.', 'artisans', NULL);
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Plumbers', 'plumbers', 'Plumbing services and installations', 'artisans', 90),
('Electricians', 'electricians', 'Electrical services and installations', 'artisans', 90),
('Carpenters', 'carpenters', 'Carpentry and woodworking services', 'artisans', 90),
('Glass & Glazing', 'glass-glazing', 'Glass and glazing services', 'artisans', 90),
('Welders', 'welders', 'Welding and metal work services', 'artisans', 90),
('Painters', 'painters', 'Painting and decoration services', 'artisans', 90);

-- 15. HOME & INTERIOR DESIGN
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Home & Interior Design', 'home-interior-design', 'Home, furniture and interior decoration.', 'home', NULL);
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Furniture Stores', 'furniture-stores', 'Furniture retailers and manufacturers', 'home', 97),
('Interior Designers', 'interior-designers', 'Interior design and decoration services', 'home', 97),
('Home Decoration', 'home-decoration', 'Home decor and accessories shops', 'home', 97),
('Art Galleries', 'art-galleries', 'Art galleries and exhibitions', 'home', 97),
('Lighting & Fixtures', 'lighting-fixtures', 'Lighting products and fixtures', 'home', 97);

-- 16. FASHION, CLOTHING & TEXTILES
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Fashion, Clothing & Textiles', 'fashion-clothing-textiles', 'Apparel, fabrics and textile services.', 'fashion', NULL);
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Ready-to-Wear Clothing', 'ready-to-wear-clothing', 'Clothing stores and fashion retailers', 'fashion', 103),
('Tailoring & Sewing', 'tailoring-sewing', 'Custom tailoring and sewing services', 'fashion', 103),
('Fabrics & Textiles', 'fabrics-textiles', 'Fabric and textile wholesalers', 'fashion', 103),
('Uniforms & Workwear', 'uniforms-workwear', 'Uniforms and workwear suppliers', 'fashion', 103),
('Fashion Accessories', 'fashion-accessories', 'Fashion accessories and jewelry stores', 'fashion', 103);

-- 17. TELECOMMUNICATIONS
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Telecommunications', 'telecommunications', 'Telecom operators and network services.', 'telecom', NULL);
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Telephone Operators', 'telephone-operators', 'Mobile and telephone service providers', 'telecom', 109),
('Internet Service Providers', 'internet-service-providers', 'Internet and broadband providers', 'telecom', 109),
('VoIP Services', 'voip-services', 'Voice over IP and telephony services', 'telecom', 109),
('Network Installation', 'network-installation', 'Network setup and installation services', 'telecom', 109),
('Telecommunications Equipment', 'telecommunications-equipment', 'Telecom equipment and supplies', 'telecom', 109);

-- 18. AGRI-FOOD & AGRIBUSINESS
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Agri-Food & Agribusiness', 'agri-food-agribusiness', 'Agriculture, food production and processing.', 'agribusiness', NULL);
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Farming & Agriculture', 'farming-agriculture', 'Agricultural production and farming', 'agribusiness', 115),
('Slaughterhouses & Meat Processing', 'slaughterhouses-meat-processing', 'Meat processing and butcheries', 'agribusiness', 115),
('Agrochemicals', 'agrochemicals', 'Fertilizers and agricultural chemicals', 'agribusiness', 115),
('Food Processing Industries', 'food-processing-industries', 'Industrial food processing', 'agribusiness', 115),
('Agricultural Equipment', 'agricultural-equipment', 'Farm machinery and equipment', 'agribusiness', 115);

-- 19. PROFESSIONAL ASSOCIATIONS
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Professional Associations', 'professional-associations', 'Trade bodies and professional organizations.', 'associations', NULL);
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Confederations', 'confederations', 'Business confederations and federations', 'associations', 121),
('Professional Regulatory Bodies', 'professional-regulatory-bodies', 'Professional regulatory and licensing bodies', 'associations', 121),
('Trade Associations', 'trade-associations', 'Industry and trade associations', 'associations', 121),
('Chambers of Commerce', 'chambers-of-commerce', 'Chambers of commerce and business councils', 'associations', 121);

-- 20. WELLNESS
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Wellness', 'wellness', 'Wellness, beauty and relaxation services.', 'wellness', NULL);
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Beauty & Aesthetic Salons', 'beauty-aesthetic-salons', 'Beauty salons and spas', 'wellness', 126),
('Spas & Saunas', 'spas-saunas', 'Spa and sauna facilities', 'wellness', 126),
('Massage & Relaxation', 'massage-relaxation', 'Massage therapy and relaxation services', 'wellness', 126),
('Fitness & Yoga Centers', 'fitness-yoga-centers', 'Gyms, fitness and yoga studios', 'wellness', 126);

-- 21. EMPLOYMENT
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Employment', 'employment', 'Jobs, recruitment and staffing services.', 'employment', NULL);
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Recruitment Agencies', 'recruitment-agencies', 'Recruitment and staffing agencies', 'employment', 131),
('Temporary Employment Agencies', 'temporary-employment-agencies', 'Temporary staffing and labor agencies', 'employment', 131),
('HR Consulting', 'hr-consulting', 'Human resources consulting services', 'employment', 131),
('Career Training Centers', 'career-training-centers', 'Career development and training centers', 'employment', 131);

-- 22. ENERGY
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Energy', 'energy', 'Energy production and power solutions.', 'energy', NULL);
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Energy Production', 'energy-production', 'Power generation and energy production', 'energy', 136),
('Renewable Energy', 'renewable-energy', 'Solar, wind and renewable energy solutions', 'energy', 136),
('Electrical Engineering', 'electrical-engineering', 'Electrical engineering services', 'energy', 136),
('Electromechanical Engineering', 'electromechanical-engineering', 'Electromechanical engineering services', 'energy', 136),
('Power Equipment', 'power-equipment', 'Power equipment and generators', 'energy', 136);

-- 23. EDUCATION & TRAINING
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Education & Training', 'education-training', 'Schools, universities and training centers.', 'education', NULL);
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Primary Schools', 'primary-schools', 'Primary and elementary schools', 'education', 142),
('Secondary Schools', 'secondary-schools', 'Secondary and high schools', 'education', 142),
('Technical & Vocational Schools', 'technical-vocational-schools', 'Technical and vocational training', 'education', 142),
('Universities & Colleges', 'universities-colleges', 'Universities and higher education institutions', 'education', 142),
('Training Centers', 'training-centers', 'Professional and skills training centers', 'education', 142);

-- 24. HYGIENE
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Hygiene', 'hygiene', 'Personal hygiene and cleaning products.', 'hygiene', NULL);
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Cleaning Products', 'cleaning-products', 'Cleaning supplies and products', 'hygiene', 148),
('Personal Hygiene Products', 'personal-hygiene-products', 'Personal care and hygiene products', 'hygiene', 148),
('Industrial Cleaning Supplies', 'industrial-cleaning-supplies', 'Industrial cleaning equipment and supplies', 'hygiene', 148);

-- 25. IMPORT & EXPORT
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Import & Export', 'import-export', 'International trade and wholesale services.', 'import-export', NULL);
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Trading Companies', 'trading-companies', 'International trading companies', 'import-export', 152),
('Purchasing Groups', 'purchasing-groups', 'Bulk purchasing and group buying', 'import-export', 152),
('Importers', 'importers', 'Import and distribution companies', 'import-export', 152),
('Exporters', 'exporters', 'Export trading and logistics', 'import-export', 152),
('Logistics & Customs Services', 'logistics-customs-services', 'Freight forwarding and customs brokerage', 'import-export', 152);

-- 26. INDUSTRIES
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Industries', 'industries', 'Manufacturing, mining and industrial activities.', 'industries', NULL);
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Manufacturing', 'manufacturing', 'General manufacturing and production', 'industries', 158),
('Mining', 'mining', 'Mining and mineral extraction', 'industries', 158),
('Brewery', 'brewery', 'Breweries and beer production', 'industries', 158),
('Cardboard Manufacturing', 'cardboard-manufacturing', 'Cardboard and packaging manufacturing', 'industries', 158),
('Industrial Processing', 'industrial-processing', 'Industrial processing and transformation', 'industries', 158);

-- 27. SECURITY
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Security', 'security', 'Security services and protection solutions.', 'security', NULL);
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Security Guarding', 'security-guarding', 'Security guards and protective services', 'security', 164),
('Alarm & Surveillance Systems', 'alarm-surveillance-systems', 'Security systems and surveillance equipment', 'security', 164),
('Cybersecurity', 'cybersecurity', 'Cybersecurity and information protection', 'security', 164),
('Access Control Systems', 'access-control-systems', 'Access control and entry systems', 'security', 164);

-- 28. SERVICES (GENERAL)
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Services (General)', 'services-general', 'Professional and specialized service providers.', 'services', NULL);
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Industrial Cleaning', 'industrial-cleaning', 'Industrial facility cleaning services', 'services', 169),
('Express Courier Services', 'express-courier-services', 'Courier and delivery services', 'services', 169),
('Maintenance Services', 'maintenance-services', 'General maintenance and repair services', 'services', 169),
('Outsourcing Services', 'outsourcing-services', 'Business process outsourcing services', 'services', 169);

-- 29. SPORT
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Sport', 'sport', 'Sports clubs, facilities and activities.', 'sport', NULL);
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Sporting Goods Stores', 'sporting-goods-stores', 'Sports equipment and apparel retailers', 'sport', 174),
('Sports Clubs', 'sports-clubs', 'Sports clubs and teams', 'sport', 174),
('Sports Complexes & Stadiums', 'sports-complexes-stadiums', 'Sports facilities and stadiums', 'sport', 174),
('Fitness Facilities', 'fitness-facilities', 'Gyms and fitness centers', 'sport', 174);

-- 30. TRANSPORT & LOGISTICS
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Transport & Logistics', 'transport-logistics', 'Transport, logistics and mobility services.', 'transport', NULL);
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Airports', 'airports', 'Airport facilities and services', 'transport', 179),
('Air Transport', 'air-transport', 'Airlines and air freight services', 'transport', 179),
('Road Transport', 'road-transport', 'Trucking and road haulage services', 'transport', 179),
('Maritime Transport', 'maritime-transport', 'Shipping and maritime services', 'transport', 179),
('Logistics & Freight', 'logistics-freight', 'Logistics and freight forwarding', 'transport', 179);

-- 31. EMERGENCY SERVICES
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Emergency Services', 'emergency-services', 'Emergency response and public safety services.', 'emergency', NULL);
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Ambulance Services', 'ambulance-services', 'Medical transportation and ambulance services', 'emergency', 185),
('Fire Services', 'fire-services', 'Fire department and firefighting services', 'emergency', 185),
('Police', 'police', 'Police and law enforcement services', 'emergency', 185),
('Civil Protection', 'civil-protection', 'Civil protection and disaster response', 'emergency', 185);

-- 32. OTHERS
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Others', 'others', 'Unclassified or exceptional activities.', 'others', NULL);
INSERT INTO business_categories (name, slug, description, main_category, parent_id) VALUES
('Religious Institutions & Places of Worship', 'religious-institutions-places-of-worship', 'Temples, churches, mosques and religious centers', 'others', 190),
('Marine Engines', 'marine-engines', 'Marine engines and nautical equipment', 'others', 190),
('Specialized Niche Services', 'specialized-niche-services', 'Specialized and niche business services', 'others', 190);

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================
-- SELECT COUNT(*) as total_categories FROM business_categories;
-- SELECT COUNT(DISTINCT parent_id) as main_categories FROM business_categories WHERE parent_id IS NULL;
-- SELECT name, COUNT(*) as subcategory_count FROM business_categories WHERE parent_id IS NOT NULL GROUP BY parent_id ORDER BY name;
