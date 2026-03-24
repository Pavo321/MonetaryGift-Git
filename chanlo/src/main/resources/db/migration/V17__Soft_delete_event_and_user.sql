-- Soft delete support for events (trash/restore within 30 days)
ALTER TABLE event ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;

-- Soft delete support for users (WhatsApp account deletion/restore)
ALTER TABLE user ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE user ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
