import { useState, useMemo } from 'react';
import type { Allocation } from '@/api/allocations';

interface AllocationListProps {
  allocations: Allocation[];
  loading?: boolean;
  resourceId?: number;
  onUpdateAllocation?: (id: number, hours: number) => Promise<void>;
  onDeleteAllocation?: (id: number) => Promise<void>;
  onCreateAllocation?: (resourceId: number, projectName: string, hcm: number, hours: number) => Promise<void>;
  displayMode?: 'hcm' | 'usd';
  onDisplayModeChange?: (mode: 'hcm' | 'usd') => void;
  ratePerHcm?: number;
}

// Generate fiscal year months (Dec previous year to Nov current year)
function generateFiscalYearMonths(): { hcm: number; label: string }[] {
  const months: { hcm: number; label: string }[] = [];
  const now = new Date();
  const currentYear = now.getFullYear();
  const monthNames = ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];

  for (let i = 0; i < 12; i++) {
    const monthIndex = (i + 11) % 12; // Start from Dec (11)
    const year = i < 1 ? currentYear - 1 : currentYear;
    const hcm = year * 100 + (monthIndex + 1);
    months.push({ hcm, label: `${monthNames[monthIndex]} ${year}` });
  }

  return months;
}

export default function AllocationList({
  allocations,
  loading,
  resourceId,
  onUpdateAllocation,
  onDeleteAllocation,
  onCreateAllocation,
  displayMode = 'hcm',
  onDisplayModeChange,
  ratePerHcm = 0,
}: AllocationListProps) {
  const [projectFilter, setProjectFilter] = useState<string>('');
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [editHours, setEditHours] = useState<string>('');
  const fiscalMonths = useMemo(() => generateFiscalYearMonths(), []);

  // Get current HCM to determine editable months (previous month is always protected)
  const currentHcm = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    // Previous month (protect previous month even if almost over)
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    return prevYear * 100 + prevMonth;
  }, []);

  // Group allocations by project
  const projectsData = useMemo(() => {
    const groups: Record<string, { hoursByHcm: Record<number, number>; totalHours: number; allocationIds: number[] }> = {};

    allocations.forEach((a) => {
      if (!groups[a.projectName]) {
        groups[a.projectName] = { hoursByHcm: {}, totalHours: 0, allocationIds: [] };
      }
      const hcm = a.hcm;
      groups[a.projectName].hoursByHcm[hcm] = (groups[a.projectName].hoursByHcm[hcm] || 0) + a.hours;
      groups[a.projectName].totalHours += a.hours;
      groups[a.projectName].allocationIds.push(a.id);
    });

    return Object.entries(groups).map(([projectName, data]) => ({
      projectName,
      ...data,
    }));
  }, [allocations]);

  // Get allocation for specific project/month
  const getAllocation = (projectName: string, hcm: number): Allocation | undefined => {
    return allocations.find(a => a.projectName === projectName && a.hcm === hcm);
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading allocations...</div>;
  }

  if (allocations.length === 0) {
    return <div className="p-8 text-center text-gray-500">No allocations found</div>;
  }

  // Filter projects
  const filteredProjects = projectFilter
    ? projectsData.filter(p => p.projectName === projectFilter)
    : projectsData;

  return (
    <div className="w-full">
      {/* Controls */}
      <div className="flex items-center justify-between mb-4 bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-200 transition-all outline-none"
        >
          <option value="">All Projects</option>
          {projectsData.map((p) => (
            <option key={p.projectName} value={p.projectName}>
              {p.projectName}
            </option>
          ))}
        </select>
        {onDisplayModeChange && (
          <div className="flex rounded-lg overflow-hidden border border-gray-200 shadow-sm">
            <button
              onClick={() => onDisplayModeChange('hcm')}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wide transition-all duration-200"
              style={{
                backgroundColor: displayMode === 'hcm' ? '#059669' : '#f9fafb',
                color: displayMode === 'hcm' ? 'white' : '#6b7280',
                boxShadow: displayMode === 'hcm' ? 'inset 0 2px 4px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              HCM
            </button>
            <button
              onClick={() => onDisplayModeChange('usd')}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wide transition-all duration-200"
              style={{
                backgroundColor: displayMode === 'usd' ? '#059669' : '#f9fafb',
                color: displayMode === 'usd' ? 'white' : '#6b7280',
                boxShadow: displayMode === 'usd' ? 'inset 0 2px 4px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              USD
            </button>
          </div>
        )}
      </div>

      {/* Single Table - Project vs Months */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
        <table className="w-full min-w-[900px]">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider sticky left-0 bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                Project
              </th>
              {fiscalMonths.map((month) => (
                <th
                  key={month.hcm}
                  className="px-2 py-3 text-center text-xs font-semibold text-gray-500 min-w-[60px] border-b-2 border-gray-200"
                >
                  {month.label.substring(0, 3)}
                </th>
              ))}
              <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 bg-gray-100 sticky right-0 min-w-[80px] border-b-2 border-gray-200">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {filteredProjects.map((project, idx) => (
              <tr key={project.projectName} className={`hover:bg-emerald-50/50 transition-colors duration-150 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                <td className="px-4 py-3 text-sm font-semibold text-gray-800 sticky left-0 bg-inherit border-r border-gray-100">
                  {project.projectName}
                </td>
                {fiscalMonths.map((month) => {
                  const hours = project.hoursByHcm[month.hcm] || 0;
                  const alloc = getAllocation(project.projectName, month.hcm);
                  const isEditable = month.hcm > currentHcm;
                  const isEditing = editingId === (alloc?.id || project.projectName + '-' + month.hcm);

                  const handleSave = async () => {
                    const hoursValue = Number.parseFloat(editHours) * 144;
                    if (hoursValue <= 0) return;

                    if (alloc && onUpdateAllocation) {
                      // Update existing allocation
                      await onUpdateAllocation(alloc.id, hoursValue);
                    } else if (!alloc && onCreateAllocation && resourceId) {
                      // Create new allocation
                      await onCreateAllocation(resourceId, project.projectName, month.hcm, hoursValue);
                    }
                    setEditingId(null);
                  };

                  const handleDelete = async () => {
                    if (!alloc || !onDeleteAllocation) return;
                    if (confirm('Are you sure you want to delete this allocation?')) {
                      await onDeleteAllocation(alloc.id);
                    }
                  };

                  return (
                    <td
                      key={month.hcm}
                      className="px-1 py-3 text-center border-r border-gray-100"
                    >
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            value={editHours}
                            onChange={(e) => setEditHours(e.target.value)}
                            className="w-14 px-2 py-1 text-xs border-2 border-emerald-300 rounded-md focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none font-mono font-medium"
                            step="0.1"
                            min="0"
                            max="1"
                            autoFocus
                          />
                          <button onClick={handleSave} className="w-6 h-6 flex items-center justify-center rounded-full bg-emerald-500 text-white hover:bg-emerald-600 hover:scale-110 transition-all duration-150" title="Save">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          {onDeleteAllocation && (
                            <button onClick={handleDelete} className="w-6 h-6 flex items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-100 hover:scale-110 transition-all duration-150" title="Delete">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                          <button onClick={() => setEditingId(null)} className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:scale-110 transition-all duration-150" title="Cancel">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ) : hours === 0 ? (
                        <div className="flex items-center justify-center">
                          {isEditable ? (
                            <button
                              onClick={() => {
                                setEditHours('0');
                                setEditingId(project.projectName + '-' + month.hcm);
                              }}
                              className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:scale-110 transition-all duration-150 font-semibold text-sm shadow-sm"
                              title="Add allocation"
                            >
                              +
                            </button>
                          ) : (
                            <span className="text-gray-300 text-xs font-medium">0</span>
                          )}
                        </div>
                      ) : (
                        displayMode === 'usd' ? (
                          <div className="flex flex-col items-center justify-center gap-1">
                            <span className={`text-xs font-mono font-semibold ${isEditable ? 'text-emerald-700' : 'text-gray-700'}`}>
                              ${((hours / 144) * ratePerHcm).toFixed(1)}K
                            </span>
                            {isEditable && alloc && (
                              <button
                                onClick={() => {
                                  setEditHours((hours / 144).toFixed(2));
                                  setEditingId(alloc.id);
                                }}
                                className="w-5 h-5 flex items-center justify-center rounded bg-gray-100 text-gray-500 hover:bg-amber-100 hover:text-amber-600 hover:scale-110 transition-all duration-150"
                                title="Edit allocation"
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-1">
                            <span className={`text-xs font-mono font-semibold ${isEditable ? 'text-emerald-700' : 'text-gray-700'}`}>
                              {(hours / 144).toFixed(1)} HCM
                            </span>
                            {isEditable && alloc && (
                              <button
                                onClick={() => {
                                  setEditHours((hours / 144).toFixed(2));
                                  setEditingId(alloc.id);
                                }}
                                className="w-5 h-5 flex items-center justify-center rounded bg-gray-100 text-gray-500 hover:bg-amber-100 hover:text-amber-600 hover:scale-110 transition-all duration-150"
                                title="Edit allocation"
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                            )}
                          </div>
                        )
                      )}
                    </td>
                  );
                })}
                <td className="px-4 py-3 text-center text-sm font-bold text-emerald-700 sticky right-0 bg-gray-50/80 border-l border-gray-200">
                  {displayMode === 'usd'
                    ? `$${((project.totalHours / 144) * ratePerHcm).toFixed(1)}K`
                    : `${(project.totalHours / 144).toFixed(1)} HCM`
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}