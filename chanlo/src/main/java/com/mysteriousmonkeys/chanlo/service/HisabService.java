package com.mysteriousmonkeys.chanlo.service;

import com.mysteriousmonkeys.chanlo.dto.HisabCreateRequest;
import com.mysteriousmonkeys.chanlo.dto.HisabResponse;
import com.mysteriousmonkeys.chanlo.event.Event;
import com.mysteriousmonkeys.chanlo.event.EventRepository;
import com.mysteriousmonkeys.chanlo.exception.EventNotFoundException;
import com.mysteriousmonkeys.chanlo.exception.HisabNotFoundException;
import com.mysteriousmonkeys.chanlo.exception.UserNotFoundException;
import com.mysteriousmonkeys.chanlo.money.Hisab;
import com.mysteriousmonkeys.chanlo.money.MoneyRepository;
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
        
        return moneyRepository.findByEvent(event)
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
     * Returns limited data: name, amount, village, status only
     */
    public List<com.mysteriousmonkeys.chanlo.dto.WhatsAppPaymentSummary> getPaymentsForEvent(int eventId) {
        Event event = eventRepository.findById(eventId)
            .orElseThrow(() -> new EventNotFoundException("Event not found"));
        
        return moneyRepository.findByEvent(event)
            .stream()
            .map(hisab -> com.mysteriousmonkeys.chanlo.dto.WhatsAppPaymentSummary.from(
                hisab.getGuest().getName(),
                hisab.getAmount(),
                hisab.getGuest().getVillage(),
                hisab.getPaymentStatus().toString()
            ))
            .toList();
    }
}

