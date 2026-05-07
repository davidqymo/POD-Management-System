import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, Legend, PieChart, Pie, Cell } from 'recharts'
import { getDashboardSummary, getSupplyDemandTrend, getVariance, getSupplyBySkill, getBudgetTrend } from '@/api/dashboard'
import { getResources } from '@/api/resources'

const COLORS = ['#209d9d', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6']

// Custom tooltip for charts
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[120px]">
      <p className="text-xs font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-gray-500 capitalize">{entry.name}:</span>
          <span className="font-medium text-gray-900">${entry.value.toFixed(1)}K</span>
        </div>
      ))}
    </div>
  )
}

// Loading skeleton component
function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl p-5 border border-gray-100">
            <div className="h-3 w-24 bg-gray-100 rounded mb-3" />
            <div className="h-8 w-32 bg-gray-100 rounded mb-2" />
            <div className="h-2 w-20 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

// Stat card with icon and trend
function StatCard({ label, value, subtext, icon, trend, color = 'teal' }: {
  label: string
  value: string
  subtext: string
  icon: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
  color?: 'teal' | 'amber' | 'emerald' | 'rose'
}) {
  const colorClasses = {
    teal: { bg: 'bg-teal-50', icon: 'bg-teal-100 text-teal-600', accent: '#209d9d' },
    amber: { bg: 'bg-amber-50', icon: 'bg-amber-100 text-amber-600', accent: '#f59e0b' },
    emerald: { bg: 'bg-emerald-50', icon: 'bg-emerald-100 text-emerald-600', accent: '#10b981' },
    rose: { bg: 'bg-rose-50', icon: 'bg-rose-100 text-rose-600', accent: '#ef4444' },
  }
  const colors = colorClasses[color]

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 hover:border-gray-200 transition-all duration-200 hover:shadow-md group">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</span>
        <div className={`p-2 rounded-lg ${colors.icon}`}>
          {icon}
        </div>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-bold text-gray-900 tracking-tight">{value}</span>
        {trend && (
          <span className={`text-xs mb-1 ${trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-rose-500' : 'text-gray-400'}`}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
          </span>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-2">{subtext}</p>
    </div>
  )
}

// Empty state component
function EmptyState({ title, description, icon }: { title: string; description: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="p-4 bg-gray-50 rounded-full mb-4 text-gray-300">
        {icon}
      </div>
      <h4 className="text-sm font-semibold text-gray-700 mb-1">{title}</h4>
      <p className="text-xs text-gray-400 max-w-[200px]">{description}</p>
    </div>
  )
}

export default function Dashboard() {
  const [l5TeamFilter, setL5TeamFilter] = useState<string>('')

  // Fetch unique L5 teams for filter
  const { data: resourcesData } = useQuery({
    queryKey: ['resources', 'all'],
    queryFn: () => getResources({ size: 1000 }),
  })

  // Extract unique L5 team codes
  const l5Teams: string[] = Array.from(new Set(
    (resourcesData?.content || [])
      .filter((r: any) => r.l5TeamCode)
      .map((r: any) => r.l5TeamCode)
  )).sort() as string[]

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: getDashboardSummary,
  })

  const { data: supplyDemand, isLoading: loadingSupplyDemand } = useQuery({
    queryKey: ['dashboard', 'supplyDemand'],
    queryFn: () => getSupplyDemandTrend(12),
  })

  const { data: variance, isLoading: loadingVariance } = useQuery({
    queryKey: ['dashboard', 'variance'],
    queryFn: getVariance,
  })

  // Burn rate data - temporarily unused in new layout, can be added back if needed
  // const { data: burnRate, isLoading: loadingBurnRate } = useQuery({
  //   queryKey: ['dashboard', 'burnRate'],
  //   queryFn: () => getBurnRateTrend(6),
  // })

  const { data: skillSupply, isLoading: loadingSkillSupply } = useQuery({
    queryKey: ['dashboard', 'skillSupply'],
    queryFn: getSupplyBySkill,
  })

  const { data: budgetTrend, isLoading: loadingBudgetTrend } = useQuery({
    queryKey: ['dashboard', 'budgetTrend', 2026],
    queryFn: () => getBudgetTrend(2026),
  })

  if (loadingSummary) {
    return <DashboardSkeleton />
  }

  // Calculate utilization trend
  const utilizationTrend = (summary?.utilizationRate || 0) > 50 ? 'up' : (summary?.utilizationRate || 0) < 30 ? 'down' : 'neutral'

  return (
    <div className="p-6 space-y-6">
      {/* Header with subtle decoration */}
      <div className="flex items-center justify-between">
        <div className="relative">
          <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-teal-500 to-teal-300 rounded-full opacity-50" />
          <span
            className="text-sm font-medium"
            style={{ color: '#78716c' }}
          >
            Resource allocation overview for fiscal year Dec - Nov
          </span>
        </div>

        {/* L5 Team Filter */}
        {l5Teams.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">L5 Team:</label>
            <select
              value={l5TeamFilter}
              onChange={(e) => setL5TeamFilter(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm bg-white"
            >
              <option value="">All Teams</option>
              {l5Teams.map((team: string) => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Summary Cards - Enhanced */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Supply"
          value={`$${(summary?.totalSupplyK || 0).toFixed(0)}K`}
          subtext={`${summary?.totalSupply || 0} resources × 12 months`}
          color="teal"
          trend="neutral"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />
        <StatCard
          label="Total Demand"
          value={`$${(summary?.totalDemand || 0).toFixed(0)}K`}
          subtext="Sum of all project budgets"
          color="amber"
          trend="neutral"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />
        <StatCard
          label="Available Supply"
          value={`$${(summary?.availableSupplyK || 0).toFixed(0)}K`}
          subtext="Supply minus demand"
          color={(summary?.availableSupplyK || 0) >= 0 ? 'emerald' : 'rose'}
          trend={(summary?.availableSupplyK || 0) >= 0 ? 'up' : 'down'}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />
        <StatCard
          label="Utilization"
          value={`${(summary?.utilizationRate || 0).toFixed(1)}%`}
          subtext={`${(summary?.totalDemand || 0).toFixed(0)}K / ${(summary?.totalSupplyK || 0).toFixed(0)}K`}
          color={(summary?.utilizationRate || 0) > 80 ? 'rose' : (summary?.utilizationRate || 0) > 50 ? 'amber' : 'teal'}
          trend={utilizationTrend}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Supply by Skill</h3>
          {loadingSkillSupply ? (
            <div className="h-48 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-gray-200 border-t-teal-500 rounded-full animate-spin" />
            </div>
          ) : skillSupply && skillSupply.length > 0 ? (
            (() => {
              const total = skillSupply.reduce((sum, s) => sum + s.count, 0)
              return (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={skillSupply}
                      dataKey="count"
                      nameKey="skill"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={3}
                      label={({ skill, percent }) => `${skill} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {skillSupply.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null
                        const item = payload[0].payload
                        const percent = ((item.count / total) * 100).toFixed(1)
                        return (
                          <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
                            <span className="font-medium text-gray-900">{item.skill}: </span>
                            <span className="text-gray-600">{item.count} ({percent}%)</span>
                          </div>
                        )
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )
            })()
          ) : (
            <EmptyState
              title="No skill data"
              description="Resource skills will appear here"
              icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>}
            />
          )}
        </div>
      </div>

      {/* Budget Trend - Burn-down Chart */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Budget vs Allocation Trend</h3>
        {loadingBudgetTrend ? (
          <div className="h-72 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-gray-200 border-t-teal-500 rounded-full animate-spin" />
          </div>
        ) : budgetTrend && budgetTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={budgetTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" tickFormatter={(v) => `$${v}K`} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  return (
                    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
                      <p className="font-semibold text-gray-900 mb-1">{label}</p>
                      {payload.map((entry: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                          <span className="text-gray-500">{entry.name}:</span>
                          <span className="font-medium text-gray-900">${entry.value?.toFixed(1)}K</span>
                        </div>
                      ))}
                    </div>
                  )
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="totalBudgetK" name="Total Budget" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="allocatedK" name="Allocated" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 4 }} />
              <Line type="monotone" dataKey="remainingK" name="Remaining" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState
            title="No budget data"
            description="Budget allocation trends will appear here"
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
        )}
      </div>

      {/* Supply vs Demand Chart */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Monthly Supply & Demand (Dec - Nov)</h3>
        {loadingSupplyDemand ? (
          <div className="h-72 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-gray-200 border-t-teal-500 rounded-full animate-spin" />
          </div>
        ) : supplyDemand && supplyDemand.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={supplyDemand} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="supplyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#209d9d" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#209d9d" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={(v) => `$${v}K`} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
              <Legend wrapperStyle={{ paddingTop: 20 }} />
              <Bar dataKey="supply" name="Supply" fill="url(#supplyGradient)" stroke="#209d9d" strokeWidth={1.5} barSize={32} radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="demand" name="Allocated" stroke="#f59e0b" strokeWidth={2.5} dot={{ fill: '#f59e0b', r: 4, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState
            title="No data available"
            description="Supply and demand data will appear here"
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
          />
        )}
      </div>

      {/* Variance Analysis Table */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Variance Analysis</h3>
        {loadingVariance ? (
          <div className="h-40 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-gray-200 border-t-teal-500 rounded-full animate-spin" />
          </div>
        ) : variance && variance.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Project</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Budget (K)</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Allocated (KUSD)</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Variance (K)</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Variance %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {variance.map((row) => (
                  <tr key={row.projectId} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-gray-900">{row.projectName}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm text-gray-600 font-medium">${row.budgetK.toFixed(1)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm text-gray-600">${row.allocatedK.toFixed(1)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${
                        row.varianceK >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}>
                        {row.varianceK >= 0 ? '+' : ''}${row.varianceK.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-sm font-medium ${
                        row.variancePercent >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {row.variancePercent >= 0 ? '+' : ''}{row.variancePercent.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No projects"
            description="Project variance will appear here"
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
          />
        )}
      </div>

      {/* Overplan Alert */}
      {summary?.overplanCount && summary.overplanCount > 0 && (
        <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 flex items-start gap-3">
          <div className="p-2 bg-rose-100 rounded-lg text-rose-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-rose-800">{summary.overplanCount} Project(s) Over Plan</h4>
            <p className="text-xs text-rose-600 mt-1">These projects have allocated hours exceeding their planned capacity</p>
          </div>
        </div>
      )}
    </div>
  )
}