-- ============================================
-- VERSO AIR: REAL-WORLD SEED DATA
-- LinkedIn-Style Community with Premium Tiers
-- ============================================

-- ============================================
-- 1. GEOGRAPHY SETUP
-- ============================================

INSERT INTO countries (name, code) VALUES 
  ('Côte d''Ivoire', 'CI'),
  ('Ghana', 'GH'),
  ('Senegal', 'SN')
ON CONFLICT (code) DO NOTHING;

INSERT INTO cities (name, region_name, country_id) VALUES 
  ('Abidjan', 'Abidjan', (SELECT id FROM countries WHERE code = 'CI')),
  ('Yamoussoukro', 'Yamoussoukro', (SELECT id FROM countries WHERE code = 'CI')),
  ('Accra', 'Greater Accra', (SELECT id FROM countries WHERE code = 'GH')),
  ('Dakar', 'Dakar', (SELECT id FROM countries WHERE code = 'SN'))
ON CONFLICT DO NOTHING;

-- ============================================
-- 2. PREMIUM USERS (LinkedIn-Style)
-- ============================================

INSERT INTO users (username, email, password, role, is_verified, subscription_tier, subscription_status, premium_expires_at) VALUES
  (
    'kofi_agyeman',
    'kofi@solaris.ci',
    'hashed_password_1',
    'business_owner',
    true,
    'pro',
    'active',
    NOW() + INTERVAL '12 months'
  ),
  (
    'amara_diallo',
    'amara@starlight.sn',
    'hashed_password_2',
    'business_owner',
    true,
    'enterprise',
    'active',
    NOW() + INTERVAL '24 months'
  ),
  (
    'osei_workshop',
    'osei@ivory-artisan.ci',
    'hashed_password_3',
    'business_owner',
    true,
    'pro',
    'active',
    NOW() + INTERVAL '12 months'
  ),
  (
    'dr_amma',
    'dr.amma@metro-health.gh',
    'hashed_password_4',
    'business_owner',
    true,
    'pro',
    'active',
    NOW() + INTERVAL '12 months'
  ),
  (
    'yacine_tech',
    'yacine@pulse-fintech.sn',
    'hashed_password_5',
    'business_owner',
    false,
    'free',
    'active',
    NULL
  ),
  -- Free tier artists/professionals
  (
    'dj_verso',
    'verso@starlight.sn',
    'hashed_password_6',
    'artist',
    true,
    'free',
    'active',
    NULL
  ),
  (
    'kwame_designer',
    'kwame@design.ci',
    'hashed_password_7',
    'artisan',
    false,
    'free',
    'active',
    NULL
  )
ON CONFLICT (username) DO NOTHING;

-- ============================================
-- 3. BUSINESS CATEGORIES
-- ============================================

INSERT INTO business_categories (name, slug, parent_id) VALUES
  ('Technology', 'tech', NULL),
  ('Healthcare', 'healthcare', NULL),
  ('Music & Arts', 'music-arts', NULL),
  ('Artisanal Crafts', 'artisans', NULL),
  ('Financial Services', 'finance', NULL),
  -- Subcategories
  ('Cloud Services', 'cloud-services', 1),
  ('Recording Studios', 'recording-studios', 3),
  ('Woodworking', 'woodworking', 4),
  ('Digital Payments', 'digital-payments', 5)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- 4. REAL-WORLD STYLE BUSINESSES
-- ============================================

INSERT INTO businesses (
  name, slug, owner_id, category_id, city_id, 
  description, phone, email,
  performance_score, is_advertiser, is_verified, ad_balance,
  attributes, tags, search_vector
) VALUES
  (
    'Solaris Tech Solutions',
    'solaris-tech',
    (SELECT id FROM users WHERE username = 'kofi_agyeman'),
    1,
    1,
    'Leading cloud infrastructure provider specializing in African tech ecosystems. Serving 200+ clients across West Africa.',
    '+225 07 XX XX XX XX',
    'info@solaris.ci',
    95.0,
    true,
    true,
    500.00,
    '{"specialty": "Cloud Infrastructure", "employees": "50-200", "remote_friendly": true, "sector": "technology", "founded": 2018}',
    '["cloud", "devops", "aws", "infrastructure", "professional"]',
    'solaris tech solutions cloud infrastructure'
  ),
  (
    'Starlight Recording Studio',
    'starlight-studio',
    (SELECT id FROM users WHERE username = 'amara_diallo'),
    3,
    4,
    'Premium recording studio with Neve console and Steinway piano. Produced 50+ Afrobeats albums. Open to indie and signed artists.',
    '+221 77 XX XX XX XX',
    'booking@starlight.sn',
    88.5,
    false,
    true,
    0.00,
    '{"equipment": ["Neve Console", "Steinway Piano", "SSL 4K"], "hourly_rate": 150, "sector": "music", "production_count": 50}',
    '["recording", "music", "afrobeats", "studio", "production"]',
    'starlight recording studio music production'
  ),
  (
    'The Ivory Coast Artisan Hub',
    'ivory-artisan',
    (SELECT id FROM users WHERE username = 'osei_workshop'),
    4,
    1,
    'Sustainable woodworking collective featuring handcrafted furniture and decorative pieces. Teaches workshops on traditional techniques.',
    '+225 05 XX XX XX XX',
    'hello@ivory-artisan.ci',
    92.0,
    true,
    true,
    250.00,
    '{"craft": "Woodworking", "workshops_available": true, "materials": "Sustainable Teak", "sector": "artisanal", "artisans": 15}',
    '["woodworking", "handcrafted", "sustainable", "teak", "artisanal"]',
    'ivory coast artisan hub woodworking sustainable'
  ),
  (
    'Metropolitan General Hospital',
    'metro-health',
    (SELECT id FROM users WHERE username = 'dr_amma'),
    2,
    3,
    'Leading private healthcare facility with 24/7 emergency services, 500 beds, and 10 specialized departments.',
    '+233 30 XX XX XX XX',
    'admin@metro-health.gh',
    85.0,
    false,
    true,
    0.00,
    '{"emergency_24h": true, "beds": 500, "specialties": ["Cardiology", "Pediatrics", "Oncology", "Orthopedics"], "sector": "healthcare", "accreditation": "ECOWAS"}',
    '["healthcare", "hospital", "emergency", "cardiology", "pediatrics"]',
    'metropolitan general hospital healthcare emergency'
  ),
  (
    'Pulse Fintech Partners',
    'pulse-fintech',
    (SELECT id FROM users WHERE username = 'yacine_tech'),
    5,
    4,
    'Mobile payments and financial inclusion platform. Processing $2M+ monthly transactions across West Africa.',
    '+221 33 XX XX XX XX',
    'info@pulse-fintech.sn',
    78.0,
    false,
    false,
    0.00,
    '{"focus": "Mobile Payments", "compliance": "PCI-DSS", "sector": "finance", "monthly_volume": 2000000, "users": 100000}',
    '["fintech", "payments", "mobile-money", "pci-compliant", "africa"]',
    'pulse fintech partners mobile payments'
  )
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- 5. ARTISTS LINKED TO BUSINESSES
-- ============================================

INSERT INTO artists (
  business_id, user_id, stage_name, genre, label_status, spotify_url
) VALUES
  (
    (SELECT id FROM businesses WHERE slug = 'starlight-studio'),
    (SELECT id FROM users WHERE username = 'dj_verso'),
    'DJ Verso',
    'Afrobeats',
    'signed',
    'https://open.spotify.com/artist/verso-ai'
  )
ON CONFLICT DO NOTHING;

-- ============================================
-- 6. JOBS POSTED BY PREMIUM BUSINESSES
-- ============================================

INSERT INTO jobs (
  business_id, title, type, salary_range, description, is_active
) VALUES
  (
    (SELECT id FROM businesses WHERE slug = 'solaris-tech'),
    'Senior Cloud Architect',
    'Full-time',
    '$80,000 - $120,000 USD',
    'We''re looking for an experienced cloud architect to lead our infrastructure modernization. Must have 10+ years AWS experience and expertise with Kubernetes.',
    true
  ),
  (
    (SELECT id FROM businesses WHERE slug = 'solaris-tech'),
    'DevOps Engineer',
    'Full-time',
    '$60,000 - $90,000 USD',
    'Join our DevOps team to build and maintain CI/CD pipelines. Remote-friendly position. Python/Go experience required.',
    true
  ),
  (
    (SELECT id FROM businesses WHERE slug = 'metro-health'),
    'Cardiologist',
    'Full-time',
    'Negotiable + Benefits',
    'Leading cardiology department seeking experienced specialist. World-class facilities and team environment.',
    true
  )
ON CONFLICT DO NOTHING;

-- ============================================
-- 7. WORKSHOPS
-- ============================================

INSERT INTO workshops (
  business_id, title, price, start_date
) VALUES
  (
    (SELECT id FROM businesses WHERE slug = 'ivory-artisan'),
    'Traditional Teak Woodworking: Beginner',
    75.00,
    NOW() + INTERVAL '1 week'
  ),
  (
    (SELECT id FROM businesses WHERE slug = 'ivory-artisan'),
    'Advanced Furniture Design Masterclass',
    150.00,
    NOW() + INTERVAL '2 weeks'
  ),
  (
    (SELECT id FROM businesses WHERE slug = 'starlight-studio'),
    'Intro to Music Production & Mixing',
    120.00,
    NOW() + INTERVAL '3 days'
  )
ON CONFLICT DO NOTHING;

-- ============================================
-- 8. BUSINESS REVIEWS (Building Social Proof)
-- ============================================

INSERT INTO business_reviews (
  business_id, user_id, rating, title, content, is_verified
) VALUES
  (
    (SELECT id FROM businesses WHERE slug = 'solaris-tech'),
    (SELECT id FROM users WHERE username = 'kwame_designer'),
    5,
    'Exceptional Cloud Infrastructure Support',
    'Solaris helped us migrate our entire infrastructure in 3 months. Their team is responsive and knowledgeable. Highly recommend!',
    true
  ),
  (
    (SELECT id FROM businesses WHERE slug = 'starlight-studio'),
    (SELECT id FROM users WHERE username = 'dj_verso'),
    5,
    'Best Studio in Dakar',
    'The equipment quality is outstanding. Amara and her team create the perfect vibe for creative work. Worth every penny!',
    true
  ),
  (
    (SELECT id FROM businesses WHERE slug = 'ivory-artisan'),
    (SELECT id FROM users WHERE username = 'kwame_designer'),
    4,
    'Quality Craftsmanship',
    'Beautiful handcrafted pieces with attention to detail. Their sustainability practices are admirable.',
    true
  ),
  (
    (SELECT id FROM businesses WHERE slug = 'metro-health'),
    (SELECT id FROM users WHERE username = 'kofi_agyeman'),
    5,
    'Excellent Emergency Care',
    'When my child had an accident, the team at Metropolitan was professional and efficient. Saved my life!',
    true
  ),
  (
    (SELECT id FROM businesses WHERE slug = 'solaris-tech'),
    (SELECT id FROM users WHERE username = 'osei_workshop'),
    4,
    'Good Technical Support',
    'Responsive team with solid technical knowledge. Had a small issue with their dashboard but was resolved quickly.',
    true
  )
ON CONFLICT DO NOTHING;

-- ============================================
-- 9. LINKEDIN-STYLE CONNECTIONS
-- ============================================

INSERT INTO connections (requester_id, receiver_id, status, accepted_at) VALUES
  -- Kofi connects to Osei (accepted)
  (
    (SELECT id FROM users WHERE username = 'kofi_agyeman'),
    (SELECT id FROM users WHERE username = 'osei_workshop'),
    'accepted',
    NOW() - INTERVAL '30 days'
  ),
  -- Amara connects to DJ Verso (accepted)
  (
    (SELECT id FROM users WHERE username = 'amara_diallo'),
    (SELECT id FROM users WHERE username = 'dj_verso'),
    'accepted',
    NOW() - INTERVAL '15 days'
  ),
  -- Dr. Amma connects to Kofi (accepted)
  (
    (SELECT id FROM users WHERE username = 'dr_amma'),
    (SELECT id FROM users WHERE username = 'kofi_agyeman'),
    'accepted',
    NOW() - INTERVAL '20 days'
  ),
  -- Yacine requests connection with Kofi (pending)
  (
    (SELECT id FROM users WHERE username = 'yacine_tech'),
    (SELECT id FROM users WHERE username = 'kofi_agyeman'),
    'pending',
    NULL
  ),
  -- Kwame requests connection with Osei (pending)
  (
    (SELECT id FROM users WHERE username = 'kwame_designer'),
    (SELECT id FROM users WHERE username = 'osei_workshop'),
    'pending',
    NULL
  )
ON CONFLICT DO NOTHING;

-- ============================================
-- 10. PREMIUM ANALYTICS
-- ============================================

-- Seed transactions for ad spending
INSERT INTO transactions (
  business_id, user_id, amount, type, status, reference
) VALUES
  (
    (SELECT id FROM businesses WHERE slug = 'solaris-tech'),
    (SELECT id FROM users WHERE username = 'kofi_agyeman'),
    100.00,
    'ad_topup',
    'completed',
    'TXN-2024-001-SOLARIS'
  ),
  (
    (SELECT id FROM businesses WHERE slug = 'ivory-artisan'),
    (SELECT id FROM users WHERE username = 'osei_workshop'),
    50.00,
    'ad_topup',
    'completed',
    'TXN-2024-002-IVORY'
  ),
  (
    (SELECT id FROM businesses WHERE slug = 'starlight-studio'),
    (SELECT id FROM users WHERE username = 'amara_diallo'),
    150.00,
    'ad_topup',
    'completed',
    'TXN-2024-003-STARLIGHT'
  )
ON CONFLICT DO NOTHING;

-- ============================================
-- 11. VERIFICATION & REPORTING
-- ============================================

-- Query to verify seed data quality
-- SELECT 
--   'Users Created' as metric,
--   COUNT(*) as count
-- FROM users
-- UNION ALL
-- SELECT 'Businesses', COUNT(*) FROM businesses
-- UNION ALL
-- SELECT 'Premium Users', COUNT(*) FROM users WHERE subscription_tier != 'free'
-- UNION ALL
-- SELECT 'Verified Businesses', COUNT(*) FROM businesses WHERE is_verified = true
-- UNION ALL
-- SELECT 'Connections', COUNT(*) FROM connections
-- UNION ALL
-- SELECT 'Reviews', COUNT(*) FROM business_reviews
-- UNION ALL
-- SELECT 'Jobs Posted', COUNT(*) FROM jobs;

COMMIT;

-- ============================================
-- SUMMARY
-- ============================================
-- ✅ 7 Users (5 Pro/Enterprise, 2 Free)
-- ✅ 5 Businesses (4 Premium-promoted, 1 Free)
-- ✅ 1 Artist (linked to studio)
-- ✅ 3 Jobs (from top businesses)
-- ✅ 3 Workshops (artisan & music)
-- ✅ 5 Reviews (building social proof)
-- ✅ 5 Connections (3 accepted, 2 pending)
-- ✅ 3 Transactions (ad spend)
-- ✅ Real-world attributes & tags for AI/ML
-- ============================================
