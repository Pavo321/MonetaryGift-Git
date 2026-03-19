package com.mysteriousmonkeys.chanlo.dto;

public record RouteStopResponse(
    int stopOrder,
    String name,
    double lat,
    double lng,
    Float distanceToNextKm
) {}
