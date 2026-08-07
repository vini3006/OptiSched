package com.vinibarros.optisched.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vinibarros.optisched.entity.PasswordResetToken;
import com.vinibarros.optisched.entity.User;
import com.vinibarros.optisched.enums.UserRole;
import com.vinibarros.optisched.repository.PasswordResetTokenRepository;
import com.vinibarros.optisched.repository.UserRepository;
import com.vinibarros.optisched.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Exercises the real HTTP endpoints (permitAll, no JWT needed) against a real
 * Postgres — end to end confidence for a security-sensitive flow that a
 * Mockito-only test can't give (request validation, exception -> HTTP status
 * mapping via GlobalExceptionHandler, actual persistence).
 *
 * /auth/forgot-password calls below each use a distinct fake remote address:
 * RateLimitingFilter (item A4/A6) is now backed by the same Redis container
 * every AbstractIntegrationTest subclass shares for the whole JVM run, keyed
 * by client IP — without distinct IPs, MockMvc's fixed default remote
 * address would let these tests' own request count (or another test class's)
 * trip the real 3/min limit and fail with 429 instead of the expected status.
 */
@AutoConfigureMockMvc
@Transactional
class PasswordResetIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordResetTokenRepository passwordResetTokenRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ObjectMapper objectMapper;

    private User persistUser(String email) {
        User user = new User();
        user.setName("Test User");
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode("oldPassword123"));
        user.setRole(UserRole.ADMIN);
        return userRepository.saveAndFlush(user);
    }

    private static RequestPostProcessor fromIp(String ip) {
        return request -> {
            request.setRemoteAddr(ip);
            return request;
        };
    }

    @Test
    void forgotPassword_existingEmail_createsATokenAndReturns204() throws Exception {
        User user = persistUser("forgot-" + System.nanoTime() + "@test.com");

        mockMvc.perform(post("/auth/forgot-password")
                        .with(fromIp("10.10.1.1"))
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(new ForgotPasswordRequest(user.getEmail()))))
                .andExpect(status().isNoContent());

        List<PasswordResetToken> tokens = passwordResetTokenRepository.findAll().stream()
                .filter(t -> t.getUser().getId().equals(user.getId()))
                .toList();
        assertThat(tokens).hasSize(1);
    }

    @Test
    void forgotPassword_unknownEmail_stillReturns204() throws Exception {
        mockMvc.perform(post("/auth/forgot-password")
                        .with(fromIp("10.10.1.2"))
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(new ForgotPasswordRequest("ghost@test.com"))))
                .andExpect(status().isNoContent());
    }

    @Test
    void forgotPassword_blankEmail_returns400() throws Exception {
        mockMvc.perform(post("/auth/forgot-password")
                        .with(fromIp("10.10.1.3"))
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(new ForgotPasswordRequest(""))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void resetPassword_validToken_updatesPasswordAndReturns204() throws Exception {
        User user = persistUser("reset-" + System.nanoTime() + "@test.com");
        String rawToken = "integration-valid-token-" + System.nanoTime();
        PasswordResetToken resetToken = new PasswordResetToken();
        resetToken.setUser(user);
        // Only the hash is ever persisted (see PasswordResetService.requestReset) —
        // the endpoint under test receives the raw token, exactly like a real link.
        resetToken.setToken(PasswordResetService.hashToken(rawToken));
        resetToken.setExpiresAt(LocalDateTime.now().plusMinutes(30));
        passwordResetTokenRepository.saveAndFlush(resetToken);

        mockMvc.perform(post("/auth/reset-password")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(
                                new ResetPasswordRequest(rawToken, "brandNewPassword123"))))
                .andExpect(status().isNoContent());

        User updated = userRepository.findById(user.getId()).orElseThrow();
        assertThat(passwordEncoder.matches("brandNewPassword123", updated.getPassword())).isTrue();

        Optional<PasswordResetToken> tokenAfter =
                passwordResetTokenRepository.findByToken(PasswordResetService.hashToken(rawToken));
        assertThat(tokenAfter).isPresent();
        assertThat(tokenAfter.get().getUsedAt()).isNotNull();
    }

    @Test
    void resetPassword_unknownToken_returns400() throws Exception {
        mockMvc.perform(post("/auth/reset-password")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(
                                new ResetPasswordRequest("does-not-exist", "brandNewPassword123"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void resetPassword_expiredToken_returns400() throws Exception {
        User user = persistUser("expired-" + System.nanoTime() + "@test.com");
        String rawToken = "integration-expired-token-" + System.nanoTime();
        PasswordResetToken resetToken = new PasswordResetToken();
        resetToken.setUser(user);
        resetToken.setToken(PasswordResetService.hashToken(rawToken));
        resetToken.setExpiresAt(LocalDateTime.now().minusMinutes(1));
        passwordResetTokenRepository.saveAndFlush(resetToken);

        mockMvc.perform(post("/auth/reset-password")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(
                                new ResetPasswordRequest(rawToken, "brandNewPassword123"))))
                .andExpect(status().isBadRequest());
    }
}
