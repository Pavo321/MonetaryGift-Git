package com.mysteriousmonkeys.chanlo.service;

import com.mysteriousmonkeys.chanlo.dto.UpiCollectRequest;
import com.mysteriousmonkeys.chanlo.dto.UpiCollectStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Mock UPI Collect Service
 *
 * This service simulates UPI collect request functionality.
 * In production, this would be replaced with actual payment gateway integration
 * (Razorpay, Cashfree, PhonePe Business, etc.)
 *
 * Current behavior (Mock):
 * - Stores collect requests in memory
 * - Simulates sending collect request to guest's UPI
 * - Provides endpoint to simulate payment completion
 *
 * Future (Real Gateway):
 * - Call gateway API to initiate UPI collect
 * - Handle payment webhooks for status updates
 * - Process refunds if needed
 */
@Service
public class UpiCollectService {

    private static final Logger log = LoggerFactory.getLogger(UpiCollectService.class);

    // In-memory storage for pending collect requests
    // Key: hisabId, Value: UpiCollectRequest
    private final Map<Integer, UpiCollectRequest> pendingRequests = new ConcurrentHashMap<>();

    /**
     * Initiate a UPI collect request (simulated)
     *
     * @param hisabId    The payment record ID
     * @param hostUpiId  The host's UPI ID (receiver)
     * @param guestUpiId The guest's UPI ID (payer)
     * @param amount     Amount in rupees
     * @return The created collect request
     */
    public UpiCollectRequest initiateCollect(int hisabId, String hostUpiId, String guestUpiId, Long amount) {
        log.info("Initiating UPI collect: hisabId={}, from={} to={}, amount={}",
                hisabId, guestUpiId, hostUpiId, amount);

        // Create collect request
        UpiCollectRequest collectRequest = new UpiCollectRequest(hisabId, hostUpiId, guestUpiId, amount);

        // Store in pending requests
        pendingRequests.put(hisabId, collectRequest);

        // In real implementation, this is where we'd call the payment gateway API
        // Example with Razorpay:
        // razorpayClient.createCollectRequest(guestUpiId, hostUpiId, amount, callbackUrl);

        log.info("UPI collect request created: collectRequestId={}, status={}",
                collectRequest.getCollectRequestId(), collectRequest.getStatus());

        // Simulate sending notification to guest's UPI app
        log.info("[SIMULATED] Payment request of Rs. {} sent to {} from {}",
                amount, guestUpiId, hostUpiId);

        return collectRequest;
    }

    /**
     * Get the status of a collect request
     *
     * @param hisabId The payment record ID
     * @return Optional containing the collect request if found
     */
    public Optional<UpiCollectRequest> getCollectRequest(int hisabId) {
        UpiCollectRequest request = pendingRequests.get(hisabId);

        if (request != null && request.isExpired() && request.getStatus() == UpiCollectStatus.PENDING) {
            request.markAsExpired();
            log.info("Collect request expired: hisabId={}", hisabId);
        }

        return Optional.ofNullable(request);
    }

    /**
     * Get the status of a collect request
     *
     * @param hisabId The payment record ID
     * @return The status, or null if not found
     */
    public UpiCollectStatus getStatus(int hisabId) {
        return getCollectRequest(hisabId)
                .map(UpiCollectRequest::getStatus)
                .orElse(null);
    }

    /**
     * Simulate payment success (for testing)
     * In production, this would be called by payment gateway webhook
     *
     * @param hisabId The payment record ID
     * @return true if successfully marked as paid
     */
    public boolean simulatePaymentSuccess(int hisabId) {
        UpiCollectRequest request = pendingRequests.get(hisabId);

        if (request == null) {
            log.warn("No pending collect request found for hisabId={}", hisabId);
            return false;
        }

        if (request.getStatus() != UpiCollectStatus.PENDING) {
            log.warn("Collect request is not pending: hisabId={}, status={}", hisabId, request.getStatus());
            return false;
        }

        if (request.isExpired()) {
            request.markAsExpired();
            log.warn("Collect request expired: hisabId={}", hisabId);
            return false;
        }

        request.markAsSuccess();
        log.info("[SIMULATED] Payment successful: hisabId={}, collectRequestId={}",
                hisabId, request.getCollectRequestId());

        return true;
    }

    /**
     * Simulate payment failure (for testing)
     *
     * @param hisabId The payment record ID
     * @return true if successfully marked as failed
     */
    public boolean simulatePaymentFailure(int hisabId) {
        UpiCollectRequest request = pendingRequests.get(hisabId);

        if (request == null) {
            log.warn("No pending collect request found for hisabId={}", hisabId);
            return false;
        }

        request.markAsFailed();
        log.info("[SIMULATED] Payment failed: hisabId={}", hisabId);

        return true;
    }

    /**
     * Remove a collect request from pending (cleanup)
     *
     * @param hisabId The payment record ID
     */
    public void removeRequest(int hisabId) {
        pendingRequests.remove(hisabId);
    }

    /**
     * Get count of pending requests (for monitoring)
     *
     * @return Number of pending collect requests
     */
    public int getPendingCount() {
        return (int) pendingRequests.values().stream()
                .filter(r -> r.getStatus() == UpiCollectStatus.PENDING)
                .count();
    }
}
