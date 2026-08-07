package com.vinibarros.optisched.config;

import com.vinibarros.optisched.auth.JwtBlacklistService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;

/**
 * Registered (SecurityConfig) right after BearerTokenAuthenticationFilter:
 * by the time this runs, the JWT's signature and expiry are already
 * verified and its claims sit on the SecurityContext as a Jwt principal —
 * but a token that went through AuthController.logout since being issued
 * is still cryptographically valid on its own. This is the check that
 * actually rejects it, closing the "stolen/leaked token stays usable until
 * it naturally expires (up to 8h)" gap a stateless JWT has by default.
 */
@Component
public class JwtBlacklistFilter extends OncePerRequestFilter {

    private final JwtBlacklistService jwtBlacklistService;

    public JwtBlacklistFilter(JwtBlacklistService jwtBlacklistService) {
        this.jwtBlacklistService = jwtBlacklistService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication != null
                && authentication.getPrincipal() instanceof Jwt jwt
                && jwtBlacklistService.isBlacklisted(jwt.getTokenValue())) {

            SecurityContextHolder.clearContext();
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write(
                    "{\"timestamp\":\"" + Instant.now() + "\","
                            + "\"status\":401,"
                            + "\"error\":\"Unauthorized\","
                            + "\"message\":\"This session has been logged out.\"}"
            );
            return;
        }

        filterChain.doFilter(request, response);
    }
}
