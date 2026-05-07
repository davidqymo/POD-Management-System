import { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import type { ConstraintViolation } from '@/api/allocations';

interface MonthHours {
  hcm: number;  // YYYYMM format
  label: string;
  hcmValue: number;  // HCM unit (1 HCM = 144 hours)
}

interface AllocationForm {
  resourceId: number | null;
  projectId: number | null;
  months: MonthHours[];
  notes: string;
}

interface AllocationModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (form: AllocationForm) => Promise<void>;
  resources?: Array<{ id: number; name: string }>;
  projects?: Array<{ id: number; name: string }>;
  defaultProjectId?: number;
  defaultResourceId?: number;
  disabledResourceSelection?: boolean;
}

function generateFiscalYearMonths(): MonthHours[] {
  const months: MonthHours[] = [];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0 = Jan

  // Previous Dec to current Nov (fiscal year)
  const startMonth = currentMonth === 11 ? 11 : (currentMonth + 1); // December
  const startYear = currentMonth === 11 ? currentYear - 1 : currentYear;

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let i = 0; i < 12; i++) {
    const monthIndex = (startMonth + i) % 12;
    const year = startYear + Math.floor((startMonth + i) / 12);
    const hcm = year * 100 + (monthIndex + 1);
    months.push({
      hcm,
      label: `${monthNames[monthIndex]} ${year}`,
      hcmValue: 0,
    });
  }

  return months;
}

export default function AllocationModal({
  open,
  onClose,
  onSubmit,
  resources = [],
  projects = [],
  defaultProjectId,
  defaultResourceId,
  disabledResourceSelection = false,
}: AllocationModalProps) {
  const [form, setForm] = useState<AllocationForm>({
    resourceId: null,
    projectId: null,
    months: generateFiscalYearMonths(),
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [violations, setViolations] = useState<ConstraintViolation[]>([]);

  useEffect(() => {
    if (open) {
      setForm({
        resourceId: defaultResourceId ?? null,
        projectId: defaultProjectId ?? null,
        months: generateFiscalYearMonths(),
        notes: '',
      });
      setViolations([]);
    }
  }, [open, defaultProjectId, defaultResourceId]);

  const handleHcmChange = (hcm: number, hcmValue: number) => {
    setForm(prev => ({
      ...prev,
      months: prev.months.map(m =>
        m.hcm === hcm ? { ...m, hcmValue: Math.max(0, hcmValue) } : m
      ),
    }));
  };

  const totalHcm = form.months.reduce((sum, m) => sum + m.hcmValue, 0);
  const totalHours = totalHcm * 144;
  const hasAllocation = totalHcm > 0;

  const handleSubmit = async () => {
    if (!form.resourceId || !form.projectId) {
      return;
    }
    const monthsWithHcm = form.months.filter(m => m.hcmValue > 0);
    if (monthsWithHcm.length === 0) {
      return;
    }
    setSubmitting(true);
    try {
      // Convert HCM to hours for API
      const submitData = {
        resourceId: form.resourceId,
        projectId: form.projectId,
        notes: form.notes,
        months: form.months.filter(m => m.hcmValue > 0).map(m => ({
          hcm: m.hcm,
          hours: m.hcmValue * 144,  // Convert HCM to hours
        })),
      };
      await onSubmit(submitData as any);
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
    if (code.includes('MONTHLY') || code.includes('BUDGET')) {
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

  const isValid = form.resourceId && form.projectId && hasAllocation;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Create Project-Level Allocation"
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-sm text-gray-500">
            {!isValid && 'Select resource, project and allocate HCM for at least one month'}
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
        {/* Info Banner */}
        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>Fiscal Year Allocation:</strong> Allocate HCM from Dec {new Date().getFullYear() - 1} to Nov {new Date().getFullYear()}.
            Enter HCM for each month. Max 1 HCM (144h) per resource per month.
          </p>
        </div>

        {/* Required Fields Section */}
        <div className="grid grid-cols-2 gap-5">
          {/* Resource Selection */}
          <div className="space-y-2">
            <label className="flex items-center gap-1 text-sm font-semibold text-gray-700">
              Resource <span className="text-red-500">*</span>
            </label>
            <select
              value={form.resourceId ?? ''}
              onChange={(e) => {
                if (!disabledResourceSelection) {
                  setForm(prev => ({ ...prev, resourceId: e.target.value ? Number(e.target.value) : null }));
                }
              }}
              disabled={disabledResourceSelection}
              className={`w-full px-3 py-2.5 text-sm border rounded-lg bg-white focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600 transition-colors ${disabledResourceSelection ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            >
              {disabledResourceSelection && defaultResourceId ? (
                <option value={defaultResourceId}>
                  {resources.find(r => r.id === defaultResourceId)?.name || `Resource ${defaultResourceId}`}
                </option>
              ) : (
                <>
                  <option value="">Select resource...</option>
                  {resources.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </>
              )}
            </select>
          </div>

          {/* Project Selection */}
          <div className="space-y-2">
            <label className="flex items-center gap-1 text-sm font-semibold text-gray-700">
              Project <span className="text-red-500">*</span>
            </label>
            <select
              value={form.projectId ?? ''}
              onChange={(e) => {
                setForm(prev => ({ ...prev, projectId: e.target.value ? Number(e.target.value) : null }));
              }}
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg bg-white focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600 transition-colors"
            >
              <option value="">Select project...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Monthly Allocation Table */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">
            Monthly Allocation (Fiscal Year)
          </label>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 w-1/2">Month</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">HCM</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700 w-20">Status</th>
                </tr>
              </thead>
              <tbody>
                {form.months.map((month) => (
                  <tr key={month.hcm} className="border-t border-gray-100">
                    <td className="px-4 py-3 text-gray-900">{month.label}</td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="0"
                        max="1"
                        step="0.25"
                        value={month.hcmValue || ''}
                        onChange={(e) => handleHcmChange(month.hcm, parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 text-right border border-gray-300 rounded-lg focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600 transition-colors"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {month.hcmValue > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Allocated
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t border-gray-200">
                <tr>
                  <td className="px-4 py-3 font-semibold text-gray-900">Total (FY{totalHcm > 0 ? new Date().getFullYear() : ''})</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-gray-900">
                    {totalHcm.toFixed(2)} HCM ({totalHours}h)
                  </td>
                  <td className="px-4 py-3 text-center">
                    {totalHcm > 1 ? (
                      <span className="text-red-600 text-xs font-bold">Over cap!</span>
                    ) : totalHcm > 0 ? (
                      <span className="text-emerald-600 text-xs font-bold">OK</span>
                    ) : null}
                  </td>
                </tr>
              </tfoot>
            </table>
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
        {hasAllocation && (
          <div className="p-4 rounded-lg border border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wide">Validation Info</h4>
            </div>
            <div className="text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Total Hours:</span>
                <span className="font-mono font-medium">{totalHours.toFixed(0)}h ({totalHcm.toFixed(2)} HCM)</span>
              </div>
              <div className="flex justify-between">
                <span>Monthly cap:</span>
                <span className="font-mono font-medium">144h / HCM</span>
              </div>
              <div className="flex justify-between">
                <span>Months allocated:</span>
                <span className="font-mono font-medium">{form.months.filter(m => m.hcmValue > 0).length}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}