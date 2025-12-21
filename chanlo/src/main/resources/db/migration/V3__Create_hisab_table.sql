-- Create Hisab (Payment) table
CREATE TABLE IF NOT EXISTS hisab (
    hisab_id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    guest_id INT NOT NULL,
    amount BIGINT NOT NULL,
    payment_method VARCHAR(20),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    gateway_transaction_id VARCHAR(255),
    gateway_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    CONSTRAINT fk_hisab_event FOREIGN KEY (event_id) REFERENCES event(event_id) ON DELETE RESTRICT,
    CONSTRAINT fk_hisab_guest FOREIGN KEY (guest_id) REFERENCES user(id) ON DELETE RESTRICT,
    CONSTRAINT chk_payment_method CHECK (payment_method IN ('UPI_QR', 'UPI_COLLECT', 'PAYMENT_LINK', 'WHATSAPP_NATIVE', 'MANUAL') OR payment_method IS NULL),
    CONSTRAINT chk_payment_status CHECK (payment_status IN ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED')),
    CONSTRAINT chk_amount_positive CHECK (amount > 0),
    INDEX idx_hisab_event (event_id),
    INDEX idx_hisab_guest (guest_id),
    INDEX idx_hisab_status (payment_status),
    INDEX idx_hisab_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

