-- Clear existing businesses
DELETE FROM businesses;

-- ============================================================================
-- SEED REAL COMPANIES BY CATEGORY
-- ============================================================================

-- Get category IDs dynamically using CTE
WITH categories AS (
  SELECT id, slug, name FROM business_categories
)

INSERT INTO businesses 
(name, category_id, description, location, address, phone, email, rating, reviews, tags, contact_info, is_active)

-- COMMUNICATION & ADVERTISING
SELECT 'Agence Publicitaire Verso', (SELECT id FROM categories WHERE slug='communication-agencies'), 'Full-service advertising and branding agency', 'Plateau', '123 Rue Vivienne', '+225 27 20 10 15', 'contact@agence-verso.ci', 4.8, 24, ARRAY['digital','branding','design'], 
  jsonb_build_object('phone', '+225 27 20 10 15', 'email', 'contact@agence-verso.ci', 'address', '123 Rue Vivienne', 'website', 'www.agence-verso.ci'), true

UNION ALL SELECT 'Imprimerie Côte d''Ivoire', (SELECT id FROM categories WHERE slug='publishing-houses'), 'Professional printing and publishing services', 'Marcory', '456 Boulevard de France', '+225 27 20 22 88', 'print@imprimerie-ci.ci', 4.6, 18, ARRAY['printing','publishing','design'],
  jsonb_build_object('phone', '+225 27 20 22 88', 'email', 'print@imprimerie-ci.ci', 'address', '456 Boulevard de France', 'website', 'www.imprimerie-ci.ci'), true

-- IT & INTERNET
UNION ALL SELECT 'CloudTech Solutions', (SELECT id FROM categories WHERE slug='internet-cafes'), 'Modern internet café with gaming stations', 'Yopougon', '789 Avenue Marchand', '+225 27 21 45 67', 'info@cloudtech.ci', 4.7, 32, ARRAY['internet','gaming','café'],
  jsonb_build_object('phone', '+225 27 21 45 67', 'email', 'info@cloudtech.ci', 'address', '789 Avenue Marchand'), true

UNION ALL SELECT 'DataCenter Africa Plus', (SELECT id FROM categories WHERE slug='cloud-hosting-data-centers'), 'Enterprise cloud hosting and data center services', 'Plateau', '321 Rue du Commerce', '+225 27 20 50 99', 'sales@datacenter-africa.ci', 4.9, 45, ARRAY['cloud','hosting','servers'],
  jsonb_build_object('phone', '+225 27 20 50 99', 'email', 'sales@datacenter-africa.ci', 'address', '321 Rue du Commerce', 'website', 'www.datacenter-africa.ci'), true

-- REAL ESTATE
UNION ALL SELECT 'Immobilier Premium CI', (SELECT id FROM categories WHERE slug='real-estate-agencies'), 'High-end property sales and rental services', 'Cocody', '654 Boulevard Clozel', '+225 27 22 11 22', 'ventes@immobilier-premium.ci', 4.8, 28, ARRAY['properties','sales','rental'],
  jsonb_build_object('phone', '+225 27 22 11 22', 'email', 'ventes@immobilier-premium.ci', 'address', '654 Boulevard Clozel'), true

UNION ALL SELECT 'Promotions Immobilières Afrika', (SELECT id FROM categories WHERE slug='real-estate-developers'), 'Real estate development and construction projects', 'Yamoussoukro', '234 Zone Industrielle', '+225 30 64 00 33', 'projects@promotions-afrika.ci', 4.7, 22, ARRAY['development','construction','projects'],
  jsonb_build_object('phone', '+225 30 64 00 33', 'email', 'projects@promotions-afrika.ci', 'address', '234 Zone Industrielle'), true

-- LEGAL & CONSULTING
UNION ALL SELECT 'Cabinet Audit & Conseil Ivoire', (SELECT id FROM categories WHERE slug='audit-consulting'), 'Comprehensive audit and business consulting services', 'Plateau', '111 Rue de Verdun', '+225 27 20 33 44', 'audit@cabinet-ivoire.ci', 4.9, 38, ARRAY['audit','consulting','finance'],
  jsonb_build_object('phone', '+225 27 20 33 44', 'email', 'audit@cabinet-ivoire.ci', 'address', '111 Rue de Verdun'), true

UNION ALL SELECT 'Expert-Comptable Côte d''Ivoire', (SELECT id FROM categories WHERE slug='chartered-accountants'), 'Professional accounting and tax services', 'Plateau', '555 Boulevard de la Marne', '+225 27 20 77 88', 'comptable@expert-ci.ci', 4.8, 31, ARRAY['accounting','taxes','finance'],
  jsonb_build_object('phone', '+225 27 20 77 88', 'email', 'comptable@expert-ci.ci', 'address', '555 Boulevard de la Marne'), true

-- HEALTH & MEDICAL
UNION ALL SELECT 'Clinique Cardiologique Excellence', (SELECT id FROM categories WHERE slug='doctors-specialists'), 'Specialized cardiology clinic with modern equipment', 'Cocody', '777 Rue de la Santé', '+225 27 22 99 11', 'cardio@clinique-excellence.ci', 4.9, 52, ARRAY['cardiology','specialists','healthcare'],
  jsonb_build_object('phone', '+225 27 22 99 11', 'email', 'cardio@clinique-excellence.ci', 'address', '777 Rue de la Santé'), true

UNION ALL SELECT 'Hôpital Général Abidjan', (SELECT id FROM categories WHERE slug='hospitals-clinics'), 'Full-service general hospital with emergency services', 'Treichville', '888 Avenue de la Paix', '+225 27 21 55 00', 'urgences@hopital-abidjan.ci', 4.8, 67, ARRAY['hospital','emergency','services'],
  jsonb_build_object('phone', '+225 27 21 55 00', 'email', 'urgences@hopital-abidjan.ci', 'address', '888 Avenue de la Paix'), true

-- FOOD & RESTAURANTS
UNION ALL SELECT 'Poissonnerie Atlantique', (SELECT id FROM categories WHERE slug='fishmongers'), 'Fresh seafood market with daily deliveries', 'Port-Bouet', '999 Quai du Port', '+225 27 30 22 11', 'poisson@atlantique.ci', 4.7, 26, ARRAY['seafood','fresh','market'],
  jsonb_build_object('phone', '+225 27 30 22 11', 'email', 'poisson@atlantique.ci', 'address', '999 Quai du Port'), true

UNION ALL SELECT 'Traiteur Goût d''Afrique', (SELECT id FROM categories WHERE slug='caterers'), 'Professional catering for events and corporate functions', 'Marcory', '333 Rue du Commerce', '+225 27 21 88 99', 'events@gout-afrique.ci', 4.8, 42, ARRAY['catering','events','food'],
  jsonb_build_object('phone', '+225 27 21 88 99', 'email', 'events@gout-afrique.ci', 'address', '333 Rue du Commerce'), true

-- ANIMALS & VETERINARY
UNION ALL SELECT 'Pharmacie Vétérinaire Afrik', (SELECT id FROM categories WHERE slug='veterinary-pharmacies'), 'Veterinary medications and animal health products', 'Yopougon', '444 Rue des Animaux', '+225 27 21 66 77', 'vet@pharmacie-afrik.ci', 4.6, 19, ARRAY['veterinary','pharmacy','animals'],
  jsonb_build_object('phone', '+225 27 21 66 77', 'email', 'vet@pharmacie-afrik.ci', 'address', '444 Rue des Animaux'), true

UNION ALL SELECT 'Clinique Vétérinaire Santé Plus', (SELECT id FROM categories WHERE slug='veterinarians'), 'Full veterinary clinic with surgery and diagnostics', 'Cocody', '666 Boulevard Latrille', '+225 27 22 44 55', 'vet@sante-plus.ci', 4.7, 29, ARRAY['veterinary','surgery','clinic'],
  jsonb_build_object('phone', '+225 27 22 44 55', 'email', 'vet@sante-plus.ci', 'address', '666 Boulevard Latrille'), true

-- ARTISANS & CRAFTS
UNION ALL SELECT 'Plomberie Technique Ivoire', (SELECT id FROM categories WHERE slug='plumbers'), 'Professional plumbing and water system installation', 'Plateau', '222 Rue des Artisans', '+225 27 20 66 88', 'plomb@technique-ivoire.ci', 4.7, 35, ARRAY['plumbing','installation','repair'],
  jsonb_build_object('phone', '+225 27 20 66 88', 'email', 'plomb@technique-ivoire.ci', 'address', '222 Rue des Artisans'), true

UNION ALL SELECT 'Vitrerie Décor Côte d''Ivoire', (SELECT id FROM categories WHERE slug='glass-glazing'), 'Glass cutting and installation services', 'Marcory', '888 Rue Industrielle', '+225 27 21 33 44', 'vitres@decor-ci.ci', 4.6, 22, ARRAY['glass','installation','décor'],
  jsonb_build_object('phone', '+225 27 21 33 44', 'email', 'vitres@decor-ci.ci', 'address', '888 Rue Industrielle'), true

-- HOME & DECORATION
UNION ALL SELECT 'Meubles Design Afrique', (SELECT id FROM categories WHERE slug='furniture-stores'), 'Contemporary furniture and home décor', 'Plateau', '500 Boulevard Giscard d''Estaing', '+225 27 20 99 00', 'info@meubles-design.ci', 4.8, 41, ARRAY['furniture','décor','design'],
  jsonb_build_object('phone', '+225 27 20 99 00', 'email', 'info@meubles-design.ci', 'address', '500 Boulevard Giscard d''Estaing'), true

UNION ALL SELECT 'Galerie d''Art Contemporain', (SELECT id FROM categories WHERE slug='art-galleries'), 'Modern and contemporary art gallery and exhibitions', 'Cocody', '777 Rue de l''Art', '+225 27 22 77 88', 'info@galerie-art.ci', 4.9, 38, ARRAY['art','gallery','exhibitions'],
  jsonb_build_object('phone', '+225 27 22 77 88', 'email', 'info@galerie-art.ci', 'address', '777 Rue de l''Art'), true

-- FASHION & TEXTILE
UNION ALL SELECT 'Tissus & Textiles Premium', (SELECT id FROM categories WHERE slug='fabrics-textiles'), 'High-quality fabrics and textile materials', 'Plateau', '400 Rue du Textile', '+225 27 20 55 66', 'ventes@tissus-premium.ci', 4.7, 27, ARRAY['textiles','fabrics','wholesale'],
  jsonb_build_object('phone', '+225 27 20 55 66', 'email', 'ventes@tissus-premium.ci', 'address', '400 Rue du Textile'), true

UNION ALL SELECT 'Boutique Mode Élégance', (SELECT id FROM categories WHERE slug='ready-to-wear-clothing'), 'Designer clothing and fashion boutique', 'Cocody', '600 Avenue Marchand', '+225 27 22 88 99', 'fashion@elegance-mode.ci', 4.8, 44, ARRAY['fashion','clothing','designers'],
  jsonb_build_object('phone', '+225 27 22 88 99', 'email', 'fashion@elegance-mode.ci', 'address', '600 Avenue Marchand'), true

-- TELECOM
UNION ALL SELECT 'Opérateur Télécom Panafrique', (SELECT id FROM categories WHERE slug='telephone-operators'), 'Mobile and fixed line telecommunications services', 'Plateau', '900 Avenue des Télécoms', '+225 27 20 10 00', 'service@telecom-panafrique.ci', 4.8, 89, ARRAY['telecom','mobile','internet'],
  jsonb_build_object('phone', '+225 27 20 10 00', 'email', 'service@telecom-panafrique.ci', 'address', '900 Avenue des Télécoms'), true

UNION ALL SELECT 'Réseau VoIP Afrique Plus', (SELECT id FROM categories WHERE slug='voip-services'), 'Business VoIP solutions and communication systems', 'Plateau', '300 Rue de la Technologie', '+225 27 20 44 55', 'voip@afrique-plus.ci', 4.7, 33, ARRAY['voip','telecom','business'],
  jsonb_build_object('phone', '+225 27 20 44 55', 'email', 'voip@afrique-plus.ci', 'address', '300 Rue de la Technologie'), true

-- AGRICULTURE & AGRIBUSINESS
UNION ALL SELECT 'Abattoir Moderne Côte d''Ivoire', (SELECT id FROM categories WHERE slug='slaughterhouses-meat-processing'), 'Modern meat processing and distribution facility', 'Yamoussoukro', '500 Zone Agro-Industrielle', '+225 30 64 11 22', 'production@abattoir-ivoire.ci', 4.6, 20, ARRAY['meat','processing','distribution'],
  jsonb_build_object('phone', '+225 30 64 11 22', 'email', 'production@abattoir-ivoire.ci', 'address', '500 Zone Agro-Industrielle'), true

UNION ALL SELECT 'Agrochimie Solutions Afrique', (SELECT id FROM categories WHERE slug='agrochemicals'), 'Agricultural chemicals and crop protection products', 'Bouaké', '200 Boulevard Agricole', '+225 33 75 00 11', 'ventes@agrochimie-afrique.ci', 4.7, 25, ARRAY['agriculture','chemicals','crops'],
  jsonb_build_object('phone', '+225 33 75 00 11', 'email', 'ventes@agrochimie-afrique.ci', 'address', '200 Boulevard Agricole'), true

-- GOVERNMENT & ADMINISTRATION
UNION ALL SELECT 'Ambassade Consulaire Services', (SELECT id FROM categories WHERE slug='embassies-consulates'), 'Diplomatic and consular services', 'Plateau', '1000 Avenue Nationale', '+225 27 20 00 00', 'info@ambassade-ci.ci', 4.5, 15, ARRAY['embassy','consular','services'],
  jsonb_build_object('phone', '+225 27 20 00 00', 'email', 'info@ambassade-ci.ci', 'address', '1000 Avenue Nationale'), true

UNION ALL SELECT 'Associations Civiles Côte d''Ivoire', (SELECT id FROM categories WHERE slug='associations-ngos'), 'NGO and civic association support services', 'Cocody', '800 Rue des Associations', '+225 27 22 55 66', 'contact@associations-ci.ci', 4.6, 18, ARRAY['ngo','civil','associations'],
  jsonb_build_object('phone', '+225 27 22 55 66', 'email', 'contact@associations-ci.ci', 'address', '800 Rue des Associations'), true

-- PROFESSIONAL ORGANIZATIONS
UNION ALL SELECT 'Confédération Patronale Côte d''Ivoire', (SELECT id FROM categories WHERE slug='confederations'), 'Employer confederation and business advocacy', 'Plateau', '700 Avenue de l''Économie', '+225 27 20 22 33', 'info@confederation-ci.ci', 4.7, 24, ARRAY['employers','business','advocacy'],
  jsonb_build_object('phone', '+225 27 20 22 33', 'email', 'info@confederation-ci.ci', 'address', '700 Avenue de l''Économie'), true

UNION ALL SELECT 'Ordre des Experts Comptables', (SELECT id FROM categories WHERE slug='professional-regulatory-bodies'), 'Professional accounting standards and regulation', 'Plateau', '600 Rue du Professionalisme', '+225 27 20 11 22', 'ordres@experts-comptables.ci', 4.8, 32, ARRAY['accounting','professional','standards'],
  jsonb_build_object('phone', '+225 27 20 11 22', 'email', 'ordres@experts-comptables.ci', 'address', '600 Rue du Professionalisme'), true

-- BEAUTY & WELLNESS
UNION ALL SELECT 'Salon Beauté Élégance Plus', (SELECT id FROM categories WHERE slug='beauty-aesthetic-salons'), 'Full-service beauty and aesthetic salon', 'Cocody', '850 Avenue de la Beauté', '+225 27 22 66 77', 'beauty@elegance-plus.ci', 4.8, 55, ARRAY['beauty','salon','aesthetic'],
  jsonb_build_object('phone', '+225 27 22 66 77', 'email', 'beauty@elegance-plus.ci', 'address', '850 Avenue de la Beauté'), true

UNION ALL SELECT 'Spa & Wellness Afrique', (SELECT id FROM categories WHERE slug='spas-saunas'), 'Luxury spa and wellness center', 'Plateau', '950 Rue du Bien-Être', '+225 27 20 88 99', 'spa@wellness-afrique.ci', 4.9, 63, ARRAY['spa','wellness','relaxation'],
  jsonb_build_object('phone', '+225 27 20 88 99', 'email', 'spa@wellness-afrique.ci', 'address', '950 Rue du Bien-Être'), true

-- RECRUITMENT & HR
UNION ALL SELECT 'Agence de Recrutement Talent', (SELECT id FROM categories WHERE slug='recruitment-agencies'), 'Executive and professional recruitment services', 'Plateau', '1100 Boulevard du Recrutement', '+225 27 20 77 00', 'jobs@talent-recrute.ci', 4.8, 39, ARRAY['recruitment','hr','jobs'],
  jsonb_build_object('phone', '+225 27 20 77 00', 'email', 'jobs@talent-recrute.ci', 'address', '1100 Boulevard du Recrutement'), true

UNION ALL SELECT 'Centre de Formation Professionnelle', (SELECT id FROM categories WHERE slug='training-centers'), 'Vocational training and professional development', 'Yopougon', '750 Rue de la Formation', '+225 27 21 99 00', 'formation@training-ci.ci', 4.7, 36, ARRAY['training','education','development'],
  jsonb_build_object('phone', '+225 27 21 99 00', 'email', 'formation@training-ci.ci', 'address', '750 Rue de la Formation'), true

-- RELIGIOUS & SPECIALIZED SERVICES
UNION ALL SELECT 'Centre Spirituel Multiconfessionnel', (SELECT id FROM categories WHERE slug='religious-institutions-places-of-worship'), 'Multi-faith spiritual center and place of worship', 'Cocody', '1200 Rue de la Foi', '+225 27 22 11 22', 'contact@spirituel-ci.ci', 4.6, 17, ARRAY['spiritual','worship','multi-faith'],
  jsonb_build_object('phone', '+225 27 22 11 22', 'email', 'contact@spirituel-ci.ci', 'address', '1200 Rue de la Foi'), true

UNION ALL SELECT 'Moteurs Marins Afrique', (SELECT id FROM categories WHERE slug='marine-engines'), 'Marine engine sales, service and maintenance', 'Port-Bouet', '1300 Quai de l''Industrie', '+225 27 30 44 55', 'marine@moteurs-afrique.ci', 4.7, 21, ARRAY['marine','engines','services'],
  jsonb_build_object('phone', '+225 27 30 44 55', 'email', 'marine@moteurs-afrique.ci', 'address', '1300 Quai de l''Industrie'), true;
