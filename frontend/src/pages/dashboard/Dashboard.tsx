import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, PieChart, Pie, Cell } from 'recharts'
import { getDashboardSummary, getSupplyDemandTrend, getVariance, getBurnRateTrend, getSupplyBySkill, getAllocationStatus } from '@/api/dashboard'

const COLORS = ['#209d9d', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6']

export default function Dashboard() {
  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: getDashboardSummary,
  })

  const { data: supplyDemand, isLoading: loadingSupplyDemand } = useQuery({
    queryKey: ['dashboard', 'supplyDemand'],
    queryFn: () => getSupplyDemandTrend(6),
  })

  const { data: variance, isLoading: loadingVariance } = useQuery({
    queryKey: ['dashboard', 'variance'],
    queryFn: getVariance,
  })

  const { data: burnRate, isLoading: loadingBurnRate } = useQuery({
    queryKey: ['dashboard', 'burnRate'],
    queryFn: () => getBurnRateTrend(6),
  })

  const { data: skillSupply, isLoading: loadingSkillSupply } = useQuery({
    queryKey: ['dashboard', 'skillSupply'],
    queryFn: getSupplyBySkill,
  })

  const { data: allocationStatus, isLoading: loadingStatus } = useQuery({
    queryKey: ['dashboard', 'status'],
    queryFn: getAllocationStatus,
  })

  if (loadingSummary) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Supply & Demand Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of resources, allocations, and budget</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Supply</p>
          <p className="text-2xl font-bold text-gray-900">{summary?.totalSupply || 0}</p>
          <p className="text-xs text-gray-400">Active resources</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Demand (This Month)</p>
          <p className="text-2xl font-bold text-gray-900">{summary?.totalDemand?.toFixed(0) || 0}h</p>
          <p className="text-xs text-gray-400">Allocated hours</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Budget</p>
          <p className="text-2xl font-bold text-gray-900">${summary?.totalBudgetK?.toFixed(0) || 0}K</p>
          <p className="text-xs text-gray-400">All projects</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Utilization Rate</p>
          <p className="text-2xl font-bold" style={{ color: (summary?.utilizationRate || 0) > 80 ? '#ef4444' : '#209d9d' }}>
            {summary?.utilizationRate?.toFixed(1) || 0}%
          </p>
          <p className="text-xs text-gray-400">{summary?.totalDemand?.toFixed(0) || 0}h / {(summary?.totalSupply || 0) * 144}h</p>
        </div>
      </div>

      {/* Allocation Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Allocation Status</h3>
          {loadingStatus ? (
            <div className="h-40 flex items-center justify-center">Loading...</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={allocationStatus || []}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={60}
                  label={({ status, count }) => `${status}: ${count}`}
                >
                  {allocationStatus?.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Supply by Skill</h3>
          {loadingSkillSupply ? (
            <div className="h-40 flex items-center justify-center">Loading...</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={skillSupply || []}
                  dataKey="count"
                  nameKey="skill"
                  cx="50%"
                  cy="50%"
                  outerRadius={60}
                  label={({ skill, count }) => `${skill}: ${count}`}
                >
                  {skillSupply?.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Supply vs Demand Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Monthly Demand Trend</h3>
        {loadingSupplyDemand ? (
          <div className="h-64 flex items-center justify-center">Loading...</div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={supplyDemand || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" name="Hours Allocated" fill="#209d9d" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Budget Burn Rate */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Budget Burn Rate (6 Months)</h3>
        {loadingBurnRate ? (
          <div className="h-64 flex items-center justify-center">Loading...</div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={burnRate || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" name="Spent (K)" stroke="#f59e0b" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Variance Analysis Table */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Variance Analysis</h3>
        {loadingVariance ? (
          <div className="h-40 flex items-center justify-center">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Project</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Budget (K)</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Allocated (K)</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Spent (K)</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Variance (K)</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Variance %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {variance?.map((row) => (
                  <tr key={row.projectId} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-900">{row.projectName}</td>
                    <td className="px-4 py-2 text-sm text-right text-gray-600">${row.budgetK.toFixed(1)}</td>
                    <td className="px-4 py-2 text-sm text-right text-gray-600">${row.allocatedK.toFixed(1)}</td>
                    <td className="px-4 py-2 text-sm text-right text-gray-600">${row.spentK.toFixed(1)}</td>
                    <td className={`px-4 py-2 text-sm text-right ${row.varianceK >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${row.varianceK.toFixed(1)}
                    </td>
                    <td className={`px-4 py-2 text-sm text-right ${row.variancePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {row.variancePercent.toFixed(1)}%
                    </td>
                  </tr>
                ))}
                {(!variance || variance.length === 0) && (
                  <tr>
                    <td colSpan={6} className="px-4 py-4 text-center text-gray-500">No project data</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Overplan Projects */}
      {summary?.overplanCount && summary.overplanCount > 0 && (
        <div className="bg-red-50 rounded-lg border border-red-200 p-4">
          <h3 className="text-sm font-semibold text-red-800 mb-2">
            ⚠️ {summary.overplanCount} Project(s) Over Plan
          </h3>
          <p className="text-xs text-red-600">These projects have allocated hours exceeding their planned capacity</p>
        </div>
      )}
    </div>
  )
}