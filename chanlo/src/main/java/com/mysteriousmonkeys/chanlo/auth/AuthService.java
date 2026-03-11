package com.mysteriousmonkeys.chanlo.auth;

import com.mysteriousmonkeys.chanlo.user.User;
import com.mysteriousmonkeys.chanlo.user.UserRepository;
import com.mysteriousmonkeys.chanlo.user.UserRole;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.mysteriousmonkeys.chanlo.service.WhatsAppApiService;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private static final int OTP_EXPIRY_MINUTES = 5;
    private static final SecureRandom random = new SecureRandom();

    @Autowired
    private OtpRepository otpRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private WhatsAppApiService whatsAppApiService;

    @Autowired
    private AuthSessionRepository sessionRepository;

    /**
     * Send OTP to phone number via WhatsApp message.
     */
    public OtpResponse sendOtp(String phoneNumber) {
        // Remove any previous unverified OTPs for this number before issuing a new one
        otpRepository.deleteByPhoneNumberAndVerifiedFalse(phoneNumber);

        String otp = generateOtp();

        OtpVerification otpVerification = new OtpVerification(
            phoneNumber,
            otp,
            LocalDateTime.now().plusMinutes(OTP_EXPIRY_MINUTES)
        );
        otpRepository.save(otpVerification);

        // Send OTP via WhatsApp
        String message = String.format(
            "Your Mahotsava login OTP is: *%s*\n\nValid for %d minutes. Do not share with anyone.",
            otp, OTP_EXPIRY_MINUTES
        );
        boolean sent = whatsAppApiService.sendTextMessage(phoneNumber, message);

        if (sent) {
            log.info("OTP sent via WhatsApp to {}", phoneNumber);
        } else {
            log.warn("WhatsApp delivery failed for {}. OTP logged for dev.", phoneNumber);
        }

        // Always return OTP in response for development. Remove in production.
        return new OtpResponse(true, "OTP sent to your WhatsApp", otp);
    }

    /**
     * Verify OTP and return session token if valid
     */
    public VerifyOtpResponse verifyOtp(String phoneNumber, String otpCode) {
        Optional<OtpVerification> otpOpt = otpRepository
            .findTopByPhoneNumberAndVerifiedFalseOrderByCreatedAtDesc(phoneNumber);

        if (otpOpt.isEmpty()) {
            return new VerifyOtpResponse(false, "No OTP found. Please request a new one.", null, null);
        }

        OtpVerification otp = otpOpt.get();

        if (!otp.isValid()) {
            return new VerifyOtpResponse(false, "OTP expired. Please request a new one.", null, null);
        }

        otp.incrementAttempts();

        if (!otp.getOtpCode().equals(otpCode)) {
            otpRepository.save(otp);
            int remaining = 5 - otp.getAttempts();
            return new VerifyOtpResponse(false,
                "Invalid OTP. " + remaining + " attempts remaining.", null, null);
        }

        // OTP is valid
        otp.setVerified(true);
        otpRepository.save(otp);

        // Check if user exists
        Optional<User> userOpt = userRepository.findByPhoneNumber(phoneNumber);

        // Generate session token and persist to database
        String sessionToken = UUID.randomUUID().toString();
        AuthSessionEntity sessionEntity = new AuthSessionEntity(
            sessionToken,
            phoneNumber,
            userOpt.map(User::getId).orElse(null),
            userOpt.map(User::getRole).orElse(null),
            LocalDateTime.now().plusDays(30)
        );
        sessionRepository.save(sessionEntity);

        return new VerifyOtpResponse(
            true,
            userOpt.isPresent() ? "Login successful" : "OTP verified. Please complete registration.",
            sessionToken,
            userOpt.orElse(null)
        );
    }

    /**
     * Register a new user after OTP verification
     */
    public User registerUser(String sessionToken, String name, String place, String email, String pincode) {
        AuthSessionEntity sessionEntity = sessionRepository.findByToken(sessionToken).orElse(null);
        if (sessionEntity == null || sessionEntity.isExpired()) {
            throw new RuntimeException("Invalid or expired session. Please login again.");
        }

        if (sessionEntity.getUserId() != null) {
            throw new RuntimeException("User already registered with this phone number.");
        }

        // Check if phone already exists
        if (userRepository.existsByPhoneNumber(sessionEntity.getPhoneNumber())) {
            throw new RuntimeException("Phone number already registered.");
        }

        User user = new User(name, place, sessionEntity.getPhoneNumber());
        user.setRole(UserRole.HOST);
        user.setEmail(email);
        user.setPincode(pincode);
        user = userRepository.save(user);

        // Update session with user info
        sessionEntity.setUserId(user.getId());
        sessionEntity.setRole(user.getRole());
        sessionRepository.save(sessionEntity);

        log.info("New user registered: {} ({})", name, sessionEntity.getPhoneNumber());
        return user;
    }

    /**
     * Validate session token and return user info
     */
    public AuthSession validateSession(String sessionToken) {
        AuthSessionEntity entity = sessionRepository.findByToken(sessionToken).orElse(null);
        if (entity == null || entity.isExpired()) {
            return null;
        }
        return new AuthSession(
            entity.getToken(),
            entity.getPhoneNumber(),
            entity.getUserId(),
            entity.getRole(),
            entity.getExpiresAt()
        );
    }

    /**
     * Logout - invalidate session
     */
    public void logout(String sessionToken) {
        sessionRepository.deleteByToken(sessionToken);
    }

    private String generateOtp() {
        return String.format("%06d", random.nextInt(1000000));
    }

    // DTOs
    public record OtpResponse(boolean success, String message, String otp) {}

    public record VerifyOtpResponse(boolean success, String message, String sessionToken, User user) {}

    public record AuthSession(
        String token,
        String phoneNumber,
        Integer userId,
        UserRole role,
        LocalDateTime expiresAt
    ) {
        public boolean isExpired() {
            return LocalDateTime.now().isAfter(expiresAt);
        }
    }
}
