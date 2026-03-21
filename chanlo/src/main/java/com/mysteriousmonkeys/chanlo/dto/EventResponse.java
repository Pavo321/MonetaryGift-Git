package com.mysteriousmonkeys.chanlo.dto;

import com.mysteriousmonkeys.chanlo.event.Event;
import com.mysteriousmonkeys.chanlo.event.EventStatus;

import java.time.LocalDate;

public record EventResponse(
    int eventId,
    String eventName,
    LocalDate eventDate,
    String hostName,
    String hostVillage,
    String qrCodeImageUrl,
    EventStatus status,
    Long totalGiftsReceived,
    Double totalAmount,
    Double cashAmount,
    Double upiAmount
) {
    public static EventResponse from(Event event, Double totalAmount, Long giftCount,
                                     Double cashAmount, Double upiAmount) {
        return new EventResponse(
            event.getEventId(),
            event.getEventName(),
            event.getEventDate(),
            event.getHost().getName(),
            event.getHost().getVillage(),
            event.getQrCodeImageUrl(),
            event.getStatus(),
            giftCount,
            totalAmount,
            cashAmount,
            upiAmount
        );
    }
}
