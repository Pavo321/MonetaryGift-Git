package com.mysteriousmonkeys.chanlo.dto;

/**
 * Status of a UPI collect request
 */
public enum UpiCollectStatus {
    PENDING,      // Collect request sent, waiting for payment
    SUCCESS,      // Payment completed successfully
    FAILED,       // Payment failed or rejected
    EXPIRED       // Collect request expired (timeout)
}
