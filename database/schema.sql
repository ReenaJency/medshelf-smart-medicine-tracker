-- ==============================================================================
-- MEDSHELF: SMART MEDICINE EXPIRY TRACKER FOR HOME USE
-- Database Schema Definition (MySQL 8.0+ Compatible)
-- ==============================================================================

-- Create Database if not exists
CREATE DATABASE IF NOT EXISTS medshelf_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE medshelf_db;

-- ------------------------------------------------------------------------------
-- Table 1: users
-- Stores registered user accounts with securely hashed credentials
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- Table 2: medicines
-- Stores user-specific household medicines with foreign key to users
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medicines (
  medicine_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  medicine_name VARCHAR(150) NOT NULL,
  expiry_date DATE NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  family_member VARCHAR(100) NOT NULL DEFAULT 'General / Shared',
  category VARCHAR(100) DEFAULT 'General',
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_medicines_user
    FOREIGN KEY (user_id) REFERENCES users(user_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  INDEX idx_medicines_user (user_id),
  INDEX idx_medicines_expiry (expiry_date),
  INDEX idx_medicines_family (family_member)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- Optional: Sample verification queries for development & testing
-- ------------------------------------------------------------------------------
-- SELECT * FROM users;
-- SELECT * FROM medicines WHERE user_id = 1 ORDER BY expiry_date ASC;
