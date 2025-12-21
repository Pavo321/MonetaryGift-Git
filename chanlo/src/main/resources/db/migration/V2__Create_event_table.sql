-- Create Event table
CREATE TABLE IF NOT EXISTS event (
    event_id INT AUTO_INCREMENT PRIMARY KEY,
    event_name VARCHAR(255) NOT NULL,
    host_id INT NOT NULL,
    event_date DATE NOT NULL,
    qr_code_data VARCHAR(255),
    qr_code_image_url VARCHAR(500),
    thank_you_message VARCHAR(500) DEFAULT 'Thank you for blessing our wedding!',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_event_host FOREIGN KEY (host_id) REFERENCES user(id) ON DELETE RESTRICT,
    -- Note: Date validation is handled at application level
    -- CHECK constraint removed to allow flexibility for past events
    CONSTRAINT chk_event_status CHECK (status IN ('ACTIVE', 'COMPLETED', 'CANCELLED')),
    INDEX idx_event_host (host_id),
    INDEX idx_event_date (event_date),
    INDEX idx_event_status (status),
    INDEX idx_qr_code_data (qr_code_data)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

