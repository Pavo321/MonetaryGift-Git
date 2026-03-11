package com.mysteriousmonkeys.chanlo.auth;

import com.mysteriousmonkeys.chanlo.user.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    /**
     * Step 1: Send OTP to phone number
     * POST /api/auth/send-otp
     * Body: { "phoneNumber": "9876543210" }
     */
    @PostMapping("/send-otp")
    public ResponseEntity<?> sendOtp(@RequestBody Map<String, String> request) {
        String phoneNumber = request.get("phoneNumber");
        if (phoneNumber == null || !phoneNumber.matches("^\\d{10}$")) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "Valid 10-digit phone number required"
            ));
        }

        AuthService.OtpResponse response = authService.sendOtp(phoneNumber);
        return ResponseEntity.ok(response);
    }

    /**
     * Step 2: Verify OTP
     * POST /api/auth/verify-otp
     * Body: { "phoneNumber": "9876543210", "otp": "123456" }
     */
    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> request) {
        String phoneNumber = request.get("phoneNumber");
        String otp = request.get("otp");

        if (phoneNumber == null || otp == null) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "Phone number and OTP required"
            ));
        }

        AuthService.VerifyOtpResponse response = authService.verifyOtp(phoneNumber, otp);

        if (!response.success()) {
            return ResponseEntity.badRequest().body(response);
        }

        return ResponseEntity.ok(response);
    }

    /**
     * Step 3: Register (only for new users after OTP verification)
     * POST /api/auth/register
     * Header: Authorization: Bearer {sessionToken}
     * Body: { "name": "Jignesh", "place": "Mumbai", "email": "j@x.com", "pincode": "400001" }
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody Map<String, String> request) {

        String token = extractToken(authHeader);
        if (token == null) {
            return ResponseEntity.status(401).body(Map.of("success", false, "message", "Invalid token"));
        }

        try {
            User user = authService.registerUser(
                token,
                request.get("name"),
                request.get("place"),
                request.getOrDefault("email", null),
                request.getOrDefault("pincode", null)
            );
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Registration successful",
                "user", user
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", e.getMessage()
            ));
        }
    }

    /**
     * Validate session / get current user
     * GET /api/auth/me
     * Header: Authorization: Bearer {sessionToken}
     */
    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(@RequestHeader("Authorization") String authHeader) {
        String token = extractToken(authHeader);
        if (token == null) {
            return ResponseEntity.status(401).body(Map.of("success", false, "message", "Invalid token"));
        }

        AuthService.AuthSession session = authService.validateSession(token);
        if (session == null) {
            return ResponseEntity.status(401).body(Map.of("success", false, "message", "Session expired"));
        }

        return ResponseEntity.ok(Map.of(
            "success", true,
            "userId", session.userId() != null ? session.userId() : "",
            "phoneNumber", session.phoneNumber(),
            "role", session.role() != null ? session.role().name() : ""
        ));
    }

    /**
     * Logout
     * POST /api/auth/logout
     * Header: Authorization: Bearer {sessionToken}
     */
    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestHeader("Authorization") String authHeader) {
        String token = extractToken(authHeader);
        if (token != null) {
            authService.logout(token);
        }
        return ResponseEntity.ok(Map.of("success", true, "message", "Logged out"));
    }

    private String extractToken(String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        return null;
    }
}
