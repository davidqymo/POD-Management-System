package com.pod.service;

import com.pod.entity.Project;
import com.pod.entity.ProjectStatus;
import com.pod.exception.TerminalStateException;
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
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

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
class ProjectServiceTest {

    @Autowired
    private ProjectService projectService;

    @Autowired
    private ProjectRepository projectRepository;

    @Test
    void testCreate_validProject_succeeds() {
        Project created = projectService.create("Test Project", new BigDecimal("100.00"), 1L, "Test description");

        assertThat(created.getId()).isNotNull();
        assertThat(created.getName()).isEqualTo("Test Project");
        assertThat(created.getBudgetTotalK()).isEqualByComparingTo(new BigDecimal("100.00"));
        assertThat(created.getStatus()).isEqualTo(ProjectStatus.REQUESTED);
        assertThat(created.isActive()).isTrue();
    }

    @Test
    void testCreate_invalidBudget_throws() {
        assertThatThrownBy(() -> projectService.create("Test", BigDecimal.ZERO, null, null))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Budget must be greater than zero");

        assertThatThrownBy(() -> projectService.create("Test", new BigDecimal("-10"), null, null))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Budget must be greater than zero");
    }

    @Test
    void testUpdate_valid_succeeds() {
        Project created = projectService.create("Original Name", new BigDecimal("50.00"), null, null);

        Project updated = projectService.update(created.getId(), "Updated Name", new BigDecimal("75.00"), "New description");

        assertThat(updated.getName()).isEqualTo("Updated Name");
        assertThat(updated.getBudgetTotalK()).isEqualByComparingTo(new BigDecimal("75.00"));
        assertThat(updated.getDescription()).isEqualTo("New description");
    }

    @Test
    void testUpdate_notFound_throws() {
        assertThatThrownBy(() -> projectService.update(999L, "Name", BigDecimal.TEN, null))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Project not found");
    }

    @Test
    void testTransitionToTerminal_toCompleted_succeeds() {
        Project created = projectService.create("Test Project", new BigDecimal("100.00"), null, null);

        Project completed = projectService.transitionToTerminal(created.getId(), ProjectStatus.COMPLETED);

        assertThat(completed.getStatus()).isEqualTo(ProjectStatus.COMPLETED);
    }

    @Test
    void testTransitionToTerminal_toCancelled_succeeds() {
        Project created = projectService.create("Test Project", new BigDecimal("100.00"), null, null);

        Project cancelled = projectService.transitionToTerminal(created.getId(), ProjectStatus.CANCELLED);

        assertThat(cancelled.getStatus()).isEqualTo(ProjectStatus.CANCELLED);
    }

    @Test
    void testTransitionToTerminal_invalidTerminalStatus_throws() {
        Project created = projectService.create("Test Project", new BigDecimal("100.00"), null, null);

        assertThatThrownBy(() -> projectService.transitionToTerminal(created.getId(), ProjectStatus.EXECUTING))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Invalid terminal status");
    }

    @Test
    void testTransitionToTerminal_alreadyTerminal_throws() {
        Project created = projectService.create("Test Project", new BigDecimal("100.00"), null, null);
        projectService.transitionToTerminal(created.getId(), ProjectStatus.COMPLETED);

        assertThatThrownBy(() -> projectService.transitionToTerminal(created.getId(), ProjectStatus.CANCELLED))
            .isInstanceOf(TerminalStateException.class)
            .hasMessageContaining("already in terminal state");
    }

    @Test
    void testStartProject_fromRequested_succeeds() {
        Project created = projectService.create("Test Project", new BigDecimal("100.00"), null, null);

        Project started = projectService.startProject(created.getId());

        assertThat(started.getStatus()).isEqualTo(ProjectStatus.EXECUTING);
    }

    @Test
    void testStartProject_fromOnHold_succeeds() {
        Project created = projectService.create("Test Project", new BigDecimal("100.00"), null, null);
        projectService.startProject(created.getId());
        projectService.putOnHold(created.getId());

        Project reStarted = projectService.startProject(created.getId());

        assertThat(reStarted.getStatus()).isEqualTo(ProjectStatus.EXECUTING);
    }

    @Test
    void testStartProject_fromExecuting_throws() {
        Project created = projectService.create("Test Project", new BigDecimal("100.00"), null, null);
        projectService.startProject(created.getId());

        assertThatThrownBy(() -> projectService.startProject(created.getId()))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("cannot be started from status");
    }

    @Test
    void testPutOnHold_valid_succeeds() {
        Project created = projectService.create("Test Project", new BigDecimal("100.00"), null, null);
        projectService.startProject(created.getId());

        Project onHold = projectService.putOnHold(created.getId());

        assertThat(onHold.getStatus()).isEqualTo(ProjectStatus.ON_HOLD);
    }

    @Test
    void testPutOnHold_fromRequested_throws() {
        Project created = projectService.create("Test Project", new BigDecimal("100.00"), null, null);

        assertThatThrownBy(() -> projectService.putOnHold(created.getId()))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("Only EXECUTING projects can be put on hold");
    }

    @Test
    void testReactivateCancelledProject_within30Days_succeeds() {
        Project created = projectService.create("Test Project", new BigDecimal("100.00"), null, null);
        projectService.transitionToTerminal(created.getId(), ProjectStatus.CANCELLED);

        Project reactivated = projectService.reactivateCancelledProject(created.getId());

        assertThat(reactivated.getStatus()).isEqualTo(ProjectStatus.EXECUTING);
    }

    @Test
    void testReactivateCancelledProject_after30Days_throws() {
        Project created = projectService.create("Test Project", new BigDecimal("100.00"), null, null);
        projectService.transitionToTerminal(created.getId(), ProjectStatus.CANCELLED);

        // Manually backdate the updatedAt to 31 days ago
        Optional<Project> opt = projectRepository.findById(created.getId());
        Project project = opt.get();
        project.setUpdatedAt(Instant.now().minus(31, ChronoUnit.DAYS));
        projectRepository.save(project);

        assertThatThrownBy(() -> projectService.reactivateCancelledProject(created.getId()))
            .isInstanceOf(TerminalStateException.class)
            .hasMessageContaining("Cannot reactivate project after 30 days");
    }

    @Test
    void testReactivateCancelledProject_notCancelled_throws() {
        Project created = projectService.create("Test Project", new BigDecimal("100.00"), null, null);

        assertThatThrownBy(() -> projectService.reactivateCancelledProject(created.getId()))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Project is not cancelled");
    }

    @Test
    void testDeactivate_valid_succeeds() {
        Project created = projectService.create("Test Project", new BigDecimal("100.00"), null, null);

        projectService.deactivate(created.getId());

        Optional<Project> deactivated = projectRepository.findById(created.getId());
        assertThat(deactivated).isPresent();
        assertThat(deactivated.get().isActive()).isFalse();
    }
}
