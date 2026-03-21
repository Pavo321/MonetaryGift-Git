package com.mysteriousmonkeys.chanlo.dto;

import com.mysteriousmonkeys.chanlo.money.PaymentMethod;
import jakarta.validation.constraints.NotNull;

/**
 * Simplified payment creation request for WhatsApp
 * Uses phone numbers instead of IDs
 */
public record WhatsAppCreatePaymentRequest(
    @NotNull String eventQrCode,
    @NotNull String guestPhoneNumber,
    @NotNull Double amount,
    PaymentMethod paymentMethod
) {}

