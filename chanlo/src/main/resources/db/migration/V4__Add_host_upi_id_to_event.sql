-- Add host UPI ID column to event table
ALTER TABLE event 
ADD COLUMN host_upi_id VARCHAR(255) AFTER qr_code_image_url;

