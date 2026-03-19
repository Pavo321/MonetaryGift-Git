package com.mysteriousmonkeys.chanlo.money;

import com.mysteriousmonkeys.chanlo.event.Event;
import com.mysteriousmonkeys.chanlo.user.User;
import jakarta.persistence.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.Objects;

@Entity
@EntityListeners(AuditingEntityListener.class)
public class Hisab {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "hisab_id")
    private int hisabId;
    @ManyToOne
    @JoinColumn(name = "eventId", referencedColumnName = "eventId")
    private Event event;

    @ManyToOne
    @JoinColumn(name = "guestId", referencedColumnName = "id")
    private User guest;

    @ManyToOne
    @JoinColumn(name = "collected_by", referencedColumnName = "id")
    private User collectedBy;

    private Long amount;

    private String verificationQrData;
    
    @Enumerated(EnumType.STRING)
    private PaymentMethod paymentMethod;
    
    @Enumerated(EnumType.STRING)
    private PaymentStatus paymentStatus = PaymentStatus.PENDING;
    
    private String gatewayTransactionId;
    private String gatewayName;

    @Column(name = "from_stop_order")
    private Integer fromStopOrder;

    @Column(name = "to_stop_order")
    private Integer toStopOrder;

    @Column(name = "seats_booked")
    private int seatsBooked = 1;
    
    @CreatedDate
    private LocalDateTime createdAt;
    
    private LocalDateTime completedAt;

    public Hisab() {
    }

    public Hisab(int id, Event event, User guest, Long amount) {
        this.hisabId = id;
        this.event = event;
        this.guest = guest;
        this.amount = amount;
    }

    public int getHisabId() {
        return hisabId;
    }

    public void setHisabId(int hisabId) {
        this.hisabId = hisabId;
    }

    public Event getEvent() {
        return event;
    }

    public void setEvent(Event event) {
        this.event = event;
    }

    public User getGuest() {
        return guest;
    }

    public void setGuest(User guest) {
        this.guest = guest;
    }

    public Long getAmount() {
        return amount;
    }

    public void setAmount(Long amount) {
        this.amount = amount;
    }

    public PaymentMethod getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(PaymentMethod paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public PaymentStatus getPaymentStatus() {
        return paymentStatus;
    }

    public void setPaymentStatus(PaymentStatus paymentStatus) {
        this.paymentStatus = paymentStatus;
    }

    public String getGatewayTransactionId() {
        return gatewayTransactionId;
    }

    public void setGatewayTransactionId(String gatewayTransactionId) {
        this.gatewayTransactionId = gatewayTransactionId;
    }

    public String getGatewayName() {
        return gatewayName;
    }

    public void setGatewayName(String gatewayName) {
        this.gatewayName = gatewayName;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(LocalDateTime completedAt) {
        this.completedAt = completedAt;
    }

    public User getCollectedBy() {
        return collectedBy;
    }

    public void setCollectedBy(User collectedBy) {
        this.collectedBy = collectedBy;
    }

    public Integer getFromStopOrder() { return fromStopOrder; }
    public void setFromStopOrder(Integer fromStopOrder) { this.fromStopOrder = fromStopOrder; }

    public Integer getToStopOrder() { return toStopOrder; }
    public void setToStopOrder(Integer toStopOrder) { this.toStopOrder = toStopOrder; }

    public int getSeatsBooked() { return seatsBooked; }
    public void setSeatsBooked(int seatsBooked) { this.seatsBooked = seatsBooked; }

    public String getVerificationQrData() {
        return verificationQrData;
    }

    public void setVerificationQrData(String verificationQrData) {
        this.verificationQrData = verificationQrData;
    }

    public void markAsSuccess(String transactionId, LocalDateTime completedAt) {
        this.gatewayTransactionId = transactionId;
        this.paymentStatus = PaymentStatus.SUCCESS;
        this.completedAt = completedAt;
    }

    public void markAsFailed() {
        this.paymentStatus = PaymentStatus.FAILED;
    }

    public boolean isPending() {
        return this.paymentStatus == PaymentStatus.PENDING;
    }

    public boolean isCompleted() {
        return this.paymentStatus == PaymentStatus.SUCCESS;
    }

    @Override
    public String toString() {
        return "Hisab{" +
                "hisabId=" + hisabId +
                ", event=" + event +
                ", guest=" + guest +
                ", amount=" + amount +
                ", paymentMethod=" + paymentMethod +
                ", paymentStatus=" + paymentStatus +
                ", gatewayTransactionId='" + gatewayTransactionId + '\'' +
                ", gatewayName='" + gatewayName + '\'' +
                ", createdAt=" + createdAt +
                ", completedAt=" + completedAt +
                '}';
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Hisab hisab = (Hisab) o;
        return hisabId == hisab.hisabId && Objects.equals(event, hisab.event) && Objects.equals(guest, hisab.guest) && Objects.equals(amount, hisab.amount) && paymentMethod == hisab.paymentMethod && paymentStatus == hisab.paymentStatus && Objects.equals(gatewayTransactionId, hisab.gatewayTransactionId) && Objects.equals(gatewayName, hisab.gatewayName);
    }

    @Override
    public int hashCode() {
        return Objects.hash(hisabId, event, guest, amount, paymentMethod, paymentStatus, gatewayTransactionId, gatewayName);
    }
}
