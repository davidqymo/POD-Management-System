import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:8080/api/v1';

test.describe('Project Update', () => {
  // Use an existing project ID (1 exists from seed data)
  const testProjectId = 1;

  test('update project via PATCH API', async ({ request }) => {
    // Update the project
    const updateResponse = await request.patch(`${API_BASE}/projects/${testProjectId}`, {
      data: {
        name: 'Updated Project Name',
        description: 'Updated description'
      }
    });

    console.log('Update response status:', updateResponse.status());
    expect(updateResponse.ok()).toBeTruthy();

    const updated = await updateResponse.json();
    console.log('Updated project:', JSON.stringify(updated, null, 2));

    expect(updated.name).toBe('Updated Project Name');
    expect(updated.description).toBe('Updated description');
  });

  test('verify updated data persists in DB', async ({ request }) => {
    // First update
    await request.patch(`${API_BASE}/projects/${testProjectId}`, {
      data: {
        name: 'Persisted Name',
        budgetTotalK: 200.00
      }
    });

    // Fetch again to verify persistence
    const getResponse = await request.get(`${API_BASE}/projects/${testProjectId}`);
    expect(getResponse.ok()).toBeTruthy();

    const project = await getResponse.json();
    console.log('Fetched project after update:', JSON.stringify(project, null, 2));

    expect(project.name).toBe('Persisted Name');
    expect(project.budgetTotalK).toBe(200.00);
  });
});