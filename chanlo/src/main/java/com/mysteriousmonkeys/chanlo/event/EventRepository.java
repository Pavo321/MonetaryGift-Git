package com.mysteriousmonkeys.chanlo.event;

import com.mysteriousmonkeys.chanlo.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface EventRepository extends JpaRepository<Event, Integer> {
    List<Event> findByHostOrderByEventIdDesc(User host);
    List<Event> findByStatus(EventStatus status);
    Optional<Event> findByQrCodeData(String qrCodeData);
    List<Event> findByEventDateBetween(LocalDate start, LocalDate end);
    boolean existsByHostAndEventNameAndEventDate(User host, String eventName, LocalDate eventDate);

    @Query("""
        SELECT e FROM Event e
        WHERE e.eventType = 'CAPACITY_EVENT'
          AND e.status = 'ACTIVE'
          AND (:name     IS NULL OR LOWER(e.eventName) LIKE LOWER(CONCAT('%', :name, '%')))
          AND (:location IS NULL OR LOWER(e.location)  LIKE LOWER(CONCAT('%', :location, '%'))
               OR EXISTS (
                 SELECT 1 FROM EventRouteStop rs
                 WHERE rs.event = e
                 AND LOWER(rs.stopName) LIKE LOWER(CONCAT('%', :location, '%'))
               ))
          AND (:category IS NULL OR e.category = :category)
        ORDER BY e.eventDate ASC
    """)
    List<Event> browseEvents(
        @Param("name") String name,
        @Param("location") String location,
        @Param("category") String category
    );
}
