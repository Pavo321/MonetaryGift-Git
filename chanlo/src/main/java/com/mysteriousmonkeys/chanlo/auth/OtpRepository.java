package com.mysteriousmonkeys.chanlo.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface OtpRepository extends JpaRepository<OtpVerification, Long> {
    Optional<OtpVerification> findTopByPhoneNumberAndVerifiedFalseOrderByCreatedAtDesc(String phoneNumber);
    void deleteByPhoneNumber(String phoneNumber);
    void deleteByPhoneNumberAndVerifiedFalse(String phoneNumber);
}
