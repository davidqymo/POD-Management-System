import { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import type { ConstraintViolation } from '@/api/allocations';
import { activitiesApi } from '@/api/projects';

interface CreateAllocationForm {
  resourceId: number | null;
  projectId: number | null;
  activityId: number | null;
  weekStartDate: string;
  hours: string;
  notes: string;
}

interface AllocationModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (form: CreateAllocationForm) => Promise<void>;
  resources?: Array<{ id: number; name: string }>;
  projects?: Array<{ id: number; name: string }>;
  defaultProjectId?: number;
  defaultResourceId?: number;
}

export default function AllocationModal({
  open,
  onClose,
  onSubmit,
  resources = [],
  projects = [],
  defaultProjectId,
  defaultResourceId,
}: AllocationModalProps) {
  const [form, setForm] = useState<CreateAllocationForm>({
    resourceId: null,
    projectId: null,
    activityId: null,
    weekStartDate: '',
    hours: '',
    notes: '',
  });
  const [activities, setActivities] = useState<Array<{ id: number; name: string }>>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [violations, setViolations] = useState<ConstraintViolation[]>([]);

  useEffect(() => {
    if (open) {
      setForm({
        resourceId: defaultResourceId ?? null,
        projectId: defaultProjectId ?? null,
        activityId: null,
        weekStartDate: '',
        hours: '',
        notes: '',
      });
      setActivities([]);
      setViolations([]);
    }
  }, [open, defaultProjectId, defaultResourceId]);

  // Load activities when project is selected
  useEffect(() => {
    if (form.projectId) {
      setLoadingActivities(true);
      activitiesApi.list(form.projectId)
        .then((data: any) => {
          setActivities(data || []);
          setForm(prev => ({ ...prev, activityId: null }));
        })
        .catch(() => {
          setActivities([]);
        })
        .finally(() => {
          setLoadingActivities(false);
        });
    } else {
      setActivities([]);
    }
  }, [form.projectId]);

  const handleSubmit = async () => {
    if (!form.resourceId || !form.projectId || !form.weekStartDate || !form.hours) {
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(form);
      onClose();
    } catch (error: any) {
      if (error.response?.data?.violations) {
        setViolations(error.response.data.violations);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const getViolationIcon = (code: string) => {
    if (code.includes('DAILY') || code.includes('MONTHLY') || code.includes('OVERTIME') || code.includes('PROJECT') || code.includes('BUDGET')) {
      return '✗';
    }
    if (code.includes('INVALID')) {
      return '⚠️';
    }
    return '✓';
  };

  const handleClose = () => {
    setViolations([]);
    onClose();
  };

  const isValid = form.resourceId && form.projectId && form.weekStartDate && form.hours;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Create Allocation"
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-sm text-gray-500">
            {!isValid && 'Fill required fields to create allocation'}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isValid || submitting}
              className="px-5 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {submitting ? 'Creating...' : 'Create Allocation'}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Required Fields Section */}
        <div className="grid grid-cols-2 gap-5">
          {/* Resource Selection */}
          <div className="space-y-2">
            <label className="flex items-center gap-1 text-sm font-semibold text-gray-700">
              Resource <span className="text-red-500">*</span>
            </label>
            <select
              value={form.resourceId ?? ''}
              onChange={(e) => setForm({ ...form, resourceId: e.target.value ? Number(e.target.value) : null })}
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg bg-white focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600 transition-colors"
            >
              <option value="">Select resource...</option>
              {resources.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          {/* Project Selection */}
          <div className="space-y-2">
            <label className="flex items-center gap-1 text-sm font-semibold text-gray-700">
              Project <span className="text-red-500">*</span>
            </label>
            <select
              value={form.projectId ?? ''}
              onChange={(e) => setForm({ ...form, projectId: e.target.value ? Number(e.target.value) : null })}
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg bg-white focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600 transition-colors"
            >
              <option value="">Select project...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Activity Selection */}
          <div className="space-y-2">
            <label className="flex items-center gap-1 text-sm font-semibold text-gray-700">
              Activity <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <select
              value={form.activityId ?? ''}
              onChange={(e) => setForm({ ...form, activityId: e.target.value ? Number(e.target.value) : null })}
              disabled={!form.projectId || loadingActivities}
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg bg-white focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600 transition-colors disabled:bg-gray-100 disabled:text-gray-400"
            >
              <option value="">Select activity (optional)...</option>
              {activities.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            {form.projectId && loadingActivities && (
              <p className="text-xs text-gray-400">Loading activities...</p>
            )}
          </div>

          {/* Week Start Date */}
          <div className="space-y-2">
            <label className="flex items-center gap-1 text-sm font-semibold text-gray-700">
              Week Start <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={form.weekStartDate}
              onChange={(e) => setForm({ ...form, weekStartDate: e.target.value })}
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600 transition-colors"
            />
          </div>

          {/* Hours */}
          <div className="space-y-2">
            <label className="flex items-center gap-1 text-sm font-semibold text-gray-700">
              Hours <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="0.5"
                max="80"
                step="0.5"
                value={form.hours}
                onChange={(e) => setForm({ ...form, hours: e.target.value })}
                className="w-full px-3 py-2.5 pr-10 text-sm border border-gray-300 rounded-lg focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600 transition-colors"
                placeholder="0.5 - 80 hours"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">h</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600 transition-colors resize-none"
            rows={3}
            placeholder="Optional notes about this allocation..."
          />
        </div>

        {/* Constraint Validation Panel */}
        {violations.length > 0 && (
          <div className="p-4 rounded-lg border border-red-200 bg-red-50">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h4 className="text-sm font-bold text-red-800">Constraint Violations</h4>
            </div>
            <ul className="space-y-2">
              {violations.map((v, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-red-700">
                  <span className="font-bold">{getViolationIcon(v.code)}</span>
                  <span>{v.message}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Validation hints */}
        {form.hours && (
          <div className="p-4 rounded-lg border border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wide">Validation Info</h4>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Daily average:</span>
                <span className="font-mono font-medium">{form.hours ? (Number(form.hours) / 5).toFixed(1) : 0}h/day</span>
              </div>
              <div className="flex justify-between">
                <span>Limit:</span>
                <span className="font-mono font-medium">10h/day</span>
              </div>
              <div className="flex justify-between">
                <span>Weekly hours:</span>
                <span className="font-mono font-medium">{form.hours || 0}h</span>
              </div>
              <div className="flex justify-between">
                <span>Monthly cap:</span>
                <span className="font-mono font-medium">144h/month</span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
              Project spread limit: 5 distinct projects max per month
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}