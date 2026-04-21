package com.pod.integration;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * T0.2 Seed Files Integration Test.
 *
 * Verifies that SQL seed files (cost_centers, holidays_2026, test_users, skills)
 * have been applied after Flyway migration.
 *
 * RED phase: Test will fail because seed files don't exist yet.
 * GREEN phase: Create SQL files under src/main/resources/db/migration/
 * REFACTOR: Clean queries, add indexes check, verify referential integrity.
 */
@SpringBootTest
class SeedFilesIT {

    @Autowired
    private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    @Test
    void costCenters_seeded_withExpectedRowCount() {
        // When
        Integer count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM cost_centers",
            Integer.class
        );

        // Then — T0.2 AC: 12 cost centers exist after migration V1.1
        assertThat(count)
            .as("Cost centers table should have 12 seeded rows")
            .isEqualTo(12);
    }

    @Test
    void holidays_2026_seeded_withExpectedCount() {
        // When
        Integer count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM holidays WHERE EXTRACT(YEAR FROM holiday_date) = 2026",
            Integer.class
        );

        // Then — T0.2 AC: holiday_2026 has 10 entries (V1.2)
        assertThat(count)
            .as("Holidays for 2026 should have 10 seeded rows")
            .isEqualTo(10);
    }

    @Test
    void testUsers_seeded_withExpectedCount() {
        // When
        Integer count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM users WHERE email LIKE '%@pod.internal'",
            Integer.class
        );

        // Then — T0.2 AC: test_users.sql provides 5 test accounts (V1.3)
        assertThat(count)
            .as("Test users should be seeded for integration test usage")
            .isEqualTo(5);
    }

    @Test
    void skills_seeded_withCoreSkills() {
        // When
        Integer count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM skills",
            Integer.class
        );

        // Then — T0.2 AC: skills table has 20 core skill entries (V1.4)
        assertThat(count)
            .as("Skills lookup should be seeded")
            .isEqualTo(20);
    }
}
