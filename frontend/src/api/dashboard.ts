import client from './client'
import type { DashboardSummary, MonthlyData, VarianceData, SkillSupply, StatusCount, Utilization, BudgetTrend } from '../types'

export function getDashboardSummary() {
  return client.get<DashboardSummary>('/api/v1/dashboard/summary').then((r) => r.data)
}

export function getSupplyDemandTrend(months: number = 6) {
  return client.get<MonthlyData[]>(`/api/v1/dashboard/supply-demand?months=${months}`).then((r) => r.data)
}

export function getVariance() {
  return client.get<VarianceData[]>('/api/v1/dashboard/variance').then((r) => r.data)
}

export function getBurnRateTrend(months: number = 6) {
  return client.get<MonthlyData[]>(`/api/v1/dashboard/burn-rate?months=${months}`).then((r) => r.data)
}

export function getSupplyBySkill() {
  return client.get<SkillSupply[]>('/api/v1/dashboard/supply-by-skill').then((r) => r.data)
}

export function getAllocationStatus() {
  return client.get<StatusCount[]>('/api/v1/dashboard/allocation-status').then((r) => r.data)
}

export function getOverplanProjects() {
  return client.get<any[]>('/api/v1/dashboard/overplan').then((r) => r.data)
}

export function getUtilization() {
  return client.get<Utilization>('/api/v1/dashboard/utilization').then((r) => r.data)
}

export function getBudgetTrend(fiscalYear: number = 2026) {
  return client.get<BudgetTrend[]>(`/api/v1/dashboard/budget-trend?fiscalYear=${fiscalYear}`).then((r) => r.data)
}