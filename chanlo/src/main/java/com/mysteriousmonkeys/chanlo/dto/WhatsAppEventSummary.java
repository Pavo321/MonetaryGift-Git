package com.mysteriousmonkeys.chanlo.dto;

import java.util.List;

/**
 * Event summary for WhatsApp with limited payment details
 */
public record WhatsAppEventSummary(
    int eventId,
    String eventName,
    String eventDate,
    Long totalAmount,
    Long totalGifts,
    List<WhatsAppPaymentSummary> payments
) {}

