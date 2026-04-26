import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { projectsApi, Project } from '../../api/projects';

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; label: string }> = {
  REQUESTED: { bg: '#eff6ff', text: '#1d4ed8', border: '#3b82f6', label: 'Requested' },
  EXECUTING: { bg: '#dcfce7', text: '#15803d', border: '#22c55e', label: 'Executing' },
  ON_HOLD: { bg: '#fef9c3', text: '#a16207', border: '#eab308', label: 'On Hold' },
  COMPLETED: { bg: '#d1fae5', text: '#065f46', border: '#10b981', label: 'Completed' },
  CANCELLED: { bg: '#fee2e2', text: '#b91c1c', border: '#ef4444', label: 'Cancelled' },
};

const BUDGET_COLORS = [
  { max: 25, bg: '#f0f7f7', accent: '#4db1b1' },
  { max: 50, bg: '#fef3e6', accent: '#ee961f' },
  { max: 75, bg: '#fce2c2', accent: '#cb7819' },
  { max: 100, bg: '#fee2e2', accent: '#ef4444' },
  { max: Infinity, bg: '#fee2e2', accent: '#b91c1c' },
];

function getBudgetColor(budget: number) {
  return BUDGET_COLORS.find(b => budget <= b.max) || BUDGET_COLORS[0];
}

export function ProjectList() {
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['projects', page, status],
    queryFn: () => projectsApi.list({ page, size: 20 }),
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
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
          {projects.map((project, index) => {
            const statusStyle = STATUS_CONFIG[project.status] || STATUS_CONFIG.REQUESTED;
            const budgetStyle = getBudgetColor(project.budgetTotalK);

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

                {/* Card Footer */}
                <div
                  className="flex items-center justify-between pt-3"
                  style={{ borderTop: '1px solid #f5f5f5' }}
                >
                  <div>
                    <p className="text-[10px] uppercase tracking-wider" style={{ color: '#a3a3a3' }}>
                      Budget
                    </p>
                    <p
                      className="text-sm font-semibold"
                      style={{
                        color: budgetStyle.accent,
                        fontFamily: 'var(--font-display)'
                      }}
                    >
                      ${project.budgetTotalK}K
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wider" style={{ color: '#a3a3a3' }}>
                      {project.startDate ? 'Timeline' : 'No dates'}
                    </p>
                    <p className="text-sm" style={{ color: '#737373' }}>
                      {project.startDate && project.endDate
                        ? `${project.startDate.slice(5)} → ${project.endDate.slice(5)}`
                        : '—'}
                    </p>
                  </div>
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