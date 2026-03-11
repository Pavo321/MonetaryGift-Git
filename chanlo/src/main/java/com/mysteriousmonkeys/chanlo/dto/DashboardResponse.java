package com.mysteriousmonkeys.chanlo.dto;

import java.util.List;

public record DashboardResponse(
    String hostName,
    int totalPayments,
    int successfulPayments,
    int pendingPayments,
    Long totalAmountReceived,
    Long pendingAmount,
    List<DashboardPaymentResponse> payments
) {
    public static DashboardResponse create(
        String hostName,
        List<DashboardPaymentResponse> payments
    ) {
        int successful = 0;
        int pending = 0;
        long totalReceived = 0L;
        long pendingAmt = 0L;

        for (DashboardPaymentResponse payment : payments) {
            if (payment.status() == com.mysteriousmonkeys.chanlo.money.PaymentStatus.SUCCESS) {
                successful++;
                totalReceived += payment.amount();
            } else if (payment.status() == com.mysteriousmonkeys.chanlo.money.PaymentStatus.PENDING) {
                pending++;
                pendingAmt += payment.amount();
            }
        }

        return new DashboardResponse(
            hostName,
            payments.size(),
            successful,
            pending,
            totalReceived,
            pendingAmt,
            payments
        );
    }
}
