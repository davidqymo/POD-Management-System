package com.pod.service;

import com.pod.dto.response.GanttResponse;
import com.pod.entity.Activity;
import com.pod.entity.ActivityDependency;
import com.pod.entity.Project;
import com.pod.entity.ProjectStatus;
import com.pod.exception.CycleDetectedException;
import com.pod.repository.ActivityDependencyRepository;
import com.pod.repository.ActivityRepository;
import com.pod.repository.ProjectRepository;
import com.pod.repository.RepositoryTestConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.Rollback;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

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
class GanttServiceTest {

    @Autowired
    private GanttService ganttService;

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private ActivityRepository activityRepository;

    @Autowired
    private ActivityDependencyRepository activityDependencyRepository;

    private Project createProject() {
        return projectRepository.save(Project.builder()
            .name("Test Project")
            .budgetTotalK(new BigDecimal("100.00"))
            .status(ProjectStatus.EXECUTING)
            .isActive(true)
            .build());
    }

    @Test
    void testCalculateCriticalPath_emptyActivities_returnsEmpty() {
        Project project = createProject();

        GanttResponse response = ganttService.calculateCriticalPath(project.getId());

        assertThat(response.getProjectId()).isEqualTo(project.getId());
        assertThat(response.getActivities()).isEmpty();
        assertThat(response.getCriticalPath()).isEmpty();
        assertThat(response.getTotalDurationDays()).isEqualTo(0);
    }

    @Test
    void testCalculateCriticalPath_singleActivity_noCriticalPath() {
        Project project = createProject();
        Activity activity = activityRepository.save(Activity.builder()
            .projectId(project.getId())
            .name("Single Activity")
            .plannedStartDate(LocalDate.of(2026, 1, 1))
            .plannedEndDate(LocalDate.of(2026, 1, 5))
            .estimatedHours(new BigDecimal("40"))
            .isActive(true)
            .build());

        GanttResponse response = ganttService.calculateCriticalPath(project.getId());

        assertThat(response.getActivities()).hasSize(1);
        assertThat(response.getActivities().get(0).getName()).isEqualTo("Single Activity");
        // Single activity with dates should have duration of 5 days
        assertThat(response.getTotalDurationDays()).isEqualTo(5);
    }

    @Test
    void testCalculateCriticalPath_linearActivities_calculatesCriticalPath() {
        Project project = createProject();

        // Activity A -> Activity B -> Activity C (linear chain)
        Activity activityA = activityRepository.save(Activity.builder()
            .projectId(project.getId())
            .name("Activity A")
            .plannedStartDate(LocalDate.of(2026, 1, 1))
            .plannedEndDate(LocalDate.of(2026, 1, 3))
            .estimatedHours(new BigDecimal("24"))
            .isActive(true)
            .sequence(1)
            .build());

        Activity activityB = activityRepository.save(Activity.builder()
            .projectId(project.getId())
            .name("Activity B")
            .plannedStartDate(LocalDate.of(2026, 1, 4))
            .plannedEndDate(LocalDate.of(2026, 1, 8))
            .estimatedHours(new BigDecimal("40"))
            .isActive(true)
            .sequence(2)
            .build());

        Activity activityC = activityRepository.save(Activity.builder()
            .projectId(project.getId())
            .name("Activity C")
            .plannedStartDate(LocalDate.of(2026, 1, 9))
            .plannedEndDate(LocalDate.of(2026, 1, 12))
            .estimatedHours(new BigDecimal("32"))
            .isActive(true)
            .sequence(3)
            .build());

        // A -> B -> C
        activityDependencyRepository.save(ActivityDependency.builder()
            .predecessorId(activityA.getId())
            .successorId(activityB.getId())
            .dependencyType("FS")
            .lagDays(0)
            .build());

        activityDependencyRepository.save(ActivityDependency.builder()
            .predecessorId(activityB.getId())
            .successorId(activityC.getId())
            .dependencyType("FS")
            .lagDays(0)
            .build());

        GanttResponse response = ganttService.calculateCriticalPath(project.getId());

        assertThat(response.getActivities()).hasSize(3);
        assertThat(response.getTotalDurationDays()).isEqualTo(12);
        // All activities in a linear chain are on the critical path
        assertThat(response.getCriticalPath()).containsExactlyInAnyOrder(activityA.getId(), activityB.getId(), activityC.getId());
    }

    @Test
    void testCalculateCriticalPath_parallelActivities_identifiesCriticalPath() {
        Project project = createProject();

        // Activity A (start) -> B and C (parallel)
        Activity activityA = activityRepository.save(Activity.builder()
            .projectId(project.getId())
            .name("Start")
            .plannedStartDate(LocalDate.of(2026, 1, 1))
            .plannedEndDate(LocalDate.of(2026, 1, 2))
            .estimatedHours(new BigDecimal("8"))
            .isActive(true)
            .sequence(1)
            .build());

        Activity activityB = activityRepository.save(Activity.builder()
            .projectId(project.getId())
            .name("Short Path")
            .plannedStartDate(LocalDate.of(2026, 1, 3))
            .plannedEndDate(LocalDate.of(2026, 1, 4))
            .estimatedHours(new BigDecimal("8"))
            .isActive(true)
            .sequence(2)
            .build());

        Activity activityC = activityRepository.save(Activity.builder()
            .projectId(project.getId())
            .name("Long Path")
            .plannedStartDate(LocalDate.of(2026, 1, 3))
            .plannedEndDate(LocalDate.of(2026, 1, 10))
            .estimatedHours(new BigDecimal("64"))
            .isActive(true)
            .sequence(3)
            .build());

        // A -> B and A -> C
        activityDependencyRepository.save(ActivityDependency.builder()
            .predecessorId(activityA.getId())
            .successorId(activityB.getId())
            .dependencyType("FS")
            .lagDays(0)
            .build());

        activityDependencyRepository.save(ActivityDependency.builder()
            .predecessorId(activityA.getId())
            .successorId(activityC.getId())
            .dependencyType("FS")
            .lagDays(0)
            .build());

        GanttResponse response = ganttService.calculateCriticalPath(project.getId());

        assertThat(response.getActivities()).hasSize(3);
        // Long path (A -> C) should be critical
        assertThat(response.getCriticalPath()).containsExactlyInAnyOrder(activityA.getId(), activityC.getId());
    }

    @Test
    void testCalculateCriticalPath_cycleDetected_throws() {
        Project project = createProject();

        // A -> B -> C -> A (cycle)
        Activity activityA = activityRepository.save(Activity.builder()
            .projectId(project.getId())
            .name("Activity A")
            .estimatedHours(new BigDecimal("8"))
            .isActive(true)
            .build());

        Activity activityB = activityRepository.save(Activity.builder()
            .projectId(project.getId())
            .name("Activity B")
            .estimatedHours(new BigDecimal("8"))
            .isActive(true)
            .build());

        Activity activityC = activityRepository.save(Activity.builder()
            .projectId(project.getId())
            .name("Activity C")
            .estimatedHours(new BigDecimal("8"))
            .isActive(true)
            .build());

        // A -> B
        activityDependencyRepository.save(ActivityDependency.builder()
            .predecessorId(activityA.getId())
            .successorId(activityB.getId())
            .dependencyType("FS")
            .lagDays(0)
            .build());

        // B -> C
        activityDependencyRepository.save(ActivityDependency.builder()
            .predecessorId(activityB.getId())
            .successorId(activityC.getId())
            .dependencyType("FS")
            .lagDays(0)
            .build());

        // C -> A (creates cycle)
        activityDependencyRepository.save(ActivityDependency.builder()
            .predecessorId(activityC.getId())
            .successorId(activityA.getId())
            .dependencyType("FS")
            .lagDays(0)
            .build());

        assertThatThrownBy(() -> ganttService.calculateCriticalPath(project.getId()))
            .isInstanceOf(CycleDetectedException.class)
            .hasMessageContaining("Dependency cycle detected");
    }

    @Test
    void testCalculateCriticalPath_withEstimatedHours_usesHoursForDuration() {
        Project project = createProject();

        // Activity without dates - uses estimated hours
        Activity activity = activityRepository.save(Activity.builder()
            .projectId(project.getId())
            .name("Hours Based Activity")
            .estimatedHours(new BigDecimal("80")) // 80 hours = 10 days (8h/day)
            .isActive(true)
            .build());

        GanttResponse response = ganttService.calculateCriticalPath(project.getId());

        assertThat(response.getActivities()).hasSize(1);
        // 80 hours / 8 hours per day = 10 days
        assertThat(response.getTotalDurationDays()).isEqualTo(10);
    }
}
