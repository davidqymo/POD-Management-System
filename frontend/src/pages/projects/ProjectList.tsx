import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { projectsApi, Project } from '../../api/projects';
import { listAllocations } from '@/api/allocations';
import { ratesApi } from '@/api/rates';
import { getResources } from '@/api/resources';

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; label: string }> = {
  REQUESTED: { bg: '#eff6ff', text: '#1d4ed8', border: '#3b82f6', label: 'Requested' },
  EXECUTING: { bg: '#dcfce7', text: '#15803d', border: '#22c55e', label: 'Executing' },
  ON_HOLD: { bg: '#fef9c3', text: '#a16207', border: '#eab308', label: 'On Hold' },
  COMPLETED: { bg: '#d1fae5', text: '#065f46', border: '#10b981', label: 'Completed' },
  CANCELLED: { bg: '#fee2e2', text: '#b91c1c', border: '#ef4444', label: 'Cancelled' },
};

// Generate fiscal year months (Dec to Nov)
function getFiscalYearMonths(): { hcm: number; label: string }[] {
  const months: { hcm: number; label: string }[] = [];
  const now = new Date();
  const currentYear = now.getFullYear();
  const monthNames = ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];

  for (let i = 0; i < 12; i++) {
    const monthIndex = (i + 11) % 12;
    const year = i === 0 ? currentYear - 1 : currentYear;
    const hcm = year * 100 + (monthIndex + 1);
    months.push({ hcm, label: monthNames[i] });
  }
  return months;
}

// Calculate allocated cost from allocations using rates
function calculateAllocatedCost(allocations: any[], resources: any[], rates: any[], projectId: number): { totalK: number; totalHours: number; noRateCount: number } {
  const projectAllocations = allocations.filter((a: any) => a.projectId === projectId && a.isActive);
  let totalK = 0;
  let totalHours = 0;
  let noRateCount = 0;

  for (const alloc of projectAllocations) {
    totalHours += alloc.hours || 0;
    const resource = resources.find((r: any) => r.id === alloc.resourceId);
    if (!resource) continue;

    const rate = rates.find((r: any) =>
      r.costCenterId === resource.costCenterId && r.billableTeamCode === resource.billableTeamCode
    );
    if (!rate) {
      noRateCount++;
      continue;
    }

    const hcm = (alloc.hours || 0) / 144; // 144 hours = 1 HCM
    totalK += hcm * Number(rate.monthlyRateK);
  }

  return { totalK, totalHours, noRateCount };
}

// Mini calendar showing allocation density per month
function AllocationCalendar({ projectId, allocations }: { projectId: number; allocations: any[] }) {
  const months = getFiscalYearMonths();
  const projectAllocs = allocations.filter((a: any) => a.projectId === projectId && a.isActive);

  // Group allocations by HCM
  const allocByMonth: Record<number, number> = {};
  for (const alloc of projectAllocs) {
    const hcm = alloc.hcm;
    allocByMonth[hcm] = (allocByMonth[hcm] || 0) + alloc.hours;
  }

  // Calculate intensity (0-4 scale based on hours)
  const maxHours = Math.max(...Object.values(allocByMonth), 144);

  const getIntensity = (hours: number): string => {
    if (hours === 0) return 'bg-gray-50';
    const ratio = hours / maxHours;
    if (ratio < 0.25) return 'bg-teal-100';
    if (ratio < 0.5) return 'bg-teal-200';
    if (ratio < 0.75) return 'bg-teal-300';
    return 'bg-teal-500';
  };

  return (
    <div className="mt-3">
      <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">Activity (Dec - Nov)</p>
      <div className="flex gap-1">
        {months.map((month) => {
          const hours = allocByMonth[month.hcm] || 0;
          const isCurrentMonth = month.hcm === new Date().getFullYear() * 100 + (new Date().getMonth() + 1);

          return (
            <div
              key={month.hcm}
              className={`flex-1 h-6 rounded text-[9px] font-medium flex items-center justify-center ${getIntensity(hours)} ${
                isCurrentMonth ? 'ring-2 ring-teal-500 ring-offset-1' : ''
              }`}
              title={`${month.label}: ${hours > 0 ? hours + 'h' : 'No allocation'}`}
            >
              {month.label.charAt(0)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ProjectList() {
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState('');

  // Fetch projects
  const { data, isLoading } = useQuery({
    queryKey: ['projects', page, status],
    queryFn: () => projectsApi.list({ page, size: 20, status: status || undefined }),
  });

  // Fetch all allocations for calculating allocated cost
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

  const projects: Project[] = data?.data?.content || [];
  const totalPages = data?.data?.totalPages || 0;
  const hasNext = !data?.data?.last;
  const hasPrev = page > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-semibold display-text"
            style={{ color: '#171717' }}
          >
            Projects
          </h1>
          <p className="text-sm mt-1" style={{ color: '#737373' }}>
            {projects.length} project{projects.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <a
          href="/projects/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all btn-primary-enhanced"
          style={{
            background: 'linear-gradient(135deg, #209d9d 0%, #0D4F4F 100%)',
            color: 'white',
            fontFamily: 'var(--font-body)',
            boxShadow: '0 2px 8px rgba(32, 158, 157, 0.25)'
          }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Project
        </a>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(0);
          }}
          className="px-3 py-2 rounded-lg text-sm font-medium outline-none transition-all"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e5e5e5',
            color: '#525252',
            fontFamily: 'var(--font-body)',
            minWidth: '160px'
          }}
        >
          <option value="">All Statuses</option>
          <option value="REQUESTED">Requested</option>
          <option value="EXECUTING">Executing</option>
          <option value="ON_HOLD">On Hold</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Projects Grid - Card-based design */}
      {projects.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-16 rounded-xl"
          style={{ backgroundColor: '#ffffff', border: '1px dashed #e5e5e5' }}
        >
          <svg
            className="w-12 h-12 mb-4"
            style={{ color: '#d4d4d4' }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p style={{ color: '#737373', fontFamily: 'var(--font-body)' }}>No projects found</p>
          <a
            href="/projects/new"
            className="mt-3 text-sm font-medium"
            style={{ color: '#209d9d' }}
          >
            Create your first project →
          </a>
        </div>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))' }}>
          {projects.map((project, index) => {
            const statusStyle = STATUS_CONFIG[project.status] || STATUS_CONFIG.REQUESTED;
            const { totalK: allocatedCost } = calculateAllocatedCost(allocations, resources, rates, project.id);
            const budgetTotalK = project.budgetTotalK || 0;
            const usedPercent = budgetTotalK > 0 ? (allocatedCost / budgetTotalK) * 100 : 0;

            return (
              <a
                key={project.id}
                href={`/projects/${project.id}`}
                className="card group block p-5 rounded-xl transition-all duration-300 animate-card-enter"
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e5e5',
                  borderLeft: `4px solid ${statusStyle.border}`,
                  animationDelay: `${index * 0.05}s`,
                  animation: 'cardStagger 0.5s ease-out forwards',
                  opacity: 0
                }}
              >
                {/* Card Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span
                      className="mono-text text-xs"
                      style={{ color: '#a3a3a3' }}
                    >
                      #{project.id}
                    </span>
                    <h3
                      className="text-base font-semibold mt-1 group-hover:text-brand-600 transition-colors"
                      style={{
                        color: '#171717',
                        fontFamily: 'var(--font-display)',
                        letterSpacing: '-0.01em'
                      }}
                    >
                      {project.name}
                    </h3>
                  </div>
                  <span
                    className="status-badge text-xs font-medium"
                    style={{
                      backgroundColor: statusStyle.bg,
                      color: statusStyle.text,
                      fontFamily: 'var(--font-body)'
                    }}
                  >
                    {statusStyle.label}
                  </span>
                </div>

                {/* Project IDs */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider" style={{ color: '#a3a3a3' }}>
                      Request ID
                    </p>
                    <p className="text-sm font-medium mono-text" style={{ color: '#525252' }}>
                      {project.requestId || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider" style={{ color: '#a3a3a3' }}>
                      Clarity ID
                    </p>
                    <p className="text-sm font-medium mono-text" style={{ color: '#525252' }}>
                      {project.clarityId || '—'}
                    </p>
                  </div>
                </div>

                {/* Budget & Allocated Cost Row */}
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div className="p-3 rounded-lg" style={{ backgroundColor: '#fafafa' }}>
                    <p className="text-[10px] uppercase tracking-wider" style={{ color: '#a3a3a3' }}>
                      Budget
                    </p>
                    <p className="text-lg font-bold" style={{ color: '#171717', fontFamily: 'var(--font-display)' }}>
                      ${budgetTotalK}K
                    </p>
                  </div>
                  <div
                    className="p-3 rounded-lg"
                    style={{
                      backgroundColor: usedPercent > 100 ? '#fef2f2' : usedPercent > 80 ? '#fffbeb' : '#f0fdf4'
                    }}
                  >
                    <p className="text-[10px] uppercase tracking-wider" style={{ color: '#a3a3a3' }}>
                      Allocated Cost
                    </p>
                    <p
                      className="text-lg font-bold"
                      style={{
                        color: usedPercent > 100 ? '#dc2626' : usedPercent > 80 ? '#d97706' : '#16a34a',
                        fontFamily: 'var(--font-display)'
                      }}
                    >
                      ${allocatedCost.toFixed(1)}K
                    </p>
                    {budgetTotalK > 0 && (
                      <div className="mt-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(usedPercent, 100)}%`,
                            backgroundColor: usedPercent > 100 ? '#dc2626' : usedPercent > 80 ? '#d97706' : '#16a34a'
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Allocation Calendar */}
                <AllocationCalendar projectId={project.id} allocations={allocations} />

                {/* Card Footer */}
                <div
                  className="flex items-center justify-between pt-3 mt-3"
                  style={{ borderTop: '1px solid #f5f5f5' }}
                >
                  <div className="text-left">
                    <p className="text-[10px] uppercase tracking-wider" style={{ color: '#a3a3a3' }}>
                      {project.startDate ? 'Timeline' : 'No dates'}
                    </p>
                    <p className="text-sm" style={{ color: '#737373' }}>
                      {project.startDate && project.endDate
                        ? `${project.startDate.slice(5)} → ${project.endDate.slice(5)}`
                        : '—'}
                    </p>
                  </div>
                  {budgetTotalK > 0 && (
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wider" style={{ color: '#a3a3a3' }}>
                        Budget Used
                      </p>
                      <p
                        className="text-sm font-medium"
                        style={{
                          color: usedPercent > 100 ? '#dc2626' : usedPercent > 80 ? '#d97706' : '#16a34a'
                        }}
                      >
                        {usedPercent.toFixed(0)}%
                      </p>
                    </div>
                  )}
                </div>
              </a>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4">
          <button
            onClick={() => setPage(page - 1)}
            disabled={!hasPrev}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e5e5',
              color: '#525252'
            }}
          >
            ← Previous
          </button>
          <span
            className="px-4 py-2 text-sm font-medium"
            style={{ color: '#737373', fontFamily: 'var(--font-mono)' }}
          >
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={!hasNext}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e5e5',
              color: '#525252'
            }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}