package com.mysteriousmonkeys.chanlo.whatsapp;

import com.mysteriousmonkeys.chanlo.dto.*;
import com.mysteriousmonkeys.chanlo.event.Event;
import com.mysteriousmonkeys.chanlo.exception.UserNotFoundException;
import com.mysteriousmonkeys.chanlo.money.Hisab;
import com.mysteriousmonkeys.chanlo.service.EventService;
import com.mysteriousmonkeys.chanlo.service.HisabService;
import com.mysteriousmonkeys.chanlo.service.UserService;
import com.mysteriousmonkeys.chanlo.user.User;
import com.mysteriousmonkeys.chanlo.user.UserRepository;
import com.mysteriousmonkeys.chanlo.user.UserRole;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * WhatsApp-optimized endpoints for bot integration
 * Uses phone numbers for identification
 * Hosts can only access their own events with limited data
 */
@RestController
@RequestMapping("/whatsapp")
public class WhatsAppResource {
    
    private static final Logger log = LoggerFactory.getLogger(WhatsAppResource.class);
    
    @Autowired
    private UserService userService;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private EventService eventService;
    
    @Autowired
    private HisabService hisabService;
    
    /**
     * Create or get user by phone number
     * POST /whatsapp/user
     */
    @PostMapping("/user")
    public ResponseEntity<User> createOrGetUser(
            @RequestParam String phoneNumber,
            @RequestParam String name,
            @RequestParam(required = false) String village) {
        try {
            // Try to find existing user
            User user = userService.findByPhoneNumber(phoneNumber);
            log.info("User found: {}", phoneNumber);
            return ResponseEntity.ok(user);
        } catch (UserNotFoundException e) {
            // Create new user
            UserCreateRequest request = new UserCreateRequest(name, village, phoneNumber, UserRole.GUEST);
            User user = userService.createUser(request);
            log.info("User created: {}", phoneNumber);
            return ResponseEntity.ok(user);
        }
    }
    
    /**
     * Create event (host must exist)
     * POST /whatsapp/event
     */
    @PostMapping("/event")
    public ResponseEntity<Event> createEvent(@Valid @RequestBody WhatsAppCreateEventRequest request) {
        log.info("Creating event via WhatsApp: {} by {}", request.eventName(), request.hostPhoneNumber());
        
        // Get or create host
        User host;
        try {
            host = userService.findByPhoneNumber(request.hostPhoneNumber());
        } catch (UserNotFoundException e) {
            throw new UserNotFoundException("Host not found. Please register first with phone: " + request.hostPhoneNumber());
        }
        
        // Update host role to ORGANIZER if not already
        if (host.getRole() != UserRole.ORGANIZER) {
            host.setRole(UserRole.ORGANIZER);
            userRepository.save(host);
        }
        
        // Create event
        EventCreateRequest eventRequest = new EventCreateRequest(
            request.eventName(),
            request.eventDate(),
            host.getId(),
            request.hostUpiId(),
            request.thankYouMessage()
        );
        
        Event event = eventService.createEvent(eventRequest);
        return ResponseEntity.ok(event);
    }
    
    /**
     * Get all events for a host (by phone number)
     * GET /whatsapp/events?phoneNumber={phone}
     */
    @GetMapping("/events")
    public ResponseEntity<List<Event>> getHostEvents(@RequestParam String phoneNumber) {
        log.info("Fetching events for host: {}", phoneNumber);
        List<Event> events = eventService.getEventsByHostPhone(phoneNumber);
        return ResponseEntity.ok(events);
    }
    
    /**
     * Get event details with payment summary (host only, limited data)
     * GET /whatsapp/event/{eventId}?phoneNumber={hostPhone}
     */
    @GetMapping("/event/{eventId}")
    public ResponseEntity<WhatsAppEventSummary> getEventSummary(
            @PathVariable int eventId,
            @RequestParam String phoneNumber) {
        log.info("Fetching event summary: {} for host: {}", eventId, phoneNumber);
        
        // Verify host owns this event
        Event event = eventService.getEventByHostPhone(eventId, phoneNumber);
        
        // Get payments with limited data
        List<WhatsAppPaymentSummary> payments = hisabService.getPaymentsForEvent(eventId);
        
        // Calculate totals
        Long totalAmount = payments.stream()
            .filter(p -> "SUCCESS".equals(p.paymentStatus()))
            .mapToLong(WhatsAppPaymentSummary::amount)
            .sum();
        
        Long totalGifts = payments.stream()
            .filter(p -> "SUCCESS".equals(p.paymentStatus()))
            .count();
        
        WhatsAppEventSummary summary = new WhatsAppEventSummary(
            event.getEventId(),
            event.getEventName(),
            event.getEventDate().toString(),
            totalAmount,
            totalGifts,
            payments
        );
        
        return ResponseEntity.ok(summary);
    }
    
    /**
     * Scan QR code to get event details
     * GET /whatsapp/scan/{qrCode}
     */
    @GetMapping("/scan/{qrCode}")
    public ResponseEntity<WhatsAppEventDetails> scanQRCode(@PathVariable String qrCode) {
        log.info("Scanning QR code: {}", qrCode);
        
        // Find event by QR code
        Event event = eventService.findByQrCode(qrCode);
        
        WhatsAppEventDetails details = new WhatsAppEventDetails(
            event.getEventId(),
            event.getEventName(),
            event.getEventDate().toString(),
            event.getHost().getName(),
            event.getHostUpiId(),
            event.getThankYouMessage()
        );
        
        return ResponseEntity.ok(details);
    }
    
    /**
     * Create payment after scanning QR code
     * WhatsApp collects: name, village, phone, amount
     * POST /whatsapp/payment
     */
    @PostMapping("/payment")
    public ResponseEntity<Hisab> createGuestPayment(@Valid @RequestBody WhatsAppGuestPaymentRequest request) {
        log.info("Creating guest payment: eventQR={}, guest={}, amount={}", 
            request.eventQrCode(), request.guestPhoneNumber(), request.amount());
        
        // Find event by QR code
        Event event = eventService.findByQrCode(request.eventQrCode());
        
        // Get or create guest
        User guest;
        try {
            guest = userService.findByPhoneNumber(request.guestPhoneNumber());
            // Update name and village if provided
            if (request.guestName() != null && !request.guestName().isEmpty()) {
                guest.setName(request.guestName());
            }
            if (request.guestVillage() != null && !request.guestVillage().isEmpty()) {
                guest.setVillage(request.guestVillage());
            }
            userRepository.save(guest);
        } catch (UserNotFoundException e) {
            // Create new guest user
            UserCreateRequest userRequest = new UserCreateRequest(
                request.guestName(),
                request.guestVillage(),
                request.guestPhoneNumber(),
                UserRole.GUEST
            );
            guest = userService.createUser(userRequest);
        }
        
        // Create payment
        HisabCreateRequest hisabRequest = new HisabCreateRequest(
            event.getEventId(),
            guest.getId(),
            request.amount(),
            request.paymentMethod()
        );
        
        Hisab hisab = hisabService.createHisab(hisabRequest);
        return ResponseEntity.ok(hisab);
    }
    
    /**
     * Confirm payment (after WhatsApp payment gateway confirmation)
     * POST /whatsapp/payment/{hisabId}/confirm
     */
    @PostMapping("/payment/{hisabId}/confirm")
    public ResponseEntity<Hisab> confirmPayment(
            @PathVariable int hisabId,
            @RequestParam(required = false) String transactionId,
            @RequestParam(required = false) String gatewayName) {
        log.info("Confirming payment: hisabId={}, transactionId={}", hisabId, transactionId);
        
        if (transactionId != null && !transactionId.isEmpty()) {
            // Mark as success
            Hisab hisab = hisabService.markPaymentSuccess(
                hisabId, 
                transactionId, 
                gatewayName != null ? gatewayName : "WHATSAPP"
            );
            return ResponseEntity.ok(hisab);
        } else {
            // Mark as failed if no transaction ID
            Hisab hisab = hisabService.markPaymentFailed(hisabId);
            return ResponseEntity.ok(hisab);
        }
    }
    
    /**
     * Get QR code for event (host only)
     * GET /whatsapp/event/{eventId}/qr?phoneNumber={hostPhone}
     */
    @GetMapping("/event/{eventId}/qr")
    public ResponseEntity<String> getEventQRCode(
            @PathVariable int eventId,
            @RequestParam String phoneNumber) {
        log.info("Fetching QR code for event: {} by host: {}", eventId, phoneNumber);
        
        // Verify host owns this event
        Event event = eventService.getEventByHostPhone(eventId, phoneNumber);
        
        String qrCodeData = event.getQrCodeData();
        if (qrCodeData == null || qrCodeData.isEmpty()) {
            qrCodeData = "EVENT_" + event.getEventId();
            event.setQrCodeData(qrCodeData);
            // Save the updated QR code
            eventService.updateEvent(eventId, new EventCreateRequest(
                event.getEventName(), event.getEventDate(), event.getHost().getId(), event.getHostUpiId(), event.getThankYouMessage()));
        }
        
        return ResponseEntity.ok(qrCodeData);
    }
}

