package com.mysteriousmonkeys.chanlo.dashboard;

import com.mysteriousmonkeys.chanlo.auth.MagicLink;
import com.mysteriousmonkeys.chanlo.auth.MagicLinkRepository;
import com.mysteriousmonkeys.chanlo.dto.HisabResponse;
import com.mysteriousmonkeys.chanlo.event.Event;
import com.mysteriousmonkeys.chanlo.event.EventRepository;
import com.mysteriousmonkeys.chanlo.money.Hisab;
import com.mysteriousmonkeys.chanlo.money.MoneyRepository;
import com.mysteriousmonkeys.chanlo.user.User;
import com.mysteriousmonkeys.chanlo.user.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Guest transaction history page - accessed via secure link from WhatsApp.
 * Uses magic link tokens for authentication (no password needed).
 */
@RestController
@RequestMapping("/api/guest")
public class GuestHistoryController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private MoneyRepository moneyRepository;

    @Autowired
    private EventRepository eventRepository;

    /**
     * Get guest's transaction history
     * GET /api/guest/history?token={magicLinkToken}
     * Optional: &eventId=5
     */
    @GetMapping("/history")
    public ResponseEntity<?> getHistory(
            @RequestParam String token,
            @RequestParam(required = false) Integer eventId) {

        // Validate token - find user by phone from token
        // For now, using phone-based token format: "GUEST_{phoneNumber}_{timestamp}"
        String phoneNumber = extractPhoneFromToken(token);
        if (phoneNumber == null) {
            return ResponseEntity.status(401).body(Map.of("success", false, "message", "Invalid token"));
        }

        User guest = userRepository.findByPhoneNumber(phoneNumber).orElse(null);
        if (guest == null) {
            return ResponseEntity.status(404).body(Map.of("success", false, "message", "User not found"));
        }

        // Get managed persons too
        List<User> managedPersons = userRepository.findByManagedBy(guest);
        List<Integer> allUserIds = new java.util.ArrayList<>();
        allUserIds.add(guest.getId());
        managedPersons.forEach(p -> allUserIds.add(p.getId()));

        List<Hisab> payments;
        if (eventId != null) {
            Event event = eventRepository.findById(eventId).orElse(null);
            if (event == null) {
                return ResponseEntity.status(404).body(Map.of("success", false, "message", "Event not found"));
            }
            payments = allUserIds.stream()
                .flatMap(uid -> {
                    User u = userRepository.findById(uid).orElse(null);
                    return u != null ? moneyRepository.findByEventAndGuest(event, u).stream() : java.util.stream.Stream.empty();
                })
                .toList();
        } else {
            payments = allUserIds.stream()
                .flatMap(uid -> {
                    User u = userRepository.findById(uid).orElse(null);
                    return u != null ? moneyRepository.findByGuest(u).stream() : java.util.stream.Stream.empty();
                })
                .toList();
        }

        List<HisabResponse> responses = payments.stream()
            .map(HisabResponse::from)
            .toList();

        // Get unique events for dropdown
        List<Map<String, Object>> events = payments.stream()
            .map(Hisab::getEvent)
            .distinct()
            .map(e -> Map.<String, Object>of(
                "eventId", e.getEventId(),
                "eventName", e.getEventName(),
                "eventDate", e.getEventDate().toString()
            ))
            .toList();

        // Get managed persons for switch user
        List<Map<String, Object>> persons = new java.util.ArrayList<>();
        persons.add(Map.of("id", guest.getId(), "name", guest.getName(), "isSelf", true));
        managedPersons.forEach(p -> persons.add(Map.of(
            "id", p.getId(), "name", p.getName(), "isSelf", false
        )));

        return ResponseEntity.ok(Map.of(
            "success", true,
            "guestName", guest.getName(),
            "payments", responses,
            "events", events,
            "persons", persons,
            "totalAmount", payments.stream()
                .filter(h -> h.getPaymentStatus() == com.mysteriousmonkeys.chanlo.money.PaymentStatus.SUCCESS)
                .mapToDouble(Hisab::getAmount)
                .sum()
        ));
    }

    /**
     * Generate a secure token for guest. Called from WhatsApp chatbot.
     */
    public static String generateGuestToken(String phoneNumber) {
        return "GUEST_" + phoneNumber + "_" + System.currentTimeMillis();
    }

    private String extractPhoneFromToken(String token) {
        if (token == null || !token.startsWith("GUEST_")) return null;
        String[] parts = token.split("_");
        if (parts.length < 3) return null;
        return parts[1];
    }
}
