package com.mysteriousmonkeys.chanlo.dto;

import com.mysteriousmonkeys.chanlo.event.ConfirmationType;
import com.mysteriousmonkeys.chanlo.event.Event;
import com.mysteriousmonkeys.chanlo.event.EventRouteStop;
import com.mysteriousmonkeys.chanlo.event.EventStatus;
import com.mysteriousmonkeys.chanlo.event.EventType;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Comparator;
import java.util.List;

public record EventResponse(
    int eventId,
    String eventName,
    LocalDate eventDate,
    String hostName,
    String hostVillage,
    String qrCodeImageUrl,
    EventStatus status,
    EventType eventType,
    ConfirmationType confirmationType,
    Integer capacity,
    Long pricePerPerson,
    Long activeParticipants,
    Long totalGiftsReceived,
    Long totalAmount,
    String location,
    String category,
    String deepLinkUrl,
    LocalTime eventTime,
    List<RouteStopResponse> routeStops,
    Float totalDistanceKm
) {
    public static EventResponse from(Event event, Long totalAmount, Long giftCount, Long activeParticipants) {
        List<RouteStopResponse> stops = event.getRouteStops() == null ? List.of() :
            event.getRouteStops().stream()
                .sorted(Comparator.comparingInt(EventRouteStop::getStopOrder))
                .map(s -> new RouteStopResponse(
                    s.getStopOrder(),
                    s.getStopName(),
                    s.getLat() != null ? s.getLat() : 0.0,
                    s.getLng() != null ? s.getLng() : 0.0,
                    s.getDistanceToNextKm()
                ))
                .toList();

        return new EventResponse(
            event.getEventId(),
            event.getEventName(),
            event.getEventDate(),
            event.getHost().getName(),
            event.getHost().getVillage(),
            event.getQrCodeImageUrl(),
            event.getStatus(),
            event.getEventType(),
            event.getConfirmationType(),
            event.getCapacity(),
            event.getPricePerPerson(),
            activeParticipants,
            giftCount,
            totalAmount,
            event.getLocation(),
            event.getCategory(),
            "mahotsava://event/" + event.getEventId(),
            event.getEventTime(),
            stops,
            event.getTotalDistanceKm()
        );
    }

    // backward-compatible factory for callers that don't have participant count
    public static EventResponse from(Event event, Long totalAmount, Long giftCount) {
        return from(event, totalAmount, giftCount, 0L);
    }
}
