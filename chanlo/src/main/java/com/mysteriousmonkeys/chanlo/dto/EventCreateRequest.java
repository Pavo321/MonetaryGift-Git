package com.mysteriousmonkeys.chanlo.dto;

import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record EventCreateRequest(
    @NotNull String eventName,
    @NotNull @FutureOrPresent LocalDate eventDate,
    @NotNull Integer hostId,
    String hostUpiId,
    String thankYouMessage
) {}

