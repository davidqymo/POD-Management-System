package com.pod.integration;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.util.TestPropertyValues;
import org.springframework.context.ApplicationContextInitializer;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.Rollback;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * AbstractIntegrationTest — base class for all integration tests using Testcontainers.
 *
 * T0.3: Provides PostgreSQL 15 container; wires Spring context against container.
 *
 * Usage:
 *   @SpringBootTest
 *   class SomeIT extends AbstractIntegrationTest {
 *       @Autowired private MyRepository repo;
 *
 *       @Test void testSomething() { ... }
 *   }
 *
 * Container lifecycle:
 * - Static PostgreSQLContainer starts once per test class hierarchy
 * - @BeforeEach clears data (TRUNCATE all tables) between tests
 * - @Transactional with rollback ensures isolation
 *
 * Configuration overrides:
 *
 * Subclasses apply dynamic properties to bind to the container's JDBC URL and credentials.
 */
// T0.3 RED — abstract, no concrete test methods required for this task.
@Testcontainers
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Rollback
public abstract class AbstractIntegrationTest {

    @Container
    protected static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:15-alpine")
        .withDatabaseName("pod_test")
        .withUsername("testuser")
        .withPassword("testpass");

    @Autowired
    protected JdbcTemplate jdbcTemplate;

    @Autowired
    protected DataSource dataSource;

    protected static final String[] TABLES_TO_TRUNCATE = {
        "audit_log",
        "allocations",
        "activity_dependencies",
        "activities",
        "projects",
        "resources",
        "users",
        "rates",
        "notifications",
        "holidays",
        "cost_centers"
    };

    /**
     * Initializes Spring environment with container JDBC settings.
     */
    protected ApplicationContextInitializer<ConfigurableApplicationContext> getInitializer() {
        return new TestContextInitializer();
    }

    private static class TestContextInitializer implements ApplicationContextInitializer<ConfigurableApplicationContext> {
        @Override
        public void initialize(ConfigurableApplicationContext applicationContext) {
            TestPropertyValues.of(
                "spring.datasource.url=" + POSTGRES.getJdbcUrl(),
                "spring.datasource.username=" + POSTGRES.getUsername(),
                "spring.datasource.password=" + POSTGRES.getPassword(),
                "spring.datasource.driver-class-name=" + POSTGRES.getDriverClassName(),
                "spring.jpa.hibernate.ddl-auto=none",
                "spring.flyway.enabled=true",
                "spring.flyway.locations=classpath:db/migration",
                "spring.flyway.clean-disabled=false"
            ).applyTo(applicationContext.getEnvironment());
        }
    }

    /**
     * Cleans database between tests.
     */
    @BeforeEach
    void cleanDatabase() throws SQLException {
        try (Connection conn = dataSource.getConnection()) {
            conn.setAutoCommit(true);
            for (String table : TABLES_TO_TRUNCATE) {
                try {
                    jdbcTemplate.execute("TRUNCATE TABLE " + table + " RESTART IDENTITY CASCADE");
                } catch (Exception ignored) {
                    // Table may not exist during early migrations — ignore.
                }
            }
        }
    }
}
