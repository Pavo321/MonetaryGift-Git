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
}
