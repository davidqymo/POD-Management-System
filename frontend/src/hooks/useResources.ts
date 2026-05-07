import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getResources, getResourceById, createResource, changeStatus, deleteResource } from '../api/resources'
import type { ResourceFilters } from '../types'

export function useResources(filters: ResourceFilters = {}) {
  return useQuery({
    queryKey: ['resources', filters],
    queryFn: () => getResources(filters),
  })
}

export function useResource(id: number) {
  return useQuery({
    queryKey: ['resource', id],
    queryFn: () => getResourceById(id),
    enabled: id > 0,
  })
}

export function useCreateResource() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createResource,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['resources'] }),
  })
}

export function useChangeStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, reason }: { id: number; status: string; reason?: string }) =>
      changeStatus(id, status, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['resources'] }),
  })
}

export function useDeleteResource() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteResource,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['resources'] }),
  })
}