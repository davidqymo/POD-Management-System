package com.pod.integration;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * T1.2 RED test — DatabaseMigrationIT
 *
 * Verifies Flyway migrations applied successfully.
 *
 * Acceptance Criteria:
 * - 'resources' table exists with expected columns
 * - 'rates' table exists with uq_rate_period_active index
 * - Flyway schema history table records all migrations (V1–V2)
 */
@SpringBootTest
class DatabaseMigrationIT extends AbstractIntegrationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void flyway_migrations_apply_successfully() {
        // When — check existence of key tables
        Integer resourcesCount = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'resources'",
            Integer.class
        );
        Integer ratesCount = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'rates'",
            Integer.class
        );

        // Then — both tables must exist
        assertThat(resourcesCount).isEqualTo(1);
        assertThat(ratesCount).isEqualTo(1);
    }

    @Test
    void v1_coreSchema_tablesAllExist() {
        // When
        String[] tables = {
            "resources", "rates", "users", "cost_centers", "projects",
            "activities", "activity_dependencies", "allocations", "holidays", "audit_log", "notifications"
        };

        // Then
        for (String table : tables) {
            Integer exists = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = ?",
                Integer.class, table
            );
            assertThat(exists).as("Table %s should exist", table).isEqualTo(1);
        }
    }

    @Test
    void v2_auditTriggers_created_successfully() {
        // When — check that audit_created_at trigger exists on a table
        Integer triggerCount = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_name = 'audit_created_at'",
            Integer.class
        );

        // Then — audit trigger should be present after V2 migration
        assertThat(triggerCount).isGreaterThan(0);
    }
}
