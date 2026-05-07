import client from './client'
import type { Resource, ResourceFilters, PaginatedResponse } from '../types'

export const resourceCategories: string[] = ['PERMANENT', 'CONTRACT', 'TEMPORARY']
export const resourceStatuses: string[] = ['ACTIVE', 'ON_LEAVE', 'TERMINATED']

export function getResources(filters: ResourceFilters = {}) {
  const params = new URLSearchParams()
  if (filters.search) params.set('search', filters.search)
  if (filters.skill) params.set('skill', filters.skill)
  if (filters.costCenter) params.set('costCenter', filters.costCenter)
  if (filters.status) params.set('status', filters.status)
  if (filters.functionalManager) params.set('functionalManager', filters.functionalManager)
  if (filters.l5TeamCode) params.set('l5TeamCode', filters.l5TeamCode)
  if (filters.page !== undefined) params.set('page', String(filters.page))
  if (filters.size !== undefined) params.set('size', String(filters.size))

  return client.get<PaginatedResponse<Resource>>(`/api/v1/resources?${params.toString()}`).then((r) => r.data)
}

export function getResourceById(id: number) {
  return client.get<Resource>(`/api/v1/resources/${id}`).then((r) => r.data)
}

export function createResource(resource: Omit<Resource, 'id' | 'version' | 'createdAt' | 'updatedAt'>) {
  return client.post<Resource>('/api/v1/resources', resource).then((r) => r.data)
}

export function changeStatus(id: number, status: string, reason?: string) {
  return client
    .patch<void>(`/api/v1/resources/${id}/status`, { status, reason: reason ?? 'Status update' })
    .then(() => undefined)
}

export function deleteResource(id: number) {
  return client.delete<void>(`/api/v1/resources/${id}`).then(() => undefined)
}

export function updateResource(id: number, resource: Partial<Resource>) {
  return client.post<Resource>(`/api/v1/resources/${id}/update`, resource).then((r) => r.data)
}
