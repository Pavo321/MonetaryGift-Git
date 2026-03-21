package com.mysteriousmonkeys.chanlo.money;

import com.mysteriousmonkeys.chanlo.event.Event;
import com.mysteriousmonkeys.chanlo.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MoneyRepository extends JpaRepository<Hisab, Integer> {
    List<Hisab> findByEventOrderByHisabIdDesc(Event event);
    List<Hisab> findByGuest(User guest);
    List<Hisab> findByPaymentStatus(PaymentStatus status);
    List<Hisab> findByEventAndPaymentStatus(Event event, PaymentStatus status);
    List<Hisab> findByEventAndGuest(Event event, User guest);
    List<Hisab> findByCollectedBy(User collectedBy);
    List<Hisab> findByEventAndCollectedBy(Event event, User collectedBy);

    @Query("SELECT COALESCE(SUM(h.amount), 0) FROM Hisab h WHERE h.event = :event AND h.collectedBy = :helper AND h.paymentMethod = 'CASH' AND h.paymentStatus = 'SUCCESS'")
    Double getTotalCashCollectedByHelper(@Param("event") Event event, @Param("helper") User helper);

    @Query("SELECT COALESCE(SUM(h.amount), 0) FROM Hisab h WHERE h.event = :event AND h.collectedBy = :helper AND h.paymentMethod <> 'CASH' AND h.paymentStatus = 'SUCCESS'")
    Double getTotalUpiCollectedByHelper(@Param("event") Event event, @Param("helper") User helper);

    @Query("SELECT COALESCE(SUM(h.amount), 0) FROM Hisab h WHERE h.event = :event AND h.paymentStatus = 'SUCCESS'")
    Double getTotalAmountByEvent(@Param("event") Event event);

    @Query("SELECT COALESCE(SUM(h.amount), 0) FROM Hisab h WHERE h.event = :event AND h.paymentMethod = 'CASH' AND h.paymentStatus = 'SUCCESS'")
    Double getTotalCashByEvent(@Param("event") Event event);

    @Query("SELECT COALESCE(SUM(h.amount), 0) FROM Hisab h WHERE h.event = :event AND h.paymentMethod <> 'CASH' AND h.paymentStatus = 'SUCCESS'")
    Double getTotalUpiByEvent(@Param("event") Event event);

    @Query("SELECT h FROM Hisab h WHERE h.event.host = :host ORDER BY " +
           "CASE WHEN h.paymentStatus = 'SUCCESS' THEN 0 ELSE 1 END, " +
           "COALESCE(h.completedAt, h.createdAt) DESC")
    List<Hisab> findByHostOrderByStatusAndDate(@Param("host") User host);

    @Query("SELECT h FROM Hisab h WHERE h.event IN :events ORDER BY " +
           "CASE WHEN h.paymentStatus = 'SUCCESS' THEN 0 ELSE 1 END, " +
           "COALESCE(h.completedAt, h.createdAt) DESC")
    List<Hisab> findByEventsOrderByStatusAndDate(@Param("events") List<Event> events);

    boolean existsByEventAndGuestAndPaymentStatus(Event event, User guest, PaymentStatus status);

    @Query("SELECT h FROM Hisab h WHERE h.guest = :guest AND h.event.eventType = com.mysteriousmonkeys.chanlo.event.EventType.CAPACITY_EVENT ORDER BY h.createdAt DESC")
    List<Hisab> findCapacityEventsByGuest(@Param("guest") User guest);

    /**
     * Find all bookings for an event that overlap with the given stop-order range.
     * A booking overlaps [fromStop, toStop] if booking.fromStopOrder < toStop AND booking.toStopOrder > fromStop.
     * Only counts PENDING and SUCCESS bookings (not REFUNDED/FAILED).
     */
    @Query("""
        SELECT h FROM Hisab h
        WHERE h.event = :event
          AND h.paymentStatus IN ('PENDING', 'SUCCESS')
          AND h.fromStopOrder IS NOT NULL
          AND h.toStopOrder   IS NOT NULL
          AND h.fromStopOrder < :toStop
          AND h.toStopOrder   > :fromStop
        """)
    List<Hisab> findOverlappingBookings(
        @Param("event") Event event,
        @Param("fromStop") int fromStop,
        @Param("toStop") int toStop
    );
}
