import client from './client';

export interface Allocation {
  id: number;
  resourceId: number;
  projectName: string;
  resourceName: string;
  projectId: number;
  activityId?: number;
  activityName?: string;
  hcm: number;  // YYYYMM format (e.g., 202512 = Dec 2025)
  hours: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'LOCKED';
  version: number;
  approvedBy?: number;
  approvedAt?: string;
  rejectionReason?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAllocationRequest {
  resourceId: number;
  projectId: number;
  activityId?: number | null;
  hcm: number;  // YYYYMM format
  weekStartDate?: string;  // ISO date for weekly allocations
  hours: number;
  notes?: string;
}

export interface CreateBulkAllocationRequest {
  resourceId: number;
  projectId: number;
  allocations: Array<{hcm: number; hours: number}>;
  notes?: string;
}

export interface ApproveAllocationRequest {
  allocationId: number;
  approverId: number;
  reason?: string;
}

export interface ConstraintViolation {
  code: string;
  message: string;
  details?: string;
}

export async function listAllocations(params?: {
  resourceId?: number;
  projectId?: number;
  status?: string;
  hcm?: number;
}): Promise<Allocation[]> {
  const response = await client.get<Allocation[]>('/api/v1/allocations', { params });
  return response.data;
}

export async function createAllocation(request: CreateAllocationRequest): Promise<Allocation> {
  const response = await client.post<Allocation>('/api/v1/allocations', request);
  return response.data;
}

export async function createBulkAllocations(request: CreateBulkAllocationRequest): Promise<Allocation[]> {
  const response = await client.post<Allocation[]>('/api/v1/allocations/bulk', request);
  return response.data;
}

export async function approveAllocation(request: ApproveAllocationRequest): Promise<Allocation> {
  const response = await client.post<Allocation>('/api/v1/allocations/approve', request);
  return response.data;
}

export async function rejectAllocation(request: ApproveAllocationRequest): Promise<Allocation> {
  const response = await client.post<Allocation>('/api/v1/allocations/reject', request);
  return response.data;
}

export async function getAllocation(id: number): Promise<Allocation> {
  const response = await client.get<Allocation>(`/api/v1/allocations/${id}`);
  return response.data;
}

export async function updateAllocation(id: number, activityId: number | null): Promise<Allocation> {
  const response = await client.post<Allocation>(`/api/v1/allocations/update-activity?allocationId=${id}&activityId=${activityId}`);
  return response.data;
}

export async function updateAllocationHours(id: number, hours: number): Promise<Allocation> {
  const response = await client.patch<Allocation>(`/api/v1/allocations/${id}/hours`, { hours });
  return response.data;
}

export async function deleteAllocation(id: number): Promise<void> {
  await client.delete(`/api/v1/allocations/${id}`);
}