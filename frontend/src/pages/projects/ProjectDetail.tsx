import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi, activitiesApi, Activity } from '../../api/projects';
import { listAllocations, createAllocation, CreateAllocationRequest } from '@/api/allocations';
import { GanttChart } from '../../components/project/GanttChart';
import AllocationModal from '@/components/allocation/AllocationModal';
import { getResources } from '@/api/resources';
import { ratesApi } from '@/api/rates';
import { getActualsByClarityId, createOrUpdateActual, deleteActual } from '@/api/actuals';

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; label: string }> = {
  REQUESTED: { bg: '#eff6ff', text: '#1d4ed8', border: '#3b82f6', label: 'Requested' },
  EXECUTING: { bg: '#dcfce7', text: '#15803d', border: '#22c55e', label: 'Executing' },
  ON_HOLD: { bg: '#fef9c3', text: '#a16207', border: '#eab308', label: 'On Hold' },
  COMPLETED: { bg: '#d1fae5', text: '#065f46', border: '#10b981', label: 'Completed' },
  CANCELLED: { bg: '#fee2e2', text: '#b91c1c', border: '#ef4444', label: 'Cancelled' },
};

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const projectId = Number(id);

  const [showActivityForm, setShowActivityForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'resources' | 'schedule'>('resources');
  const [displayMode, setDisplayMode] = useState<'hcm' | 'usd'>('hcm');
  const [showEditForm, setShowEditForm] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    requestId: '',
    clarityId: '',
    billableProductId: '',
    budgetTotalK: '',
    startDate: '',
    endDate: '',
    description: '',
  });
  const [activityForm, setActivityForm] = useState({
    name: '',
    description: '',
    plannedStartDate: '',
    plannedEndDate: '',
    estimatedHours: '',
    isMilestone: false,
  });
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [showActivityEditForm, setShowActivityEditForm] = useState(false);
  const [showAllocModal, setShowAllocModal] = useState(false);
  const [activityEditForm, setActivityEditForm] = useState({
    name: '',
    description: '',
    plannedStartDate: '',
    plannedEndDate: '',
    estimatedHours: '',
    isMilestone: false,
    sequence: 0,
  });
  const [showResourceAssignForm, setShowResourceAssignForm] = useState(false);
  const [resourceAssignForm, setResourceAssignForm] = useState({
    resourceId: '' as string | number,
    hours: '',
    weekStartDate: '',
  });
  // State for actuals editing - moved outside map to fix hooks violation
  const [actualsEditValues, setActualsEditValues] = useState<Record<number, Record<string, string>>>({});
  const [actualsSavingId, setActualsSavingId] = useState<number | null>(null);

  // Helper to get milestone status - backend returns "milestone", frontend expects "isMilestone"
  const getIsMilestone = (activity: any) => activity.isMilestone || activity.milestone || false;

  // Convert hours to HCM (144 hours = 1 HCM)
  const hoursToHcm = (hours: number) => (hours / 144).toFixed(2);

  // Fetch project data
  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.get(projectId),
    enabled: !!projectId,
    staleTime: 0, // Always fetch fresh data
  });

  // Fetch activities
  const { data: activitiesData, isLoading: activitiesLoading } = useQuery({
    queryKey: ['project', projectId, 'activities'],
    queryFn: () => activitiesApi.list(projectId),
    enabled: !!projectId,
  });

  // Fetch allocations for this project
  const { data: allocationsData, isLoading: allocationsLoading } = useQuery({
    queryKey: ['allocations', 'project', projectId],
    queryFn: () => listAllocations({ projectId }),
    enabled: !!projectId,
  });

  // Fetch actuals for this project
  // Only extract clarityId AFTER project has loaded to avoid stale/empty state
  const projectData = project?.data;
  let clarityId = '';
  let hasClarityId = false;
  if (!isLoading && projectData) {
    clarityId = projectData?.clarityId || projectData?.requestId || projectData?.name || '';
    hasClarityId = !!projectData?.clarityId;
  }
  console.log('ProjectDetail DEBUG - projectId:', projectId, 'isLoading:', isLoading, 'project exists:', !!projectData, 'project name:', projectData?.name, 'clarityId:', projectData?.clarityId, 'hasClarityId:', hasClarityId);
  const { data: actualsData = [], isLoading: actualsLoading } = useQuery({
    queryKey: ['projectActuals', clarityId],
    queryFn: () => getActualsByClarityId(clarityId),
    enabled: !!clarityId,
  });

  // Save actual mutation
  const saveActualMutation = useMutation({
    mutationFn: async ({ resourceId, monthlyData, clarityId: cid }: { resourceId: number; monthlyData: Record<string, number> | null; clarityId: string }) => {
      console.log('saveActualMutation called', { resourceId, monthlyData, clarityId: cid });
      if (!cid) {
        throw new Error('CLARITY_ID_MISSING: Project must have a Clarity ID to manage actual consumption. Please set the Clarity ID in project settings first.');
      }
      const result = await createOrUpdateActual(cid, {
        resourceId,
        projectName: project?.data?.name || '',
        monthlyData: monthlyData || {},
      });
      console.log('createOrUpdateActual result:', result);
      return result;
    },
    onSuccess: (_data, vars) => {
      console.log('Actual saved successfully, invalidating queries for', vars.clarityId);
      queryClient.invalidateQueries({ queryKey: ['projectActuals', vars.clarityId] });
    },
    onError: (error: any) => {
      console.error('Error saving actual:', error?.message || error?.response?.data || error);
      const errorMsg = error?.message || error?.response?.data?.error || 'Unknown error';
      if (errorMsg.includes('CLARITY_ID_MISSING')) {
        alert('Cannot save actual consumption: Project must have a Clarity ID. Please set the Clarity ID in project settings first.');
      } else {
        alert('Error saving actual: ' + errorMsg);
      }
    },
  });

  // Delete actual mutation
  const deleteActualMutation = useMutation({
    mutationFn: async (id: number) => {
      if (!clarityId) return;
      await deleteActual(clarityId, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectActuals', clarityId] });
    },
  });

  // Status transition mutations
  const startMutation = useMutation({
    mutationFn: () => projectsApi.start(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const holdMutation = useMutation({
    mutationFn: () => projectsApi.hold(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => projectsApi.transitionStatus(projectId, 'COMPLETED'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => projectsApi.transitionStatus(projectId, 'CANCELLED'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: () => projectsApi.reactivate(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const createAllocMutation = useMutation({
    mutationFn: (request: CreateAllocationRequest) => createAllocation(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allocations', 'project', projectId] });
      setShowAllocModal(false);
    },
  });

  const { data: resourcesData } = useQuery({
    queryKey: ['resources', 'all'],
    queryFn: () => getResources({ page: 0, size: 200 }),
  });
  const allResources = (resourcesData as any)?.content || [];

  // Fetch rates for USD calculation
  const { data: rates = [] } = useQuery({
    queryKey: ['rates'],
    queryFn: () => ratesApi.list(),
  });

  // Update project - direct function (not useMutation to avoid closure issues)
  const updateProject = async () => {
    const data = {
      name: editForm.name,
      description: editForm.description || undefined,
      budgetTotalK: editForm.budgetTotalK ? parseFloat(editForm.budgetTotalK) : undefined,
      startDate: editForm.startDate || undefined,
      endDate: editForm.endDate || undefined,
      requestId: editForm.requestId || undefined,
      clarityId: editForm.clarityId || undefined,
      billableProductId: editForm.billableProductId || undefined,
    };

    console.log('Updating project with data:', data);

    try {
      const response = await fetch(`/api/v1/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Update failed:', response.status, errorText);
        alert('Failed to update project');
        return;
      }

      const result = await response.json();
      console.log('Update success:', result);

      // Refetch project data
      await queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      await queryClient.invalidateQueries({ queryKey: ['projects'] });

      setShowEditForm(false);
    } catch (error) {
      console.error('Update error:', error);
      alert('Failed to update project');
    }
  };

  // Initialize edit form when project loads
  useEffect(() => {
    if (project) {
      const data = project.data;
      setEditForm({
        name: data.name || '',
        requestId: data.requestId || '',
        clarityId: data.clarityId || '',
        billableProductId: data.billableProductId || '',
        budgetTotalK: data.budgetTotalK?.toString() || '',
        startDate: data.startDate || '',
        endDate: data.endDate || '',
        description: data.description || '',
      });
    }
  }, [project]);

  
  // Create activity mutation
  const createActivityMutation = useMutation({
    mutationFn: (data: Partial<Activity>) => activitiesApi.create(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId, 'activities'] });
      setShowActivityForm(false);
      setActivityForm({
        name: '',
        description: '',
        plannedStartDate: '',
        plannedEndDate: '',
        estimatedHours: '',
        isMilestone: false,
      });
    },
    onError: (error: any) => {
      console.error('Failed to create activity:', error);
    },
  });

  // Update activity mutation
  const updateActivityMutation = useMutation({
    mutationFn: ({ activityId, data }: { activityId: number; data: Partial<Activity> }) =>
      activitiesApi.update(projectId, activityId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId, 'activities'] });
      setShowActivityEditForm(false);
      setSelectedActivity(null);
      setActivityEditForm({
        name: '',
        description: '',
        plannedStartDate: '',
        plannedEndDate: '',
        estimatedHours: '',
        isMilestone: false,
        sequence: 0,
      });
    },
    onError: (error: any) => {
      console.error('Failed to update activity:', error);
      alert('Failed to update activity');
    },
  });

  // Delete activity mutation
  const deleteActivityMutation = useMutation({
    mutationFn: (activityId: number) => activitiesApi.delete(projectId, activityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId, 'activities'] });
      setShowActivityEditForm(false);
      setSelectedActivity(null);
    },
    onError: (error: any) => {
      console.error('Failed to delete activity:', error);
    },
  });

  const handleStart = () => startMutation.mutate();
  const handleHold = () => holdMutation.mutate();
  const handleComplete = () => completeMutation.mutate();
  const handleCancel = () => cancelMutation.mutate();
  const handleReactivate = () => reactivateMutation.mutate();

  const handleAddActivity = () => {
    if (!activityForm.name.trim()) return;
    createActivityMutation.mutate({
      name: activityForm.name,
      description: activityForm.description || undefined,
      plannedStartDate: activityForm.plannedStartDate || undefined,
      plannedEndDate: activityForm.plannedEndDate || undefined,
      estimatedHours: activityForm.estimatedHours ? parseFloat(activityForm.estimatedHours) : 0,
      isMilestone: activityForm.isMilestone,
    });
  };

  const handleSelectActivity = (activity: Activity) => {
    setSelectedActivity(activity);
    setActivityEditForm({
      name: activity.name || '',
      description: activity.description || '',
      plannedStartDate: activity.plannedStartDate || '',
      plannedEndDate: activity.plannedEndDate || '',
      estimatedHours: activity.estimatedHours?.toString() || '',
      isMilestone: activity.isMilestone || false,
      sequence: activity.sequence || 0,
    });
    setShowActivityEditForm(true);
  };

  const handleUpdateActivity = () => {
    if (!selectedActivity) return;
    updateActivityMutation.mutate({
      activityId: selectedActivity.id,
      data: {
        name: activityEditForm.name,
        description: activityEditForm.description || undefined,
        plannedStartDate: activityEditForm.plannedStartDate || undefined,
        plannedEndDate: activityEditForm.plannedEndDate || undefined,
        estimatedHours: activityEditForm.estimatedHours ? parseFloat(activityEditForm.estimatedHours) : 0,
        isMilestone: activityEditForm.isMilestone,
        sequence: activityEditForm.sequence,
      },
    });
  };

  const handleDeleteActivity = () => {
    if (!selectedActivity) return;
    if (confirm('Are you sure you want to delete this activity?')) {
      deleteActivityMutation.mutate(selectedActivity.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <svg className="w-12 h-12 mb-4" style={{ color: '#d4d4d4' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p style={{ color: '#737373' }}>Project not found</p>
        <button onClick={() => navigate('/projects')} className="mt-4 text-sm font-medium" style={{ color: '#209d9d' }}>
          ← Back to Projects
        </button>
      </div>
    );
  }

  const p = project.data;
  const activities: Activity[] = activitiesData?.data || [];
  const statusStyle = STATUS_CONFIG[p.status] || STATUS_CONFIG.REQUESTED;

  return (
    <div className="w-full space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/projects')}
          className="flex items-center justify-center w-10 h-10 rounded-lg transition-colors"
          style={{ backgroundColor: '#f5f5f5', color: '#525252' }}
        >
          ←
        </button>
        <div>
          <h1 className="text-xl font-semibold display-text" style={{ color: '#171717' }}>
            {p.name}
          </h1>
          <p className="text-sm" style={{ color: '#737373' }}>Project Details</p>
        </div>
      </div>

      {/* Status Actions */}
      <div className="flex items-center gap-4">
        <span
          className="status-badge text-sm font-medium"
          style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}
        >
          {statusStyle.label}
        </span>
        <div className="flex gap-2">
          {p.status === 'REQUESTED' && (
            <>
              <button onClick={handleStart} className="btn-sm px-3 py-1.5 rounded-lg font-medium" style={{ backgroundColor: '#22c55e', color: 'white' }}>Start</button>
              <button onClick={handleCancel} className="btn-sm px-3 py-1.5 rounded-lg font-medium" style={{ backgroundColor: '#ef4444', color: 'white' }}>Cancel</button>
            </>
          )}
          {p.status === 'EXECUTING' && (
            <>
              <button onClick={handleHold} className="btn-sm px-3 py-1.5 rounded-lg font-medium" style={{ backgroundColor: '#eab308', color: 'white' }}>Hold</button>
              <button onClick={handleComplete} className="btn-sm px-3 py-1.5 rounded-lg font-medium" style={{ backgroundColor: '#22c55e', color: 'white' }}>Complete</button>
            </>
          )}
          {p.status === 'ON_HOLD' && (
            <>
              <button onClick={handleStart} className="btn-sm px-3 py-1.5 rounded-lg font-medium" style={{ backgroundColor: '#22c55e', color: 'white' }}>Resume</button>
              <button onClick={handleCancel} className="btn-sm px-3 py-1.5 rounded-lg font-medium" style={{ backgroundColor: '#ef4444', color: 'white' }}>Cancel</button>
            </>
          )}
          {(p.status === 'COMPLETED' || p.status === 'CANCELLED') && (
            <button onClick={handleReactivate} className="btn-sm px-3 py-1.5 rounded-lg font-medium" style={{ backgroundColor: '#525252', color: 'white' }}>Reactivate</button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          <button onClick={() => setActiveTab('summary')} className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'summary' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'}`}>Project Summary</button>
          <button onClick={() => setActiveTab('resources')} className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'resources' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'}`}>Resources & Allocations</button>
          <button onClick={() => setActiveTab('schedule')} className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'schedule' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'}`}>Schedule & Activities</button>
        </nav>
      </div>

      {activeTab === 'summary' && (
      <div className="p-6 rounded-xl" style={{ backgroundColor: '#ffffff', border: '1px solid #e5e5e5' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold display-text" style={{ color: '#171717' }}>Project Summary</h2>
          <button
            onClick={() => setShowEditForm(!showEditForm)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={{ backgroundColor: '#f5f5f5', color: '#525252' }}
          >
            {showEditForm ? 'Cancel' : 'Edit'}
          </button>
        </div>

        {showEditForm && (
          <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: '#fafaf8', border: '1px solid #e5e5e5' }}>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs uppercase tracking-wider mb-1" style={{ color: '#737373' }}>Project Name</label>
                <input
                  type="text"
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ border: '1px solid #e5e5e5', backgroundColor: '#ffffff' }}
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider mb-1" style={{ color: '#737373' }}>Request ID</label>
                <input
                  type="text"
                  value={editForm.requestId || ''}
                  onChange={(e) => setEditForm({ ...editForm, requestId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ border: '1px solid #e5e5e5', backgroundColor: '#ffffff' }}
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider mb-1" style={{ color: '#737373' }}>Clarity ID</label>
                <input
                  type="text"
                  value={editForm.clarityId || ''}
                  onChange={(e) => setEditForm({ ...editForm, clarityId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ border: '1px solid #e5e5e5', backgroundColor: '#ffffff' }}
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider mb-1" style={{ color: '#737373' }}>Billable Product</label>
                <input
                  type="text"
                  value={editForm.billableProductId || ''}
                  onChange={(e) => setEditForm({ ...editForm, billableProductId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ border: '1px solid #e5e5e5', backgroundColor: '#ffffff' }}
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider mb-1" style={{ color: '#737373' }}>Budget (K USD)</label>
                <input
                  type="number"
                  value={editForm.budgetTotalK || ''}
                  onChange={(e) => setEditForm({ ...editForm, budgetTotalK: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ border: '1px solid #e5e5e5', backgroundColor: '#ffffff' }}
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider mb-1" style={{ color: '#737373' }}>Start Date</label>
                <input
                  type="date"
                  value={editForm.startDate || ''}
                  onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ border: '1px solid #e5e5e5', backgroundColor: '#ffffff' }}
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider mb-1" style={{ color: '#737373' }}>End Date</label>
                <input
                  type="date"
                  value={editForm.endDate || ''}
                  onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ border: '1px solid #e5e5e5', backgroundColor: '#ffffff' }}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs uppercase tracking-wider mb-1" style={{ color: '#737373' }}>Description</label>
                <textarea
                  value={editForm.description || ''}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ border: '1px solid #e5e5e5', backgroundColor: '#ffffff' }}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={updateProject}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ backgroundColor: '#209d9d', color: 'white' }}
              >
                Save Changes
              </button>
            </div>
          </div>
        )}
        {!showEditForm && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider" style={{ color: '#a3a3a3' }}>Request ID</p>
              <p className="text-sm font-medium mono-text mt-1" style={{ color: '#525252' }}>{p.requestId || '—'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider" style={{ color: '#a3a3a3' }}>Clarity ID</p>
              <p className="text-sm font-medium mono-text mt-1" style={{ color: '#525252' }}>{p.clarityId || '—'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider" style={{ color: '#a3a3a3' }}>Billable Product</p>
              <p className="text-sm font-medium mono-text mt-1" style={{ color: '#525252' }}>{p.billableProductId || '—'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider" style={{ color: '#a3a3a3' }}>Budget</p>
              <p className="text-sm font-semibold mt-1" style={{ color: '#209d9d', fontFamily: 'var(--font-display)' }}>${p.budgetTotalK}K</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider" style={{ color: '#a3a3a3' }}>Start Date</p>
              <p className="text-sm mt-1" style={{ color: '#525252' }}>{p.startDate || '—'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider" style={{ color: '#a3a3a3' }}>End Date</p>
              <p className="text-sm mt-1" style={{ color: '#525252' }}>{p.endDate || '—'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider" style={{ color: '#a3a3a3' }}>Owner</p>
              <p className="text-sm mt-1" style={{ color: '#525252' }}>{p.ownerUserId || '—'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider" style={{ color: '#a3a3a3' }}>Created</p>
              <p className="text-sm mt-1" style={{ color: '#525252' }}>{p.createdAt?.slice(0, 10) || '—'}</p>
            </div>
          </div>
        )}
        {p.description && (
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid #f5f5f5' }}>
            <p className="text-xs uppercase tracking-wider" style={{ color: '#a3a3a3' }}>Description</p>
            <p className="text-sm mt-1" style={{ color: '#525252' }}>{p.description}</p>
          </div>
        )}
      </div>
      )}

      {activeTab === 'resources' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Resources Allocated to This Project</h3>
            <div className="flex items-center gap-3">
              <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid #e5e5e5' }}>
                <button
                  onClick={() => setDisplayMode('hcm')}
                  className="px-3 py-1.5 text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: displayMode === 'hcm' ? '#209d9d' : '#ffffff',
                    color: displayMode === 'hcm' ? 'white' : '#525252'
                  }}
                >
                  HCM
                </button>
                <button
                  onClick={() => setDisplayMode('usd')}
                  className="px-3 py-1.5 text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: displayMode === 'usd' ? '#209d9d' : '#ffffff',
                    color: displayMode === 'usd' ? 'white' : '#525252'
                  }}
                >
                  USD
                </button>
              </div>
              <button
                onClick={() => setShowAllocModal(true)}
                className="px-4 py-2 rounded-lg font-medium text-white text-sm"
                style={{ background: 'linear-gradient(135deg, #209d9d 0%, #0D4F4F 100%)' }}
              >
                + Add Allocation
              </button>
            </div>
          </div>
          {allocationsLoading ? (
            <div className="flex items-center justify-center py-8"><div className="w-6 h-6 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin" /></div>
          ) : !allocationsData || allocationsData.length === 0 ? (
            <div className="p-8 text-center text-gray-500 rounded-lg border border-gray-200">No resources allocated to this project yet.</div>
          ) : (
            <div className="overflow-x-auto border rounded-lg">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Resource</th>
                    {(() => {
                      const months = [];
                      const now = new Date();
                      const currentYear = now.getFullYear();
                      const monthNames = ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
                      for (let i = 0; i < 12; i++) {
                        const year = i === 0 ? currentYear - 1 : currentYear;
                        months.push({ label: monthNames[i], year: year });
                      }
                      return months.map((m, idx) => (
                        <th key={idx} className="px-2 py-3 text-center text-xs font-semibold text-gray-500 uppercase min-w-[70px]">
                          {m.label}
                        </th>
                      ));
                    })()}
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(() => {
                    // Group allocations by resource
                    const resourceGroups: Record<number, { name: string; hoursByHcm: Record<number, number> }> = {};
                    allocationsData.forEach((alloc: any) => {
                      if (!resourceGroups[alloc.resourceId]) {
                        resourceGroups[alloc.resourceId] = { name: alloc.resourceName || 'Unknown', hoursByHcm: {} };
                      }
                      const hcm = alloc.hcm || parseInt((alloc.weekStartDate || '').replace(/-/g, '').slice(0, 6));
                      if (hcm) {
                        resourceGroups[alloc.resourceId].hoursByHcm[hcm] = (resourceGroups[alloc.resourceId].hoursByHcm[hcm] || 0) + (alloc.hours || 0);
                      }
                    });

                    // Generate fiscal year HCMs
                    const fyMonths: number[] = [];
                    const now = new Date();
                    const currentYear = now.getFullYear();
                    for (let i = 0; i < 12; i++) {
                      const monthIndex = (i + 11) % 12;
                      const year = i === 0 ? currentYear - 1 : currentYear;
                      fyMonths.push(year * 100 + (monthIndex + 1));
                    }

                    // Helper to get rate for a resource
                    const getResourceRate = (resourceId: number) => {
                      const resource = allResources.find((r: any) => r.id === resourceId);
                      if (!resource) return 0;
                      const rate = rates.find((r: any) => r.costCenterId === resource.costCenterId && r.billableTeamCode === resource.billableTeamCode);
                      return rate ? Number(rate.monthlyRateK) : 0;
                    };

                    // Helper to format value
                    const formatValue = (hours: number, resourceId: number) => {
                      if (hours === 0) return '—';
                      if (displayMode === 'hcm') {
                        return hoursToHcm(hours);
                      } else {
                        const rate = getResourceRate(resourceId);
                        const hcm = hours / 144;
                        return `$${(hcm * rate).toFixed(1)}K`;
                      }
                    };

                    return Object.entries(resourceGroups).map(([resourceId, data]) => {
                      const totalHours = Object.values(data.hoursByHcm).reduce((s, v) => s + v, 0);
                      const resourceRate = getResourceRate(Number(resourceId));
                      const totalValue = displayMode === 'hcm'
                        ? hoursToHcm(totalHours)
                        : `$${((totalHours / 144) * resourceRate).toFixed(1)}K`;

                      return (
                        <tr key={resourceId} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{data.name}</td>
                          {fyMonths.map((hcm, idx) => {
                            const hours = data.hoursByHcm[hcm] || 0;
                            return (
                              <td key={idx} className="px-2 py-3 text-center text-sm">
                                {hours > 0 ? (
                                  <span className="inline-flex items-center justify-center w-12 px-1 py-1 rounded text-xs font-medium"
                                    style={{ backgroundColor: hours >= 144 ? '#d1fae5' : hours >= 72 ? '#e0f2fe' : '#f3f4f6', color: hours >= 144 ? '#065f46' : hours >= 72 ? '#075985' : '#525252' }}>
                                    {formatValue(hours, Number(resourceId))}
                                  </span>
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">{totalValue}</td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          )}

          {/* Actual Consumption Section */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            {/* Validation warning if clarityId is missing */}
            {!hasClarityId && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-sm font-medium text-yellow-800">
                    This project does not have a Clarity ID configured. Actual consumption cannot be managed until a Clarity ID is set in project settings.
                  </span>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Actual Consumption (HCM)</h3>
              <div className="text-sm text-gray-500">
                Total: {(() => {
                  let total = 0;
                  actualsData.forEach((a: any) => {
                    const values = Object.values(a.monthlyData || {}) as number[];
                    values.forEach((v) => { total += (Number(v) || 0); });
                  });
                  return total.toFixed(1);
                })()} HCM
              </div>
            </div>

            {actualsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Resource</th>
                      {(() => {
                        const months = [];
                        const now = new Date();
                        const currentYear = now.getFullYear();
                        const monthNames = ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
                        for (let i = 0; i < 12; i++) {
                          const year = i === 0 ? currentYear - 1 : currentYear;
                          months.push({ label: monthNames[i], key: `${year}${String(i === 0 ? 12 : i).padStart(2, '0')}` });
                        }
                        return months.map((m, idx) => (
                          <th key={idx} className="px-2 py-3 text-center text-xs font-semibold text-gray-500 uppercase min-w-[70px]">
                            {m.label}
                          </th>
                        ));
                      })()}
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {actualsData.map((actual: any) => {
                      const editValues = actualsEditValues[actual.id] || {};
                      const savingId = actualsSavingId;
                      const months = [];
                      const now = new Date();
                      const currentYear = now.getFullYear();
                      for (let i = 0; i < 12; i++) {
                        const year = i === 0 ? currentYear - 1 : currentYear;
                        months.push(`${year}${String(i === 0 ? 12 : i).padStart(2, '0')}`);
                      }
                      const getValue = (mKey: string) => editValues[mKey] ?? String(actual.monthlyData?.[mKey] ?? '');
                      const hasChanges = (mKey: string) => {
                        const current = String(actual.monthlyData?.[mKey] ?? '');
                        const edited = getValue(mKey);
                        return current !== edited && edited !== '';
                      };
                      const handleChange = (mKey: string, value: string) => {
                        setActualsEditValues(prev => ({ ...prev, [actual.id]: { ...prev[actual.id], [mKey]: value } }));
                      };
                      const handleSave = async (mKey: string) => {
                        const value = getValue(mKey);
                        if (value === '' || isNaN(Number(value))) return;
                        setActualsSavingId(Number(mKey));
                        const newMonthlyData = { ...actual.monthlyData };
                        newMonthlyData[mKey] = Number(value);
                        await saveActualMutation.mutateAsync({
                          resourceId: actual.resourceId,
                          monthlyData: newMonthlyData,
                          clarityId: clarityId,
                        });
                        setActualsEditValues(prev => {
                          const cleared = { ...prev[actual.id] };
                          delete cleared[mKey];
                          return { ...prev, [actual.id]: cleared };
                        });
                        setActualsSavingId(null);
                      };
                      return (
                        <tr key={actual.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2">
                            <div className="font-medium">{actual.resourceName || 'Unknown'}</div>
                            <div className="text-xs text-gray-500">{actual.resourceExternalId}</div>
                          </td>
                          {months.map((mKey) => (
                            <td key={mKey} className="px-1 py-1">
                              <div className="relative">
                                <input
                                  type="number"
                                  step="0.1"
                                  value={getValue(mKey)}
                                  onChange={(e) => handleChange(mKey, e.target.value)}
                                  onBlur={() => {
                                    if (hasChanges(mKey)) handleSave(mKey);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && hasChanges(mKey)) handleSave(mKey);
                                  }}
                                  className="w-full rounded border border-gray-200 px-2 py-1 text-center text-sm"
                                  placeholder="0"
                                />
                                {savingId === Number(mKey) && (
                                  <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                                    <div className="w-3 h-3 border border-primary-600 border-t-transparent rounded-full animate-spin" />
                                  </div>
                                )}
                              </div>
                            </td>
                          ))}
                          <td className="px-2 py-1 text-center">
                            <button
                              onClick={() => deleteActualMutation.mutate(actual.id)}
                              className="text-red-600 hover:text-red-800 text-xs"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {allocationsData && allocationsData.length > 0 && (
                      <tr className="bg-gray-50">
                        <td className="px-4 py-2">
                          <select
                            onChange={(e) => {
                              if (e.target.value && clarityId) {
                                saveActualMutation.mutate({
                                  resourceId: Number(e.target.value),
                                  monthlyData: null as any,
                                  clarityId: clarityId,
                                });
                              }
                            }}
                            className="rounded border border-gray-200 px-2 py-1 text-sm"
                            defaultValue=""
                            disabled={!hasClarityId}
                          >
                            <option value="">+ Add Resource</option>
                            {allocationsData
                              .filter((alloc: any) => !actualsData.some((a: any) => a.resourceId === alloc.resourceId))
                              .map((alloc: any) => (
                                <option key={alloc.resourceId} value={alloc.resourceId}>
                                  {alloc.resourceName || 'Unknown'} ({alloc.resourceExternalId || '-'})
                                </option>
                              ))}
                          </select>
                        </td>
                        <td colSpan={13} />
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'schedule' && (
      <div className="p-6 rounded-xl" style={{ backgroundColor: '#ffffff', border: '1px solid #e5e5e5' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold display-text" style={{ color: '#171717' }}>Schedule</h2>
          </div>
          <button
            onClick={() => setShowActivityForm(!showActivityForm)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={{ backgroundColor: '#209d9d', color: 'white' }}
          >
            {showActivityForm ? 'Cancel' : '+ Add Activity'}
          </button>
        </div>

        {/* Activity Form */}
        {showActivityForm && (
          <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: '#fafaf8', border: '1px solid #e5e5e5' }}>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs uppercase tracking-wider mb-1" style={{ color: '#737373' }}>Activity Name *</label>
                <input
                  type="text"
                  value={activityForm.name}
                  onChange={(e) => setActivityForm({ ...activityForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ border: '1px solid #e5e5e5', backgroundColor: '#ffffff' }}
                  placeholder="Enter activity name"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider mb-1" style={{ color: '#737373' }}>Estimated Hours</label>
                <input
                  type="number"
                  value={activityForm.estimatedHours}
                  onChange={(e) => setActivityForm({ ...activityForm, estimatedHours: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ border: '1px solid #e5e5e5', backgroundColor: '#ffffff' }}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 mt-6">
                  <input
                    type="checkbox"
                    checked={activityForm.isMilestone}
                    onChange={(e) => setActivityForm({ ...activityForm, isMilestone: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm" style={{ color: '#525252' }}>Is Milestone</span>
                </label>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider mb-1" style={{ color: '#737373' }}>Planned Start</label>
                <input
                  type="date"
                  value={activityForm.plannedStartDate}
                  onChange={(e) => setActivityForm({ ...activityForm, plannedStartDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ border: '1px solid #e5e5e5', backgroundColor: '#ffffff' }}
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider mb-1" style={{ color: '#737373' }}>Planned End</label>
                <input
                  type="date"
                  value={activityForm.plannedEndDate}
                  onChange={(e) => setActivityForm({ ...activityForm, plannedEndDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ border: '1px solid #e5e5e5', backgroundColor: '#ffffff' }}
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleAddActivity}
                disabled={!activityForm.name.trim() || createActivityMutation.isPending}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                style={{ backgroundColor: '#209d9d', color: 'white' }}
              >
                {createActivityMutation.isPending ? 'Saving...' : 'Save Activity'}
              </button>
            </div>
          </div>
        )}

        {/* Activity Edit Form Modal */}
        {showActivityEditForm && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold" style={{ color: '#171717' }}>Edit Activity</h3>
                <button
                  onClick={() => setShowActivityEditForm(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                  style={{ color: '#737373' }}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider mb-1" style={{ color: '#737373' }}>Activity Name *</label>
                  <input
                    type="text"
                    value={activityEditForm.name}
                    onChange={(e) => setActivityEditForm({ ...activityEditForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ border: '1px solid #e5e5e5', backgroundColor: '#ffffff' }}
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider mb-1" style={{ color: '#737373' }}>Description</label>
                  <textarea
                    value={activityEditForm.description}
                    onChange={(e) => setActivityEditForm({ ...activityEditForm, description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ border: '1px solid #e5e5e5', backgroundColor: '#ffffff' }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider mb-1" style={{ color: '#737373' }}>Estimated Hours</label>
                    <input
                      type="number"
                      value={activityEditForm.estimatedHours}
                      onChange={(e) => setActivityEditForm({ ...activityEditForm, estimatedHours: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{ border: '1px solid #e5e5e5', backgroundColor: '#ffffff' }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider mb-1" style={{ color: '#737373' }}>Sequence</label>
                    <input
                      type="number"
                      value={activityEditForm.sequence}
                      onChange={(e) => setActivityEditForm({ ...activityEditForm, sequence: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{ border: '1px solid #e5e5e5', backgroundColor: '#ffffff' }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider mb-1" style={{ color: '#737373' }}>Start Date</label>
                    <input
                      type="date"
                      value={activityEditForm.plannedStartDate}
                      onChange={(e) => setActivityEditForm({ ...activityEditForm, plannedStartDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{ border: '1px solid #e5e5e5', backgroundColor: '#ffffff' }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider mb-1" style={{ color: '#737373' }}>End Date</label>
                    <input
                      type="date"
                      value={activityEditForm.plannedEndDate}
                      onChange={(e) => setActivityEditForm({ ...activityEditForm, plannedEndDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{ border: '1px solid #e5e5e5', backgroundColor: '#ffffff' }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isMilestoneEdit"
                    checked={activityEditForm.isMilestone}
                    onChange={(e) => setActivityEditForm({ ...activityEditForm, isMilestone: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  <label htmlFor="isMilestoneEdit" className="text-sm" style={{ color: '#525252' }}>Milestone</label>
                </div>

                {/* Allocated Resources Section */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs uppercase tracking-wider" style={{ color: '#737373' }}>Allocated Resources</label>
                    <button
                      onClick={() => setShowResourceAssignForm(!showResourceAssignForm)}
                      className="text-xs px-2 py-1 rounded font-medium"
                      style={{ backgroundColor: '#e0f2f2', color: '#209d9d' }}
                    >
                      + Add Resource
                    </button>
                  </div>

                  {allocationsData && allocationsData.length > 0 ? (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {allocationsData
                        .filter((alloc: any) => alloc.activityId === selectedActivity?.id)
                        .map((alloc: any) => (
                          <div key={alloc.id} className="flex items-center justify-between p-2 rounded bg-gray-50 text-sm">
                            <span className="text-gray-700">{alloc.resourceName}</span>
                            <span className="text-xs text-gray-500">{hoursToHcm(alloc.hours)} HCM</span>
                          </div>
                        ))}
                      {allocationsData.filter((alloc: any) => alloc.activityId === selectedActivity?.id).length === 0 && (
                        <p className="text-sm text-gray-400 italic">No resources allocated to this activity</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No allocations for this project</p>
                  )}

                  {/* Resource Assignment Form */}
                  {showResourceAssignForm && (() => {
                    // Get unique resources allocated to this project (without activityId = project level)
                    const projectLevelAllocs = allocationsData?.filter((a: any) => !a.activityId) || [];
                    // Calculate available hours for each resource
                    const resourceAvailableHours: Record<number, number> = {};
                    projectLevelAllocs.forEach((alloc: any) => {
                      const resourceId = alloc.resourceId;
                      const projectHours = alloc.hours;
                      const assignedToActivities = allocationsData
                        ?.filter((a: any) => a.resourceId === resourceId && a.activityId && a.activityId !== selectedActivity?.id)
                        ?.reduce((sum: number, a: any) => sum + (a.hours || 0), 0) || 0;
                      resourceAvailableHours[resourceId] = projectHours - assignedToActivities;
                    });

                    return (
                    <div className="mt-3 p-3 rounded-lg border border-gray-200 bg-gray-50 space-y-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Select Resource (from allocated)</label>
                        <select
                          value={resourceAssignForm.resourceId}
                          onChange={(e) => setResourceAssignForm({ ...resourceAssignForm, resourceId: e.target.value })}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                        >
                          <option value="">Select a resource...</option>
                          {projectLevelAllocs.length > 0 ? (
                            projectLevelAllocs.map((alloc: any) => {
                              const available = resourceAvailableHours[alloc.resourceId] || 0;
                              return (
                                <option key={alloc.resourceId} value={alloc.resourceId}>
                                  {alloc.resourceName} (Available: {available}h)
                                </option>
                              );
                            })
                          ) : (
                            <option disabled>No project-level allocations</option>
                          )}
                        </select>
                      </div>

                      {/* Show allocation breakdown */}
                      {resourceAssignForm.resourceId && (
                        <div className="p-2 rounded bg-white border border-gray-200 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Project Total:</span>
                            <span className="font-medium">{projectLevelAllocs.find((a: any) => a.resourceId === Number(resourceAssignForm.resourceId))?.hours || 0}h</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Assigned to Other Activities:</span>
                            <span className="font-medium text-orange-600">
                              {allocationsData?.filter((a: any) => a.resourceId === Number(resourceAssignForm.resourceId) && a.activityId && a.activityId !== selectedActivity?.id).reduce((sum: number, a: any) => sum + (a.hours || 0), 0) || 0}h
                            </span>
                          </div>
                          <div className="flex justify-between border-t pt-1 mt-1">
                            <span className="text-gray-500">Available for This Activity:</span>
                            <span className="font-medium text-green-600">{resourceAvailableHours[Number(resourceAssignForm.resourceId)] || 0}h</span>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Hours/Week</label>
                          <input
                            type="number"
                            value={resourceAssignForm.hours}
                            onChange={(e) => setResourceAssignForm({ ...resourceAssignForm, hours: e.target.value })}
                            placeholder="e.g., 8"
                            max={resourceAvailableHours[Number(resourceAssignForm.resourceId)] || undefined}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Week Start</label>
                          <input
                            type="date"
                            value={resourceAssignForm.weekStartDate}
                            onChange={(e) => setResourceAssignForm({ ...resourceAssignForm, weekStartDate: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            const hours = parseFloat(resourceAssignForm.hours);
                            const available = resourceAvailableHours[Number(resourceAssignForm.resourceId)] || 0;
                            if (!resourceAssignForm.resourceId || !resourceAssignForm.hours || !resourceAssignForm.weekStartDate) {
                              alert('Please fill all fields');
                              return;
                            }
                            if (hours > available) {
                              alert(`Cannot assign ${hours}h. Only ${available}h available for this activity.`);
                              return;
                            }
                            const currentHcm = new Date().getFullYear() * 100 + (new Date().getMonth() + 1);
                            try {
                              await createAllocMutation.mutateAsync({
                                resourceId: Number(resourceAssignForm.resourceId),
                                projectId: projectId,
                                activityId: selectedActivity?.id || undefined,
                                hcm: currentHcm,
                                hours: hours,
                              });
                              setShowResourceAssignForm(false);
                              setResourceAssignForm({ resourceId: '', hours: '', weekStartDate: '' });
                            } catch (err) {
                              console.error('Failed to allocate resource:', err);
                              alert('Failed to allocate resource');
                            }
                          }}
                          disabled={createAllocMutation.isPending}
                          className="px-3 py-1.5 text-xs rounded font-medium"
                          style={{ backgroundColor: '#209d9d', color: 'white' }}
                        >
                          {createAllocMutation.isPending ? 'Adding...' : 'Add'}
                        </button>
                        <button
                          onClick={() => {
                            setShowResourceAssignForm(false);
                            setResourceAssignForm({ resourceId: '', hours: '', weekStartDate: '' });
                          }}
                          className="px-3 py-1.5 text-xs rounded font-medium"
                          style={{ backgroundColor: '#f5f5f5', color: '#525252' }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                    );
                  })()}
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={handleUpdateActivity}
                  disabled={updateActivityMutation.isPending}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  style={{ backgroundColor: '#209d9d', color: 'white' }}
                >
                  {updateActivityMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={handleDeleteActivity}
                  disabled={deleteActivityMutation.isPending}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  style={{ backgroundColor: '#fee2e2', color: '#b91c1c' }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Gantt Chart - always shown first */}
        <div className="mb-4">
          <GanttChart projectId={projectId} onActivityClick={(id) => {
            const activity = activities.find(a => a.id === id);
            if (activity) handleSelectActivity(activity);
          }} />
        </div>

        {/* Activities List - shown below Gantt */}
        <div>
          <h3 className="text-sm font-semibold mb-3" style={{ color: '#525252' }}>Activities</h3>
          {activitiesLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="w-6 h-6 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
            </div>
          ) : activities.length > 0 ? (
            <div className="space-y-2">
              {activities.map((activity) => {
                const isMs = getIsMilestone(activity);
                return (
                <div
                  key={activity.id}
                  className="flex items-center gap-4 p-3 rounded-lg transition-colors cursor-pointer hover:opacity-80"
                  style={{
                    backgroundColor: isMs ? '#faf5ff' : '#fafaf8',
                    borderLeft: `3px solid ${isMs ? '#a855f7' : '#209d9d'}`
                  }}
                  onClick={() => handleSelectActivity(activity)}
                >
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: isMs ? '#a855f7' : '#209d9d' }} />
                  <div className="flex-1">
                    <div className="text-sm font-medium" style={{ color: '#171717' }}>
                      {isMs && '◇ '}{activity.name}
                  </div>
                  <div className="text-xs" style={{ color: '#737373' }}>
                    {activity.plannedStartDate || '—'} → {activity.plannedEndDate || '—'} ({activity.estimatedHours}h)
                  </div>
                </div>
                {activity.isMilestone && (
                  <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: '#f3e8ff', color: '#7e22ce' }}>Milestone</span>
                )}
                <button
                  className="p-1.5 rounded hover:bg-gray-200 transition-colors"
                  style={{ color: '#737373' }}
                  onClick={(e) => { e.stopPropagation(); handleSelectActivity(activity); }}
                  title="Edit activity"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              </div>
            );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 rounded-lg" style={{ backgroundColor: '#fafaf8' }}>
            <svg className="w-10 h-10 mb-3" style={{ color: '#d4d4d4' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <p className="text-sm" style={{ color: '#737373' }}>No activities yet</p>
            <p className="text-xs mt-1" style={{ color: '#a3a3a3' }}>Click "Add Activity" to create the project schedule</p>
          </div>
        )}
        </div>
      </div>
      )}

      {/* Back Button */}
      <button
        onClick={() => navigate('/projects')}
        className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        style={{ backgroundColor: '#f5f5f5', color: '#525252' }}
      >
        ← Back to Projects
      </button>

      {/* Allocation Modal */}
      <AllocationModal
        open={showAllocModal}
        onClose={() => setShowAllocModal(false)}
        onSubmit={async (form) => {
          const allocations = form.months
            .filter((m: any) => m.hours > 0)
            .map((m: any) => ({ hcm: m.hcm, hours: m.hours }));
          if (allocations.length === 0) {
            throw new Error('At least one month must have hours allocated');
          }
          const { createBulkAllocations } = await import('@/api/allocations');
          await createBulkAllocations({
            resourceId: form.resourceId!,
            projectId: form.projectId!,
            allocations,
            notes: form.notes || undefined,
          });
        }}
        defaultProjectId={projectId}
        resources={allResources}
        projects={[{ id: projectId, name: project?.data?.name || '' }]}
      />
    </div>
  );
}