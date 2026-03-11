-- Add UPI_DEEP_LINK to allowed payment methods
ALTER TABLE hisab DROP CONSTRAINT chk_payment_method;

ALTER TABLE hisab ADD CONSTRAINT chk_payment_method
    CHECK (payment_method IN ('UPI_QR', 'UPI_COLLECT', 'UPI_DEEP_LINK', 'PAYMENT_LINK', 'WHATSAPP_NATIVE', 'MANUAL') OR payment_method IS NULL);
