package com.mysteriousmonkeys.chanlo.dto;

import com.mysteriousmonkeys.chanlo.money.Hisab;
import com.mysteriousmonkeys.chanlo.money.PaymentStatus;

import java.time.LocalDateTime;

public record HisabResponse(
    int hisabId,
    String guestName,
    String guestVillage,
    String eventName,
    Double amount,
    PaymentStatus status,
    LocalDateTime createdAt,
    LocalDateTime completedAt
) {
    public static HisabResponse from(Hisab hisab) {
        return new HisabResponse(
            hisab.getHisabId(),
            hisab.getGuest().getName(),
            hisab.getGuest().getVillage(),
            hisab.getEvent().getEventName(),
            hisab.getAmount(),
            hisab.getPaymentStatus(),
            hisab.getCreatedAt(),
            hisab.getCompletedAt()
        );
    }
}

