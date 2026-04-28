import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getResourceById, getResources, updateResource } from '../../api/resources';
import { listAllocations, createAllocation, approveAllocation, rejectAllocation, CreateAllocationRequest, ApproveAllocationRequest } from '@/api/allocations';
import { projectsApi } from '@/api/projects';
import AllocationList from '@/components/allocation/AllocationList';
import AllocationModal from '@/components/allocation/AllocationModal';
import AllocationApprovalPanel from '@/components/allocation/AllocationApprovalPanel';
import type { Resource } from '@/types';

type TabType = 'details' | 'assignments' | 'rate-history';

interface CreateAllocationForm {
  resourceId: number | null;
  projectId: number | null;
  weekStartDate: string;
  hours: string;
  notes: string;
}

export default function ResourceDetail() {
  const { id } = useParams<{ id: string }>();
  const resourceId = Number(id);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('assignments');
  const [modalOpen, setModalOpen] = useState(false);
  const [currentUserId] = useState(1);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    externalId: '',
    costCenterId: '',
    billableTeamCode: '',
    category: '',
    skill: '',
    level: 1,
    isBillable: true,
  });

  const { data: resource, isLoading: loadingResource } = useQuery({
    queryKey: ['resource', resourceId],
    queryFn: () => getResourceById(resourceId),
    enabled: !!resourceId,
  });

  const { data: allocations = [], isLoading: loadingAllocations } = useQuery({
    queryKey: ['allocations', 'resource', resourceId],
    queryFn: () => listAllocations({ resourceId }),
    enabled: !!resourceId,
  });

  const { data: projectsData } = useQuery({
    queryKey: ['projects', 'all'],
    queryFn: () => projectsApi.list({ page: 0, size: 100 }),
  });
  const projects = projectsData?.data?.content || [];

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

  const updateResourceMutation = useMutation({
    mutationFn: (data: { id: number; resource: Partial<Resource> }) =>
      updateResource(data.id, data.resource),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource', resourceId] });
      setEditMode(false);
    },
  });

  const handleApprove = async (request: ApproveAllocationRequest) => {
    await approveMutation.mutateAsync(request);
  };

  const handleReject = async (request: ApproveAllocationRequest) => {
    await rejectMutation.mutateAsync(request);
  };

  if (loadingResource) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="p-6 text-center text-gray-500">
        Resource not found
      </div>
    );
  }

  const tabs = [
    { id: 'details' as TabType, label: 'Details' },
    { id: 'assignments' as TabType, label: 'Assignments' },
    { id: 'rate-history' as TabType, label: 'Rate History' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a href="/resources" className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </a>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{resource.name}</h1>
            <p className="text-sm text-gray-500">ID: {resource.externalId}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Resource Details</h2>
            {!editMode ? (
              <button
                onClick={() => {
                  setEditForm({
                    name: resource.name || '',
                    externalId: resource.externalId || '',
                    costCenterId: resource.costCenterId || '',
                    billableTeamCode: resource.billableTeamCode || '',
                    category: resource.category || '',
                    skill: resource.skill || '',
                    level: resource.level || 1,
                    isBillable: resource.isBillable ?? true,
                  });
                  setEditMode(true);
                }}
                className="px-3 py-1.5 text-sm font-medium text-white rounded-lg"
                style={{ backgroundColor: '#209d9d' }}
              >
                Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setEditMode(false)}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => updateResourceMutation.mutate({ id: resourceId, resource: editForm as Partial<Resource> })}
                  disabled={updateResourceMutation.isPending}
                  className="px-3 py-1.5 text-sm font-medium text-white rounded-lg"
                  style={{ backgroundColor: '#209d9d', opacity: updateResourceMutation.isPending ? 0.5 : 1 }}
                >
                  {updateResourceMutation.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>

          {editMode ? (
            <div className="grid grid-cols-2 gap-6">
              <div className="p-4 rounded-lg border border-gray-200 bg-white shadow-sm space-y-4">
                <h3 className="text-sm font-semibold text-gray-500 mb-3">Basic Information</h3>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">External ID</label>
                  <input
                    type="text"
                    value={editForm.externalId}
                    onChange={(e) => setEditForm({ ...editForm, externalId: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Name</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Cost Center</label>
                  <input
                    type="text"
                    value={editForm.costCenterId}
                    onChange={(e) => setEditForm({ ...editForm, costCenterId: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Billable Team</label>
                  <input
                    type="text"
                    value={editForm.billableTeamCode}
                    onChange={(e) => setEditForm({ ...editForm, billableTeamCode: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="p-4 rounded-lg border border-gray-200 bg-white shadow-sm space-y-4">
                <h3 className="text-sm font-semibold text-gray-500 mb-3">Skills & Status</h3>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Category</label>
                  <input
                    type="text"
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Skill</label>
                  <input
                    type="text"
                    value={editForm.skill}
                    onChange={(e) => setEditForm({ ...editForm, skill: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Level</label>
                  <input
                    type="number"
                    value={editForm.level}
                    onChange={(e) => setEditForm({ ...editForm, level: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isBillable"
                    checked={editForm.isBillable}
                    onChange={(e) => setEditForm({ ...editForm, isBillable: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  <label htmlFor="isBillable" className="text-sm text-gray-700">Billable</label>
                </div>
              </div>
            </div>
          ) : (
          <div className="grid grid-cols-2 gap-6">
          <div className="p-4 rounded-lg border border-gray-200 bg-white shadow-sm">
            <h3 className="text-sm font-semibold text-gray-500 mb-3">Basic Information</h3>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-gray-500">External ID:</dt>
                <dd className="font-medium">{resource.externalId}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Name:</dt>
                <dd className="font-medium">{resource.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Cost Center:</dt>
                <dd className="font-medium">{resource.costCenterId}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Billable Team:</dt>
                <dd className="font-medium">{resource.billableTeamCode}</dd>
              </div>
            </dl>
          </div>

          <div className="p-4 rounded-lg border border-gray-200 bg-white shadow-sm">
            <h3 className="text-sm font-semibold text-gray-500 mb-3">Skills & Status</h3>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-gray-500">Category:</dt>
                <dd className="font-medium">{resource.category}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Skill:</dt>
                <dd className="font-medium">{resource.skill || '-'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Level:</dt>
                <dd className="font-medium">{resource.level || '-'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Status:</dt>
                <dd className="font-medium">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    resource.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                    resource.status === 'ON_LEAVE' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {resource.status}
                  </span>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Billable:</dt>
                <dd className="font-medium">{resource.isBillable ? 'Yes' : 'No'}</dd>
              </div>
            </dl>
          </div>
        </div>
          )}
        </div>
      )}

      {activeTab === 'assignments' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Project Assignments</h2>
              <p className="text-sm text-gray-500">
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
              Assign to Project
            </button>
          </div>

          {/* Approval Panel */}
          <AllocationApprovalPanel
            allocations={allocations}
            loading={loadingAllocations}
            onApprove={handleApprove}
            onReject={handleReject}
            currentUserId={currentUserId}
          />

          {/* Allocation List */}
          <AllocationList
            allocations={allocations}
            loading={loadingAllocations}
          />

          {/* Create Modal */}
          <AllocationModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            onSubmit={async (form) => {
              await createMutation.mutateAsync(form);
            }}
            defaultResourceId={resourceId}
            resources={resources}
            projects={projects}
          />
        </div>
      )}

      {activeTab === 'rate-history' && (
        <div className="p-8 text-center text-gray-500">
          Rate history not yet available
        </div>
      )}
    </div>
  );
}
