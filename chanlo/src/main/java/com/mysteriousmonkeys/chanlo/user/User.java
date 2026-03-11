package com.mysteriousmonkeys.chanlo.user;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.Objects;

@Entity
@EntityListeners(AuditingEntityListener.class)
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    @NotNull
    private String name;

    private String village;

    @Column(unique = true, nullable = false)
    @Pattern(regexp = "^\\d{10}$")
    private String phoneNumber;

    private String email;

    private String pincode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "managed_by", referencedColumnName = "id")
    private User managedBy;

    @Enumerated(EnumType.STRING)
    private UserRole role = UserRole.GUEST;

    @CreatedDate
    private LocalDateTime createdAt;

    public User() {}  // JPA requires a no-arg constructor

    public User(int id, String name, String village) {
        this.id = id;
        this.name = name;
        this.village = village;
    }

    public User(String name, String village, String phoneNumber) {
        this.name = name;
        this.village = village;
        this.phoneNumber = phoneNumber;
        this.role = UserRole.GUEST;
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getVillage() {
        return village;
    }

    public void setVillage(String village) {
        this.village = village;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public UserRole getRole() {
        return role;
    }

    public void setRole(UserRole role) {
        this.role = role;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public static User createGuest(String name, String village, String phoneNumber) {
        User user = new User(name, village, phoneNumber);
        user.setRole(UserRole.GUEST);
        return user;
    }

    public static User createHost(String name, String village, String phoneNumber) {
        User user = new User(name, village, phoneNumber);
        user.setRole(UserRole.HOST);
        return user;
    }

    public static User createOrganizer(String name, String village, String phoneNumber) {
        User user = new User(name, village, phoneNumber);
        user.setRole(UserRole.ORGANIZER);
        return user;
    }

    public static User createManagedPerson(String name, String village, String phoneNumber, User managedBy) {
        User user = new User(name, village, phoneNumber);
        user.setRole(UserRole.GUEST);
        user.setManagedBy(managedBy);
        return user;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPincode() {
        return pincode;
    }

    public void setPincode(String pincode) {
        this.pincode = pincode;
    }

    public User getManagedBy() {
        return managedBy;
    }

    public void setManagedBy(User managedBy) {
        this.managedBy = managedBy;
    }

    @Override
    public String toString() {
        return "User{" +
                "id=" + id +
                ", name='" + name + '\'' +
                ", village='" + village + '\'' +
                ", phoneNumber='" + phoneNumber + '\'' +
                ", role=" + role +
                ", createdAt=" + createdAt +
                '}';
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        User user = (User) o;
        return id == user.id && Objects.equals(name, user.name) && Objects.equals(village, user.village) && Objects.equals(phoneNumber, user.phoneNumber) && role == user.role;
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, name, village, phoneNumber, role);
    }
}
