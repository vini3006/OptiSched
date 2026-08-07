package com.vinibarros.optisched.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.utility.DockerImageName;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

/**
 * Binds a real Redis (Testcontainers) instead of mocking StringRedisTemplate
 * — INCR/EXPIRE semantics are exactly the kind of behavior a mock would get
 * subtly wrong. Every test below uses its own dedicated fake IP, so they
 * stay isolated from each other despite sharing one Redis for the class.
 */
class RateLimitingFilterTest {

    static final GenericContainer<?> REDIS =
            new GenericContainer<>(DockerImageName.parse("redis:7-alpine")).withExposedPorts(6379);

    static LettuceConnectionFactory connectionFactory;

    private RateLimitingFilter filter;
    private FilterChain chain;

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

        filter = new RateLimitingFilter(redisTemplate);
        chain = mock(FilterChain.class);
    }

    /**
     * MockHttpServletRequest doesn't derive servletPath from the request URI
     * the way a real DispatcherServlet-mapped-at-"/" container does (same
     * assumption InstitutionFilter already relies on) — has to be set
     * explicitly here for RateLimitingFilter's getServletPath() match to work.
     */
    private MockHttpServletRequest request(String method, String path) {
        MockHttpServletRequest request = new MockHttpServletRequest(method, path);
        request.setServletPath(path);
        return request;
    }

    private MockHttpServletRequest loginRequest(String ip) {
        MockHttpServletRequest request = request("POST", "/auth/login");
        request.setRemoteAddr(ip);
        return request;
    }

    @Test
    void allowsRequestsUpToTheLimit() throws Exception {
        for (int i = 0; i < 5; i++) {
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilterInternal(loginRequest("10.0.0.1"), response, chain);
            assertThat(response.getStatus()).isEqualTo(200);
        }
        verify(chain, times(5)).doFilter(any(ServletRequest.class), any(ServletResponse.class));
    }

    @Test
    void rejectsTheRequestThatExceedsTheLimit() throws Exception {
        for (int i = 0; i < 5; i++) {
            filter.doFilterInternal(loginRequest("10.0.0.2"), new MockHttpServletResponse(), chain);
        }

        MockHttpServletResponse sixth = new MockHttpServletResponse();
        filter.doFilterInternal(loginRequest("10.0.0.2"), sixth, chain);

        assertThat(sixth.getStatus()).isEqualTo(429);
        verify(chain, times(5)).doFilter(any(ServletRequest.class), any(ServletResponse.class));
    }

    @Test
    void tracksDifferentIpsIndependently() throws Exception {
        for (int i = 0; i < 5; i++) {
            filter.doFilterInternal(loginRequest("10.0.0.3"), new MockHttpServletResponse(), chain);
        }

        // A different client IP must not be affected by 10.0.0.3's exhausted bucket.
        MockHttpServletResponse fromAnotherIp = new MockHttpServletResponse();
        filter.doFilterInternal(loginRequest("10.0.0.4"), fromAnotherIp, chain);

        assertThat(fromAnotherIp.getStatus()).isEqualTo(200);
        verify(chain, times(6)).doFilter(any(ServletRequest.class), any(ServletResponse.class));
    }

    @Test
    void tracksDifferentPathsIndependentlyForTheSameIp() throws Exception {
        for (int i = 0; i < 5; i++) {
            filter.doFilterInternal(loginRequest("10.0.0.5"), new MockHttpServletResponse(), chain);
        }

        // /auth/login is exhausted, but /auth/forgot-password has its own budget.
        MockHttpServletRequest forgotPassword = request("POST", "/auth/forgot-password");
        forgotPassword.setRemoteAddr("10.0.0.5");
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilterInternal(forgotPassword, response, chain);

        assertThat(response.getStatus()).isEqualTo(200);
        verify(chain, times(6)).doFilter(any(ServletRequest.class), any(ServletResponse.class));
    }

    @Test
    void forgotPasswordHasItsOwnLowerLimit() throws Exception {
        MockHttpServletResponse last = null;
        for (int i = 0; i < 4; i++) {
            MockHttpServletRequest request = request("POST", "/auth/forgot-password");
            request.setRemoteAddr("10.0.0.6");
            last = new MockHttpServletResponse();
            filter.doFilterInternal(request, last, chain);
        }

        assertThat(last.getStatus()).isEqualTo(429);
        verify(chain, times(3)).doFilter(any(ServletRequest.class), any(ServletResponse.class));
    }

    @Test
    void doesNotRateLimitUnrelatedPaths() throws Exception {
        MockHttpServletRequest request = request("POST", "/auth/logout");
        request.setRemoteAddr("10.0.0.7");

        for (int i = 0; i < 20; i++) {
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilterInternal(request, response, chain);
            assertThat(response.getStatus()).isEqualTo(200);
        }
        verify(chain, times(20)).doFilter(any(ServletRequest.class), any(ServletResponse.class));
    }

    @Test
    void doesNotRateLimitNonPostRequestsToTheSamePath() throws Exception {
        MockHttpServletRequest request = request("GET", "/auth/login");
        request.setRemoteAddr("10.0.0.8");

        for (int i = 0; i < 20; i++) {
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilterInternal(request, response, chain);
            assertThat(response.getStatus()).isEqualTo(200);
        }
        verify(chain, times(20)).doFilter(any(ServletRequest.class), any(ServletResponse.class));
    }
}
