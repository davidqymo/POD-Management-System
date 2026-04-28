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
import AllocationList from '@/components/allocation/AllocationList';
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

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Allocations</h1>
          <p className="text-sm mt-1 text-gray-500">
            {allocations.length} allocation{allocations.length !== 1 ? 's' : ''} found
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

      {/* Approval Panel */}
      <AllocationApprovalPanel
        allocations={allocations}
        loading={isLoading}
        onApprove={handleApprove}
        onReject={handleReject}
        currentUserId={currentUserId}
      />

      {/* Allocation List */}
      <AllocationList
        allocations={allocations}
        loading={isLoading}
      />

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
