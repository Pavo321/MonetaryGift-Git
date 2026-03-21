package com.mysteriousmonkeys.chanlo.dto;

import java.time.LocalDateTime;

/**
 * Internal model for tracking UPI collect requests
 */
public class UpiCollectRequest {
    private int hisabId;
    private String hostUpiId;
    private String guestUpiId;
    private Double amount;
    private String collectRequestId;
    private UpiCollectStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;

    public UpiCollectRequest() {}

    public UpiCollectRequest(int hisabId, String hostUpiId, String guestUpiId, Double amount) {
        this.hisabId = hisabId;
        this.hostUpiId = hostUpiId;
        this.guestUpiId = guestUpiId;
        this.amount = amount;
        this.collectRequestId = "COLLECT_" + System.currentTimeMillis() + "_" + hisabId;
        this.status = UpiCollectStatus.PENDING;
        this.createdAt = LocalDateTime.now();
        this.expiresAt = createdAt.plusMinutes(15); // 15 min expiry
    }

    public int getHisabId() {
        return hisabId;
    }

    public void setHisabId(int hisabId) {
        this.hisabId = hisabId;
    }

    public String getHostUpiId() {
        return hostUpiId;
    }

    public void setHostUpiId(String hostUpiId) {
        this.hostUpiId = hostUpiId;
    }

    public String getGuestUpiId() {
        return guestUpiId;
    }

    public void setGuestUpiId(String guestUpiId) {
        this.guestUpiId = guestUpiId;
    }

    public Double getAmount() {
        return amount;
    }

    public void setAmount(Double amount) {
        this.amount = amount;
    }

    public String getCollectRequestId() {
        return collectRequestId;
    }

    public void setCollectRequestId(String collectRequestId) {
        this.collectRequestId = collectRequestId;
    }

    public UpiCollectStatus getStatus() {
        return status;
    }

    public void setStatus(UpiCollectStatus status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(LocalDateTime expiresAt) {
        this.expiresAt = expiresAt;
    }

    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiresAt);
    }

    public void markAsSuccess() {
        this.status = UpiCollectStatus.SUCCESS;
    }

    public void markAsFailed() {
        this.status = UpiCollectStatus.FAILED;
    }

    public void markAsExpired() {
        this.status = UpiCollectStatus.EXPIRED;
    }
}
