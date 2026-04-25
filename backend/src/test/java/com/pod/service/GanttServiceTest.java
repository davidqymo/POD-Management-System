package com.pod.service;

import com.pod.dto.response.GanttResponse;
import com.pod.entity.Activity;
import com.pod.entity.ActivityDependency;
import com.pod.exception.CycleDetectedException;
import com.pod.repository.ActivityDependencyRepository;
import com.pod.repository.ActivityRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GanttServiceTest {

    @Mock
    private ActivityRepository activityRepository;

    @Mock
    private ActivityDependencyRepository dependencyRepository;

    @InjectMocks
    private GanttService ganttService;

    @Test
    void calculateCriticalPath_emptyProject_returnsEmptyResponse() {
        when(activityRepository.findByProjectIdAndIsActiveTrue(1L)).thenReturn(Collections.emptyList());

        GanttResponse result = ganttService.calculateCriticalPath(1L);

        assertNotNull(result);
        assertEquals(1L, result.getProjectId());
        assertTrue(result.getActivities().isEmpty());
        assertTrue(result.getCriticalPath().isEmpty());
    }

    @Test
    void calculateCriticalPath_singleActivity_noCriticalPath() {
        Activity activity = Activity.builder()
            .id(1L)
            .name("Task A")
            .plannedStartDate(LocalDate.of(2026, 5, 1))
            .plannedEndDate(LocalDate.of(2026, 5, 5))
            .estimatedHours(BigDecimal.valueOf(32))
            .isActive(true)
            .build();

        when(activityRepository.findByProjectIdAndIsActiveTrue(1L)).thenReturn(List.of(activity));
        when(dependencyRepository.findByPredecessorIdIn(anyList())).thenReturn(Collections.emptyList());

        GanttResponse result = ganttService.calculateCriticalPath(1L);

        assertEquals(1, result.getActivities().size());
        assertEquals("Task A", result.getActivities().get(0).getName());
    }

    @Test
    void calculateCriticalPath_linearChain_returnsCriticalPath() {
        // A (5 days) -> B (5 days) -> C (5 days) = 15 days total
        Activity a = Activity.builder()
            .id(1L)
            .name("Task A")
            .plannedStartDate(LocalDate.of(2026, 5, 1))
            .plannedEndDate(LocalDate.of(2026, 5, 5))
            .estimatedHours(BigDecimal.valueOf(40))
            .isActive(true)
            .build();

        Activity b = Activity.builder()
            .id(2L)
            .name("Task B")
            .plannedStartDate(LocalDate.of(2026, 5, 6))
            .plannedEndDate(LocalDate.of(2026, 5, 10))
            .estimatedHours(BigDecimal.valueOf(40))
            .isActive(true)
            .build();

        Activity c = Activity.builder()
            .id(3L)
            .name("Task C")
            .plannedStartDate(LocalDate.of(2026, 5, 11))
            .plannedEndDate(LocalDate.of(2026, 5, 15))
            .estimatedHours(BigDecimal.valueOf(40))
            .isActive(true)
            .build();

        ActivityDependency dep1 = ActivityDependency.builder()
            .predecessorId(1L)
            .successorId(2L)
            .dependencyType("FS")
            .lagDays(0)
            .build();

        ActivityDependency dep2 = ActivityDependency.builder()
            .predecessorId(2L)
            .successorId(3L)
            .dependencyType("FS")
            .lagDays(0)
            .build();

        when(activityRepository.findByProjectIdAndIsActiveTrue(1L)).thenReturn(List.of(a, b, c));
        when(dependencyRepository.findByPredecessorIdIn(anyList())).thenReturn(List.of(dep1, dep2));

        GanttResponse result = ganttService.calculateCriticalPath(1L);

        assertEquals(3, result.getActivities().size());
        assertEquals(15, result.getTotalDurationDays());
        // All should be critical in a linear chain
        assertTrue(result.getCriticalPath().size() >= 1);
    }

    @Test
    void calculateCriticalPath_diamond_identifiesCriticalPath() {
        // A (5d) -> B (3d) -> D (5d)
        //   ↘ C (2d) ↗
        Activity a = Activity.builder()
            .id(1L).name("A")
            .plannedStartDate(LocalDate.of(2026, 5, 1))
            .plannedEndDate(LocalDate.of(2026, 5, 5))
            .estimatedHours(BigDecimal.valueOf(40)).isActive(true).build();

        Activity b = Activity.builder()
            .id(2L).name("B")
            .plannedStartDate(LocalDate.of(2026, 5, 6))
            .plannedEndDate(LocalDate.of(2026, 5, 8))
            .estimatedHours(BigDecimal.valueOf(24)).isActive(true).build();

        Activity c = Activity.builder()
            .id(3L).name("C")
            .plannedStartDate(LocalDate.of(2026, 5, 6))
            .plannedEndDate(LocalDate.of(2026, 5, 7))
            .estimatedHours(BigDecimal.valueOf(16)).isActive(true).build();

        Activity d = Activity.builder()
            .id(4L).name("D")
            .plannedStartDate(LocalDate.of(2026, 5, 9))
            .plannedEndDate(LocalDate.of(2026, 5, 13))
            .estimatedHours(BigDecimal.valueOf(40)).isActive(true).build();

        ActivityDependency dep1 = ActivityDependency.builder().predecessorId(1L).successorId(2L).dependencyType("FS").lagDays(0).build();
        ActivityDependency dep2 = ActivityDependency.builder().predecessorId(1L).successorId(3L).dependencyType("FS").lagDays(0).build();
        ActivityDependency dep3 = ActivityDependency.builder().predecessorId(2L).successorId(4L).dependencyType("FS").lagDays(0).build();
        ActivityDependency dep4 = ActivityDependency.builder().predecessorId(3L).successorId(4L).dependencyType("FS").lagDays(0).build();

        when(activityRepository.findByProjectIdAndIsActiveTrue(1L)).thenReturn(List.of(a, b, c, d));
        when(dependencyRepository.findByPredecessorIdIn(anyList())).thenReturn(List.of(dep1, dep2, dep3, dep4));

        GanttResponse result = ganttService.calculateCriticalPath(1L);

        // Critical path: A -> B -> D (10 days) vs A -> C -> D (7 days)
        assertTrue(result.getCriticalPath().contains(1L)); // A is critical
        assertTrue(result.getCriticalPath().contains(2L)); // B is critical
        assertTrue(result.getCriticalPath().contains(4L)); // D is critical
        // C should NOT be critical (has float)
        assertFalse(result.getCriticalPath().contains(3L));
    }

    @Test
    void calculateCriticalPath_withCycle_throwsCycleDetectedException() {
        // A -> B -> C -> A (cycle)
        Activity a = Activity.builder().id(1L).name("A").estimatedHours(BigDecimal.valueOf(8)).isActive(true).build();
        Activity b = Activity.builder().id(2L).name("B").estimatedHours(BigDecimal.valueOf(8)).isActive(true).build();
        Activity c = Activity.builder().id(3L).name("C").estimatedHours(BigDecimal.valueOf(8)).isActive(true).build();

        ActivityDependency dep1 = ActivityDependency.builder().predecessorId(1L).successorId(2L).dependencyType("FS").lagDays(0).build();
        ActivityDependency dep2 = ActivityDependency.builder().predecessorId(2L).successorId(3L).dependencyType("FS").lagDays(0).build();
        ActivityDependency dep3 = ActivityDependency.builder().predecessorId(3L).successorId(1L).dependencyType("FS").lagDays(0).build();

        when(activityRepository.findByProjectIdAndIsActiveTrue(1L)).thenReturn(List.of(a, b, c));
        when(dependencyRepository.findByPredecessorIdIn(anyList())).thenReturn(List.of(dep1, dep2, dep3));

        assertThrows(CycleDetectedException.class, () ->
            ganttService.calculateCriticalPath(1L)
        );
    }

    @Test
    void calculateCriticalPath_withEstimatedHours_calculatesDuration() {
        Activity activity = Activity.builder()
            .id(1L)
            .name("Task")
            .estimatedHours(BigDecimal.valueOf(40))
            .plannedStartDate(null)  // No dates, use estimated hours
            .plannedEndDate(null)
            .isActive(true)
            .build();

        when(activityRepository.findByProjectIdAndIsActiveTrue(1L)).thenReturn(List.of(activity));
        when(dependencyRepository.findByPredecessorIdIn(anyList())).thenReturn(Collections.emptyList());

        GanttResponse result = ganttService.calculateCriticalPath(1L);

        // 40 hours / 8 = 5 days
        assertEquals(5, result.getActivities().get(0).getDurationDays());
    }
}