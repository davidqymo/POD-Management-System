# Full-Stack Integration Test Infrastructure — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up Docker Compose infrastructure, Spring Boot configuration, permissive SecurityConfig, frontend-backend contract alignment, and Playwright E2E tests so Sprint 1 (Resources & Rates) can be tested end-to-end.

**Architecture:** Docker Compose runs PostgreSQL 15 + Redis 7 for local dev. Spring Boot connects via `application-dev.yml`. A permissive SecurityConfig (permit all) replaces Spring Security's default form login. ResourceController gains filter params + pagination to match frontend expectations. Playwright E2E tests exercise the full stack via browser.

**Tech Stack:** Docker Compose, PostgreSQL 15, Redis 7, Spring Boot 3.2, React 18, Vite 5, Playwright 1.40+, TanStack React Query 5

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `infra/docker-compose.yml` | Create | PostgreSQL + Redis services for local dev |
| `infra/scripts/start-dev.sh` | Create | Helper: spin up postgres + redis |
| `backend/src/main/resources/application.yml` | Create | Common Spring Boot config |
| `backend/src/main/resources/application-dev.yml` | Create | Dev profile (local postgres/redis) |
| `backend/src/main/resources/application-test.yml` | Create | Test profile (H2, no Redis) |
| `backend/src/main/java/com/pod/config/SecurityConfig.java` | Create | Permissive auth (permit all) |
| `backend/src/main/java/com/pod/config/JacksonConfig.java` | Create | ISO-8601 date serialization |
| `backend/src/main/java/com/pod/controller/ResourceController.java` | Modify | Add filter params + pagination to `getAll()` |
| `backend/src/main/java/com/pod/service/ResourceService.java` | Modify | Add `findAllWithFilters()` method |
| `frontend/e2e/playwright.config.ts` | Modify | Update webServer config for full stack |
| `frontend/e2e/specs/resource-crud.spec.ts` | Create | Resource E2E tests (5 scenarios) |
| `frontend/e2e/specs/rate-crud.spec.ts` | Create | Rate E2E tests (3 scenarios) |
| `frontend/e2e/spec/example.spec.ts` | Delete | Replace with real specs |

---

## Task 1: Docker Compose — PostgreSQL + Redis

**Files:**
- Create: `infra/docker-compose.yml`
- Create: `infra/scripts/start-dev.sh`

- [ ] **Step 1: Create `infra/docker-compose.yml`**

```yaml
version: "3.9"

services:
  postgres:
    image: postgres:15-alpine
    container_name: pod-postgres
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: pod
      POSTGRES_USER: pod
      POSTGRES_PASSWORD: pod
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U pod"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: pod-redis
    ports:
      - "6379:6379"
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
  redisdata:
```

- [ ] **Step 2: Create `infra/scripts/start-dev.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/../docker-compose.yml"

echo "Starting PostgreSQL + Redis for local development..."
docker compose -f "$COMPOSE_FILE" up postgres redis -d

echo ""
echo "Waiting for health checks..."
sleep 5

# Verify postgres is ready
until docker exec pod-postgres pg_isready -U pod &>/dev/null; do
  echo "  Waiting for postgres..."
  sleep 2
done
echo "  PostgreSQL: ready on localhost:5432 (pod/pod)"

# Verify redis is ready
until docker exec pod-redis redis-cli ping &>/dev/null; do
  echo "  Waiting for redis..."
  sleep 2
done
echo "  Redis:      ready on localhost:6379"

echo ""
echo "To stop: docker compose -f $COMPOSE_FILE down"
```

- [ ] **Step 3: Make script executable and test**

Run: `chmod +x infra/scripts/start-dev.sh`
Run: `cd infra && docker compose up postgres redis -d`
Expected: Both containers start, health checks pass

- [ ] **Step 4: Verify connectivity**

Run: `docker exec pod-postgres pg_isready -U pod`
Expected: accepting connections
Run: `docker exec pod-redis redis-cli ping`
Expected: PONG

- [ ] **Step 5: Commit**

```bash
git add infra/docker-compose.yml infra/scripts/start-dev.sh
git commit -m "feat(infra): add Docker Compose with PostgreSQL 15 + Redis 7 for local dev"
```

---

## Task 2: Spring Boot Application Configuration

**Files:**
- Create: `backend/src/main/resources/application.yml`
- Create: `backend/src/main/resources/application-dev.yml`
- Create: `backend/src/main/resources/application-test.yml`

- [ ] **Step 1: Create `application.yml`**

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
    default-property-inclusion: non_null

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

logging:
  level:
    com.pod: INFO
```

- [ ] **Step 2: Create `application-dev.yml`**

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
```

- [ ] **Step 3: Create `application-test.yml`**

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
    enabled: false

  autoconfigure:
    exclude:
      - org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration
      - org.springframework.boot.autoconfigure.data.redis.RedisRepositoriesAutoConfiguration

  cache:
    type: none
```

- [ ] **Step 4: Verify existing unit tests still pass with test profile**

Run: `cd backend && mvn test -Dtest=ResourceServiceTest`
Expected: All 5 tests pass (H2 in-memory, no Redis needed)

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/resources/application.yml backend/src/main/resources/application-dev.yml backend/src/main/resources/application-test.yml
git commit -m "feat(config): add Spring Boot application.yml with dev and test profiles"
```

---

## Task 3: Permissive SecurityConfig

**Files:**
- Create: `backend/src/main/java/com/pod/config/SecurityConfig.java`

Without this config, `spring-boot-starter-security` auto-generates a random password and returns 401 on all requests. We need permit-all for Sprint 1–4 integration testing. Sprint 5 (T5.1) replaces this with JWT + RBAC.

- [ ] **Step 1: Write failing test**

Create `backend/src/test/java/com/pod/config/SecurityConfigTest.java`:

```java
package com.pod.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SecurityConfigTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void unauthenticatedRequest_permitted() throws Exception {
        mockMvc.perform(get("/api/v1/resources"))
            .andExpect(status().isOk());
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && mvn test -Dtest=SecurityConfigTest`
Expected: FAIL — 401 Unauthorized (Spring Security default blocks unauthenticated requests)

- [ ] **Step 3: Create SecurityConfig**

Create `backend/src/main/java/com/pod/config/SecurityConfig.java`:

```java
package com.pod.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
        return http.build();
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && mvn test -Dtest=SecurityConfigTest`
Expected: PASS — `GET /api/v1/resources` returns 200

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/pod/config/SecurityConfig.java backend/src/test/java/com/pod/config/SecurityConfigTest.java
git commit -m "feat(security): add permissive SecurityConfig for integration testing (permit all, CSRF disabled)"
```

---

## Task 4: JacksonConfig — ISO-8601 Date Serialization

**Files:**
- Create: `backend/src/main/java/com/pod/config/JacksonConfig.java`

The `Resource` entity has `Instant` fields (`createdAt`, `updatedAt`). Without explicit config, Spring Boot may serialize these as numeric timestamps depending on classpath. We need ISO-8601 strings for the frontend to parse correctly.

- [ ] **Step 1: Write failing test**

Create `backend/src/test/java/com/pod/config/JacksonConfigTest.java`:

```java
package com.pod.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class JacksonConfigTest {

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void instant_serializedAsIso8601() throws Exception {
        Instant instant = Instant.parse("2026-04-24T12:00:00Z");
        String json = objectMapper.writeValueAsString(instant);
        assertThat(json).contains("2026-04-24");
        assertThat(json).doesNotMatch("^\\d+$"); // not a numeric timestamp
    }
}
```

- [ ] **Step 2: Run test to verify it fails or passes**

Run: `cd backend && mvn test -Dtest=JacksonConfigTest`
Note: Spring Boot's auto-config may already handle this via `jackson-datatype-jsr310` on classpath. If it passes, we still create the explicit config for clarity and to guarantee behavior.

- [ ] **Step 3: Create JacksonConfig**

Create `backend/src/main/java/com/pod/config/JacksonConfig.java`:

```java
package com.pod.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

@Configuration
public class JacksonConfig {

    @Bean
    @Primary
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        return mapper;
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && mvn test -Dtest=JacksonConfigTest`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/pod/config/JacksonConfig.java backend/src/test/java/com/pod/config/JacksonConfigTest.java
git commit -m "feat(config): add JacksonConfig for ISO-8601 Instant serialization"
```

---

## Task 5: ResourceController — Add Filter Params + Pagination

**Files:**
- Modify: `backend/src/main/java/com/pod/controller/ResourceController.java`
- Modify: `backend/src/main/java/com/pod/service/ResourceService.java`
- Modify: `backend/src/test/java/com/pod/controller/ResourceControllerTest.java`

The frontend `getResources()` sends `?search=...&skill=...&costCenter=...&status=...&page=...&size=...` but `ResourceController.getAll()` accepts no params and returns `List<Resource>`. We need to accept filter params and return `Page<Resource>` to match the frontend's `PaginatedResponse<T>` type.

- [ ] **Step 1: Write failing test for paginated filter endpoint**

Add to `backend/src/test/java/com/pod/controller/ResourceControllerTest.java`:

```java
@Test
void getAll_withFilters_returnsPaginatedResponse() throws Exception {
    mockMvc.perform(get("/api/v1/resources")
            .param("skill", "backend")
            .param("status", "ACTIVE")
            .param("page", "0")
            .param("size", "10"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content").isArray())
        .andExpect(jsonPath("$.totalElements").isNumber())
        .andExpect(jsonPath("$.size").value(10));
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && mvn test -Dtest=ResourceControllerTest#getAll_withFilters_returnsPaginatedResponse`
Expected: FAIL — `getAll()` currently returns `List<Resource>` not `Page<Resource>`, no filter params accepted

- [ ] **Step 3: Update ResourceService — add `findAllWithFilters()`**

Add method to `ResourceService.java`:

```java
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

@Transactional(readOnly = true)
public Page<Resource> findAllWithFilters(String search, String skill, String costCenter, String status, Pageable pageable) {
    Specification<Resource> spec = Specification.where(null);

    if (search != null && !search.isBlank()) {
        spec = spec.and((root, query, cb) ->
            cb.or(
                cb.like(cb.lower(root.get("name")), "%" + search.toLowerCase() + "%"),
                cb.like(cb.lower(root.get("externalId")), "%" + search.toLowerCase() + "%"),
                cb.like(cb.lower(root.get("costCenterId")), "%" + search.toLowerCase() + "%")
            )
        );
    }
    if (skill != null && !skill.isBlank()) {
        spec = spec.and((root, query, cb) -> cb.equal(root.get("skill"), skill));
    }
    if (costCenter != null && !costCenter.isBlank()) {
        spec = spec.and((root, query, cb) -> cb.equal(root.get("costCenterId"), costCenter));
    }
    if (status != null && !status.isBlank()) {
        spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), ResourceStatus.valueOf(status)));
    }
    spec = spec.and((root, query, cb) -> cb.isTrue(root.get("isActive")));

    return resourceRepository.findAll(spec, pageable);
}
```

Note: `JpaSpecificationExecutor` must be added to `ResourceRepository` interface:

```java
public interface ResourceRepository extends JpaRepository<Resource, Long>, JpaSpecificationExecutor<Resource> {
    // ... existing methods unchanged
}
```

- [ ] **Step 4: Update ResourceController — accept filter params and return Page**

Replace `getAll()` in `ResourceController.java`:

```java
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

@GetMapping
public Page<Resource> getAll(
        @RequestParam(required = false) String search,
        @RequestParam(required = false) String skill,
        @RequestParam(required = false) String costCenter,
        @RequestParam(required = false) String status,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size) {
    return resourceService.findAllWithFilters(search, skill, costCenter, status, PageRequest.of(page, size, Sort.by("name")));
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && mvn test -Dtest=ResourceControllerTest`
Expected: All existing tests + new filter test PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/pod/controller/ResourceController.java backend/src/main/java/com/pod/service/ResourceService.java backend/src/main/java/com/pod/repository/ResourceRepository.java backend/src/test/java/com/pod/controller/ResourceControllerTest.java
git commit -m "feat(controller): add filter params + pagination to ResourceController.getAll()"
```

---

## Task 6: Frontend API — Align with Paginated Response

**Files:**
- Modify: `frontend/src/api/resources.ts`
- Modify: `frontend/src/hooks/useResources.ts`

The backend now returns `Page<Resource>` (`{ content: [...], totalElements, ... }`) instead of `Resource[]`. The frontend must parse this correctly.

- [ ] **Step 1: Write failing test**

The existing `ResourceList.test.tsx` may break because `getResources()` now returns `{ content: [...] }` instead of a raw array. Check by running:

Run: `cd frontend && npm test -- --run`
Expected: Tests may fail if they mock the API response as a plain array

- [ ] **Step 2: Update `frontend/src/api/resources.ts`**

Replace `getResources()` return type:

```typescript
import client from './client'
import type { Resource, ResourceFilters, PaginatedResponse } from '../types'

export function getResources(filters: ResourceFilters = {}) {
  const params = new URLSearchParams()
  if (filters.search) params.set('search', filters.search)
  if (filters.skill) params.set('skill', filters.skill)
  if (filters.costCenter) params.set('costCenter', filters.costCenter)
  if (filters.status) params.set('status', filters.status)
  if (filters.page !== undefined) params.set('page', String(filters.page))
  if (filters.size !== undefined) params.set('size', String(filters.size))

  return client.get<PaginatedResponse<Resource>>(`/resources?${params.toString()}`).then((r) => r.data)
}

// ... other functions unchanged
```

- [ ] **Step 3: Update `frontend/src/hooks/useResources.ts`**

The `useResources` hook needs to extract `.content` from the paginated response:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getResources, getResourceById, createResource, changeStatus, deleteResource } from '../api/resources'
import type { ResourceFilters } from '../types'

export function useResources(filters: ResourceFilters = {}) {
  return useQuery({
    queryKey: ['resources', filters],
    queryFn: async () => {
      const response = await getResources(filters)
      return response.content
    },
  })
}

// ... other hooks unchanged
```

- [ ] **Step 4: Update existing test mocks to return paginated shape**

In `frontend/src/pages/resources/__tests__/ResourceList.test.tsx`, update MSW handler to return paginated response:

```typescript
// Change mock from:
//   return res(ctx.json([...resources]))
// To:
return res(ctx.json({ content: resources, totalElements: resources.length, totalPages: 1, number: 0, size: 20 }))
```

Same pattern for `frontend/src/components/common/__tests__/DataTable.test.tsx` if it mocks resources API.

- [ ] **Step 5: Run frontend tests to verify**

Run: `cd frontend && npm test -- --run`
Expected: All 18 tests pass

- [ ] **Step 6: Commit**

```bash
git add frontend/src/api/resources.ts frontend/src/hooks/useResources.ts frontend/src/pages/resources/__tests__/ResourceList.test.tsx
git commit -m "feat(api): align frontend with paginated Resource response from backend"
```

---

## Task 7: Backend Smoke Test — Full Stack Startup

**Files:** None (verification only)

This task verifies the full stack starts correctly with Docker Compose + Spring Boot + frontend dev server.

- [ ] **Step 1: Ensure Docker containers are running**

Run: `cd infra && docker compose up postgres redis -d`
Run: `docker exec pod-postgres pg_isready -U pod`
Expected: accepting connections

- [ ] **Step 2: Start backend with dev profile**

Run: `cd backend && mvn spring-boot:run -Dspring-boot.run.profiles=dev`
Expected: Application starts, Flyway migrations execute (V1 + V2 + V1.1–V1.4), listening on port 8080

- [ ] **Step 3: Verify API endpoints**

Run: `curl -s http://localhost:8080/api/v1/resources | head -200`
Expected: JSON response with `{ "content": [...], "totalElements": ..., ... }` shape. If seed data includes resources, they appear. Otherwise `content` is an empty array.

Run: `curl -s http://localhost:8080/api/v1/rates | head -100`
Expected: JSON array of rates (possibly empty if no rate seed data)

- [ ] **Step 4: Start frontend dev server**

Run: `cd frontend && npm run dev`
Expected: Vite starts on port 5173, proxies `/api` to localhost:8080

- [ ] **Step 5: Open browser and verify Resource List page**

Open: `http://localhost:5173/resources`
Expected: Page loads, shows "Resources" header, data table (empty or with seed data), filter controls work

- [ ] **Step 6: Note any issues found**

Document any CORS issues, data shape mismatches, or missing endpoints. Fix in subsequent tasks if needed.

---

## Task 8: Playwright E2E Config — Update for Full Stack

**Files:**
- Modify: `frontend/e2e/playwright.config.ts`
- Modify: `frontend/e2e/package.json`
- Delete: `frontend/e2e/spec/example.spec.ts`

The existing `playwright.config.ts` uses `npm run preview` (port 4173) and doesn't start the backend. We need it to start both backend and frontend, and point at the Vite dev server (port 5173) which proxies `/api` to the backend.

- [ ] **Step 1: Update `frontend/e2e/package.json`**

```json
{
  "name": "pod-frontend-e2e",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug"
  },
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "typescript": "^5.4.0"
  }
}
```

(No changes needed — dependencies are correct)

- [ ] **Step 2: Update `frontend/e2e/playwright.config.ts`**

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './specs',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
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
      timeout: 60000,
    },
  ],
});
```

Key changes:
- `testDir: './specs'` (was `./spec`)
- `fullyParallel: false` + `workers: 1` (avoid concurrent DB mutations)
- `baseURL: http://localhost:5173` (dev server, not preview)
- Two `webServer` entries: backend (8080) + frontend (5173)
- Increased backend timeout to 120s (Maven startup is slow)

- [ ] **Step 3: Delete example spec and create specs directory**

Run: `rm frontend/e2e/spec/example.spec.ts`
Run: `rmdir frontend/e2e/spec`
Run: `mkdir -p frontend/e2e/specs`

- [ ] **Step 4: Install Playwright browsers**

Run: `cd frontend/e2e && npm ci && npx playwright install chromium`
Expected: Chromium browser downloaded

- [ ] **Step 5: Commit**

```bash
git add frontend/e2e/playwright.config.ts
git rm frontend/e2e/spec/example.spec.ts
git commit -m "test(e2e): update Playwright config for full-stack testing (backend + frontend webServer)"
```

---

## Task 9: Playwright E2E — Resource CRUD Tests

**Files:**
- Create: `frontend/e2e/specs/resource-crud.spec.ts`

- [ ] **Step 1: Create Resource E2E test file**

Create `frontend/e2e/specs/resource-crud.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:8080/api/v1';

test.describe('Resource CRUD', () => {

  test.beforeEach(async ({ request }) => {
    // Clean up: soft-delete any resources created by previous test runs
    // by fetching all and deleting them. Seed data is re-inserted by Flyway on each DB reset.
    // For now, we rely on the database being in a clean state (seed data only).
  });

  test('resource list loads and displays seed data', async ({ page }) => {
    await page.goto('/resources');

    // Page header
    await expect(page.getByRole('heading', { name: 'Resources' })).toBeVisible();

    // Table renders (at minimum the header row)
    await expect(page.getByText('Name')).toBeVisible();
    await expect(page.getByText('Status')).toBeVisible();
  });

  test('create resource via API and verify in UI', async ({ page, request }) => {
    // Create a resource via API
    const response = await request.post(`${API_BASE}/resources`, {
      data: {
        externalId: 'E2E-001',
        name: 'E2E Test User',
        costCenterId: 'ENG-CC1',
        billableTeamCode: 'BTC-API',
        category: 'PERMANENT',
        skill: 'backend',
        level: 3,
        status: 'ACTIVE',
        isBillable: true,
        isActive: true,
      },
    });
    expect(response.ok()).toBeTruthy();

    // Navigate to resources page
    await page.goto('/resources');

    // Verify the new resource appears
    await expect(page.getByText('E2E Test User')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('E2E-001')).toBeVisible();
  });

  test('filter by status shows only matching resources', async ({ page, request }) => {
    // Create an ACTIVE resource
    await request.post(`${API_BASE}/resources`, {
      data: {
        externalId: 'E2E-ACTIVE',
        name: 'Active Resource',
        costCenterId: 'ENG-CC1',
        billableTeamCode: 'BTC-API',
        category: 'PERMANENT',
        skill: 'backend',
        level: 2,
        status: 'ACTIVE',
        isBillable: true,
        isActive: true,
      },
    });

    // Create an ON_LEAVE resource
    await request.post(`${API_BASE}/resources`, {
      data: {
        externalId: 'E2E-LEAVE',
        name: 'On Leave Resource',
        costCenterId: 'ENG-CC1',
        billableTeamCode: 'BTC-API',
        category: 'PERMANENT',
        skill: 'backend',
        level: 2,
        status: 'ON_LEAVE',
        isBillable: true,
        isActive: true,
      },
    });

    await page.goto('/resources');

    // Both should be visible initially
    await expect(page.getByText('Active Resource')).toBeVisible({ timeout: 10000 });

    // Filter by ACTIVE status
    await page.getByRole('combobox', { name: /all statuses/i }).selectOption('ACTIVE');

    // Wait for the table to update
    await page.waitForTimeout(500);

    // Verify "Active" badge appears for filtered results
    const activeBadges = page.getByText('Active');
    await expect(activeBadges.first()).toBeVisible();
  });

  test('change resource status via API and verify badge in UI', async ({ page, request }) => {
    // Create a resource
    const createResp = await request.post(`${API_BASE}/resources`, {
      data: {
        externalId: 'E2E-STATUS',
        name: 'Status Test Resource',
        costCenterId: 'ENG-CC1',
        billableTeamCode: 'BTC-API',
        category: 'PERMANENT',
        skill: 'backend',
        level: 4,
        status: 'ACTIVE',
        isBillable: true,
        isActive: true,
      },
    });
    const created = await createResp.json();

    // Change status to ON_LEAVE
    const patchResp = await request.patch(`${API_BASE}/resources/${created.id}/status`, {
      data: { status: 'ON_LEAVE', reason: 'E2E test status change' },
    });
    expect(patchResp.ok()).toBeTruthy();

    // Verify in UI
    await page.goto('/resources');
    await expect(page.getByText('Status Test Resource')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('On Leave')).toBeVisible();
  });

  test('soft delete resource via API and verify removal from list', async ({ page, request }) => {
    // Create a resource
    const createResp = await request.post(`${API_BASE}/resources`, {
      data: {
        externalId: 'E2E-DELETE',
        name: 'Delete Test Resource',
        costCenterId: 'ENG-CC1',
        billableTeamCode: 'BTC-API',
        category: 'CONTRACT',
        skill: 'QA',
        level: 1,
        status: 'ACTIVE',
        isBillable: true,
        isActive: true,
      },
    });
    const created = await createResp.json();

    // Soft delete via API
    const delResp = await request.delete(`${API_BASE}/resources/${created.id}`);
    expect(delResp.ok()).toBeTruthy();

    // Verify in UI — resource should no longer appear (isActive=false filtered out)
    await page.goto('/resources');
    await expect(page.getByText('Delete Test Resource')).not.toBeVisible({ timeout: 10000 });
  });
});
```

- [ ] **Step 2: Run E2E tests (requires Docker + backend + frontend running)**

Prerequisites: `cd infra && docker compose up postgres redis -d`

Run: `cd frontend/e2e && npx playwright test specs/resource-crud.spec.ts`
Expected: All 5 tests pass

- [ ] **Step 3: Commit**

```bash
git add frontend/e2e/specs/resource-crud.spec.ts
git commit -m "test(e2e): add Resource CRUD Playwright tests (5 scenarios)"
```

---

## Task 10: Playwright E2E — Rate CRUD Tests

**Files:**
- Create: `frontend/e2e/specs/rate-crud.spec.ts`

- [ ] **Step 1: Create Rate E2E test file**

Create `frontend/e2e/specs/rate-crud.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:8080/api/v1';

test.describe('Rate CRUD', () => {

  test('rate list loads via API', async ({ request }) => {
    const response = await request.get(`${API_BASE}/rates`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();
  });

  test('create rate with contiguity validation', async ({ request }) => {
    // Create the first rate for a new CC+BTC pair
    const first = await request.post(`${API_BASE}/rates`, {
      data: {
        costCenterId: 'E2E-CC',
        billableTeamCode: 'E2E-BTC',
        monthlyRateK: 5.00,
        effectiveFrom: '202601',
        billable: true,
      },
    });
    expect(first.ok()).toBeTruthy();
    const firstRate = await first.json();
    expect(firstRate.effectiveFrom).toBe('202601');
    expect(firstRate.effectiveTo).toBeNull();

    // Create the next contiguous rate
    const second = await request.post(`${API_BASE}/rates`, {
      data: {
        costCenterId: 'E2E-CC',
        billableTeamCode: 'E2E-BTC',
        monthlyRateK: 5.50,
        effectiveFrom: '202602',
        billable: true,
      },
    });
    expect(second.ok()).toBeTruthy();
    const secondRate = await second.json();
    expect(secondRate.effectiveFrom).toBe('202602');

    // Verify the first rate was auto-closed
    const firstRateCheck = await request.get(`${API_BASE}/rates/${firstRate.id}`);
    const firstRateUpdated = await firstRateCheck.json();
    expect(firstRateUpdated.effectiveTo).toBe('202601');
  });

  test('rate gap detection returns error', async ({ request }) => {
    // Create the first rate
    await request.post(`${API_BASE}/rates`, {
      data: {
        costCenterId: 'E2E-GAP-CC',
        billableTeamCode: 'E2E-GAP-BTC',
        monthlyRateK: 4.00,
        effectiveFrom: '202601',
        billable: true,
      },
    });

    // Try to create a rate with a gap (skip 202602)
    const gapResp = await request.post(`${API_BASE}/rates`, {
      data: {
        costCenterId: 'E2E-GAP-CC',
        billableTeamCode: 'E2E-GAP-BTC',
        monthlyRateK: 4.50,
        effectiveFrom: '202603',
        billable: true,
      },
    });
    expect(gapResp.ok()).toBeFalsy();
    expect(gapResp.status()).toBe(400);
    const body = await gapResp.json();
    expect(body.error).toBe('RATE_VALIDATION_ERROR');
  });
});
```

- [ ] **Step 2: Run E2E tests**

Run: `cd frontend/e2e && npx playwright test specs/rate-crud.spec.ts`
Expected: All 3 tests pass

- [ ] **Step 3: Commit**

```bash
git add frontend/e2e/specs/rate-crud.spec.ts
git commit -m "test(e2e): add Rate CRUD Playwright tests (3 scenarios — contiguity + gap detection)"
```

---

## Task 11: Update PROGRESS.md

**Files:**
- Modify: `PROGRESS.md`

- [ ] **Step 1: Add integration test infrastructure section to PROGRESS.md**

Add after the T1.6 entry in "In-Progress Tasks":

```markdown
- [x] **Integration Test Infrastructure** — Docker Compose + Spring config + SecurityConfig + E2E
  - Status: ✅ COMPLETE
  - Docker Compose: PostgreSQL 15 + Redis 7 (`infra/docker-compose.yml`)
  - Spring Boot: `application.yml` + `application-dev.yml` + `application-test.yml`
  - SecurityConfig: permissive (permit all) — real JWT auth in Sprint 5
  - ResourceController: filter params + pagination (matches frontend expectations)
  - E2E: 8 Playwright scenarios (Resource CRUD x5, Rate CRUD x3)
```

- [ ] **Step 2: Commit**

```bash
git add PROGRESS.md
git commit -m "docs: update PROGRESS.md with integration test infrastructure completion"
```

---

## Task 12: Full Verification Run

**Files:** None (verification only)

- [ ] **Step 1: Run all backend unit tests**

Run: `cd backend && mvn test`
Expected: All tests pass

- [ ] **Step 2: Run all frontend unit tests**

Run: `cd frontend && npm test -- --run`
Expected: All 18 tests pass

- [ ] **Step 3: Run E2E tests**

Prerequisites: Docker postgres + redis running, backend + frontend available

Run: `cd frontend/e2e && npx playwright test`
Expected: All 8 E2E scenarios pass

- [ ] **Step 4: Manual smoke test — Resource List page in browser**

Open: `http://localhost:5173/resources`
Verify:
- Page loads with "Resources" header
- Filter controls visible (search, skill, cost center, status dropdowns)
- Data table renders
- Selecting "ACTIVE" in status filter narrows results
- Creating a resource via API appears after page refresh

---

## Cross-Task Dependencies

```
Task 1 (Docker Compose)
  ↓
Task 2 (Spring Config) ← needs postgres/redis URLs
  ↓
Task 3 (SecurityConfig) ← needs app config to start
  ↓
Task 4 (JacksonConfig) ← independent, but should be after Task 3
  ↓
Task 5 (ResourceController filters) ← needs running app
  ↓
Task 6 (Frontend API alignment) ← needs Task 5's response shape
  ↓
Task 7 (Smoke test) ← needs Tasks 1-6 complete
  ↓
Task 8 (Playwright config) ← independent of Tasks 1-7
  ↓
Task 9 (Resource E2E) ← needs Task 8 + running stack
  ↓
Task 10 (Rate E2E) ← needs Task 8 + running stack
  ↓
Task 11 (PROGRESS.md) ← after all tasks done
  ↓
Task 12 (Full verification) ← final gate
```

Tasks 3 and 4 can run in parallel. Tasks 8-10 can be done in parallel with Tasks 5-6 if the running stack is already available.
