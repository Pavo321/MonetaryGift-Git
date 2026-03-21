package com.mysteriousmonkeys.chanlo.dto;

import com.mysteriousmonkeys.chanlo.money.PaymentStatus;

import java.time.LocalDateTime;

public record ParticipantResponse(
    int hisabId,
    int guestId,
    String guestName,
    String guestPhone,
    Double amount,
    PaymentStatus status,
    LocalDateTime joinedAt,
    String fromStop,
    String toStop,
    int seatsBooked
) {}
