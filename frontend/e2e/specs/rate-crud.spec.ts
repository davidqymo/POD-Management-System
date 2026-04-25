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
    // Use short unique IDs to avoid exceeding column limits (varchar 20)
    const uniqueId = `E2E-${Date.now() % 100000}`;
    const first = await request.post(`${API_BASE}/rates`, {
      data: {
        costCenterId: uniqueId,
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

    const second = await request.post(`${API_BASE}/rates`, {
      data: {
        costCenterId: uniqueId,
        billableTeamCode: 'E2E-BTC',
        monthlyRateK: 5.50,
        effectiveFrom: '202602',
        billable: true,
      },
    });
    expect(second.ok()).toBeTruthy();

    // Verify via list endpoint - find the first rate and check effectiveTo
    const listResp = await request.get(`${API_BASE}/rates`);
    const rates = await listResp.json();
    const firstRateCheck = rates.find((r: any) => r.id === firstRate.id);
    expect(firstRateCheck.effectiveTo).toBe('202601');
  });

  test('rate gap detection returns error', async ({ request }) => {
    // Use short unique IDs + unique billableTeamCode to avoid exceeding column limits (varchar 20)
    const uniqueId = `EG${Date.now() % 100000}`;
    const btc = `EGAP${Date.now() % 10000}`;
    await request.post(`${API_BASE}/rates`, {
      data: {
        costCenterId: uniqueId,
        billableTeamCode: btc,
        monthlyRateK: 4.00,
        effectiveFrom: '202601',
        billable: true,
      },
    });

    const gapResp = await request.post(`${API_BASE}/rates`, {
      data: {
        costCenterId: uniqueId,
        billableTeamCode: btc,
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