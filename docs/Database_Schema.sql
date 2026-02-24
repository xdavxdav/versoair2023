-- Verso Air ™️ Business Intelligence Platform - Database Schema
-- PostgreSQL Schema for complete local setup

-- Create database (run as superuser)
-- CREATE DATABASE versoair_business_intelligence;
-- \c versoair_business_intelligence;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, -- Store hashed passwords
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'user', 'manager')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Business categories table
CREATE TABLE business_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Businesses table
CREATE TABLE businesses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category_id INTEGER REFERENCES business_categories(id) ON DELETE SET NULL,
    owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    description TEXT,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Analytics table
CREATE TABLE analytics (
    id SERIAL PRIMARY KEY,
    business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES business_categories(id) ON DELETE CASCADE,
    metric_type VARCHAR(100) NOT NULL,
    value DECIMAL(15,2) NOT NULL,
    period VARCHAR(20) NOT NULL, -- Format: YYYY-MM
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reservations table
CREATE TABLE reservations (
    id SERIAL PRIMARY KEY,
    business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20),
    reservation_date TIMESTAMP NOT NULL,
    party_size INTEGER NOT NULL,
    special_requests TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Music artists table (for entertainment analytics)
CREATE TABLE music_artists (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    genre VARCHAR(100),
    total_streams BIGINT DEFAULT 0,
    monthly_listeners BIGINT DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    profile_image TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Music analytics table
CREATE TABLE music_analytics (
    id SERIAL PRIMARY KEY,
    track_id INTEGER, -- Future expansion for tracks
    artist_id INTEGER REFERENCES music_artists(id) ON DELETE CASCADE,
    streams BIGINT DEFAULT 0,
    listeners BIGINT DEFAULT 0,
    period VARCHAR(20) NOT NULL, -- Format: YYYY-MM
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default business categories
INSERT INTO business_categories (name, description) VALUES
('Commerce', 'Retail and commercial businesses'),
('Hotellerie', 'Hotels and hospitality services'),
('Batiment', 'Construction and building services'),
('Automobile', 'Automotive industry and services'),
('Finances', 'Financial services and institutions'),
('Divertissement', 'Entertainment and leisure industry');

-- Insert default admin user (password: admin123 - should be hashed in production)
INSERT INTO users (username, email, password, role) VALUES
('admin', 'admin@planv4.com', '$2b$10$hash_here', 'admin');

-- Insert sample businesses
INSERT INTO businesses (name, category_id, owner_id, description, address, phone, email, website) VALUES
('TechCorp Solutions', 1, 1, 'Technology consulting firm', '123 Tech Street, Paris', '+33 1 23 45 67 89', 'contact@techcorp.com', 'https://techcorp.com'),
('Grand Hotel Royal', 2, 1, 'Luxury hotel in city center', '456 Royal Avenue, Paris', '+33 1 98 76 54 32', 'info@grandhotelroyal.com', 'https://grandhotelroyal.com'),
('BuildMaster Construction', 3, 1, 'Commercial construction company', '789 Builder Lane, Paris', '+33 1 11 22 33 44', 'hello@buildmaster.com', 'https://buildmaster.com'),
('AutoService Pro', 4, 1, 'Professional automotive services', '321 Motor Street, Paris', '+33 1 55 66 77 88', 'service@autoservicepro.com', 'https://autoservicepro.com'),
('FinanceFirst Bank', 5, 1, 'Full-service banking institution', '654 Money Boulevard, Paris', '+33 1 99 88 77 66', 'contact@financefirst.com', 'https://financefirst.com'),
('Entertainment Plus', 6, 1, 'Event management and entertainment', '987 Fun Street, Paris', '+33 1 44 33 22 11', 'events@entertainmentplus.com', 'https://entertainmentplus.com');

-- Insert sample analytics data
INSERT INTO analytics (business_id, category_id, metric_type, value, period) VALUES
-- Commerce analytics
(1, 1, 'revenue', 125000.00, '2024-01'),
(1, 1, 'customers', 1250.00, '2024-01'),
(1, 1, 'conversion_rate', 3.4, '2024-01'),
(1, 1, 'avg_order_value', 89.50, '2024-01'),

-- Hotellerie analytics
(2, 2, 'occupancy_rate', 78.5, '2024-01'),
(2, 2, 'revenue_per_room', 145.00, '2024-01'),
(2, 2, 'guest_satisfaction', 4.6, '2024-01'),
(2, 2, 'bookings', 485.00, '2024-01'),

-- Construction analytics
(3, 3, 'projects_completed', 12.00, '2024-01'),
(3, 3, 'revenue', 850000.00, '2024-01'),
(3, 3, 'client_satisfaction', 4.8, '2024-01'),
(3, 3, 'safety_score', 9.2, '2024-01'),

-- Automotive analytics
(4, 4, 'services_completed', 234.00, '2024-01'),
(4, 4, 'revenue', 45000.00, '2024-01'),
(4, 4, 'customer_return_rate', 67.5, '2024-01'),
(4, 4, 'avg_service_time', 2.3, '2024-01'),

-- Finance analytics
(5, 5, 'new_accounts', 89.00, '2024-01'),
(5, 5, 'loan_approvals', 234.00, '2024-01'),
(5, 5, 'customer_satisfaction', 4.4, '2024-01'),
(5, 5, 'assets_under_management', 2500000.00, '2024-01'),

-- Entertainment analytics
(6, 6, 'total_attendance', 68500.00, '2024-01'),
(6, 6, 'event_rating', 4.6, '2024-01');

-- Insert sample music artists
INSERT INTO music_artists (name, genre, total_streams, monthly_listeners, is_verified, profile_image) VALUES
('Joe', 'Hip Hop', 3500000, 850000, TRUE, 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop&crop=face'),
('Luna Eclipse', 'Electronic', 1800000, 420000, TRUE, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face'),
('Verso Air Collective', 'Alternative', 2500000, 680000, TRUE, 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop&crop=face');

-- Insert sample music analytics
INSERT INTO music_analytics (artist_id, streams, listeners, period) VALUES
(1, 3500000, 850000, '2024-01'),
(2, 1800000, 420000, '2024-01'),
(3, 2500000, 680000, '2024-01');

-- Insert sample reservations
INSERT INTO reservations (business_id, customer_name, customer_email, customer_phone, reservation_date, party_size, special_requests, status) VALUES
(2, 'Jean Dupont', 'jean.dupont@email.com', '+33 6 12 34 56 78', '2024-02-15 19:00:00', 4, 'Table near window', 'confirmed'),
(2, 'Marie Martin', 'marie.martin@email.com', '+33 6 87 65 43 21', '2024-02-16 20:30:00', 2, 'Anniversary dinner', 'confirmed'),
(6, 'Pierre Durand', 'pierre.durand@email.com', '+33 6 11 22 33 44', '2024-02-20 21:00:00', 6, 'Corporate event', 'pending');

-- Create indexes for better performance
CREATE INDEX idx_businesses_category ON businesses(category_id);
CREATE INDEX idx_businesses_owner ON businesses(owner_id);
CREATE INDEX idx_analytics_business ON analytics(business_id);
CREATE INDEX idx_analytics_category ON analytics(category_id);
CREATE INDEX idx_analytics_period ON analytics(period);
CREATE INDEX idx_reservations_business ON reservations(business_id);
CREATE INDEX idx_reservations_date ON reservations(reservation_date);
CREATE INDEX idx_music_analytics_artist ON music_analytics(artist_id);
CREATE INDEX idx_music_analytics_period ON music_analytics(period);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON businesses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON reservations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_music_artists_updated_at BEFORE UPDATE ON music_artists FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for common queries
CREATE VIEW business_analytics_summary AS
SELECT 
    b.name as business_name,
    bc.name as category_name,
    COUNT(a.id) as total_metrics,
    MAX(a.recorded_at) as last_updated
FROM businesses b
LEFT JOIN business_categories bc ON b.category_id = bc.id
LEFT JOIN analytics a ON b.id = a.business_id
GROUP BY b.id, b.name, bc.name;

CREATE VIEW monthly_revenue_by_category AS
SELECT 
    bc.name as category,
    a.period,
    SUM(CASE WHEN a.metric_type = 'revenue' THEN a.value ELSE 0 END) as total_revenue
FROM analytics a
JOIN business_categories bc ON a.category_id = bc.id
GROUP BY bc.name, a.period
ORDER BY a.period DESC, total_revenue DESC;

-- Grant permissions (adjust as needed for your environment)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO planv4_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO planv4_user;

-- End of schema