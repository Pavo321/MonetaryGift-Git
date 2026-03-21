package com.mysteriousmonkeys.chanlo.service;

import com.mysteriousmonkeys.chanlo.dto.ParticipantResponse;
import com.mysteriousmonkeys.chanlo.dto.UpiPaymentLinkResponse;
import com.mysteriousmonkeys.chanlo.event.ConfirmationType;
import com.mysteriousmonkeys.chanlo.event.Event;
import com.mysteriousmonkeys.chanlo.event.EventRepository;
import com.mysteriousmonkeys.chanlo.event.EventRouteStop;
import com.mysteriousmonkeys.chanlo.event.EventStatus;
import com.mysteriousmonkeys.chanlo.event.EventType;
import com.mysteriousmonkeys.chanlo.exception.EventNotFoundException;
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
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class ParticipantService {

    private static final Logger log = LoggerFactory.getLogger(ParticipantService.class);

    @Autowired
    private EventRepository eventRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private MoneyRepository moneyRepository;

    @Autowired
    private UpiDeepLinkService upiDeepLinkService;

    @Autowired
    private WhatsAppApiService whatsAppApiService;

    /**
     * Calculate available seats for a segment [fromStopOrder, toStopOrder).
     * Uses the interval overlap algorithm:
     *   For each stop k in [fromStop .. toStop-1], count occupied = sum of seatsBooked
     *   for bookings that overlap interval [k, k+1].
     *   available = capacity - max(occupied[k])
     */
    public int getAvailableSeats(Event event, int fromStopOrder, int toStopOrder) {
        List<Hisab> overlapping = moneyRepository.findOverlappingBookings(event, fromStopOrder, toStopOrder);
        int maxOccupied = 0;
        for (int k = fromStopOrder; k < toStopOrder; k++) {
            final int interval = k;
            int occupied = overlapping.stream()
                .filter(h -> h.getFromStopOrder() <= interval && h.getToStopOrder() > interval)
                .mapToInt(Hisab::getSeatsBooked)
                .sum();
            if (occupied > maxOccupied) maxOccupied = occupied;
        }
        return event.getCapacity() - maxOccupied;
    }

    /**
     * Guest joins a capacity event. Creates a PENDING Hisab and returns UPI deep links.
     * For route-based events, fromStopOrder and toStopOrder must be provided.
     */
    public UpiPaymentLinkResponse joinEvent(int eventId, int guestId,
                                            Integer fromStopOrder, Integer toStopOrder, int seatsBooked) {
        Event event = eventRepository.findById(eventId)
            .orElseThrow(() -> new EventNotFoundException("Event not found"));

        if (event.getEventType() != EventType.CAPACITY_EVENT) {
            throw new RuntimeException("This event does not accept seat bookings.");
        }
        if (event.getStatus() != EventStatus.ACTIVE) {
            throw new RuntimeException("This event is not accepting new participants.");
        }
        if (seatsBooked < 1) {
            throw new RuntimeException("You must book at least 1 seat.");
        }

        User guest = userRepository.findById(guestId)
            .orElseThrow(() -> new UserNotFoundException("User not found"));

        // Check if already joined (SUCCESS booking for same event)
        if (moneyRepository.existsByEventAndGuestAndPaymentStatus(event, guest, PaymentStatus.SUCCESS)) {
            throw new RuntimeException("You have already joined this event.");
        }

        String routeInfo = "";
        if (event.isRouteBased()) {
            // Validate stop indices
            if (fromStopOrder == null || toStopOrder == null) {
                throw new RuntimeException("Please select your boarding and drop-off stops.");
            }
            int stopCount = event.getRouteStops().size();
            if (fromStopOrder < 0 || toStopOrder > stopCount - 1 || fromStopOrder >= toStopOrder) {
                throw new RuntimeException("Invalid stop selection.");
            }

            int available = getAvailableSeats(event, fromStopOrder, toStopOrder);
            if (seatsBooked > available) {
                throw new RuntimeException("Only " + available + " seat(s) available for this segment.");
            }

            // Build route info string for WhatsApp
            List<EventRouteStop> stops = event.getRouteStops().stream()
                .sorted(Comparator.comparingInt(EventRouteStop::getStopOrder))
                .collect(Collectors.toList());
            String from = stops.get(fromStopOrder).getStopName();
            String to   = stops.get(toStopOrder).getStopName();
            routeInfo = "\nRoute: " + from + " → " + to + "\nSeats: " + seatsBooked;
        } else {
            // Standard capacity check
            long activeCount = moneyRepository.findByEventAndPaymentStatus(event, PaymentStatus.SUCCESS)
                .stream().mapToLong(h -> h.getSeatsBooked()).sum();
            if (activeCount + seatsBooked > event.getCapacity()) {
                throw new RuntimeException("Not enough seats available. Only " + (event.getCapacity() - activeCount) + " left.");
            }
        }

        // For route-based TRAVEL events: price is proportional to segment distance vs total route distance
        double totalAmount;
        if (event.isRouteBased() && fromStopOrder != null && toStopOrder != null
                && event.getTotalDistanceKm() != null && event.getTotalDistanceKm() > 0) {
            List<EventRouteStop> orderedStops = event.getRouteStops().stream()
                .sorted(Comparator.comparingInt(EventRouteStop::getStopOrder))
                .collect(Collectors.toList());
            float segmentKm = 0f;
            for (int k = fromStopOrder; k < toStopOrder; k++) {
                Float d = orderedStops.get(k).getDistanceToNextKm();
                if (d != null) segmentKm += d;
            }
            float pricePerKm = event.getPricePerPerson() / (float) event.getTotalDistanceKm();
            totalAmount = Math.round(pricePerKm * segmentKm * seatsBooked);
            if (totalAmount < 1) totalAmount = 1;
        } else {
            totalAmount = (double) event.getPricePerPerson() * seatsBooked;
        }

        // Create PENDING Hisab
        Hisab hisab = new Hisab();
        hisab.setEvent(event);
        hisab.setGuest(guest);
        hisab.setAmount((double) totalAmount);
        hisab.setPaymentMethod(PaymentMethod.UPI_DEEP_LINK);
        hisab.setPaymentStatus(PaymentStatus.PENDING);
        hisab.setSeatsBooked(seatsBooked);
        if (event.isRouteBased()) {
            hisab.setFromStopOrder(fromStopOrder);
            hisab.setToStopOrder(toStopOrder);
        }
        hisab = moneyRepository.save(hisab);

        // Generate UPI deep links
        UpiDeepLinkService.UpiPaymentLinks links = upiDeepLinkService.generateAllPaymentLinks(
            event.getHostUpiId(),
            event.getHost().getName(),
            totalAmount,
            seatsBooked + " seat(s) for " + event.getEventName() + " by " + guest.getName()
        );

        log.info("Guest {} joined event {}. Hisab: {}, seats: {}", guestId, eventId, hisab.getHisabId(), seatsBooked);

        return UpiPaymentLinkResponse.success(
            hisab.getHisabId(),
            event.getEventName(),
            event.getHost().getName(),
            totalAmount,
            links.genericUpi(),
            links.googlePay(),
            links.phonePe(),
            links.paytm(),
            links.bhim()
        );
    }

    /**
     * Guest self-reports payment after completing UPI. Confirms their seat.
     * For AUTO events: when capacity is filled, auto-confirms and notifies all.
     */
    public Hisab confirmPayment(int hisabId, int guestId, String transactionId) {
        Hisab hisab = moneyRepository.findById(hisabId)
            .orElseThrow(() -> new RuntimeException("Payment record not found"));

        if (hisab.getGuest().getId() != guestId) {
            throw new RuntimeException("Access denied");
        }
        if (hisab.getPaymentStatus() != PaymentStatus.PENDING) {
            throw new RuntimeException("Payment is not in pending state.");
        }

        Event event = hisab.getEvent();
        if (event.getStatus() != EventStatus.ACTIVE) {
            throw new RuntimeException("Event is no longer accepting payments.");
        }

        // Mark payment success
        hisab.setPaymentStatus(PaymentStatus.SUCCESS);
        hisab.setGatewayTransactionId(transactionId);
        hisab.setCompletedAt(LocalDateTime.now());
        moneyRepository.save(hisab);

        // Build route info for WhatsApp message
        String routeInfo = "";
        if (event.isRouteBased() && hisab.getFromStopOrder() != null) {
            List<EventRouteStop> stops = event.getRouteStops().stream()
                .sorted(Comparator.comparingInt(EventRouteStop::getStopOrder))
                .collect(Collectors.toList());
            String from = stops.get(hisab.getFromStopOrder()).getStopName();
            String to   = stops.get(hisab.getToStopOrder()).getStopName();
            routeInfo = "\nRoute: " + from + " → " + to + "\nSeats: " + hisab.getSeatsBooked();
        }

        // Send individual confirmation to guest
        if (hisab.getGuest().getPhoneNumber() != null) {
            String msg = "✅ Seat confirmed for *" + event.getEventName() + "* on " + event.getEventDate() +
                         "!" + routeInfo +
                         "\nAmount: Rs." + hisab.getAmount() +
                         "\nTxnID: " + transactionId;
            whatsAppApiService.sendTextMessage(hisab.getGuest().getPhoneNumber(), msg);
        }

        // Check if event should auto-confirm (AUTO mode + all seats filled)
        if (event.getConfirmationType() == ConfirmationType.AUTO) {
            long totalSeatsBooked = moneyRepository.findByEventAndPaymentStatus(event, PaymentStatus.SUCCESS)
                .stream().mapToLong(h -> h.getSeatsBooked()).sum();
            if (totalSeatsBooked >= event.getCapacity()) {
                event.setStatus(EventStatus.CONFIRMED);
                eventRepository.save(event);

                List<Hisab> allParticipants = moneyRepository.findByEventAndPaymentStatus(event, PaymentStatus.SUCCESS);
                for (Hisab p : allParticipants) {
                    if (p.getGuest() != null && p.getGuest().getPhoneNumber() != null) {
                        String msg = "🎉 All seats filled! *" + event.getEventName() + "* on " + event.getEventDate() + " is CONFIRMED!\nSee you there!";
                        whatsAppApiService.sendTextMessage(p.getGuest().getPhoneNumber(), msg);
                    }
                }
                log.info("Event {} auto-confirmed. All {} seats filled.", event.getEventId(), event.getCapacity());
            }
        }

        return hisab;
    }

    /**
     * Guest exits an event. Their payment is marked REFUNDED and they are notified.
     */
    public Hisab exitEvent(int hisabId, int guestId) {
        Hisab hisab = moneyRepository.findById(hisabId)
            .orElseThrow(() -> new RuntimeException("Payment record not found"));

        if (hisab.getGuest().getId() != guestId) {
            throw new RuntimeException("Access denied");
        }
        if (hisab.getPaymentStatus() != PaymentStatus.SUCCESS) {
            throw new RuntimeException("You do not have an active seat to exit.");
        }

        EventStatus eventStatus = hisab.getEvent().getStatus();
        if (eventStatus == EventStatus.CANCELLED || eventStatus == EventStatus.COMPLETED) {
            throw new RuntimeException("Cannot exit a " + eventStatus.name().toLowerCase() + " event.");
        }

        hisab.setPaymentStatus(PaymentStatus.REFUNDED);
        hisab.setCompletedAt(LocalDateTime.now());
        moneyRepository.save(hisab);

        if (hisab.getGuest().getPhoneNumber() != null) {
            String msg = "You have exited *" + hisab.getEvent().getEventName() + "*.\nRefund of Rs." + hisab.getAmount() + " will be processed shortly.";
            whatsAppApiService.sendTextMessage(hisab.getGuest().getPhoneNumber(), msg);
        }

        log.info("Guest {} exited event {}. Hisab {} refunded.", guestId, hisab.getEvent().getEventId(), hisabId);
        return hisab;
    }

    /**
     * Returns all active participants (SUCCESS hisabs) for a capacity event.
     */
    public List<ParticipantResponse> getParticipants(int eventId) {
        Event event = eventRepository.findById(eventId)
            .orElseThrow(() -> new EventNotFoundException("Event not found"));

        List<EventRouteStop> stops = event.getRouteStops().stream()
            .sorted(Comparator.comparingInt(EventRouteStop::getStopOrder))
            .collect(Collectors.toList());

        return moneyRepository.findByEventAndPaymentStatus(event, PaymentStatus.SUCCESS)
            .stream()
            .map(h -> {
                String fromStop = (h.getFromStopOrder() != null && !stops.isEmpty())
                    ? stops.get(h.getFromStopOrder()).getStopName() : null;
                String toStop = (h.getToStopOrder() != null && !stops.isEmpty())
                    ? stops.get(h.getToStopOrder()).getStopName() : null;
                return new ParticipantResponse(
                    h.getHisabId(),
                    h.getGuest() != null ? h.getGuest().getId() : 0,
                    h.getGuest() != null ? h.getGuest().getName() : "Unknown",
                    h.getGuest() != null ? h.getGuest().getPhoneNumber() : "",
                    h.getAmount(),
                    h.getPaymentStatus(),
                    h.getCreatedAt(),
                    fromStop,
                    toStop,
                    h.getSeatsBooked()
                );
            })
            .collect(Collectors.toList());
    }

    /**
     * Returns all capacity events a guest has joined (any hisab status).
     */
    public List<Hisab> getMyJoinedEvents(int guestId) {
        User guest = userRepository.findById(guestId)
            .orElseThrow(() -> new UserNotFoundException("User not found"));
        return moneyRepository.findCapacityEventsByGuest(guest);
    }
}
