package com.mysteriousmonkeys.chanlo.dto;

/**
 * Response DTO after initiating UPI collect request
 */
public record UpiCollectResponse(
    int hisabId,
    String collectRequestId,
    String hostUpiId,
    String guestUpiId,
    Double amount,
    UpiCollectStatus status,
    String message
) {
    public static UpiCollectResponse success(int hisabId, String collectRequestId,
            String hostUpiId, String guestUpiId, Double amount) {
        return new UpiCollectResponse(
            hisabId,
            collectRequestId,
            hostUpiId,
            guestUpiId,
            amount,
            UpiCollectStatus.PENDING,
            "Payment request of Rs. " + amount + " sent to " + guestUpiId + " from " + hostUpiId
        );
    }

    public static UpiCollectResponse error(String message) {
        return new UpiCollectResponse(0, null, null, null, null, UpiCollectStatus.FAILED, message);
    }
}
