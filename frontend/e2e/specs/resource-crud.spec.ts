import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:8080/api/v1';

test.describe('Resource CRUD', () => {

  test('resource list loads via API', async ({ request }) => {
    const response = await request.get(`${API_BASE}/resources`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(Array.isArray(body.content)).toBeTruthy();
  });

  test('create resource via API', async ({ request }) => {
    const uniqueId = `E2E${Date.now() % 100000}`;
    const response = await request.post(`${API_BASE}/resources`, {
      data: {
        externalId: uniqueId,
        name: 'Test User',
        costCenterId: 'ENG',
        billableTeamCode: 'API',
      },
    });
    expect(response.ok()).toBeTruthy();
    const created = await response.json();
    expect(created.name).toBe('Test User');
  });
});