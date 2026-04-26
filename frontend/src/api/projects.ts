import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
});

export interface Project {
  id: number;
  requestId?: string;
  clarityId?: string;
  billableProductId?: string;
  name: string;
  description?: string;
  budgetTotalK: number;
  status: 'REQUESTED' | 'EXECUTING' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
  startDate?: string;
  endDate?: string;
  ownerUserId?: number;
  isActive: boolean;
  createdAt: string;
}

export interface Activity {
  id: number;
  name: string;
  description?: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  estimatedHours: number;
  actualHours?: number;
  isMilestone: boolean;
  sequence: number;
}

export interface GanttData {
  projectId: number;
  activities: {
    id: number;
    name: string;
    startDate?: string;
    endDate?: string;
    estimatedHours: number;
    durationDays: number;
    earlyStart: number;
    earlyFinish: number;
    lateStart: number;
    lateFinish: number;
    isCritical: boolean;
    isMilestone: boolean;
  }[];
  links: { from: number; to: number; type: string }[];
  criticalPath: number[];
  totalDurationDays: number;
}

export const projectsApi = {
  list: (params?: { page?: number; size?: number; status?: string }) =>
    api.get<{ content: Project[]; totalElements: number; totalPages: number; last: boolean }>('/projects', { params }),

  get: (id: number) => api.get<Project>(`/projects/${id}`),

  create: (data: Partial<Project>) => api.post<Project>('/projects', data),

  update: (id: number, data: Partial<Project>) => api.patch<Project>(`/projects/${id}`, data),

  delete: (id: number) => api.delete(`/projects/${id}`),

  transitionStatus: (id: number, status: string) =>
    api.patch<Project>(`/projects/${id}/status`, { status }),

  start: (id: number) => api.post<Project>(`/projects/${id}/start`),

  hold: (id: number) => api.post<Project>(`/projects/${id}/hold`),

  reactivate: (id: number) => api.post<Project>(`/projects/${id}/reactivate`),

  getGantt: (id: number) => api.get<GanttData>(`/projects/${id}/gantt`),
};

export const activitiesApi = {
  list: (projectId: number) =>
    api.get<Activity[]>(`/projects/${projectId}/activities`),

  create: (projectId: number, data: Partial<Activity>) =>
    api.post<Activity>(`/projects/${projectId}/activities`, data),

  update: (projectId: number, activityId: number, data: Partial<Activity>) =>
    api.patch<Activity>(`/projects/${projectId}/activities/${activityId}`, data),

  delete: (projectId: number, activityId: number) =>
    api.delete(`/projects/${projectId}/activities/${activityId}`),

  addDependency: (projectId: number, predecessorId: number, successorId: number, dependencyType: string = 'FS') =>
    api.post(`/projects/${projectId}/activities/dependencies`, {
      predecessorId,
      successorId,
      dependencyType,
    }),

  removeDependency: (projectId: number, predecessorId: number, successorId: number) =>
    api.delete(`/projects/${projectId}/activities/dependencies`, {
      data: { predecessorId, successorId },
    }),
};