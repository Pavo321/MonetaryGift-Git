package com.mysteriousmonkeys.chanlo.event;

public enum EventStatus {
    ACTIVE,
    CONFIRMED,   // CAPACITY_EVENT confirmed by host (MANUAL) or auto-filled (AUTO)
    COMPLETED,
    CANCELLED
}

