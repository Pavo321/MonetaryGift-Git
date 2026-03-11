-- V9: Create auth_session table for persistent sessions
CREATE TABLE IF NOT EXISTS auth_session (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    token VARCHAR(255) NOT NULL UNIQUE,
    phone_number VARCHAR(20) NOT NULL,
    user_id INT NULL,
    role VARCHAR(20) NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_auth_session_user FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

CREATE INDEX idx_auth_session_token ON auth_session(token);
CREATE INDEX idx_auth_session_expires ON auth_session(expires_at);
