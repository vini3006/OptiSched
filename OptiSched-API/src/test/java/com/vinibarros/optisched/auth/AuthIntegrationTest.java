package com.vinibarros.optisched.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vinibarros.optisched.entity.User;
import com.vinibarros.optisched.enums.UserRole;
import com.vinibarros.optisched.repository.UserRepository;
import com.vinibarros.optisched.support.AbstractIntegrationTest;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Exercises login -> /auth/me -> logout -> /auth/me again against a real
 * Postgres + Redis, proving the JWT blacklist (item A6) actually revokes a
 * session on logout instead of leaving a stolen/leaked cookie usable until
 * its natural 8h expiry (see JwtBlacklistService / JwtBlacklistFilter).
 */
@AutoConfigureMockMvc
@Transactional
class AuthIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ObjectMapper objectMapper;

    /**
     * /auth/login is rate-limited (RateLimitingFilter) by client IP, keyed
     * against the same Redis container every AbstractIntegrationTest
     * subclass shares for the whole JVM run — a distinct fake IP per test
     * keeps this test isolated from that shared budget.
     */
    private static RequestPostProcessor fromIp(String ip) {
        return request -> {
            request.setRemoteAddr(ip);
            return request;
        };
    }

    private User persistUser(String email, String rawPassword) {
        User user = new User();
        user.setName("Auth Test User");
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(rawPassword));
        user.setRole(UserRole.ADMIN);
        return userRepository.saveAndFlush(user);
    }

    @Test
    void logout_blacklistsTheAccessTokenSoItStopsWorkingImmediately() throws Exception {
        String email = "blacklist-" + System.nanoTime() + "@test.com";
        persistUser(email, "correctPassword123");

        MvcResult loginResult = mockMvc.perform(post("/auth/login")
                        .with(fromIp("10.10.2.1"))
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(new AuthRequest(email, "correctPassword123"))))
                .andExpect(status().isOk())
                .andReturn();

        Cookie accessToken = loginResult.getResponse().getCookie("access_token");
        assertThat(accessToken).isNotNull();
        assertThat(accessToken.getValue()).isNotBlank();

        // The token works before logout.
        mockMvc.perform(get("/auth/me").cookie(accessToken))
                .andExpect(status().isOk());

        mockMvc.perform(post("/auth/logout").cookie(accessToken))
                .andExpect(status().isNoContent());

        // Same cookie, same still-cryptographically-valid-and-unexpired token — now blacklisted.
        mockMvc.perform(get("/auth/me").cookie(accessToken))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void logout_withoutACookie_stillReturnsNoContent() throws Exception {
        mockMvc.perform(post("/auth/logout"))
                .andExpect(status().isNoContent());
    }
}
