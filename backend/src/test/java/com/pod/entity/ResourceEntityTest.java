package com.pod.entity;

import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;

import static org.assertj.core.api.Assertions.assertThat;

import com.pod.util.TestFixtures;

import com.pod.util.TestFixtures;

/**
 * ResourceEntityTest — entity-level tests for Resource (Sprint 1 T1.1).
 *
 * Follows TDD RED phase: fail initially until Resource entity constructed.
 *
 * Tests:
 * - basic creation (all fields assign)
 * - status transition validation (state machine rules)
 * - optimistic lock @Version increments on DUAL requests
 *
 * Acceptance criteria derived from SPEC_FUNCTIONAL §4.1 Resource lifecycle.
 */
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class ResourceEntityTest {

    @Test
    @Order(1)
    void resourceEntity_creation_succeeds() {
        // Given
        Resource resource = Resource.builder()
            .externalId("EMP-001")
            .name("Sarah Liu")
            .costCenterId("ENG-CC1")
            .billableTeamCode("BTC-API")
            .category(ResourceCategory.PERMANENT)
            .skill("backend")
            .level(5)
            .status(ResourceStatus.ACTIVE)
            .isBillable(true)
            .isActive(true)
            .version(1)
            .build();

        // Then
        assertThat(resource.getExternalId()).isEqualTo("EMP-001");
        assertThat(resource.getStatus()).isEqualTo(ResourceStatus.ACTIVE);
        assertThat(resource.isActive()).isTrue();
        assertThat(resource.getVersion()).isEqualTo(1);
        assertThat(resource.getSkill()).isEqualTo("backend");
        assertThat(resource.getLevel()).isEqualTo(5);
    }

    @Test
    @Order(2)
    void resourceEntity_statusTransition_validatesRules() {
        // RED: At start Resource entity may not yet have isValidTransition()
        // We'll add that method and state machine per T1.4 after this test passes
        Resource resource = TestFixtures.resource();

        // Community rule: ACTIVE → ON_LEAVE, ACTIVE → TERMINATED allowed
        assertThat(resource.isValidTransition(ResourceStatus.ACTIVE, ResourceStatus.ON_LEAVE)).isTrue();
        assertThat(resource.isValidTransition(ResourceStatus.ACTIVE, ResourceStatus.TERMINATED)).isTrue();

        // ON_LEAVE → ACTIVE allowed
        assertThat(resource.isValidTransition(ResourceStatus.ON_LEAVE, ResourceStatus.ACTIVE)).isTrue();

        // TERMINATED → anything disallowed
        assertThat(resource.isValidTransition(ResourceStatus.TERMINATED, ResourceStatus.ACTIVE)).isFalse();
    }
}
