import { useState, useEffect, useMemo } from 'react';
import { projectsApi, GanttData } from '../../api/projects';

interface GanttChartProps {
  projectId: number;
  onActivityClick?: (activityId: number) => void;
}

export function GanttChart({ projectId, onActivityClick }: GanttChartProps) {
  const [ganttData, setGanttData] = useState<GanttData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;

    setLoading(true);
    projectsApi.getGantt(projectId)
      .then(res => {
        setGanttData(res.data);
        setError(null);
      })
      .catch(err => {
        console.error('Failed to load Gantt data:', err);
        setError('Failed to load schedule');
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  const { dateRange, startDate } = useMemo(() => {
    if (!ganttData?.activities?.length) {
      return { dateRange: [], startDate: null, endDate: null };
    }

    const dates = ganttData.activities.flatMap(a => [
      a.startDate ? new Date(a.startDate) : null,
      a.endDate ? new Date(a.endDate) : null
    ].filter(Boolean) as Date[]);

    if (dates.length === 0) return { dateRange: [], startDate: null, endDate: null };

    const min = new Date(Math.min(...dates.map(d => d.getTime())));
    const max = new Date(Math.max(...dates.map(d => d.getTime())));
    min.setDate(min.getDate() - 2);
    max.setDate(max.getDate() + 5);

    const range: Date[] = [];
    const curr = new Date(min);
    while (curr <= max) {
      range.push(new Date(curr));
      curr.setDate(curr.getDate() + 1);
    }

    return { dateRange: range, startDate: min, endDate: max };
  }, [ganttData]);

  const dayWidth = 40;
  const rowHeight = 44;
  const headerHeight = 50;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getPosition = (date: Date) => {
    if (!startDate) return 0;
    return Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) * dayWidth;
  };

  const getBarWidth = (startDate?: string, endDate?: string) => {
    if (!startDate || !endDate) return dayWidth * 3;
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.max(dayWidth, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) + 1) * dayWidth);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <p>{error}</p>
      </div>
    );
  }

  if (!ganttData?.activities?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64 rounded-lg" style={{ backgroundColor: '#fafaf8' }}>
        <svg className="w-12 h-12 mb-3" style={{ color: '#d4d4d4' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2m0-10a2 2 0 012 2h2a2 2 0 012 2" />
        </svg>
        <p style={{ color: '#737373' }}>No activities scheduled</p>
        <p className="text-xs mt-1" style={{ color: '#a3a3a3' }}>Add activities to see the project schedule</p>
      </div>
    );
  }

  const chartWidth = dateRange.length * dayWidth + 200;

  return (
    <div className="overflow-x-auto rounded-lg border" style={{ borderColor: '#e5e5e5', backgroundColor: '#ffffff' }}>
      {/* Header with dates */}
      <div className="flex sticky top-0 z-10" style={{ height: headerHeight, backgroundColor: '#fafafa' }}>
        <div className="flex items-center px-4 shrink-0" style={{ width: 200, borderRight: '1px solid #e5e5e5' }}>
          <span className="text-xs font-medium" style={{ color: '#525252' }}>Activity</span>
        </div>
        <div className="flex" style={{ width: chartWidth }}>
          {dateRange.filter((_, i) => i % 7 === 0).map((date, i) => (
            <div
              key={i}
              className="absolute text-xs"
              style={{
                left: getPosition(date) + 200,
                color: '#737373',
                fontFamily: 'var(--font-mono)'
              }}
            >
              {formatDate(date)}
            </div>
          ))}
        </div>
      </div>

      {/* Activities rows */}
      <div className="relative">
        {ganttData.activities.map((activity, index) => {
          const startDate = activity.startDate ? new Date(activity.startDate) : null;

          return (
            <div
              key={activity.id}
              className="flex items-center"
              style={{
                height: rowHeight,
                borderBottom: '1px solid #f5f5f5',
                backgroundColor: index % 2 === 0 ? '#ffffff' : '#fafafa'
              }}
            >
              {/* Activity name */}
              <div className="flex items-center px-4 shrink-0" style={{ width: 200, borderRight: '1px solid #e5e5e5' }}>
                <div className="flex items-center gap-2">
                  {activity.isMilestone && (
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#a855f7' }} />
                  )}
                  <span className="text-sm truncate" style={{ color: '#171717' }}>
                    {activity.name}
                  </span>
                </div>
              </div>

              {/* Gantt bars */}
              <div className="relative" style={{ width: chartWidth, height: rowHeight }}>
                {startDate && (
                  <div
                    className="absolute top-2 rounded flex items-center px-2 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => onActivityClick?.(activity.id)}
                    style={{
                      left: getPosition(startDate),
                      width: getBarWidth(activity.startDate, activity.endDate),
                      height: rowHeight - 12,
                      backgroundColor: activity.isCritical ? '#fee2e2' : activity.isMilestone ? '#f3e8ff' : '#d1fae5',
                      borderLeft: `3px solid ${activity.isCritical ? '#ef4444' : activity.isMilestone ? '#a855f7' : '#22c55e'}`
                    }}
                  >
                    <span className="text-xs font-medium truncate" style={{
                      color: activity.isCritical ? '#b91c1c' : activity.isMilestone ? '#7e22ce' : '#065f46'
                    }}>
                      {activity.durationDays}d
                    </span>
                  </div>
                )}

                {/* Early/Late bars (subtle) */}
                {activity.earlyStart !== activity.lateStart && (
                  <>
                    <div
                      className="absolute top-3 opacity-30 rounded"
                      style={{
                        left: 200 + activity.earlyStart * dayWidth,
                        width: (activity.earlyFinish - activity.earlyStart) * dayWidth,
                        height: 4,
                        backgroundColor: '#22c55e'
                      }}
                    />
                    <div
                      className="absolute top-3 opacity-20 rounded"
                      style={{
                        left: 200 + activity.lateStart * dayWidth,
                        width: (activity.lateFinish - activity.lateStart) * dayWidth,
                        height: 4,
                        backgroundColor: '#ef4444'
                      }}
                    />
                  </>
                )}
              </div>
            </div>
          );
        })}

        {/* Today line */}
        {(() => {
          const today = new Date();
          const pos = getPosition(today);
          if (pos > 0) {
            return (
              <div
                className="absolute top-0 bottom-0 w-0.5 z-20"
                style={{
                  left: pos + 200,
                  backgroundColor: '#ef4444'
                }}
              >
                <div className="absolute -top-1 -translate-x-1/2 px-1 py-0.5 rounded text-xs font-medium text-white" style={{ backgroundColor: '#ef4444' }}>
                  Today
                </div>
              </div>
            );
          }
          return null;
        })()}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 p-3 border-t" style={{ borderColor: '#e5e5e5', backgroundColor: '#fafafa' }}>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded" style={{ backgroundColor: '#22c55e' }} />
          <span className="text-xs" style={{ color: '#525252' }}>On Track</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded" style={{ backgroundColor: '#a855f7' }} />
          <span className="text-xs" style={{ color: '#525252' }}>Milestone</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded" style={{ backgroundColor: '#ef4444' }} />
          <span className="text-xs" style={{ color: '#525252' }}>Critical Path</span>
        </div>
        <div className="ml-auto text-xs" style={{ color: '#737373' }}>
          Total: {ganttData.totalDurationDays} days
        </div>
      </div>
    </div>
  );
}