package com.mysteriousmonkeys.chanlo.service;

import com.mysteriousmonkeys.chanlo.dashboard.GuestHistoryController;
import com.mysteriousmonkeys.chanlo.exception.EventNotFoundException;
import com.mysteriousmonkeys.chanlo.exception.UserNotFoundException;
import com.mysteriousmonkeys.chanlo.money.Hisab;
import com.mysteriousmonkeys.chanlo.money.PaymentMethod;
import com.mysteriousmonkeys.chanlo.event.Event;
import com.mysteriousmonkeys.chanlo.user.User;
import com.mysteriousmonkeys.chanlo.user.UserRepository;
import com.mysteriousmonkeys.chanlo.user.UserRole;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * WhatsApp Chatbot — Guest-only flow for Mahotsava.
 *
 * Guests interact exclusively through WhatsApp. Host/Helper use the Mahotsava mobile app.
 *
 * Flow:
 *   First time → Registration (name, place — phone auto-fetched)
 *   Returning → Main Menu:
 *     1. Edit your details
 *     2. Get your QR (personal QR for helper to scan at event)
 *     3. Transaction history (opens web page)
 *     4. Add a person (family without WhatsApp)
 *     5. Switch user (self + added persons)
 *
 *   QR Scan (EVENT_xxx) → Two choices:
 *     1. Give a gift
 *     2. View my payments for this event
 */
@Service
public class ChatbotService {

    private static final Logger log = LoggerFactory.getLogger(ChatbotService.class);

    @Autowired private UserService userService;
    @Autowired private EventService eventService;
    @Autowired private HisabService hisabService;
    @Autowired private WhatsAppApiService whatsAppApiService;
    @Autowired private QRCodeService qrCodeService;
    @Autowired private UserRepository userRepository;

    @Value("${whatsapp.business.phone}")
    private String whatsappBusinessPhone;

    @Value("${app.base.url:http://localhost:8080}")
    private String baseUrl;

    private final Map<String, ConversationState> states = new ConcurrentHashMap<>();

    private static final java.util.Set<String> RESET_KEYWORDS = java.util.Set.of(
        "hi", "hello", "hey", "menu", "cancel", "restart", "start", "help", "0",
        "quit", "exit", "stop", "end", "home", "main", "back"
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // ENTRY POINT
    // ═══════════════════════════════════════════════════════════════════════════

    public String processMessage(String phoneNumber, String message) {
        try {
            String phone = normalizePhone(phoneNumber);
            String msg = message.trim();

            // QR scan: message starts with EVENT_ → event choice flow
            if (msg.toUpperCase().startsWith("EVENT_")) {
                return handleQrScan(phone, msg.toUpperCase());
            }

            ConversationState state = states.get(phone);

            // Mid-flow reset keyword → back to menu
            if (state != null && state.step != null
                    && state.step != Step.WAITING_MAIN_CHOICE
                    && RESET_KEYWORDS.contains(msg.toLowerCase())) {
                states.remove(phone);
                return startConversation(phone);
            }

            // Continue active flow
            if (state != null && state.step != null) {
                return handleStep(phone, msg, state);
            }

            // No active flow → start
            return startConversation(phone);

        } catch (Exception e) {
            log.error("Error processing message: {}", e.getMessage(), e);
            return "Sorry, something went wrong. Please try again.";
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // START / REGISTRATION
    // ═══════════════════════════════════════════════════════════════════════════

    private String startConversation(String phone) {
        // Check if user exists
        try {
            User user = userService.findByPhoneNumber(phone);

            // Check active user (switch user feature)
            ConversationState state = new ConversationState();
            state.activeUserId = user.getId();
            state.activeUserName = user.getName();
            states.put(phone, state);

            return showMainMenu(phone, user.getName());
        } catch (UserNotFoundException e) {
            // New user → registration
            ConversationState state = new ConversationState();
            state.step = Step.REG_NAME;
            states.put(phone, state);
            return "Welcome to Mahotsava!\n\n" +
                   "Let's set up your profile.\n\n" +
                   "What's your name?";
        }
    }

    private String showMainMenu(String phone, String name) {
        ConversationState state = states.get(phone);
        if (state == null) {
            state = new ConversationState();
            states.put(phone, state);
        }
        state.step = Step.WAITING_MAIN_CHOICE;

        String activeLabel = "";
        if (state.activeUserName != null && !state.activeUserName.equals(name)) {
            activeLabel = "\n(Acting as: " + state.activeUserName + ")\n";
        }

        return "Namaste " + name + "!" + activeLabel + "\n\n" +
               "What would you like to do?\n\n" +
               "1. Edit your details\n" +
               "2. Get your QR\n" +
               "3. Transaction history\n" +
               "4. Add a person\n" +
               "5. Switch user\n\n" +
               "(Type a number 1-5)";
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ROUTER
    // ═══════════════════════════════════════════════════════════════════════════

    private String handleStep(String phone, String msg, ConversationState state) {
        return switch (state.step) {
            // Registration
            case REG_NAME -> handleRegName(phone, msg, state);
            case REG_PLACE -> handleRegPlace(phone, msg, state);

            // Main menu
            case WAITING_MAIN_CHOICE -> handleMainChoice(phone, msg, state);

            // Edit details
            case EDIT_NAME -> handleEditName(phone, msg, state);
            case EDIT_PLACE -> handleEditPlace(phone, msg, state);

            // Add person
            case ADD_PERSON_NAME -> handleAddPersonName(phone, msg, state);
            case ADD_PERSON_PLACE -> handleAddPersonPlace(phone, msg, state);
            case ADD_PERSON_PHONE -> handleAddPersonPhone(phone, msg, state);

            // Switch user
            case SWITCH_USER -> handleSwitchUser(phone, msg, state);

            // QR scan event choice
            case EVENT_CHOICE -> handleEventChoice(phone, msg, state);

            // Gift flow
            case GIFT_NAME -> handleGiftName(phone, msg, state);
            case GIFT_PLACE -> handleGiftPlace(phone, msg, state);
            case GIFT_AMOUNT -> handleGiftAmount(phone, msg, state);
            case GIFT_CONFIRM -> handleGiftConfirm(phone, msg, state);

            default -> {
                states.remove(phone);
                yield startConversation(phone);
            }
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // REGISTRATION
    // ═══════════════════════════════════════════════════════════════════════════

    private String handleRegName(String phone, String msg, ConversationState state) {
        state.tempName = msg;
        state.step = Step.REG_PLACE;
        return "Nice to meet you, " + msg + "!\n\nWhat's your village/city?";
    }

    private String handleRegPlace(String phone, String msg, ConversationState state) {
        try {
            User user = User.createGuest(state.tempName, msg, phone);
            user = userRepository.save(user);

            state.activeUserId = user.getId();
            state.activeUserName = user.getName();

            log.info("New guest registered: {} from {} ({})", state.tempName, msg, phone);

            return "Registered successfully!\n\n" + showMainMenu(phone, user.getName());

        } catch (Exception e) {
            log.error("Error registering user: {}", e.getMessage(), e);
            states.remove(phone);
            return "Sorry, registration failed. Please try again by sending 'hi'.";
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // MAIN MENU
    // ═══════════════════════════════════════════════════════════════════════════

    private String handleMainChoice(String phone, String msg, ConversationState state) {
        switch (msg) {
            case "1" -> { // Edit details
                state.step = Step.EDIT_NAME;
                return "What's your new name?\n(Type 'skip' to keep current)";
            }
            case "2" -> { // Get QR
                return handleGetQr(phone, state);
            }
            case "3" -> { // Transaction history
                return handleTransactionHistory(phone, state);
            }
            case "4" -> { // Add a person
                state.step = Step.ADD_PERSON_NAME;
                return "Add a family member or person without WhatsApp.\n\nEnter their name:";
            }
            case "5" -> { // Switch user
                return handleSwitchUserMenu(phone, state);
            }
            default -> {
                return "Please type a number 1-5:\n\n" +
                       "1. Edit your details\n" +
                       "2. Get your QR\n" +
                       "3. Transaction history\n" +
                       "4. Add a person\n" +
                       "5. Switch user";
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 1. EDIT DETAILS
    // ═══════════════════════════════════════════════════════════════════════════

    private String handleEditName(String phone, String msg, ConversationState state) {
        if (!"skip".equalsIgnoreCase(msg)) {
            state.tempName = msg;
        }
        state.step = Step.EDIT_PLACE;
        return "What's your new village/city?\n(Type 'skip' to keep current)";
    }

    private String handleEditPlace(String phone, String msg, ConversationState state) {
        try {
            User user = getActiveUser(phone, state);

            if (state.tempName != null) user.setName(state.tempName);
            if (!"skip".equalsIgnoreCase(msg)) user.setVillage(msg);

            userRepository.save(user);
            state.tempName = null;
            state.activeUserName = user.getName();

            states.remove(phone);
            return "Details updated!\n\n" +
                   "Name: " + user.getName() + "\n" +
                   "Place: " + (user.getVillage() != null ? user.getVillage() : "Not set") + "\n\n" +
                   "Type 'hi' for main menu.";

        } catch (Exception e) {
            log.error("Error updating details: {}", e.getMessage(), e);
            states.remove(phone);
            return "Sorry, couldn't update details. Please try again.";
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 2. GET QR
    // ═══════════════════════════════════════════════════════════════════════════

    private String handleGetQr(String phone, ConversationState state) {
        try {
            User user = getActiveUser(phone, state);

            // Build the public QR link (works in browser regardless of WhatsApp media support)
            String publicUrl = getPublicUrl();
            String qrLink = null;

            if (publicUrl != null) {
                qrLink = publicUrl + "/whatsapp/guest-qr/" + user.getId();

                // Try sending as image (may fail on test numbers)
                log.info("Sending guest QR via URL: {}", qrLink);
                boolean sent = whatsAppApiService.sendImageByUrl(phone, qrLink, "Your personal QR code");
                if (!sent) {
                    log.warn("Image send failed, will provide clickable link instead");
                }
            }

            states.remove(phone);

            // Always include a clickable link as fallback
            // (WhatsApp test numbers may not support media delivery)
            StringBuilder reply = new StringBuilder();
            reply.append("Here's your personal QR code!\n\n");
            reply.append("Show this QR to the helper at the event. They'll scan it to quickly record your details.\n\n");
            if (qrLink != null) {
                reply.append("View/download your QR: ").append(qrLink).append("\n\n");
            }
            reply.append("Type 'hi' for main menu.");

            return reply.toString();

        } catch (Exception e) {
            log.error("Error generating guest QR: {}", e.getMessage(), e);
            states.remove(phone);
            return "Sorry, couldn't generate QR. Please try again.";
        }
    }

    /**
     * Get the public URL of this server (e.g., ngrok tunnel URL).
     * Queries ngrok's local API to auto-detect the public URL.
     * Falls back to app.base.url if ngrok is not running.
     */
    private String getPublicUrl() {
        try {
            // Query ngrok API for tunnel info
            org.springframework.web.client.RestTemplate rt = new org.springframework.web.client.RestTemplate();
            @SuppressWarnings("unchecked")
            java.util.Map<String, Object> response = rt.getForObject("http://localhost:4040/api/tunnels", java.util.Map.class);
            if (response != null && response.get("tunnels") != null) {
                @SuppressWarnings("unchecked")
                java.util.List<java.util.Map<String, Object>> tunnels = (java.util.List<java.util.Map<String, Object>>) response.get("tunnels");
                for (java.util.Map<String, Object> tunnel : tunnels) {
                    String publicUrl = (String) tunnel.get("public_url");
                    if (publicUrl != null && publicUrl.startsWith("https://")) {
                        log.info("Detected ngrok public URL: {}", publicUrl);
                        return publicUrl;
                    }
                }
            }
        } catch (Exception e) {
            log.debug("Could not detect ngrok URL: {}", e.getMessage());
        }

        // Fallback to configured base URL (only useful if it's a public URL)
        if (baseUrl != null && !baseUrl.contains("localhost")) {
            return baseUrl;
        }

        return null;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 3. TRANSACTION HISTORY (web link)
    // ═══════════════════════════════════════════════════════════════════════════

    private String handleTransactionHistory(String phone, ConversationState state) {
        try {
            User user = getActiveUser(phone, state);
            String token = GuestHistoryController.generateGuestToken(user.getPhoneNumber());
            String historyUrl = baseUrl + "/api/guest/history?token=" + token;

            states.remove(phone);
            return "Click the link below to view your transaction history:\n\n" +
                   historyUrl + "\n\n" +
                   "You can filter by event, download PDF, and more.\n\n" +
                   "Type 'hi' for main menu.";

        } catch (Exception e) {
            log.error("Error generating history link: {}", e.getMessage(), e);
            states.remove(phone);
            return "Sorry, couldn't generate history link. Please try again.";
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 4. ADD A PERSON
    // ═══════════════════════════════════════════════════════════════════════════

    private String handleAddPersonName(String phone, String msg, ConversationState state) {
        state.tempName = msg;
        state.step = Step.ADD_PERSON_PLACE;
        return "Enter their village/city:";
    }

    private String handleAddPersonPlace(String phone, String msg, ConversationState state) {
        state.tempPlace = msg;
        state.step = Step.ADD_PERSON_PHONE;
        return "Enter their mobile number (10 digits):";
    }

    private String handleAddPersonPhone(String phone, String msg, ConversationState state) {
        String digits = msg.replaceAll("[^0-9]", "");
        if (digits.length() != 10) {
            return "Please enter a valid 10-digit mobile number:";
        }

        try {
            User managedBy = userService.findByPhoneNumber(phone);

            // Check if phone already exists
            User existingUser = userRepository.findByPhoneNumber(digits).orElse(null);
            if (existingUser != null) {
                states.remove(phone);
                return "This phone number is already registered as: " + existingUser.getName() + "\n\n" +
                       "Type 'hi' for main menu.";
            }

            User person = User.createManagedPerson(state.tempName, state.tempPlace, digits, managedBy);
            userRepository.save(person);

            states.remove(phone);
            log.info("Person added: {} by {}", state.tempName, phone);

            return "Person added successfully!\n\n" +
                   "Name: " + state.tempName + "\n" +
                   "Place: " + state.tempPlace + "\n" +
                   "Phone: " + digits + "\n\n" +
                   "You can now switch to this person using option 5.\n\n" +
                   "Type 'hi' for main menu.";

        } catch (Exception e) {
            log.error("Error adding person: {}", e.getMessage(), e);
            states.remove(phone);
            return "Sorry, couldn't add person. Please try again.";
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 5. SWITCH USER
    // ═══════════════════════════════════════════════════════════════════════════

    private String handleSwitchUserMenu(String phone, ConversationState state) {
        try {
            User self = userService.findByPhoneNumber(phone);
            List<User> managed = userRepository.findByManagedBy(self);

            if (managed.isEmpty()) {
                states.remove(phone);
                return "You haven't added any persons yet.\n\n" +
                       "Use option 4 to add a family member.\n\n" +
                       "Type 'hi' for main menu.";
            }

            StringBuilder sb = new StringBuilder();
            sb.append("Select a person:\n\n");
            sb.append("1. ").append(self.getName()).append(" (You)\n");
            int index = 2;
            for (User m : managed) {
                sb.append(index++).append(". ").append(m.getName()).append("\n");
            }
            sb.append("\n(Type a number)");

            // Store the list for reference
            state.managedUsers = new java.util.ArrayList<>();
            state.managedUsers.add(self);
            state.managedUsers.addAll(managed);
            state.step = Step.SWITCH_USER;

            return sb.toString();

        } catch (Exception e) {
            log.error("Error loading users: {}", e.getMessage(), e);
            states.remove(phone);
            return "Sorry, couldn't load users. Please try again.";
        }
    }

    private String handleSwitchUser(String phone, String msg, ConversationState state) {
        int choice;
        try {
            choice = Integer.parseInt(msg);
        } catch (NumberFormatException e) {
            return "Please enter a valid number.";
        }

        if (state.managedUsers == null || choice < 1 || choice > state.managedUsers.size()) {
            return "Invalid choice. Please enter a number from the list.";
        }

        User selected = state.managedUsers.get(choice - 1);
        state.activeUserId = selected.getId();
        state.activeUserName = selected.getName();
        state.managedUsers = null;

        return "Switched to: " + selected.getName() + "\n\n" +
               "All actions will now be for " + selected.getName() + ".\n\n" +
               showMainMenu(phone, selected.getName());
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // QR SCAN → EVENT CHOICE
    // ═══════════════════════════════════════════════════════════════════════════

    private String handleQrScan(String phone, String eventCode) {
        try {
            Event event = eventService.findByQrCode(eventCode);

            // Ensure user is registered
            User user;
            try {
                user = userService.findByPhoneNumber(phone);
            } catch (UserNotFoundException e) {
                // Auto-register on QR scan
                ConversationState state = new ConversationState();
                state.step = Step.REG_NAME;
                state.pendingEventCode = eventCode;
                states.put(phone, state);
                return "Welcome to Mahotsava!\n\n" +
                       "Let's set up your profile first.\n\n" +
                       "What's your name?";
            }

            ConversationState state = states.getOrDefault(phone, new ConversationState());
            state.activeUserId = user.getId();
            state.activeUserName = user.getName();
            state.eventCode = eventCode;
            state.eventId = event.getEventId();
            state.step = Step.EVENT_CHOICE;
            states.put(phone, state);

            return "Welcome!\n\n" +
                   "Event: " + event.getEventName() + "\n" +
                   "Date: " + event.getEventDate() + "\n" +
                   "Host: " + event.getHost().getName() + "\n\n" +
                   "What would you like to do?\n\n" +
                   "1. Give a gift\n" +
                   "2. View my payments\n\n" +
                   "(Type 1 or 2)";

        } catch (EventNotFoundException e) {
            return "Event not found. The QR code may be invalid.";
        }
    }

    private String handleEventChoice(String phone, String msg, ConversationState state) {
        if ("1".equals(msg)) {
            // Check if user info is already known
            User user = getActiveUser(phone, state);
            if (user != null) {
                state.tempName = user.getName();
                state.tempPlace = user.getVillage();
                state.step = Step.GIFT_AMOUNT;
                return "Hi " + user.getName() + "!\n\n" +
                       "How much would you like to contribute?\n(Enter amount in rupees)";
            }
            state.step = Step.GIFT_NAME;
            return "Let's start your contribution.\n\nWhat's your name?";
        }
        if ("2".equals(msg)) {
            return showPaymentsForEvent(phone, state);
        }
        return "Please type 1 or 2:\n\n" +
               "1. Give a gift\n" +
               "2. View my payments";
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // GIFT FLOW
    // ═══════════════════════════════════════════════════════════════════════════

    private String handleGiftName(String phone, String msg, ConversationState state) {
        state.tempName = msg;
        state.step = Step.GIFT_PLACE;
        return "What's your village/city?\n(Type 'skip' to skip)";
    }

    private String handleGiftPlace(String phone, String msg, ConversationState state) {
        if (!"skip".equalsIgnoreCase(msg)) {
            state.tempPlace = msg;
        }
        state.step = Step.GIFT_AMOUNT;
        return "How much would you like to contribute?\n(Enter amount in rupees)";
    }

    private String handleGiftAmount(String phone, String msg, ConversationState state) {
        long amount;
        try {
            amount = Long.parseLong(msg.replaceAll("[^0-9]", ""));
        } catch (NumberFormatException e) {
            return "Please enter a valid amount (numbers only):";
        }
        if (amount <= 0) {
            return "Amount must be greater than 0. Please try again:";
        }

        state.amount = amount;
        state.step = Step.GIFT_CONFIRM;

        try {
            Event event = eventService.findByQrCode(state.eventCode);
            String hostUpiId = event.getHostUpiId();

            StringBuilder sb = new StringBuilder();
            sb.append("Confirm your contribution:\n\n");
            sb.append("Event: ").append(event.getEventName()).append("\n");
            sb.append("Amount: Rs. ").append(amount).append("\n");

            if (hostUpiId != null && !hostUpiId.isBlank()) {
                sb.append("\nPay via UPI: ").append(hostUpiId).append("\n");
                sb.append("\nAfter payment, type 'paid' to confirm.");
            } else {
                sb.append("\nPlease pay at the event. Type 'paid' to record.");
            }

            return sb.toString();

        } catch (Exception e) {
            log.error("Error in gift amount: {}", e.getMessage(), e);
            states.remove(phone);
            return "Sorry, something went wrong. Please try again.";
        }
    }

    private String handleGiftConfirm(String phone, String msg, ConversationState state) {
        String lower = msg.toLowerCase();
        if (!"paid".equals(lower) && !"done".equals(lower) && !"yes".equals(lower)) {
            return "Type 'paid' after completing the payment.";
        }

        try {
            Event event = eventService.findByQrCode(state.eventCode);

            // Get or create user
            User guest = getOrCreateGuest(phone, state);

            // Create hisab record
            Hisab hisab = hisabService.createHisab(new com.mysteriousmonkeys.chanlo.dto.HisabCreateRequest(
                event.getEventId(),
                guest.getId(),
                state.amount,
                PaymentMethod.MANUAL
            ));

            // Mark as success
            String txnId = "WA_" + System.currentTimeMillis();
            hisabService.markPaymentSuccess(hisab.getHisabId(), txnId, "WHATSAPP");

            String thankYou = event.getThankYouMessage();
            states.remove(phone);

            return "Payment confirmed! Thank you!\n\n" +
                   "Amount: Rs. " + state.amount + "\n" +
                   "Event: " + event.getEventName() + "\n" +
                   "Transaction ID: " + txnId + "\n\n" +
                   thankYou + "\n\n" +
                   "Type 'hi' for main menu.";

        } catch (Exception e) {
            log.error("Error confirming payment: {}", e.getMessage(), e);
            return "Sorry, couldn't confirm payment. Please try again or type 'paid'.";
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW PAYMENTS FOR EVENT
    // ═══════════════════════════════════════════════════════════════════════════

    private String showPaymentsForEvent(String phone, ConversationState state) {
        try {
            Event event = eventService.findByQrCode(state.eventCode);
            User user = getActiveUser(phone, state);

            if (user == null) {
                states.remove(phone);
                return "No payments found. You haven't registered yet.\n\nType 'hi' to start.";
            }

            List<Hisab> payments = hisabService.getHisabsByEventAndGuest(event.getEventId(), user.getId());
            states.remove(phone);

            if (payments.isEmpty()) {
                return "No payments found for " + event.getEventName() + ".\n\n" +
                       "Type 'hi' for main menu.";
            }

            var fmt = java.time.format.DateTimeFormatter.ofPattern("dd-MMM-yyyy HH:mm");
            StringBuilder sb = new StringBuilder();
            sb.append("Your Payments for ").append(event.getEventName()).append("\n\n");

            long total = 0;
            int i = 1;
            for (Hisab h : payments) {
                sb.append("--- Payment ").append(i++).append(" ---\n");
                sb.append("Amount: Rs. ").append(h.getAmount()).append("\n");
                sb.append("Status: ").append(h.getPaymentStatus()).append("\n");
                if (h.getCompletedAt() != null) {
                    sb.append("Date: ").append(h.getCompletedAt().format(fmt)).append("\n");
                }
                sb.append("\n");
                if (h.isCompleted()) total += h.getAmount();
            }

            sb.append("---\nTotal Paid: Rs. ").append(total).append("\n\n");
            sb.append("Type 'hi' for main menu.");

            return sb.toString();

        } catch (Exception e) {
            log.error("Error viewing payments: {}", e.getMessage(), e);
            states.remove(phone);
            return "Sorry, couldn't load payments. Please try again.";
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════════════════════════

    private User getActiveUser(String phone, ConversationState state) {
        if (state.activeUserId != null) {
            return userRepository.findById(state.activeUserId).orElse(null);
        }
        return userRepository.findByPhoneNumber(phone).orElse(null);
    }

    private User getOrCreateGuest(String phone, ConversationState state) {
        User user = getActiveUser(phone, state);
        if (user != null) {
            // Update name/place if provided
            boolean updated = false;
            if (state.tempName != null && !state.tempName.equals(user.getName())) {
                user.setName(state.tempName);
                updated = true;
            }
            if (state.tempPlace != null && !state.tempPlace.equals(user.getVillage())) {
                user.setVillage(state.tempPlace);
                updated = true;
            }
            if (updated) user = userRepository.save(user);
            return user;
        }

        // Create new guest
        User newUser = User.createGuest(
            state.tempName != null ? state.tempName : "Guest",
            state.tempPlace,
            phone
        );
        return userRepository.save(newUser);
    }

    private String normalizePhone(String phoneNumber) {
        String digits = phoneNumber.replaceAll("[^0-9]", "");
        if (digits.length() >= 10) {
            return digits.substring(digits.length() - 10);
        }
        return digits;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════

    private static class ConversationState {
        Step step;
        Integer activeUserId;
        String activeUserName;

        // Temp fields for flows
        String tempName;
        String tempPlace;
        String eventCode;
        int eventId;
        long amount;
        String pendingEventCode;

        // Switch user
        List<User> managedUsers;
    }

    private enum Step {
        // Registration
        REG_NAME, REG_PLACE,
        // Main menu
        WAITING_MAIN_CHOICE,
        // Edit
        EDIT_NAME, EDIT_PLACE,
        // Add person
        ADD_PERSON_NAME, ADD_PERSON_PLACE, ADD_PERSON_PHONE,
        // Switch user
        SWITCH_USER,
        // Event choice (QR scan)
        EVENT_CHOICE,
        // Gift flow
        GIFT_NAME, GIFT_PLACE, GIFT_AMOUNT, GIFT_CONFIRM
    }
}
