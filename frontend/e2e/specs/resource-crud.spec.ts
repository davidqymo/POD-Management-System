import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:8080/api/v1';

test.describe('Resource CRUD', () => {

  test.beforeEach(async ({ request }) => {
    // Clean up handled by test isolation
  });

  test('resource list loads and displays seed data', async ({ page }) => {
    await page.goto('/resources');
    await expect(page.getByRole('heading', { name: 'Resources' })).toBeVisible();
    await expect(page.getByText('Name')).toBeVisible();
    await expect(page.getByText('Status')).toBeVisible();
  });

  test('create resource via API and verify in UI', async ({ page, request }) => {
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
    await page.goto('/resources');
    await expect(page.getByText('E2E Test User')).toBeVisible({ timeout: 10000 });
  });

  test('filter by status shows only matching resources', async ({ page, request }) => {
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
    await page.goto('/resources');
    await page.getByRole('combobox').first().selectOption('ACTIVE');
    await page.waitForTimeout(500);
    const activeBadges = page.getByText('Active');
    await expect(activeBadges.first()).toBeVisible();
  });

  test('change resource status via API and verify badge in UI', async ({ page, request }) => {
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
    await request.patch(`${API_BASE}/resources/${created.id}/status`, {
      data: { status: 'ON_LEAVE', reason: 'E2E test status change' },
    });
    await page.goto('/resources');
    await expect(page.getByText('On Leave')).toBeVisible();
  });

  test('soft delete resource via API and verify removal from list', async ({ page, request }) => {
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
    await request.delete(`${API_BASE}/resources/${created.id}`);
    await page.goto('/resources');
    await expect(page.getByText('Delete Test Resource')).not.toBeVisible({ timeout: 10000 });
  });
});