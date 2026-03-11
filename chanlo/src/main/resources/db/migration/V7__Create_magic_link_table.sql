-- Create Magic Link table for host dashboard authentication
CREATE TABLE IF NOT EXISTS magic_link (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    token VARCHAR(255) NOT NULL UNIQUE,
    host_id INT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_magic_link_host FOREIGN KEY (host_id) REFERENCES user(id) ON DELETE CASCADE,
    INDEX idx_magic_link_token (token),
    INDEX idx_magic_link_host (host_id),
    INDEX idx_magic_link_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
