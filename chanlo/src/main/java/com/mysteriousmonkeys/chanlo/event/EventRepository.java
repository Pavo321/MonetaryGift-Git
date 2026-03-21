package com.mysteriousmonkeys.chanlo.event;

import com.mysteriousmonkeys.chanlo.user.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface EventRepository extends JpaRepository<Event, Integer> {
    List<Event> findByHostOrderByEventIdDesc(User host);
    List<Event> findByStatus(EventStatus status);
    Optional<Event> findByQrCodeData(String qrCodeData);
    List<Event> findByEventDateBetween(LocalDate start, LocalDate end);
    boolean existsByHostAndEventNameAndEventDate(User host, String eventName, LocalDate eventDate);
}
