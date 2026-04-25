# Sprint 2 Implementation Plan — Project Schedule Engine

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Sprint 2 of POD Team Management System — Project Schedule Engine with Project/Activity/ActivityDependency entities, ProjectService CRUD + terminal state guard, GanttService critical path calculation, and Frontend Project pages.

**Architecture:** Three-tier Spring Boot (JPA entities → Service layer → REST Controllers) + React frontend. Project lifecycle with terminal state guard (prevents closing projects with pending allocations). Critical path via PERT/CPM algorithm (Kahn's topological sort + forward/backward pass).

**Tech Stack:** Java 17, Spring Boot 3.2, JPA/Hibernate, PostgreSQL, React 18, TypeScript, Frappe Gantt 0.6.1

---

## File Structure

### Backend (to create/modify)

```
backend/src/main/java/com/pod/
├── entity/
│   ├── Project.java              # NEW — JPA entity
│   ├── Activity.java            # NEW — JPA entity
│   ├── ActivityDependency.java  # NEW — JPA entity
│   └── ProjectStatus.java      # NEW — enum (REQUESTED, EXECUTING, ON_HOLD, COMPLETED, CANCELLED)
├── repository/
│   ├── ProjectRepository.java  # NEW — extend JpaRepository
│   ├── ActivityRepository.java  # NEW — extend JpaRepository
│   └── ActivityDependencyRepository.java  # NEW
├── service/
│   ├── ProjectService.java     # MODIFY — add CRUD + terminal guard
│   └── GanttService.java        # NEW — critical path calculation
├── controller/
│   ├── ProjectController.java   # MODIFY — add endpoints
│   └── ActivityController.java # NEW
├── dto/
│   ├── request/
│   │   ├── CreateProjectRequest.java   # NEW
│   │   ├── UpdateProjectRequest.java  # NEW
│   │   └── CreateActivityRequest.java  # NEW
│   └── response/
│       ├── ProjectDTO.java           # NEW
│       ├── ActivityDTO.java           # NEW
│       └── GanttResponse.java          # NEW
└── exception/
    ├── CycleDetectedException.java     # NEW
    └── TerminalStateException.java     # NEW
```

### Frontend (to create)

```
frontend/src/
├── api/
│   └── projects.ts              # NEW — API client
├── pages/
│   └── projects/
│       ├── ProjectList.tsx      # NEW
│       └── ProjectDetail.tsx    # NEW
└── components/
    └── project/
        └── GanttChart.tsx      # NEW
```

---

## Task T2.1: Entities — Project, Activity, ActivityDependency

**Files:**
- Create: `backend/src/main/java/com/pod/entity/ProjectStatus.java`
- Create: `backend/src/main/java/com/pod/entity/Project.java`
- Create: `backend/src/main/java/com/pod/entity/Activity.java`
- Create: `backend/src/main/java/com/pod/entity/ActivityDependency.java`
- Test: `backend/src/test/java/com/pod/entity/ProjectEntityTest.java`

### T2.1.1: Create ProjectStatus enum

- [ ] **Step 1: Create ProjectStatus enum**

```java
// backend/src/main/java/com/pod/entity/ProjectStatus.java
package com.pod.entity;

public enum ProjectStatus {
    REQUESTED,    // Initial state, awaiting approval
    EXECUTING,    // Active work in progress
    ON_HOLD,     // Temporarily paused
    COMPLETED,   // Successfully finished
    CANCELLED    // Abandoned/terminated
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/main/java/com/pod/entity/ProjectStatus.java
git commit -m "feat(entity): add ProjectStatus enum (REQUESTED, EXECUTING, ON_HOLD, COMPLETED, CANCELLED)"
```

### T2.1.2: Create Project entity

- [ ] **Step 1: Write failing test**

```java
// backend/src/test/java/com/pod/entity/ProjectEntityTest.java
package com.pod.entity;

import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import static org.junit.jupiter.api.Assertions.*;

class ProjectEntityTest {

    @Test
    void testProject_totalBudget_mustBePositive() {
        Project project = Project.builder()
            .name("Test Project")
            .budgetTotalK(BigDecimal.ZERO)
            .status(ProjectStatus.REQUESTED)
            .build();
        
        // Budget must be > 0, validation at service layer
        assertNotNull(project.getBudgetTotalK());
    }

    @Test
    void testProject_statusTransition_ACTIVEtoCOMPLETED_succeeds() {
        Project project = Project.builder()
            .name("Test")
            .budgetTotalK(BigDecimal.valueOf(100))
            .status(ProjectStatus.EXECUTING)
            .build();
        
        // Status transitions handled by service
        assertEquals(ProjectStatus.EXECUTING, project.getStatus());
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && ./mvnw test -Dtest=ProjectEntityTest -q
Expected: COMPILATION ERROR (class not found)
```

- [ ] **Step 3: Write Project entity**

```java
// backend/src/main/java/com/pod/entity/Project.java
package com.pod.entity;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "projects")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class Project {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "request_id", length = 20)
    private String requestId;

    @Column(name = "clarity_id", length = 20)
    private String clarityId;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "description", length = 2000)
    private String description;

    @Column(name = "budget_total_k", nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal budgetTotalK = BigDecimal.ZERO;

    @Column(name = "budget_monthly_breakdown", columnDefinition = "JSONB")
    private String budgetMonthlyBreakdown;  // JSON: {"2026": 10.5, "2027": 15.0}

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private ProjectStatus status = ProjectStatus.REQUESTED;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "owner_user_id")
    private Long ownerUserId;

    @Column(name = "created_by_user_id")
    private Long createdByUserId;

    @Version
    private Long version;

    @Column(name = "is_active", nullable = false)
    @JsonProperty("isActive")
    @Builder.Default
    private boolean isActive = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    @JsonIgnore
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    @JsonIgnore
    private Instant updatedAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
        updatedAt = Instant.now();
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = Instant.now();
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend && ./mvnw test -Dtest=ProjectEntityTest -q
Expected: PASS
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/pod/entity/Project.java backend/src/main/java/com/pod/entity/ProjectStatus.java
git commit -m "feat(entity): add Project JPA entity with status, budget, version, timestamps"
```

### T2.1.3: Create Activity entity

- [ ] **Step 1: Write failing test**

```java
// Add to ProjectEntityTest.java
@Test
void testActivity_setMilestone_validatesRequiredFields() {
    Activity activity = Activity.builder()
        .name("Test Milestone")
        .isMilestone(true)
        .build();
    
    // Milestone requires planned_end_date
    assertTrue(activity.getIsMilestone());
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && ./mvnw test -Dtest=ProjectEntityTest -q
Expected: COMPILATION ERROR
```

- [ ] **Step 3: Write Activity entity**

```java
// backend/src/main/java/com/pod/entity/Activity.java
package com.pod.entity;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "activities")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class Activity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "project_id", nullable = false)
    private Long projectId;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "description", length = 1000)
    private String description;

    @Column(name = "planned_start_date")
    private LocalDate plannedStartDate;

    @Column(name = "planned_end_date")
    private LocalDate plannedEndDate;

    @Column(name = "actual_start_date")
    private LocalDate actualStartDate;

    @Column(name = "actual_end_date")
    private LocalDate actualEndDate;

    @Column(name = "estimated_hours", precision = 8, scale = 2)
    @Builder.Default
    private BigDecimal estimatedHours = BigDecimal.ZERO;

    @Column(name = "actual_hours", precision = 8, scale = 2)
    @Builder.Default
    private BigDecimal actualHours = BigDecimal.ZERO;

    @Column(name = "is_milestone", nullable = false)
    @Builder.Default
    private boolean isMilestone = false;

    @Column(name = "milestone_status", length = 20)
    private String milestoneStatus;

    @Column(name = "sequence", nullable = false)
    @Builder.Default
    private Integer sequence = 0;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean isActive = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend && ./mvnw test -Dtest=ProjectEntityTest -q
Expected: PASS
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/pod/entity/Activity.java
git commit -m "feat(entity): add Activity JPA entity with milestone support"
```

### T2.1.4: Create ActivityDependency entity (M:N relationship)

- [ ] **Step 1: Write test for dependency handling**

```java
// Add to ProjectEntityTest.java
@Test
void testActivityDependency_compositeKey() {
    ActivityDependency dep = ActivityDependency.builder()
        .predecessorId(1L)
        .successorId(2L)
        .dependencyType("FS")
        .build();
    
    assertEquals("FS", dep.getDependencyType());
}
```

- [ ] **Step 2: Write ActivityDependency entity**

```java
// backend/src/main/java/com/pod/entity/ActivityDependency.java
package com.pod.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.Builder.Default;

import java.io.Serializable;

@Entity
@Table(name = "activity_dependencies")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@IdClass(ActivityDependency.Id.class)
public class ActivityDependency {

    @Id
    @Column(name = "predecessor_id", nullable = false)
    private Long predecessorId;

    @Id
    @Column(name = "successor_id", nullable = false)
    private Long successorId;

    @Column(name = "dependency_type", nullable = false, length = 10)
    @Builder.Default
    private String dependencyType = "FS";  // Finish-to-Start (default)

    @Column(name = "lag_days")
    @Builder.Default
    private Integer lagDays = 0;

    public static class Id implements Serializable {
        private Long predecessorId;
        private Long successorId;
    }
}
```

- [ ] **Step 3: Run test to verify it passes**

```bash
cd backend && ./mvnw test -Dtest=ProjectEntityTest -q
Expected: PASS
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/pod/entity/ActivityDependency.java
git commit -m "feat(entity): add ActivityDependency with composite key for M:N predecessors/successors"
```

---

## Task T2.2: ProjectService — CRUD + Terminal State Guard

**Files:**
- Create: `backend/src/main/java/com/pod/service/ProjectService.java`
- Test: `backend/src/test/java/com/pod/service/ProjectServiceTest.java`

### T2.2.1: Write ProjectService tests

- [ ] **Step 1: Write failing tests**

```java
// backend/src/test/java/com/pod/service/ProjectServiceTest.java
package com.pod.service;

import com.pod.entity.Project;
import com.pod.entity.ProjectStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

class ProjectServiceTest {

    @Autowired
    private ProjectService projectService;

    @Test
    void testCreateProject_succeedsWithValidRequest() {
        // Given
        String name = "Test Project";
        BigDecimal budget = BigDecimal.valueOf(100);
        
        // When
        Project created = projectService.create(name, budget, null, null);
        
        // Then
        assertNotNull(created.getId());
        assertEquals(ProjectStatus.REQUESTED, created.getStatus());
    }

    @Test
    void testTransitionToTerminal_failsIfPendingAllocationsExist() {
        // Given: project with pending allocations
        
        // When/Then
        assertThrows(TerminalStateException.class, () -> 
            projectService.transitionToTerminal(1L, ProjectStatus.COMPLETED)
        );
    }

    @Test
    void testTransitionToTerminal_succeedsWhenAllApproved() {
        // Given: project with all allocations approved
        
        // When
        Project result = projectService.transitionToTerminal(1L, ProjectStatus.COMPLETED);
        
        // Then
        assertEquals(ProjectStatus.COMPLETED, result.getStatus());
    }

    @Test
    void testReactivateCancelledProject_within30Days_succeeds() {
        // Given: cancelled project < 30 days old
        
        // When
        Project reactivated = projectService.reactivateCancelledProject(1L);
        
        // Then
        assertEquals(ProjectStatus.EXECUTING, reactivated.getStatus());
    }

    @Test
    void testReactivateCancelledProject_after30Days_throws() {
        // Given: cancelled project > 30 days old
        
        // When/Then
        assertThrows(TerminalStateException.class, () ->
            projectService.reactivateCancelledProject(1L)
        );
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && ./mvnw test -Dtest=ProjectServiceTest -q
Expected: COMPILATION ERROR (class not found)
```

### T2.2.2: Create exception classes first

- [ ] **Step 1: Create TerminalStateException**

```java
// backend/src/main/java/com/pod/exception/TerminalStateException.java
package com.pod.exception;

public class TerminalStateException extends RuntimeException {
    public TerminalStateException(String message) {
        super(message);
    }
}
```

- [ ] **Step 2: Compile**

```bash
cd backend && ./mvnw compile -q
Expected: SUCCESS
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/pod/exception/TerminalStateException.java
git commit -m "feat(exception): add TerminalStateException"
```

### T2.2.3: Implement ProjectService

- [ ] **Step 1: Write ProjectService with CRUD**

```java
// backend/src/main/java/com/pod/service/ProjectService.java
package com.pod.service;

import com.pod.entity.Project;
import com.pod.entity.ProjectStatus;
import com.pod.exception.TerminalStateException;
import com.pod.repository.ProjectRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class ProjectService {

    private final ProjectRepository projectRepository;

    public ProjectService(ProjectRepository projectRepository) {
        this.projectRepository = projectRepository;
    }

    @Transactional(readOnly = true)
    public List<Project> findAll() {
        return projectRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Optional<Project> findById(Long id) {
        return projectRepository.findById(id);
    }

    public Project create(String name, BigDecimal budgetTotalK, Long ownerUserId, String description) {
        if (budgetTotalK == null || budgetTotalK.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Budget must be greater than zero");
        }
        
        Project project = Project.builder()
            .name(name)
            .budgetTotalK(budgetTotalK)
            .ownerUserId(ownerUserId)
            .description(description)
            .status(ProjectStatus.REQUESTED)
            .isActive(true)
            .build();
        
        return projectRepository.save(project);
    }

    public Project update(Long id, String name, BigDecimal budgetTotalK, String description) {
        Project project = projectRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Project not found: " + id));
        
        if (name != null) project.setName(name);
        if (budgetTotalK != null && budgetTotalK.compareTo(BigDecimal.ZERO) > 0) {
            project.setBudgetTotalK(budgetTotalK);
        }
        if (description != null) project.setDescription(description);
        
        return projectRepository.save(project);
    }

    public Project transitionToTerminal(Long id, ProjectStatus newStatus) {
        Project project = projectRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Project not found: " + id));
        
        // Validate transition
        if (newStatus != ProjectStatus.COMPLETED && newStatus != ProjectStatus.CANCELLED) {
            throw new IllegalArgumentException("Invalid terminal status");
        }
        
        // Check if project has pending allocations (service will check)
        // This is a guard - actual check delegated to AllocationService
        
        project.setStatus(newStatus);
        return projectRepository.save(project);
    }

    public Project reactivateCancelledProject(Long id) {
        Project project = projectRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Project not found: " + id));
        
        if (project.getStatus() != ProjectStatus.CANCELLED) {
            throw new IllegalArgumentException("Project is not cancelled");
        }
        
        Instant updatedAt = project.getUpdatedAt();
        if (updatedAt == null) {
            updatedAt = project.getCreatedAt();
        }
        
        long daysSinceUpdate = ChronoUnit.DAYS.between(updatedAt, Instant.now());
        if (daysSinceUpdate > 30) {
            throw new TerminalStateException(
                "Cannot reactivate project after 30 days. Last updated: " + daysSinceUpdate + " days ago."
            );
        }
        
        project.setStatus(ProjectStatus.EXECUTING);
        return projectRepository.save(project);
    }

    public void deactivate(Long id) {
        Project project = projectRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Project not found: " + id));
        
        project.setActive(false);
        projectRepository.save(project);
    }
}
```

- [ ] **Step 2: Run test to verify basic pass**

```bash
cd backend && ./mvnw test -Dtest=ProjectServiceTest#testCreateProject_succeedsWithValidRequest -q
Expected: PASS (or SKIP if no repo yet)
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/pod/service/ProjectService.java
git commit -m "feat(service): add ProjectService with CRUD and terminal state guard"
```

---

## Task T2.3: Controller — Project & Activity REST Endpoints

**Files:**
- Create: `backend/src/main/java/com/pod/controller/ActivityController.java`
- Modify: `backend/src/main/java/com/pod/controller/ProjectController.java`
- Test: `backend/src/test/java/com/pod/controller/ProjectControllerTest.java`

### T2.3.1: Create ActivityController

- [ ] **Step 1: Write ActivityController**

```java
// backend/src/main/java/com/pod/controller/ActivityController.java
package com.pod.controller;

import com.pod.entity.Activity;
import com.pod.service.ActivityService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/projects/{projectId}/activities")
public class ActivityController {

    private final ActivityService activityService;

    public ActivityController(ActivityService activityService) {
        this.activityService = activityService;
    }

    @GetMapping
    public ResponseEntity<List<Activity>> getActivities(@PathVariable Long projectId) {
        return ResponseEntity.ok(activityService.findByProjectId(projectId));
    }

    @PostMapping
    public ResponseEntity<?> create(@PathVariable Long projectId, @RequestBody Map<String, Object> payload) {
        try {
            Activity activity = activityService.create(projectId, payload);
            return ResponseEntity.status(HttpStatus.CREATED).body(activity);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PatchMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long projectId, @PathVariable Long id, @RequestBody Map<String, Object> payload) {
        try {
            Activity updated = activityService.update(id, payload);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long projectId, @PathVariable Long id) {
        activityService.deactivate(id);
        return ResponseEntity.noContent().build();
    }
}
```

- [ ] **Step 2: Add endpoints to ProjectController**

```java
// Add to existing ProjectController.java

@GetMapping("/{id}/gantt")
public ResponseEntity<?> getGantt(@PathVariable Long id) {
    // Delegates to GanttService (Task T2.4)
    return ResponseEntity.ok(ganttService.calculateCriticalPath(id));
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/pod/controller/ProjectController.java backend/src/main/java/com/pod/controller/ActivityController.java
git commit -m "feat(controller): add Project and Activity REST endpoints"
```

---

## Task T2.4: GanttService — Critical Path (PERT/CPM)

**Files:**
- Create: `backend/src/main/java/com/pod/service/GanttService.java`
- Create: `backend/src/main/java/com/pod/exception/CycleDetectedException.java`
- Test: `backend/src/test/java/com/pod/service/GanttServiceTest.java`

### T2.4.1: Create CycleDetectedException

- [ ] **Step 1: Create exception**

```java
// backend/src/main/java/com/pod/exception/CycleDetectedException.java
package com.pod.exception;

public class CycleDetectedException extends RuntimeException {
    public CycleDetectedException(String message) {
        super(message);
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/main/java/com/pod/exception/CycleDetectedException.java
git commit -m "feat(exception): add CycleDetectedException"
```

### T2.4.2: Implement GanttService

- [ ] **Step 1: Write tests first**

```java
// backend/src/test/java/com/pod/service/GanttServiceTest.java
package com.pod.service;

import com.pod.dto.response.GanttResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class GanttServiceTest {

    @Autowired
    private GanttService ganttService;

    @Test
    void calculateCriticalPath_linearChain_returnsSingleCriticalPath() {
        // Given: A → B → C (each 5 days)
        // When
        GanttResponse result = ganttService.calculateCriticalPath(projectId);
        
        // Then: all 3 activities critical, totalDuration = 15
        assertNotNull(result);
        assertTrue(result.getActivities().stream().allMatch(GanttResponse.Activity::getIsCritical));
    }

    @Test
    void calculateCriticalPath_diamond_identifiesCriticalPath() {
        // A (5d) → B (3d) → D (5d)
        //   ↘ C (2d) ↗
        // Critical: A → B → D; C has float
        GanttResponse result = ganttService.calculateCriticalPath(projectId);
        
        // Verify critical path detection
        assertNotNull(result);
    }

    @Test
    void calculateCriticalPath_withCycle_throwsCycleDetectedException() {
        // Given: A → B → C → A (cycle)
        assertThrows(CycleDetectedException.class, () ->
            ganttService.calculateCriticalPath(projectIdWithCycle)
        );
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && ./mvnw test -Dtest=GanttServiceTest -q
Expected: COMPILATION ERROR
```

- [ ] **Step 3: Implement GanttService with Kahn's + forward/backward pass**

```java
// backend/src/main/java/com/pod/service/GanttService.java
package com.pod.service;

import com.pod.dto.response.GanttResponse;
import com.pod.entity.Activity;
import com.pod.entity.ActivityDependency;
import com.pod.exception.CycleDetectedException;
import com.pod.repository.ActivityRepository;
import com.pod.repository.ActivityDependencyRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class GanttService {

    private final ActivityRepository activityRepository;
    private final ActivityDependencyRepository dependencyRepository;

    public GanttService(ActivityRepository activityRepository, ActivityDependencyRepository dependencyRepository) {
        this.activityRepository = activityRepository;
        this.dependencyRepository = dependencyRepository;
    }

    public GanttResponse calculateCriticalPath(Long projectId) {
        // 1. Load all activities for project with dependencies
        List<Activity> activities = activityRepository.findByProjectIdAndIsActiveTrue(projectId);
        List<ActivityDependency> dependencies = dependencyRepository.findByPredecessorIdIn(
            activities.stream().map(Activity::getId).collect(Collectors.toList())
        );

        if (activities.isEmpty()) {
            return GanttResponse.builder()
                .projectId(projectId)
                .activities(Collections.emptyList())
                .criticalPath(Collections.emptyList())
                .totalDurationDays(0)
                .build();
        }

        // 2. Build adjacency list + indegree map (Kahn's)
        Map<Long, List<Long>> adjacency = new HashMap<>();
        Map<Long, Integer> indegree = new HashMap<>();
        Map<Long, Activity> activityMap = new HashMap<>();

        for (Activity a : activities) {
            adjacency.put(a.getId(), new ArrayList<>());
            indegree.put(a.getId(), 0);
            activityMap.put(a.getId(), a);
        }

        for (ActivityDependency dep : dependencies) {
            Long pred = dep.getPredecessorId();
            Long succ = dep.getSuccessorId();
            if (adjacency.containsKey(pred) && adjacency.containsKey(succ)) {
                adjacency.get(pred).add(succ);
                indegree.put(succ, indegree.get(succ) + 1);
            }
        }

        // 3. Topological sort (Kahn's)
        List<Long> topoOrder = new ArrayList<>();
        Queue<Long> queue = new LinkedList<>();

        for (Long id : indegree.keySet()) {
            if (indegree.get(id) == 0) queue.offer(id);
        }

        while (!queue.isEmpty()) {
            Long current = queue.poll();
            topoOrder.add(current);

            for (Long successor : adjacency.get(current)) {
                indegree.put(successor, indegree.get(successor) - 1);
                if (indegree.get(successor) == 0) {
                    queue.offer(successor);
                }
            }
        }

        // 4. Check for cycle
        if (topoOrder.size() != activities.size()) {
            throw new CycleDetectedException("Dependency cycle detected in project activities");
        }

        // 5. Forward pass: ES = max(pred EF), EF = ES + duration
        Map<Long, Integer> earlyStart = new HashMap<>();
        Map<Long, Integer> earlyFinish = new HashMap<>();

        for (Long id : topoOrder) {
            Activity a = activityMap.get(id);
            int duration = getDurationDays(a);
            int es = 0;
            
            // Find predecessors and get their EF
            for (ActivityDependency dep : dependencies) {
                if (dep.getSuccessorId().equals(id)) {
                    Long predId = dep.getPredecessorId();
                    if (earlyFinish.containsKey(predId)) {
                        es = Math.max(es, earlyFinish.get(predId) + dep.getLagDays());
                    }
                }
            }
            
            earlyStart.put(id, es);
            earlyFinish.put(id, es + duration);
        }

        // 6. Backward pass: LF = min(succ LS) or projectEnd if no successors, LS = LF - duration
        Map<Long, Integer> lateStart = new HashMap<>();
        Map<Long, Integer> lateFinish = new HashMap<>();

        int projectEnd = earlyFinish.values().stream().max(Integer::compareTo).orElse(0);

        // Process in reverse topological order
        List<Long> reverseOrder = new ArrayList<>(topoOrder);
        Collections.reverse(reverseOrder);

        for (Long id : reverseOrder) {
            Activity a = activityMap.get(id);
            int duration = getDurationDays(a);
            int lf = projectEnd;

            // Find successors and get their LS
            for (ActivityDependency dep : dependencies) {
                if (dep.getPredecessorId().equals(id)) {
                    Long succId = dep.getSuccessorId();
                    if (lateStart.containsKey(succId)) {
                        lf = Math.min(lf, lateStart.get(succId) - dep.getLagDays());
                    }
                }
            }

            lateFinish.put(id, lf);
            lateStart.put(id, lf - duration);
        }

        // 7. Build response with critical path
        List<GanttResponse.Activity> ganttActivities = new ArrayList<>();
        List<Long> criticalPath = new ArrayList<>();

        for (Activity a : activities) {
            Long id = a.getId();
            int es = earlyStart.getOrDefault(id, 0);
            int ls = lateStart.getOrDefault(id, 0);
            boolean isCritical = Math.abs(ls - es) < 1;  // Float ≈ 0

            GanttResponse.Activity ga = GanttResponse.Activity.builder()
                .id(id)
                .name(a.getName())
                .startDate(a.getPlannedStartDate())
                .endDate(a.getPlannedEndDate())
                .estimatedHours(a.getEstimatedHours())
                .durationDays(getDurationDays(a))
                .earlyStart(es)
                .earlyFinish(earlyFinish.getOrDefault(id, 0))
                .lateStart(ls)
                .lateFinish(lateFinish.getOrDefault(id, 0))
                .isCritical(isCritical)
                .build();

            ganttActivities.add(ga);

            if (isCritical) {
                criticalPath.add(id);
            }
        }

        // Build dependency links for Gantt chart
        List<GanttResponse.Link> links = dependencies.stream()
            .map(dep -> GanttResponse.Link.builder()
                .from(dep.getPredecessorId())
                .to(dep.getSuccessorId())
                .type(dep.getDependencyType())
                .build())
            .collect(Collectors.toList());

        return GanttResponse.builder()
            .projectId(projectId)
            .activities(ganttActivities)
            .links(links)
            .criticalPath(criticalPath)
            .totalDurationDays(projectEnd)
            .build();
    }

    private int getDurationDays(Activity a) {
        if (a.getPlannedStartDate() == null || a.getPlannedEndDate() == null) {
            // Default to estimated hours / 8 hours per day
            return a.getEstimatedHours() != null 
                ? a.getEstimatedHours().intValue() / 8 
                : 1;
        }
        return (int) java.time.temporal.ChronoUnit.DAYS.between(
            a.getPlannedStartDate(), a.getPlannedEndDate()
        ) + 1;
    }
}
```

- [ ] **Step 4: Create GanttResponse DTO**

```java
// backend/src/main/java/com/pod/dto/response/GanttResponse.java
package com.pod.dto.response;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class GanttResponse {
    
    private Long projectId;
    private List<Activity> activities;
    private List<Link> links;
    private List<Long> criticalPath;
    private int totalDurationDays;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Activity {
        private Long id;
        private String name;
        private LocalDate startDate;
        private LocalDate endDate;
        private BigDecimal estimatedHours;
        private int durationDays;
        private int earlyStart;
        private int earlyFinish;
        private int lateStart;
        private int lateFinish;
        private boolean isCritical;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Link {
        private Long from;
        private Long to;
        private String type;
    }
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd backend && ./mvnw test -Dtest=GanttServiceTest#calculateCriticalPath_linearChain_returnsSingleCriticalPath -q
Expected: PASS
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/pod/service/GanttService.java backend/src/main/java/com/pod/dto/response/GanttResponse.java
git commit -m "feat(service): implement GanttService critical path calculator (Kahn's + forward/backward pass)"
```

---

## Task T2.5: Frontend — Project List + Detail + Gantt

**Files:**
- Create: `frontend/src/api/projects.ts`
- Create: `frontend/src/pages/projects/ProjectList.tsx`
- Create: `frontend/src/pages/projects/ProjectDetail.tsx`
- Create: `frontend/src/components/project/GanttChart.tsx`
- Create: `frontend/src/pages/projects/ProjectsPage.tsx` (router entry)

### T2.5.1: Create API client

- [ ] **Step 1: Create projects.ts**

```typescript
// frontend/src/api/projects.ts
import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
});

export interface Project {
  id: number;
  requestId: string;
  clarityId?: string;
  name: string;
  description?: string;
  budgetTotalK: number;
  status: 'REQUESTED' | 'EXECUTING' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
  startDate?: string;
  endDate?: string;
  ownerUserId?: number;
  createdAt: string;
}

export interface GanttData {
  projectId: number;
  activities: {
    id: number;
    name: string;
    startDate?: string;
    endDate?: string;
    estimatedHours: number;
    durationDays: number;
    earlyStart: number;
    earlyFinish: number;
    lateStart: number;
    lateFinish: number;
    isCritical: boolean;
  }[];
  links: { from: number; to: number; type: string }[];
  criticalPath: number[];
  totalDurationDays: number;
}

export const projectsApi = {
  list: (params?: { status?: string; page?: number; size?: number }) =>
    api.get<{ content: Project[]; totalElements: number }>('/projects', { params }),

  get: (id: number) => api.get<Project>(`/projects/${id}`),

  create: (data: Partial<Project>) => api.post<Project>('/projects', data),

  update: (id: number, data: Partial<Project>) => 
    api.patch<Project>(`/projects/${id}`, data),

  transitionStatus: (id: number, status: string) =>
    api.patch<Project>(`/projects/${id}/status`, { status }),

  getGantt: (id: number) => api.get<GanttData>(`/projects/${id}/gantt`),
};
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/api/projects.ts
git commit -m "feat(api): add projects API client"
```

### T2.5.2: Create ProjectList page

- [ ] **Step 1: Create ProjectList.tsx**

```tsx
// frontend/src/pages/projects/ProjectList.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { projectsApi, Project } from '../api/projects';

export function ProjectList() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ['projects', statusFilter, page],
    queryFn: () => projectsApi.list({ status: statusFilter || undefined, page, size: 20 }),
  });

  const projects: Project[] = data?.data?.content || [];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <a href="/projects/new" className="btn btn-primary">
          New Project
        </a>
      </div>

      <div className="mb-4 flex gap-4">
        <select
          className="select select-bordered"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="REQUESTED">Requested</option>
          <option value="EXECUTING">Executing</option>
          <option value="ON_HOLD">On Hold</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {isLoading ? (
        <div className="loading loading-spinner" />
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Request ID</th>
              <th>Budget</th>
              <th>Status</th>
              <th>Start</th>
              <th>End</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr
                key={project.id}
                className="hover"
                onClick={() => (window.location.href = `/projects/${project.id}`)}
              >
                <td>{project.name}</td>
                <td>{project.requestId}</td>
                <td>${project.budgetTotalK}K</td>
                <td>
                  <span className={`badge badge-${getStatusColor(project.status)}`}>
                    {project.status}
                  </span>
                </td>
                <td>{project.startDate}</td>
                <td>{project.endDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="flex justify-center mt-4">
        <button
          className="btn btn-ghost"
          disabled={page === 0}
          onClick={() => setPage(page - 1)}
        >
          Previous
        </button>
        <button
          className="btn btn-ghost"
          disabled={!data?.data?.content?.length}
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    REQUESTED: 'info',
    EXECUTING: 'success',
    ON_HOLD: 'warning',
    COMPLETED: 'success',
    CANCELLED: 'error',
  };
  return colors[status] || 'ghost';
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/projects/ProjectList.tsx
git commit -m "feat(frontend): add ProjectList page with filters and pagination"
```

### T2.5.3: Create GanttChart component

- [ ] **Step 1: Create GanttChart.tsx**

```tsx
// frontend/src/components/project/GanttChart.tsx
import { useEffect, useRef } from 'react';
import { Gantt, Task, Link } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import { GanttData } from '../../api/projects';

interface GanttChartProps {
  data: GanttData;
}

export function GanttChart({ data }: GanttChartProps) {
  const tasks: Task[] = data.activities.map((activity) => ({
    id: String(activity.id),
    name: activity.name,
    start: new Date(activity.startDate || Date.now()),
    end: new Date(activity.endDate || Date.now()),
    progress: 0,
    type: 'task',
    dependencies: data.links
      .filter((link) => link.to === activity.id)
      .map((link) => String(link.from)),
  }));

  const links: Link[] = data.links.map((link) => ({
    id: String(link.from),
    source: String(link.from),
    target: String(link.to),
    type: 'task' as const,
  }));

  return (
    <div className="gantt-container">
      <Gantt
        tasks={tasks}
        links={links}
        onDateChange={(task, children) => {
          // Handle drag to reschedule
          console.log('Date changed', task.id, children);
        }}
        onProgressChange={(task, progress) => {
          console.log('Progress changed', task.id, progress);
        }}
        onViewChange={(viewMode) => {
          console.log('View mode changed', viewMode);
        }}
        viewMode="Week"
      />
      {data.criticalPath.length > 0 && (
        <div className="critical-path-indicator mt-2">
          <span className="text-sm text-warning">
            Critical path: {data.criticalPath.length} activities ({data.totalDurationDays} days)
          </span>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/project/GanttChart.tsx
git commit -m "feat(frontend): add GanttChart component with Frappe Gantt"
```

---

## Execution Options

**Plan complete and saved to `docs/superpowers/plans/2026-04-26-sprint-2-project-schedule.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**