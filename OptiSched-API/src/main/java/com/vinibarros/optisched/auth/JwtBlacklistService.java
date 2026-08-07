package com.vinibarros.optisched.auth;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;

/**
 * Server-side JWT revocation, backed by Redis. Access tokens are otherwise
 * stateless and stay valid until they naturally expire (up to 8h — see
 * TokenService.EXPIRES_IN_SECONDS), so logging out can't invalidate a token
 * on its own without something like this: AuthController.logout writes the
 * token's hash here with a TTL matching its remaining lifetime, and
 * JwtBlacklistFilter checks every authenticated request against it.
 *
 * Only the hash is stored, never the raw token — same rationale as
 * PasswordResetService's reset-token hashing: a Redis dump can't be replayed
 * as a valid session.
 */
@Service
public class JwtBlacklistService {

    private static final String KEY_PREFIX = "jwt:blacklist:";

    private final StringRedisTemplate redisTemplate;

    public JwtBlacklistService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    /**
     * No-ops for a token that's already expired (or expiring right now) —
     * it'll be rejected on its own by normal JWT expiry validation, so
     * there's nothing worth spending a Redis write on.
     */
    public void blacklist(String rawToken, Instant expiresAt) {
        Duration ttl = Duration.between(Instant.now(), expiresAt);
        if (ttl.isNegative() || ttl.isZero()) {
            return;
        }
        redisTemplate.opsForValue().set(key(rawToken), "1", ttl);
    }

    public boolean isBlacklisted(String rawToken) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(key(rawToken)));
    }

    private String key(String rawToken) {
        return KEY_PREFIX + hash(rawToken);
    }

    private static String hash(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is not available in this JVM.", e);
        }
    }
}
