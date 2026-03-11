package com.mysteriousmonkeys.chanlo.dto;

import java.time.LocalDateTime;

/**
 * Limited payment information for WhatsApp hosts
 * Only shows: name, amount, village, status, and payment date
 */
public record WhatsAppPaymentSummary(
    String guestName,
    Long amount,
    String village,
    String paymentStatus,
    LocalDateTime createdAt,
    LocalDateTime completedAt
) {
    public static WhatsAppPaymentSummary from(String guestName, Long amount, String village,
            String paymentStatus, LocalDateTime createdAt, LocalDateTime completedAt) {
        return new WhatsAppPaymentSummary(guestName, amount, village, paymentStatus, createdAt, completedAt);
    }

    /**
     * Returns the payment date - completedAt if payment is done, otherwise createdAt
     */
    public LocalDateTime getPaymentDate() {
        return completedAt != null ? completedAt : createdAt;
    }
}

