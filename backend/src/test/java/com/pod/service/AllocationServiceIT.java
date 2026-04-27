package com.pod.service;

import com.pod.entity.*;
import com.pod.exception.FourEyesViolationException;
import com.pod.exception.ResourceNotFoundException;
import com.pod.repository.*;
import com.pod.repository.RepositoryTestConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.Rollback;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.*;

/**
 * AllocationServiceIT — Integration tests for AllocationService.
 * Uses H2 in-memory database for testing.
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
class AllocationServiceIT {

    @Autowired
    private AllocationService allocationService;

    @Autowired
    private AllocationRepository allocationRepository;

    @Autowired
    private ResourceRepository resourceRepository;

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private ActivityRepository activityRepository;

    private Resource resource;
    private Project project;

    @BeforeEach
    void setUp() {
        allocationRepository.deleteAll();
        resourceRepository.deleteAll();
        projectRepository.deleteAll();

        // Create test resource
        resource = Resource.builder()
            .externalId("RES-001")
            .name("Test Resource")
            .costCenterId("ENG-CC1")
            .billableTeamCode("BTC-API")
            .category(ResourceCategory.PERMANENT)
            .skill("backend")
            .level(3)
            .status(ResourceStatus.ACTIVE)
            .isBillable(true)
            .isActive(true)
            .build();
        resource = resourceRepository.save(resource);

        // Create test project
        project = Project.builder()
            .name("Test Project")
            .budgetTotalK(new BigDecimal("100.00"))
            .ownerUserId(1L)
            .status(ProjectStatus.REQUESTED)
            .build();
        project = projectRepository.save(project);
    }

    @Test
    void createAllocation_validInputs_createsPendingAllocation() {
        // Given
        LocalDate weekStart = LocalDate.of(2026, 4, 28);
        BigDecimal hours = new BigDecimal("40");

        // When
        Allocation allocation = allocationService.createAllocation(
            resource.getId(),
            project.getId(),
            null,
            weekStart,
            hours,
            "Test allocation"
        );

        // Then
        assertThat(allocation.getId()).isNotNull();
        assertThat(allocation.getResource().getId()).isEqualTo(resource.getId());
        assertThat(allocation.getProject().getId()).isEqualTo(project.getId());
        assertThat(allocation.getHours()).isEqualByComparingTo(hours);
        assertThat(allocation.getStatus()).isEqualTo(AllocationStatus.PENDING);
        assertThat(allocation.getWeekStartDate()).isEqualTo(weekStart);
    }

    @Test
    void createAllocation_duplicateWeek_throwsException() {
        // Given
        LocalDate weekStart = LocalDate.of(2026, 4, 28);
        allocationService.createAllocation(
            resource.getId(),
            project.getId(),
            null,
            weekStart,
            new BigDecimal("40"),
            null
        );

        // When/Then
        assertThatThrownBy(() ->
            allocationService.createAllocation(
                resource.getId(),
                project.getId(),
                null,
                weekStart,
                new BigDecimal("20"),
                null
            )
        ).isInstanceOf(IllegalStateException.class)
         .hasMessageContaining("Overlapping allocation exists");
    }

    @Test
    void createAllocation_invalidResource_throwsException() {
        // Given
        Long invalidResourceId = 99999L;

        // When/Then
        assertThatThrownBy(() ->
            allocationService.createAllocation(
                invalidResourceId,
                project.getId(),
                null,
                LocalDate.now(),
                new BigDecimal("40"),
                null
            )
        ).isInstanceOf(ResourceNotFoundException.class)
         .hasMessageContaining("Resource not found");
    }

    @Test
    void createAllocation_invalidProject_throwsException() {
        // Given
        Long invalidProjectId = 99999L;

        // When/Then
        assertThatThrownBy(() ->
            allocationService.createAllocation(
                resource.getId(),
                invalidProjectId,
                null,
                LocalDate.now(),
                new BigDecimal("40"),
                null
            )
        ).isInstanceOf(ResourceNotFoundException.class)
         .hasMessageContaining("Project not found");
    }

    @Test
    void createAllocation_zeroHours_throwsException() {
        // When/Then
        assertThatThrownBy(() ->
            allocationService.createAllocation(
                resource.getId(),
                project.getId(),
                null,
                LocalDate.now(),
                BigDecimal.ZERO,
                null
            )
        ).isInstanceOf(IllegalArgumentException.class)
         .hasMessageContaining("hours must be > 0");
    }

    @Test
    void createAllocation_negativeHours_throwsException() {
        // When/Then
        assertThatThrownBy(() ->
            allocationService.createAllocation(
                resource.getId(),
                project.getId(),
                null,
                LocalDate.now(),
                new BigDecimal("-10"),
                null
            )
        ).isInstanceOf(IllegalArgumentException.class)
         .hasMessageContaining("hours must be > 0");
    }

    @Test
    void approveAllocation_validAllocation_approvesSuccessfully() {
        // Given
        Allocation allocation = allocationService.createAllocation(
            resource.getId(),
            project.getId(),
            null,
            LocalDate.of(2026, 4, 28),
            new BigDecimal("40"),
            null
        );

        // When
        Allocation approved = allocationService.approveAllocation(
            allocation.getId(),
            2L, // different user
            "Approved for testing"
        );

        // Then
        assertThat(approved.getStatus()).isEqualTo(AllocationStatus.APPROVED);
        assertThat(approved.getApprovedBy()).isEqualTo(2L);
        assertThat(approved.getApprovedAt()).isNotNull();
    }

    @Test
    void approveAllocation_selfApproval_throwsFourEyesViolation() {
        // Given
        Allocation allocation = allocationService.createAllocation(
            resource.getId(),
            project.getId(),
            null,
            LocalDate.of(2026, 4, 28),
            new BigDecimal("40"),
            null
        );

        // When/Then - resource.getId() is the same as approverId
        assertThatThrownBy(() ->
            allocationService.approveAllocation(
                allocation.getId(),
                resource.getId(),
                "Self approval attempt"
            )
        ).isInstanceOf(FourEyesViolationException.class)
         .hasMessageContaining("approver cannot be the allocated resource");
    }

    @Test
    void approveAllocation_alreadyApproved_throwsException() {
        // Given
        Allocation allocation = allocationService.createAllocation(
            resource.getId(),
            project.getId(),
            null,
            LocalDate.of(2026, 4, 28),
            new BigDecimal("40"),
            null
        );
        allocationService.approveAllocation(allocation.getId(), 2L, null);

        // When/Then
        assertThatThrownBy(() ->
            allocationService.approveAllocation(allocation.getId(), 2L, null)
        ).isInstanceOf(IllegalStateException.class)
         .hasMessageContaining("PENDING status");
    }

    @Test
    void rejectAllocation_validAllocation_rejectsSuccessfully() {
        // Given
        Allocation allocation = allocationService.createAllocation(
            resource.getId(),
            project.getId(),
            null,
            LocalDate.of(2026, 4, 28),
            new BigDecimal("40"),
            null
        );

        // When
        Allocation rejected = allocationService.rejectAllocation(
            allocation.getId(),
            2L,
            "Resource is over-allocated this week"
        );

        // Then
        assertThat(rejected.getStatus()).isEqualTo(AllocationStatus.REJECTED);
        assertThat(rejected.getRejectionReason()).isEqualTo("Resource is over-allocated this week");
        assertThat(rejected.getApprovedBy()).isEqualTo(2L);
    }

    @Test
    void rejectAllocation_shortReason_throwsException() {
        // Given
        Allocation allocation = allocationService.createAllocation(
            resource.getId(),
            project.getId(),
            null,
            LocalDate.of(2026, 4, 28),
            new BigDecimal("40"),
            null
        );

        // When/Then
        assertThatThrownBy(() ->
            allocationService.rejectAllocation(
                allocation.getId(),
                2L,
                "short" // less than 10 chars
            )
        ).isInstanceOf(IllegalArgumentException.class)
         .hasMessageContaining("at least 10 characters");
    }

    @Test
    void rejectAllocation_selfRejection_throwsFourEyesViolation() {
        // Given
        Allocation allocation = allocationService.createAllocation(
            resource.getId(),
            project.getId(),
            null,
            LocalDate.of(2026, 4, 28),
            new BigDecimal("40"),
            null
        );

        // When/Then
        assertThatThrownBy(() ->
            allocationService.rejectAllocation(
                allocation.getId(),
                resource.getId(),
                "Self rejection attempt"
            )
        ).isInstanceOf(FourEyesViolationException.class)
         .hasMessageContaining("rejector cannot be the allocated resource");
    }

    @Test
    void findByResource_returnsAllocationsForResource() {
        // Given
        allocationService.createAllocation(
            resource.getId(),
            project.getId(),
            null,
            LocalDate.of(2026, 4, 28),
            new BigDecimal("40"),
            null
        );

        // When
        var allocations = allocationService.findByResource(resource.getId());

        // Then
        assertThat(allocations).hasSize(1);
        assertThat(allocations.get(0).getResource().getId()).isEqualTo(resource.getId());
    }

    @Test
    void findById_existingAllocation_returnsAllocation() {
        // Given
        Allocation created = allocationService.createAllocation(
            resource.getId(),
            project.getId(),
            null,
            LocalDate.of(2026, 4, 28),
            new BigDecimal("40"),
            null
        );

        // When
        Allocation found = allocationService.findById(created.getId());

        // Then
        assertThat(found.getId()).isEqualTo(created.getId());
    }

    @Test
    void findById_nonExistingAllocation_throwsException() {
        // When/Then
        assertThatThrownBy(() ->
            allocationService.findById(99999L)
        ).isInstanceOf(ResourceNotFoundException.class)
         .hasMessageContaining("Allocation not found");
    }
}