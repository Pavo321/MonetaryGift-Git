package com.mysteriousmonkeys.chanlo.auth;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AuthSessionRepository extends JpaRepository<AuthSessionEntity, Long> {
    Optional<AuthSessionEntity> findByToken(String token);
    void deleteByToken(String token);
}
