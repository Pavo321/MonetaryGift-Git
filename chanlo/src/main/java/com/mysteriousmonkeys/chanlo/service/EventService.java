package com.mysteriousmonkeys.chanlo.service;

import com.mysteriousmonkeys.chanlo.dto.EventCreateRequest;
import com.mysteriousmonkeys.chanlo.dto.EventResponse;
import com.mysteriousmonkeys.chanlo.event.ConfirmationType;
import com.mysteriousmonkeys.chanlo.event.Event;
import com.mysteriousmonkeys.chanlo.event.EventHelperRepository;
import com.mysteriousmonkeys.chanlo.event.EventRepository;
import com.mysteriousmonkeys.chanlo.event.EventRouteStop;
import com.mysteriousmonkeys.chanlo.event.EventStatus;
import com.mysteriousmonkeys.chanlo.event.EventType;
import com.mysteriousmonkeys.chanlo.exception.EventNotFoundException;
import com.mysteriousmonkeys.chanlo.exception.UserNotFoundException;
import com.mysteriousmonkeys.chanlo.money.Hisab;
import com.mysteriousmonkeys.chanlo.money.MoneyRepository;
import com.mysteriousmonkeys.chanlo.money.PaymentStatus;
import com.mysteriousmonkeys.chanlo.money.SettlementRepository;
import com.mysteriousmonkeys.chanlo.user.User;
import com.mysteriousmonkeys.chanlo.user.UserRepository;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
public class EventService {
    
    private static final Logger log = LoggerFactory.getLogger(EventService.class);
    
    @Autowired
    private EventRepository eventRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private MoneyRepository moneyRepository;

    @Autowired
    private EventHelperRepository eventHelperRepository;

    @Autowired
    private SettlementRepository settlementRepository;

    @Autowired
    private WhatsAppApiService whatsAppApiService;


    @Value("${app.base.url:http://localhost:8080}")
    private String baseUrl;
    
    public Event createEvent(EventCreateRequest request) {
        log.info("Creating event: {}", request.eventName());

        // Validate date range
        java.time.LocalDate today = java.time.LocalDate.now();
        if (request.eventDate().isBefore(today)) {
            throw new RuntimeException("Event date cannot be in the past. Please select today or a future date.");
        }
        if (request.eventDate().isAfter(today.plusYears(5))) {
            throw new RuntimeException("Event date cannot be more than 5 years from today.");
        }

        var host = userRepository.findById(request.hostId())
            .orElseThrow(() -> new UserNotFoundException("Host not found"));

        // Check for duplicate event name on the same date for this host
        if (eventRepository.existsByHostAndEventNameAndEventDate(host, request.eventName(), request.eventDate())) {
            throw new RuntimeException("You already have an event named \"" + request.eventName() + "\" on " + request.eventDate() + ". Please choose a different name or date.");
        }

        EventType eventType = request.eventType() != null ? request.eventType() : EventType.GIFT_COLLECTION;

        if (eventType == EventType.CAPACITY_EVENT) {
            if (request.capacity() == null || request.capacity() < 1) {
                throw new RuntimeException("capacity is required and must be >= 1 for capacity events.");
            }
            if (request.pricePerPerson() == null || request.pricePerPerson() < 1) {
                throw new RuntimeException("pricePerPerson is required for capacity events.");
            }
            if (request.confirmationType() == null) {
                throw new RuntimeException("confirmationType (AUTO or MANUAL) is required for capacity events.");
            }
        }

        Event event = new Event();
        event.setEventName(request.eventName());
        event.setEventDate(request.eventDate());
        event.setHost(host);
        event.setHostUpiId(request.hostUpiId());
        event.setThankYouMessage(
            request.thankYouMessage() != null ? 
            request.thankYouMessage() : 
            "Thank you for blessing our wedding!"
        );
        event.setStatus(EventStatus.ACTIVE);
        event.setEventType(eventType);

        if (eventType == EventType.CAPACITY_EVENT) {
            event.setConfirmationType(request.confirmationType());
            event.setCapacity(request.capacity());
            event.setPricePerPerson(request.pricePerPerson());
        }

        if (request.location() != null) event.setLocation(request.location());
        if (request.category() != null) event.setCategory(request.category());
        if (request.eventTime() != null) event.setEventTime(request.eventTime());
        if (Boolean.TRUE.equals(request.isPublic())) {
            event.setPublic(true);
            if (request.lat() != null) event.setLat(request.lat());
            if (request.lng() != null) event.setLng(request.lng());
        }

        Event savedEvent = eventRepository.save(event);

        // Generate QR code data after save (needs ID)
        savedEvent.setQrCodeData("EVENT_" + savedEvent.getEventId());

        // Set QR code image URL pointing to the endpoint that serves the QR code
        String qrCodeImageUrl = baseUrl + "/chanla/events/" + savedEvent.getEventId() + "/qr";
        savedEvent.setQrCodeImageUrl(qrCodeImageUrl);

        // Save route stops if provided (for TRAVEL events with GPS coords)
        if (request.routeStops() != null && request.routeStops().size() >= 2) {
            List<EventRouteStop> stops = new java.util.ArrayList<>();
            for (int i = 0; i < request.routeStops().size(); i++) {
                com.mysteriousmonkeys.chanlo.dto.RouteStopInput input = request.routeStops().get(i);
                stops.add(new EventRouteStop(savedEvent, input.name().trim(), i, input.lat(), input.lng(), input.distanceToNextKm()));
            }
            savedEvent.setRouteStops(stops);
        }
        if (request.totalDistanceKm() != null) {
            savedEvent.setTotalDistanceKm(request.totalDistanceKm());
        }

        eventRepository.save(savedEvent);
        
        log.info("Event created with QR code URL: {}", qrCodeImageUrl);
        
        return savedEvent;
    }
    
    public EventResponse getEventWithStats(int eventId) {
        Event event = eventRepository.findById(eventId)
            .orElseThrow(() -> new EventNotFoundException("Event not found"));
        
        // Ensure QR code image URL is set (for existing events that might not have it)
        if (event.getQrCodeImageUrl() == null || event.getQrCodeImageUrl().isEmpty()) {
            String qrCodeImageUrl = baseUrl + "/chanla/events/" + event.getEventId() + "/qr";
            event.setQrCodeImageUrl(qrCodeImageUrl);
            eventRepository.save(event);
        }
        
        Double totalAmount = moneyRepository.getTotalAmountByEvent(event);
        if (totalAmount == null) totalAmount = 0.0;
        Double cashAmount = moneyRepository.getTotalCashByEvent(event);
        if (cashAmount == null) cashAmount = 0.0;
        Double upiAmount = moneyRepository.getTotalUpiByEvent(event);
        if (upiAmount == null) upiAmount = 0.0;
        List<Hisab> successHisabs = moneyRepository.findByEventAndPaymentStatus(event, PaymentStatus.SUCCESS);
        Long giftCount = (long) successHisabs.size();
        Long activeParticipants = event.isCapacityBased() ? giftCount : 0L;

        return EventResponse.from(event, totalAmount, giftCount, activeParticipants, cashAmount, upiAmount);
    }
    
    public List<Event> getEventsByHost(int hostId) {
        var host = userRepository.findById(hostId)
            .orElseThrow(() -> new UserNotFoundException("Host not found"));
        return eventRepository.findByHostAndDeletedAtIsNullOrderByEventIdDesc(host);
    }

    public List<Event> getDeletedEventsByHost(int hostId) {
        var host = userRepository.findById(hostId)
            .orElseThrow(() -> new UserNotFoundException("Host not found"));
        return eventRepository.findByHostAndDeletedAtIsNotNullOrderByDeletedAtDesc(host);
    }

    public Event findByQrCode(String qrCodeData) {
        return eventRepository.findByQrCodeData(qrCodeData)
            .orElseThrow(() -> new EventNotFoundException("Event not found for QR: " + qrCodeData));
    }
    
    public List<Event> getAllEvents() {
        return eventRepository.findAll();
    }
    
    public Event updateEvent(int eventId, EventCreateRequest request) {
        Event event = eventRepository.findById(eventId)
            .orElseThrow(() -> new EventNotFoundException("Event not found"));
        
        event.setEventName(request.eventName());
        event.setEventDate(request.eventDate());
        
        if (request.hostUpiId() != null) {
            event.setHostUpiId(request.hostUpiId());
        }
        
        if (request.thankYouMessage() != null) {
            event.setThankYouMessage(request.thankYouMessage());
        }
        
        return eventRepository.save(event);
    }
    
    public void deleteEvent(int eventId) {
        Event event = eventRepository.findById(eventId)
            .orElseThrow(() -> new EventNotFoundException("Event not found"));

        // Check all helpers are settled before allowing delete
        var helpers = eventHelperRepository.findByEventAndIsActiveTrue(event);
        List<String> unsettled = new java.util.ArrayList<>();
        for (var eh : helpers) {
            var helper = eh.getHelper();
            Double cash = moneyRepository.getTotalCashCollectedByHelper(event, helper);
            Double settled = settlementRepository.getTotalSettledByEventAndHelper(event, helper);
            if (cash - settled > 0.01) {
                unsettled.add(helper.getName() + " (Rs. " + String.format("%.2f", cash - settled) + " pending)");
            }
        }
        if (!unsettled.isEmpty()) {
            throw new RuntimeException("Cannot delete event. Settle with helpers first: " + String.join(", ", unsettled));
        }

        event.setDeletedAt(java.time.LocalDateTime.now());
        eventRepository.save(event);
    }

    public void restoreEvent(int eventId, int hostId) {
        Event event = eventRepository.findById(eventId)
            .orElseThrow(() -> new EventNotFoundException("Event not found"));
        if (event.getHost().getId() != hostId) throw new RuntimeException("Access denied");
        if (event.getDeletedAt() == null) throw new RuntimeException("Event is not deleted");
        long daysSince = java.time.temporal.ChronoUnit.DAYS.between(event.getDeletedAt(), java.time.LocalDateTime.now());
        if (daysSince > 30) throw new RuntimeException("Event cannot be restored after 30 days");
        event.setDeletedAt(null);
        eventRepository.save(event);
    }
    
    /**
     * Host manually confirms a MANUAL capacity event. Notifies all active participants.
     */
    public Event confirmEvent(int eventId, int hostId) {
        Event event = eventRepository.findById(eventId)
            .orElseThrow(() -> new EventNotFoundException("Event not found"));
        if (event.getHost().getId() != hostId) throw new RuntimeException("Access denied");
        if (event.getEventType() != EventType.CAPACITY_EVENT) throw new RuntimeException("Only capacity events can be confirmed.");
        if (event.getConfirmationType() != ConfirmationType.MANUAL) throw new RuntimeException("AUTO events confirm themselves when full.");
        if (event.getStatus() != EventStatus.ACTIVE) throw new RuntimeException("Event is not in ACTIVE state.");

        event.setStatus(EventStatus.CONFIRMED);
        Event saved = eventRepository.save(event);

        List<Hisab> participants = moneyRepository.findByEventAndPaymentStatus(event, PaymentStatus.SUCCESS);
        for (Hisab h : participants) {
            if (h.getGuest() != null && h.getGuest().getPhoneNumber() != null) {
                String msg = "🎉 *" + event.getEventName() + "* on " + event.getEventDate() + " is CONFIRMED!\nYour seat is reserved. See you there!";
                whatsAppApiService.sendTextMessage(h.getGuest().getPhoneNumber(), msg);
            }
        }
        log.info("Event {} confirmed by host {}", eventId, hostId);
        return saved;
    }

    /**
     * Host cancels a capacity event. All active participants are refunded and notified.
     */
    public int cancelEvent(int eventId, int hostId) {
        Event event = eventRepository.findById(eventId)
            .orElseThrow(() -> new EventNotFoundException("Event not found"));
        if (event.getHost().getId() != hostId) throw new RuntimeException("Access denied");
        if (event.getEventType() != EventType.CAPACITY_EVENT) throw new RuntimeException("Only capacity events can be cancelled via this flow.");
        if (event.getStatus() == EventStatus.CANCELLED) throw new RuntimeException("Event is already cancelled.");

        List<Hisab> successPayments = moneyRepository.findByEventAndPaymentStatus(event, PaymentStatus.SUCCESS);
        int refundCount = 0;
        for (Hisab h : successPayments) {
            h.setPaymentStatus(PaymentStatus.REFUNDED);
            h.setCompletedAt(LocalDateTime.now());
            moneyRepository.save(h);
            refundCount++;
            if (h.getGuest() != null && h.getGuest().getPhoneNumber() != null) {
                String msg = "❌ *" + event.getEventName() + "* on " + event.getEventDate() + " has been cancelled.\nYour refund of Rs." + h.getAmount() + " will be processed shortly. Sorry for the inconvenience.";
                whatsAppApiService.sendTextMessage(h.getGuest().getPhoneNumber(), msg);
            }
        }
        event.setStatus(EventStatus.CANCELLED);
        eventRepository.save(event);
        log.info("Event {} cancelled. {} participants refunded.", eventId, refundCount);
        return refundCount;
    }

    /**
     * Browse active CAPACITY_EVENT events with optional name/location/category filters.
     */
    public List<Event> browseEvents(String name, String location, String category) {
        return eventRepository.browseEvents(name, location, category);
    }

    /**
     * Get events by host phone number (for WhatsApp)
     */
    public List<Event> getEventsByHostPhone(String phoneNumber) {
        User host = userRepository.findByPhoneNumber(phoneNumber)
            .orElseThrow(() -> new UserNotFoundException("Host not found with phone: " + phoneNumber));
        return eventRepository.findByHostOrderByEventIdDesc(host);
    }
    
    /**
     * Get event by ID and verify host owns it (for WhatsApp authorization)
     */
    public Event getEventByHostPhone(int eventId, String hostPhoneNumber) {
        Event event = eventRepository.findById(eventId)
            .orElseThrow(() -> new EventNotFoundException("Event not found"));
        
        User host = userRepository.findByPhoneNumber(hostPhoneNumber)
            .orElseThrow(() -> new UserNotFoundException("Host not found"));
        
        if (event.getHost().getId() != host.getId()) {
            throw new EventNotFoundException("Event not found or access denied");
        }
        
        return event;
    }
}

