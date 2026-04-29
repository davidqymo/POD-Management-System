import client from './client'
import type { DashboardSummary, MonthlyData, VarianceData, SkillSupply, StatusCount, Utilization } from '../types'

export function getDashboardSummary() {
  return client.get<DashboardSummary>('/dashboard/summary').then((r) => r.data)
}

export function getSupplyDemandTrend(months: number = 6) {
  return client.get<MonthlyData[]>(`/dashboard/supply-demand?months=${months}`).then((r) => r.data)
}

export function getVariance() {
  return client.get<VarianceData[]>('/dashboard/variance').then((r) => r.data)
}

export function getBurnRateTrend(months: number = 6) {
  return client.get<MonthlyData[]>(`/dashboard/burn-rate?months=${months}`).then((r) => r.data)
}

export function getSupplyBySkill() {
  return client.get<SkillSupply[]>('/dashboard/supply-by-skill').then((r) => r.data)
}

export function getAllocationStatus() {
  return client.get<StatusCount[]>('/dashboard/allocation-status').then((r) => r.data)
}

export function getOverplanProjects() {
  return client.get<any[]>('/dashboard/overplan').then((r) => r.data)
}

export function getUtilization() {
  return client.get<Utilization>('/dashboard/utilization').then((r) => r.data)
}