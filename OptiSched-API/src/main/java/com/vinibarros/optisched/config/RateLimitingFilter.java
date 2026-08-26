package com.vinibarros.optisched.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;

/**
 * Redis-backed rate limiting (fixed window, INCR + EXPIRE) for the two
 * unauthenticated endpoints an attacker could otherwise hammer without any
 * credentials at all: /auth/login (credential brute-force) and
 * /auth/forgot-password (reset e-mail spam / enumeration probing). Keyed by
 * client IP + path.
 *
 * Backed by Redis rather than an in-process map (the original A4 version)
 * so the limit survives a deploy/restart and stays correct if this API ever
 * runs as more than one instance — INCR is atomic, so concurrent requests
 * across any number of instances still count correctly against the same key.
 *
 * Relies on server.forward-headers-strategy=native (application.properties)
 * to see the real client IP through the production Caddy reverse proxy —
 * without it, every request would appear to come from Caddy's own address
 * and share a single bucket.
 */
@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    private record Limit(String path, int maxRequests) {
    }

    private static final Duration WINDOW = Duration.ofMinutes(1);

    private static final Limit[] LIMITS = {
            new Limit("/auth/login", 5),
            new Limit("/auth/forgot-password", 3),
            new Limit("/demo/institutions", 3),
    };

    private final StringRedisTemplate redisTemplate;

    public RateLimitingFilter(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        Limit limit = matchLimit(request);

        if (limit == null) {
            filterChain.doFilter(request, response);
            return;
        }

        String key = "ratelimit:" + limit.path() + ":" + request.getRemoteAddr();

        if (isOverLimit(key, limit.maxRequests())) {
            response.setStatus(429);
            response.setContentType("application/json");
            response.getWriter().write(
                    "{\"timestamp\":\"" + Instant.now() + "\","
                            + "\"status\":429,"
                            + "\"error\":\"Too Many Requests\","
                            + "\"message\":\"Too many requests. Please try again later.\"}"
            );
            return;
        }

        filterChain.doFilter(request, response);
    }

    private Limit matchLimit(HttpServletRequest request) {
        if (!"POST".equalsIgnoreCase(request.getMethod())) {
            return null;
        }
        String path = request.getServletPath();
        for (Limit limit : LIMITS) {
            if (limit.path().equals(path)) {
                return limit;
            }
        }
        return null;
    }

    /**
     * INCR is atomic in Redis, so this is safe under concurrent requests
     * with no extra locking. EXPIRE is only (re-)armed on the first hit of a
     * fresh window (count == 1) — every hit after that shares the same TTL,
     * giving a standard fixed-window limiter with no manual cleanup needed
     * (Redis drops the key itself once the TTL elapses).
     */
    private boolean isOverLimit(String key, int maxRequests) {
        Long count = redisTemplate.opsForValue().increment(key);
        if (count != null && count == 1L) {
            redisTemplate.expire(key, WINDOW);
        }
        return count != null && count > maxRequests;
    }
}
