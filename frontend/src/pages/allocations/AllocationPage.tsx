import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listAllocations,
  createAllocation,
  approveAllocation,
  rejectAllocation,
  CreateAllocationRequest,
  ApproveAllocationRequest
} from '@/api/allocations';
import { projectsApi, Project } from '@/api/projects';
import AllocationModal from '@/components/allocation/AllocationModal';
import AllocationApprovalPanel from '@/components/allocation/AllocationApprovalPanel';
import { getResources } from '@/api/resources';

interface CreateAllocationForm {
  resourceId: number | null;
  projectId: number | null;
  weekStartDate: string;
  hours: string;
  notes: string;
}

export default function AllocationPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [currentUserId] = useState(1);
  const [resourceFilter, setResourceFilter] = useState<string>('');
  const [projectFilter, setProjectFilter] = useState<string>('');

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

  const createMutation = useMutation({
    mutationFn: async (form: CreateAllocationForm) => {
      if (!form.resourceId || !form.projectId) {
        throw new Error('Resource and project are required');
      }
      const request: CreateAllocationRequest = {
        resourceId: form.resourceId,
        projectId: form.projectId,
        weekStart: form.weekStartDate,
        hours: parseFloat(form.hours),
        notes: form.notes || undefined,
      };
      return createAllocation(request);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allocations'] });
      setModalOpen(false);
    },
  });

  const approveMutation = useMutation({
    mutationFn: (request: ApproveAllocationRequest) => approveAllocation(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allocations'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (request: ApproveAllocationRequest) => rejectAllocation(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allocations'] });
    },
  });

  const handleApprove = async (request: ApproveAllocationRequest) => {
    await approveMutation.mutateAsync(request);
  };

  const handleReject = async (request: ApproveAllocationRequest) => {
    await rejectMutation.mutateAsync(request);
  };

  // Filter allocations by resource and project
  const filteredAllocations = allocations.filter((alloc: any) => {
    const matchResource = !resourceFilter || alloc.resourceId === Number(resourceFilter);
    const matchProject = !projectFilter || alloc.projectId === Number(projectFilter);
    return matchResource && matchProject;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Allocations</h1>
          <p className="text-sm mt-1 text-gray-500">
            {filteredAllocations.length} allocation{filteredAllocations.length !== 1 ? 's' : ''} found
          </p>
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

      {/* Filter Bar */}
      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Resource:</label>
          <select
            value={resourceFilter}
            onChange={(e) => setResourceFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Resources</option>
            {resources.map((resource: any) => (
              <option key={resource.id} value={resource.id}>
                {resource.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Project:</label>
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
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
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            Clear Filter
          </button>
        )}
      </div>

      {/* Approval Panel */}
      <AllocationApprovalPanel
        allocations={filteredAllocations}
        loading={isLoading}
        onApprove={handleApprove}
        onReject={handleReject}
        currentUserId={currentUserId}
      />

      {/* Allocation List - Hierarchical View */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
        </div>
      ) : filteredAllocations.length === 0 ? (
        <div className="p-8 text-center text-gray-500 rounded-lg border border-gray-200">No allocations found.</div>
      ) : (
        <div className="space-y-4">
          {/* Group allocations by resource + project */}
          {(() => {
            // Group allocations by resourceId
            type ProjectGroup = { projectAllocs: any[]; activityAllocs: any[] };
            type ResourceGroup = Record<number, ProjectGroup>;
            const resourceGroups: Record<number, ResourceGroup> = {};
            filteredAllocations.forEach((alloc: any) => {
              if (!resourceGroups[alloc.resourceId]) {
                resourceGroups[alloc.resourceId] = {};
              }
              if (!resourceGroups[alloc.resourceId][alloc.projectId]) {
                resourceGroups[alloc.resourceId][alloc.projectId] = { projectAllocs: [], activityAllocs: [] };
              }
              if (!alloc.activityId) {
                resourceGroups[alloc.resourceId][alloc.projectId].projectAllocs.push(alloc);
              } else {
                resourceGroups[alloc.resourceId][alloc.projectId].activityAllocs.push(alloc);
              }
            });

            return Object.entries(resourceGroups).map(([resourceId, projectGroups]) => {
              const firstProjectGroup = Object.values(projectGroups)[0] as ProjectGroup | undefined;
              const resourceName = firstProjectGroup?.projectAllocs[0]?.resourceName ||
                                   firstProjectGroup?.activityAllocs[0]?.resourceName || 'Unknown';

              return (
                <div key={resourceId} className="rounded-lg border border-gray-200 overflow-hidden">
                  {/* Resource Header */}
                  <div className="bg-gray-100 px-4 py-3">
                    <span className="text-sm font-semibold text-gray-900">{resourceName}</span>
                  </div>

                  {Object.entries(projectGroups).map(([projectId, groups]) => {
                    const projectAllocs = (groups as ProjectGroup).projectAllocs;
                    const activityAllocs = (groups as ProjectGroup).activityAllocs;
                    const projectName = projectAllocs[0]?.projectName || activityAllocs[0]?.projectName || 'Unknown Project';
                    const totalProjectHours = projectAllocs.reduce((sum: number, a: any) => sum + (a.hours || 0), 0);
                    const totalActivityHours = activityAllocs.reduce((sum: number, a: any) => sum + (a.hours || 0), 0);

                    return (
                      <div key={projectId} className="border-t border-gray-200">
                        {/* Project Level Header */}
                        <div className="bg-blue-50 px-4 py-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-gray-900">{projectName}</span>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-gray-600">Total: <span className="font-medium text-blue-700">{totalProjectHours}h</span></span>
                            <span className="text-gray-400">|</span>
                            <span className="text-gray-600">Activities: <span className="font-medium text-purple-700">{totalActivityHours}h</span></span>
                            <span className="text-gray-400">|</span>
                            <span className={`font-medium ${totalProjectHours - totalActivityHours >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {totalProjectHours - totalActivityHours}h
                            </span>
                          </div>
                        </div>

                        {/* Project-level allocations */}
                        {projectAllocs.length > 0 && (
                          <table className="min-w-full">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Week</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Hours</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {projectAllocs.map((alloc: any) => (
                                <tr key={alloc.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-2 text-sm text-gray-600">{alloc.weekStartDate}</td>
                                  <td className="px-4 py-2 text-sm font-medium text-gray-900">{alloc.hours}h</td>
                                  <td className="px-4 py-2">
                                    <span className={`px-2 py-0.5 text-xs rounded-full ${alloc.status === 'APPROVED' ? 'bg-green-100 text-green-800' : alloc.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                                      {alloc.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}

                        {/* Activity-level allocations */}
                        {activityAllocs.length > 0 && (
                          <div className="border-t border-gray-100">
                            <table className="min-w-full">
                              <tbody className="divide-y divide-gray-100">
                                {activityAllocs.map((alloc: any) => (
                                  <tr key={alloc.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-2 text-sm text-gray-500">{alloc.activityName || '—'}</td>
                                    <td className="px-4 py-2 text-sm text-gray-600">{alloc.weekStartDate}</td>
                                    <td className="px-4 py-2 text-sm font-medium text-gray-900">{alloc.hours}h</td>
                                    <td className="px-4 py-2">
                                      <span className={`px-2 py-0.5 text-xs rounded-full ${alloc.status === 'APPROVED' ? 'bg-green-100 text-green-800' : alloc.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                                        {alloc.status}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {totalActivityHours > totalProjectHours && (
                          <div className="px-4 py-2 bg-red-50 border-t border-red-100 text-xs text-red-700">
                            ⚠️ Warning: Activity allocations exceed project-level allocation by {totalActivityHours - totalProjectHours}h
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            });
          })()}
        </div>
      )}

      {/* Create Modal */}
      <AllocationModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={async (form) => {
          await createMutation.mutateAsync(form);
        }}
        resources={resources}
        projects={projects}
      />
    </div>
  );
}
