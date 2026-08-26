package com.vinibarros.optisched.optimization;

import com.vinibarros.optisched.exception.DemoGenerationLimitExceededException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * Protects the single production optimizer instance (one t3.micro EC2, see
 * docs/demo-sandbox-plan.md's "Achado crítico") from a public, unauthenticated
 * demo institution running expensive or unbounded solves. Two independent
 * limits, both scoped to isDemo institutions only — a real paying customer
 * is never affected:
 *
 * 1. {@link #capSolverTimeLimit} clamps the client-requested solver time
 *    limit down to a small ceiling, regardless of what was asked for.
 * 2. {@link #checkGenerationLimit} counts total generation attempts per
 *    demo institution via Redis (same INCR+EXPIRE fixed-window pattern as
 *    RateLimitingFilter, but keyed per-institution rather than per-IP, and
 *    living in this service rather than a global request filter since it's
 *    specific to one endpoint's business logic).
 */
@Component
public class DemoGenerationGuardrail {

    static final double MAX_SOLVER_TIME_LIMIT_SECONDS = 15.0;
    static final int MAX_GENERATIONS = 5;

    /**
     * Matches DemoService's own demo institution TTL — once the institution
     * itself is eligible for cleanup, there is no reason for its generation
     * counter to outlive it in Redis.
     */
    static final Duration COUNTER_TTL = Duration.ofHours(2);

    private final StringRedisTemplate redisTemplate;

    public DemoGenerationGuardrail(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    /**
     * Returns a boxed Double (not a primitive double) on purpose: the caller
     * ternary-selects between this and the request's own (nullable) Double,
     * and a primitive-returning method there would force Java to unbox the
     * other branch too, throwing an NPE whenever the client sent no value.
     */
    public Double capSolverTimeLimit(Double requestedSeconds) {
        if (requestedSeconds == null) {
            return MAX_SOLVER_TIME_LIMIT_SECONDS;
        }
        return Math.min(requestedSeconds, MAX_SOLVER_TIME_LIMIT_SECONDS);
    }

    public void checkGenerationLimit(Long institutionId) {
        String key = "demo:generate:" + institutionId;
        Long count = redisTemplate.opsForValue().increment(key);
        if (count != null && count == 1L) {
            redisTemplate.expire(key, COUNTER_TTL);
        }

        if (count != null && count > MAX_GENERATIONS) {
            throw new DemoGenerationLimitExceededException(
                    "This demo institution has reached its limit of " + MAX_GENERATIONS
                            + " schedule generations. Sign up for a full account to keep generating."
            );
        }
    }
}
