export interface Resource {
  id: number
  externalId: string
  name: string
  costCenterId: string
  billableTeamCode: string
  category: ResourceCategory
  skill: string
  level: number
  status: ResourceStatus
  isBillable: boolean
  isActive: boolean
  version: number
  createdAt: string
  updatedAt: string
}

export enum ResourceCategory {
  PERMANENT = 'PERMANENT',
  CONTRACT = 'CONTRACT',
  TEMPORARY = 'TEMPORARY',
}

export enum ResourceStatus {
  ACTIVE = 'ACTIVE',
  ON_LEAVE = 'ON_LEAVE',
  TERMINATED = 'TERMINATED',
}

export interface ResourceFilters {
  search?: string
  skill?: string
  costCenter?: string
  status?: string
  page?: number
  size?: number
}

export interface PaginatedResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

export interface ApiError {
  error: string
  message: string
}
