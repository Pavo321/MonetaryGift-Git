-- Create User table
CREATE TABLE IF NOT EXISTS user (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    village VARCHAR(255),
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    role VARCHAR(20) NOT NULL DEFAULT 'GUEST',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_phone_format CHECK (phone_number REGEXP '^[0-9]{10}$'),
    CONSTRAINT chk_role CHECK (role IN ('GUEST', 'ORGANIZER'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create index on phone_number for faster lookups
CREATE INDEX idx_user_phone_number ON user(phone_number);

-- Create index on role for filtering
CREATE INDEX idx_user_role ON user(role);

