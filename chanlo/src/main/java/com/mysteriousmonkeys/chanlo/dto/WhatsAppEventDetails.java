package com.mysteriousmonkeys.chanlo.dto;

/**
 * Event details returned when guest scans QR code
 */
public record WhatsAppEventDetails(
    int eventId,
    String eventName,
    String eventDate,
    String hostName,
    String hostUpiId,
    String thankYouMessage
) {}

