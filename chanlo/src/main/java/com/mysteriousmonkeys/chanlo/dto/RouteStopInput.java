package com.mysteriousmonkeys.chanlo.dto;

public record RouteStopInput(
    String name,
    double lat,
    double lng,
    Float distanceToNextKm
) {}
