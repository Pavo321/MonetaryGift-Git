package com.mysteriousmonkeys.chanlo.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/**
 * DTO for WhatsApp webhook incoming messages
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record WhatsAppWebhookRequest(
    @JsonProperty("object") String object,
    @JsonProperty("entry") List<Entry> entry
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Entry(
        @JsonProperty("id") String id,
        @JsonProperty("changes") List<Change> changes
    ) {}
    
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Change(
        @JsonProperty("value") Value value,
        @JsonProperty("field") String field
    ) {}
    
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Value(
        @JsonProperty("messaging_product") String messagingProduct,
        @JsonProperty("metadata") Metadata metadata,
        @JsonProperty("contacts") List<Contact> contacts,
        @JsonProperty("messages") List<Message> messages,
        @JsonProperty("statuses") List<Status> statuses
    ) {}
    
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Metadata(
        @JsonProperty("display_phone_number") String displayPhoneNumber,
        @JsonProperty("phone_number_id") String phoneNumberId
    ) {}
    
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Contact(
        @JsonProperty("profile") Profile profile,
        @JsonProperty("wa_id") String waId
    ) {}
    
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Profile(
        @JsonProperty("name") String name
    ) {}
    
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Message(
        @JsonProperty("from") String from,
        @JsonProperty("id") String id,
        @JsonProperty("timestamp") String timestamp,
        @JsonProperty("text") Text text,
        @JsonProperty("type") String type
    ) {}
    
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Text(
        @JsonProperty("body") String body
    ) {}
    
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Status(
        @JsonProperty("id") String id,
        @JsonProperty("status") String status,
        @JsonProperty("timestamp") String timestamp,
        @JsonProperty("recipient_id") String recipientId,
        @JsonProperty("errors") List<StatusError> errors
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record StatusError(
        @JsonProperty("code") int code,
        @JsonProperty("title") String title,
        @JsonProperty("message") String message,
        @JsonProperty("error_data") ErrorData errorData
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ErrorData(
        @JsonProperty("details") String details
    ) {}
}

