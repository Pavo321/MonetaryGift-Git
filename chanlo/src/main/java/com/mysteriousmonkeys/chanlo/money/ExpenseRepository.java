package com.mysteriousmonkeys.chanlo.money;

import com.mysteriousmonkeys.chanlo.event.Event;
import com.mysteriousmonkeys.chanlo.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExpenseRepository extends JpaRepository<Expense, Integer> {
    List<Expense> findByEvent(Event event);
    List<Expense> findBySpentBy(User spentBy);
    List<Expense> findByEventAndSpentBy(Event event, User spentBy);

    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM Expense e WHERE e.event = :event AND e.spentBy = :helper")
    Long getTotalExpenseByEventAndHelper(@Param("event") Event event, @Param("helper") User helper);

    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM Expense e WHERE e.event = :event")
    Long getTotalExpenseByEvent(@Param("event") Event event);
}
