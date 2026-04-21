package com.pod.repository;

import com.pod.entity.Resource;
import com.pod.entity.ResourceCategory;
import com.pod.entity.ResourceStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.test.annotation.Rollback;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * ResourceRepositoryTest — TDD RED → GREEN → REFACTOR
 *
 * Tests repository queries:
 * - findByIdWithLock() : PESSIMISTIC_WRITE lock applied
 * - findByCostCenterAndTeam() : returns active resources matching cc+team
 * - findByFilters() : skill IN, level range -> Page<Resource>
 *
 * Uses @SpringBootTest with H2 in-memory database (PostgreSQL compatibility mode).
 * Configured explicitly to work without Docker on Windows dev environments.
 * NOTE: Will migrate to @DataJpaTest + Testcontainers PostgreSQL in Sprint 0 cleanup.
 */
@SpringBootTest
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
@ContextConfiguration(classes = {RepositoryTestConfig.class})
@Transactional
@Rollback
class ResourceRepositoryTest {

    @Autowired
    private ResourceRepository resourceRepository;

    @Test
    void findByIdWithLock_returnsResourceWithPessimisticLock() {
        // Given: a saved resource
        Resource saved = resourceRepository.save(Resource.builder()
            .externalId("LOCK-001")
            .name("Lock Test User")
            .costCenterId("ENG-CC1")
            .billableTeamCode("BTC-API")
            .category(ResourceCategory.PERMANENT)
            .status(ResourceStatus.ACTIVE)
            .skill("backend")
            .level(5)
            .isBillable(true)
            .isActive(true)
            .build());

        // When: repository performs read-with-PESSIMISTIC_WRITE lock
        Optional<Resource> found = resourceRepository.findByIdWithLock(saved.getId());

        // Then: resource loaded and lock applied
        assertThat(found).isPresent();
        assertThat(found.get().getExternalId()).isEqualTo("LOCK-001");
    }

    @Test
    void findByCostCenterAndTeam_returnsOnlyActiveResources() {
        // Given: mix of active and inactive resources in same CC+BTC
        resourceRepository.save(Resource.builder()
            .externalId("ACTIVE-01")
            .name("Active Resource One")
            .costCenterId("ENG-CC1")
            .billableTeamCode("BTC-API")
            .category(ResourceCategory.PERMANENT)
            .status(ResourceStatus.ACTIVE)
            .isBillable(true)
            .isActive(true)
            .build());
        resourceRepository.save(Resource.builder()
            .externalId("INACTIVE-01")
            .name("Inactive Resource One")
            .costCenterId("ENG-CC1")
            .billableTeamCode("BTC-API")
            .category(ResourceCategory.PERMANENT)
            .status(ResourceStatus.ACTIVE)
            .isBillable(true)
            .isActive(false)
            .build());

        // When
        List<Resource> results = resourceRepository.findByCostCenterAndTeam("ENG-CC1", "BTC-API");

        // Then: only active resources returned
        assertThat(results).hasSize(1);
        assertThat(results.get(0).getExternalId()).isEqualTo("ACTIVE-01");
    }

    @Test
    void findByFilters_skillAndLevelRange_returnsFilteredPage() {
        // Given: resources with mixed skills+levels
        resourceRepository.save(Resource.builder()
            .externalId("BACKEND-5")
            .name("Backend Senior")
            .costCenterId("ENG-CC1")
            .billableTeamCode("BTC-API")
            .category(ResourceCategory.PERMANENT)
            .status(ResourceStatus.ACTIVE)
            .skill("backend")
            .level(5)
            .isBillable(true)
            .isActive(true)
            .build());
        resourceRepository.save(Resource.builder()
            .externalId("FRONTEND-7")
            .name("Frontend Expert")
            .costCenterId("ENG-CC1")
            .billableTeamCode("BTC-API")
            .category(ResourceCategory.PERMANENT)
            .status(ResourceStatus.ACTIVE)
            .skill("frontend")
            .level(7)
            .isBillable(true)
            .isActive(true)
            .build());
        resourceRepository.save(Resource.builder()
            .externalId("BACKEND-3")
            .name("Backend Junior")
            .costCenterId("ENG-CC1")
            .billableTeamCode("BTC-API")
            .category(ResourceCategory.PERMANENT)
            .status(ResourceStatus.ACTIVE)
            .skill("backend")
            .level(3)
            .isBillable(true)
            .isActive(true)
            .build());

        // When: filter skill backend, level 4–6 with unpaged Pageable
        Page<Resource> page = resourceRepository.findByFilters(
            List.of("backend"), 4, 6, Pageable.unpaged()
        );

        // Then: only backend resources with level >=4 && <=6 returned
        assertThat(page.getContent()).hasSize(1);
        assertThat(page.getContent().get(0).getExternalId()).isEqualTo("BACKEND-5");
    }
}
