package com.mysteriousmonkeys.chanlo.money;

import com.mysteriousmonkeys.chanlo.event.Event;
import com.mysteriousmonkeys.chanlo.user.User;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.time.LocalDateTime;
import java.util.Objects;

@Entity
@Table(name = "settlement")
public class Settlement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "event_id", referencedColumnName = "eventId", nullable = false)
    private Event event;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "helper_id", referencedColumnName = "id", nullable = false)
    private User helper;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "host_id", referencedColumnName = "id", nullable = false)
    private User host;

    @NotNull
    @Positive
    private Long amount;

    private String note;

    @Column(name = "settled_at")
    private LocalDateTime settledAt;

    public Settlement() {}

    public Settlement(Event event, User helper, User host, Long amount, String note) {
        this.event = event;
        this.helper = helper;
        this.host = host;
        this.amount = amount;
        this.note = note;
        this.settledAt = LocalDateTime.now();
    }

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public Event getEvent() { return event; }
    public void setEvent(Event event) { this.event = event; }

    public User getHelper() { return helper; }
    public void setHelper(User helper) { this.helper = helper; }

    public User getHost() { return host; }
    public void setHost(User host) { this.host = host; }

    public Long getAmount() { return amount; }
    public void setAmount(Long amount) { this.amount = amount; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public LocalDateTime getSettledAt() { return settledAt; }
    public void setSettledAt(LocalDateTime settledAt) { this.settledAt = settledAt; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Settlement that = (Settlement) o;
        return id == that.id;
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
