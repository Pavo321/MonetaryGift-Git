package com.mysteriousmonkeys.chanlo.dto;

import com.mysteriousmonkeys.chanlo.money.PaymentMethod;
import jakarta.validation.constraints.NotNull;

/**
 * Guest payment request after scanning QR code
 * WhatsApp collects: name, village, phone, amount
 */
public record WhatsAppGuestPaymentRequest(
    @NotNull String eventQrCode,
    @NotNull String guestName,
    String guestVillage,
    @NotNull String guestPhoneNumber,
    @NotNull Long amount,
    PaymentMethod paymentMethod
) {}

