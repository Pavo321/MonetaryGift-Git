package com.mysteriousmonkeys.chanlo.dto;

import com.mysteriousmonkeys.chanlo.event.ConfirmationType;
import com.mysteriousmonkeys.chanlo.event.EventType;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public record EventCreateRequest(
    @NotNull String eventName,
    @NotNull @FutureOrPresent LocalDate eventDate,
    @NotNull Integer hostId,
    String hostUpiId,
    String thankYouMessage,
    EventType eventType,               // null defaults to GIFT_COLLECTION
    ConfirmationType confirmationType, // required when eventType == CAPACITY_EVENT
    Integer capacity,                  // required when eventType == CAPACITY_EVENT
    Long pricePerPerson,               // full route price for TRAVEL; price/person for others
    String location,                   // optional venue location
    @NotBlank String category,         // required: TRAVEL, MUSIC, SPORT, FOOD, SOCIAL, OTHER
    LocalTime eventTime,               // optional approximate start time
    List<RouteStopInput> routeStops,   // ordered stops with lat/lng/distance (TRAVEL only)
    Float totalDistanceKm              // total route distance in km (TRAVEL only)
) {}
