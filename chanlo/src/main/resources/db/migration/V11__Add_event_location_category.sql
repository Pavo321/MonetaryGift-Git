ALTER TABLE event
  ADD COLUMN location VARCHAR(100) NULL,
  ADD COLUMN category VARCHAR(50)  NULL;

CREATE INDEX idx_event_location ON event(location);
CREATE INDEX idx_event_category ON event(category);
