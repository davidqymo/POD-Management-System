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
  functionalManager?: string
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

export interface DashboardSummary {
  totalSupply: number
  totalSupplyK: number
  totalDemand: number
  availableSupplyK: number
  totalBudgetK: number
  totalSpentK: number
  overplanCount: number
  utilizationRate: number
  pendingAllocationCount: number
  approvedAllocationCount: number
}

export interface MonthlyData {
  month: string
  supply: number
  demand: number
}

export interface VarianceData {
  projectId: number
  projectName: string
  budgetK: number
  allocatedK: number
  spentK: number
  varianceK: number
  variancePercent: number
}

export interface SkillSupply {
  skill: string
  count: number
}

export interface StatusCount {
  status: string
  count: number
}

export interface Utilization {
  totalSupply: number
  totalDemand: number
  maxCapacity: number
  utilizationPercent: number
  availableCapacity: number
}

export interface Rate {
  id: number
  costCenterId: string
  billableTeamCode: string
  monthlyRateK: number
  effectiveFrom: string
  effectiveTo: string | null
  createdAt: string
  updatedAt: string
}
