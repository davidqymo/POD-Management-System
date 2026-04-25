import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:8080/api/v1';

test.describe('Resource CRUD', () => {

  test.beforeEach(async ({ request }) => {
    // Clean up handled by test isolation
  });

  test('resource list loads and displays seed data', async ({ page }) => {
    await page.goto('/resources');
    // Use .first() to handle duplicate header/main heading
    await expect(page.getByRole('heading', { name: 'Resources' }).first()).toBeVisible();
    // Use columnheader role to find table headers specifically
    await expect(page.getByRole('columnheader', { name: 'Name' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
  });

  test('create resource via API and verify in UI', async ({ page, request }) => {
    const uniqueId = `E2E-${Date.now()}`;
    const response = await request.post(`${API_BASE}/resources`, {
      data: {
        externalId: uniqueId,
        name: 'E2E Test User',
        costCenterId: 'ENG-CC1',
        billableTeamCode: 'BTC-API',
        category: 'PERMANENT',
        skill: 'backend',
        level: 3,
        status: 'ACTIVE',
        isBillable: true,
      },
    });
    expect(response.ok()).toBeTruthy();
    await page.goto('/resources');
    await expect(page.getByText('E2E Test User').first()).toBeVisible({ timeout: 10000 });
  });

  test('filter by status shows only matching resources', async ({ page, request }) => {
    const uniqueId = `E2E-ACTIVE-${Date.now()}`;
    await request.post(`${API_BASE}/resources`, {
      data: {
        externalId: uniqueId,
        name: 'Active Resource',
        costCenterId: 'ENG-CC1',
        billableTeamCode: 'BTC-API',
        category: 'PERMANENT',
        skill: 'backend',
        level: 2,
        status: 'ACTIVE',
        isBillable: true,
      },
    });
    await page.goto('/resources');
    // Find the status filter dropdown (3rd select on the page)
    const statusDropdown = page.locator('select').nth(2);
    await expect(statusDropdown).toBeVisible({ timeout: 10000 });
    await statusDropdown.selectOption('ACTIVE');
    await page.waitForTimeout(1000);
    // Active status uses emerald-50 background
    const activeBadges = page.locator('.bg-emerald-50').first();
    await expect(activeBadges).toBeVisible();
  });

  test('change resource status via API and verify badge in UI', async ({ page, request }) => {
    const uniqueId = `E2E-STATUS-${Date.now()}`;
    const createResp = await request.post(`${API_BASE}/resources`, {
      data: {
        externalId: uniqueId,
        name: 'Status Test Resource',
        costCenterId: 'ENG-CC1',
        billableTeamCode: 'BTC-API',
        category: 'PERMANENT',
        skill: 'backend',
        level: 4,
        status: 'ACTIVE',
        isBillable: true,
      },
    });
    const created = await createResp.json();
    await request.patch(`${API_BASE}/resources/${created.id}/status`, {
      data: { status: 'ON_LEAVE', reason: 'E2E test status change' },
    });
    await page.goto('/resources');
    // On Leave status uses amber-50 background
    const onLeaveBadge = page.locator('.bg-amber-50').first();
    await expect(onLeaveBadge).toBeVisible();
    await expect(onLeaveBadge).toContainText('On Leave');
  });

  test('soft delete resource via API and verify removal from list', async ({ page, request }) => {
    const uniqueId = `E2E-DELETE-${Date.now()}`;
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