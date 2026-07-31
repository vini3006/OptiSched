package com.vinibarros.optisched.support;

import org.junit.jupiter.api.Tag;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * Shared base for tests that need a real Postgres + Flyway migrations, rather
 * than mocks — the same version pinned in the project's docker-compose.yml so
 * behavior matches production.
 *
 * Deliberately NOT annotated with @Testcontainers/@Container: that lifecycle
 * manager starts/stops the container per test CLASS, even for static fields —
 * which breaks Spring's context cache across multiple subclasses (a second
 * test class gets a fresh container on a new port while Spring still holds a
 * cached ApplicationContext pointing at the first, now-stopped, container's
 * port). Starting it once in a static initializer instead makes it a true
 * JVM-wide singleton for the whole test run; Testcontainers' own Ryuk reaper
 * cleans it up on JVM exit, so no explicit stop() is needed.
 */
@Tag("integration")
@SpringBootTest
public abstract class AbstractIntegrationTest {

    static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>(DockerImageName.parse("postgres:16"));

    static {
        POSTGRES.start();
    }

    @DynamicPropertySource
    static void registerProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);

        registry.add("spring.flyway.placeholders.superadmin.email", () -> "superadmin@test.local");
        registry.add("spring.flyway.placeholders.superadmin.password", () -> "$2a$10$test.hash.placeholder.value.only");

        registry.add("app.cookie.secure", () -> "false");
        registry.add("spring.security.oauth2.resourceserver.jwt.private-key", () -> "classpath:test-jwt-private.pem");
        registry.add("spring.security.oauth2.resourceserver.jwt.public-key", () -> "classpath:test-jwt-public.pem");
    }
}
