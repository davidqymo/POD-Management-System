import { useState, useEffect, useMemo } from 'react';
import { projectsApi, GanttData } from '../../api/projects';

interface GanttChartProps {
  projectId: number;
  onActivityClick?: (activityId: number) => void;
}

// Helper to get the Monday of a week
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  return new Date(d.setDate(diff));
}

// Helper to get week number from start date
function getWeekDiff(date: Date, startDate: Date): number {
  const weekStart = getWeekStart(date);
  const startWeekStart = getWeekStart(startDate);
  return Math.floor((weekStart.getTime() - startWeekStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
}

export function GanttChart({ projectId, onActivityClick }: GanttChartProps) {
  const [ganttData, setGanttData] = useState<GanttData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

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

  // Week-based dimensions
  const weekWidth = Math.max(40, Math.min(60, dimensions.width / 30));
  const rowHeight = 44;
  const headerHeight = 60;

  // Generate week range instead of day range
  const weekRangeInfo = useMemo(() => {
    if (!ganttData?.activities?.length) {
      return { weeks: [], startDate: null as Date | null, endDate: null as Date | null };
    }

    const dates = ganttData.activities.flatMap(a => [
      a.startDate ? new Date(a.startDate) : null,
      a.endDate ? new Date(a.endDate) : null
    ].filter(Boolean) as Date[]);

    if (dates.length === 0) return { weeks: [], startDate: null, endDate: null };

    const min = new Date(Math.min(...dates.map(d => d.getTime())));
    const max = new Date(Math.max(...dates.map(d => d.getTime())));

    // Get to Monday of the week
    const weekMin = getWeekStart(min);
    weekMin.setDate(weekMin.getDate() - 1); // Show previous week
    const weekMax = getWeekStart(max);
    weekMax.setDate(weekMax.getDate() + 5); // Show a few more weeks

    const weeks: Date[] = [];
    const curr = new Date(weekMin);
    while (curr <= weekMax) {
      weeks.push(new Date(curr));
      curr.setDate(curr.getDate() + 7);
    }

    return { weeks, startDate: weekMin, endDate: weekMax };
  }, [ganttData]);

  const { weeks, startDate } = weekRangeInfo;

  const getPosition = (date: Date) => {
    if (!startDate) return 0;
    return getWeekDiff(date, startDate) * weekWidth;
  };

  // Determine which weeks should show a month label (first week of each month)
  const getWeeksWithMonth = useMemo(() => {
    const result: { date: Date; label: string; weekNum: number }[] = [];
    let lastMonth = -1;
    let weekNum = 1;
    weeks.forEach((weekStart) => {
      const month = weekStart.getMonth();
      if (month !== lastMonth) {
        const label = weekStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        result.push({ date: weekStart, label, weekNum });
        lastMonth = month;
        weekNum = 1;
      } else {
        weekNum++;
      }
    });
    return result;
  }, [weeks]);

  const getBarWidth = (startDateStr?: string, endDateStr?: string) => {
    if (!startDateStr || !endDateStr) return weekWidth * 2;
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    const weeks = Math.ceil((end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
    return Math.max(weekWidth, weeks * weekWidth);
  };

  const getDurationWeeks = (startDateStr?: string, endDateStr?: string) => {
    if (!startDateStr || !endDateStr) return 0;
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    return Math.ceil((end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
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

  const chartWidth = weeks.length * weekWidth + 200;

  return (
    <div className="overflow-x-auto rounded-lg border" style={{ borderColor: '#e5e5e5', backgroundColor: '#ffffff' }}>
      {/* Header with dates */}
      <div className="flex sticky top-0 z-10" style={{ height: headerHeight, backgroundColor: '#fafafa' }}>
        <div className="flex items-center px-4 shrink-0" style={{ width: 200, borderRight: '1px solid #e5e5e5' }}>
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#525252' }}>Activity</span>
        </div>
        <div className="flex relative" style={{ width: chartWidth }}>
          {/* Month labels and week numbers */}
          {getWeeksWithMonth.map(({ date, label, weekNum }) => (
            <div
              key={label + weekNum}
              className="absolute text-xs"
              style={{
                left: getPosition(date) + 200,
                color: '#171717'
              }}
            >
              <div className="font-semibold">{label}</div>
              <div className="text-gray-400 mt-1">W{weekNum}</div>
            </div>
          ))}
          {/* Week tick marks */}
          {weeks.map((weekStart) => (
            <div
              key={weekStart.toISOString()}
              className="absolute top-8 bottom-0 w-px bg-gray-200"
              style={{ left: getPosition(weekStart) + 200 }}
            />
          ))}
        </div>
      </div>

      {/* Activities rows */}
      <div className="relative">
        {ganttData.activities.map((activity, index) => {
          const actStartDate = activity.startDate ? new Date(activity.startDate) : null;

          return (
            <div
              key={activity.id}
              className="flex items-center transition-colors hover:bg-gray-50"
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
                  <span className="text-sm font-medium truncate" style={{ color: '#171717' }}>
                    {activity.name}
                  </span>
                </div>
              </div>

              {/* Gantt bars */}
              <div className="relative" style={{ width: chartWidth, height: rowHeight }}>
                {actStartDate && (
                  <div
                    className="absolute top-2 rounded flex items-center px-2 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => onActivityClick?.(activity.id)}
                    style={{
                      left: getPosition(actStartDate),
                      width: getBarWidth(activity.startDate, activity.endDate),
                      height: rowHeight - 12,
                      backgroundColor: activity.isCritical ? '#fee2e2' : activity.isMilestone ? '#f3e8ff' : '#d1fae5',
                      borderLeft: `3px solid ${activity.isCritical ? '#ef4444' : activity.isMilestone ? '#a855f7' : '#22c55e'}`
                    }}
                  >
                    <span className="text-xs font-semibold truncate" style={{
                      color: activity.isCritical ? '#b91c1c' : activity.isMilestone ? '#7e22ce' : '#065f46'
                    }}>
                      {getDurationWeeks(activity.startDate, activity.endDate)}w
                    </span>
                  </div>
                )}

                {/* Early/Late bars (subtle) - convert days to weeks */}
                {activity.earlyStart !== activity.lateStart && (
                  <>
                    <div
                      className="absolute top-3 opacity-30 rounded"
                      style={{
                        left: 200 + Math.floor(activity.earlyStart / 7) * weekWidth,
                        width: Math.max(weekWidth, Math.floor((activity.earlyFinish - activity.earlyStart) / 7) * weekWidth),
                        height: 4,
                        backgroundColor: '#22c55e'
                      }}
                    />
                    <div
                      className="absolute top-3 opacity-20 rounded"
                      style={{
                        left: 200 + Math.floor(activity.lateStart / 7) * weekWidth,
                        width: Math.max(weekWidth, Math.floor((activity.lateFinish - activity.lateStart) / 7) * weekWidth),
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
                <div className="absolute -top-1 -translate-x-1/2 px-1 py-0.5 rounded text-xs font-semibold text-white" style={{ backgroundColor: '#ef4444' }}>
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
          <span className="text-xs font-medium" style={{ color: '#525252' }}>On Track</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded" style={{ backgroundColor: '#a855f7' }} />
          <span className="text-xs font-medium" style={{ color: '#525252' }}>Milestone</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded" style={{ backgroundColor: '#ef4444' }} />
          <span className="text-xs font-medium" style={{ color: '#525252' }}>Critical Path</span>
        </div>
        <div className="ml-auto text-xs font-medium" style={{ color: '#737373' }}>
          Total: {Math.ceil(ganttData.totalDurationDays / 7)} weeks
        </div>
      </div>
    </div>
  );
}