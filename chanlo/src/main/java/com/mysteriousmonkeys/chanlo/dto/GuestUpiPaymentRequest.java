package com.mysteriousmonkeys.chanlo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;

/**
 * Request DTO for guest to initiate UPI collect payment
 */
public record GuestUpiPaymentRequest(
    @NotBlank(message = "Event QR code is required")
    String eventQrCode,

    @NotBlank(message = "Guest name is required")
    String guestName,

    String guestVillage,

    @NotBlank(message = "Guest phone number is required")
    @Pattern(regexp = "^\\d{10}$", message = "Phone number must be 10 digits")
    String guestPhoneNumber,

    @NotBlank(message = "Guest UPI ID is required")
    @Pattern(regexp = "^[a-zA-Z0-9.\\-_]+@[a-zA-Z]+$", message = "Invalid UPI ID format")
    String guestUpiId,

    @NotNull(message = "Amount is required")
    @Positive(message = "Amount must be greater than 0")
    Long amount
) {}
