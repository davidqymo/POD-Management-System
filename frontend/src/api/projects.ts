import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
});

export interface Project {
  id: number;
  requestId?: string;
  clarityId?: string;
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
  }[];
  links: { from: number; to: number; type: string }[];
  criticalPath: number[];
  totalDurationDays: number;
}

export const projectsApi = {
  list: (params?: { page?: number; size?: number }) =>
    api.get<{ content: Project[]; totalElements: number; totalPages: number }>('/projects', { params }),

  get: (id: number) => api.get<Project>(`/projects/${id}`),

  create: (data: Partial<Project>) => api.post<Project>('/projects', data),

  update: (id: number, data: Partial<Project>) => api.patch<Project>(`/projects/${id}`, data),

  transitionStatus: (id: number, status: string) =>
    api.patch<Project>(`/projects/${id}/status`, { status }),

  start: (id: number) => api.post<Project>(`/projects/${id}/start`),

  hold: (id: number) => api.post<Project>(`/projects/${id}/hold`),

  reactivate: (id: number) => api.post<Project>(`/projects/${id}/reactivate`),

  getGantt: (id: number) => api.get<GanttData>(`/projects/${id}/gantt`),
};
