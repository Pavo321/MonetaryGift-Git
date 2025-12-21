package com.mysteriousmonkeys.chanlo.money;

import com.mysteriousmonkeys.chanlo.event.Event;
import com.mysteriousmonkeys.chanlo.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MoneyRepository extends JpaRepository<Hisab, Integer> {
    List<Hisab> findByEvent(Event event);
    List<Hisab> findByGuest(User guest);
    List<Hisab> findByPaymentStatus(PaymentStatus status);
    List<Hisab> findByEventAndPaymentStatus(Event event, PaymentStatus status);
    
    @Query("SELECT SUM(h.amount) FROM Hisab h WHERE h.event = :event AND h.paymentStatus = 'SUCCESS'")
    Long getTotalAmountByEvent(@Param("event") Event event);
}
