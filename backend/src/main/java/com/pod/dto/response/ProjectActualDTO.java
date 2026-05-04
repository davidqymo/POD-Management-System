package com.pod.dto.response;

import com.pod.entity.ProjectActual;
import com.pod.entity.Resource;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.Hibernate;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProjectActualDTO {
    private Long id;
    private Long resourceId;
    private String resourceName;
    private String resourceExternalId;
    private String clarityId;
    private String projectName;
    private Map<String, BigDecimal> monthlyData;
    private String source;
    private Instant importedAt;
    private Instant createdAt;
    private Instant updatedAt;

    public static ProjectActualDTO fromEntity(ProjectActual entity) {
        Long resId = null;
        String resName = null;
        String resExtId = null;

        if (Hibernate.isInitialized(entity.getResource()) && entity.getResource() != null) {
            Resource res = entity.getResource();
            resId = res.getId();
            resName = res.getName();
            resExtId = res.getExternalId();
        }

        return ProjectActualDTO.builder()
                .id(entity.getId())
                .resourceId(resId)
                .resourceName(resName)
                .resourceExternalId(resExtId)
                .clarityId(entity.getClarityId())
                .projectName(entity.getProjectName())
                .monthlyData(entity.getMonthlyData())
                .source(entity.getSource() != null ? entity.getSource().name() : null)
                .importedAt(entity.getImportedAt())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}