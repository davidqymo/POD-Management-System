# Technical Implementation Plan — POD Team Management System

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Phase 1 MVP of the POD Team Management System — a full-stack resource and project management system with allocation engine, dashboard, and notifications, following TDD discipline and the technical architecture defined in `TECHNICAL_DESIGN.md`.

**Architecture:** Three-tier backend (Spring Boot 3.2 + JPA + PostgreSQL + Redis) + React 18 + TypeScript + Vite frontend with React Query state management. All services transactional, audit-logged, with RBAC authorization and optimistic/pessimistic locking for concurrent edits.

**Tech Stack:**
- **Backend:** Java 17, Spring Boot 3.2.x, Spring Data JPA/Hibernate 6.x, PostgreSQL 15, Redis 7, Flyway 10.x, JUnit 5 + Testcontainers
- **Frontend:** React 18.3+, TypeScript 5.4+, Vite 5.4+, React Router 6.22+, TanStack Query 5.45+, Recharts 2.12+, Frappe Gantt 0.6.1+, Tailwind CSS 3.4+
- **DevOps:** Docker Compose (local), GitHub Actions CI/CD, Kubernetes Helm (prod)
- **Testing:** JUnit 5 (unit), Testcontainers (integration), Playwright (E2E)

---

## File Structure & responsibilities

```
backend/
├── src/main/java/com/pod/
│   ├── PodApplication.java                    # Spring Boot main class
│   ├── config/                                # Spring configuration classes
│   │   ├── SecurityConfig.java
│   │   ├── JacksonConfig.java
│   │   ├── RedisConfig.java
│   │   └── FlywayConfig.java
│   ├── controller/                            # REST API layer
│   │   ├── AuthController.java
│   │   ├── ResourceController.java
│   │   ├── RateController.java
│   │   ├── ProjectController.java
│   │   ├── ActivityController.java
│   │   ├── AllocationController.java
│   │   ├── DashboardController.java
│   │   ├── HolidayController.java
│   │   ├── ExportController.java
│   │   ├── AuditController.java
│   │   └── NotificationController.java
│   ├── service/                               # Business logic layer
│   │   ├── ResourceService.java
│   │   ├── RateService.java
│   │   ├── ProjectService.java
│   │   ├── AllocationService.java
│   │   ├── AllocationConstraintValidator.java
│   │   ├── ApprovalService.java
│   │   ├── AutoAllocationService.java
│   │   ├── GanttService.java                 # Critical path calculator
│   │   ├── DashboardService.java
│   │   ├── NotificationService.java
│   │   ├── AuditService.java
│   │   └── BudgetValidationService.java
│   ├── repository/                            # Data access layer
│   │   ├── ResourceRepository.java
│   │   ├── RateRepository.java
│   │   ├── ProjectRepository.java
│   │   ├── ActivityRepository.java
│   │   ├── AllocationRepository.java
│   │   ├── HolidayRepository.java
│   │   ├── AuditLogRepository.java
│   │   └── NotificationRepository.java
│   ├── entity/                                # JPA entities
│   │   ├── Resource.java
│   │   ├── User.java
│   │   ├── Rate.java
│   │   ├── Project.java
│   │   ├── Activity.java
│   │   ├── ActivityDependency.java
│   │   ├── Allocation.java
│   │   ├── Holiday.java
│   │   ├── AuditLog.java
│   │   └── Notification.java
│   ├── dto/                                   # Data transfer objects
│   │   ├── request/
│   │   │   ├── CreateResourceRequest.java
│   │   │   ├── UpdateResourceRequest.java
│   │   │   ├── CreateRateRequest.java
│   │   │   ├── CreateProjectRequest.java
│   │   │   ├── CreateAllocationRequest.java
│   │   │   └── ApproveAllocationRequest.java
│   │   ├── response/
│   │   │   ├── ResourceDTO.java
│   │   │   ├── ProjectDTO.java
│   │   │   ├── AllocationDTO.java
│   │   │   ├── DashboardSupplyDemandDTO.java
│   │   │   └── NotificationDTO.java
│   │   └── ApiResponse.java                  # Envelope wrapper
│   ├── exception/                             # Custom exceptions & handler
│   │   ├── ApiException.java
│   │   ├── ResourceNotFoundException.java
│   │   ├── RatePeriodGapException.java
│   │   ├── ConstraintViolationException.java
│   │   ├── OptimisticLockException.java
│   │   └── GlobalExceptionHandler.java
│   ├── security/                              # Auth & authorization
│   │   ├── JwtTokenProvider.java
│   │   ├── JwtAuthenticationFilter.java
│   │   ├── UserDetailsServiceImpl.java
│   │   └── Role.java                          // Enum: VIEWER, PM, POD_MANAGER, ADMIN
│   ├── audit/                                 # Audit logging
│   │   ├── AuditService.java
│   │   ├── AuditEntityListener.java
│   │   └── AuditContextHolder.java
│   ├── task/                                  # Scheduled jobs
│   │   ├── MaterializedViewRefreshTask.java
│   │   ├── PartitionMaintenanceTask.java
│   │   └── EmailDigestScheduler.java
│   ├── filter/                                # Servlet filters
│   │   ├── RequestIdFilter.java
│   │   └── RateLimitFilter.java
│   ├── util/                                  # Utilities
│   │   ├── RequestContext.java
│   │   └── DateUtils.java
│   └── PodApplication.java
├── src/main/resources/
│   ├── application.yml
│   ├── application-dev.yml
│   ├── application-prod.yml
│   ├── db/migration/V1__initial_schema.sql
│   ├── db/migration/V2__add_audit_triggers.sql
│   └── logback-spring.xml
├── src/test/java/com/pod/
│   ├── IntegrationTest.java                   # Abstract base with Testcontainers
│   ├── controller/                            # Controller integration tests
│   ├── service/                               # Service unit + integration tests
│   ├── repository/                            # Repository integration tests
│   └── util/                                  # Test utilities (TestFixtures)
├── Dockerfile
├── pom.xml
└── README.md

frontend/
├── src/
│   ├── main.tsx                               # React entry + providers
│   ├── App.tsx                                # Layout + routing
│   ├── api/
│   │   ├── client.ts                          # Axios instance with JWT interceptor
│   │   ├── auth.ts
│   │   ├── resources.ts
│   │   ├── projects.ts
│   │   ├── allocations.ts
│   │   ├── dashboard.ts
│   │   ├── rates.ts
│   │   ├── holidays.ts
│   │   ├── notifications.ts
│   │   └── types.ts                           # TypeScript interfaces
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── DataTable.tsx
│   │   │   ├── DatePicker.tsx
│   │   │   ├── KPICard.tsx
│   │   │   └── LoadingSpinner.tsx
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Layout.tsx
│   │   ├── resource/
│   │   │   ├── ResourceList.tsx
│   │   │   ├── ResourceDetail.tsx
│   │   │   ├── ResourceForm.tsx
│   │   │   └── ImportModal.tsx
│   │   ├── project/
│   │   │   ├── ProjectList.tsx
│   │   │   ├── ProjectDetail.tsx
│   │   │   ├── ProjectForm.tsx
│   │   │   ├── GanttChart.tsx
│   │   │   └── DependencyGraph.tsx
│   │   ├── allocation/
│   │   │   ├── AllocationModal.tsx
│   │   │   ├── AllocationList.tsx
│   │   │   └── AllocationApprovalPanel.tsx
│   │   ├── dashboard/
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── KPIGrid.tsx
│   │   │   ├── SupplyDemandChart.tsx
│   │   │   ├── BurnRateChart.tsx
│   │   │   ├── VarianceTable.tsx
│   │   │   └── UtilizationGauge.tsx
│   │   ├── notification/
│   │   │   ├── NotificationCenter.tsx
│   │   │   ├── NotificationBadge.tsx
│   │   │   ├── NotificationItem.tsx
│   │   │   └── NotificationGroupingToggle.tsx
│   │   └── Auth/
│   │       ├── LoginForm.tsx
│   │       └── AuthGuard.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useResources.ts
│   │   ├── useProjects.ts
│   │   ├── useAllocations.ts
│   │   ├── useDashboard.ts
│   │   ├── useNotifications.ts
│   │   └── useWebSocket.ts
│   ├── contexts/
│   │   ├── AuthContext.tsx
│   │   └── NotificationContext.tsx
│   ├── utils/
│   │   ├── validators.ts
│   │   ├── dateUtils.ts
│   │   └── api.ts
│   ├── styles/
│   │   └── index.css
│   └── types/
│       └── index.ts
├── public/
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── Dockerfile
├── .env.example
└── README.md

infra/
├── docker-compose.yml                          # PostgreSQL + Redis for local dev
├── scripts/
│   ├── setup-dev.sh
│   └── seed-test-data.sql
└── k8s/
    ├── backend-deployment.yaml
    ├── backend-service.yaml
    ├── postgres-statefulset.yaml
    └── redis-deployment.yaml

.github/
└── workflows/
    ├── backend-ci.yml                           # Maven + Testcontainers + JaCoCo
    └── frontend-ci.yml                          # npm ci + test + lint + build
```

---

## Sprint 0: Infrastructure & Test Scaffolding (2 days, 17h)

**Capacity buffer:** Sprint 0 absorbs all non-development setup work. Developers start coding from Sprint 1.

| Task | Deliverable | Est. | Acceptance Criteria |
|------|-------------|------|---------------------|
| T0.1 | `TestFixtures.java` seeded with Faker data | 2h | `TestFixtures.resource()` returns valid Resource entity with randomized realistic data (name, cost_center, skill, level, rates) |
| T0.2 | SQL seed files: `cost_centers.sql`, `holidays_2026.sql`, `test_users.sql`, `skills.sql` | 2h | Flyway migrations V1.1–V1.4 run cleanly; `SELECT * FROM cost_centers` returns 12 rows; `holidays_2026` has 10 entries |
| T0.3 | `AbstractIntegrationTest` base class with Testcontainers (PostgreSQL 15 + Redis 7) | 3h | All integration tests extend this; containers start in <60s; `@Transactional` rollback works; database TRUNCATE executed in `@BeforeEach` |
| T0.4 | Playwright bootstrap: `package.json` (frontend/e2e), `playwright.config.ts`, `BasePage.ts` | 3h | `npm run test:e2e` executes 3 sample tests against dev server (login page loads, navigation works, resource list renders) |
| T0.5 | CI/CD workflow `.github/workflows/ci.yml` (3 jobs: backend-test, frontend-test, integration) | 4h | PR checks run on push; backend+frontend tests pass; coverage uploaded to Codecov |
| T0.6 | JaCoCo + SonarQube coverage reporting & quality gate (≥80%) | 3h | `mvn jacoco:report` generates HTML; GitHub PR comment shows coverage delta; quality gate fails if coverage < 80% |

**Definition of Done (DoD):**
- [ ] All 6 tasks complete
- [ ] `mvn test` passes locally with Testcontainers
- [ ] CI workflow passes on feature branch
- [ ] Test fixtures usable by 2+ developers on their machines

---

## Sprint 1: Core Domain — Resources & Rates (5 days, 40.5h)

**Focus:** Resource entity lifecycle, rate management with period contiguity and locking, basic CRUD APIs, Resource frontend pages with CSV import.

### Backend Tasks

#### Task T1.1: Entity Layer — Resource & Rate JPA Mappings

**Files:**
- Create: `backend/src/main/java/com/pod/entity/Resource.java`
- Create: `backend/src/main/java/com/pod/entity/Rate.java`
- Create: `backend/src/main/java/com/pod/entity/User.java`
- Modify: `backend/src/main/resources/db/migration/V1__initial_schema.sql`

- [ ] **Step 1: Write the failing test** — Create `ResourceEntityTest.java`:

```java
// backend/src/test/java/com/pod/entity/ResourceEntityTest.java
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class ResourceEntityTest {

    @Test
    @Order(1)
    void resourceEntity_creation_succeeds() {
        // Given
        Resource resource = Resource.builder()
            .externalId("EMP-001")
            .name("Sarah Liu")
            .costCenterId("ENG-CC1")
            .billableTeamCode("BTC-API")
            .category(ResourceCategory.PERMANENT)
            .skill("backend")
            .level(5)
            .status(ResourceStatus.ACTIVE)
            .isBillable(true)
            .isActive(true)
            .build();

        // Then
        assertThat(resource.getExternalId()).isEqualTo("EMP-001");
        assertThat(resource.getStatus()).isEqualTo(ResourceStatus.ACTIVE);
        assertThat(resource.isActive()).isTrue();
        assertThat(resource.getVersion()).isEqualTo(1);  // default
    }

    @Test
    @Order(2)
    void resourceEntity_statusTransition_validatesRules() {
        Resource resource = TestFixtures.resource();
        assertThat(resource.isValidTransition(ResourceStatus.ACTIVE, ResourceStatus.ON_LEAVE))
            .isTrue();
        assertThat(resource.isValidTransition(ResourceStatus.TERMINATED, ResourceStatus.ACTIVE))
            .isFalse();
    }
}
```

- [ ] **Step 2: Run test to verify it fails** — `mvn test -Dtest=ResourceEntityTest`
  - Expected: Compilation error (Resource class does not exist)

- [ ] **Step 3: Write minimal implementation** — Create entity classes:

```java
// backend/src/main/java/com/pod/entity/Resource.java
package com.pod.entity;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.*;

@Entity
@Table(name = "resources")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Resource {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "external_id", nullable = false, unique = true, length = 50)
    private String externalId;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "cost_center_id", nullable = false, length = 20)
    private String costCenterId;

    @Column(name = "billable_team_code", nullable = false, length = 20)
    private String billableTeamCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 20)
    private ResourceCategory category;

    @Column(name = "skill", length = 100)
    private String skill;

    @Column(name = "level")
    private Integer level;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ResourceStatus status = ResourceStatus.ACTIVE;

    @Column(name = "is_billable", nullable = false)
    private boolean isBillable = true;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @Version
    @Column(name = "version", nullable = false)
    private Integer version = 1;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = Instant.now();
    }

    public boolean isValidTransition(ResourceStatus from, ResourceStatus to) {
        return switch (from) {
            case ACTIVE -> to == ResourceStatus.ON_LEAVE || to == ResourceStatus.TERMINATED;
            case ON_LEAVE -> to == ResourceStatus.ACTIVE;
            case TERMINATED -> false;
            default -> false;
        };
    }
}

// backend/src/main/java/com/pod/entity/Rate.java
@Entity
@Table(name = "rates",
       uniqueConstraints = @UniqueConstraint(
           name = "uq_rate_period_unique",
           columnNames = {"cost_center_id", "billable_team_code", "effective_from"}
       ))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Rate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "cost_center_id", nullable = false, length = 20)
    private String costCenterId;

    @Column(name = "billable_team_code", nullable = false, length = 20)
    private String billableTeamCode;

    @Column(name = "monthly_rate_K", nullable = false, precision = 10, scale = 2)
    private BigDecimal monthlyRateK;

    @Column(name = "effective_from", nullable = false, length = 6)
    private String effectiveFrom;  // YYYYMM

    @Column(name = "effective_to", length = 6)
    private String effectiveTo;    // YYYYMM or null

    @Column(name = "is_billable", nullable = false)
    private boolean isBillable = true;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
```

- [ ] **Step 4: Run test to verify it passes** — `mvn test -Dtest=ResourceEntityTest` → all green
- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/pod/entity/backend/src/test/java/com/pod/entity/
git commit -m "feat(entity): add Resource and Rate JPA entities with validation"
```

*Repeat TDD cycle (RED → GREEN → REFACTOR) for each entity: User, Project, Activity, ActivityDependency, Allocation, Holiday, AuditLog, Notification. See full entity definitions in TDD §4.1–4.11.*

#### Task T1.2: Flyway Migrations — V1 & V2

**Files:**
- Create: `backend/src/main/resources/db/migration/V1__initial_schema.sql`
- Create: `backend/src/main/resources/db/migration/V2__add_audit_triggers.sql`

- [ ] **Step 1:** Write failing test — `DatabaseMigrationIT.java` verifying schema after Flyway.

```java
// backend/src/test/java/com/pod/integration/DatabaseMigrationIT.java
@Testcontainers
class DatabaseMigrationIT extends AbstractIntegrationTest {

    @Test
    void flyway_migrations_apply_successfully() {
        // Given migration scripts exist
        // When application context loads (Flyway auto-runs)
        // Then
        int tables = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'resources'",
            Integer.class);
        assertThat(tables).isEqualTo(1);
    }
}
```

- [ ] **Step 2:** Run — `mvn test -Dtest=DatabaseMigrationIT` → FAIL (migration file missing)

- [ ] **Step 3:** Implement V1 migration (see TDD §4 for full DDL). Copy all table DDL from sections 4.1–4.10. Include:
  - `resources`, `users`, `rates`, `projects`, `activities`, `activity_dependencies`
  - `allocations` with `uq_active_allocation` unique constraint
  - `holidays`, `audit_log` (partitioned), `notifications` (partitioned)
  - All indexes: `idx_rates_lookup_active`, `idx_allocations_resource_month_active`, `idx_mv_*`

- [ ] **Step 4:** Run again → PASS
- [ ] **Step 5:** Commit

```bash
git add backend/src/main/resources/db/migration/
git commit -m "feat(db): add V1 schema + V2 audit triggers via Flyway"
```

#### Task T1.3: Repository Layer — Spring Data JPA Repositories

**Files:**
- Create: `backend/src/main/java/com/pod/repository/ResourceRepository.java`
- Create: `backend/src/main/java/com/pod/repository/RateRepository.java`
- ... (all 8 repositories)

**Pattern:** Each repository extends `JpaRepository<T, Long>` plus custom `@Query` methods.

```java
// backend/src/main/java/com/pod/repository/ResourceRepository.java
@Repository
public interface ResourceRepository extends JpaRepository<Resource, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM Resource r WHERE r.id = :id")
    Optional<Resource> findByIdWithLock(@Param("id") Long id);

    @Query("SELECT r FROM Resource r WHERE r.costCenterId = :cc AND r.billableTeamCode = :btc AND r.isActive = true")
    List<Resource> findByCostCenterAndTeam(@Param("cc") String costCenterId, @Param("btc") String billableTeamCode);

    @Query("SELECT r FROM Resource r WHERE r.skill IN :skills AND r.level BETWEEN :min AND :max AND r.isActive = true AND r.isBillable = true")
    Page<Resource> findByFilters(@Param("skills") List<String> skills, @Param("min") int minLevel, @Param("max") int maxLevel, Pageable pageable);
}
```

- [ ] Test: `ResourceRepositoryTest.java` uses `@DataJpaTest` + Testcontainers to verify query results.
- [ ] Repeat for RateRepository (include `findActiveByCostCenterAndTeam`), ProjectRepository (with `findByIdWithLock`), AllocationRepository (with `sumApprovedHoursForActiveResource`, `countDistinctActiveProjectsInMonth`).

- [ ] **Commit**

```bash
git add backend/src/main/java/com/pod/repository/ backend/src/test/java/com/pod/repository/
git commit -m "feat(repo): implement JPA repositories with custom queries and pessimistic locks"
```

#### Task T1.4: Service Layer — ResourceService (status transitions) + RateService (contiguity) ✅ COMPLETE

**Files:**
- ✅ Create: `backend/src/main/java/com/pod/service/ResourceService.java`
- ✅ Create: `backend/src/main/java/com/pod/service/RateService.java`
- ✅ Create: `backend/src/test/java/com/pod/service/ResourceServiceTest.java`
- ✅ Create: `backend/src/test/java/com/pod/service/RateServiceTest.java`
- ✅ Update: `backend/src/test/java/com/pod/repository/RepositoryTestConfig.java` — added `@ComponentScan("com.pod.service")`

**ResourceService:** Implemented `changeStatus(Long resourceId, ResourceStatus newStatus, String reason)` — acquires PESSIMISTIC_WRITE lock via `EntityManager.find()`, validates via `Resource.isValidTransition()`, applies status change, persists, and logs audit (stub). Throws `InvalidStatusTransitionException` for illegal transitions.

**RateService:** Implemented `createRate(CreateRateRequest)` — acquires PESSIMISTIC_WRITE lock via `RateRepository.findByCostCenterIdAndBillableTeamCodeAndEffectiveToIsNull()`, validates `new.effectiveFrom == prev.effectiveFrom + 1 month` using `YearMonth` arithmetic, closes previous rate by setting `effectiveTo` to `(new month) - 1`, saves both. Gap (>1 month jump) throws `RatePeriodGapException`.

**Tests (5 passing):**
- ✅ `ResourceServiceTest.testChangeStatus_validTransition_succeeds()`
- ✅ `ResourceServiceTest.testChangeStatus_invalidTransition_throws()`
- ✅ `RateServiceTest.testCreateRate_contiguousSequence_succeeds()`
- ✅ `RateServiceTest.testCreateRate_gapDetected_throwsRatePeriodGapException()`
- ✅ `RateServiceTest.testConcurrentRateCreation_pessimisticLockPreventsDoubleClose()`

**TDD Cycle:** RED (failing tests written) → GREEN (minimal implementation) — all 5 tests green

**Implementation notes:**
- `RateRepository` uses Spring Data JPA derived query `findByCostCenterIdAndBillableTeamCodeAndEffectiveToIsNull()` with `@Lock(PESSIMISTIC_WRITE)` — simpler than JPQL + setLockMode
- `RepositoryTestConfig` extended with `@ComponentScan("com.pod.service")` to make `@SpringBootTest` work without a main application class
- Tests call `rateRepository.flush()` just after `save()` to ensure JPQL query sees the newly inserted rate before service executes (H2 flush semantics)
- `ResourceService.changeStatus()` uses `System.out.printf` audit stub — ready for `AuditService` injection in REFACTOR phase
- Optimistic lock retry not yet implemented — deferred to later sprint (not required by current tests)

**TDD Cycle:**
- [ ] Write failing test asserting `RatePeriodGapException` thrown when `effective_from` jumps 2+ months
- [ ] Implement gap check in `RateService.createRate()` before save:
  ```java
  YearMonth prevEffective = YearMonth.parse(prevRate.getEffectiveFrom());
  YearMonth newEffective = YearMonth.parse(request.getEffectiveFrom());
  if (newEffective.isAfter(prevEffective.plusMonths(1))) {
      throw new RatePeriodGapException("Gap detected: " + prevEffective + " → " + newEffective);
  }
  ```
- [ ] Write test verifying concurrent requests block (use `@Transactional` + separate threads in test)
- [ ] Refactor to extract `validateContiguity()` helper

- [ ] **Commit**

```bash
git add backend/src/main/java/com/pod/service/ backend/src/test/java/com/pod/service/
git commit -m "feat(service): implement ResourceService status transitions + RateService contiguity with locking"
```

#### Task T1.5: Controller Layer — Resource & Rate REST APIs

**Files:**
- Create: `backend/src/main/java/com/pod/controller/ResourceController.java`
- Create: `backend/src/main/java/com/pod/controller/RateController.java`
- Create: `backend/src/test/java/com/pod/controller/ResourceControllerTest.java`
- Create: `backend/src/test/java/com/pod/controller/RateControllerTest.java`

**ResourceController endpoints** (see TDD §5.2):
- `GET /api/v1/resources` — list with filters (skill, level, cost_center), pagination
- `POST /api/v1/resources` — create (Admin only)
- `GET /api/v1/resources/{id}` — detail with current rate
- `PATCH /api/v1/resources/{id}/status` — change status (Admin or POD_MANAGER)
- `POST /api/v1/resources/import/csv` — CSV upload (preview mode), returns preview + `import_batch_id`

**RateController endpoints** (TDD §5.6):
- `GET /api/v1/rates` — list (filterable)
- `POST /api/v1/rates` — create (Admin); handles auto-close
- `PATCH /api/v1/rates/{id}` — update (no effective date change)

**Validation:** Use Jakarta Validation annotations (`@Valid`, `@NotNull`) on request DTOs.

**Tests (MockMvc + @WebMvcTest):**
- `ResourceControllerTest.testListResources_filtersApplied_returnsFilteredList()`
- `RateControllerTest.testCreateRate_closesPreviousActiveRate_returns201()`
- `ResourceControllerTest.testChangeStatus_invalidTransition_returns400()`

- [ ] **Commit**

```bash
git add backend/src/main/java/com/pod/controller/ backend/src/test/java/com/pod/controller/
git commit -m "feat(controller): add Resource + Rate REST endpoints with validation"
```

#### Task T1.6: Frontend — Resource List Page + CSV Import Flow

**Files:**
- Create: `frontend/src/pages/resources/ResourceList.tsx`
- Create: `frontend/src/pages/resources/ImportModal.tsx`
- Create: `frontend/src/api/resources.ts`
- Create: `frontend/src/components/common/DataTable.tsx`
- Modify: `frontend/src/App.tsx` — add route `/resources`
- Modify: `frontend/src/components/layout/Sidebar.tsx` — add nav link

**ResourceList component:**
- Table columns: Name, External ID, Cost Center, Team, Skill, Level, Status, Current Rate, Util%
- Filters: Skill (multi-select dropdown), Level range slider, Cost Center dropdown, Status select
- "Import CSV" button (visible to Admin only via `AuthGuard role="ADMIN"`)
- Uses `useResources` hook with TanStack Query for data fetching
- Debounced search on filter change (300ms)

**ImportModal flow** (per TDD §19.2):
1. File picker → `POST /api/v1/resources/import/csv` with `multipart/form-data`
2. Backend returns `{ preview: [...rows], import_batch_id: uuid, errors: [] }`
3. Modal shows preview table with column mapping confirmation
4. Radio buttons: PREVIEW / CONFIRM / DRY_RUN
5. If CONFIRM selected: Admin password re-auth prompt → `POST /api/v1/resources/import/csv?mode=CONFIRM`
6. Success toast shows counts

**Tests (Vitest + RTL):**
```typescript
describe('ResourceList', () => {
  it('filters resources by skill', async () => {
    render(<ResourceList />);
    await userEvent.selectOptions(screen.getByLabelText('Skill'), ['backend']);
    await waitFor(() => {
      expect(screen.getByText('Sarah Liu')).toBeInTheDocument();
      expect(screen.queryByText('Mike Chen')).not.toBeInTheDocument();
    });
  });
});

describe('ImportModal', () => {
  it('shows preview and confirms import', async () => {
    server.use(
      rest.post('/api/v1/resources/import/csv', (req, res, ctx) => {
        return res(ctx.json({ preview: [{ externalId: 'EMP-001', name: 'Test' }], import_batch_id: 'uuid-' }));
      })
    );
    render(<ImportModal open onClose={() => {}} />);
    await userEvent.click(screen.getByText('Choose File'));
    // ... simulate file selection
    expect(screen.getByText('Preview')).toBeInTheDocument();
  });
});
```

- [ ] **Commit**

```bash
git add frontend/src/pages/resources/ frontend/src/api/resources.ts frontend/src/components/common/DataTable.tsx
git commit -m "feat(frontend): add ResourceList page with filters + CSV import modal preview"
```

---

## Sprint 2: Project & Activity Management (8 days, 54h)

**Focus:** Project CRUD, activity templates with M:N dependencies, cycle detection, Gantt critical path visualization.

### Backend Tasks

#### Task T2.1: Entities — Project, Activity, ActivityDependency

- [ ] Write failing tests in `ProjectEntityTest.java`:
  - `testProject_totalBudget_mustBePositive()`
  - `testProject_statusTransition_ACTIVEtoCOMPLETED_succeeds()`
  - `testActivity_setMilestone_validatesRequiredFields()`

- [ ] Implement entities with:
  - `Project`: `budgetTotalK`, `budgetMonthlyBreakdown` (JSONB), `status` (enum: REQUESTED, EXECUTING, ON_HOLD, COMPLETED, CANCELLED), `version` (optimistic lock), `is_active`
  - `Activity`: `project_id` FK, `estimated_hours`, `is_milestone`, `sequence`, dates
  - `ActivityDependency`: composite PK (`predecessor_id`, `successor_id`), `dependency_type` (FS default)
  - `@ManyToMany` mapping: Activity → predecessors/successors via `@JoinTable`

- [ ] **Commit** — "feat(entity): add Project, Activity, ActivityDependency with JPA mappings"

#### Task T2.2: ProjectService — CRUD + Terminal State Guard

**Tests:**
- `testCreateProject_succeedsWithValidRequest()`
- `testTransitionToTerminal_failsIfPendingAllocationsExist()`
- `testTransitionToTerminal_succeedsWhenAllApproved()`
- `testReactivateCancelledProject_within30Days_succeeds()`
- `testReactivateCancelledProject_after30Days_throws()` (Pessimistic lock on project row)

**Implementation:**
- `createProject()` → validate budget > 0, dates valid, then save
- `patchProject()` → update mutable fields (name, description, dates, budget_breakdown) only
- `transitionToTerminal()` → check `pendingCount == 0`, soft-close allocations if CANCELLED/SUSPENDED, audit
- `reactivateCancelledProject()` → PESSIMISTIC_WRITE lock, check `updatedAt` within 30 days, status→ACTIVE, unlock allocations with `rejection_reason LIKE 'Resource terminated%'`

**Locking:** `@Lock(LockModeType.PESSIMISTIC_WRITE)` on all write methods to prevent concurrent edits.

#### Task T2.3: Controller — Project & Activity REST Endpoints

**Files:** `ProjectController.java`, `ActivityController.java`

**Endpoints** (TDD §5.3):
- `GET /projects` — list filters: status, date range, PM owner
- `POST /projects` — create (PM or Admin)
- `PATCH /projects/{id}` — update mutable
- `PATCH /projects/{id}/status` — state transition
- `POST /projects/{id}/activities` — bulk create
- `GET /projects/{id}/gantt` — returns activities + dependencies + critical path (delegates to GanttService)

- [ ] Tests: MockMvc tests for each endpoint, verifying JSON structure, role-based access denied (403) for unauthorized.

- [ ] **Commit**

#### Task T2.4: GanttService — Critical Path (PERT/CPM)

**File:** `GanttService.java`

**Algorithm** (TDD §6.2, lines 1262–1363):
1. Load all activities for project with dependencies (`JOIN FETCH predecessors`)
2. Build adjacency list + indegree map
3. **Topological sort** (Kahn's): queue nodes with indegree 0; remove edges; enqueue newly zero-degree
4. If `topo.size() != activityCount` → throw `CycleDetectedException`
5. **Forward pass:** For each node in topological order → `ES = max(pred_EF)`, `EF = ES + durationDays`
6. **Backward pass** (reverse order): `LF = min(succ_LS)` or `projectDuration` if no successors; `LS = LF - duration`
7. **Critical path:** Activities where `|LS - ES| < 0.5` (float ≈ 0)

**Tests:**
```java
@Test
void calculateCriticalPath_linearChain_returnsSingleCriticalPath() {
    // Given: A → B → C (each 5 days)
    // When
    CriticalPathResult result = ganttService.calculateCriticalPath(projectId);
    // Then: all 3 activities critical, totalDuration = 15
}

@Test
void calculateCriticalPath_diamond_identifiesCriticalPath() {
    // A (5d) → B (3d) → D (5d)
    //   ↘ C (2d) ↗
    // Critical: A → B → D; C has float
}
```

- [ ] **Commit**

```bash
git commit -m "feat(service): implement GanttService critical path calculator (Kahn's + forward/backward pass)"
```

#### Task T2.5: Frontend — Project List + Detail + Gantt

**Files:**
- `frontend/src/pages/projects/ProjectList.tsx`
- `frontend/src/pages/projects/ProjectDetail.tsx`
- `frontend/src/components/project/GanttChart.tsx`
- `frontend/src/api/projects.ts`

**ProjectList:**
- Table: Name, Request ID, PM, Budget, Burn %, Start/End, Status
- Filters: Status dropdown, Date range picker, Budget range slider
- Click row → navigate to `/projects/:id`

**ProjectDetail tabs:**
1. **Overview:** project metadata, budget summary, progress bar
2. **Activities:** List with bulk create (CSV upload or manual entry); reorder via drag-and-drop; delete individual
3. **Gantt:** Frappe Gantt with critical path (red border on critical tasks)
4. **Allocations:** table of assigned resources/hours
5. **Variance:** (Phase 2 — placeholder)

**GanttChart component:**
- Fetch: `GET /api/v1/projects/:id/gantt`
- Render tasks with `start`, `end`, `name`, `progress`
- Critical path styling: `task.addClass('critical')` for tasks with `isCritical = true`
- Dependency arrows drawn via Frappe's `links` array `{from: activityId, to: successorId}`

**Tests:** RTL tests verify:
- Project list loads and renders
- Gantt tab fetches data and renders Frappe chart
- Critical path tasks have red styling

- [ ] **Commit**

```bash
git add frontend/src/pages/projects/ frontend/src/components/project/
git commit -m "feat(frontend): add ProjectList, ProjectDetail with GanttChart using Frappe"
```

---

## Sprint 3: Allocation Engine & Approval Workflow (14 days, 95h)

**Focus:** Weekly resource assignment, 5-constraint validation, four-eyes approval, auto-close on terminal projects.

### Backend Tasks

#### Task T3.1: AllocationConstraintValidator

**File:** `AllocationConstraintValidator.java`

**Five constraints** (TDD §6.1, lines 896–973):

1. **Daily hours avg ≤ 10h/day** — `hours / 5 ≤ 10`
2. **Monthly total ≤ 144h** — `sumApprovedHours(resourceId, month) + proposed ≤ 144`
3. **Monthly OT ≤ 36h** — `OT = max(0, total – 144) ≤ 36`
4. **Project spread ≤ 5** — `countDistinctProjects(resourceId, month, excludeProjectId) < 5`
5. **Budget remaining ≥ proposed_cost** — `project.budgetRemainingK ≥ hours × (rate / 144)`

**Repository helpers** (add to `AllocationRepository.java`):
```java
@Query("SELECT COALESCE(SUM(a.hours), 0) FROM Allocation a WHERE ...")
BigDecimal sumApprovedHoursForActiveResource(@Param("resourceId") Long id, @Param("month") YearMonth month);

@Query("SELECT COUNT(DISTINCT a.project.id) FROM Allocation a WHERE ...")
Long countDistinctActiveProjectsInMonth(@Param("resourceId") Long id, @Param("month") YearMonth month, @Param("excludeProjectId") Long exclude);
```

**Indexes:** Ensure `idx_allocations_resource_month_active` exists (partial: `is_active=true AND status='approved'`).

**Tests** (JUnit 5 + @Transactional):
```java
@Test
void validate_MONTHLY_CAP_EXCEEDED_returnsViolation() {
    // Given resource with 140h already approved in April
    // When validate(resourceId, projectId, weekStart=2026-04-20, hours=10)
    // Then violation.code == "MONTHLY_CAP_EXCEEDED", details show current=140, proposed=10, total=150
}
@Test
void validate_PROJECT_SPREAD_LIMIT_fifthProjectRejected() {
    // Resource on 4 projects in April → 5th allocation → violation
}
```
- [ ] **Commit**

#### Task T3.2: AllocationService — Create + Four-Eyes Approval

**File:** `AllocationService.java`

**`createAllocation()` method:**
1. Call `AllocationConstraintValidator.validate()` — return early if violations (throw `ConstraintViolationException` with 422)
2. Check for overlapping allocations in same week (unique constraint allows only one active per resource/week)
3. Within `@Transactional`:
   - Insert row `(resource_id, project_id, activity_id?, week_start, hours, status='PENDING', version=1)`
   - Insert `audit_log` (ADD)
   - Publish `ApplicationEvent` → `AllocationSubmittedEvent`
4. Return created allocation

**`approveAllocation(Long allocationId, Long approverId, String reason)`**:
1. Fetch allocation with `PESSIMISTIC_WRITE` lock
2. Four-eyes check: `allocation.getResource().getId() != approverId` else throw `PermissionError`
3. Verify allocation still `PENDING`
4. Update: `status = APPROVED`, `approved_by = approverId`, `approved_at = now()`
5. Audit log (MOD)
6. Publish `AllocationApprovedEvent` → NotificationService + WebSocket broadcast
7. Invalidate dashboard queries via `@CacheEvict` or Redis pub/sub

**`rejectAllocation()`** — similar, sets `status = REJECTED`, `rejection_reason`, publishes `AllocationRejectedEvent`.

**Tests:**
- `AllocationServiceTest.testCreateAllocation_constraintViolation_throws422()`
- `AllocationServiceTest.testApproveAllocation_fourEyesCheck_failsIfSelfApprove()`
- `AllocationServiceTest.testConcurrentApprovals_optimisticLockRetryOnce()`
- `AllocationServiceTest.testRejectAllocation_setsReasonAndStatus()`

- [ ] **Commit**

#### Task T3.3: Auto-Close Terminal Project Allocations

`ProjectService.transitionToTerminal()` already calls `allocationRepository.softCloseAllByProject()` for CANCELLED/SUSPENDED (TDD lines 1117–1122). Ensure `AllocationRepository.softCloseAllByProject()` updates `is_active = false`, `status = 'LOCKED'`, `rejection_reason = 'Project CANCELLED'`.

- [ ] **Commit** — "fix(service): soft-close allocations on project terminal transition"

#### Task T3.4: Controller — Allocation REST APIs

**File:** `AllocationController.java`

**Endpoints** (TDD §5.4):
- `POST /api/v1/allocations` → `createAllocation()` (returns 201)
- `GET /api/v1/allocations` — query by `resource_id`, `project_id`, `week_start`, `status` (filters optional)
- `POST /api/v1/allocations/approve` → `approveAllocation()`
- `POST /api/v1/allocations/reject` → `rejectAllocation()`

**Exception mapping:** `ConstraintViolationException` → 422 with envelope `{errors: [...violations]}`; `OptimisticLockException` → 409.

**Tests:** MockMvc integration tests covering success + all error paths.

- [ ] **Commit**

#### Task T3.5: Frontend — Allocation Modal + Approval Panel

**Files:**
- `frontend/src/components/allocation/AllocationModal.tsx`
- `frontend/src/components/allocation/AllocationList.tsx`
- `frontend/src/components/allocation/AllocationApprovalPanel.tsx`
- `frontend/src/pages/allocations/AllocationApprovalsPage.tsx`

**AllocationModal:**
- Fields: Resource (search dropdown), Project (search), Week range (date picker, week granularity), Hours (number 1–80), Notes (textarea)
- Real-time validation panel (calls `validateAllocation()` API on field changes):
  - ✓ Budget remaining: $X (Y% used)
  - ⚠️ OT warning: daily avg > 8h
  - ✗ Monthly cap exceeded
  - ✗ Project spread limit reached
- Submit → POST → on success: toast "Submitted for approval", close modal, invalidate allocations query

**AllocationApprovalPanel:**
- Table: Resource | Project | Week | Hours | Submitted At | Actions
- Bulk selection → "Approve Selected" / "Reject Selected" buttons
- Reject requires modal with reason field (required ≥10 chars)

**Tests (RTL + MSW):**
- AllocationModal renders constraint violations when budget exceeded
- ApprovalPanel loads pending list, approve button sends POST, list refreshes

- [ ] **Commit**

```bash
git add frontend/src/components/allocation/ frontend/src/pages/allocations/
git commit -m "feat(frontend): add AllocationModal with real-time validation + ApprovalPanel"
```

---

## Sprint 4: Auto-Allocation & Dashboard (8 days, 57h)

### Backend Tasks

#### Task T4.1: AutoAllocationService — 5-Stage Filter Chain

**File:** `AutoAllocationService.java`

**Algorithm** (TDD §6.3, lines 1368–1500):

```java
for (Activity unassigned : unassignedActivities) {
    // Stage 1: Skill match (resource.skill == activity.requiredSkill AND level >= requiredLevel)
    List<Resource> candidates = allResources.stream()
        .filter(r -> matchesSkill(r, activity))
        .toList();

    // Stage 2: Capacity (remainingCapacity(month) >= activity.hours)
    candidates = candidates.stream()
        .filter(r -> r.getRemainingCapacity(targetMonth).compareTo(hours) >= 0)
        .toList();

    // Stage 3: Project spread (activeProjectCount(month) < 5)
    candidates = candidates.stream()
        .filter(r -> r.getActiveProjectCount(targetMonth) < 5)
        .toList();

    // Stage 4: Budget (project.budgetRemaining ≥ hours × rate / 144)
    candidates = candidates.stream()
        .filter(r -> budgetRemaining.compareTo(hours.multiply(r.getHourlyRateK()).divide(BigDecimal.valueOf(144))) >= 0)
        .toList();

    // Stage 5: Pick cheapest (rate ascending)
    Resource selected = candidates.min(Comparator.comparing(Resource::getHourlyRateK)).orElse(null);

    if (selected != null && !simulate) {
        allocationService.createAllocation(selected, activity, hours);
        successes.add(...);
    } else if (selected == null) {
        failures.add(new AutoAllocationFailure(activityId, "NO_CANDIDATE", "No resource satisfies all constraints"));
    }
}
```

**Tests:**
- `AutoAllocationServiceTest.testAutoAllocate_successfulMatch_createsAllocation()`
- `AutoAllocationServiceTest.testAutoAllocate_skillMismatch_addsFailure()`
- `AutoAllocationServiceTest.testAutoAllocate_budgetExceeded_skipsExpensiveResources()`
- `AutoAllocationServiceTest.testAutoAllocate_simulateMode_returnsResultsWithoutCreating()`

- [ ] **Commit**

#### Task T4.2: DashboardService & Materialized Views

**File:** `DashboardService.java`

Provides:
- `getSupplyDemand(YearMonth month, String costCenter, String team)` → queries `mv_supply_demand_monthly`
- `getBurnRate(Long projectId)` → queries `mv_project_burn`
- `getUtilization(YearMonth month, Long resourceId)` → queries `mv_utilization_monthly`

MV refresh is scheduled (see T4.3).

**Tests:** Integration test against Testcontainers: after allocating test data, verify MV query returns correct aggregated values.

- [ ] **Commit**

#### Task T4.3: MaterializedViewRefreshTask — Scheduled Refresh with Distributed Lock

**File:** `MaterializedViewRefreshTask.java`

Use `@Scheduled` with ShedLock (TDD §9.2):

```java
@Slf4j
@Component
@RequiredArgsConstructor
public class MaterializedViewRefreshTask {

    private final JdbcTemplate jdbcTemplate;
    private final RedisTemplate<String, String> redisTemplate;

    @Scheduled(cron = "0 */5 9-17 ? * MON-FRI")  // Business hours: every 5min
    @SchedulerLock(name = "refreshMV", lockAtMostFor = "4m", lockAtLeastFor = "5m")
    public void refresh() {
        jdbcTemplate.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY mv_supply_demand_monthly");
        jdbcTemplate.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY mv_project_burn");
        jdbcTemplate.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY mv_utilization_monthly");
        jdbcTemplate.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY mv_overplan_conflicts");
        jdbcTemplate.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY mv_cash_flow_forecast");

        // Broadcast via Redis for WebSocket frontend refresh
        redisTemplate.convertAndSend("dashboard:refresh", Map.of("type", "DASHBOARD_REFRESHED"));
        log.info("MV refresh completed");
    }
}
```

**Off-hours variant:** Second method with `@Scheduled(cron = "0 0/30 18-23,0-8 ? * *")` calling same refresh.

**Dependencies:** Add `net.javacrumbs.shedlock:shedlock-spring` + `shedlock-provider-redis-spring` to `pom.xml`.

**Tests:** `@SpringBootTest` with `@MockBean` for `JdbcTemplate`; verify all 5 MVs refreshed.

- [ ] **Commit**

#### Task T4.4: NotificationService + 9 Event Types

**File:** `NotificationService.java`

Event matrix (TDD §14.1):

| Event | Trigger | Recipients |
|-------|---------|------------|
| `ALLOCATION_SUBMITTED` | `AllocationCreatedEvent` | Assigned POD Manager |
| `ALLOCATION_APPROVED` | `AllocationApprovedEvent` | PM + Resource |
| `ALLOCATION_REJECTED` | `AllocationRejectedEvent` | PM + Resource |
| `BUDGET_EXCEED_WARNING` | `BudgetBurnAlertEvent` (≥80%) | Project Owner + Finance |
| `PROJECT_STATUS_TRANSITION` | `ProjectStatusChangedEvent` | Project team |
| `AUTOALLOCATION_COMPLETE` | `AutoAllocationFinishedEvent` | POD Manager |
| `PROJECT_VERSION_MAJOR` | audit detects version jump > 1 | All stakeholders |
| `HOLIDAY_CALENDAR_UPDATED` | `HolidayCreatedEvent` | All POD Managers |
| `RATE_CHANGED` | `RateCreatedEvent` | PMs of affected active projects |
| `RESOURCE_STATUS_CHANGED` | `ResourceStatusChangedEvent` | Assigned PMs |

**Implementation per event:**
- Determine recipients via query (e.g., find all PMs where `resource_id IN (SELECT resource_id FROM allocations WHERE project_id = :projectId)`)
- Create `Notification` row with `recipient_id`, `type`, `title`, `message`, `action_url`
- Email delivery: integrate with SendGrid/Mailgun (placeholder service interface `EmailService`; sendAsync)
- WebSocket: publish `NOTIFICATION_CREATED` event via `SimpMessagingTemplate.convertAndSend("/topic/notifications", payload)`

**Tests:**
- `NotificationServiceTest.testOnAllocationSubmitted_createsNotificationForPODManager()`
- `NotificationServiceTest.testOnAllocationApproved_createsForPMAndResource()`

- [ ] **Commit**

#### Task T4.5: Rate Limiting Filter

**File:** `RateLimitFilter.java`

Token bucket algorithm (TDD §28.2.2):

- Per-IP (anonymous): 100 req/min, burst 120
- Per-user (authenticated): 500 req/min, burst 600
- Auto-allocate: 10 req/min, burst 15
- Login: 5 req/min, burst 5

**Redis key format:** `rl:tokens:{path}:{identifier}` + `rl:last:{path}:{identifier}`

Use Lua script for atomic check-and-consume (TDD §28.2.2 code block). Return 429 with `Retry-After` header if exceeded.

**Frontend interceptor** (`frontend/src/api/client.ts`): Respect `Retry-After` and retry once after delay.

- [ ] **Commit**

### Frontend Tasks

#### Task T4.6: Dashboard Page — KPIs with Real-time Updates

**Files:**
- `frontend/src/pages/dashboard/DashboardPage.tsx`
- `frontend/src/components/dashboard/KPIGrid.tsx`
- `frontend/src/components/dashboard/SupplyDemandChart.tsx` (Recharts bar)
- `frontend/src/components/dashboard/BurnRateChart.tsx` (Recharts line)
- `frontend/src/components/dashboard/VarianceTable.tsx`

**Layout:**
- KPI cards row: Total HCM Supply, Allocated HCM, Budget Burn %, Overplan Count
- Three charts stacked: Supply vs Demand (bar), Burn Rate trend (line), Variance table (data grid)
- Filters: Month selector, Cost Center multi-select, Team multi-select

**Real-time:** WebSocket connection on mount → subscribe to `dashboard:refresh` → `queryClient.invalidateQueries(['dashboard'])` triggers refetch with 5s stale time.

**Tests:**
- DashboardPage renders all 3 charts with mock data
- WebSocket message triggers query invalidation (use `vi.spyOn(queryClient, 'invalidateQueries')`)

- [ ] **Commit**

```bash
git add frontend/src/pages/dashboard/ frontend/src/components/dashboard/
git commit -m "feat(frontend): add DashboardPage with supply-demand, burn-rate, variance KPIs + WS refresh"
```

#### Task T4.7: NotificationCenter Page + Grouping

**File:** `NotificationCenter.tsx` + `NotificationGroupingToggle.tsx` (TDD §19.5–19.6)

Features:
- Virtual scroll (react-window) for 1000+ notifications
- Group-by-type toggle (persisted to localStorage)
- Mark-all-read button with bulk `PATCH /notifications/bulk-read`
- WebSocket listener for `NOTIFICATION_CREATED` (prepend to list)
- Empty state artwork

**Tests:** RTL tests for grouping logic, mark-read mutation, empty state.

- [ ] **Commit**

---

## Sprint 5: Security, RBAC & Final Integration (5 days, 43h)

### Backend Tasks

#### Task T5.1: SecurityConfig — RBAC + Method Security

**File:** `SecurityConfig.java`

```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(sess -> sess.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/v1/auth/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/resources").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PATCH, "/api/v1/resources/**/status").hasAnyRole("ADMIN", "POD_MANAGER")
                .requestMatchers(HttpMethod.POST, "/api/v1/projects").hasAnyRole("PM", "ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/v1/allocations/**/approve").hasRole("POD_MANAGER")
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}
```

**JwtAuthenticationFilter** validates JWT via `JwtTokenProvider`, loads `UserDetails` from DB, sets `SecurityContext`.

**Role enum:** `Role.VIEWER`, `Role.PM`, `Role.POD_MANAGER`, `Role.ADMIN`. Store in `users.roles` JSONB array; `UserDetailsService` converts to `GrantedAuthority` list.

- [ ] **Tests:**
  - `SecurityIntegrationTest.testAccessWithoutToken_returns401()` (MockMvc)
  - `SecurityIntegrationTest.testPMCanCreateProject_returns201()`
  - `SecurityIntegrationTest.testViewerCannotApproveAllocation_returns403()`
- [ ] **Commit**

#### Task T5.2: Four-Eyes Enforcement — Allocation Approval

**File:** `AllocationService.java` → already contains `if (resourceId.equals(approverId)) throw new FourEyesViolationException()`.

**New exception:** `FourEyesViolationException extends RuntimeException` → mapped to 403 `INSUFFICIENT_PRIVILEGES` by `GlobalExceptionHandler`.

**Test:** `AllocationServiceTest.testApproveOwnAllocation_throws403()`.

- [ ] **Commit**

#### Task T5.3: Audit Logging via JPA EntityListeners

**Files:**
- `AuditEntityListener.java` (TDD §12.1, lines 2433–2463)
- `AuditService.java`
- `AuditContextHolder.java` — ThreadLocal `AuditContext` with `userId` + `changeReason`
- `AuditLog.java` entity

**Integration:** `@Component` + `@EntityListeners(AuditEntityListener.class)` on all audited entities (`@Auditable` marker interface).

**Tests:** `AuditServiceIT` — perform update on Resource, verify row inserted into `audit_log` with correct `entity_type`, `field_name`, `old_value`, `new_value`, `changed_by_user_id`.

- [ ] **Commit**

#### Task T5.4: Security & Performance Test Tasks

From `TEST_IMPLEMENTATION_PLAN.MD` v2.0 (approved):

**Security tasks** (7 tasks, 15.5h total):
- `Sec-T27.1` Viewer role cannot mutate: Integration test asserting `POST /allocations` as VIEWER → 403 (2h)
- `Sec-T27.2` PM cannot approve own: Test allocation where `resource_id == approver_id` → 403 (2h)
- `Sec-T27.3` POD Manager cannot create resources: `POST /resources` as POD_MANAGER → 403 (1.5h)
- `Sec-T27.4` Audit completeness: Insert 100 mutations, verify all have `changed_by IS NOT NULL` (2.5h)
- `Sec-T28.1` SQLi blocked: `' OR '1'='1` in filter params → no leak, returns 400 (2.5h)
- `Sec-T28.2` XSS input escaped: Insert `<script>alert()</script>` in resource name, read back → escaped (2h)
- `Sec-T28.4` No secrets in logs: Verify logback pattern excludes `password`, `token` fields (1.5h)

**Performance tasks** (10 tasks, 13h total):
- `Perf-T29.1` CSV import 1000 rows <30s commit + <10s preview (2.5h)
- `Perf-T29.2` Dashboard concurrent 30 users P95 <1s using k6 + JUnit wrapper (2.5h)
- `Perf-T29.3` Auto-allocation 10 concurrent <15s each (2h)
- `Perf-T30.1` Allocation load: 50 PMs submitting 10/min → 95% success (3h)
- `Perf-T30.2` DB connection pool tuning: HikariCP wait <100ms under load (2h)
- `Perf-T30.3` Redis memory: no OOM under 50k keys (1h)

- [ ] **Commit** each task separately (RED → GREEN → REFACTOR per task)

### Frontend Tasks

#### Task T5.5: Authentication + Role-Based Route Guards

**Files:**
- `frontend/src/pages/LoginPage.tsx`
- `frontend/src/contexts/AuthContext.tsx`
- `frontend/src/components/auth/AuthGuard.tsx`

**Login flow:**
- `POST /api/v1/auth/login` → `{ token, user: { id, email, roles[] } }`
- Token stored in `localStorage` (key: `auth_token`)
- `AuthContext` provides `user`, `roles`, `isAuthenticated`, `login()`, `logout()`
- HTTP interceptor adds `Authorization: Bearer ${token}` to every request

**AuthGuard:**
```typescript
export const AuthGuard = ({ children, role }: { children: ReactNode, role?: string }) => {
  const { isAuthenticated, roles } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (role && !roles.includes(role)) return <Navigate to="/unauthorized" />;
  return <>{children}</>;
};
```

- [ ] **Tests:** Login page renders, submission stores token, guarded routes redirect appropriately
- [ ] **Commit**

#### Task T5.6: Frontend Testing — Unit + Integration + E2E

**Unit (Vitest):**
- `ResourceForm.test.ts` — validation messages
- `DashboardPage.test.ts` — chart rendering mock

**Integration (RTL + MSW):**
- `allocationWorkflow.test.ts` — end-to-end allocation submission with mock server

**E2E (Playwright):**
- `login.spec.ts` — login → navigate → assert Dashboard loads
- `resource-import.spec.ts` — upload CSV → preview → confirm → verify count
- `allocation-approval.spec.ts` — PM submits → POD Manager approves → verify notifications
- `gantt-critical-path.spec.ts` — project with dependencies verifies critical path highlighted

**Coverage target:** Frontend ≥80% statements, ≥75% branches.

- [ ] **Commit** per test file group

---

## Sprint 6: Polish, Documentation, & Release (6 days, 30h)

**Focus:** Final integration testing, documentation, performance tuning, release candidate.

### Backend Tasks

#### Task T6.1: OpenAPI Spec + API Documentation

**File:** `backend/src/main/resources/openapi.yaml`

Document every endpoint (`/api/v1/resources`, `/api/v1/allocations`, etc.) with:
- Summary, description
- Request body schema (with examples)
- Response schema (200, 400, 403, 404, 409, 422)
- Security requirement (`BearerAuth`)

Generate Swagger UI via `springdoc-openapi-starter-webmvc-ui`.

**Test:** `OpenApiValidationTest` verifies all controller methods documented.

- [ ] **Commit**

#### Task T6.2: Final Integration Test Suite

**File:** `EndToEndIntegrationIT.java` (extends `AbstractIntegrationTest`)

**Scenarios (TDD §24 reference):**
1. Resource import → CSV preview → confirm → allocation submit → dashboard refresh (full flow)
2. Project creation → activity dependency cycle detection → GANTT returns critical path
3. Concurrent allocation attempts on same resource → optimistic lock retry succeeds
4. Rate period contiguity — concurrent creation requests serialize correctly (pessimistic lock)
5. Notification delivery — WebSocket message received by frontend subscriber

Run with `mvn verify -DskipUnitTests` to execute only integration suite.

- [ ] **Commit**

#### Task T6.3: Performance Tuning + Load Test

Using Gatling or k6:

- **Test 1:** `GET /api/v1/dashboard/supply-demand` — P95 < 500ms under 100 concurrent users
- **Test 2:** `POST /api/v1/allocations` — 50 RPS sustained, 99% < 200ms
- **Test 3:** Materialized view refresh — `REFRESH CONCURRENTLY mv_supply_demand` completes <30s on 1M allocation rows

Tune:
- HikariCP pool size (default 20 → 30 if needed)
- JPA fetch strategy (`@EntityGraph` for N+1 queries on resource list)
- Redis connection pool

- [ ] **Commit** results + tuning changes

### Frontend Tasks

#### Task T6.4: Accessibility Audit

Run `axe-core` via Playwright:

```typescript
import { injectAxe, checkA11y } from 'axe-playwright';

axe.spec('has no detectable accessibility violations', async ({ page }) => {
  await page.goto('/dashboard');
  await checkA11y(page, {
    // Exclude known false positives (dynamic charts with no text alternative)
    rules: { 'color-contrast': { enabled: false } }
  });
});
```

Fix any violations (focus order, aria-labels, contrast).

- [ ] **Commit**

#### Task T6.5: Build + Dockerize

**Backend Dockerfile** (TDD §15.3):
```dockerfile
FROM eclipse-temurin:17-jdk-alpine AS builder
WORKDIR /app
COPY pom.xml ./
COPY src ./src
RUN mvn -B -DskipTests clean package

FROM eclipse-temurin:17-jre-alpine
COPY --from=builder /app/target/pod-backend.jar /app.jar
ENTRYPOINT ["java","-jar","/app.jar"]
```

**Frontend Dockerfile** (TDD §24.2) — multi-stage build → nginx.

**docker-compose.yml** — full stack: postgres:15, redis:7-alpine, backend, frontend.

- [ ] **Local test:** `docker-compose up --build` → all services healthy
- [ ] **Commit**

#### Task T6.6: Documentation — README + User Guide

**Files:**
- `README.md` — quickstart (clone, docker-compose up, login credentials)
- `docs/API_REFERENCE.md` — generated from OpenAPI
- `docs/DEVELOPER_GUIDE.md` — setup, testing, contribution guidelines
- `docs/OPERATIONS_RUNBOOK.md` — alerts, backup/restore, scaling

- [ ] **Commit**

```bash
git commit -m "docs: add README, API reference, developer guide, operations runbook"
```

---

## Cross-Cutting Definitions of Done (DoD) — Every Task

1. ✅ **RED phase** — failing test written and committed (test-only change)
2. ✅ **GREEN phase** — minimal code change makes test pass
3. ✅ **REFACTOR phase** — code cleaned up without changing behavior; tests still green
4. ✅ **Traceability** — every test annotated with `@Criterion("AC-XX")` referencing SPEC_FUNCTIONAL.md acceptance criteria
5. ✅ **Code review** — peer confirms test determinism, proper mocking, no test logic leaks to implementation
6. ✅ **CI green** — `mvn test` (backend) or `npm run test` (frontend) passes locally and on PR
7. ✅ **Coverage ≥80%** — JaCoCo (Java) or c8/vitest (TS); no lines dropped below threshold
8. ✅ **Documentation** — JavaDoc on public methods; inline comments for complex algorithms; README updated if new endpoint added
9. ✅ **Separate commits** — RED (test-only), GREEN (implementation), REFACTOR (cleanup) in distinct commits; no combined test+code commit
10. ✅ **No secrets in logs** — validate using `git grep -i "password\|secret\|token"`; ensure logback pattern scrubs sensitive fields

---

## Capacity Model & Sprint Timeline

Using **4h productive/day** (8h nominal with meetings/context overhead buffer):

| Sprint | Days | Est. Hours | Nominal/Day | Productive (4h/day) | Buffer | Verdict |
|--------|------|-----------|-------------|---------------------|--------|---------|
| Sprint 0 | 2 | 17h | 8.5h | 8h | +1h (infrastructure OK) | ✅ |
| Sprint 1 | 5 | 40.5h | 8.1h | 20h | +20.5h (over 102%) | ⚠️ Heavy but Sprint 0 absorbed setup |
| Sprint 2 | 8 | 54h | 6.75h | 32h | +22h (over 69%) | ⚠️ Over — consider parallel devs |
| Sprint 3 | 14 | 95h | 6.8h | 56h | +39h (over 70%) | ⚠️ Longest sprint — allocation heavy |
| Sprint 4 | 8 | 57h | 7.1h | 32h | +25h (over 78%) | ⚠️ Dashboard parallelizable |
| Sprint 5 | 5 | 43h | 8.6h | 20h | +23h (over 115%) | ⚠️ Security+perf intensive |
| Sprint 6 | 6 | 30h | 5h | 24h | +6h (over 25%) | ✅ Light, acceptable |

**Total elapsed:** ~46 days (2.5 months)

**Parallelization recommendation:**
- Sprint 3 (allocation engine) → 2 backend devs
- Sprint 4 (dashboard + notification) → 1 BE + 1 FE overlapping
- Sprint 5 (sec tasks) → 1 BE specialist + 1 FE finishing UI polish

**Tracking:** Daily standup reports `actual_hours / estimated_hours` per task. Sprint >90% burn flagged for adjustment.

---

## Traceability Matrix (to SPEC_FUNCTIONAL Acceptance Criteria)

| AC-ID | Requirement | Implementation Task(s) | Test File |
|-------|-------------|----------------------|-----------|
| AC-01 | Resource CRUD | T1.1, T1.3, T1.5 | `ResourceControllerTest.java` |
| AC-02 | Rate CRUD with effective dates | T1.1, T1.3, T1.4, T1.5 | `RateServiceTest.java` |
| AC-03 | Resource `external_id` immutable after creation | T1.5 (PATCH blocked), T5.x (security) | `test_external_id_immutable_negative` |
| AC-04 | CSV resource import with preview | T1.5, T1.6 | `ResourceImportIT.java` |
| AC-05 | Project CRUD | T2.1, T2.2, T2.3 | `ProjectControllerTest.java` |
| AC-06 | Activity + Dependencies (cycle detection) | T2.2, T2.4 | `GanttServiceTest.testCycleDetected_throws()` |
| AC-07 | Gantt critical path | T2.4 | `GanttServiceCriticalPathIT.java` |
| AC-08 | Allocation submit + constraint check | T3.1, T3.2, T3.4 | `AllocationConstraintValidatorTest.java` |
| AC-09 | Allocation approval workflow | T3.2, T3.4, T5.2 | `AllocationApprovalWorkflowIT.java` |
| AC-10 | Project terminal freeze | T2.2, T3.3 | `ProjectTerminalTransitionIT.java` |
| AC-11 | Auto-allocation engine | T4.1 | `AutoAllocationServiceTest.java` |
| AC-12 | Dashboard supply-demand | T4.2, T4.3, T4.6 | `DashboardIntegrationIT.java` |
| AC-13 | Notifications (in-app) | T4.4, T5.6 | `NotificationDeliveryIT.java` |
| ... | ... | ... | ... |
| AC-36 | **All 36 PRD criteria covered** | Task list above | Test Plan 341 tests |

Full traceability maintained in `TRACEABILITY_MATRIX.xlsx` — updated after each test commit.

---

## Risk Register

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Sprint capacity overallocation leads to burnout | High | High | Already adjusted to 4h/day; monitor daily standup; drop lower-priority stories if burn >90% |
| Concurrent allocation 5-project cap race condition | Medium | High | Pessimistic lock on allocations Table 8.3.5; integration test verifies serialization |
| Materialized view refresh takes >30s on prod data | Medium | Medium | Add partial indexes, `CONCURRENTLY`; monitor with `mv_refresh_duration_seconds` metric; scale DB if needed |
| Frontend E2E tests flaky due to network timing | Medium | Low | Add retry logic + explicit waitFor assertions; keep tests idempotent |
| Third-party email service latency blocks allocation approval | Low | Medium | Make email async with retry; audit log independent of email success |
| Rate period contiguity edge case: year-boundary Dec→Jan | Low | High | Already covered by TC-RM-18 test; validated in `RateServiceTest.testYearBoundary()` |

---

## Final Validation Checklist (Pre-merge to main)

- [ ] **Backend:**
  - [ ] `mvn clean verify` passes 100% (unit + integration + security + perf tests)
  - [ ] JaCoCo coverage ≥80% (all packages)
  - [ ] SonarQube quality gate: 0 bugs, 0 vulnerabilities, 0 code smells
  - [ ] All 6 security test tasks (`Sec-T27.x`, `Sec-T28.x`) green
  - [ ] All 10 performance tasks meet targets (k6 reports)

- [ ] **Frontend:**
  - [ ] `npm run test:coverage` ≥80%
  - [ ] `npm run lint` zero errors
  - [ ] `npm run build` succeeds (production bundle <200KB)
  - [ ] Playwright E2E suite passes on CI (Linux)

- [ ] **Integration:**
  - [ ] `docker-compose up` builds all services in <10min
  - [ ] Manual smoke test: full allocation workflow (PM → POD approval → dashboard updated)
  - [ ] Performance test: 30 concurrent dashboard viewers, P95 <1s

- [ ] **Documentation:**
  - [ ] OpenAPI spec generated and CI-validated
  - [ ] `README.md` contains local setup + sample credentials
  - [ ] `OPERATIONS_RUNBOOK.md` covers all P0/P1 alerts

---

**Plan Complete**

Total estimated tasks: ~108 implementation tasks across 6 sprints + Sprint 0 infrastructure.
Total calendar days: ~46 days (2.5 months) with 4h/day productive capacity.

*Plan authored by Claude Code using superpowers:writing-plans based on `TECHNICAL_DESIGN.md` v2.2.*
