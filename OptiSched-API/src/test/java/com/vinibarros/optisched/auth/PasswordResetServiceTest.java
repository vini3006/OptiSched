package com.vinibarros.optisched.auth;

import com.vinibarros.optisched.email.EmailSender;
import com.vinibarros.optisched.entity.PasswordResetToken;
import com.vinibarros.optisched.entity.User;
import com.vinibarros.optisched.exception.InvalidResetTokenException;
import com.vinibarros.optisched.repository.PasswordResetTokenRepository;
import com.vinibarros.optisched.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PasswordResetServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordResetTokenRepository passwordResetTokenRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private EmailSender emailSender;

    private PasswordResetService passwordResetService;

    @BeforeEach
    void setUp() {
        passwordResetService = new PasswordResetService(
                userRepository, passwordResetTokenRepository, passwordEncoder, emailSender
        );
        ReflectionTestUtils.setField(passwordResetService, "frontendUrl", "http://localhost:5173");
    }

    private User user(Long id, String email) {
        User user = new User();
        user.setId(id);
        user.setEmail(email);
        user.setPassword("old-hash");
        return user;
    }

    private PasswordResetToken token(User user, String token, LocalDateTime expiresAt, LocalDateTime usedAt) {
        PasswordResetToken resetToken = new PasswordResetToken();
        resetToken.setUser(user);
        resetToken.setToken(token);
        resetToken.setExpiresAt(expiresAt);
        resetToken.setUsedAt(usedAt);
        return resetToken;
    }

    // -------------------- requestReset --------------------

    @Test
    void requestReset_existingUser_savesTokenAndSendsEmail() {
        User user = user(1L, "professor@test.com");
        when(userRepository.findByEmail("professor@test.com")).thenReturn(Optional.of(user));

        passwordResetService.requestReset("professor@test.com");

        ArgumentCaptor<PasswordResetToken> tokenCaptor = ArgumentCaptor.forClass(PasswordResetToken.class);
        verify(passwordResetTokenRepository).save(tokenCaptor.capture());
        PasswordResetToken saved = tokenCaptor.getValue();

        assertThat(saved.getUser()).isEqualTo(user);
        assertThat(saved.getToken()).isNotBlank();
        assertThat(saved.getExpiresAt()).isAfter(LocalDateTime.now());
        assertThat(saved.getUsedAt()).isNull();

        verify(emailSender).sendPasswordResetEmail(eq("professor@test.com"), anyString());
    }

    @Test
    void requestReset_unknownEmail_doesNothingSilently() {
        when(userRepository.findByEmail("ghost@test.com")).thenReturn(Optional.empty());

        passwordResetService.requestReset("ghost@test.com");

        verify(passwordResetTokenRepository, never()).save(any());
        verify(emailSender, never()).sendPasswordResetEmail(anyString(), anyString());
    }

    // -------------------- resetPassword --------------------

    @Test
    void resetPassword_validToken_updatesPasswordAndMarksUsed() {
        User user = user(1L, "professor@test.com");
        PasswordResetToken resetToken = token(user, "valid-token", LocalDateTime.now().plusMinutes(30), null);
        when(passwordResetTokenRepository.findByToken("valid-token")).thenReturn(Optional.of(resetToken));
        when(passwordEncoder.encode("newPassword123")).thenReturn("new-hash");

        passwordResetService.resetPassword("valid-token", "newPassword123");

        assertThat(user.getPassword()).isEqualTo("new-hash");
        assertThat(resetToken.getUsedAt()).isNotNull();
        verify(userRepository).save(user);
        verify(passwordResetTokenRepository).save(resetToken);
    }

    @Test
    void resetPassword_unknownToken_throwsInvalidResetToken() {
        when(passwordResetTokenRepository.findByToken("bogus")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> passwordResetService.resetPassword("bogus", "newPassword123"))
                .isInstanceOf(InvalidResetTokenException.class);
    }

    @Test
    void resetPassword_alreadyUsedToken_throwsInvalidResetToken() {
        User user = user(1L, "professor@test.com");
        PasswordResetToken resetToken =
                token(user, "used-token", LocalDateTime.now().plusMinutes(30), LocalDateTime.now().minusMinutes(5));
        when(passwordResetTokenRepository.findByToken("used-token")).thenReturn(Optional.of(resetToken));

        assertThatThrownBy(() -> passwordResetService.resetPassword("used-token", "newPassword123"))
                .isInstanceOf(InvalidResetTokenException.class);

        verify(userRepository, never()).save(any());
    }

    @Test
    void resetPassword_expiredToken_throwsInvalidResetToken() {
        User user = user(1L, "professor@test.com");
        PasswordResetToken resetToken =
                token(user, "expired-token", LocalDateTime.now().minusMinutes(1), null);
        when(passwordResetTokenRepository.findByToken("expired-token")).thenReturn(Optional.of(resetToken));

        assertThatThrownBy(() -> passwordResetService.resetPassword("expired-token", "newPassword123"))
                .isInstanceOf(InvalidResetTokenException.class);

        verify(userRepository, never()).save(any());
    }
}
