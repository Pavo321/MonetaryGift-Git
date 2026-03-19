ALTER TABLE event_route_stop
  ADD COLUMN lat DOUBLE NULL,
  ADD COLUMN lng DOUBLE NULL,
  ADD COLUMN distance_to_next_km FLOAT NULL;

ALTER TABLE event
  ADD COLUMN total_distance_km FLOAT NULL;
