package com.mysteriousmonkeys.chanlo.dto;

/**
 * Response DTO containing UPI deep links for guest payment
 *
 * Guests can click any of these links to open their UPI app and pay directly.
 * The genericUpiLink works with all UPI apps, while app-specific links
 * open directly in the respective app if installed.
 */
public record UpiPaymentLinkResponse(
    int hisabId,
    String eventName,
    String hostName,
    Long amount,
    String genericUpiLink,
    String googlePayLink,
    String phonePeLink,
    String paytmLink,
    String bhimLink,
    String message
) {
    /**
     * Create a success response with all payment links
     */
    public static UpiPaymentLinkResponse success(
            int hisabId,
            String eventName,
            String hostName,
            Long amount,
            String genericUpiLink,
            String googlePayLink,
            String phonePeLink,
            String paytmLink,
            String bhimLink) {
        return new UpiPaymentLinkResponse(
            hisabId,
            eventName,
            hostName,
            amount,
            genericUpiLink,
            googlePayLink,
            phonePeLink,
            paytmLink,
            bhimLink,
            "Click any link to pay directly via UPI"
        );
    }

    /**
     * Create an error response
     */
    public static UpiPaymentLinkResponse error(String errorMessage) {
        return new UpiPaymentLinkResponse(
            0, null, null, null, null, null, null, null, null, errorMessage
        );
    }
}
