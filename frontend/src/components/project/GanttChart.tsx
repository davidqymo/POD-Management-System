import { useEffect, useRef } from 'react';
import { Gantt, Task, Link } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import { GanttData } from '../../api/projects';

interface GanttChartProps {
  data: GanttData;
}

export function GanttChart({ data }: GanttChartProps) {
  const tasks: Task[] = data.activities.map((activity) => ({
    id: String(activity.id),
    name: activity.name,
    start: activity.startDate ? new Date(activity.startDate) : new Date(),
    end: activity.endDate ? new Date(activity.endDate) : new Date(),
    progress: 0,
    type: 'task',
    dependencies: data.links
      .filter((link) => link.to === activity.id)
      .map((link) => String(link.from)),
    styles: activity.isCritical
      ? { backgroundColor: '#fecaca', borderColor: '#dc2626' }
      : undefined,
  }));

  const links: Link[] = data.links.map((link) => ({
    id: `${link.from}-${link.to}`,
    source: String(link.from),
    target: String(link.to),
    type: 'task' as const,
  }));

  if (tasks.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No activities yet. Add activities to see the Gantt chart.
      </div>
    );
  }

  return (
    <div className="gantt-container">
      <Gantt
        tasks={tasks}
        links={links}
        onDateChange={() => {}}
        onProgressChange={() => {}}
        onViewChange={() => {}}
        viewMode="Week"
      />
      {data.criticalPath.length > 0 && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
          <span className="text-sm text-red-700">
            Critical Path: {data.criticalPath.length} activities ({data.totalDurationDays} days)
          </span>
        </div>
      )}
    </div>
  );
}
