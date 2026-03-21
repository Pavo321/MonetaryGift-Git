package com.mysteriousmonkeys.chanlo.service;

import com.mysteriousmonkeys.chanlo.event.Event;
import com.mysteriousmonkeys.chanlo.event.EventHelper;
import com.mysteriousmonkeys.chanlo.event.EventHelperRepository;
import com.mysteriousmonkeys.chanlo.event.EventRepository;
import com.mysteriousmonkeys.chanlo.exception.EventNotFoundException;
import com.mysteriousmonkeys.chanlo.exception.UserNotFoundException;
import com.mysteriousmonkeys.chanlo.money.*;
import com.mysteriousmonkeys.chanlo.user.User;
import com.mysteriousmonkeys.chanlo.user.UserRepository;
import com.mysteriousmonkeys.chanlo.user.UserRole;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class HelperService {

    private static final Logger log = LoggerFactory.getLogger(HelperService.class);

    @Autowired
    private EventRepository eventRepository;

    @Autowired
    private EventHelperRepository eventHelperRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private MoneyRepository moneyRepository;

    @Autowired
    private ExpenseRepository expenseRepository;

    @Autowired
    private SettlementRepository settlementRepository;

    @Autowired
    private QRCodeService qrCodeService;

    @Autowired
    private WhatsAppApiService whatsAppApiService;

    // --- Helper Management (Host operations) ---

    public EventHelper addHelper(int eventId, int helperId, boolean canExpense) {
        Event event = eventRepository.findById(eventId)
            .orElseThrow(() -> new EventNotFoundException("Event not found"));
        User helper = userRepository.findById(helperId)
            .orElseThrow(() -> new UserNotFoundException("User not found"));

        // Check if already a helper
        if (eventHelperRepository.existsByEventAndHelperAndIsActiveTrue(event, helper)) {
            throw new RuntimeException("User is already an active helper for this event");
        }

        EventHelper eventHelper = new EventHelper(event, helper);
        eventHelper.setCanExpense(canExpense);
        return eventHelperRepository.save(eventHelper);
    }

    public EventHelper addHelperByPhone(int eventId, String phoneNumber, boolean canExpense, String helperName) {
        Event event = eventRepository.findById(eventId)
            .orElseThrow(() -> new EventNotFoundException("Event not found"));

        if (helperName == null || helperName.isBlank()) {
            throw new RuntimeException("Helper name is required");
        }
        String displayName = helperName.trim();

        // Find existing user or auto-create a HELPER user
        User helper = userRepository.findByPhoneNumber(phoneNumber)
            .orElseGet(() -> {
                User newHelper = new User(displayName, "", phoneNumber);
                newHelper.setRole(UserRole.HELPER);
                newHelper = userRepository.save(newHelper);
                log.info("Auto-created HELPER user for phone: {}", phoneNumber);
                return newHelper;
            });

        // If the stored name is auto-generated, replace it with the host-provided name
        if (helper.getName().startsWith("Helper ") && !displayName.equals("Helper " + phoneNumber)) {
            helper.setName(displayName);
            helper = userRepository.save(helper);
        }

        // If user exists but is GUEST, upgrade to HELPER
        if (helper.getRole() == UserRole.GUEST) {
            helper.setRole(UserRole.HELPER);
            helper = userRepository.save(helper);
            log.info("Upgraded user {} from GUEST to HELPER", phoneNumber);
        }

        if (eventHelperRepository.existsByEventAndHelperAndIsActiveTrue(event, helper)) {
            throw new RuntimeException("User is already an active helper for this event");
        }

        EventHelper eventHelper = new EventHelper(event, helper);
        eventHelper.setCanExpense(canExpense);
        eventHelper = eventHelperRepository.save(eventHelper);

        log.info("Helper {} added to event {}", phoneNumber, event.getEventName());
        return eventHelper;
    }

    public void removeHelper(int eventId, int helperId) {
        Event event = eventRepository.findById(eventId)
            .orElseThrow(() -> new EventNotFoundException("Event not found"));
        User helper = userRepository.findById(helperId)
            .orElseThrow(() -> new UserNotFoundException("User not found"));

        EventHelper eventHelper = eventHelperRepository.findByEventAndHelper(event, helper)
            .orElseThrow(() -> new RuntimeException("Helper not found for this event"));

        eventHelper.setActive(false);
        eventHelperRepository.save(eventHelper);
    }

    public List<HelperSummary> getHelperSummaries(int eventId) {
        Event event = eventRepository.findById(eventId)
            .orElseThrow(() -> new EventNotFoundException("Event not found"));

        List<EventHelper> helpers = eventHelperRepository.findByEventAndIsActiveTrue(event);

        return helpers.stream().map(eh -> {
            User helper = eh.getHelper();
            Double cashCollected = moneyRepository.getTotalCashCollectedByHelper(event, helper);
            Double upiCollected = moneyRepository.getTotalUpiCollectedByHelper(event, helper);
            Double totalSettled = settlementRepository.getTotalSettledByEventAndHelper(event, helper);
            Double totalExpense = expenseRepository.getTotalExpenseByEventAndHelper(event, helper);
            // Amount to hand back = cash only (UPI goes directly to host account)
            Double amountToHandBack = cashCollected - totalSettled;

            return new HelperSummary(
                helper.getId(),
                helper.getName(),
                helper.getPhoneNumber(),
                true,
                cashCollected,
                upiCollected,
                amountToHandBack,
                totalExpense,
                eh.isCanExpense()
            );
        }).toList();
    }

    // --- Collection (Host direct collection) ---

    public Hisab hostCollectMoney(int eventId, int hostId, String guestName, String guestPlace,
                                  String guestPhone, Double amount, PaymentMethod paymentMethod) {
        Event event = eventRepository.findById(eventId)
            .orElseThrow(() -> new EventNotFoundException("Event not found"));
        User host = userRepository.findById(hostId)
            .orElseThrow(() -> new UserNotFoundException("Host not found"));

        // Find or create guest
        User guest = userRepository.findByPhoneNumber(guestPhone)
            .orElseGet(() -> {
                User newGuest = User.createGuest(guestName, guestPlace, guestPhone);
                return userRepository.save(newGuest);
            });

        if (!guest.getName().equals(guestName)) {
            guest.setName(guestName);
            guest.setVillage(guestPlace);
            guest = userRepository.save(guest);
        }

        Hisab hisab = new Hisab();
        hisab.setEvent(event);
        hisab.setGuest(guest);
        hisab.setCollectedBy(host);
        hisab.setAmount(amount);
        hisab.setPaymentMethod(paymentMethod);
        hisab.setPaymentStatus(PaymentStatus.SUCCESS);
        hisab.setCompletedAt(LocalDateTime.now());

        String verificationData = String.format("VERIFY_%d_%s_%.0f_%d",
            event.getEventId(), guest.getPhoneNumber(), amount, System.currentTimeMillis());
        hisab.setVerificationQrData(verificationData);

        hisab = moneyRepository.save(hisab);

        log.info("Host collected: event={}, guest={}, amount={}, host={}",
            eventId, guestName, amount, host.getName());

        sendCollectionConfirmation(hisab, event, guest, host);

        return hisab;
    }

    // --- Collection (Helper operations) ---

    public Hisab collectMoney(int eventId, int helperId, String guestName, String guestPlace,
                              String guestPhone, Double amount, PaymentMethod paymentMethod) {
        Event event = eventRepository.findById(eventId)
            .orElseThrow(() -> new EventNotFoundException("Event not found"));
        User helper = userRepository.findById(helperId)
            .orElseThrow(() -> new UserNotFoundException("Helper not found"));

        // Validate helper is active for this event
        if (!eventHelperRepository.existsByEventAndHelperAndIsActiveTrue(event, helper)) {
            throw new RuntimeException("You are not an active helper for this event");
        }

        // Find or create guest
        User guest = userRepository.findByPhoneNumber(guestPhone)
            .orElseGet(() -> {
                User newGuest = User.createGuest(guestName, guestPlace, guestPhone);
                return userRepository.save(newGuest);
            });

        // Update guest name/place if changed
        if (!guest.getName().equals(guestName)) {
            guest.setName(guestName);
            guest.setVillage(guestPlace);
            guest = userRepository.save(guest);
        }

        // Create hisab record
        Hisab hisab = new Hisab();
        hisab.setEvent(event);
        hisab.setGuest(guest);
        hisab.setCollectedBy(helper);
        hisab.setAmount(amount);
        hisab.setPaymentMethod(paymentMethod);
        hisab.setPaymentStatus(PaymentStatus.SUCCESS);
        hisab.setCompletedAt(LocalDateTime.now());

        // Generate verification QR data
        String verificationData = String.format("VERIFY_%d_%s_%d_%d",
            event.getEventId(), guest.getPhoneNumber(), amount, System.currentTimeMillis());
        hisab.setVerificationQrData(verificationData);

        hisab = moneyRepository.save(hisab);

        log.info("Money collected: event={}, guest={}, amount={}, helper={}",
            eventId, guestName, amount, helper.getName());

        // Send WhatsApp confirmation to guest
        sendCollectionConfirmation(hisab, event, guest, helper);

        return hisab;
    }

    private void sendCollectionConfirmation(Hisab hisab, Event event, User guest, User helper) {
        try {
            String message = String.format(
                "Payment Recorded!\n\n" +
                "Event: %s\n" +
                "Amount: Rs. %.2f\n" +
                "Method: %s\n" +
                "Collected by: %s\n" +
                "Date: %s\n\n" +
                "Verification ID: %s\n\n" +
                "Thank you for your contribution!",
                event.getEventName(),
                hisab.getAmount(),
                hisab.getPaymentMethod().name(),
                helper.getName(),
                hisab.getCompletedAt().toLocalDate(),
                hisab.getVerificationQrData()
            );

            whatsAppApiService.sendTextMessage(guest.getPhoneNumber(), message);
            log.info("Collection confirmation sent to: {}", guest.getPhoneNumber());
        } catch (Exception e) {
            log.warn("Failed to send collection confirmation to {}: {}", guest.getPhoneNumber(), e.getMessage());
        }
    }

    // --- Expense (Helper operations) ---

    public Expense recordExpense(int eventId, int helperId, String reason, Double amount) {
        Event event = eventRepository.findById(eventId)
            .orElseThrow(() -> new EventNotFoundException("Event not found"));
        User helper = userRepository.findById(helperId)
            .orElseThrow(() -> new UserNotFoundException("Helper not found"));

        // Check helper has expense permission
        EventHelper eventHelper = eventHelperRepository.findByEventAndHelper(event, helper)
            .orElseThrow(() -> new RuntimeException("You are not a helper for this event"));

        if (!eventHelper.isCanExpense()) {
            throw new RuntimeException("You do not have permission to record expenses");
        }

        // Validate: cannot expense more than cash collected
        Double cashCollected = moneyRepository.getTotalCashCollectedByHelper(event, helper);
        Double totalExpense = expenseRepository.getTotalExpenseByEventAndHelper(event, helper);
        Double availableCash = cashCollected - totalExpense;

        if (amount > availableCash) {
            throw new RuntimeException(String.format(
                "Insufficient funds. You collected Rs. %.2f, already spent Rs. %.2f. Available: Rs. %.2f",
                cashCollected, totalExpense, availableCash));
        }

        Expense expense = new Expense(event, helper, reason, amount);
        expense = expenseRepository.save(expense);

        log.info("Expense recorded: event={}, helper={}, amount={}, reason={}",
            eventId, helper.getName(), amount, reason);

        return expense;
    }

    public List<Expense> getExpensesByEvent(int eventId) {
        Event event = eventRepository.findById(eventId)
            .orElseThrow(() -> new EventNotFoundException("Event not found"));
        return expenseRepository.findByEventOrderByIdDesc(event);
    }

    // --- Settlement (Host operations) ---

    public Settlement settleWithHelper(int eventId, int helperId, int hostId, Double amount, String note) {
        Event event = eventRepository.findById(eventId)
            .orElseThrow(() -> new EventNotFoundException("Event not found"));
        User helper = userRepository.findById(helperId)
            .orElseThrow(() -> new UserNotFoundException("Helper not found"));
        User host = userRepository.findById(hostId)
            .orElseThrow(() -> new UserNotFoundException("Host not found"));

        Settlement settlement = new Settlement(event, helper, host, amount, note);
        settlement = settlementRepository.save(settlement);

        log.info("Settlement: event={}, helper={}, amount={}", eventId, helper.getName(), amount);

        return settlement;
    }

    public List<Settlement> getSettlementsByEvent(int eventId) {
        Event event = eventRepository.findById(eventId)
            .orElseThrow(() -> new EventNotFoundException("Event not found"));
        return settlementRepository.findByEvent(event);
    }

    // --- Verification ---

    public VerificationResult verifyPayment(String verificationQrData) {
        List<Hisab> results = moneyRepository.findAll().stream()
            .filter(h -> verificationQrData.equals(h.getVerificationQrData()))
            .toList();

        if (results.isEmpty()) {
            return new VerificationResult(false, "No payment found for this verification code", null);
        }

        Hisab hisab = results.get(0);
        return new VerificationResult(
            true,
            "Payment verified",
            new VerificationDetails(
                hisab.getGuest().getName(),
                hisab.getAmount(),
                hisab.getEvent().getEventName(),
                hisab.getCompletedAt(),
                hisab.getCollectedBy() != null ? hisab.getCollectedBy().getName() : "N/A",
                hisab.getPaymentMethod().name(),
                hisab.getPaymentStatus().name()
            )
        );
    }

    // --- Helper: Get assigned events ---

    public List<HelperEventSummary> getEventsForHelper(int userId) {
        User helper = userRepository.findById(userId)
            .orElseThrow(() -> new UserNotFoundException("User not found"));

        List<EventHelper> assignments = eventHelperRepository.findByHelper(helper);

        return assignments.stream()
            .filter(EventHelper::isActive)
            .map(eh -> {
                Event event = eh.getEvent();
                Double cashCollected = moneyRepository.getTotalCashCollectedByHelper(event, helper);
                Double upiCollected = moneyRepository.getTotalUpiCollectedByHelper(event, helper);
                Double totalExpense = expenseRepository.getTotalExpenseByEventAndHelper(event, helper);
                return new HelperEventSummary(
                    event.getEventId(),
                    event.getEventName(),
                    event.getEventDate(),
                    cashCollected,
                    upiCollected,
                    totalExpense,
                    eh.isCanExpense()
                );
            })
            .toList();
    }

    // --- Helper login validation ---

    public boolean isHelperForEvent(int eventId, String phoneNumber) {
        Event event = eventRepository.findById(eventId).orElse(null);
        if (event == null) return false;
        User helper = userRepository.findByPhoneNumber(phoneNumber).orElse(null);
        if (helper == null) return false;
        return eventHelperRepository.existsByEventAndHelperAndIsActiveTrue(event, helper);
    }

    // DTOs
    public record HelperSummary(
        int userId,
        String name,
        String phoneNumber,
        boolean isActive,
        Double cashCollected,
        Double upiCollected,
        Double amountToHandBack,
        Double totalExpense,
        boolean canExpense
    ) {}

    public record HelperEventSummary(
        int eventId,
        String eventName,
        java.time.LocalDate eventDate,
        Double cashCollected,
        Double upiCollected,
        Double totalExpense,
        boolean canExpense
    ) {}

    public record VerificationResult(boolean verified, String message, VerificationDetails details) {}

    public record VerificationDetails(
        String guestName,
        Double amount,
        String eventName,
        LocalDateTime date,
        String collectedBy,
        String paymentMethod,
        String status
    ) {}
}
