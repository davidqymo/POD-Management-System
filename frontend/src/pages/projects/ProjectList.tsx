import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { projectsApi, Project, GanttData, activitiesApi } from '../../api/projects';
import { listAllocations } from '@/api/allocations';
import { ratesApi } from '@/api/rates';
import { getResources } from '@/api/resources';

// Generate fiscal year months (Dec to Nov) with current month detection
function getFiscalYearMonths(): { hcm: number; label: string; isCurrent: boolean }[] {
  const months: { hcm: number; label: string; isCurrent: boolean }[] = [];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentHcm = currentYear * 100 + currentMonth;

  const monthNames = ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];

  for (let i = 0; i < 12; i++) {
    const monthIndex = (i + 11) % 12;
    const year = i === 0 ? currentYear - 1 : currentYear;
    const hcm = year * 100 + (monthIndex + 1);
    months.push({ hcm, label: monthNames[i], isCurrent: hcm === currentHcm });
  }
  return months;
}

// Calculate allocated cost
function calculateAllocatedCost(allocations: any[], resources: any[], rates: any[], projectId: number): number {
  let totalK = 0;
  for (const alloc of allocations) {
    if (Number(alloc.projectId) !== projectId) continue;
    if (!alloc.active) continue;
    const resource = resources.find((r: any) => r.id === alloc.resourceId);
    if (!resource) continue;
    const rate = rates.find((r: any) =>
      r.costCenterId === resource.costCenterId && r.billableTeamCode === resource.billableTeamCode
    );
    if (!rate) continue;
    const hcm = (alloc.hours || 0) / 144;
    totalK += hcm * Number(rate.monthlyRateK);
  }
  return totalK;
}

// Get Gantt data for timeline rendering
function getGanttBarInfo(
  activities: any[],
  ganttData: GanttData | undefined,
  fiscalMonths: { hcm: number; label: string; isCurrent: boolean }[]
): {
  startIndex: number;
  endIndex: number;
  criticalStartIndex: number;
  criticalEndIndex: number;
  hasCriticalPath: boolean;
  months: { hcm: number; label: string; isCurrent: boolean; hasSchedule: boolean; isCriticalPath: boolean; isMilestone: boolean; activityName?: string }[];
} {
  // Get critical path IDs from Gantt data
  const ganttActivities = ganttData?.activities || [];

  // Initialize all months with label info
  const months: { hcm: number; label: string; isCurrent: boolean; hasSchedule: boolean; isCriticalPath: boolean; isMilestone: boolean; activityName?: string }[] = [];
  for (const fm of fiscalMonths) {
    months.push({ ...fm, hasSchedule: false, isCriticalPath: false, isMilestone: false });
  }

  let startIndex = -1;
  let endIndex = -1;
  let criticalStartIndex = -1;
  let criticalEndIndex = -1;

  for (const activity of activities) {
    const startDate = activity.plannedStartDate || activity.startDate;
    if (!startDate) continue;

    const ganttAct = ganttActivities.find((a: any) => a.id === activity.id);
    const isCritical = ganttAct?.isCritical || false;
    const milestone = activity.isMilestone || activity.milestone || false;

    const startParts = startDate.split('-');
    if (startParts.length < 2) continue;

    const startYear = Number.parseInt(startParts[0]);
    const startMonthNum = Number.parseInt(startParts[1]);
    const startMonthHcm = startYear * 100 + startMonthNum;
    const sIdx = fiscalMonths.findIndex(m => m.hcm === startMonthHcm);

    const endDate = activity.plannedEndDate || activity.endDate;
    let endYear = startYear;
    let endMonthNum = startMonthNum;
    let eIdx = sIdx;
    if (endDate) {
      const endParts = endDate.split('-');
      if (endParts.length >= 2) {
        endYear = Number.parseInt(endParts[0]);
        endMonthNum = Number.parseInt(endParts[1]);
        const endMonthHcm = endYear * 100 + endMonthNum;
        eIdx = fiscalMonths.findIndex(m => m.hcm === endMonthHcm);
      }
    }

    if (sIdx >= 0) {
      if (startIndex === -1 || sIdx < startIndex) startIndex = sIdx;
      if (endIndex === -1 || eIdx > endIndex) endIndex = eIdx;
      if (isCritical) {
        if (criticalStartIndex === -1 || sIdx < criticalStartIndex) criticalStartIndex = sIdx;
        if (criticalEndIndex === -1 || eIdx > criticalEndIndex) criticalEndIndex = eIdx;
      }
    }

    for (let y = startYear; y <= endYear; y++) {
      const startM = y === startYear ? startMonthNum : 1;
      const endM = y === endYear ? endMonthNum : 12;
      for (let m = startM; m <= endM; m++) {
        const mhcm = y * 100 + m;
        const monthData = months.find(mo => mo.hcm === mhcm);
        if (monthData) {
          monthData.hasSchedule = true;
          if (isCritical) monthData.isCriticalPath = true;
          if (milestone) {
            monthData.isMilestone = true;
            monthData.activityName = activity.name;
          }
        }
      }
    }
  }

  return {
    startIndex,
    endIndex,
    criticalStartIndex,
    criticalEndIndex,
    hasCriticalPath: criticalStartIndex >= 0,
    months
  };
}

// Helper for milestone detection
function getIsMilestone(activity: any): boolean {
  return activity.isMilestone || activity.milestone || false;
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  REQUESTED: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500', label: 'Requested' },
  EXECUTING: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500', label: 'Executing' },
  ON_HOLD: { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500', label: 'On Hold' },
  COMPLETED: { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400', label: 'Completed' },
  CANCELLED: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500', label: 'Cancelled' },
};

export function ProjectList() {
  const [page, setPage] = useState(0);
  const fiscalMonths = getFiscalYearMonths();

  // Fetch projects
  const { data, isLoading } = useQuery({
    queryKey: ['projects', page],
    queryFn: () => projectsApi.list({ page, size: 20 }),
  });

  // Fetch all allocations
  const { data: allocations = [] } = useQuery({
    queryKey: ['allocations', 'all'],
    queryFn: () => listAllocations(),
  });

  // Fetch all resources
  const { data: resourcesData } = useQuery({
    queryKey: ['resources', 'all'],
    queryFn: () => getResources({ page: 0, size: 200 }),
  });
  const resources = (resourcesData as any)?.content || [];

  // Fetch rates
  const { data: rates = [] } = useQuery({
    queryKey: ['rates'],
    queryFn: () => ratesApi.list(),
  });

  // Fetch activities for all projects (includes plannedStartDate/plannedEndDate)
  const { data: projectsWithActivities } = useQuery({
    queryKey: ['projects', 'all', 'activities'],
    queryFn: async () => {
      const projectList = data?.data?.content || [];
      const activitiesMap: { [projectId: number]: any[] } = {};
      for (const p of projectList) {
        try {
          const response = await activitiesApi.list(p.id);
          activitiesMap[p.id] = response.data || [];
        } catch {
          activitiesMap[p.id] = [];
        }
      }
      return activitiesMap;
    },
    enabled: !!data?.data?.content?.length,
  });

  // Fetch Gantt data for critical path
  const { data: projectsWithGantt } = useQuery({
    queryKey: ['projects', 'all', 'gantt'],
    queryFn: async () => {
      const projectList = data?.data?.content || [];
      const ganttMap: { [projectId: number]: GanttData } = {};
      for (const p of projectList) {
        try {
          const response = await projectsApi.getGantt(p.id);
          ganttMap[p.id] = response.data;
        } catch {
          ganttMap[p.id] = { projectId: p.id, activities: [], links: [], criticalPath: [], totalDurationDays: 0 };
        }
      }
      return ganttMap;
    },
    enabled: !!data?.data?.content?.length,
  });

  const projects: Project[] = data?.data?.content || [];
  const totalPages = data?.data?.totalPages || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span
            className="text-sm font-medium"
            style={{ color: '#78716c' }}
          >
            {projects.length} projects | Fiscal Year Dec - Nov
          </span>
        </div>
        <Link
          to="/projects/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white"
          style={{ background: 'linear-gradient(135deg, #209d9d 0%, #0D4F4F 100%)' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Project
        </Link>
      </div>

      {/* Gantt Chart Section */}
      {projects.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800">Project Timeline - Gantt Chart</h2>
            <div className="flex items-center gap-4 mt-2 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-teal-500"></span> Scheduled
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-orange-500"></span> Critical Path
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-purple-500"></span> Milestone
              </span>
            </div>
          </div>
          {/* Month headers */}
          <div className="flex border-b border-gray-100">
            <div className="w-48 px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-50">Project</div>
            <div className="flex-1 flex">
              {fiscalMonths.map((m) => (
                <div key={m.hcm} className={`flex-1 text-center py-2 text-xs font-medium ${m.isCurrent ? 'bg-orange-50 text-orange-700' : 'text-gray-500'}`}>
                  {m.label}
                </div>
              ))}
            </div>
          </div>
          {/* Gantt rows - Timeline Style with Line */}
          <div className="max-h-96 overflow-y-auto">
            {projects.slice(0, 15).map((project) => {
              const activities = projectsWithActivities?.[project.id] || [];
              const ganttData = projectsWithGantt?.[project.id];
              const ganttInfo = getGanttBarInfo(activities, ganttData, fiscalMonths);
              const statusStyle = STATUS_CONFIG[project.status] || STATUS_CONFIG.REQUESTED;

              return (
                <div key={project.id} className="flex border-b border-gray-50 hover:bg-gray-50">
                  <div className="w-48 px-4 py-3 flex items-center">
                    <Link to={`/projects/${project.id}`} className="block truncate">
                      <div className="text-sm font-medium text-gray-900 hover:text-teal-600 truncate" title={project.name}>
                        {project.name}
                      </div>
                      <div className="text-xs text-gray-400">
                        <span className={`inline-flex items-center gap-1`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`}></span>
                          {statusStyle.label}
                        </span>
                      </div>
                    </Link>
                  </div>
                  {/* Timeline with connected line */}
                  <div className="flex-1 relative h-10">
                    {/* Always show baseline */}
                    <div className="absolute top-1/2 left-0 h-0.5 bg-gray-200 w-full" />
                    {/* Project duration line */}
                    {ganttInfo.startIndex >= 0 && (
                      <div
                        className="absolute top-1/2 h-1 bg-teal-400 rounded"
                        style={{
                          left: `${ganttInfo.startIndex * 8.33}%`,
                          width: `${Math.max((ganttInfo.endIndex - ganttInfo.startIndex + 1) * 8.33, 8.33)}%`
                        }}
                      />
                    )}
                    {/* Critical path line overlay */}
                    {ganttInfo.hasCriticalPath && (
                      <div
                        className="absolute top-1/2 h-1.5 bg-orange-500 rounded"
                        style={{
                          left: `${ganttInfo.criticalStartIndex * 8.33}%`,
                          width: `${Math.max((ganttInfo.criticalEndIndex - ganttInfo.criticalStartIndex + 1) * 8.33, 8.33)}%`
                        }}
                      />
                    )}
                    {/* Month markers/dots */}
                    {ganttInfo.months.map((m, idx) => {
                      const hasSchedule = m.hasSchedule;
                      const isCriticalPath = m.isCriticalPath;
                      const isMilestone = m.isMilestone;
                      const isInRange = idx >= ganttInfo.startIndex && idx <= ganttInfo.endIndex && ganttInfo.startIndex >= 0;

                      if (!isInRange) return null;

                      // Determine dot style
                      let dotClass = 'w-2 h-2 bg-gray-400';
                      if (isMilestone) dotClass = 'w-4 h-4 bg-purple-500 border-2 border-white';
                      else if (isCriticalPath) dotClass = 'w-3 h-3 bg-orange-500';
                      else if (hasSchedule) dotClass = 'w-2 h-2 bg-teal-500';

                      const fiscalMonthIdx = fiscalMonths.findIndex(fm => fm.hcm === m.hcm);
                      const leftPos = fiscalMonthIdx >= 0 ? `calc(${fiscalMonthIdx * 8.33}% - 4px)` : '0%';
                      return (
                        <div
                          key={m.hcm}
                          className={`absolute top-1/2 -translate-y-1/2 ${dotClass} rounded-full ${m.isCurrent ? 'ring-2 ring-orange-400' : ''} z-10`}
                          style={{ left: leftPos }}
                          title={`${m.label}: ${isMilestone ? m.activityName + ' (Milestone)' : isCriticalPath ? 'Critical Path' : 'Scheduled'}`}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Timeline Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">Project Timeline (Dec - Nov)</h2>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-teal-500"></span> Allocated
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-purple-500 ring-2 ring-purple-300"></span> Milestone
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded ring-2 ring-teal-500"></span> Current Month
            </span>
          </div>
        </div>
        <div className="flex gap-px">
          {fiscalMonths.map((m) => (
            <div
              key={m.hcm}
              className={`flex-1 text-center py-2 text-xs font-medium ${
                m.isCurrent ? 'bg-teal-50 text-teal-700' : 'bg-gray-50 text-gray-500'
              }`}
            >
              {m.label}
            </div>
          ))}
        </div>
      </div>

      {/* Project Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Project</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Timeline</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Budget</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Allocated</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Usage</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Milestones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {projects.map((project) => {
              const statusStyle = STATUS_CONFIG[project.status] || STATUS_CONFIG.REQUESTED;
              const allocatedCost = calculateAllocatedCost(allocations, resources, rates, project.id);
              const budgetTotalK = project.budgetTotalK || 0;
              const gantt = projectsWithActivities?.[project.id];
              const activities = gantt || [];
              const ganttBarInfo = getGanttBarInfo(activities, undefined, fiscalMonths);
              const milestones = activities.filter((a: any) => getIsMilestone(a));
              const usedPercent = budgetTotalK > 0 ? (allocatedCost / budgetTotalK) * 100 : 0;

              return (
                <tr key={project.id} className="hover:bg-gray-50">
                  {/* Project Name */}
                  <td className="px-4 py-3">
                    <Link to={`/projects/${project.id}`} className="block">
                      <div className="text-sm font-semibold text-gray-900 hover:text-teal-600">
                        {project.name}
                      </div>
                      <div className="text-xs text-gray-400">
                        {project.requestId && <span className="mr-2">#{project.requestId}</span>}
                        {project.startDate && project.endDate && (
                          <span>{project.startDate.slice(5)} → {project.endDate.slice(5)}</span>
                        )}
                      </div>
                    </Link>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`}></span>
                      {statusStyle.label}
                    </span>
                  </td>

                  {/* Timeline Bar - Gantt Chart */}
                  <td className="px-2 py-2">
                    <div className="flex gap-px h-8 relative">
                      {ganttBarInfo.months.map((m) => {
                        const hasSchedule = m.hasSchedule;
                        const isCriticalPath = m.isCriticalPath;
                        const isMilestone = m.isMilestone;

                        // Build bar segment
                        let barClass = 'bg-gray-100';
                        if (isMilestone) barClass = 'bg-purple-500';
                        else if (isCriticalPath) barClass = 'bg-orange-500';
                        else if (hasSchedule) barClass = 'bg-teal-500';

                        // Calculate bar position and width
                        const isInRange = m.hcm >= ganttBarInfo.startIndex && m.hcm <= ganttBarInfo.endIndex && ganttBarInfo.startIndex >= 0;

                        if (!isInRange) {
                          return (
                            <div
                              key={m.hcm}
                              className="flex-1 h-full bg-transparent"
                            />
                          );
                        }

                        return (
                          <div
                            key={m.hcm}
                            className={`flex-1 rounded-sm ${barClass} ${m.isCurrent ? 'ring-2 ring-orange-400' : ''} ${isMilestone ? 'relative' : ''}`}
                            title={`${m.label}: ${isMilestone ? m.activityName + ' (Milestone)' : isCriticalPath ? 'Critical Path' : hasSchedule ? 'Scheduled' : 'No activity'}`}
                          >
                            {isMilestone && (
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-600 rounded-full border-2 border-white"></div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </td>

                  {/* Budget */}
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-semibold text-gray-900">${budgetTotalK}K</span>
                  </td>

                  {/* Allocated */}
                  <td className="px-4 py-3 text-right">
                    <span className={`text-sm font-medium ${allocatedCost > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                      ${allocatedCost.toFixed(1)}K
                    </span>
                  </td>

                  {/* Usage */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className={`text-sm font-medium ${usedPercent > 100 ? 'text-red-600' : usedPercent > 80 ? 'text-yellow-600' : 'text-green-600'}`}>
                        {usedPercent.toFixed(0)}%
                      </span>
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${usedPercent > 100 ? 'bg-red-500' : usedPercent > 80 ? 'bg-yellow-500' : 'bg-green-500'}`}
                          style={{ width: `${Math.min(usedPercent, 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Milestones */}
                  <td className="px-4 py-3 text-center">
                    {milestones.length > 0 ? (
                      <div className="flex items-center justify-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                        <span className="text-xs font-medium text-purple-700">{milestones.length}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {projects.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No projects found
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 0}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-white border border-gray-200 disabled:opacity-40"
          >
            ← Previous
          </button>
          <span className="text-sm text-gray-500">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages - 1}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-white border border-gray-200 disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}