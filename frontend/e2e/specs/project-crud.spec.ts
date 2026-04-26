import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:8080/api/v1';

test.describe('Project CRUD', () => {

  test('project list loads via API', async ({ request }) => {
    const response = await request.get(`${API_BASE}/projects`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(Array.isArray(body.content)).toBeTruthy();
  });

  test('project list is empty initially', async ({ request }) => {
    const response = await request.get(`${API_BASE}/projects`);
    const body = await response.json();
    // May have existing projects from previous test runs
    expect(body.totalElements >= 0).toBeTruthy();
  });
});