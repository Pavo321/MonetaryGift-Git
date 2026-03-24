package com.mysteriousmonkeys.chanlo.dashboard;

import com.mysteriousmonkeys.chanlo.auth.AuthService;
import com.mysteriousmonkeys.chanlo.dto.EventCreateRequest;
import com.mysteriousmonkeys.chanlo.dto.EventResponse;
import com.mysteriousmonkeys.chanlo.dto.HisabResponse;
import com.mysteriousmonkeys.chanlo.dto.ParticipantResponse;
import com.mysteriousmonkeys.chanlo.dto.UpiPaymentLinkResponse;
import com.mysteriousmonkeys.chanlo.event.ConfirmationType;
import com.mysteriousmonkeys.chanlo.event.Event;
import com.mysteriousmonkeys.chanlo.event.EventType;
import com.mysteriousmonkeys.chanlo.money.Expense;
import com.mysteriousmonkeys.chanlo.money.Hisab;
import com.mysteriousmonkeys.chanlo.money.PaymentMethod;
import com.mysteriousmonkeys.chanlo.money.Settlement;
import com.mysteriousmonkeys.chanlo.event.EventRepository;
import com.mysteriousmonkeys.chanlo.service.EventService;
import com.mysteriousmonkeys.chanlo.service.HelperService;
import com.mysteriousmonkeys.chanlo.service.HisabService;
import com.mysteriousmonkeys.chanlo.service.ParticipantService;
import com.mysteriousmonkeys.chanlo.service.QRCodeService;
import com.mysteriousmonkeys.chanlo.user.User;
import com.mysteriousmonkeys.chanlo.user.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import com.mysteriousmonkeys.chanlo.event.EventRouteStop;

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

    @Autowired
    private ParticipantService participantService;

    @Autowired
    private EventRepository eventRepository;

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

        String eventTypeStr = (String) request.getOrDefault("eventType", null);
        EventType eventType = eventTypeStr != null ? EventType.valueOf(eventTypeStr) : null;

        String confirmationTypeStr = (String) request.getOrDefault("confirmationType", null);
        ConfirmationType confirmationType = confirmationTypeStr != null ? ConfirmationType.valueOf(confirmationTypeStr) : null;

        Integer capacity = request.get("capacity") != null ? ((Number) request.get("capacity")).intValue() : null;
        Long pricePerPerson = request.get("pricePerPerson") != null ? ((Number) request.get("pricePerPerson")).longValue() : null;

        String eventTimeStr = (String) request.getOrDefault("eventTime", null);
        java.time.LocalTime eventTime = eventTimeStr != null ? java.time.LocalTime.parse(eventTimeStr) : null;

        @SuppressWarnings("unchecked")
        java.util.List<java.util.Map<String, Object>> rawStops =
            (java.util.List<java.util.Map<String, Object>>) request.getOrDefault("routeStops", null);
        java.util.List<com.mysteriousmonkeys.chanlo.dto.RouteStopInput> routeStops = null;
        if (rawStops != null) {
            routeStops = rawStops.stream().map(s -> new com.mysteriousmonkeys.chanlo.dto.RouteStopInput(
                (String) s.get("name"),
                s.get("lat") != null ? ((Number) s.get("lat")).doubleValue() : 0.0,
                s.get("lng") != null ? ((Number) s.get("lng")).doubleValue() : 0.0,
                s.get("distanceToNextKm") != null ? ((Number) s.get("distanceToNextKm")).floatValue() : null
            )).toList();
        }

        Float totalDistanceKm = request.get("totalDistanceKm") != null
            ? ((Number) request.get("totalDistanceKm")).floatValue() : null;

        EventCreateRequest createRequest = new EventCreateRequest(
            (String) request.get("eventName"),
            java.time.LocalDate.parse((String) request.get("eventDate")),
            session.userId(),
            (String) request.getOrDefault("hostUpiId", null),
            (String) request.getOrDefault("hostMessage", null),
            eventType,
            confirmationType,
            capacity,
            pricePerPerson,
            (String) request.getOrDefault("location", null),
            (String) request.getOrDefault("category", null),
            eventTime,
            routeStops,
            totalDistanceKm
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
                "mahotsava://event/" + eventId,
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

    /**
     * Delete an event (only if all helpers are settled)
     * DELETE /api/app/events/{eventId}
     */
    @DeleteMapping("/events/{eventId}")
    public ResponseEntity<?> deleteEvent(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable int eventId) {

        AuthService.AuthSession session = validateAuth(authHeader);
        if (session == null) return unauthorized();

        try {
            eventService.deleteEvent(eventId);
            return ResponseEntity.ok(Map.of("success", true, "message", "Event deleted"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /**
     * Get deleted events (trash) for current host
     * GET /api/app/events/deleted
     */
    @GetMapping("/events/deleted")
    public ResponseEntity<?> getDeletedEvents(@RequestHeader("Authorization") String authHeader) {
        AuthService.AuthSession session = validateAuth(authHeader);
        if (session == null) return unauthorized();

        List<com.mysteriousmonkeys.chanlo.event.Event> deleted = eventService.getDeletedEventsByHost(session.userId());
        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        List<Map<String, Object>> result = deleted.stream().map(e -> {
            long days = java.time.temporal.ChronoUnit.DAYS.between(e.getDeletedAt(), now);
            Map<String, Object> m = new HashMap<>();
            m.put("eventId", e.getEventId());
            m.put("eventName", e.getEventName());
            m.put("eventDate", e.getEventDate().toString());
            m.put("deletedAt", e.getDeletedAt().toString());
            m.put("daysAgo", days);
            m.put("canRestore", days <= 30);
            return m;
        }).toList();
        return ResponseEntity.ok(Map.of("success", true, "events", result));
    }

    /**
     * Restore a soft-deleted event
     * POST /api/app/events/{eventId}/restore
     */
    @PostMapping("/events/{eventId}/restore")
    public ResponseEntity<?> restoreEvent(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable int eventId) {
        AuthService.AuthSession session = validateAuth(authHeader);
        if (session == null) return unauthorized();
        try {
            eventService.restoreEvent(eventId, session.userId());
            return ResponseEntity.ok(Map.of("success", true, "message", "Event restored"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
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
            Double amount = ((Number) request.get("amount")).doubleValue();
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

    // ==================== ANALYTICS ENDPOINTS ====================

    /**
     * Host analytics: search payments across all events with optional filters
     * GET /api/app/analytics/payments
     */
    @GetMapping("/analytics/payments")
    public ResponseEntity<?> getAnalyticsPayments(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam(required = false) Integer eventId,
            @RequestParam(required = false) String guestName,
            @RequestParam(required = false) String guestPlace,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate) {

        AuthService.AuthSession session = validateAuth(authHeader);
        if (session == null) return unauthorized();

        com.mysteriousmonkeys.chanlo.user.User host = userRepository.findById(session.userId()).orElse(null);
        if (host == null) return unauthorized();

        com.mysteriousmonkeys.chanlo.money.PaymentStatus paymentStatus = null;
        if (status != null && !status.isBlank()) {
            try { paymentStatus = com.mysteriousmonkeys.chanlo.money.PaymentStatus.valueOf(status); }
            catch (IllegalArgumentException ignored) {}
        }
        java.time.LocalDate from = fromDate != null && !fromDate.isBlank() ? java.time.LocalDate.parse(fromDate) : null;
        java.time.LocalDate to = toDate != null && !toDate.isBlank() ? java.time.LocalDate.parse(toDate) : null;

        java.util.List<com.mysteriousmonkeys.chanlo.dto.HisabResponse> payments =
            hisabService.getPaymentsForHostFiltered(host, eventId, guestName, guestPlace, paymentStatus, from, to);

        return ResponseEntity.ok(Map.of("success", true, "payments", payments));
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
     * Host: Accept a gift directly from a guest
     * POST /api/app/host/collect
     * Body: { "eventId": 1, "guestName": "Ramesh", "guestPlace": "Surat",
     *         "guestPhone": "9876543210", "amount": 1100, "paymentMethod": "CASH" }
     */
    @PostMapping("/host/collect")
    public ResponseEntity<?> hostCollectMoney(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody Map<String, Object> request) {

        AuthService.AuthSession session = validateAuth(authHeader);
        if (session == null) return unauthorized();

        try {
            int eventId = (int) request.get("eventId");
            String guestName = (String) request.get("guestName");
            String guestPlace = (String) request.getOrDefault("guestPlace", "");
            String guestPhone = (String) request.get("guestPhone");
            Double amount = ((Number) request.get("amount")).doubleValue();
            PaymentMethod method = PaymentMethod.valueOf((String) request.getOrDefault("paymentMethod", "CASH"));

            Hisab hisab = helperService.hostCollectMoney(
                eventId, session.userId(), guestName, guestPlace, guestPhone, amount, method);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Gift recorded",
                "hisabId", hisab.getHisabId(),
                "verificationQr", hisab.getVerificationQrData()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
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
            Double amount = ((Number) request.get("amount")).doubleValue();
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
            Double amount = ((Number) request.get("amount")).doubleValue();

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

    // ==================== CAPACITY EVENTS ====================

    /**
     * Host confirms a MANUAL capacity event and notifies all participants.
     * POST /api/app/events/{eventId}/confirm
     */
    @PostMapping("/events/{eventId}/confirm")
    public ResponseEntity<?> confirmEvent(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable int eventId) {

        AuthService.AuthSession session = validateAuth(authHeader);
        if (session == null) return unauthorized();

        try {
            Event event = eventService.confirmEvent(eventId, session.userId());
            return ResponseEntity.ok(Map.of("success", true, "message", "Event confirmed and all participants notified.", "eventId", event.getEventId()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /**
     * Host cancels a capacity event. All active participants are refunded and notified.
     * DELETE /api/app/events/{eventId}/cancel
     */
    @DeleteMapping("/events/{eventId}/cancel")
    public ResponseEntity<?> cancelEvent(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable int eventId) {

        AuthService.AuthSession session = validateAuth(authHeader);
        if (session == null) return unauthorized();

        try {
            int refundCount = eventService.cancelEvent(eventId, session.userId());
            return ResponseEntity.ok(Map.of("success", true, "message", "Event cancelled. " + refundCount + " participants refunded.", "refundedCount", refundCount));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /**
     * Guest joins a capacity event. Returns UPI deep links to complete payment.
     * POST /api/app/events/{eventId}/join
     * Body (optional for route events): { "fromStopOrder": 0, "toStopOrder": 2, "seatsBooked": 1 }
     */
    @PostMapping("/events/{eventId}/join")
    public ResponseEntity<?> joinEvent(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable int eventId,
            @RequestBody(required = false) Map<String, Object> body) {

        AuthService.AuthSession session = validateAuth(authHeader);
        if (session == null) return unauthorized();

        Integer fromStopOrder = null;
        Integer toStopOrder = null;
        int seatsBooked = 1;
        if (body != null) {
            if (body.get("fromStopOrder") != null) fromStopOrder = (Integer) body.get("fromStopOrder");
            if (body.get("toStopOrder")   != null) toStopOrder   = (Integer) body.get("toStopOrder");
            if (body.get("seatsBooked")   != null) seatsBooked   = (Integer) body.get("seatsBooked");
        }

        try {
            UpiPaymentLinkResponse response = participantService.joinEvent(
                eventId, session.userId(), fromStopOrder, toStopOrder, seatsBooked);
            return ResponseEntity.ok(Map.of("success", true, "payment", response));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /**
     * Get available seats for a segment of a route-based event.
     * GET /api/app/events/{eventId}/route-availability?from=0&to=2
     */
    @GetMapping("/events/{eventId}/route-availability")
    public ResponseEntity<?> getRouteAvailability(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable int eventId,
            @RequestParam int from,
            @RequestParam int to) {

        AuthService.AuthSession session = validateAuth(authHeader);
        if (session == null) return unauthorized();

        try {
            com.mysteriousmonkeys.chanlo.event.Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Event not found"));
            int available = participantService.getAvailableSeats(event, from, to);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "availableSeats", available,
                "routeStops", event.getOrderedStopNames()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /**
     * Find the nearest route stop to a given GPS coordinate.
     * GET /api/app/events/{eventId}/find-stop?lat=18.5204&lng=73.8567
     * Returns the nearest stop within 15km, or notFound=true.
     */
    @GetMapping("/events/{eventId}/find-stop")
    public ResponseEntity<?> findNearestStop(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable int eventId,
            @RequestParam double lat,
            @RequestParam double lng) {

        AuthService.AuthSession session = validateAuth(authHeader);
        if (session == null) return unauthorized();

        try {
            com.mysteriousmonkeys.chanlo.event.Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Event not found"));

            if (!event.isRouteBased()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Event has no route stops"));
            }

            double bestDistKm = Double.MAX_VALUE;
            com.mysteriousmonkeys.chanlo.event.EventRouteStop bestStop = null;

            for (com.mysteriousmonkeys.chanlo.event.EventRouteStop stop : event.getRouteStops()) {
                if (stop.getLat() == null || stop.getLng() == null) continue;
                double distKm = haversineKm(lat, lng, stop.getLat(), stop.getLng());
                if (distKm < bestDistKm) {
                    bestDistKm = distKm;
                    bestStop = stop;
                }
            }

            if (bestStop == null || bestDistKm > 15.0) {
                return ResponseEntity.ok(Map.of("success", true, "notFound", true));
            }

            return ResponseEntity.ok(Map.of(
                "success", true,
                "notFound", false,
                "stopOrder", bestStop.getStopOrder(),
                "stopName", bestStop.getStopName(),
                "distanceKm", Math.round(bestDistKm * 10.0) / 10.0
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /** Haversine formula — returns distance in km between two lat/lng points. */
    private static double haversineKm(double lat1, double lng1, double lat2, double lng2) {
        final double R = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                 + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                 * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    /**
     * Guest self-reports payment completion after UPI transaction.
     * POST /api/app/hisab/{hisabId}/confirm-payment
     */
    @PostMapping("/hisab/{hisabId}/confirm-payment")
    public ResponseEntity<?> confirmJoinPayment(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable int hisabId,
            @RequestBody Map<String, String> request) {

        AuthService.AuthSession session = validateAuth(authHeader);
        if (session == null) return unauthorized();

        try {
            String transactionId = request.getOrDefault("transactionId", "SELF_REPORTED");
            Hisab hisab = participantService.confirmPayment(hisabId, session.userId(), transactionId);
            return ResponseEntity.ok(Map.of("success", true, "message", "Seat confirmed!", "hisabId", hisab.getHisabId(), "status", hisab.getPaymentStatus()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /**
     * Guest exits an event. Their payment is marked REFUNDED.
     * POST /api/app/hisab/{hisabId}/exit
     */
    @PostMapping("/hisab/{hisabId}/exit")
    public ResponseEntity<?> exitEvent(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable int hisabId) {

        AuthService.AuthSession session = validateAuth(authHeader);
        if (session == null) return unauthorized();

        try {
            Hisab hisab = participantService.exitEvent(hisabId, session.userId());
            return ResponseEntity.ok(Map.of("success", true, "message", "You have exited the event. Refund will be processed.", "hisabId", hisab.getHisabId()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /**
     * Get participants list for a capacity event (host view).
     * GET /api/app/events/{eventId}/participants
     */
    @GetMapping("/events/{eventId}/participants")
    public ResponseEntity<?> getParticipants(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable int eventId) {

        AuthService.AuthSession session = validateAuth(authHeader);
        if (session == null) return unauthorized();

        try {
            List<ParticipantResponse> participants = participantService.getParticipants(eventId);
            EventResponse event = eventService.getEventWithStats(eventId);
            long spotsRemaining = event.capacity() != null ? Math.max(0, event.capacity() - participants.size()) : 0;
            return ResponseEntity.ok(Map.of(
                "success", true,
                "participants", participants,
                "activeCount", participants.size(),
                "capacity", event.capacity() != null ? event.capacity() : 0,
                "spotsRemaining", spotsRemaining
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /**
     * Guest views all capacity events they have joined.
     * GET /api/app/guest/events
     */
    @GetMapping("/guest/events")
    public ResponseEntity<?> getMyJoinedEvents(@RequestHeader("Authorization") String authHeader) {
        AuthService.AuthSession session = validateAuth(authHeader);
        if (session == null) return unauthorized();

        try {
            List<Hisab> hisabs = participantService.getMyJoinedEvents(session.userId());
            List<Map<String, Object>> result = hisabs.stream().map(h -> {
                Map<String, Object> m = new HashMap<>();
                m.put("hisabId", h.getHisabId());
                m.put("eventId", h.getEvent().getEventId());
                m.put("eventName", h.getEvent().getEventName());
                m.put("eventDate", h.getEvent().getEventDate().toString());
                m.put("eventType", h.getEvent().getEventType());
                m.put("eventStatus", h.getEvent().getStatus());
                m.put("confirmationType", h.getEvent().getConfirmationType() != null ? h.getEvent().getConfirmationType() : "");
                m.put("amount", h.getAmount());
                m.put("hisabStatus", h.getPaymentStatus());
                m.put("seatsBooked", h.getSeatsBooked());
                m.put("joinedAt", h.getCreatedAt() != null ? h.getCreatedAt().toString() : "");
                // Route segment names
                List<EventRouteStop> stops = h.getEvent().getRouteStops() != null
                    ? h.getEvent().getRouteStops().stream()
                        .sorted(Comparator.comparingInt(EventRouteStop::getStopOrder))
                        .toList()
                    : List.of();
                if (h.getFromStopOrder() != null && !stops.isEmpty()) {
                    m.put("fromStop", stops.get(h.getFromStopOrder()).getStopName());
                    m.put("toStop", stops.get(h.getToStopOrder()).getStopName());
                }
                return m;
            }).toList();
            return ResponseEntity.ok(Map.of("success", true, "events", result));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    // ==================== BROWSE EVENTS (Guest discovery) ====================

    /**
     * Browse active capacity events with optional filters: name, location, category.
     * GET /api/app/events/browse?name=&location=&category=
     */
    @GetMapping("/events/browse")
    public ResponseEntity<?> browseEvents(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) String category) {

        AuthService.AuthSession session = validateAuth(authHeader);
        if (session == null) return unauthorized();

        try {
            List<com.mysteriousmonkeys.chanlo.event.Event> events = eventService.browseEvents(
                (name != null && name.isBlank()) ? null : name,
                (location != null && location.isBlank()) ? null : location,
                (category != null && category.isBlank()) ? null : category
            );
            List<EventResponse> result = events.stream()
                .map(e -> eventService.getEventWithStats(e.getEventId()))
                .toList();
            return ResponseEntity.ok(Map.of("success", true, "events", result));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
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

    /**
     * Delete account (soft delete — recoverable within 30 days by logging back in)
     * DELETE /api/app/account
     */
    @DeleteMapping("/account")
    public ResponseEntity<?> deleteAccount(@RequestHeader("Authorization") String authHeader) {
        AuthService.AuthSession session = validateAuth(authHeader);
        if (session == null) return unauthorized();
        try {
            authService.deleteAccount(session.userId());
            return ResponseEntity.ok(Map.of("success", true, "message", "Account deleted"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
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
