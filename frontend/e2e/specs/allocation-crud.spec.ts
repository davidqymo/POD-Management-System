import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:8080/api/v1';

test.describe('Allocation CRUD', () => {

  test('create allocation via API', async ({ request }) => {
    // First create a resource and project to allocate to
    const resourceResponse = await request.post(`${API_BASE}/resources`, {
      data: {
        externalId: `RES-E2E-${Date.now() % 100000}`,
        name: 'Allocation Test Resource',
        costCenterId: 'ENG-CC1',
        billableTeamCode: 'BTC-API',
        category: 'PERMANENT',
        skill: 'backend',
        level: 3,
        status: 'ACTIVE',
        isBillable: true
      }
    });
    expect(resourceResponse.ok()).toBeTruthy();
    const resource = await resourceResponse.json();

    const projectResponse = await request.post(`${API_BASE}/projects`, {
      data: {
        name: `Allocation Test Project ${Date.now() % 100000}`,
        budgetTotalK: 100.00,
        ownerUserId: 1,
        status: 'REQUESTED'
      }
    });
    expect(projectResponse.ok()).toBeTruthy();
    const project = await projectResponse.json();

    // Now create an allocation
    const allocationResponse = await request.post(`${API_BASE}/allocations`, {
      data: {
        resourceId: resource.id,
        projectId: project.id,
        weekStart: '2026-04-28',
        hours: 40,
        notes: 'E2E test allocation'
      }
    });
    expect(allocationResponse.ok()).toBeTruthy();
    const allocation = await allocationResponse.json();
    expect(allocation.status).toBe('PENDING');
    expect(allocation.hours).toBe(40);
  });

  test('list allocations via API', async ({ request }) => {
    const response = await request.get(`${API_BASE}/allocations`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();
  });

  test('filter allocations by status', async ({ request }) => {
    const response = await request.get(`${API_BASE}/allocations?status=PENDING`);
    expect(response.ok()).toBeTruthy();
    const allocations = await response.json();
    expect(Array.isArray(allocations)).toBeTruthy();
  });

  test('approve allocation via API', async ({ request }) => {
    // Create resource, project, and allocation
    const resourceResponse = await request.post(`${API_BASE}/resources`, {
      data: {
        externalId: `RES-APPR-${Date.now() % 100000}`,
        name: 'Approve Test Resource',
        costCenterId: 'ENG-CC1',
        billableTeamCode: 'BTC-API',
        category: 'PERMANENT',
        skill: 'frontend',
        level: 4,
        status: 'ACTIVE',
        isBillable: true
      }
    });
    const resource = await resourceResponse.json();

    const projectResponse = await request.post(`${API_BASE}/projects`, {
      data: {
        name: `Approve Test Project ${Date.now() % 100000}`,
        budgetTotalK: 50.00,
        ownerUserId: 1,
        status: 'REQUESTED'
      }
    });
    const project = await projectResponse.json();

    const allocationResponse = await request.post(`${API_BASE}/allocations`, {
      data: {
        resourceId: resource.id,
        projectId: project.id,
        weekStart: '2026-05-05',
        hours: 20
      }
    });
    const allocation = await allocationResponse.json();

    // Approve the allocation (using a different user ID)
    const approveResponse = await request.post(`${API_BASE}/allocations/approve`, {
      data: {
        allocationId: allocation.id,
        approverId: 1, // Use valid user ID from seed data (admin)
        reason: 'Approved via E2E test'
      }
    });
    expect(approveResponse.ok()).toBeTruthy();
    const approved = await approveResponse.json();
    expect(approved.status).toBe('APPROVED');
  });

  test('reject allocation via API', async ({ request }) => {
    // Create resource, project, and allocation
    const resourceResponse = await request.post(`${API_BASE}/resources`, {
      data: {
        externalId: `RES-REJ-${Date.now() % 100000}`,
        name: 'Reject Test Resource',
        costCenterId: 'ENG-CC1',
        billableTeamCode: 'BTC-API',
        category: 'PERMANENT',
        skill: 'qa',
        level: 3,
        status: 'ACTIVE',
        isBillable: true
      }
    });
    const resource = await resourceResponse.json();

    const projectResponse = await request.post(`${API_BASE}/projects`, {
      data: {
        name: `Reject Test Project ${Date.now() % 100000}`,
        budgetTotalK: 30.00,
        ownerUserId: 1,
        status: 'REQUESTED'
      }
    });
    const project = await projectResponse.json();

    const allocationResponse = await request.post(`${API_BASE}/allocations`, {
      data: {
        resourceId: resource.id,
        projectId: project.id,
        weekStart: '2026-05-12',
        hours: 16
      }
    });
    const allocation = await allocationResponse.json();

    // Reject the allocation
    const rejectResponse = await request.post(`${API_BASE}/allocations/reject`, {
      data: {
        allocationId: allocation.id,
        approverId: 1, // Use valid user ID from seed data (admin)
        reason: 'Resource already at capacity for this week'
      }
    });
    expect(rejectResponse.ok()).toBeTruthy();
    const rejected = await rejectResponse.json();
    expect(rejected.status).toBe('REJECTED');
    expect(rejected.rejectionReason).toBe('Resource already at capacity for this week');
  });

  test('four-eyes violation - self approval', async ({ request }) => {
    // Create resource, project, and allocation
    const resourceResponse = await request.post(`${API_BASE}/resources`, {
      data: {
        externalId: `RES-SELF-${Date.now() % 100000}`,
        name: 'Self Approval Test Resource',
        costCenterId: 'ENG-CC1',
        billableTeamCode: 'BTC-API',
        category: 'PERMANENT',
        skill: 'devops',
        level: 5,
        status: 'ACTIVE',
        isBillable: true
      }
    });
    const resource = await resourceResponse.json();

    const projectResponse = await request.post(`${API_BASE}/projects`, {
      data: {
        name: `Self Approval Project ${Date.now() % 100000}`,
        budgetTotalK: 75.00,
        ownerUserId: 1,
        status: 'REQUESTED'
      }
    });
    const project = await projectResponse.json();

    const allocationResponse = await request.post(`${API_BASE}/allocations`, {
      data: {
        resourceId: resource.id,
        projectId: project.id,
        weekStart: '2026-05-19',
        hours: 32
      }
    });
    const allocation = await allocationResponse.json();

    // Try to self-approve (should fail)
    const approveResponse = await request.post(`${API_BASE}/allocations/approve`, {
      data: {
        allocationId: allocation.id,
        approverId: resource.id, // Same as resource - self approval!
        reason: 'Self approval attempt'
      }
    });
    expect(approveResponse.status()).toBe(400);
  });

  test('overlapping allocation detection', async ({ request }) => {
    // Create resource and project
    const resourceResponse = await request.post(`${API_BASE}/resources`, {
      data: {
        externalId: `RES-OVERLAP-${Date.now() % 100000}`,
        name: 'Overlap Test Resource',
        costCenterId: 'ENG-CC1',
        billableTeamCode: 'BTC-API',
        category: 'PERMANENT',
        skill: 'backend',
        level: 3,
        status: 'ACTIVE',
        isBillable: true
      }
    });
    const resource = await resourceResponse.json();

    const projectResponse = await request.post(`${API_BASE}/projects`, {
      data: {
        name: `Overlap Test Project ${Date.now() % 100000}`,
        budgetTotalK: 60.00,
        ownerUserId: 1,
        status: 'REQUESTED'
      }
    });
    const project = await projectResponse.json();

    // Create first allocation
    await request.post(`${API_BASE}/allocations`, {
      data: {
        resourceId: resource.id,
        projectId: project.id,
        weekStart: '2026-05-26',
        hours: 40
      }
    });

    // Try to create overlapping allocation (same week)
    const overlapResponse = await request.post(`${API_BASE}/allocations`, {
      data: {
        resourceId: resource.id,
        projectId: project.id,
        weekStart: '2026-05-26', // Same week
        hours: 20
      }
    });
    expect(overlapResponse.status()).toBe(409); // Should fail with CONFLICT
  });
});