package com.pod.controller;

import com.pod.config.SecurityConfig;
import com.pod.entity.Resource;
import com.pod.entity.ResourceCategory;
import com.pod.entity.ResourceStatus;
import com.pod.service.ResourceService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ResourceController.class)
@Import(SecurityConfig.class)
class ResourceControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ResourceService resourceService;

    @Test
    void getAll_withoutFilters_returnsPaginatedResponse() throws Exception {
        // Given
        List<Resource> resourceList = List.of(
                Resource.builder()
                        .id(2L)
                        .externalId("EMP-002")
                        .name("Mike Chen")
                        .costCenterId("ENG-CC1")
                        .billableTeamCode("BTC-API")
                        .category(ResourceCategory.PERMANENT)
                        .status(ResourceStatus.ACTIVE)
                        .skill("frontend")
                        .level(4)
                        .isBillable(true)
                        .isActive(true)
                        .build(),
                Resource.builder()
                        .id(1L)
                        .externalId("EMP-001")
                        .name("Sarah Liu")
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
        Page<Resource> page = new PageImpl<>(resourceList, PageRequest.of(0, 20, Sort.by("name")), resourceList.size());

        when(resourceService.findAllWithFilters(any(), any(), any(), any(), any())).thenReturn(page);

        // When/Then
        mockMvc.perform(get("/api/v1/resources"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.size").value(20))
                .andExpect(jsonPath("$.content[0].name").value("Mike Chen"))
                .andExpect(jsonPath("$.content[1].name").value("Sarah Liu"));
    }

    @Test
    void getAll_withFilters_returnsPaginatedResponse() throws Exception {
        // Given
        List<Resource> resourceList = List.of(
                Resource.builder()
                        .id(1L)
                        .externalId("EMP-001")
                        .name("Sarah Liu")
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
        Page<Resource> page = new PageImpl<>(resourceList, PageRequest.of(0, 10, Sort.by("name")), resourceList.size());

        when(resourceService.findAllWithFilters(any(), eq("backend"), any(), eq("ACTIVE"), any())).thenReturn(page);

        // When/Then
        mockMvc.perform(get("/api/v1/resources")
                        .param("skill", "backend")
                        .param("status", "ACTIVE")
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.size").value(10))
                .andExpect(jsonPath("$.content[0].skill").value("backend"))
                .andExpect(jsonPath("$.content[0].status").value("ACTIVE"));
    }
}
