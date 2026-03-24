package com.mysteriousmonkeys.chanlo.service;

import com.mysteriousmonkeys.chanlo.dto.DashboardPaymentResponse;
import com.mysteriousmonkeys.chanlo.dto.DashboardResponse;
import com.mysteriousmonkeys.chanlo.event.Event;
import com.mysteriousmonkeys.chanlo.event.EventRepository;
import com.mysteriousmonkeys.chanlo.money.Hisab;
import com.mysteriousmonkeys.chanlo.money.MoneyRepository;
import com.mysteriousmonkeys.chanlo.user.User;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class DashboardService {

    private final MoneyRepository moneyRepository;
    private final EventRepository eventRepository;
    private final MagicLinkService magicLinkService;

    public DashboardService(MoneyRepository moneyRepository,
                           EventRepository eventRepository,
                           MagicLinkService magicLinkService) {
        this.moneyRepository = moneyRepository;
        this.eventRepository = eventRepository;
        this.magicLinkService = magicLinkService;
    }

    public DashboardResponse getDashboardByToken(String token) {
        User host = magicLinkService.validateToken(token)
            .orElseThrow(() -> new InvalidTokenException("Invalid or expired token"));

        return getDashboardForHost(host);
    }

    public DashboardResponse getDashboardForHost(User host) {
        List<Event> hostEvents = eventRepository.findByHostAndDeletedAtIsNullOrderByEventIdDesc(host);

        if (hostEvents.isEmpty()) {
            return DashboardResponse.create(host.getName(), List.of());
        }

        List<Hisab> payments = moneyRepository.findByEventsOrderByStatusAndDate(hostEvents);

        List<DashboardPaymentResponse> paymentResponses = payments.stream()
            .map(DashboardPaymentResponse::from)
            .toList();

        return DashboardResponse.create(host.getName(), paymentResponses);
    }

    public static class InvalidTokenException extends RuntimeException {
        public InvalidTokenException(String message) {
            super(message);
        }
    }
}
