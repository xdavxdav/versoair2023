-- Insert Finance Category Businesses
INSERT INTO businesses (name, slug, category_id, description, phone, email, location, is_verified, is_advertiser, created_at, updated_at)
VALUES
  ('Global Banking Solutions', 'global-banking-solutions', 5, 'Premier international banking institution', '+1-800-123-4567', 'contact@globalbanking.com', 'New York, USA', TRUE, TRUE, NOW(), NOW()),
  ('Forex Exchange Pro', 'forex-exchange-pro', 5, 'Leading forex trading platform with real-time data', '+44-20-7946-0958', 'support@forexexchange.com', 'London, UK', TRUE, FALSE, NOW(), NOW()),
  ('Investment Capital Group', 'investment-capital-group', 5, 'Professional investment management services', '+1-212-555-6789', 'investments@capitalgroup.com', 'Boston, USA', TRUE, TRUE, NOW(), NOW()),
  ('Microfinance International', 'microfinance-international', 5, 'Microfinance solutions for underserved communities', '+91-11-4040-2020', 'info@microfinance.com', 'Delhi, India', FALSE, FALSE, NOW(), NOW()),
  ('Digital Wallet Services', 'digital-wallet-services', 5, 'Secure digital payment and wallet solutions', '+1-415-555-1234', 'support@digitalwallet.com', 'San Francisco, USA', TRUE, FALSE, NOW(), NOW()),
  ('Stock Brokerage Plus', 'stock-brokerage-plus', 5, 'Online stock trading and brokerage services', '+1-888-234-5678', 'trades@stockplus.com', 'Chicago, USA', TRUE, TRUE, NOW(), NOW()),
  ('Insurance Protect Ltd', 'insurance-protect-ltd', 5, 'Comprehensive insurance solutions', '+1-800-4768-7768', 'claims@insprotect.com', 'Houston, USA', TRUE, FALSE, NOW(), NOW()),
  ('Asset Management Pro', 'asset-management-pro', 5, 'Professional asset management and advisory services', '+1-202-555-9876', 'advisors@assetpro.com', 'Washington DC, USA', TRUE, TRUE, NOW(), NOW()),
  ('Fintech Innovations Inc', 'fintech-innovations-inc', 5, 'Modern fintech solutions with blockchain technology', '+1-650-555-4321', 'innovation@fintech.com', 'Palo Alto, USA', FALSE, TRUE, NOW(), NOW()),
  ('Crypto Exchange Hub', 'crypto-exchange-hub', 5, 'Cryptocurrency trading and exchange platform', '+1-888-279-7698', 'support@cryptohub.com', 'Miami, USA', FALSE, FALSE, NOW(), NOW());

-- Verify insertion
SELECT COUNT(*) as total_finance_businesses FROM businesses WHERE category_id = 5;
SELECT id, name, email, location FROM businesses WHERE category_id = 5 ORDER BY id;
