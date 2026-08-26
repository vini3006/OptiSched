package com.vinibarros.optisched.optimization;

import com.vinibarros.optisched.exception.DemoGenerationLimitExceededException;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.utility.DockerImageName;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Binds a real Redis (Testcontainers), same reasoning as RateLimitingFilterTest:
 * INCR/EXPIRE semantics are exactly the kind of thing a mock would get subtly
 * wrong. Every test uses its own institution id so they stay isolated despite
 * sharing one Redis for the class.
 */
class DemoGenerationGuardrailTest {

    static final GenericContainer<?> REDIS =
            new GenericContainer<>(DockerImageName.parse("redis:7-alpine")).withExposedPorts(6379);

    static LettuceConnectionFactory connectionFactory;

    private DemoGenerationGuardrail guardrail;

    @BeforeAll
    static void startRedis() {
        REDIS.start();

        RedisStandaloneConfiguration config =
                new RedisStandaloneConfiguration(REDIS.getHost(), REDIS.getMappedPort(6379));
        connectionFactory = new LettuceConnectionFactory(config);
        connectionFactory.afterPropertiesSet();
    }

    @AfterAll
    static void stopRedis() {
        connectionFactory.destroy();
        REDIS.stop();
    }

    @BeforeEach
    void setUp() {
        StringRedisTemplate redisTemplate = new StringRedisTemplate(connectionFactory);
        redisTemplate.afterPropertiesSet();
        guardrail = new DemoGenerationGuardrail(redisTemplate);
    }

    @Test
    void allowsGenerationsUpToTheLimit() {
        for (int i = 0; i < DemoGenerationGuardrail.MAX_GENERATIONS; i++) {
            assertThatCode(() -> guardrail.checkGenerationLimit(1001L)).doesNotThrowAnyException();
        }
    }

    @Test
    void rejectsTheGenerationThatExceedsTheLimit() {
        for (int i = 0; i < DemoGenerationGuardrail.MAX_GENERATIONS; i++) {
            guardrail.checkGenerationLimit(1002L);
        }

        assertThatThrownBy(() -> guardrail.checkGenerationLimit(1002L))
                .isInstanceOf(DemoGenerationLimitExceededException.class);
    }

    @Test
    void tracksDifferentInstitutionsIndependently() {
        for (int i = 0; i < DemoGenerationGuardrail.MAX_GENERATIONS; i++) {
            guardrail.checkGenerationLimit(1003L);
        }

        // A different demo institution must not be affected by 1003's exhausted budget.
        assertThatCode(() -> guardrail.checkGenerationLimit(1004L)).doesNotThrowAnyException();
    }

    @Test
    void capSolverTimeLimit_clampsAboveTheCeiling() {
        assertThat(guardrail.capSolverTimeLimit(300.0)).isEqualTo(DemoGenerationGuardrail.MAX_SOLVER_TIME_LIMIT_SECONDS);
    }

    @Test
    void capSolverTimeLimit_leavesValuesAtOrBelowTheCeilingUnchanged() {
        assertThat(guardrail.capSolverTimeLimit(10.0)).isEqualTo(10.0);
    }

    @Test
    void capSolverTimeLimit_defaultsToTheCeilingWhenNoValueWasRequested() {
        assertThat(guardrail.capSolverTimeLimit(null)).isEqualTo(DemoGenerationGuardrail.MAX_SOLVER_TIME_LIMIT_SECONDS);
    }
}
