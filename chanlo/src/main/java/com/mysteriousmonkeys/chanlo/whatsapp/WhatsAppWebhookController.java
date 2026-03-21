package com.mysteriousmonkeys.chanlo.whatsapp;

import com.mysteriousmonkeys.chanlo.dto.WhatsAppWebhookRequest;
import com.mysteriousmonkeys.chanlo.service.ChatbotService;
import com.mysteriousmonkeys.chanlo.service.WhatsAppApiService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Controller for WhatsApp Business API webhook
 * Handles webhook verification and incoming messages
 */
@RestController
@RequestMapping("/webhook")
public class WhatsAppWebhookController {
    
    private static final Logger log = LoggerFactory.getLogger(WhatsAppWebhookController.class);
    
    @Value("${whatsapp.webhook.verify.token}")
    private String verifyToken;
    
    private final ChatbotService chatbotService;
    private final WhatsAppApiService whatsAppApiService;
    
    public WhatsAppWebhookController(ChatbotService chatbotService, WhatsAppApiService whatsAppApiService) {
        this.chatbotService = chatbotService;
        this.whatsAppApiService = whatsAppApiService;
    }
    
    /**
     * Webhook verification endpoint (GET)
     * WhatsApp sends a GET request to verify your webhook endpoint
     * 
     * Query parameters:
     * - hub.mode: "subscribe"
     * - hub.verify_token: Your verify token
     * - hub.challenge: Random string to echo back
     */
    @GetMapping
    public ResponseEntity<String> verifyWebhook(
            @RequestParam("hub.mode") String mode,
            @RequestParam("hub.verify_token") String token,
            @RequestParam("hub.challenge") String challenge) {
        
        log.info("Webhook verification request: mode={}, token={}", mode, token);
        
        if ("subscribe".equals(mode) && verifyToken.equals(token)) {
            log.info("Webhook verified successfully");
            return ResponseEntity.ok(challenge);
        } else {
            log.warn("Webhook verification failed: mode={}, token match={}", mode, verifyToken.equals(token));
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Verification failed");
        }
    }
    
    /**
     * Webhook message handler (POST)
     * WhatsApp sends POST requests with incoming messages
     */
    @PostMapping
    public ResponseEntity<String> handleWebhook(@RequestBody WhatsAppWebhookRequest request) {
        try {
            log.info("Received webhook: object={}", request.object());
            
            // Verify it's a WhatsApp message
            if (!"whatsapp_business_account".equals(request.object())) {
                log.warn("Unknown webhook object type: {}", request.object());
                return ResponseEntity.ok("OK");
            }
            
            // Process each entry
            if (request.entry() != null) {
                for (WhatsAppWebhookRequest.Entry entry : request.entry()) {
                    if (entry.changes() != null) {
                        for (WhatsAppWebhookRequest.Change change : entry.changes()) {
                            WhatsAppWebhookRequest.Value value = change.value();
                            
                            // Handle incoming messages
                            if (value.messages() != null && !value.messages().isEmpty()) {
                                for (WhatsAppWebhookRequest.Message message : value.messages()) {
                                    handleIncomingMessage(message);
                                }
                            }
                            
                            // Handle message status updates (optional - for delivery receipts)
                            if (value.statuses() != null && !value.statuses().isEmpty()) {
                                for (WhatsAppWebhookRequest.Status status : value.statuses()) {
                                    log.info("Message status update: id={}, status={}", status.id(), status.status());
                                    if ("failed".equals(status.status()) && status.errors() != null) {
                                        for (WhatsAppWebhookRequest.StatusError err : status.errors()) {
                                            log.error("WhatsApp error: code={}, title={}, message={}, details={}",
                                                err.code(), err.title(), err.message(),
                                                err.errorData() != null ? err.errorData().details() : "none");
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            
            // Always return 200 OK to acknowledge receipt
            return ResponseEntity.ok("OK");
            
        } catch (Exception e) {
            log.error("Error processing webhook: {}", e.getMessage(), e);
            // Still return 200 to prevent WhatsApp from retrying
            return ResponseEntity.ok("OK");
        }
    }
    
    /** Send text to bot, only sendTextMessage if bot returns non-empty (interactive already sent by bot) */
    private void dispatchToBot(String from, String input) {
        String response = chatbotService.processMessage(from, input);
        if (response != null && !response.isEmpty()) {
            boolean sent = whatsAppApiService.sendTextMessage(from, response);
            if (!sent) log.error("Failed to send response to: {}", from);
        }
    }

    /**
     * Handle incoming message from WhatsApp
     */
    private void handleIncomingMessage(WhatsAppWebhookRequest.Message message) {
        try {
            String from = message.from();
            String messageId = message.id();
            String messageType = message.type();
            
            log.info("Incoming message: from={}, id={}, type={}", from, messageId, messageType);
            
            if ("text".equals(messageType) && message.text() != null) {
                String text = message.text().body();
                log.info("Message text: {}", text);
                dispatchToBot(from, text);

            } else if ("interactive".equals(messageType) && message.interactive() != null) {
                // User tapped a button or selected from a list — extract the button/row ID
                var interactive = message.interactive();
                String selectedId = null;
                if ("button_reply".equals(interactive.type()) && interactive.buttonReply() != null) {
                    selectedId = interactive.buttonReply().id();
                } else if ("list_reply".equals(interactive.type()) && interactive.listReply() != null) {
                    selectedId = interactive.listReply().id();
                }
                if (selectedId != null) {
                    log.info("Interactive reply from {}: id={}", from, selectedId);
                    dispatchToBot(from, selectedId);
                }
            } else {
                log.info("Ignoring message type: {}", messageType);
            }
            
        } catch (Exception e) {
            log.error("Error handling incoming message: {}", e.getMessage(), e);
        }
    }
}

