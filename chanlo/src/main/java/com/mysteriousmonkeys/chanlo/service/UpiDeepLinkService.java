package com.mysteriousmonkeys.chanlo.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

/**
 * Service to generate UPI deep links for direct payment to host
 *
 * UPI deep links allow guests to pay directly to the host's UPI ID
 * without any intermediary. The money goes straight to the host.
 *
 * Supported UPI apps: Google Pay, PhonePe, Paytm, BHIM, and all UPI apps
 */
@Service
public class UpiDeepLinkService {

    private static final Logger log = LoggerFactory.getLogger(UpiDeepLinkService.class);

    /**
     * Generate a UPI deep link for payment
     *
     * @param payeeUpiId   Host's UPI ID (e.g., "host@paytm")
     * @param payeeName    Host's name for display
     * @param amount       Amount in rupees
     * @param transactionNote Note/description for the payment
     * @return UPI deep link URL
     */
    public String generateUpiDeepLink(String payeeUpiId, String payeeName, Long amount, String transactionNote) {
        try {
            StringBuilder upiLink = new StringBuilder("upi://pay?");

            // Payee VPA (UPI ID) - required
            upiLink.append("pa=").append(encode(payeeUpiId));

            // Payee Name - for display
            upiLink.append("&pn=").append(encode(payeeName));

            // Amount - in decimal format
            upiLink.append("&am=").append(amount).append(".00");

            // Currency - INR
            upiLink.append("&cu=INR");

            // Transaction Note
            if (transactionNote != null && !transactionNote.isEmpty()) {
                upiLink.append("&tn=").append(encode(transactionNote));
            }

            String link = upiLink.toString();
            log.info("Generated UPI deep link for {} to {}: amount={}", payeeName, payeeUpiId, amount);

            return link;
        } catch (Exception e) {
            log.error("Error generating UPI deep link: {}", e.getMessage(), e);
            return null;
        }
    }

    /**
     * Generate UPI deep link for an event gift
     *
     * @param hostUpiId    Host's UPI ID
     * @param hostName     Host's name
     * @param eventName    Event name (for transaction note)
     * @param guestName    Guest's name (for transaction note)
     * @param amount       Gift amount
     * @return UPI deep link URL
     */
    public String generateGiftPaymentLink(String hostUpiId, String hostName,
            String eventName, String guestName, Long amount) {

        String transactionNote = String.format("Gift from %s for %s",
                guestName != null ? guestName : "Guest",
                eventName != null ? eventName : "Event");

        return generateUpiDeepLink(hostUpiId, hostName, amount, transactionNote);
    }

    /**
     * Generate a clickable HTTP URL that redirects to UPI
     * This works better in some contexts (WhatsApp, web browsers)
     *
     * @param payeeUpiId   Host's UPI ID
     * @param payeeName    Host's name
     * @param amount       Amount in rupees
     * @param transactionNote Note for the payment
     * @return HTTP URL that opens UPI apps
     */
    public String generateUpiIntentUrl(String payeeUpiId, String payeeName, Long amount, String transactionNote) {
        // Some UPI apps respond better to intent:// format
        String upiLink = generateUpiDeepLink(payeeUpiId, payeeName, amount, transactionNote);
        if (upiLink == null) return null;

        // Convert upi:// to intent format for better Android compatibility
        // Format: intent://pay?pa=...#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end
        // But upi:// works for most cases

        return upiLink;
    }

    /**
     * Generate payment links for multiple UPI apps
     * Returns links that directly open specific apps
     */
    public UpiPaymentLinks generateAllPaymentLinks(String payeeUpiId, String payeeName,
            Long amount, String transactionNote) {

        String baseParams = String.format("pa=%s&pn=%s&am=%d.00&cu=INR&tn=%s",
                encode(payeeUpiId),
                encode(payeeName),
                amount,
                encode(transactionNote != null ? transactionNote : "Payment"));

        return new UpiPaymentLinks(
                "upi://pay?" + baseParams,                                    // Generic UPI
                "gpay://upi/pay?" + baseParams,                              // Google Pay
                "phonepe://pay?" + baseParams,                               // PhonePe
                "paytmmp://pay?" + baseParams,                               // Paytm
                "bhim://pay?" + baseParams                                   // BHIM
        );
    }

    /**
     * URL encode a string for use in UPI links
     */
    private String encode(String value) {
        if (value == null) return "";
        try {
            return URLEncoder.encode(value, StandardCharsets.UTF_8.toString())
                    .replace("+", "%20");
        } catch (Exception e) {
            return value.replace(" ", "%20");
        }
    }

    /**
     * Container for multiple UPI app links
     */
    public record UpiPaymentLinks(
            String genericUpi,
            String googlePay,
            String phonePe,
            String paytm,
            String bhim
    ) {}
}
