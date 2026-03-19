ALTER TABLE event
  ADD COLUMN event_type        VARCHAR(20) NOT NULL DEFAULT 'GIFT_COLLECTION',
  ADD COLUMN confirmation_type VARCHAR(10) NULL,
  ADD COLUMN capacity          INT         NULL,
  ADD COLUMN price_per_person  BIGINT      NULL;

CREATE INDEX idx_event_type ON event(event_type);
