import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi, activitiesApi, Activity } from '../../api/projects';
import { listAllocations } from '@/api/allocations';
import { GanttChart } from '../../components/project/GanttChart';

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
  const [scheduleView, setScheduleView] = useState<'list' | 'gantt'>('list');
  const [activeTab, setActiveTab] = useState<'summary' | 'resources' | 'schedule'>('resources');
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
  const [activityEditForm, setActivityEditForm] = useState({
    name: '',
    description: '',
    plannedStartDate: '',
    plannedEndDate: '',
    estimatedHours: '',
    isMilestone: false,
    sequence: 0,
  });

  // Fetch project data
  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.get(projectId),
    enabled: !!projectId,
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
    <div className="max-w-4xl space-y-6 p-6">
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
          <h3 className="text-lg font-semibold">Resources Allocated to This Project</h3>
          {allocationsLoading ? (
            <div className="flex items-center justify-center py-8"><div className="w-6 h-6 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin" /></div>
          ) : !allocationsData || allocationsData.length === 0 ? (
            <div className="p-8 text-center text-gray-500 rounded-lg border border-gray-200">No resources allocated to this project yet.</div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50"><tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Resource</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Week</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Hours</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Activity</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-200">
                  {allocationsData.map((alloc: any) => (
                    <tr key={alloc.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{alloc.resourceName}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{alloc.weekStartDate}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{alloc.hours}h</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{alloc.activityName || '—'}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-1 text-xs rounded-full ${alloc.status === 'APPROVED' ? 'bg-green-100 text-green-800' : alloc.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>{alloc.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'schedule' && (
      <div className="p-6 rounded-xl" style={{ backgroundColor: '#ffffff', border: '1px solid #e5e5e5' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold display-text" style={{ color: '#171717' }}>Schedule</h2>
            <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid #e5e5e5' }}>
              <button
                onClick={() => setScheduleView('list')}
                className="px-3 py-1.5 text-sm font-medium transition-colors"
                style={{
                  backgroundColor: scheduleView === 'list' ? '#209d9d' : '#ffffff',
                  color: scheduleView === 'list' ? 'white' : '#525252'
                }}
              >
                List
              </button>
              <button
                onClick={() => setScheduleView('gantt')}
                className="px-3 py-1.5 text-sm font-medium transition-colors"
                style={{
                  backgroundColor: scheduleView === 'gantt' ? '#209d9d' : '#ffffff',
                  color: scheduleView === 'gantt' ? 'white' : '#525252'
                }}
              >
                Gantt
              </button>
            </div>
          </div>
          {scheduleView === 'list' && (
            <button
              onClick={() => setShowActivityForm(!showActivityForm)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{ backgroundColor: '#209d9d', color: 'white' }}
            >
              {showActivityForm ? 'Cancel' : '+ Add Activity'}
            </button>
          )}
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

        {/* Activities List or Gantt View */}
        {scheduleView === 'gantt' ? (
          <GanttChart projectId={projectId} onActivityClick={(id) => {
            const activity = activities.find(a => a.id === id);
            if (activity) handleSelectActivity(activity);
          }} />
        ) : (
          <>
          {activitiesLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
          </div>
        ) : activities.length > 0 ? (
          <div className="space-y-2">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center gap-4 p-3 rounded-lg transition-colors cursor-pointer hover:opacity-80"
                style={{
                  backgroundColor: activity.isMilestone ? '#faf5ff' : '#fafaf8',
                  borderLeft: `3px solid ${activity.isMilestone ? '#a855f7' : '#209d9d'}`
                }}
                onClick={() => handleSelectActivity(activity)}
              >
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: activity.isMilestone ? '#a855f7' : '#209d9d' }} />
                <div className="flex-1">
                  <div className="text-sm font-medium" style={{ color: '#171717' }}>
                    {activity.isMilestone && '◇ '}{activity.name}
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
            ))}
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
          </>
        )}
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
    </div>
  );
}