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

import java.util.HashMap;
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

            // Deleted user check — handle RESTORE or inform
            User maybeDeleted = userRepository.findByPhoneNumber(phone).orElse(null);
            if (maybeDeleted != null && !maybeDeleted.isActive()) {
                long daysSince = maybeDeleted.getDeletedAt() != null
                    ? java.time.temporal.ChronoUnit.DAYS.between(maybeDeleted.getDeletedAt(), java.time.LocalDateTime.now())
                    : 31;
                if (msg.trim().equalsIgnoreCase("RESTORE")) {
                    if (daysSince <= 30) {
                        maybeDeleted.setActive(true);
                        maybeDeleted.setDeletedAt(null);
                        userRepository.save(maybeDeleted);
                        states.remove(phone);
                        return showMainMenu(phone, maybeDeleted.getName(), "Welcome back, " + maybeDeleted.getName() + "! Your account has been restored.");
                    } else {
                        return "Your account was deleted more than 30 days ago and cannot be recovered.\n\nSend your name to register fresh.";
                    }
                }
                return daysSince <= 30
                    ? "Your account was deleted " + daysSince + " day(s) ago.\n\nType *RESTORE* to recover it (within 30 days)."
                    : "Your account has been permanently removed.\n\nSend your name to register fresh.";
            }

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
        return showMainMenu(phone, name, null);
    }

    private String showMainMenu(String phone, String name, String prefix) {
        ConversationState state = states.get(phone);
        if (state == null) {
            state = new ConversationState();
            states.put(phone, state);
        }
        state.step = Step.WAITING_MAIN_CHOICE;
        state.managedUsers = null;
        state.pendingAction = null;

        String body = (prefix != null ? prefix + "\n\n" : "")
            + "Namaste " + name + "!\n\nWhat would you like to do?";

        whatsAppApiService.sendListMessage(phone, body, "Menu", "Options", List.of(
            Map.of("id", "MENU_1", "title", "Edit your details"),
            Map.of("id", "MENU_2", "title", "Get your QR"),
            Map.of("id", "MENU_3", "title", "Transaction history"),
            Map.of("id", "MENU_4", "title", "Add a person"),
            Map.of("id", "MENU_5", "title", "Delete my account")
        ));
        return "";
    }

    /**
     * Show a person picker list after user selects an action.
     * Sends a list of self + managed persons with PICK_N row IDs.
     */
    private void showPersonPicker(String phone, ConversationState state, String action) {
        try {
            User self = userService.findByPhoneNumber(phone);
            List<User> managed = userRepository.findByManagedBy(self);

            state.managedUsers = new java.util.ArrayList<>();
            state.managedUsers.add(self);
            state.managedUsers.addAll(managed);
            state.pendingAction = action;
            state.step = Step.PICK_USER;

            String actionLabel = switch (action) {
                case "QR" -> "get QR for";
                case "EDIT" -> "edit details of";
                case "HIST" -> "view history of";
                default -> "select";
            };

            List<Map<String, String>> rows = new java.util.ArrayList<>();
            rows.add(Map.of("id", "PICK_0", "title", self.getName() + " (You)"));
            for (int i = 0; i < managed.size(); i++) {
                rows.add(Map.of("id", "PICK_" + (i + 1), "title", managed.get(i).getName()));
            }

            whatsAppApiService.sendListMessage(phone,
                "Who would you like to " + actionLabel + "?",
                "Select", "People", rows);

        } catch (Exception e) {
            log.error("Error showing person picker: {}", e.getMessage());
        }
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
            // Person picker
            case PICK_USER -> handlePickUser(phone, msg, state);

            // Edit details
            case EDIT_NAME -> handleEditName(phone, msg, state);
            case EDIT_PLACE -> handleEditPlace(phone, msg, state);

            // Add person
            case ADD_PERSON_NAME -> handleAddPersonName(phone, msg, state);
            case ADD_PERSON_PLACE -> handleAddPersonPlace(phone, msg, state);
            case ADD_PERSON_PHONE -> handleAddPersonPhone(phone, msg, state);

            // Switch user (legacy)
            case SWITCH_USER -> handleSwitchUser(phone, msg, state);

            // QR scan event choice
            case EVENT_CHOICE -> handleEventChoice(phone, msg, state);

            // Gift flow
            case GIFT_NAME -> handleGiftName(phone, msg, state);
            case GIFT_PLACE -> handleGiftPlace(phone, msg, state);
            case GIFT_AMOUNT -> handleGiftAmount(phone, msg, state);
            case GIFT_CONFIRM -> handleGiftConfirm(phone, msg, state);

            // Account deletion confirmation
            case DELETE_CONFIRM -> handleDeleteConfirm(phone, msg, state);

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

            showMainMenu(phone, user.getName(), "Registered successfully!");
            return "";

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
        if ("ADD_PERSON".equals(msg)) {
            state.step = Step.ADD_PERSON_NAME;
            return "Add a family member or person without WhatsApp.\n\nEnter their name:";
        }

        // MENU_1…MENU_4 or plain numbers
        String choice = msg.startsWith("MENU_") ? msg.substring(5) : msg;
        return switch (choice) {
            case "1" -> handleActionOrPick(phone, state, "EDIT");
            case "2" -> handleActionOrPick(phone, state, "QR");
            case "3" -> handleActionOrPick(phone, state, "HIST");
            case "4" -> { state.step = Step.ADD_PERSON_NAME; yield "Add a family member or person without WhatsApp.\n\nEnter their name:"; }
            case "5" -> {
                state.step = Step.DELETE_CONFIRM;
                yield "⚠️ *Delete Account*\n\nAre you sure you want to delete your account?\n\nAll your data will be removed. You can restore your account within 30 days by typing *RESTORE*.\n\nType *YES* to confirm or *NO* to cancel.";
            }
            default -> showMainMenu(phone, state.activeUserName != null ? state.activeUserName : "");
        };
    }

    /**
     * If user has managed persons → show person picker list in same chat.
     * Otherwise → execute action directly for self.
     */
    private String handleActionOrPick(String phone, ConversationState state, String action) {
        try {
            User self = userService.findByPhoneNumber(phone);
            List<User> managed = userRepository.findByManagedBy(self);

            if (!managed.isEmpty()) {
                showPersonPicker(phone, state, action);
                return "";
            }
        } catch (Exception e) {
            log.debug("Could not check managed users: {}", e.getMessage());
        }

        // No managed persons — run action directly for self
        return executeAction(phone, state, action);
    }

    /** Handle PICK_N response from person picker. */
    private String handlePickUser(String phone, String msg, ConversationState state) {
        if (!msg.startsWith("PICK_")) {
            return "Please select from the list.";
        }
        int index;
        try {
            index = Integer.parseInt(msg.substring(5));
        } catch (NumberFormatException e) {
            return "Please select from the list.";
        }

        if (state.managedUsers == null || index < 0 || index >= state.managedUsers.size()) {
            showMainMenu(phone, state.activeUserName != null ? state.activeUserName : "");
            return "";
        }

        User selected = state.managedUsers.get(index);
        state.activeUserId = selected.getId();
        state.activeUserName = selected.getName();
        state.managedUsers = null;

        String action = state.pendingAction != null ? state.pendingAction : "QR";
        state.pendingAction = null;

        return executeAction(phone, state, action);
    }

    /** Execute QR / EDIT / HIST for the current active user. */
    private String executeAction(String phone, ConversationState state, String action) {
        return switch (action) {
            case "QR" -> handleGetQr(phone, state);
            case "HIST" -> handleTransactionHistory(phone, state);
            case "EDIT" -> {
                state.step = Step.EDIT_NAME;
                yield "Editing details for: " + state.activeUserName + "\n\nWhat's the new name?\n(Type 'skip' to keep current)";
            }
            default -> showMainMenu(phone, state.activeUserName != null ? state.activeUserName : "");
        };
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

            // Store the list for reference (self first, then managed)
            state.managedUsers = new java.util.ArrayList<>();
            state.managedUsers.add(self);
            state.managedUsers.addAll(managed);
            state.step = Step.SWITCH_USER;

            // Build list rows: SW_0 = self, SW_1..SW_N = managed persons
            List<Map<String, String>> rows = new java.util.ArrayList<>();
            rows.add(Map.of("id", "SW_0", "title", self.getName() + " (You)"));
            for (int i = 0; i < managed.size(); i++) {
                rows.add(Map.of("id", "SW_" + (i + 1), "title", managed.get(i).getName()));
            }

            whatsAppApiService.sendListMessage(phone, "Who would you like to act as?",
                "Select person", "People", rows);
            return ""; // interactive message already sent

        } catch (Exception e) {
            log.error("Error loading users: {}", e.getMessage(), e);
            states.remove(phone);
            return "Sorry, couldn't load users. Please try again.";
        }
    }

    private String handleSwitchUser(String phone, String msg, ConversationState state) {
        int index;
        try {
            if (msg.startsWith("SW_")) {
                // Interactive list reply — 0-indexed
                index = Integer.parseInt(msg.substring(3));
            } else {
                // Plain number fallback — 1-indexed
                index = Integer.parseInt(msg) - 1;
            }
        } catch (NumberFormatException e) {
            return "Please select from the list.";
        }

        if (state.managedUsers == null || index < 0 || index >= state.managedUsers.size()) {
            return "Invalid selection. Please choose from the list.";
        }

        User selected = state.managedUsers.get(index);
        state.activeUserId = selected.getId();
        state.activeUserName = selected.getName();
        state.managedUsers = null;

        showMainMenu(phone, selected.getName());
        return "";
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

            String body = "Event: " + event.getEventName() +
                          "\nDate: " + event.getEventDate() +
                          "\nHost: " + event.getHost().getName() +
                          "\n\nWhat would you like to do?";
            whatsAppApiService.sendButtonMessage(phone, body, List.of(
                Map.of("id", "EVT_1", "title", "Give a gift"),
                Map.of("id", "EVT_2", "title", "View my payments")
            ));
            return "";

        } catch (EventNotFoundException e) {
            return "Event not found. The QR code may be invalid.";
        }
    }

    private String handleEventChoice(String phone, String msg, ConversationState state) {
        // Accept interactive IDs (EVT_1, EVT_2) or plain numbers
        String choice = msg.startsWith("EVT_") ? msg.substring(4) : msg;
        if ("1".equals(choice)) {
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
        if ("2".equals(choice)) {
            return showPaymentsForEvent(phone, state);
        }
        // Re-send buttons
        try {
            Event event = eventService.findByQrCode(state.eventCode);
            String body = "Event: " + event.getEventName() + "\n\nWhat would you like to do?";
            whatsAppApiService.sendButtonMessage(phone, body, List.of(
                Map.of("id", "EVT_1", "title", "Give a gift"),
                Map.of("id", "EVT_2", "title", "View my payments")
            ));
            return "";
        } catch (Exception e) {
            return "Please tap one of the buttons above.";
        }
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
        double amount;
        try {
            amount = Double.parseDouble(msg.replaceAll("[^0-9.]", ""));
        } catch (NumberFormatException e) {
            return "Please enter a valid amount (e.g. 500 or 150.50):";
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
            sb.append("Amount: Rs. ").append(String.format("%.2f", amount)).append("\n");

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
                   "Amount: Rs. " + String.format("%.2f", state.amount) + "\n" +
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
    // ACCOUNT DELETION
    // ═══════════════════════════════════════════════════════════════════════════

    private String handleDeleteConfirm(String phone, String msg, ConversationState state) {
        String upper = msg.trim().toUpperCase();
        if ("YES".equals(upper)) {
            try {
                User user = userRepository.findByPhoneNumber(phone).orElse(null);
                if (user != null) {
                    user.setActive(false);
                    user.setDeletedAt(java.time.LocalDateTime.now());
                    userRepository.save(user);
                }
            } catch (Exception e) {
                log.error("Error deleting user account: {}", e.getMessage(), e);
            }
            states.remove(phone);
            return "Your account has been deleted.\n\nType *RESTORE* within 30 days to recover your account and all data.";
        } else if ("NO".equals(upper)) {
            state.step = Step.WAITING_MAIN_CHOICE;
            return showMainMenu(phone, state.activeUserName != null ? state.activeUserName : "");
        } else {
            return "Type *YES* to confirm deletion or *NO* to cancel.";
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

            double total = 0.0;
            int i = 1;
            for (Hisab h : payments) {
                sb.append("--- Payment ").append(i++).append(" ---\n");
                sb.append("Amount: Rs. ").append(String.format("%.2f", h.getAmount())).append("\n");
                sb.append("Status: ").append(h.getPaymentStatus()).append("\n");
                if (h.getCompletedAt() != null) {
                    sb.append("Date: ").append(h.getCompletedAt().format(fmt)).append("\n");
                }
                sb.append("\n");
                if (h.isCompleted()) total += h.getAmount();
            }

            sb.append("---\nTotal Paid: Rs. ").append(String.format("%.2f", total)).append("\n\n");
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
        double amount;
        String pendingEventCode;

        // Person list + pending action for two-step person picker
        List<User> managedUsers;
        String pendingAction;
    }

    private enum Step {
        // Registration
        REG_NAME, REG_PLACE,
        // Main menu
        WAITING_MAIN_CHOICE,
        // Person picker (after action selected)
        PICK_USER,
        // Edit
        EDIT_NAME, EDIT_PLACE,
        // Add person
        ADD_PERSON_NAME, ADD_PERSON_PLACE, ADD_PERSON_PHONE,
        // Switch user (legacy)
        SWITCH_USER,
        // Event choice (QR scan)
        EVENT_CHOICE,
        // Gift flow
        GIFT_NAME, GIFT_PLACE, GIFT_AMOUNT, GIFT_CONFIRM,
        // Account deletion confirmation
        DELETE_CONFIRM
    }
}
