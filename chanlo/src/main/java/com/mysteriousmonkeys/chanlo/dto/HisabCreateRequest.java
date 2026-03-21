package com.mysteriousmonkeys.chanlo.dto;

import com.mysteriousmonkeys.chanlo.money.PaymentMethod;
import jakarta.validation.constraints.NotNull;

public record HisabCreateRequest(
    @NotNull Integer eventId,
    @NotNull Integer guestId,
    @NotNull Double amount,
    PaymentMethod paymentMethod
) {}

