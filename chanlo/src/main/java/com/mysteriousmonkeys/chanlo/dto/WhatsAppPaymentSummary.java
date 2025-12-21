package com.mysteriousmonkeys.chanlo.dto;

/**
 * Limited payment information for WhatsApp hosts
 * Only shows: name, amount, village (for privacy)
 */
public record WhatsAppPaymentSummary(
    String guestName,
    Long amount,
    String village,
    String paymentStatus
) {
    public static WhatsAppPaymentSummary from(String guestName, Long amount, String village, String paymentStatus) {
        return new WhatsAppPaymentSummary(guestName, amount, village, paymentStatus);
    }
}

