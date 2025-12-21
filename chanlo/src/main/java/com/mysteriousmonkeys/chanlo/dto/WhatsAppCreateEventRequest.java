package com.mysteriousmonkeys.chanlo.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

/**
 * Simplified event creation request for WhatsApp
 * Uses phone number instead of hostId
 */
public record WhatsAppCreateEventRequest(
    @NotNull String eventName,
    @NotNull @Future LocalDate eventDate,
    @NotNull String hostPhoneNumber,
    @NotNull String hostUpiId,
    String thankYouMessage
) {}

