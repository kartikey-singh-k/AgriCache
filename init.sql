-- ==========================================
-- 1. BUILD THE INVENTORY TABLE
-- ==========================================
DROP TABLE IF EXISTS local_supplies;

CREATE TABLE local_supplies (
    id SERIAL PRIMARY KEY,
    provider_name VARCHAR(100) NOT NULL, 
    location VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    quantity VARCHAR(50) NOT NULL,
    contact_info VARCHAR(100),            
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert the medicine so the AI can route the farmer
INSERT INTO local_supplies (provider_name, location, resource_type, quantity, contact_info) 
VALUES ('Kisan Kendra Patna', 'Patna', 'Broad-Spectrum Fungicide (For Rust and Yellow Spot)', '150 Liters', '+91-9876543210');


-- ==========================================
-- 2. BUILD THE SECURE NGO ACCOUNTS TABLE
-- ==========================================
DROP TABLE IF EXISTS ngo_accounts;

CREATE TABLE ngo_accounts (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    location VARCHAR(100) NOT NULL
);

-- Insert the NGO Login Account
-- Username: kisan_patna
-- Password (Plain Text): hack2skill2026
-- We insert the BCRYPT HASH below, NEVER the plain text password!
INSERT INTO ngo_accounts (username, password_hash, location)
VALUES ('kisan_patna', '$2a$10$wE1/Z7G8A1O5Z4bF4k2v.e2Q.T8R1K4A9N2X5L8P/M3C6H9B2V5xO', 'Patna');