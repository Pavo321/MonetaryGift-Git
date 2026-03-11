package com.mysteriousmonkeys.chanlo.money;

import com.mysteriousmonkeys.chanlo.event.Event;
import com.mysteriousmonkeys.chanlo.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SettlementRepository extends JpaRepository<Settlement, Integer> {
    List<Settlement> findByEvent(Event event);
    List<Settlement> findByEventAndHelper(Event event, User helper);

    @Query("SELECT COALESCE(SUM(s.amount), 0) FROM Settlement s WHERE s.event = :event AND s.helper = :helper")
    Long getTotalSettledByEventAndHelper(@Param("event") Event event, @Param("helper") User helper);

    @Query("SELECT COALESCE(SUM(s.amount), 0) FROM Settlement s WHERE s.event = :event")
    Long getTotalSettledByEvent(@Param("event") Event event);
}
