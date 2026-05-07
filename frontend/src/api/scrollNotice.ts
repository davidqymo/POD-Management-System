import client from './client'

export interface ScrollNotice {
  id: number
  content: string
  speed: number // 1=Slow, 2=Medium, 3=Fast
  direction: number // 1=right-to-left, 2=left-to-right
  status: number // 0=Disabled, 1=Enabled
  link?: string
  remark?: string
  createdAt: string
  updatedAt: string
}

interface PaginatedResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

export async function listScrollNotices(params?: {
  page?: number
  size?: number
  keyword?: string
}): Promise<PaginatedResponse<ScrollNotice>> {
  const response = await client.get<PaginatedResponse<ScrollNotice>>('/api/v1/scroll-notices', { params })
  return response.data
}

export async function getEnabledScrollNotices(): Promise<ScrollNotice[]> {
  const response = await client.get<ScrollNotice[]>('/api/v1/scroll-notices/enabled')
  return response.data
}

export async function getScrollNotice(id: number): Promise<ScrollNotice> {
  const response = await client.get<ScrollNotice>(`/api/v1/scroll-notices/${id}`)
  return response.data
}

export async function createScrollNotice(data: {
  content: string
  speed: number
  direction?: number
  status?: number
  link?: string
  remark?: string
}): Promise<ScrollNotice> {
  const response = await client.post<ScrollNotice>('/api/v1/scroll-notices', data)
  return response.data
}

export async function updateScrollNotice(id: number, data: {
  content: string
  speed: number
  direction?: number
  status?: number
  link?: string
  remark?: string
}): Promise<ScrollNotice> {
  const response = await client.put<ScrollNotice>(`/api/v1/scroll-notices/${id}`, data)
  return response.data
}

export async function deleteScrollNotice(id: number): Promise<void> {
  await client.delete(`/api/v1/scroll-notices/${id}`)
}

export async function batchDeleteScrollNotices(ids: number[]): Promise<void> {
  await client.delete('/api/v1/scroll-notices/batch', { data: { ids } })
}

export async function updateScrollNoticeStatus(id: number, status: number): Promise<ScrollNotice> {
  const response = await client.put<ScrollNotice>(`/api/v1/scroll-notices/${id}/status`, { status })
  return response.data
}

// Helper functions for display
export const SPEED_LABELS = { 1: 'Slow', 2: 'Medium', 3: 'Fast' }
export const DIRECTION_LABELS = { 1: 'Right to Left', 2: 'Left to Right' }
export const STATUS_LABELS = { 0: 'Disabled', 1: 'Enabled' }