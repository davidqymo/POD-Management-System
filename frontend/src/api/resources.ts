import client from './client'
import type { Resource, ResourceFilters, PaginatedResponse } from '../types'

export function getResources(filters: ResourceFilters = {}) {
  const params = new URLSearchParams()
  if (filters.search) params.set('search', filters.search)
  if (filters.skill) params.set('skill', filters.skill)
  if (filters.costCenter) params.set('costCenter', filters.costCenter)
  if (filters.status) params.set('status', filters.status)
  if (filters.page !== undefined) params.set('page', String(filters.page))
  if (filters.size !== undefined) params.set('size', String(filters.size))

  return client.get<PaginatedResponse<Resource>>(`/resources?${params.toString()}`).then((r) => r.data)
}

export function getResourceById(id: number) {
  return client.get<Resource>(`/resources/${id}`).then((r) => r.data)
}

export function createResource(resource: Omit<Resource, 'id' | 'version' | 'createdAt' | 'updatedAt'>) {
  return client.post<Resource>('/resources', resource).then((r) => r.data)
}

export function changeStatus(id: number, status: string, reason?: string) {
  return client
    .patch<void>(`/resources/${id}/status`, { status, reason: reason ?? 'Status update' })
    .then(() => undefined)
}

export function deleteResource(id: number) {
  return client.delete<void>(`/resources/${id}`).then(() => undefined)
}
