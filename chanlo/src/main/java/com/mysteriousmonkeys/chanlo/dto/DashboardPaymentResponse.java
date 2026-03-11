package com.mysteriousmonkeys.chanlo.dto;

import com.mysteriousmonkeys.chanlo.money.Hisab;
import com.mysteriousmonkeys.chanlo.money.PaymentStatus;

import java.time.LocalDateTime;

public record DashboardPaymentResponse(
    int hisabId,
    String guestName,
    String guestVillage,
    String eventName,
    Long amount,
    PaymentStatus status,
    LocalDateTime createdAt,
    LocalDateTime completedAt
) {
    public static DashboardPaymentResponse from(Hisab hisab) {
        return new DashboardPaymentResponse(
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
