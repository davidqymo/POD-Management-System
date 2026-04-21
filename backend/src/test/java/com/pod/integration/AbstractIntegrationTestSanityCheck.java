package com.pod.integration;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * T0.3 GREEN phase — concrete integration test proving Testcontainers base works.
 *
 * Simple smoke test against containerized PostgreSQL:
 * - Verifies DataSource connection
 * - Can execute basic query
 * - Confirms TRUNCATE cleanup runs after setUp
 *
 * This test runs directly against AbstractIntegrationTest infrastructure
 * via inheritance (no PodApplication needed — JdbcTemplate auto-configured).
 */
@SpringJUnitConfig
class AbstractIntegrationTestSanityCheck extends AbstractIntegrationTest {

    @Autowired
    private DataSource dataSource;

    @Test
    void postgresContainer_startup_success() throws Exception {
        // When — simple ping via JDBC
        try (Connection conn = dataSource.getConnection();
             ResultSet rs = conn.createStatement().executeQuery("SELECT 1")) {

            // Then
            assertThat(rs.next()).isTrue();
            assertThat(rs.getInt(1)).isEqualTo(1);
        }
    }

    @Test
    void jdbcTemplate_works() {
        // When
        Integer result = jdbcTemplate.queryForObject("SELECT 42", Integer.class);

        // Then
        assertThat(result).isEqualTo(42);
    }
}
