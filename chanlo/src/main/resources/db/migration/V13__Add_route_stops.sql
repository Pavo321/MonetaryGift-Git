CREATE TABLE event_route_stop (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  event_id   INT         NOT NULL,
  stop_name  VARCHAR(100) NOT NULL,
  stop_order INT         NOT NULL,
  CONSTRAINT fk_route_stop_event FOREIGN KEY (event_id) REFERENCES event(event_id) ON DELETE CASCADE,
  CONSTRAINT uk_route_stop       UNIQUE (event_id, stop_order)
);

CREATE INDEX idx_route_stop_event ON event_route_stop(event_id);
