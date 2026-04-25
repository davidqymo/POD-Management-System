package com.pod.service;

import com.pod.entity.Project;
import com.pod.entity.ProjectStatus;
import com.pod.exception.TerminalStateException;
import com.pod.repository.ProjectRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProjectServiceTest {

    @Mock
    private ProjectRepository projectRepository;

    @InjectMocks
    private ProjectService projectService;

    private Project testProject;

    @BeforeEach
    void setUp() {
        testProject = Project.builder()
            .id(1L)
            .name("Test Project")
            .budgetTotalK(BigDecimal.valueOf(100))
            .status(ProjectStatus.REQUESTED)
            .isActive(true)
            .createdAt(Instant.now())
            .build();
    }

    @Test
    void testCreateProject_succeedsWithValidRequest() {
        when(projectRepository.save(any(Project.class))).thenReturn(testProject);

        Project result = projectService.create("Test Project", BigDecimal.valueOf(100), null, "Description");

        assertNotNull(result);
        assertEquals(ProjectStatus.REQUESTED, result.getStatus());
        verify(projectRepository).save(any(Project.class));
    }

    @Test
    void testCreateProject_failsWithZeroBudget() {
        assertThrows(IllegalArgumentException.class, () ->
            projectService.create("Test", BigDecimal.ZERO, null, null)
        );
    }

    @Test
    void testCreateProject_failsWithNegativeBudget() {
        assertThrows(IllegalArgumentException.class, () ->
            projectService.create("Test", BigDecimal.valueOf(-10), null, null)
        );
    }

    @Test
    void testFindByStatus_returnsOnlyMatchingStatus() {
        when(projectRepository.findByStatusAndIsActiveTrue(ProjectStatus.EXECUTING))
            .thenReturn(List.of(testProject));

        List<Project> results = projectService.findByStatus(ProjectStatus.EXECUTING);

        assertEquals(1, results.size());
        assertEquals(ProjectStatus.EXECUTING, results.get(0).getStatus());
    }

    @Test
    void testTransitionToTerminal_failsIfAlreadyTerminal() {
        testProject.setStatus(ProjectStatus.COMPLETED);
        when(projectRepository.findByIdAndIsActiveTrue(1L)).thenReturn(Optional.of(testProject));

        assertThrows(TerminalStateException.class, () ->
            projectService.transitionToTerminal(1L, ProjectStatus.CANCELLED)
        );
    }

    @Test
    void testTransitionToTerminal_succeedsForValidTransition() {
        testProject.setStatus(ProjectStatus.EXECUTING);
        when(projectRepository.findByIdAndIsActiveTrue(1L)).thenReturn(Optional.of(testProject));
        when(projectRepository.save(any(Project.class))).thenReturn(testProject);

        Project result = projectService.transitionToTerminal(1L, ProjectStatus.COMPLETED);

        assertEquals(ProjectStatus.COMPLETED, result.getStatus());
    }

    @Test
    void testTransitionToTerminal_rejectsInvalidTerminalStatus() {
        assertThrows(IllegalArgumentException.class, () ->
            projectService.transitionToTerminal(1L, ProjectStatus.EXECUTING)
        );
    }

    @Test
    void testStartProject_succeedsFromRequested() {
        testProject.setStatus(ProjectStatus.REQUESTED);
        when(projectRepository.findByIdAndIsActiveTrue(1L)).thenReturn(Optional.of(testProject));
        when(projectRepository.save(any(Project.class))).thenReturn(testProject);

        Project result = projectService.startProject(1L);

        assertEquals(ProjectStatus.EXECUTING, result.getStatus());
    }

    @Test
    void testStartProject_succeedsFromOnHold() {
        testProject.setStatus(ProjectStatus.ON_HOLD);
        when(projectRepository.findByIdAndIsActiveTrue(1L)).thenReturn(Optional.of(testProject));
        when(projectRepository.save(any(Project.class))).thenReturn(testProject);

        Project result = projectService.startProject(1L);

        assertEquals(ProjectStatus.EXECUTING, result.getStatus());
    }

    @Test
    void testStartProject_failsFromCompleted() {
        testProject.setStatus(ProjectStatus.COMPLETED);
        when(projectRepository.findByIdAndIsActiveTrue(1L)).thenReturn(Optional.of(testProject));

        assertThrows(IllegalStateException.class, () -> projectService.startProject(1L));
    }

    @Test
    void testPutOnHold_failsIfNotExecuting() {
        testProject.setStatus(ProjectStatus.REQUESTED);
        when(projectRepository.findByIdAndIsActiveTrue(1L)).thenReturn(Optional.of(testProject));

        assertThrows(IllegalStateException.class, () -> projectService.putOnHold(1L));
    }

    @Test
    void testPutOnHold_succeedsFromExecuting() {
        testProject.setStatus(ProjectStatus.EXECUTING);
        when(projectRepository.findByIdAndIsActiveTrue(1L)).thenReturn(Optional.of(testProject));
        when(projectRepository.save(any(Project.class))).thenReturn(testProject);

        Project result = projectService.putOnHold(1L);

        assertEquals(ProjectStatus.ON_HOLD, result.getStatus());
    }

    @Test
    void testReactivateCancelledProject_within30Days_succeeds() {
        testProject.setStatus(ProjectStatus.CANCELLED);
        testProject.setUpdatedAt(Instant.now().minus(15, ChronoUnit.DAYS));
        when(projectRepository.findByIdAndIsActiveTrue(1L)).thenReturn(Optional.of(testProject));
        when(projectRepository.save(any(Project.class))).thenReturn(testProject);

        Project result = projectService.reactivateCancelledProject(1L);

        assertEquals(ProjectStatus.EXECUTING, result.getStatus());
    }

    @Test
    void testReactivateCancelledProject_after30Days_throws() {
        testProject.setStatus(ProjectStatus.CANCELLED);
        testProject.setUpdatedAt(Instant.now().minus(31, ChronoUnit.DAYS));
        when(projectRepository.findByIdAndIsActiveTrue(1L)).thenReturn(Optional.of(testProject));

        assertThrows(TerminalStateException.class, () ->
            projectService.reactivateCancelledProject(1L)
        );
    }

    @Test
    void testReactivateCancelledProject_failsIfNotCancelled() {
        testProject.setStatus(ProjectStatus.EXECUTING);
        when(projectRepository.findByIdAndIsActiveTrue(1L)).thenReturn(Optional.of(testProject));

        assertThrows(IllegalArgumentException.class, () ->
            projectService.reactivateCancelledProject(1L)
        );
    }

    @Test
    void testDeactivate_softDeletesProject() {
        when(projectRepository.findByIdAndIsActiveTrue(1L)).thenReturn(Optional.of(testProject));
        when(projectRepository.save(any(Project.class))).thenReturn(testProject);

        projectService.deactivate(1L);

        assertFalse(testProject.isActive());
        verify(projectRepository).save(testProject);
    }

    @Test
    void testUpdate_modifiesMutableFields() {
        when(projectRepository.findByIdAndIsActiveTrue(1L)).thenReturn(Optional.of(testProject));
        when(projectRepository.save(any(Project.class))).thenReturn(testProject);

        Project result = projectService.update(1L, "New Name", BigDecimal.valueOf(200), "New Desc");

        assertEquals("New Name", result.getName());
        assertEquals(BigDecimal.valueOf(200), result.getBudgetTotalK());
    }
}