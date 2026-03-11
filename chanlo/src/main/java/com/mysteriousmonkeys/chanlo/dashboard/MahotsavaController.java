package com.mysteriousmonkeys.chanlo.dashboard;

import com.mysteriousmonkeys.chanlo.auth.AuthService;
import com.mysteriousmonkeys.chanlo.dto.EventCreateRequest;
import com.mysteriousmonkeys.chanlo.dto.EventResponse;
import com.mysteriousmonkeys.chanlo.dto.HisabResponse;
import com.mysteriousmonkeys.chanlo.event.Event;
import com.mysteriousmonkeys.chanlo.money.Expense;
import com.mysteriousmonkeys.chanlo.money.PaymentMethod;
import com.mysteriousmonkeys.chanlo.money.Hisab;
import com.mysteriousmonkeys.chanlo.money.Settlement;
import com.mysteriousmonkeys.chanlo.service.EventService;
import com.mysteriousmonkeys.chanlo.service.HelperService;
import com.mysteriousmonkeys.chanlo.service.HisabService;
import com.mysteriousmonkeys.chanlo.service.QRCodeService;
import com.mysteriousmonkeys.chanlo.user.User;
import com.mysteriousmonkeys.chanlo.user.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/app")
public class MahotsavaController {

    @Autowired
    private AuthService authService;

    @Autowired
    private EventService eventService;

    @Autowired
    private HisabService hisabService;

    @Autowired
    private HelperService helperService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private QRCodeService qrCodeService;

    // ==================== HOST ENDPOINTS ====================

    /**
     * Create a new event
     * POST /api/app/events
     */
    @PostMapping("/events")
    public ResponseEntity<?> createEvent(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody Map<String, Object> request) {

        AuthService.AuthSession session = validateAuth(authHeader);
        if (session == null) return unauthorized();

        EventCreateRequest createRequest = new EventCreateRequest(
            (String) request.get("eventName"),
            java.time.LocalDate.parse((String) request.get("eventDate")),
            session.userId(),
            (String) request.getOrDefault("hostUpiId", null),
            (String) request.getOrDefault("hostMessage", null)
        );

        Event event = eventService.createEvent(createRequest);
        return ResponseEntity.ok(Map.of(
            "success", true,
            "event", eventService.getEventWithStats(event.getEventId())
        ));
    }

    /**
     * Get all events for the logged-in host
     * GET /api/app/events
     */
    @GetMapping("/events")
    public ResponseEntity<?> getMyEvents(@RequestHeader("Authorization") String authHeader) {
        AuthService.AuthSession session = validateAuth(authHeader);
        if (session == null) return unauthorized();

        List<Event> events = eventService.getEventsByHost(session.userId());
        List<EventResponse> eventResponses = events.stream()
            .map(e -> eventService.getEventWithStats(e.getEventId()))
            .toList();
        return ResponseEntity.ok(Map.of("success", true, "events", eventResponses));
    }

    /**
     * Get event details with stats
     * GET /api/app/events/{eventId}
     */
    @GetMapping("/events/{eventId}")
    public ResponseEntity<?> getEventDetails(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable int eventId) {

        AuthService.AuthSession session = validateAuth(authHeader);
        if (session == null) return unauthorized();

        EventResponse event = eventService.getEventWithStats(eventId);
        List<HisabResponse> payments = hisabService.getHisabsByEvent(eventId);

        return ResponseEntity.ok(Map.of(
            "success", true,
            "event", event,
            "payments", payments
        ));
    }

    /**
     * Get event QR code image
     * GET /api/app/events/{eventId}/qr
     */
    @GetMapping(value = "/events/{eventId}/qr", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> getEventQr(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable int eventId) {

        AuthService.AuthSession session = validateAuth(authHeader);
        if (session == null) return ResponseEntity.status(401).build();

        try {
            EventResponse event = eventService.getEventWithStats(eventId);
            byte[] qrImage = qrCodeService.generateBrandedQRCodeImage(
                "EVENT_" + eventId,
                event.eventName(),
                event.eventDate().toString()
            );

            return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_PNG)
                .body(qrImage);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    // ==================== HELPER MANAGEMENT (Host) ====================

    /**
     * Get all helpers for an event with their collection stats
     * GET /api/app/events/{eventId}/helpers
     */
    @GetMapping("/events/{eventId}/helpers")
    public ResponseEntity<?> getHelpers(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable int eventId) {

        AuthService.AuthSession session = validateAuth(authHeader);
        if (session == null) return unauthorized();

        List<HelperService.HelperSummary> helpers = helperService.getHelperSummaries(eventId);
        return ResponseEntity.ok(Map.of("success", true, "helpers", helpers));
    }

    /**
     * Add a helper to an event by phone number
     * POST /api/app/events/{eventId}/helpers
     * Body: { "phoneNumber": "9876543210", "canExpense": false }
     */
    @PostMapping("/events/{eventId}/helpers")
    public ResponseEntity<?> addHelper(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable int eventId,
            @RequestBody Map<String, Object> request) {

        AuthService.AuthSession session = validateAuth(authHeader);
        if (session == null) return unauthorized();

        try {
            String phoneNumber = (String) request.get("phoneNumber");
            boolean canExpense = Boolean.TRUE.equals(request.get("canExpense"));
            String helperName = (String) request.get("helperName");

            helperService.addHelperByPhone(eventId, phoneNumber, canExpense, helperName);
            return ResponseEntity.ok(Map.of("success", true, "message", "Helper added"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /**
     * Remove a helper from an event
     * DELETE /api/app/events/{eventId}/helpers/{helperId}
     */
    @DeleteMapping("/events/{eventId}/helpers/{helperId}")
    public ResponseEntity<?> removeHelper(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable int eventId,
            @PathVariable int helperId) {

        AuthService.AuthSession session = validateAuth(authHeader);
        if (session == null) return unauthorized();

        try {
            helperService.removeHelper(eventId, helperId);
            return ResponseEntity.ok(Map.of("success", true, "message", "Helper removed"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    // ==================== SETTLEMENT (Host) ====================

    /**
     * Settle with a helper
     * POST /api/app/events/{eventId}/settle
     * Body: { "helperId": 5, "amount": 5000, "note": "Cash received" }
     */
    @PostMapping("/events/{eventId}/settle")
    public ResponseEntity<?> settleWithHelper(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable int eventId,
            @RequestBody Map<String, Object> request) {

        AuthService.AuthSession session = validateAuth(authHeader);
        if (session == null) return unauthorized();

        try {
            int helperId = (int) request.get("helperId");
            Long amount = ((Number) request.get("amount")).longValue();
            String note = (String) request.getOrDefault("note", null);

            Settlement settlement = helperService.settleWithHelper(
                eventId, helperId, session.userId(), amount, note);
            return ResponseEntity.ok(Map.of("success", true, "settlement", settlement));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /**
     * Get settlement history for an event
     * GET /api/app/events/{eventId}/settlements
     */
    @GetMapping("/events/{eventId}/settlements")
    public ResponseEntity<?> getSettlements(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable int eventId) {

        AuthService.AuthSession session = validateAuth(authHeader);
        if (session == null) return unauthorized();

        List<Settlement> settlements = helperService.getSettlementsByEvent(eventId);
        return ResponseEntity.ok(Map.of("success", true, "settlements", settlements));
    }

    // ==================== VERIFICATION (Host) ====================

    /**
     * Verify a payment by QR data
     * POST /api/app/verify
     * Body: { "qrData": "VERIFY_..." }
     */
    @PostMapping("/verify")
    public ResponseEntity<?> verifyPayment(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody Map<String, String> request) {

        AuthService.AuthSession session = validateAuth(authHeader);
        if (session == null) return unauthorized();

        String qrData = request.get("qrData");
        HelperService.VerificationResult result = helperService.verifyPayment(qrData);
        return ResponseEntity.ok(result);
    }

    // ==================== HELPER ENDPOINTS ====================

    /**
     * Helper: Get all events assigned to this helper
     * GET /api/app/helper/events
     */
    @GetMapping("/helper/events")
    public ResponseEntity<?> getHelperEvents(@RequestHeader("Authorization") String authHeader) {
        AuthService.AuthSession session = validateAuth(authHeader);
        if (session == null) return unauthorized();

        try {
            List<HelperService.HelperEventSummary> events = helperService.getEventsForHelper(session.userId());
            return ResponseEntity.ok(Map.of("success", true, "events", events));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /**
     * Helper: Validate event access
     * POST /api/app/helper/validate
     * Body: { "eventId": 1 }
     */
    @PostMapping("/helper/validate")
    public ResponseEntity<?> validateHelperAccess(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody Map<String, Object> request) {

        AuthService.AuthSession session = validateAuth(authHeader);
        if (session == null) return unauthorized();

        int eventId = (int) request.get("eventId");
        boolean isHelper = helperService.isHelperForEvent(eventId, session.phoneNumber());

        return ResponseEntity.ok(Map.of(
            "success", true,
            "isHelper", isHelper,
            "eventId", eventId
        ));
    }

    /**
     * Helper: Collect money from a guest
     * POST /api/app/helper/collect
     * Body: { "eventId": 1, "guestName": "Ramesh", "guestPlace": "Surat",
     *         "guestPhone": "9876543210", "amount": 1100, "paymentMethod": "CASH" }
     */
    @PostMapping("/helper/collect")
    public ResponseEntity<?> collectMoney(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody Map<String, Object> request) {

        AuthService.AuthSession session = validateAuth(authHeader);
        if (session == null) return unauthorized();

        try {
            int eventId = (int) request.get("eventId");
            String guestName = (String) request.get("guestName");
            String guestPlace = (String) request.getOrDefault("guestPlace", "");
            String guestPhone = (String) request.get("guestPhone");
            Long amount = ((Number) request.get("amount")).longValue();
            PaymentMethod method = PaymentMethod.valueOf((String) request.getOrDefault("paymentMethod", "CASH"));

            Hisab hisab = helperService.collectMoney(
                eventId, session.userId(), guestName, guestPlace, guestPhone, amount, method);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Payment recorded",
                "hisabId", hisab.getHisabId(),
                "verificationQr", hisab.getVerificationQrData()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /**
     * Helper: Record an expense
     * POST /api/app/helper/expense
     * Body: { "eventId": 1, "reason": "Water bottles", "amount": 500 }
     */
    @PostMapping("/helper/expense")
    public ResponseEntity<?> recordExpense(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody Map<String, Object> request) {

        AuthService.AuthSession session = validateAuth(authHeader);
        if (session == null) return unauthorized();

        try {
            int eventId = (int) request.get("eventId");
            String reason = (String) request.get("reason");
            Long amount = ((Number) request.get("amount")).longValue();

            Expense expense = helperService.recordExpense(eventId, session.userId(), reason, amount);
            return ResponseEntity.ok(Map.of("success", true, "expense", expense));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /**
     * Helper: Get expenses for an event
     * GET /api/app/events/{eventId}/expenses
     */
    @GetMapping("/events/{eventId}/expenses")
    public ResponseEntity<?> getExpenses(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable int eventId) {

        AuthService.AuthSession session = validateAuth(authHeader);
        if (session == null) return unauthorized();

        List<Expense> expenses = helperService.getExpensesByEvent(eventId);
        return ResponseEntity.ok(Map.of("success", true, "expenses", expenses));
    }

    // ==================== PROFILE ====================

    /**
     * Update profile
     * PUT /api/app/profile
     * Body: { "name": "New Name", "place": "Mumbai", "email": "a@b.com", "pincode": "400001" }
     */
    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody Map<String, String> request) {

        AuthService.AuthSession session = validateAuth(authHeader);
        if (session == null) return unauthorized();

        User user = userRepository.findById(session.userId())
            .orElseThrow(() -> new RuntimeException("User not found"));

        if (request.containsKey("name")) user.setName(request.get("name"));
        if (request.containsKey("place")) user.setVillage(request.get("place"));
        if (request.containsKey("email")) user.setEmail(request.get("email"));
        if (request.containsKey("pincode")) user.setPincode(request.get("pincode"));

        user = userRepository.save(user);

        return ResponseEntity.ok(Map.of("success", true, "user", user));
    }

    /**
     * Get profile
     * GET /api/app/profile
     */
    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(@RequestHeader("Authorization") String authHeader) {
        AuthService.AuthSession session = validateAuth(authHeader);
        if (session == null) return unauthorized();

        User user = userRepository.findById(session.userId())
            .orElseThrow(() -> new RuntimeException("User not found"));

        return ResponseEntity.ok(Map.of("success", true, "user", user));
    }

    // ==================== HELPERS ====================

    private AuthService.AuthSession validateAuth(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
        String token = authHeader.substring(7);
        return authService.validateSession(token);
    }

    private ResponseEntity<?> unauthorized() {
        return ResponseEntity.status(401).body(Map.of("success", false, "message", "Unauthorized"));
    }
}
