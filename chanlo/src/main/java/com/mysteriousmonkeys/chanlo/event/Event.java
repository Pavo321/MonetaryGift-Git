package com.mysteriousmonkeys.chanlo.event;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.mysteriousmonkeys.chanlo.user.User;
import jakarta.persistence.*;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

@Entity
@EntityListeners(AuditingEntityListener.class)
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Event {
    @jakarta.persistence.Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int eventId;
    private String eventName;
    
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "hostId", referencedColumnName = "id")
    private User host;
    
    @NotNull
    @FutureOrPresent
    private LocalDate eventDate;
    
    private String qrCodeData;
    private String qrCodeImageUrl;
    
    private String hostUpiId;
    
    @Size(max = 500)
    private String thankYouMessage = "Thank you for your generous contribution!";
    
    @Enumerated(EnumType.STRING)
    private EventStatus status = EventStatus.ACTIVE;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type")
    private EventType eventType = EventType.GIFT_COLLECTION;

    @Enumerated(EnumType.STRING)
    @Column(name = "confirmation_type")
    private ConfirmationType confirmationType;

    @Column(name = "capacity")
    private Integer capacity;

    @Column(name = "price_per_person")
    private Long pricePerPerson;

    @Column(name = "location")
    private String location;

    @Column(name = "category")
    private String category;

    @Column(name = "event_time")
    private LocalTime eventTime;

    @Column(name = "total_distance_km")
    private Float totalDistanceKm;

    @OneToMany(mappedBy = "event", cascade = CascadeType.ALL, fetch = FetchType.EAGER, orphanRemoval = true)
    private List<EventRouteStop> routeStops = new ArrayList<>();

    @CreatedDate
    private LocalDateTime createdAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "is_public")
    private boolean isPublic = false;

    @Column(name = "lat")
    private Double lat;

    @Column(name = "lng")
    private Double lng;



    public Event() {
    }

    public Event(int eventId, String eventName, User host) {
        this.eventId = eventId;
        this.eventName = eventName;
        this.host = host;
    }

    public Event(String eventName, User host, LocalDate eventDate) {
        this.eventName = eventName;
        this.host = host;
        this.eventDate = eventDate;
        this.status = EventStatus.ACTIVE;
        this.thankYouMessage = "Thank you for your generous contribution!";
    }

    public int getEventId() {
        return eventId;
    }

    public void setEventId(int eventId) {
        this.eventId = eventId;
    }

    public String getEventName() {
        return eventName;
    }

    public void setEventName(String eventName) {
        this.eventName = eventName;
    }

    public User getHost() {
        return host;
    }

    public void setHost(User host) {
        this.host = host;
    }

    public LocalDate getEventDate() {
        return eventDate;
    }

    public void setEventDate(LocalDate eventDate) {
        this.eventDate = eventDate;
    }

    public String getQrCodeData() {
        return qrCodeData;
    }

    public void setQrCodeData(String qrCodeData) {
        this.qrCodeData = qrCodeData;
    }

    public String getQrCodeImageUrl() {
        return qrCodeImageUrl;
    }

    public void setQrCodeImageUrl(String qrCodeImageUrl) {
        this.qrCodeImageUrl = qrCodeImageUrl;
    }

    public String getHostUpiId() {
        return hostUpiId;
    }

    public void setHostUpiId(String hostUpiId) {
        this.hostUpiId = hostUpiId;
    }

    public String getThankYouMessage() {
        return thankYouMessage;
    }

    public void setThankYouMessage(String thankYouMessage) {
        this.thankYouMessage = thankYouMessage;
    }

    public EventStatus getStatus() {
        return status;
    }

    public void setStatus(EventStatus status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getDeletedAt() {
        return deletedAt;
    }

    public void setDeletedAt(LocalDateTime deletedAt) {
        this.deletedAt = deletedAt;
    }

    public boolean isDeleted() {
        return deletedAt != null;
    }

    public boolean isPublic() {
        return isPublic;
    }

    public void setPublic(boolean isPublic) {
        this.isPublic = isPublic;
    }

    public Double getLat() {
        return lat;
    }

    public void setLat(Double lat) {
        this.lat = lat;
    }

    public Double getLng() {
        return lng;
    }

    public void setLng(Double lng) {
        this.lng = lng;
    }

    public boolean isCapacityBased() {
        return eventType == EventType.CAPACITY_EVENT;
    }

    public EventType getEventType() {
        return eventType;
    }

    public void setEventType(EventType eventType) {
        this.eventType = eventType;
    }

    public ConfirmationType getConfirmationType() {
        return confirmationType;
    }

    public void setConfirmationType(ConfirmationType confirmationType) {
        this.confirmationType = confirmationType;
    }

    public Integer getCapacity() {
        return capacity;
    }

    public void setCapacity(Integer capacity) {
        this.capacity = capacity;
    }

    public Long getPricePerPerson() {
        return pricePerPerson;
    }

    public void setPricePerPerson(Long pricePerPerson) {
        this.pricePerPerson = pricePerPerson;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public LocalTime getEventTime() {
        return eventTime;
    }

    public void setEventTime(LocalTime eventTime) {
        this.eventTime = eventTime;
    }

    public Float getTotalDistanceKm() {
        return totalDistanceKm;
    }

    public void setTotalDistanceKm(Float totalDistanceKm) {
        this.totalDistanceKm = totalDistanceKm;
    }

    public List<EventRouteStop> getRouteStops() {
        return routeStops;
    }

    public void setRouteStops(List<EventRouteStop> routeStops) {
        this.routeStops = routeStops;
    }

    public boolean isRouteBased() {
        return routeStops != null && routeStops.size() >= 2;
    }

    public List<String> getOrderedStopNames() {
        if (routeStops == null) return List.of();
        return routeStops.stream()
            .sorted(Comparator.comparingInt(EventRouteStop::getStopOrder))
            .map(EventRouteStop::getStopName)
            .toList();
    }

    public String generateQrCodeData() {
        if (this.eventId > 0) {
            this.qrCodeData = "EVENT_" + this.eventId;
        }
        return this.qrCodeData;
    }

    @Override
    public String toString() {
        return "Event{" +
                "eventId=" + eventId +
                ", eventName='" + eventName + '\'' +
                ", host=" + host +
                ", eventDate=" + eventDate +
                ", qrCodeData='" + qrCodeData + '\'' +
                ", qrCodeImageUrl='" + qrCodeImageUrl + '\'' +
                ", thankYouMessage='" + thankYouMessage + '\'' +
                ", status=" + status +
                ", createdAt=" + createdAt +
                '}';
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Event event = (Event) o;
        return eventId == event.eventId && Objects.equals(eventName, event.eventName) && Objects.equals(host, event.host) && Objects.equals(eventDate, event.eventDate) && Objects.equals(qrCodeData, event.qrCodeData) && status == event.status;
    }

    @Override
    public int hashCode() {
        return Objects.hash(eventId, eventName, host, eventDate, qrCodeData, status);
    }
}
