package com.pod.controller;

import com.pod.PodApplication;
import com.pod.entity.Resource;
import com.pod.entity.ResourceCategory;
import com.pod.entity.ResourceStatus;
import com.pod.service.ResourceService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.Rollback;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * ResourceControllerTest — TDD RED → GREEN → REFACTOR for ResourceController.
 *
 * Tests:
 *   - testGetAllResources_returnsResourceList()
 *   - testGetResourceById_returnsResource()
 *   - testCreateResource_returnsCreated()
 *   - testPatchResourceStatus_returnsOk()
 *   - testPatchExternalId_returns400()
 */
@SpringBootTest(classes = PodApplication.class)
@AutoConfigureMockMvc(addFilters = false)
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1;MODE=PostgreSQL",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.datasource.username=sa",
    "spring.datasource.password=",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
    "spring.flyway.enabled=false",
    "spring.main.allow-bean-definition-overriding=true"
})
@Transactional
@Rollback
class ResourceControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ResourceService resourceService;

    @Test
    void testGetAllResources_returnsResourceList() throws Exception {
        // Given: mock service returns list
        List<Resource> resources = List.of(
            Resource.builder()
                .id(1L)
                .externalId("RES-001")
                .name("John Doe")
                .costCenterId("ENG-CC1")
                .billableTeamCode("BTC-API")
                .category(ResourceCategory.PERMANENT)
                .status(ResourceStatus.ACTIVE)
                .skill("backend")
                .level(5)
                .isBillable(true)
                .isActive(true)
                .build()
        );
        when(resourceService.findAll()).thenReturn(resources);

        // When/Then: GET /api/v1/resources returns 200 with JSON
        mockMvc.perform(get("/api/v1/resources"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].externalId").value("RES-001"))
            .andExpect(jsonPath("$[0].name").value("John Doe"));
    }

    @Test
    void testGetResourceById_returnsResource() throws Exception {
        // Given
        Resource resource = Resource.builder()
            .id(1L)
            .externalId("RES-002")
            .name("Jane Smith")
            .costCenterId("ENG-CC2")
            .billableTeamCode("BTC-FRONTEND")
            .category(ResourceCategory.CONTRACTOR)
            .status(ResourceStatus.ACTIVE)
            .skill("frontend")
            .level(4)
            .isBillable(true)
            .isActive(true)
            .build();
        when(resourceService.findById(1L)).thenReturn(Optional.of(resource));

        // When/Then
        mockMvc.perform(get("/api/v1/resources/1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.externalId").value("RES-002"))
            .andExpect(jsonPath("$.skill").value("frontend"));
    }

    @Test
    void testGetResourceById_notFound_returns404() throws Exception {
        when(resourceService.findById(999L)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/resources/999"))
            .andExpect(status().isNotFound());
    }

    @Test
    void testCreateResource_returnsCreated() throws Exception {
        // Given
        String json = """
            {
                "externalId": "RES-003",
                "name": "New User",
                "costCenterId": "ENG-CC1",
                "billableTeamCode": "BTC-API",
                "category": "PERMANENT",
                "skill": "backend",
                "level": 3,
                "isBillable": true
            }
            """;

        Resource saved = Resource.builder()
            .id(3L)
            .externalId("RES-003")
            .name("New User")
            .costCenterId("ENG-CC1")
            .billableTeamCode("BTC-API")
            .category(ResourceCategory.PERMANENT)
            .status(ResourceStatus.ACTIVE)
            .skill("backend")
            .level(3)
            .isBillable(true)
            .isActive(true)
            .build();
        when(resourceService.create(any(Resource.class))).thenReturn(saved);

        // When/Then
        mockMvc.perform(post("/api/v1/resources")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
            .andExpect(status().isCreated())
            .andExpect(header().string("Location", "/api/v1/resources/3"))
            .andExpect(jsonPath("$.id").value(3));
    }

    @Test
    void testPatchResourceStatus_returnsOk() throws Exception {
        // Given
        String json = """
            {
                "status": "ON_LEAVE",
                "reason": "Annual leave"
            }
            """;

        // When/Then
        mockMvc.perform(patch("/api/v1/resources/1/status")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
            .andExpect(status().isOk());

        verify(resourceService).changeStatus(1L, ResourceStatus.ON_LEAVE, "Annual leave");
    }

    @Test
    void testPatchExternalId_returns400() throws Exception {
        // Given: attempting to patch immutable field externalId
        String json = """
            {
                "externalId": "CHANGED-ID"
            }
            """;

        // When/Then: should return 400 BAD_REQUEST
        mockMvc.perform(patch("/api/v1/resources/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("FIELD_READ_ONLY"))
            .andExpect(jsonPath("$.message").value("externalId is read-only"));
    }

    @Test
    void testDeleteResource_returnsNoContent() throws Exception {
        // When/Then
        mockMvc.perform(delete("/api/v1/resources/1"))
            .andExpect(status().isNoContent());

        verify(resourceService).deactivate(1L);
    }
}