package com.mysteriousmonkeys.chanlo.event;

import jakarta.persistence.*;

@Entity
@Table(name = "event_route_stop")
public class EventRouteStop {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id", referencedColumnName = "eventId", nullable = false)
    private Event event;

    @Column(name = "stop_name", nullable = false)
    private String stopName;

    @Column(name = "stop_order", nullable = false)
    private int stopOrder;

    @Column(name = "lat")
    private Double lat;

    @Column(name = "lng")
    private Double lng;

    @Column(name = "distance_to_next_km")
    private Float distanceToNextKm;

    public EventRouteStop() {}

    public EventRouteStop(Event event, String stopName, int stopOrder) {
        this.event = event;
        this.stopName = stopName;
        this.stopOrder = stopOrder;
    }

    public EventRouteStop(Event event, String stopName, int stopOrder, Double lat, Double lng, Float distanceToNextKm) {
        this.event = event;
        this.stopName = stopName;
        this.stopOrder = stopOrder;
        this.lat = lat;
        this.lng = lng;
        this.distanceToNextKm = distanceToNextKm;
    }

    public int getId() { return id; }
    public Event getEvent() { return event; }
    public void setEvent(Event event) { this.event = event; }
    public String getStopName() { return stopName; }
    public void setStopName(String stopName) { this.stopName = stopName; }
    public int getStopOrder() { return stopOrder; }
    public void setStopOrder(int stopOrder) { this.stopOrder = stopOrder; }
    public Double getLat() { return lat; }
    public void setLat(Double lat) { this.lat = lat; }
    public Double getLng() { return lng; }
    public void setLng(Double lng) { this.lng = lng; }
    public Float getDistanceToNextKm() { return distanceToNextKm; }
    public void setDistanceToNextKm(Float distanceToNextKm) { this.distanceToNextKm = distanceToNextKm; }
}
