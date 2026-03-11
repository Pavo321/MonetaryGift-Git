package com.mysteriousmonkeys.chanlo.service;

import com.mysteriousmonkeys.chanlo.auth.MagicLink;
import com.mysteriousmonkeys.chanlo.auth.MagicLinkRepository;
import com.mysteriousmonkeys.chanlo.user.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Optional;

@Service
public class MagicLinkService {

    private final MagicLinkRepository magicLinkRepository;
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${app.base-url:http://localhost:3000}")
    private String baseUrl;

    @Value("${app.magic-link.expiry-hours:24}")
    private int expiryHours;

    public MagicLinkService(MagicLinkRepository magicLinkRepository) {
        this.magicLinkRepository = magicLinkRepository;
    }

    @Transactional
    public String generateMagicLink(User host) {
        // Check if there's an existing valid link - return it
        Optional<MagicLink> existingLink = magicLinkRepository.findByHostAndUsedFalse(host);
        if (existingLink.isPresent() && existingLink.get().isValid()) {
            return buildDashboardUrl(existingLink.get().getToken());
        }

        // Generate new token (expires in 1 year by default)
        String token = generateSecureToken();
        LocalDateTime expiresAt = LocalDateTime.now().plusHours(expiryHours);

        MagicLink magicLink = new MagicLink(token, host, expiresAt);
        magicLinkRepository.save(magicLink);

        return buildDashboardUrl(token);
    }

    /**
     * Generate a fresh magic link (invalidates old ones)
     * Use this when host explicitly requests a new link
     */
    @Transactional
    public String regenerateMagicLink(User host) {
        // Invalidate all existing links for this host
        magicLinkRepository.deleteByHost(host);

        // Generate new token
        String token = generateSecureToken();
        LocalDateTime expiresAt = LocalDateTime.now().plusHours(expiryHours);

        MagicLink magicLink = new MagicLink(token, host, expiresAt);
        magicLinkRepository.save(magicLink);

        return buildDashboardUrl(token);
    }

    public Optional<User> validateToken(String token) {
        Optional<MagicLink> magicLink = magicLinkRepository.findByToken(token);

        if (magicLink.isEmpty()) {
            return Optional.empty();
        }

        MagicLink link = magicLink.get();
        if (!link.isValid()) {
            return Optional.empty();
        }

        return Optional.of(link.getHost());
    }

    @Transactional
    public void invalidateToken(String token) {
        magicLinkRepository.findByToken(token).ifPresent(link -> {
            link.setUsed(true);
            magicLinkRepository.save(link);
        });
    }

    @Transactional
    public void invalidateAllTokensForHost(User host) {
        magicLinkRepository.deleteByHost(host);
    }

    private String generateSecureToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String buildDashboardUrl(String token) {
        return baseUrl + "/dashboard?token=" + token;
    }
}
