package com.mysteriousmonkeys.chanlo.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * DTO for sending messages via WhatsApp Cloud API
 */
public record WhatsAppMessageRequest(
    @JsonProperty("messaging_product") String messagingProduct,
    @JsonProperty("recipient_type") String recipientType,
    @JsonProperty("to") String to,
    @JsonProperty("type") String type,
    @JsonProperty("text") TextContent text
) {
    public record TextContent(
        @JsonProperty("preview_url") boolean previewUrl,
        @JsonProperty("body") String body
    ) {}
    
    public static WhatsAppMessageRequest createTextMessage(String to, String message) {
        return new WhatsAppMessageRequest(
            "whatsapp",
            "individual",
            to,
            "text",
            new TextContent(false, message)
        );
    }
}

