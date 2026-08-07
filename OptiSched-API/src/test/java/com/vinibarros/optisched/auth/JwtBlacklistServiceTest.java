package com.vinibarros.optisched.auth;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.utility.DockerImageName;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Binds a real Redis (Testcontainers) instead of mocking StringRedisTemplate
 * — far less brittle, and it exercises the actual SET-with-TTL / EXISTS
 * behavior the blacklist depends on, same philosophy as OptimizerClientTest.
 */
class JwtBlacklistServiceTest {

    static final GenericContainer<?> REDIS =
            new GenericContainer<>(DockerImageName.parse("redis:7-alpine")).withExposedPorts(6379);

    static LettuceConnectionFactory connectionFactory;
    static JwtBlacklistService service;

    @BeforeAll
    static void setUp() {
        REDIS.start();

        RedisStandaloneConfiguration config =
                new RedisStandaloneConfiguration(REDIS.getHost(), REDIS.getMappedPort(6379));
        connectionFactory = new LettuceConnectionFactory(config);
        connectionFactory.afterPropertiesSet();

        StringRedisTemplate redisTemplate = new StringRedisTemplate(connectionFactory);
        redisTemplate.afterPropertiesSet();

        service = new JwtBlacklistService(redisTemplate);
    }

    @AfterAll
    static void tearDown() {
        connectionFactory.destroy();
        REDIS.stop();
    }

    @Test
    void tokenIsNotBlacklistedByDefault() {
        assertThat(service.isBlacklisted("never-blacklisted-token")).isFalse();
    }

    @Test
    void blacklistedTokenIsReportedAsBlacklisted() {
        service.blacklist("token-a", Instant.now().plusSeconds(60));

        assertThat(service.isBlacklisted("token-a")).isTrue();
    }

    @Test
    void blacklistingOneTokenDoesNotAffectAnother() {
        service.blacklist("token-b", Instant.now().plusSeconds(60));

        assertThat(service.isBlacklisted("token-c")).isFalse();
    }

    @Test
    void alreadyExpiredTokenIsNeverWrittenToRedis() {
        // No point spending a Redis write on it — normal JWT expiry
        // validation already rejects it on its own.
        service.blacklist("token-d", Instant.now().minusSeconds(1));

        assertThat(service.isBlacklisted("token-d")).isFalse();
    }
}
