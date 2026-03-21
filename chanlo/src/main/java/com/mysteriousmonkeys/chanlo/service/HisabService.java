package com.mysteriousmonkeys.chanlo.service;

import com.mysteriousmonkeys.chanlo.dto.GuestUpiPaymentRequest;
import com.mysteriousmonkeys.chanlo.dto.HisabCreateRequest;
import com.mysteriousmonkeys.chanlo.dto.HisabResponse;
import com.mysteriousmonkeys.chanlo.dto.UpiPaymentLinkResponse;
import com.mysteriousmonkeys.chanlo.event.Event;
import com.mysteriousmonkeys.chanlo.event.EventRepository;
import com.mysteriousmonkeys.chanlo.exception.EventNotFoundException;
import com.mysteriousmonkeys.chanlo.exception.HisabNotFoundException;
import com.mysteriousmonkeys.chanlo.exception.UserNotFoundException;
import com.mysteriousmonkeys.chanlo.money.Hisab;
import com.mysteriousmonkeys.chanlo.money.MoneyRepository;
import com.mysteriousmonkeys.chanlo.money.PaymentMethod;
import com.mysteriousmonkeys.chanlo.money.PaymentStatus;
import com.mysteriousmonkeys.chanlo.user.User;
import com.mysteriousmonkeys.chanlo.user.UserRepository;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
public class HisabService {

    private static final Logger log = LoggerFactory.getLogger(HisabService.class);

    @Autowired
    private MoneyRepository moneyRepository;

    @Autowired
    private EventRepository eventRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private WhatsAppApiService whatsAppApiService;

    @Autowired
    private UpiDeepLinkService upiDeepLinkService;
    
    public Hisab createHisab(HisabCreateRequest request) {
        log.info("Creating hisab: guest={}, event={}, amount={}", 
            request.guestId(), request.eventId(), request.amount());
        
        Event event = eventRepository.findById(request.eventId())
            .orElseThrow(() -> new EventNotFoundException("Event not found"));
        
        User guest = userRepository.findById(request.guestId())
            .orElseThrow(() -> new UserNotFoundException("Guest not found"));
        
        Hisab hisab = new Hisab();
        hisab.setEvent(event);
        hisab.setGuest(guest);
        hisab.setAmount(request.amount());
        hisab.setPaymentMethod(request.paymentMethod());
        hisab.setPaymentStatus(PaymentStatus.PENDING);
        
        return moneyRepository.save(hisab);
    }
    
    public List<HisabResponse> getHisabsByEvent(int eventId) {
        Event event = eventRepository.findById(eventId)
            .orElseThrow(() -> new EventNotFoundException("Event not found"));
        
        return moneyRepository.findByEventOrderByHisabIdDesc(event)
            .stream()
            .map(HisabResponse::from)
            .toList();
    }
    
    public List<HisabResponse> getHisabsByGuest(int guestId) {
        User guest = userRepository.findById(guestId)
            .orElseThrow(() -> new UserNotFoundException("Guest not found"));
        
        return moneyRepository.findByGuest(guest)
            .stream()
            .map(HisabResponse::from)
            .toList();
    }
    
    public Hisab markPaymentSuccess(int hisabId, String transactionId, String gatewayName) {
        Hisab hisab = moneyRepository.findById(hisabId)
            .orElseThrow(() -> new HisabNotFoundException("Hisab not found"));
        
        hisab.markAsSuccess(transactionId, LocalDateTime.now());
        hisab.setGatewayName(gatewayName);
        
        log.info("Payment successful: hisabId={}, transactionId={}", hisabId, transactionId);
        
        return moneyRepository.save(hisab);
    }
    
    public Hisab markPaymentFailed(int hisabId) {
        Hisab hisab = moneyRepository.findById(hisabId)
            .orElseThrow(() -> new HisabNotFoundException("Hisab not found"));
        
        hisab.markAsFailed();
        
        return moneyRepository.save(hisab);
    }
    
    public List<HisabResponse> getAllHisabs() {
        return moneyRepository.findAll()
            .stream()
            .map(HisabResponse::from)
            .toList();
    }
    
    /**
     * Get payments for a specific event (for WhatsApp hosts)
     * Returns limited data: name, amount, village, status, and dates
     */
    public List<com.mysteriousmonkeys.chanlo.dto.WhatsAppPaymentSummary> getPaymentsForEvent(int eventId) {
        Event event = eventRepository.findById(eventId)
            .orElseThrow(() -> new EventNotFoundException("Event not found"));

        return moneyRepository.findByEventOrderByHisabIdDesc(event)
            .stream()
            .map(hisab -> com.mysteriousmonkeys.chanlo.dto.WhatsAppPaymentSummary.from(
                hisab.getGuest().getName(),
                hisab.getAmount(),
                hisab.getGuest().getVillage(),
                hisab.getPaymentStatus().toString(),
                hisab.getCreatedAt(),
                hisab.getCompletedAt()
            ))
            .toList();
    }

    /**
     * Mark payment as successful and send thank you message via WhatsApp
     * This is called after UPI collect payment is confirmed
     *
     * @param hisabId       The payment record ID
     * @param transactionId The transaction ID from payment gateway
     * @param gatewayName   The name of the payment gateway
     * @return The updated Hisab
     */
    public Hisab markPaymentSuccessWithThankYou(int hisabId, String transactionId, String gatewayName) {
        Hisab hisab = moneyRepository.findById(hisabId)
            .orElseThrow(() -> new HisabNotFoundException("Hisab not found"));

        // Mark payment as success
        hisab.markAsSuccess(transactionId, LocalDateTime.now());
        hisab.setGatewayName(gatewayName);
        Hisab savedHisab = moneyRepository.save(hisab);

        log.info("Payment successful: hisabId={}, transactionId={}", hisabId, transactionId);

        // Send thank you message to guest via WhatsApp
        try {
            Event event = hisab.getEvent();
            User guest = hisab.getGuest();
            String guestPhone = guest.getPhoneNumber();
            String thankYouMessage = event.getThankYouMessage();
            String hostName = event.getHost().getName();
            Double amount = hisab.getAmount();

            // Compose thank you message
            String message = String.format(
                "Payment Received!\n\n" +
                "Thank you %s for your generous gift of Rs. %.2f for %s.\n\n" +
                "Message from %s:\n\"%s\"\n\n" +
                "Transaction ID: %s",
                guest.getName(),
                amount,
                event.getEventName(),
                hostName,
                thankYouMessage,
                transactionId
            );

            // Send WhatsApp message
            boolean sent = whatsAppApiService.sendTextMessage(guestPhone, message);
            if (sent) {
                log.info("Thank you message sent to guest: {}", guestPhone);
            } else {
                log.warn("Failed to send thank you message to guest: {}", guestPhone);
            }
        } catch (Exception e) {
            log.error("Error sending thank you message: {}", e.getMessage(), e);
            // Don't fail the payment if message fails
        }

        return savedHisab;
    }

    /**
     * Get payments for a specific guest in a specific event
     */
    public List<Hisab> getHisabsByEventAndGuest(int eventId, int guestId) {
        Event event = eventRepository.findById(eventId)
            .orElseThrow(() -> new EventNotFoundException("Event not found"));
        User guest = userRepository.findById(guestId)
            .orElseThrow(() -> new UserNotFoundException("Guest not found"));
        return moneyRepository.findByEventAndGuest(event, guest);
    }

    /**
     * Get a hisab by ID
     */
    public Hisab getHisabById(int hisabId) {
        return moneyRepository.findById(hisabId)
            .orElseThrow(() -> new HisabNotFoundException("Hisab not found: " + hisabId));
    }

    /**
     * Generate UPI deep links for guest to pay directly
     *
     * This method:
     * 1. Finds the event by QR code
     * 2. Finds or creates the guest user
     * 3. Creates a pending Hisab record
     * 4. Generates UPI deep links for all major UPI apps
     *
     * @param request The guest payment request containing event QR code, guest details, and amount
     * @return UpiPaymentLinkResponse containing clickable payment links
     */
    public UpiPaymentLinkResponse generateUpiPaymentLinks(GuestUpiPaymentRequest request) {
        log.info("Generating UPI payment links for guest: {} for event QR: {}",
            request.guestName(), request.eventQrCode());

        // Find event by QR code
        Event event = eventRepository.findByQrCodeData(request.eventQrCode())
            .orElseThrow(() -> new EventNotFoundException(
                "Event not found for QR code: " + request.eventQrCode()));

        // Validate host has UPI ID configured
        if (event.getHostUpiId() == null || event.getHostUpiId().isBlank()) {
            log.error("Host UPI ID not configured for event: {}", event.getEventId());
            return UpiPaymentLinkResponse.error("Host has not configured UPI ID for this event");
        }

        // Find or create guest user
        User guest = userRepository.findByPhoneNumber(request.guestPhoneNumber())
            .orElseGet(() -> {
                log.info("Creating new guest user: {}", request.guestPhoneNumber());
                User newGuest = User.createGuest(
                    request.guestName(),
                    request.guestVillage(),
                    request.guestPhoneNumber()
                );
                return userRepository.save(newGuest);
            });

        // Update guest name/village if they've changed
        if (!guest.getName().equals(request.guestName()) ||
            (request.guestVillage() != null && !request.guestVillage().equals(guest.getVillage()))) {
            guest.setName(request.guestName());
            if (request.guestVillage() != null) {
                guest.setVillage(request.guestVillage());
            }
            guest = userRepository.save(guest);
        }

        // Create pending Hisab record
        Hisab hisab = new Hisab();
        hisab.setEvent(event);
        hisab.setGuest(guest);
        hisab.setAmount(request.amount());
        hisab.setPaymentMethod(PaymentMethod.UPI_DEEP_LINK);
        hisab.setPaymentStatus(PaymentStatus.PENDING);
        hisab = moneyRepository.save(hisab);

        log.info("Created pending Hisab: {} for amount: {}", hisab.getHisabId(), request.amount());

        // Generate UPI deep links
        String hostName = event.getHost().getName();
        String hostUpiId = event.getHostUpiId();
        String eventName = event.getEventName();

        UpiDeepLinkService.UpiPaymentLinks links = upiDeepLinkService.generateAllPaymentLinks(
            hostUpiId,
            hostName,
            request.amount(),
            String.format("Gift from %s for %s", request.guestName(), eventName)
        );

        log.info("Generated UPI payment links for hisab: {}", hisab.getHisabId());

        return UpiPaymentLinkResponse.success(
            hisab.getHisabId(),
            eventName,
            hostName,
            request.amount(),
            links.genericUpi(),
            links.googlePay(),
            links.phonePe(),
            links.paytm(),
            links.bhim()
        );
    }
}

