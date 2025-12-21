package com.mysteriousmonkeys.chanlo.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record EventCreateRequest(
    @NotNull String eventName,
    @NotNull @Future LocalDate eventDate,
    @NotNull Integer hostId,
    String hostUpiId,
    String thankYouMessage
) {}

