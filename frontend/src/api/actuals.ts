import client from './client'
import type { ProjectActual, ImportActualsResult } from '../types'

// Note: clarityId can contain special characters like "/" so we use query param instead of path
export async function getActualsByClarityId(clarityId: string): Promise<ProjectActual[]> {
  const response = await client.get<ProjectActual[]>(`/api/v1/projects/actuals`, { params: { clarityId } })
  return response.data
}

export async function createOrUpdateActual(
  clarityId: string,
  data: {
    resourceId: number
    projectName: string
    monthlyData: Record<string, number>
  }
): Promise<ProjectActual> {
  const response = await client.post<ProjectActual>(`/api/v1/projects/actuals`, { ...data, clarityId })
  return response.data
}

export async function deleteActual(clarityId: string, id: number): Promise<void> {
  await client.delete(`/api/v1/projects/actuals/${id}`, { params: { clarityId } })
}

export async function importActuals(csvContent: string): Promise<ImportActualsResult> {
  const response = await client.post<ImportActualsResult>('/api/v1/projects/actuals/import', {
    csvContent,
  })
  return response.data
}