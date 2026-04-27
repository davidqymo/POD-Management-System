package com.pod.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pod.dto.request.ApproveAllocationRequest;
import com.pod.dto.request.CreateAllocationRequest;
import com.pod.entity.*;
import com.pod.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * AllocationControllerIT — Integration tests for AllocationController REST API.
 * Uses H2 in-memory database for testing.
 */
@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1;MODE=PostgreSQL",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.datasource.username=sa",
    "spring.datasource.password=",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
    "spring.jpa.properties.hibernate.format_sql=true",
    "spring.flyway.enabled=false"
})
@Transactional
class AllocationControllerIT {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private AllocationRepository allocationRepository;

    @Autowired
    private ResourceRepository resourceRepository;

    @Autowired
    private ProjectRepository projectRepository;

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
    void createAllocation_validRequest_returns201() throws Exception {
        // Given
        CreateAllocationRequest request = CreateAllocationRequest.builder()
            .resourceId(resource.getId())
            .projectId(project.getId())
            .weekStart(LocalDate.of(2026, 4, 28))
            .hours(new BigDecimal("40"))
            .notes("Test allocation")
            .build();

        // When/Then
        mockMvc.perform(post("/api/v1/allocations")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").exists())
            .andExpect(jsonPath("$.resourceId").value(resource.getId()))
            .andExpect(jsonPath("$.projectId").value(project.getId()))
            .andExpect(jsonPath("$.hours").value(40))
            .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    void createAllocation_missingResource_returns404() throws Exception {
        // Given
        CreateAllocationRequest request = CreateAllocationRequest.builder()
            .resourceId(99999L)
            .projectId(project.getId())
            .weekStart(LocalDate.of(2026, 4, 28))
            .hours(new BigDecimal("40"))
            .build();

        // When/Then
        mockMvc.perform(post("/api/v1/allocations")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isNotFound());
    }

    @Test
    void createAllocation_missingProject_returns404() throws Exception {
        // Given
        CreateAllocationRequest request = CreateAllocationRequest.builder()
            .resourceId(resource.getId())
            .projectId(99999L)
            .weekStart(LocalDate.of(2026, 4, 28))
            .hours(new BigDecimal("40"))
            .build();

        // When/Then
        mockMvc.perform(post("/api/v1/allocations")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isNotFound());
    }

    @Test
    void createAllocation_missingRequiredFields_returns400() throws Exception {
        // Given - empty request
        CreateAllocationRequest request = CreateAllocationRequest.builder().build();

        // When/Then
        mockMvc.perform(post("/api/v1/allocations")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest());
    }

    @Test
    void listAllocations_noFilters_returnsAll() throws Exception {
        // Given
        createTestAllocation();

        // When/Then
        mockMvc.perform(get("/api/v1/allocations"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void listAllocations_filterByResource_returnsFiltered() throws Exception {
        // Given
        createTestAllocation();

        // When/Then
        mockMvc.perform(get("/api/v1/allocations")
                .param("resourceId", resource.getId().toString()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void listAllocations_filterByProject_returnsFiltered() throws Exception {
        // Given
        createTestAllocation();

        // When/Then
        mockMvc.perform(get("/api/v1/allocations")
                .param("projectId", project.getId().toString()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void listAllocations_filterByStatus_returnsFiltered() throws Exception {
        // Given
        createTestAllocation();

        // When/Then
        mockMvc.perform(get("/api/v1/allocations")
                .param("status", "PENDING"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1));

        // Filter by wrong status
        mockMvc.perform(get("/api/v1/allocations")
                .param("status", "APPROVED"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void getAllocation_existingId_returns200() throws Exception {
        // Given
        var allocation = createTestAllocation();

        // When/Then
        mockMvc.perform(get("/api/v1/allocations/{id}", allocation.getId()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(allocation.getId()))
            .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    void getAllocation_nonExistingId_returns404() throws Exception {
        // When/Then
        mockMvc.perform(get("/api/v1/allocations/{id}", 99999L))
            .andExpect(status().isNotFound());
    }

    @Test
    void approveAllocation_validRequest_returns200() throws Exception {
        // Given
        var allocation = createTestAllocation();

        ApproveAllocationRequest request = ApproveAllocationRequest.builder()
            .allocationId(allocation.getId())
            .approverId(2L)
            .reason("Approved for testing")
            .build();

        // When/Then
        mockMvc.perform(post("/api/v1/allocations/approve")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("APPROVED"))
            .andExpect(jsonPath("$.approvedBy").value(2));
    }

    @Test
    void approveAllocation_selfApproval_returns400() throws Exception {
        // Given
        var allocation = createTestAllocation();

        ApproveAllocationRequest request = ApproveAllocationRequest.builder()
            .allocationId(allocation.getId())
            .approverId(resource.getId()) // Same as resource - self approval
            .reason("Self approval")
            .build();

        // When/Then
        mockMvc.perform(post("/api/v1/allocations/approve")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest());
    }

    @Test
    void rejectAllocation_validRequest_returns200() throws Exception {
        // Given
        var allocation = createTestAllocation();

        ApproveAllocationRequest request = ApproveAllocationRequest.builder()
            .allocationId(allocation.getId())
            .approverId(2L)
            .reason("Rejected - reason provided")
            .build();

        // When/Then
        mockMvc.perform(post("/api/v1/allocations/reject")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("REJECTED"))
            .andExpect(jsonPath("$.rejectionReason").value("Rejected - reason provided"));
    }

    @Test
    void rejectAllocation_shortReason_returns400() throws Exception {
        // Given
        var allocation = createTestAllocation();

        ApproveAllocationRequest request = ApproveAllocationRequest.builder()
            .allocationId(allocation.getId())
            .approverId(2L)
            .reason("short") // Less than 10 chars
            .build();

        // When/Then
        mockMvc.perform(post("/api/v1/allocations/reject")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest());
    }

    private Allocation createTestAllocation() {
        return allocationRepository.save(Allocation.builder()
            .resource(resource)
            .project(project)
            .weekStartDate(LocalDate.of(2026, 4, 28))
            .hours(new BigDecimal("40"))
            .status(AllocationStatus.PENDING)
            .isActive(true)
            .build());
    }
}