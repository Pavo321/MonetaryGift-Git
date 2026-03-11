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
    
    @CreatedDate
    private LocalDateTime createdAt;



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
