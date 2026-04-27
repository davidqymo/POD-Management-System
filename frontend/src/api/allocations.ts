import client from './client';

export interface Allocation {
  id: number;
  resourceId: number;
  projectName: string;
  resourceName: string;
  projectId: number;
  activityId?: number;
  activityName?: string;
  weekStartDate: string;
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
  weekStartDate: string;
  hours: number;
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
}): Promise<Allocation[]> {
  const response = await client.get<Allocation[]>('/allocations', { params });
  return response.data;
}

export async function createAllocation(request: CreateAllocationRequest): Promise<Allocation> {
  const response = await client.post<Allocation>('/allocations', request);
  return response.data;
}

export async function approveAllocation(request: ApproveAllocationRequest): Promise<Allocation> {
  const response = await client.post<Allocation>('/allocations/approve', request);
  return response.data;
}

export async function rejectAllocation(request: ApproveAllocationRequest): Promise<Allocation> {
  const response = await client.post<Allocation>('/allocations/reject', request);
  return response.data;
}

export async function getAllocation(id: number): Promise<Allocation> {
  const response = await client.get<Allocation>(`/allocations/${id}`);
  return response.data;
}