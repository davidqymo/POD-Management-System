package com.pod.service;

import com.pod.entity.Resource;
import com.pod.entity.ResourceCategory;
import com.pod.entity.ResourceStatus;
import com.pod.exception.InvalidStatusTransitionException;
import com.pod.repository.ResourceRepository;
import com.pod.repository.RepositoryTestConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.Rollback;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * ResourceServiceTest — TDD RED → GREEN → REFACTOR for changeStatus().
 *
 * Tests:
 *   - testChangeStatus_validTransition_succeeds()
 *   - testChangeStatus_invalidTransition_throws()
 */
@SpringBootTest
@ContextConfiguration(classes = RepositoryTestConfig.class)
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1;MODE=PostgreSQL",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.datasource.username=sa",
    "spring.datasource.password=",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
    "spring.jpa.properties.hibernate.format_sql=true",
    "spring.flyway.enabled=false",
    "spring.main.allow-bean-definition-overriding=true"
})
@Transactional
@Rollback
class ResourceServiceTest {

    @Autowired
    private ResourceService resourceService;

    @Autowired
    private ResourceRepository resourceRepository;

    @Test
    void testChangeStatus_validTransition_ACTIVE_to_ON_LEAVE_succeeds() {
        // Given: an ACTIVE resource
        Resource saved = resourceRepository.save(Resource.builder()
            .externalId("STATUS-001")
            .name("Status Test User")
            .costCenterId("ENG-CC1")
            .billableTeamCode("BTC-API")
            .category(ResourceCategory.PERMANENT)
            .status(ResourceStatus.ACTIVE)
            .skill("backend")
            .level(5)
            .isBillable(true)
            .isActive(true)
            .build());

        // When: change status to ON_LEAVE
        resourceService.changeStatus(saved.getId(), ResourceStatus.ON_LEAVE, "PTO request");

        // Then: resource status is updated
        Optional<Resource> updatedOpt = resourceRepository.findById(saved.getId());
        assertThat(updatedOpt).isPresent();
        assertThat(updatedOpt.get().getStatus()).isEqualTo(ResourceStatus.ON_LEAVE);
    }

    @Test
    void testChangeStatus_invalidTransition_TERMINATED_to_ACTIVE_throws() {
        // Given: a TERMINATED resource
        Resource saved = resourceRepository.save(Resource.builder()
            .externalId("STATUS-002")
            .name("Terminated User")
            .costCenterId("ENG-CC1")
            .billableTeamCode("BTC-API")
            .category(ResourceCategory.PERMANENT)
            .status(ResourceStatus.TERMINATED)
            .skill("frontend")
            .level(3)
            .isBillable(true)
            .isActive(true)
            .build());

        // When/Then: trying to set ACTIVE throws InvalidStatusTransitionException
        assertThatThrownBy(() ->
            resourceService.changeStatus(saved.getId(), ResourceStatus.ACTIVE, "rehire")
        )
        .isInstanceOf(InvalidStatusTransitionException.class)
        .hasMessageContaining("Invalid status transition");
    }
}
