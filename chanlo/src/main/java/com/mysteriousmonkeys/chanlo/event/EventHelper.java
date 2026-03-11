package com.mysteriousmonkeys.chanlo.event;

import com.mysteriousmonkeys.chanlo.user.User;
import jakarta.persistence.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.Objects;

@Entity
@Table(name = "event_helper", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"event_id", "helper_id"})
})
@EntityListeners(AuditingEntityListener.class)
public class EventHelper {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "event_id", referencedColumnName = "eventId", nullable = false)
    private Event event;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "helper_id", referencedColumnName = "id", nullable = false)
    private User helper;

    @Column(name = "can_expense")
    private boolean canExpense = false;

    @Column(name = "is_active")
    private boolean isActive = true;

    @CreatedDate
    @Column(name = "added_at")
    private LocalDateTime addedAt;

    public EventHelper() {}

    public EventHelper(Event event, User helper) {
        this.event = event;
        this.helper = helper;
    }

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public Event getEvent() { return event; }
    public void setEvent(Event event) { this.event = event; }

    public User getHelper() { return helper; }
    public void setHelper(User helper) { this.helper = helper; }

    public boolean isCanExpense() { return canExpense; }
    public void setCanExpense(boolean canExpense) { this.canExpense = canExpense; }

    public boolean isActive() { return isActive; }
    public void setActive(boolean active) { isActive = active; }

    public LocalDateTime getAddedAt() { return addedAt; }
    public void setAddedAt(LocalDateTime addedAt) { this.addedAt = addedAt; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        EventHelper that = (EventHelper) o;
        return id == that.id;
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
