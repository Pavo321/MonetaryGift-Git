package com.mysteriousmonkeys.chanlo.service;

import com.mysteriousmonkeys.chanlo.dto.EventCreateRequest;
import com.mysteriousmonkeys.chanlo.dto.EventResponse;
import com.mysteriousmonkeys.chanlo.event.Event;
import com.mysteriousmonkeys.chanlo.event.EventRepository;
import com.mysteriousmonkeys.chanlo.event.EventStatus;
import com.mysteriousmonkeys.chanlo.exception.EventNotFoundException;
import com.mysteriousmonkeys.chanlo.exception.UserNotFoundException;
import com.mysteriousmonkeys.chanlo.money.MoneyRepository;
import com.mysteriousmonkeys.chanlo.money.PaymentStatus;
import com.mysteriousmonkeys.chanlo.user.User;
import com.mysteriousmonkeys.chanlo.user.UserRepository;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

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
    
    public Event createEvent(EventCreateRequest request) {
        log.info("Creating event: {}", request.eventName());
        
        var host = userRepository.findById(request.hostId())
            .orElseThrow(() -> new UserNotFoundException("Host not found"));
        
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
        
        Event savedEvent = eventRepository.save(event);
        
        // Generate QR code data after save (needs ID)
        savedEvent.setQrCodeData("EVENT_" + savedEvent.getEventId());
        eventRepository.save(savedEvent);
        
        return savedEvent;
    }
    
    public EventResponse getEventWithStats(int eventId) {
        Event event = eventRepository.findById(eventId)
            .orElseThrow(() -> new EventNotFoundException("Event not found"));
        
        Long totalAmount = moneyRepository.getTotalAmountByEvent(event);
        if (totalAmount == null) {
            totalAmount = 0L;
        }
        Long giftCount = (long) moneyRepository
            .findByEventAndPaymentStatus(event, PaymentStatus.SUCCESS)
            .size();
        
        return EventResponse.from(event, totalAmount, giftCount);
    }
    
    public List<Event> getEventsByHost(int hostId) {
        var host = userRepository.findById(hostId)
            .orElseThrow(() -> new UserNotFoundException("Host not found"));
        return eventRepository.findByHost(host);
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
        eventRepository.deleteById(eventId);
    }
    
    /**
     * Get events by host phone number (for WhatsApp)
     */
    public List<Event> getEventsByHostPhone(String phoneNumber) {
        User host = userRepository.findByPhoneNumber(phoneNumber)
            .orElseThrow(() -> new UserNotFoundException("Host not found with phone: " + phoneNumber));
        return eventRepository.findByHost(host);
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

