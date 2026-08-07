package com.vinibarros.optisched.auth;

import com.vinibarros.optisched.email.EmailSender;
import com.vinibarros.optisched.entity.PasswordResetToken;
import com.vinibarros.optisched.entity.User;
import com.vinibarros.optisched.exception.InvalidResetTokenException;
import com.vinibarros.optisched.repository.PasswordResetTokenRepository;
import com.vinibarros.optisched.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;

@Service
public class PasswordResetService {

    private static final long TOKEN_TTL_MINUTES = 60;
    private static final int TOKEN_BYTES = 32;

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailSender emailSender;
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${app.frontend-url}")
    private String frontendUrl;

    public PasswordResetService(
            UserRepository userRepository,
            PasswordResetTokenRepository passwordResetTokenRepository,
            PasswordEncoder passwordEncoder,
            EmailSender emailSender
    ) {
        this.userRepository = userRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailSender = emailSender;
    }

    /**
     * Deliberately silent (no exception, no differing response) when the
     * e-mail doesn't match any user — mirrors AuthService.login's
     * anti-enumeration stance, so an attacker can't use this endpoint to
     * discover which e-mails have accounts.
     */
    @Transactional
    public void requestReset(String email) {
        userRepository.findByEmail(email).ifPresent(user -> {
            byte[] randomBytes = new byte[TOKEN_BYTES];
            secureRandom.nextBytes(randomBytes);
            String token = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);

            // Only the hash is persisted — a leaked/dumped database can't be
            // replayed as a valid reset link, since the raw token (the only
            // thing accepted by resetPassword below) is never stored anywhere.
            PasswordResetToken resetToken = new PasswordResetToken();
            resetToken.setUser(user);
            resetToken.setToken(hashToken(token));
            resetToken.setExpiresAt(LocalDateTime.now().plusMinutes(TOKEN_TTL_MINUTES));
            passwordResetTokenRepository.save(resetToken);

            String resetLink = frontendUrl + "/redefinir-senha?token=" + token;
            emailSender.sendPasswordResetEmail(user.getEmail(), resetLink);
        });
    }

    @Transactional
    public void resetPassword(String token, String newPassword) {
        PasswordResetToken resetToken = passwordResetTokenRepository.findByToken(hashToken(token))
                .orElseThrow(() -> new InvalidResetTokenException("This password reset link is invalid."));

        if (resetToken.getUsedAt() != null) {
            throw new InvalidResetTokenException("This password reset link has already been used.");
        }

        if (resetToken.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new InvalidResetTokenException("This password reset link has expired.");
        }

        User user = resetToken.getUser();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        resetToken.setUsedAt(LocalDateTime.now());
        passwordResetTokenRepository.save(resetToken);
    }

    /** Package-private (not private) so PasswordResetServiceTest can compute the same hash independently. */
    static String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is not available in this JVM.", e);
        }
    }
}
