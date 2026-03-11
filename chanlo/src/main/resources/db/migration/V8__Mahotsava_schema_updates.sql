-- V8: Mahotsava Phase 1 schema updates
-- Adds new fields to user, hisab tables
-- Creates event_helper, expense, settlement tables
-- Updates constraints for new roles and payment methods

-- 1. Add new columns to user table
ALTER TABLE user ADD COLUMN email VARCHAR(255) NULL;
ALTER TABLE user ADD COLUMN pincode VARCHAR(10) NULL;
ALTER TABLE user ADD COLUMN managed_by INT NULL;

ALTER TABLE user ADD CONSTRAINT fk_user_managed_by
    FOREIGN KEY (managed_by) REFERENCES user(id) ON DELETE SET NULL;

-- Update role constraint to include HOST and HELPER
ALTER TABLE user DROP CHECK chk_role;
ALTER TABLE user ADD CONSTRAINT chk_role CHECK (role IN ('GUEST', 'HOST', 'HELPER', 'ORGANIZER'));

-- 2. Add new columns to hisab table
ALTER TABLE hisab ADD COLUMN collected_by INT NULL;
ALTER TABLE hisab ADD COLUMN verification_qr_data VARCHAR(500) NULL;

ALTER TABLE hisab ADD CONSTRAINT fk_hisab_collected_by
    FOREIGN KEY (collected_by) REFERENCES user(id);

-- Update payment_method constraint to include CASH
ALTER TABLE hisab DROP CHECK chk_payment_method;
ALTER TABLE hisab ADD CONSTRAINT chk_payment_method CHECK (
    payment_method IN ('CASH', 'UPI_QR', 'UPI_COLLECT', 'UPI_DEEP_LINK', 'PAYMENT_LINK', 'WHATSAPP_NATIVE', 'MANUAL')
);

-- 3. Create event_helper table
CREATE TABLE IF NOT EXISTS event_helper (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    helper_id INT NOT NULL,
    can_expense BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_event_helper_event FOREIGN KEY (event_id) REFERENCES event(event_id) ON DELETE CASCADE,
    CONSTRAINT fk_event_helper_user FOREIGN KEY (helper_id) REFERENCES user(id) ON DELETE CASCADE,
    CONSTRAINT uk_event_helper UNIQUE (event_id, helper_id)
);

CREATE INDEX idx_event_helper_event ON event_helper(event_id);
CREATE INDEX idx_event_helper_helper ON event_helper(helper_id);

-- 4. Create expense table
CREATE TABLE IF NOT EXISTS expense (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    spent_by INT NOT NULL,
    reason VARCHAR(500) NOT NULL,
    amount BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_expense_event FOREIGN KEY (event_id) REFERENCES event(event_id) ON DELETE CASCADE,
    CONSTRAINT fk_expense_user FOREIGN KEY (spent_by) REFERENCES user(id),
    CONSTRAINT chk_expense_amount CHECK (amount > 0)
);

CREATE INDEX idx_expense_event ON expense(event_id);
CREATE INDEX idx_expense_spent_by ON expense(spent_by);

-- 5. Create settlement table
CREATE TABLE IF NOT EXISTS settlement (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    helper_id INT NOT NULL,
    host_id INT NOT NULL,
    amount BIGINT NOT NULL,
    note VARCHAR(500) NULL,
    settled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_settlement_event FOREIGN KEY (event_id) REFERENCES event(event_id) ON DELETE CASCADE,
    CONSTRAINT fk_settlement_helper FOREIGN KEY (helper_id) REFERENCES user(id),
    CONSTRAINT fk_settlement_host FOREIGN KEY (host_id) REFERENCES user(id),
    CONSTRAINT chk_settlement_amount CHECK (amount > 0)
);

CREATE INDEX idx_settlement_event ON settlement(event_id);
CREATE INDEX idx_settlement_helper ON settlement(helper_id);

-- 6. Create OTP table for mobile auth
CREATE TABLE IF NOT EXISTS otp_verification (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    attempts INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_otp_phone ON otp_verification(phone_number);
CREATE INDEX idx_otp_expires ON otp_verification(expires_at);
