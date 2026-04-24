# Full-Stack Integration Test Infrastructure — Design Spec

**Date:** 2026-04-24
**Sprint:** Post-Sprint 1 (Resources & Rates complete)
**Goal:** Enable end-to-end integration testing between frontend and backend, with Docker Compose infrastructure, Spring Boot configuration, and Playwright E2E test scripts.

---

## 1. Docker Compose Infrastructure

**File:** `infra/docker-compose.yml`

### Services

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| postgres | `postgres:15-alpine` | 5432 | Primary database |
| redis | `redis:7-alpine` | 6379 | Caching, distributed locks, ShedLock |
| backend | Built from `backend/Dockerfile` | 8080 | Spring Boot API |
| frontend | Built from `frontend/Dockerfile` | 80 | Nginx serving built React + `/api` proxy |

### Local dev mode

For daily development, only postgres + redis run via compose. Backend and frontend start normally with hot reload:

```bash
cd infra && docker compose up postgres redis -d
cd backend && mvn spring-boot:run   # connects to compose postgres + redis
cd frontend && npm run dev           # proxies /api → localhost:8080
```

### Full-stack mode (CI / smoke testing)

All 4 services:

```bash
cd infra && docker compose up --build
# Backend at http://localhost:8080
# Frontend at http://localhost:80 (nginx proxies /api → backend:8080)
```

### Dev script

**File:** `infra/scripts/start-dev.sh`

Spins up postgres + redis in detached mode, prints connection info, waits for health checks.

### PostgreSQL configuration

- Database: `pod`
- User/Password: `pod/pod`
- Volume: `pgdata` for persistence across restarts
- Health check: `pg_isready -U pod`

### Redis configuration

- No password (local dev only)
- Volume: `redisdata` for persistence
- Health check: `redis-cli ping`
- Max memory: 256mb with allkeys-lru eviction (prevent OOM in dev)

---

## 2. Spring Boot Configuration

### `application.yml` — Common config

```yaml
server:
  port: 8080

spring:
  application:
    name: pod-team-management

  jpa:
    hibernate:
      ddl-auto: validate
    open-in-view: false
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
        default_schema: public

  flyway:
    enabled: true
    locations: classpath:db/migration
    clean-disabled: false

  jackson:
    serialization:
      write-dates-as-timestamps: false
    date-format: com.pod.config.ISO8601DateFormat
    default-property-inclusion: non_null

  cache:
    type: redis
    redis:
      time-to-live: 2592000000  # 30 days in ms (rate cache TTL)

  data:
    redis:
      timeout: 3000ms

  datasource:
    hikari:
      maximum-pool-size: 20
      minimum-idle: 5
      idle-timeout: 300000
      max-lifetime: 1800000
      connection-timeout: 30000

shedlock:
  provider: redis
  defaults:
    lock-at-most-for: 4m
    lock-at-least-for: 1m
```

### `application-dev.yml` — Dev overrides

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/pod
    username: pod
    password: pod
    driver-class-name: org.postgresql.Driver

  data:
    redis:
      host: localhost
      port: 6379

  jpa:
    show-sql: true
    properties:
      hibernate:
        format_sql: true

logging:
  level:
    com.pod: DEBUG
    org.hibernate.SQL: DEBUG
    org.hibernate.type.descriptor.sql.BasicBinder: TRACE
```

### `application-test.yml` — Test overrides

```yaml
spring:
  datasource:
    url: jdbc:h2:mem:pod_test;DB_CLOSE_DELAY=-1;MODE=PostgreSQL
    username: sa
    password:
    driver-class-name: org.h2.Driver

  jpa:
    hibernate:
      ddl-auto: create-drop
    show-sql: true

  flyway:
    enabled: true
    locations: classpath:db/migration

  data:
    redis:
      host: localhost
      port: 6379

  cache:
    type: none
```

### Jackson date config

**File:** `backend/src/main/java/com/pod/config/JacksonConfig.java`

Registers `JavaTimeModule`, disables `WRITE_DATES_AS_TIMESTAMPS`, ensures `Instant` fields serialize as ISO-8601 strings.

---

## 3. Permissive SecurityConfig

**File:** `backend/src/main/java/com/pod/config/SecurityConfig.java`

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
        return http.build();
    }
}
```

Rationale: Sprint 5 (T5.1) replaces this with JWT + RBAC. The permissive config is needed now so that:
- Frontend can call all endpoints without auth tokens
- Playwright E2E tests don't need to handle login flow
- Spring Security auto-config doesn't block requests with default form login

---

## 4. Frontend-Backend Contract Gaps

### Current gap

`ResourceController.getAll()` returns `List<Resource>` with no query params, but `frontend/src/api/resources.ts` sends `?search=...&skill=...&costCenter=...&status=...&page=...&size=...`.

### Fix: Wire filter params to controller

Update `ResourceController.getAll()` to accept optional filter params and return paginated results:

```java
@GetMapping
public Page<Resource> getAll(
    @RequestParam(required = false) String search,
    @RequestParam(required = false) String skill,
    @RequestParam(required = false) String costCenter,
    @RequestParam(required = false) String status,
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "20") int size) {
    // delegate to ResourceService.findAllWithFilters(...)
}
```

Return type changes from `List<Resource>` to `Page<Resource>`, which Spring serializes as:

```json
{
  "content": [...],
  "totalElements": 42,
  "totalPages": 3,
  "number": 0,
  "size": 20
}
```

This matches the frontend `PaginatedResponse<T>` type.

### ResourceService addition

Add `findAllWithFilters(search, skill, costCenter, status, pageable)` that delegates to `ResourceRepository.findByFilters()`. This repository method already exists from T1.3.

### Frontend type alignment

The frontend `ResourceFilters` already defines `search`, `skill`, `costCenter`, `status`, `page`, `size` — no frontend changes needed. The `getResources()` function already builds the correct query params.

---

## 5. Playwright E2E Tests

### Project setup

**Directory:** `frontend/e2e/` (separate npm project)

**`frontend/e2e/package.json`:**
- Dependencies: `@playwright/test`, `playwright`
- Scripts: `"test:e2e": "playwright test"`, `"test:e2e:ui": "playwright test --ui"`

### Playwright config

**File:** `frontend/e2e/playwright.config.ts`

```typescript
export default defineConfig({
  testDir: './specs',
  timeout: 30000,
  retries: 2,
  use: {
    baseURL: 'http://localhost:5173',
    locale: 'en-US',
  },
  webServer: [
    {
      command: 'cd ../../backend && mvn spring-boot:run -Dspring-boot.run.profiles=dev',
      port: 8080,
      reuseExistingServer: true,
      timeout: 120000,
    },
    {
      command: 'cd .. && npm run dev',
      port: 5173,
      reuseExistingServer: true,
    },
  ],
});
```

Playwright starts backend and frontend automatically if not already running. Pre-requisite: postgres + redis must be available (via `docker compose up postgres redis -d`).

### Test scenarios

**File:** `frontend/e2e/specs/resource-crud.spec.ts`

1. **Resource list loads with seed data** — navigate to `/resources`, verify table renders rows from V1.3 seed data
2. **Create resource via API + verify in UI** — POST to `/api/v1/resources` to create a resource, refresh list, verify new row appears
3. **Filter by status** — select "ACTIVE" from status dropdown, verify only ACTIVE resources shown
4. **Change resource status** — click status action, set to ON_LEAVE, verify badge updates
5. **Soft delete resource** — click delete, verify resource removed from active list

**File:** `frontend/e2e/specs/rate-crud.spec.ts`

6. **Rate list loads** — navigate to rates, verify seed rates render
7. **Create rate with contiguity** — POST a new rate for an existing CC+BTC pair, verify it appears and previous rate is auto-closed
8. **Rate gap detection** — POST a rate with a gap (skip a month), verify 400 error

### Test data strategy

- Flyway seed migrations (V1.1–V1.4) provide baseline data
- Each test creates its own test-specific data via API calls in `beforeEach`
- Tests clean up via API (soft delete) or rely on database state being reset between test runs
- For CI: start fresh postgres container per test run (no volume persistence)

---

## 6. File Manifest

New files to create:

| File | Purpose |
|------|---------|
| `infra/docker-compose.yml` | PostgreSQL + Redis + Backend + Frontend services |
| `infra/scripts/start-dev.sh` | Dev helper: spin up postgres + redis |
| `backend/src/main/resources/application.yml` | Common Spring config |
| `backend/src/main/resources/application-dev.yml` | Dev profile overrides |
| `backend/src/main/resources/application-test.yml` | Test profile overrides |
| `backend/src/main/java/com/pod/config/SecurityConfig.java` | Permissive auth (permit all) |
| `backend/src/main/java/com/pod/config/JacksonConfig.java` | ISO-8601 date serialization |
| `frontend/e2e/package.json` | Playwright project dependencies |
| `frontend/e2e/playwright.config.ts` | Playwright config with webServer |
| `frontend/e2e/specs/resource-crud.spec.ts` | Resource E2E tests (5 scenarios) |
| `frontend/e2e/specs/rate-crud.spec.ts` | Rate E2E tests (3 scenarios) |

Files to modify:

| File | Change |
|------|--------|
| `backend/src/main/java/com/pod/controller/ResourceController.java` | Add filter params + pagination to `getAll()` |
| `backend/src/main/java/com/pod/service/ResourceService.java` | Add `findAllWithFilters()` method |
| `PROGRESS.md` | Update with integration test infra status |

---

## 7. Success Criteria

1. `docker compose up postgres redis -d` starts both services, health checks pass
2. `mvn spring-boot:run -Dspring-boot.run.profiles=dev` connects to compose postgres + redis, Flyway migrations run, app starts on 8080
3. `curl http://localhost:8080/api/v1/resources` returns JSON array (or paginated response)
4. `npm run dev` starts frontend, navigating to `http://localhost:5173/resources` renders the Resource List page with data from the backend
5. `cd frontend/e2e && npx playwright test` runs all 8 E2E scenarios and passes
6. Creating a resource via the UI appears in the list after refresh
7. Filter controls narrow results matching the backend query params
