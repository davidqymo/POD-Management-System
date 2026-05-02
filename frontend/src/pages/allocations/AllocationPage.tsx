import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listAllocations,
  createBulkAllocations,
  CreateBulkAllocationRequest,
} from '@/api/allocations';
import { projectsApi, Project } from '@/api/projects';
import AllocationModal from '@/components/allocation/AllocationModal';
import { getResources } from '@/api/resources';
import { ratesApi } from '@/api/rates';
import { formatHcm } from '@/utils/hcm';

// Format HCM label (YYYYMM -> "Mon YY")
function formatHcmLabel(hcm: number): string {
  if (!hcm) return '—';
  const hcmStr = hcm.toString();
  if (hcmStr.length !== 6) return '—';
  const year = parseInt(hcmStr.substring(0, 4));
  const month = parseInt(hcmStr.substring(4, 6));
  if (month < 1 || month > 12) return '—';
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[month - 1]} ${year.toString().slice(-2)}`;
}

// Generate fiscal year months (Dec previous year to Nov current year)
function generateFiscalYearMonths(): number[] {
  const months: number[] = [];
  const now = new Date();
  const currentYear = now.getFullYear();

  for (let i = 0; i < 12; i++) {
    const monthIndex = (i + 11) % 12;
    const year = i === 0 ? currentYear - 1 : currentYear;
    const hcm = year * 100 + (monthIndex + 1);
    months.push(hcm);
  }
  return months;
}

interface MonthHours {
  hcm: number;
  label: string;
  hours: number;
}

interface CreateAllocationForm {
  resourceId: number | null;
  projectId: number | null;
  months: MonthHours[];
  notes: string;
}

export default function AllocationPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [resourceFilter, setResourceFilter] = useState<string>('');
  const [projectFilter, setProjectFilter] = useState<string>('');
  const [displayUnit, setDisplayUnit] = useState<'HCM' | 'USD'>('HCM');

  const { data: allocations = [], isLoading } = useQuery({
    queryKey: ['allocations'],
    queryFn: () => listAllocations(),
  });

  const { data: projectsData } = useQuery({
    queryKey: ['projects', 'all'],
    queryFn: () => projectsApi.list({ page: 0, size: 100 }),
  });
  const projects: Project[] = projectsData?.data?.content || [];

  const { data: resourcesData } = useQuery({
    queryKey: ['resources', 'all'],
    queryFn: () => getResources({ page: 0, size: 200 }),
  });
  const resources = (resourcesData as any)?.content || [];

  // Fetch all rates for USD conversion
  const { data: rates = [] } = useQuery({
    queryKey: ['rates'],
    queryFn: () => ratesApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: async (form: CreateAllocationForm) => {
      if (!form.resourceId || !form.projectId) {
        throw new Error('Resource and project are required');
      }
      // Filter months with hours > 0
      const allocations = form.months
        .filter(m => m.hours > 0)
        .map(m => ({ hcm: m.hcm, hours: m.hours }));

      if (allocations.length === 0) {
        throw new Error('At least one month must have hours allocated');
      }

      const request: CreateBulkAllocationRequest = {
        resourceId: form.resourceId,
        projectId: form.projectId,
        allocations,
        notes: form.notes || undefined,
      };
      return createBulkAllocations(request);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allocations'] });
      setModalOpen(false);
    },
  });

  // Filter allocations by resource and project
  const filteredAllocations = allocations.filter((alloc: any) => {
    const matchResource = !resourceFilter || alloc.resourceId === Number(resourceFilter);
    const matchProject = !projectFilter || alloc.projectId === Number(projectFilter);
    return matchResource && matchProject;
  });

  // Convert hours to USD based on rate for resource's cost center + team
  const hoursToUsd = (hours: number, resourceId: number): number => {
    const resource = resources.find((r: any) => r.id === resourceId);
    if (!resource) return 0;

    // Find rate for this cost center + team
    const rate = rates.find((r: any) =>
      r.costCenterId === resource.costCenterId && r.billableTeamCode === resource.billableTeamCode
    );
    if (!rate) return 0;

    // HCM * monthlyRateK * 1000 = USD (since rate is in K USD)
    const hcm = hours / 144;
    return hcm * Number(rate.monthlyRateK) * 1000;
  };

  // Format value based on display unit
  const formatValue = (hours: number, resourceId: number): string => {
    if (displayUnit === 'HCM') {
      return formatHcm(hours);
    } else {
      const usd = hoursToUsd(hours, resourceId);
      return `$${usd.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Allocations</h1>
          <p className="text-sm mt-1 text-gray-500">
            {displayUnit === 'HCM' ? 'Unit: HCM' : 'Unit: USD'} | {filteredAllocations.length} allocation{filteredAllocations.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex rounded-lg overflow-hidden border border-gray-300">
            <button
              onClick={() => setDisplayUnit('HCM')}
              className={`px-3 py-1.5 text-sm font-medium ${
                displayUnit === 'HCM' ? 'bg-teal-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              HCM
            </button>
            <button
              onClick={() => setDisplayUnit('USD')}
              className={`px-3 py-1.5 text-sm font-medium ${
                displayUnit === 'USD' ? 'bg-teal-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              USD
            </button>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white"
            style={{
              background: 'linear-gradient(135deg, #209d9d 0%, #0D4F4F 100%)',
              boxShadow: '0 2px 8px rgba(32, 158, 157, 0.25)'
            }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Allocation
          </button>
        </div>
      </div>

      {/* Filter Bar - Enhanced */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <label className="text-sm font-medium text-gray-600">Resource</label>
            <select
              value={resourceFilter}
              onChange={(e) => setResourceFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all min-w-[160px]"
            >
              <option value="">All Resources</option>
              {resources.map((resource: any) => (
                <option key={resource.id} value={resource.id}>
                  {resource.name}
                </option>
              ))}
            </select>
          </div>
          <div className="w-px h-6 bg-gray-200" />
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <label className="text-sm font-medium text-gray-600">Project</label>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all min-w-[160px]"
            >
              <option value="">All Projects</option>
              {projects.map((project: any) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
          {(resourceFilter || projectFilter) && (
            <button
              onClick={() => { setResourceFilter(''); setProjectFilter(''); }}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-teal-600 bg-teal-50 rounded-full hover:bg-teal-100 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear Filter
            </button>
          )}
        </div>
      </div>

      {/* Allocation Grid - Horizontal View */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
        </div>
      ) : filteredAllocations.length === 0 ? (
        <div className="p-8 text-center text-gray-500 rounded-lg border border-gray-200">No allocations found.</div>
      ) : (
        <div className="overflow-x-auto">
          {(() => {
            // Use full fiscal year (12 months) as columns
            const allHcms = generateFiscalYearMonths();

            // View: project-filtered → resources as rows under one project
            if (projectFilter) {
              const projectName = filteredAllocations[0]?.projectName || 'Unknown';

              // Group by resource
              const resourceData: Record<number, { hcm: number; hours: number }[]> = {};
              filteredAllocations.forEach((alloc: any) => {
                if (!resourceData[alloc.resourceId]) resourceData[alloc.resourceId] = [];
                resourceData[alloc.resourceId].push({ hcm: alloc.hcm, hours: alloc.hours });
              });

              const resourceIds = Object.keys(resourceData).map(Number).sort();

              // Calculate column totals
              const columnTotals: Record<number, number> = {};
              allHcms.forEach(hcm => columnTotals[hcm] = 0);

              return (
                <div className="rounded-lg border border-gray-200 overflow-hidden">
                  <div className="bg-blue-50 px-4 py-3 border-b border-gray-200">
                    <span className="text-sm font-semibold text-gray-900">{projectName}</span>
                  </div>
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase w-40">Resource</th>
                        {allHcms.map(hcm => (
                          <th key={hcm} className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase min-w-[80px]">
                            {formatHcmLabel(hcm)}
                          </th>
                        ))}
                        <th className="px-4 py-2 text-right text-xs font-bold text-gray-700 uppercase w-24">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {resourceIds.map(resourceId => {
                        const allocList = resourceData[resourceId];
                        const resourceName = filteredAllocations.find((a: any) => a.resourceId === resourceId)?.resourceName || 'Unknown';
                        let rowTotal = 0;
                        allocList.forEach(a => {
                          rowTotal += a.hours;
                          if (columnTotals[a.hcm] !== undefined) columnTotals[a.hcm] += a.hours;
                        });
                        return (
                          <tr key={resourceId} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm text-gray-900 font-medium">{resourceName}</td>
                            {allHcms.map(hcm => {
                              const alloc = allocList.find(a => a.hcm === hcm);
                              return (
                                <td key={hcm} className="px-3 py-2 text-center text-sm">
                                  {alloc ? <span className="font-medium text-gray-900">{formatValue(alloc.hours, resourceId)}</span> : <span className="text-gray-300">—</span>}
                                </td>
                              );
                            })}
                            <td className="px-4 py-2 text-right text-sm font-bold text-gray-900">{formatValue(rowTotal, resourceId)}</td>
                          </tr>
                        );
                      })}
                      <tr className="bg-gray-100 font-semibold">
                        <td className="px-4 py-2 text-sm text-gray-900">Total</td>
                        {allHcms.map(hcm => (
                          <td key={hcm} className="px-3 py-2 text-center text-sm text-gray-900">
                            {columnTotals[hcm] > 0 ? formatHcm(columnTotals[hcm]) : '—'}
                          </td>
                        ))}
                        <td className="px-4 py-2 text-right text-sm text-gray-900">
                          {formatHcm(Object.values(columnTotals).reduce((s, v) => s + v, 0))}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            }

            // View: resource-filtered → projects as rows under one resource
            if (resourceFilter) {
              const resourceName = filteredAllocations[0]?.resourceName || 'Unknown';

              // Group by project
              const projectData: Record<number, { hcm: number; hours: number }[]> = {};
              filteredAllocations.forEach((alloc: any) => {
                if (!projectData[alloc.projectId]) projectData[alloc.projectId] = [];
                projectData[alloc.projectId].push({ hcm: alloc.hcm, hours: alloc.hours });
              });

              const projectIds = Object.keys(projectData).map(Number).sort();

              // Calculate column totals
              const columnTotals: Record<number, number> = {};
              allHcms.forEach(hcm => columnTotals[hcm] = 0);

              return (
                <div className="rounded-lg border border-gray-200 overflow-hidden">
                  <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
                    <span className="text-sm font-semibold text-gray-900">{resourceName}</span>
                  </div>
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase w-40">Project</th>
                        {allHcms.map(hcm => (
                          <th key={hcm} className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase min-w-[80px]">
                            {formatHcmLabel(hcm)}
                          </th>
                        ))}
                        <th className="px-4 py-2 text-right text-xs font-bold text-gray-700 uppercase w-24">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {projectIds.map(projectId => {
                        const allocList = projectData[projectId];
                        const projectName = filteredAllocations.find((a: any) => a.projectId === projectId)?.projectName || 'Unknown';
                        let rowTotal = 0;
                        allocList.forEach(a => {
                          rowTotal += a.hours;
                          if (columnTotals[a.hcm] !== undefined) columnTotals[a.hcm] += a.hours;
                        });
                        return (
                          <tr key={projectId} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm text-gray-900 font-medium">{projectName}</td>
                            {allHcms.map(hcm => {
                              const alloc = allocList.find(a => a.hcm === hcm);
                              return (
                                <td key={hcm} className="px-3 py-2 text-center text-sm">
                                  {alloc ? <span className="font-medium text-gray-900">{formatValue(alloc.hours, Number(resourceFilter))}</span> : <span className="text-gray-300">—</span>}
                                </td>
                              );
                            })}
                            <td className="px-4 py-2 text-right text-sm font-bold text-gray-900">{formatValue(rowTotal, Number(resourceFilter))}</td>
                          </tr>
                        );
                      })}
                      <tr className="bg-gray-100 font-semibold">
                        <td className="px-4 py-2 text-sm text-gray-900">Total</td>
                        {allHcms.map(hcm => (
                          <td key={hcm} className="px-3 py-2 text-center text-sm text-gray-900">
                            {columnTotals[hcm] > 0 ? formatHcm(columnTotals[hcm]) : '—'}
                          </td>
                        ))}
                        <td className="px-4 py-2 text-right text-sm text-gray-900">
                          {formatHcm(Object.values(columnTotals).reduce((s, v) => s + v, 0))}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            }

            // Default: resources with nested projects
            type ProjectData = { hcm: number; hours: number }[];
            type ResourceData = Record<number, ProjectData>;
            const gridData: Record<number, ResourceData> = {};

            filteredAllocations.forEach((alloc: any) => {
              if (!gridData[alloc.resourceId]) gridData[alloc.resourceId] = {};
              if (!gridData[alloc.resourceId][alloc.projectId]) gridData[alloc.resourceId][alloc.projectId] = [];
              gridData[alloc.resourceId][alloc.projectId].push({ hcm: alloc.hcm, hours: alloc.hours });
            });

            const resourceIds = Object.keys(gridData).map(Number).sort();
            const projectIds = [...new Set(filteredAllocations.map((a: any) => a.projectId))].sort();

            return (
              <div className="space-y-4">
                {resourceIds.map(resourceId => {
                  const resourceName = filteredAllocations.find((a: any) => a.resourceId === resourceId)?.resourceName || 'Unknown';
                  const projectData = gridData[resourceId];
                  let resourceTotal = 0;
                  Object.values(projectData).forEach((projs: any) => { projs.forEach((item: any) => { resourceTotal += item.hours; }); });

                  return (
                    <div key={resourceId} className="rounded-lg border border-gray-200 overflow-hidden">
                      <div className="bg-gray-100 px-4 py-3 flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-900">{resourceName}</span>
                        <span className="text-sm font-bold text-gray-900">{formatValue(resourceTotal, Number(resourceId))}</span>
                      </div>
                      <table className="min-w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase w-40">Project</th>
                            {allHcms.map(hcm => (
                              <th key={hcm} className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase min-w-[80px]">
                                {formatHcmLabel(hcm)}
                              </th>
                            ))}
                            <th className="px-4 py-2 text-right text-xs font-bold text-gray-700 uppercase w-24">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {projectIds.map(projectId => {
                            const projectName = filteredAllocations.find((a: any) => a.projectId === projectId)?.projectName || 'Unknown';
                            const projectAllocs = projectData[projectId] || [];
                            if (!projectAllocs.length) return null;
                            const projectTotal = projectAllocs.reduce((sum: number, a) => sum + a.hours, 0);
                            return (
                              <tr key={projectId} className="hover:bg-gray-50">
                                <td className="px-4 py-2 text-sm text-gray-900 font-medium">{projectName}</td>
                                {allHcms.map(hcm => {
                                  const alloc = projectAllocs.find((a: any) => a.hcm === hcm);
                                  return (
                                    <td key={hcm} className="px-3 py-2 text-center text-sm">
                                      {alloc ? <span className="font-medium text-gray-900">{formatValue(alloc.hours, resourceId)}</span> : <span className="text-gray-300">—</span>}
                                    </td>
                                  );
                                })}
                                <td className="px-4 py-2 text-right text-sm font-bold text-gray-900">{formatValue(projectTotal, resourceId)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* Create Modal */}
      <AllocationModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={async (form) => {
          // Convert HCM form to API format (hours)
          const apiForm = {
            resourceId: form.resourceId,
            projectId: form.projectId,
            notes: form.notes,
            months: form.months.map(m => ({
              hcm: m.hcm,
              hours: m.hcmValue * 144,  // Convert HCM to hours
            })),
          };
          await createMutation.mutateAsync(apiForm as any);
        }}
        resources={resources}
        projects={projects}
      />
    </div>
  );
}
