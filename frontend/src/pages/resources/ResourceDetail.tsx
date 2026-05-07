import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getResourceById, getResources, updateResource } from '../../api/resources';
import { listAllocations, createAllocation, updateAllocationHours, deleteAllocation, CreateAllocationRequest } from '@/api/allocations';
import { projectsApi } from '@/api/projects';
import { ratesApi } from '@/api/rates';
import { listFiltersByCategory } from '@/api/admin';
import AllocationList from '@/components/allocation/AllocationList';
import AllocationModal from '@/components/allocation/AllocationModal';
import type { Resource } from '@/types';

// Default fallback options when API unavailable
const DEFAULT_COST_CENTER_OPTIONS = ['HT366', 'ENG-CC1', 'ENG-CC2', 'ENG-CC3', 'ENG-CC4', 'FIN-CC1', 'FIN-CC2', 'PM-CC1', 'PM-CC2'];
const DEFAULT_BILLABLE_TEAM_OPTIONS = ['ITDDEVPEM18', 'BTC-API', 'TC001', 'TC002'];
const DEFAULT_L5_TEAM_OPTIONS = ['AM-LENDING', 'AM-PAYMENTS', 'AM-CORE'];

type TabType = 'details' | 'assignments';

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
  const [activeTab, setActiveTab] = useState<TabType>('details');
  const [modalOpen, setModalOpen] = useState(false);
  const [expanded, setExpanded] = useState({
    assignments: true,
    rates: false,
  });
  const [editMode, setEditMode] = useState(false);
  const [displayMode, setDisplayMode] = useState<'hcm' | 'usd'>('hcm');
  const [editForm, setEditForm] = useState({
    name: '',
    externalId: '',
    costCenterId: '',
    billableTeamCode: '',
    category: '',
    skills: '',
    skill: '',
    level: 1,
    functionalManager: '',
    l5TeamCode: '',
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

  // Fetch filter options from admin API
  const { data: costCenterFilters = [] } = useQuery({
    queryKey: ['admin', 'filters', 'cost_center'],
    queryFn: () => listFiltersByCategory('cost_center'),
  });

  const { data: billableTeamFilters = [] } = useQuery({
    queryKey: ['admin', 'filters', 'billable_team'],
    queryFn: () => listFiltersByCategory('billable_team'),
  });

  const { data: l5TeamFilters = [] } = useQuery({
    queryKey: ['admin', 'filters', 'l5_team'],
    queryFn: () => listFiltersByCategory('l5_team'),
  });

  // Derive options - use API data or fallbacks
  const COST_CENTER_OPTIONS = costCenterFilters.length > 0
    ? costCenterFilters.map(f => f.value)
    : DEFAULT_COST_CENTER_OPTIONS;
  const BILLABLE_TEAM_OPTIONS = billableTeamFilters.length > 0
    ? billableTeamFilters.map(f => f.value)
    : DEFAULT_BILLABLE_TEAM_OPTIONS;
  const L5_TEAM_OPTIONS = l5TeamFilters.length > 0
    ? l5TeamFilters.map(f => f.value)
    : DEFAULT_L5_TEAM_OPTIONS;

  const { data: resourcesData } = useQuery({
    queryKey: ['resources', 'all'],
    queryFn: () => getResources({ page: 0, size: 200 }),
  });
  const resources = (resourcesData as any)?.content || [];

  const createMutation = useMutation({
    mutationFn: async (form: CreateAllocationForm | { resourceId: number; projectId: number; hcm: number; hours: number }) => {
      // Handle both old format (with weekStartDate) and new format (with hcm)
      const resourceId = form.resourceId;
      const projectId = form.projectId;
      let hcm: number;
      let hours: number;

      if ('weekStartDate' in form && form.weekStartDate) {
        // Old format
        hcm = Number.parseInt(form.weekStartDate.replace(/-/g, '').slice(0, 6));
        hours = Number.parseFloat(form.hours);
      } else {
        // New format for inline create
        hcm = (form as any).hcm;
        hours = (form as any).hours;
      }

      if (!resourceId || !projectId) {
        throw new Error('Resource and project are required');
      }

      const request: CreateAllocationRequest = {
        resourceId,
        projectId,
        hcm,
        hours,
        notes: 'notes' in form ? form.notes || undefined : undefined,
      };
      return createAllocation(request);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allocations'] });
      setModalOpen(false);
    },
  });

  const updateAllocMutation = useMutation({
    mutationFn: async ({ id, hours }: { id: number; hours: number }) => {
      await updateAllocationHours(id, hours);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allocations'] });
    },
  });

  const deleteAllocMutation = useMutation({
    mutationFn: async (id: number) => {
      await deleteAllocation(id);
    },
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

  const toggleSection = (section: 'assignments' | 'rates') => {
    setExpanded(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Fetch rates for this resource's cost center + team
  const { data: rates = [] } = useQuery({
    queryKey: ['rates', resource?.costCenterId, resource?.billableTeamCode],
    queryFn: async () => {
      if (!resource?.costCenterId || !resource?.billableTeamCode) return [];
      const allRates = await ratesApi.list();
      return allRates.filter(
        r => r.costCenterId === resource.costCenterId && r.billableTeamCode === resource.billableTeamCode
      );
    },
    enabled: !!resource?.costCenterId && !!resource?.billableTeamCode,
  });

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
    { id: 'assignments' as TabType, label: 'Assignments & Rates' },
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
                    skills: resource.skill || '',
                    level: resource.level || 1,
                    functionalManager: (resource as any).functionalManager || '',
                    l5TeamCode: (resource as any).l5TeamCode || '',
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
                  <select
                    value={editForm.costCenterId}
                    onChange={(e) => setEditForm({ ...editForm, costCenterId: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  >
                    <option value="">Select Cost Center</option>
                    {COST_CENTER_OPTIONS.map(cc => (
                      <option key={cc} value={cc}>{cc}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Billable Team</label>
                  <select
                    value={editForm.billableTeamCode}
                    onChange={(e) => setEditForm({ ...editForm, billableTeamCode: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  >
                    <option value="">Select Billable Team</option>
                    {BILLABLE_TEAM_OPTIONS.map(team => (
                      <option key={team} value={team}>{team}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Functional Manager</label>
                  <input
                    type="text"
                    value={editForm.functionalManager}
                    onChange={(e) => setEditForm({ ...editForm, functionalManager: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">L5 Team Code</label>
                  <select
                    value={editForm.l5TeamCode}
                    onChange={(e) => setEditForm({ ...editForm, l5TeamCode: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  >
                    <option value="">Select L5 Team</option>
                    {L5_TEAM_OPTIONS.map(team => (
                      <option key={team} value={team}>{team}</option>
                    ))}
                  </select>
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
                  <label className="block text-xs text-gray-500 mb-1">Skills (comma-separated)</label>
                  <input
                    type="text"
                    value={editForm.skill}
                    onChange={(e) => setEditForm({ ...editForm, skill: e.target.value, skills: e.target.value })}
                    placeholder="Java, Python, React"
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
              <div className="flex justify-between">
                <dt className="text-gray-500">L5 Team Code:</dt>
                <dd className="font-medium">{(resource as any).l5TeamCode || '-'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Functional Manager:</dt>
                <dd className="font-medium">{resource.functionalManager || '-'}</dd>
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
            </dl>
          </div>
        </div>
          )}
        </div>
      )}

      {activeTab === 'assignments' && (
        <div className="space-y-4">
          {/* Section 1: Project Assignments (Accordion) */}
          <div className="border rounded-lg overflow-hidden">
            <button
              className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100"
              onClick={() => toggleSection('assignments')}
            >
              <div>
                <h2 className="text-lg font-bold text-gray-900">Project Assignments</h2>
                <p className="text-sm text-gray-500">
                  {allocations.length} allocation{allocations.length !== 1 ? 's' : ''} found
                </p>
              </div>
              <span>{expanded.assignments ? '▲' : '▼'}</span>
            </button>
            {expanded.assignments && (
              <div className="p-4 border-t">
                <button
                  onClick={() => setModalOpen(true)}
                  className="mb-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white"
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
                <AllocationList
                  allocations={allocations}
                  loading={loadingAllocations}
                  resourceId={Number(resourceId)}
                  displayMode={displayMode}
                  onDisplayModeChange={setDisplayMode}
                  ratePerHcm={rates[0]?.monthlyRateK || 0}
                  onUpdateAllocation={async (id, hours) => {
                    await updateAllocMutation.mutateAsync({ id, hours });
                  }}
                  onDeleteAllocation={async (id) => {
                    await deleteAllocMutation.mutateAsync(id);
                  }}
                  onCreateAllocation={async (resourceId, projectName, hcm, hours) => {
                    // Find project by name
                    const project = projects.find(p => p.name === projectName);
                    if (!project) return;
                    const form = {
                      resourceId,
                      projectId: project.id,
                      hcm,
                      hours,
                    };
                    await createMutation.mutateAsync(form as any);
                  }}
                />
                <AllocationModal
                  open={modalOpen}
                  onClose={() => setModalOpen(false)}
                  onSubmit={async (form: any) => {
                    await createMutation.mutateAsync(form);
                  }}
                  defaultResourceId={resourceId}
                  resources={resources}
                  projects={projects}
                  disabledResourceSelection={true}
                />
              </div>
            )}
          </div>

          {/* Section 2: Rate History (Accordion) */}
          <div className="border rounded-lg overflow-hidden">
            <button
              className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100"
              onClick={() => toggleSection('rates')}
            >
              <div>
                <h2 className="text-lg font-bold text-gray-900">Rate History</h2>
                <p className="text-sm text-gray-500">
                  {rates.length} rate{rates.length !== 1 ? 's' : ''} | Cost Center: {resource?.costCenterId} | Team: {resource?.billableTeamCode}
                </p>
              </div>
              <span>{expanded.rates ? '▲' : '▼'}</span>
            </button>
            {expanded.rates && (
              <div className="p-4 border-t">
                {rates.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 rounded-lg border border-gray-200">
                    No rate history found for this resource
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="min-w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Effective From</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Effective To</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Monthly Rate (K USD)</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {rates.map((rate: any) => (
                          <tr key={rate.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm text-gray-900">{rate.effectiveFrom}</td>
                            <td className="px-4 py-2 text-sm text-gray-600">{rate.effectiveTo || '—'}</td>
                            <td className="px-4 py-2 text-sm font-medium text-gray-900 text-right">${rate.monthlyRateK}K</td>
                            <td className="px-4 py-2">
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                !rate.effectiveTo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {!rate.effectiveTo ? 'Active' : 'Historical'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
