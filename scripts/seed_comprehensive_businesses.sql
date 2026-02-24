-- ============================================================================
-- SEED BUSINESSES TABLE WITH REALISTIC DATA
-- ============================================================================

BEGIN;

-- Clean existing test data (keep if needed)
-- DELETE FROM businesses WHERE id <= 2;

-- Insert comprehensive business data across various categories
INSERT INTO businesses 
(name, category_id, description, location, address, phone, email, rating, reviews, tags, latitude, longitude, is_active, is_advertiser, country_code, region_id, city_name, created_at)
VALUES

-- COMMERCE CATEGORY
('Tech Electronics Store', 218, 'Premium electronics retailer specializing in latest gadgets and technology', 'Downtown Abidjan', '123 Commercial Ave, Abidjan', '+225-20-11-50-50', 'contact@techstore.ci', 4.7, 156, '["electronics", "gadgets", "retailer", "premium"]', 5.3364, -4.0255, true, true, 'CI', 1, 'Abidjan', NOW()),
('Fashion Boutique Plus', 218, 'Exclusive fashion and clothing store with designer collections', 'Les Deux Plateaux', '456 Fashion Lane, Abidjan', '+225-22-44-66-88', 'shop@fashionplus.ci', 4.6, 89, '["fashion", "clothing", "designer", "boutique"]', 6.8276, -5.2893, true, false, 'CI', 1, 'Abidjan', NOW()),
('Home & Garden Center', 218, 'Complete home improvement and garden supplies', 'Plateau', '789 Home Road, Abidjan', '+225-20-88-99-11', 'info@homegardens.ci', 4.5, 45, '["home", "garden", "supplies", "diy"]', 6.8245, -5.2788, true, true, 'CI', 1, 'Abidjan', NOW()),

-- FOOD & BEVERAGE CATEGORY
('Le Cordon Bleu Restaurant', 258, 'Fine dining French cuisine with African fusion', 'Cocody', '321 Gourmet St, Abidjan', '+225-22-50-60-70', 'reservations@lecordonbleu.ci', 4.9, 234, '["fine-dining", "french", "fusion", "elegant"]', 6.8445, -5.3045, true, true, 'CI', 1, 'Abidjan', NOW()),
('Street Bites Café', 258, 'Casual café with local and international dishes', 'Marcory', '654 Café Lane, Abidjan', '+225-21-11-22-33', 'hello@streetbites.ci', 4.3, 78, '["café", "casual", "local", "street-food"]', 6.8355, -5.2945, true, false, 'CI', 1, 'Abidjan', NOW()),
('Bakery Fresh Bread Co', 258, 'Artisanal bakery with fresh pastries and bread', 'Yopougon', '987 Baker Ave, Abidjan', '+225-20-77-88-99', 'orders@bakeryfresh.ci', 4.8, 156, '["bakery", "pastries", "artisanal", "fresh"]', 6.8266, -5.3156, true, false, 'CI', 1, 'Abidjan', NOW()),

-- TOURISM & LEISURE CATEGORY  
('Boutique Hotel Ivory', 242, 'Luxury boutique hotel with premium amenities', 'Cocody', '111 Hotel Blvd, Abidjan', '+225-22-40-50-60', 'booking@boutique-ivory.ci', 4.8, 203, '["hotel", "luxury", "boutique", "tourism"]', 6.8445, -5.3145, true, true, 'CI', 1, 'Abidjan', NOW()),
('Savannah Resort & Spa', 242, 'All-inclusive resort with spa and entertainment', 'Bingerville', '222 Resort Road, Abidjan', '+225-23-30-40-50', 'info@savannah-resort.ci', 4.7, 167, '["resort", "spa", "leisure", "entertainment"]', 6.8555, -5.2045, true, true, 'CI', 1, 'Bingerville', NOW()),
('Adventure Travel Agency', 242, 'Full-service travel booking and tour planning', 'Plateau', '333 Travel St, Abidjan', '+225-20-55-66-77', 'travels@adventureco.ci', 4.6, 92, '["travel", "agency", "tours", "booking"]', 6.8245, -5.2788, true, false, 'CI', 1, 'Abidjan', NOW()),

-- BUILDING & CONSTRUCTION CATEGORY
('ProBuild Construction Co', 222, 'Commercial and residential construction services', 'Port-Bouet', '444 Build Lane, Abidjan', '+225-21-66-77-88', 'projects@probuild.ci', 4.7, 134, '["construction", "building", "commercial", "residential"]', 6.7945, -5.2145, true, true, 'CI', 1, 'Abidjan', NOW()),
('Interior Design Studio', 222, 'Modern interior design and renovation', 'Cocody', '555 Design Ave, Abidjan', '+225-22-88-99-00', 'design@studioid.ci', 4.8, 98, '["design", "interior", "renovation", "modern"]', 6.8445, -5.3045, true, false, 'CI', 1, 'Abidjan', NOW()),

-- IT & INTERNET CATEGORY
('Tech Solutions Ltd', 227, 'Software development and IT consulting', 'Deux-Plateaux', '666 Tech Park, Abidjan', '+225-20-22-33-44', 'contact@techsolutions.ci', 4.7, 145, '["software", "it", "consulting", "development"]', 6.8276, -5.2893, true, true, 'CI', 1, 'Abidjan', NOW()),
('Cloud Hosting Plus', 227, 'Cloud services and data center solutions', 'Plateau', '777 Server St, Abidjan', '+225-22-11-22-33', 'support@cloudhostingplus.ci', 4.6, 67, '["cloud", "hosting", "infrastructure", "data-center"]', 6.8245, -5.2788, true, true, 'CI', 1, 'Abidjan', NOW()),
('Digital Marketing Agency', 227, 'Full-service digital marketing and SEO', 'Marcory', '888 Marketing Blvd, Abidjan', '+225-21-44-55-66', 'hello@digitalagency.ci', 4.8, 112, '["marketing", "digital", "seo", "advertising"]', 6.8355, -5.2945, true, false, 'CI', 1, 'Abidjan', NOW()),

-- HEALTH CATEGORY
('Medical Center Plus', 246, 'Full-service medical clinic with specialist doctors', 'Cocody', '999 Health Ave, Abidjan', '+225-22-77-88-99', 'appointments@medcenter.ci', 4.9, 289, '["medical", "clinic", "doctors", "healthcare"]', 6.8445, -5.3045, true, true, 'CI', 1, 'Abidjan', NOW()),
('Wellness & Fitness Center', 246, 'State-of-the-art gym and wellness facilities', 'Yopougon', '111 Fitness Blvd, Abidjan', '+225-20-99-00-11', 'info@wellnessfit.ci', 4.7, 156, '["fitness", "gym", "wellness", "health"]', 6.8266, -5.3156, true, false, 'CI', 1, 'Abidjan', NOW()),
('Dental Clinic Excellence', 246, 'Modern dental care and orthodontics', 'Plateaux', '222 Dental St, Abidjan', '+225-21-22-33-44', 'book@dentalex.ci', 4.8, 123, '["dental", "orthodontics", "healthcare", "dentistry"]', 6.8245, -5.2788, true, false, 'CI', 1, 'Abidjan', NOW()),

-- AUTOMOTIVE CATEGORY
('AutoLux Motors', 223, 'Luxury car dealership and maintenance center', 'Port-Bouet', '333 Auto Ave, Abidjan', '+225-22-55-66-77', 'sales@autolux.ci', 4.8, 201, '["automotive", "dealership", "luxury", "maintenance"]', 6.7945, -5.2145, true, true, 'CI', 1, 'Abidjan', NOW()),
('Tire & Wheel Shop', 223, 'Complete tire and wheel services', 'Yopougon', '444 Tire Lane, Abidjan', '+225-21-33-44-55', 'service@tirewheels.ci', 4.6, 87, '["automotive", "tires", "wheels", "service"]', 6.8266, -5.3156, true, false, 'CI', 1, 'Abidjan', NOW()),

-- TRANSPORT & LOGISTICS CATEGORY
('Verso Air', 343, 'Premium air transport and logistics services', 'Port-Bouet', '555 Airport Rd, Abidjan', '+225-20-11-22-33', 'operations@versoair.ci', 4.9, 345, '["air-transport", "logistics", "shipping", "premium"]', 6.7945, -5.2145, true, true, 'CI', 1, 'Abidjan', NOW()),
('Swift Courier Express', 343, 'Fast delivery and courier services', 'Marcory', '666 Express St, Abidjan', '+225-21-55-66-77', 'track@swiftcourier.ci', 4.7, 178, '["courier", "delivery", "logistics", "express"]', 6.8355, -5.2945, true, false, 'CI', 1, 'Abidjan', NOW()),

-- FINANCE CATEGORY
('Capital Finance Group', 233, 'Investment and financial advisory services', 'Plateau', '777 Finance Ave, Abidjan', '+225-22-66-77-88', 'advisory@capitalfin.ci', 4.8, 156, '["finance", "investment", "advisory", "banking"]', 6.8245, -5.2788, true, true, 'CI', 1, 'Abidjan', NOW()),
('Insurance Solutions Plus', 233, 'Comprehensive insurance products and claims', 'Cocody', '888 Insurance Blvd, Abidjan', '+225-22-88-99-00', 'claims@insuresolutions.ci', 4.7, 134, '["insurance", "coverage", "claims", "finance"]', 6.8445, -5.3045, true, false, 'CI', 1, 'Abidjan', NOW());

-- Update business stats in analytics table
INSERT INTO analytics (business_id, category_id, total_reservations, revenue, recorded_at)
SELECT b.id, b.category_id, 
  FLOOR(RANDOM() * 500) + 100 as total_reservations,
  FLOOR(RANDOM() * 1000000)::decimal as revenue,
  NOW()
FROM businesses b
ON CONFLICT DO NOTHING;

-- Commit transaction
COMMIT;

-- Verification query
SELECT 
  COUNT(*) as total_businesses,
  COUNT(DISTINCT category_id) as categories_covered,
  MIN(rating) as min_rating,
  MAX(rating) as max_rating,
  AVG(rating) as avg_rating,
  COUNT(CASE WHEN is_active THEN 1 END) as active_businesses,
  COUNT(CASE WHEN is_advertiser THEN 1 END) as advertisers
FROM businesses;
