import client from './client';

export interface FilterConfig {
  id: number;
  category: string;
  value: string;
  displayOrder: number;
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface StandardDataCategory {
  key: string;
  label: string;
  description: string;
}

export async function listFilters(): Promise<FilterConfig[]> {
  const response = await client.get<FilterConfig[]>('/api/v1/admin/filters');
  return response.data;
}

export async function listFiltersByCategory(category: string): Promise<FilterConfig[]> {
  const response = await client.get<FilterConfig[]>(`/api/v1/admin/filters/${category}`);
  return response.data;
}

export async function createFilter(data: {
  category: string;
  value: string;
  displayOrder?: number;
  description?: string;
}): Promise<FilterConfig> {
  const response = await client.post<FilterConfig>('/api/v1/admin/filters', data);
  return response.data;
}

export async function updateFilter(
  id: number,
  data: { value?: string; displayOrder?: number; description?: string }
): Promise<FilterConfig> {
  const response = await client.put<FilterConfig>(`/api/v1/admin/filters/${id}`, data);
  return response.data;
}

export async function deleteFilter(id: number): Promise<void> {
  await client.delete(`/api/v1/admin/filters/${id}`);
}