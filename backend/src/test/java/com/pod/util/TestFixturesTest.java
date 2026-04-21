package com.pod.util;

import com.pod.entity.Resource;
import com.pod.entity.ResourceStatus;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.params.provider.CsvSource;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * TestFixturesTest — verifies TestFixtures utility produces valid Resource entities.
 *
 * T0.1 Acceptance: TestFixtures.resource() returns a valid Resource entity with
 * randomized realistic data (name, cost_center, skill, level, rates pattern).
 */
class TestFixturesTest {

    @Test
    void resource_returnsValidResourceEntity() {
        // Given
        Resource resource = TestFixtures.resource();

        // Then — structural validity
        assertThat(resource)
            .isNotNull();

        // External ID format
        assertThat(resource.getExternalId())
            .isNotNull()
            .startsWith("EMP-")
            .matches("EMP-\\d{3}");

        // Name: non-blank, at least 2 chars
        assertThat(resource.getName())
            .isNotBlank()
            .hasSizeGreaterThan(2);

        // Cost center code format: LETTERS-CCDIGIT
        assertThat(resource.getCostCenterId())
            .isNotNull()
            .matches("[A-Z]{2,5}-CC\\d");

        // Billable team format: BTC-PREFIX
        assertThat(resource.getBillableTeamCode())
            .isNotNull()
            .startsWith("BTC-")
            .hasSizeGreaterThan(4);

        // Skill (non-null, reasonable string)
        assertThat(resource.getSkill())
            .isNotNull()
            .isNotBlank()
            .hasSizeBetween(3, 20);

        // Level: 1–10
        assertThat(resource.getLevel())
            .isNotNull()
            .isBetween(1, 10);

        // Status and active state
        assertThat(resource.getStatus()).isEqualTo(ResourceStatus.ACTIVE);
        assertThat(resource.isBillable()).isTrue();
        assertThat(resource.isActive()).isTrue();
        assertThat(resource.getVersion()).isEqualTo(1);
    }

    @Test
    void resource_withCustomOverrides_appliesAllFields() {
        // Given — custom values
        String customExternalId = "CUSTOM-001";
        String customName = "Custom User";
        String customCostCenter = "FIN-CC1";
        String customSkill = "frontend";

        // When
        Resource resource = TestFixtures.resource(
            customExternalId,
            customName,
            customCostCenter,
            "BTC-WEB",
            customSkill,
            7
        );

        // Then — all overrides applied
        assertThat(resource.getExternalId()).isEqualTo(customExternalId);
        assertThat(resource.getName()).isEqualTo(customName);
        assertThat(resource.getCostCenterId()).isEqualTo(customCostCenter);
        assertThat(resource.getBillableTeamCode()).isEqualTo("BTC-WEB");
        assertThat(resource.getSkill()).isEqualTo(customSkill);
        assertThat(resource.getLevel()).isEqualTo(7);
        assertThat(resource.getStatus()).isEqualTo(ResourceStatus.ACTIVE);
        assertThat(resource.isActive()).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {"backend", "frontend", "devops", "qa", "pm"})
    void resource_withValidSkillType_acceptsSkill(String skill) {
        // When
        Resource withSkill = TestFixtures.resource("EMP-1", "Name", "CC1", "BTC1", skill, 5);

        // Then
        assertThat(withSkill.getSkill()).isEqualTo(skill);
    }

    @Test
    void resource_version_isOneByDefault() {
        assertThat(TestFixtures.resource().getVersion()).isEqualTo(1);
    }
}
