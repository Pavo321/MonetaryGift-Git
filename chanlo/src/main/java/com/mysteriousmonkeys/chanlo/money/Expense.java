package com.mysteriousmonkeys.chanlo.money;

import com.mysteriousmonkeys.chanlo.event.Event;
import com.mysteriousmonkeys.chanlo.user.User;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.Objects;

@Entity
@Table(name = "expense")
@EntityListeners(AuditingEntityListener.class)
public class Expense {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "event_id", referencedColumnName = "eventId", nullable = false)
    private Event event;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "spent_by", referencedColumnName = "id", nullable = false)
    private User spentBy;

    @NotNull
    private String reason;

    @NotNull
    @Positive
    private Double amount;

    @CreatedDate
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public Expense() {}

    public Expense(Event event, User spentBy, String reason, Double amount) {
        this.event = event;
        this.spentBy = spentBy;
        this.reason = reason;
        this.amount = amount;
    }

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public Event getEvent() { return event; }
    public void setEvent(Event event) { this.event = event; }

    public User getSpentBy() { return spentBy; }
    public void setSpentBy(User spentBy) { this.spentBy = spentBy; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public Double getAmount() { return amount; }
    public void setAmount(Double amount) { this.amount = amount; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Expense expense = (Expense) o;
        return id == expense.id;
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
