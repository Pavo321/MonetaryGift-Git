package com.mysteriousmonkeys.chanlo.whatsapp;

import com.mysteriousmonkeys.chanlo.dto.*;
import com.mysteriousmonkeys.chanlo.event.Event;
import com.mysteriousmonkeys.chanlo.exception.EventNotFoundException;
import com.mysteriousmonkeys.chanlo.exception.QRCodeException;
import com.mysteriousmonkeys.chanlo.exception.UserNotFoundException;
import com.mysteriousmonkeys.chanlo.money.Hisab;
import com.mysteriousmonkeys.chanlo.money.PaymentMethod;
import com.mysteriousmonkeys.chanlo.service.*;
import com.mysteriousmonkeys.chanlo.user.User;
import com.mysteriousmonkeys.chanlo.user.UserRepository;
import com.mysteriousmonkeys.chanlo.user.UserRole;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
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

    @Autowired
    private QRCodeService qrCodeService;

    @Autowired
    private UpiCollectService upiCollectService;

    @Autowired
    private WhatsAppApiService whatsAppApiService;
    
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
            request.thankYouMessage(),
            null, null, null, null, null, "OTHER", null, null, null
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
        Double totalAmount = payments.stream()
            .filter(p -> "SUCCESS".equals(p.paymentStatus()))
            .mapToDouble(WhatsAppPaymentSummary::amount)
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
                event.getEventName(), event.getEventDate(), event.getHost().getId(), event.getHostUpiId(), event.getThankYouMessage(),
                null, null, null, null, null, event.getCategory() != null ? event.getCategory() : "OTHER", null, null, null));
        }
        
        return ResponseEntity.ok(qrCodeData);
    }

    /**
     * Serve guest QR code image publicly (for WhatsApp URL-based image sending).
     * WhatsApp servers fetch this URL to deliver the image to the user.
     * GET /whatsapp/guest-qr/{userId}
     */
    @GetMapping(value = "/guest-qr/{userId}", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> getGuestQR(@PathVariable int userId) {
        try {
            User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + userId));

            String qrData = String.format("GUEST|%s|%s|%s",
                user.getName(),
                user.getVillage() != null ? user.getVillage() : "",
                user.getPhoneNumber());

            byte[] qrImage = qrCodeService.generateQRCodeImage(qrData);

            return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_PNG)
                .header("Content-Disposition", "inline; filename=guest_qr_" + userId + ".png")
                .header("Cache-Control", "public, max-age=3600")
                .body(qrImage);
        } catch (Exception e) {
            log.error("Error generating guest QR for userId {}: {}", userId, e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    // ========== NEW ENDPOINTS FOR UPI COLLECT FLOW ==========

    /**
     * Upload QR code image and decode it to get event details
     * POST /whatsapp/scan-qr-image
     *
     * @param image The QR code image file
     * @return Event details including host's UPI ID
     */
    @PostMapping(value = "/scan-qr-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<WhatsAppEventDetails> scanQRCodeImage(@RequestParam("image") MultipartFile image) {
        log.info("Scanning QR code from uploaded image: {}", image.getOriginalFilename());

        try {
            // Read image from multipart file
            BufferedImage bufferedImage = ImageIO.read(image.getInputStream());
            if (bufferedImage == null) {
                throw new QRCodeException("Could not read the uploaded image");
            }

            // Decode QR code from image
            String qrCodeData = qrCodeService.decodeQRCode(bufferedImage);
            log.info("Decoded QR code: {}", qrCodeData);

            // Find event by QR code
            Event event = eventService.findByQrCode(qrCodeData);

            WhatsAppEventDetails details = new WhatsAppEventDetails(
                event.getEventId(),
                event.getEventName(),
                event.getEventDate().toString(),
                event.getHost().getName(),
                event.getHostUpiId(),
                event.getThankYouMessage()
            );

            return ResponseEntity.ok(details);

        } catch (EventNotFoundException e) {
            throw e;
        } catch (Exception e) {
            log.error("Error decoding QR code from image: {}", e.getMessage(), e);
            throw new QRCodeException("Failed to decode QR code from image: " + e.getMessage());
        }
    }

    /**
     * Initiate UPI collect payment request
     * Guest provides their UPI ID, amount, and other details
     * Backend creates a simulated UPI collect request
     *
     * POST /whatsapp/upi-payment
     */
    @PostMapping("/upi-payment")
    public ResponseEntity<UpiCollectResponse> initiateUpiPayment(@Valid @RequestBody GuestUpiPaymentRequest request) {
        log.info("Initiating UPI payment: eventQR={}, guest={}, guestUpi={}, amount={}",
                request.eventQrCode(), request.guestPhoneNumber(), request.guestUpiId(), request.amount());

        try {
            // Find event by QR code
            Event event = eventService.findByQrCode(request.eventQrCode());
            String hostUpiId = event.getHostUpiId();

            if (hostUpiId == null || hostUpiId.isEmpty()) {
                return ResponseEntity.badRequest().body(
                    UpiCollectResponse.error("Host has not configured UPI ID for this event")
                );
            }

            // Get or create guest user
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

            // Create payment record (Hisab) with PENDING status
            HisabCreateRequest hisabRequest = new HisabCreateRequest(
                event.getEventId(),
                guest.getId(),
                request.amount(),
                PaymentMethod.UPI_COLLECT
            );
            Hisab hisab = hisabService.createHisab(hisabRequest);

            // Initiate UPI collect request (simulated)
            UpiCollectRequest collectRequest = upiCollectService.initiateCollect(
                hisab.getHisabId(),
                hostUpiId,
                request.guestUpiId(),
                request.amount()
            );

            // Return response
            return ResponseEntity.ok(UpiCollectResponse.success(
                hisab.getHisabId(),
                collectRequest.getCollectRequestId(),
                hostUpiId,
                request.guestUpiId(),
                request.amount()
            ));

        } catch (EventNotFoundException e) {
            throw e;
        } catch (Exception e) {
            log.error("Error initiating UPI payment: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(
                UpiCollectResponse.error("Failed to initiate payment: " + e.getMessage())
            );
        }
    }

    /**
     * Get payment status
     * GET /whatsapp/payment-status/{hisabId}
     */
    @GetMapping("/payment-status/{hisabId}")
    public ResponseEntity<?> getPaymentStatus(@PathVariable int hisabId) {
        log.info("Checking payment status: hisabId={}", hisabId);

        UpiCollectStatus status = upiCollectService.getStatus(hisabId);
        if (status == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(java.util.Map.of(
            "hisabId", hisabId,
            "status", status.toString()
        ));
    }

    /**
     * Simulate payment completion (for testing)
     * In production, this would be replaced by payment gateway webhook
     *
     * POST /whatsapp/simulate-payment/{hisabId}
     */
    @PostMapping("/simulate-payment/{hisabId}")
    public ResponseEntity<?> simulatePayment(@PathVariable int hisabId) {
        log.info("Simulating payment completion: hisabId={}", hisabId);

        // Check if collect request exists
        var collectRequest = upiCollectService.getCollectRequest(hisabId);
        if (collectRequest.isEmpty()) {
            return ResponseEntity.badRequest().body(java.util.Map.of(
                "error", "No pending payment found for hisabId: " + hisabId
            ));
        }

        // Simulate payment success
        boolean success = upiCollectService.simulatePaymentSuccess(hisabId);
        if (!success) {
            return ResponseEntity.badRequest().body(java.util.Map.of(
                "error", "Could not process payment - may be expired or already processed"
            ));
        }

        // Mark hisab as success and send thank you message
        String transactionId = collectRequest.get().getCollectRequestId();
        Hisab hisab = hisabService.markPaymentSuccessWithThankYou(hisabId, transactionId, "UPI_COLLECT");

        return ResponseEntity.ok(java.util.Map.of(
            "hisabId", hisab.getHisabId(),
            "status", "SUCCESS",
            "transactionId", transactionId,
            "message", "Payment completed and thank you message sent to guest"
        ));
    }
}

