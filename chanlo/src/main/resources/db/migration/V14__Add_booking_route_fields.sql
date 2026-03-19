ALTER TABLE hisab
  ADD COLUMN from_stop_order INT  NULL,
  ADD COLUMN to_stop_order   INT  NULL,
  ADD COLUMN seats_booked    INT  NOT NULL DEFAULT 1;
