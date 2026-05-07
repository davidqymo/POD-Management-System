import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiArrowLeft, FiSave } from 'react-icons/fi'
import { useMutation, useQuery } from '@tanstack/react-query'
import { projectsApi } from '../../api/projects'
import { listFiltersByCategory } from '../../api/admin'

// Default fallback options when API unavailable
const DEFAULT_BILLABLE_TEAM_OPTIONS = ['ITDDEVPEM18', 'BTC-API', 'TC001', 'TC002'];

const PROJECT_STATUS_OPTIONS = [
  { value: 'REQUESTED', label: 'Requested' },
  { value: 'EXECUTING', label: 'Executing' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

export default function ProjectForm() {
  const navigate = useNavigate()

  // Fetch filter options from admin API
  const { data: billableTeamFilters = [] } = useQuery({
    queryKey: ['admin', 'filters', 'billable_team'],
    queryFn: () => listFiltersByCategory('billable_team'),
  });

  // Derive options - use API data or fallbacks
  const BILLABLE_TEAM_OPTIONS = billableTeamFilters.length > 0
    ? billableTeamFilters.map(f => f.value)
    : DEFAULT_BILLABLE_TEAM_OPTIONS;

  const [formData, setFormData] = useState<{
    name: string
    requestId: string
    clarityId: string
    billableProductId: string
    budgetTotalK: string
    description: string
    status: 'REQUESTED' | 'EXECUTING' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED'
    startDate: string
    endDate: string
  }>({
    name: '',
    requestId: '',
    clarityId: '',
    billableProductId: '',
    budgetTotalK: '',
    description: '',
    status: 'REQUESTED',
    startDate: '',
    endDate: '',
  })

  const createMutation = useMutation({
    mutationFn: projectsApi.create,
    onSuccess: () => {
      navigate('/projects')
    },
    onError: (error) => {
      console.error('Failed to create project:', error)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate({
      name: formData.name,
      requestId: formData.requestId,
      clarityId: formData.clarityId,
      billableProductId: formData.billableProductId,
      budgetTotalK: parseFloat(formData.budgetTotalK) || 0,
      description: formData.description,
      status: formData.status,
      startDate: formData.startDate || undefined,
      endDate: formData.endDate || undefined,
    })
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/projects')}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
        >
          <FiArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">New Project</h1>
          <p className="text-sm text-gray-500">Create a new project in the system</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white p-6 space-y-5">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Project Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-600 focus:ring-1 focus:ring-primary-600"
            placeholder="Enter project name"
          />
        </div>

        {/* Request ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Request ID</label>
          <input
            type="text"
            name="requestId"
            value={formData.requestId}
            onChange={handleChange}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-600 focus:ring-1 focus:ring-primary-600"
            placeholder="e.g., PRJ-2026-001"
          />
        </div>

        {/* Clarity ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Clarity ID</label>
          <input
            type="text"
            name="clarityId"
            value={formData.clarityId}
            onChange={handleChange}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-600 focus:ring-1 focus:ring-primary-600"
            placeholder="e.g., CLARITY-12345"
          />
        </div>

        {/* Billable Product ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Billable Product ID</label>
          <select
            name="billableProductId"
            value={formData.billableProductId}
            onChange={handleChange}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-600 focus:ring-1 focus:ring-primary-600"
          >
            <option value="">Select Billable Team</option>
            {BILLABLE_TEAM_OPTIONS.map(team => (
              <option key={team} value={team}>{team}</option>
            ))}
          </select>
        </div>

        {/* Budget */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Budget (K USD) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="budgetTotalK"
            value={formData.budgetTotalK}
            onChange={handleChange}
            required
            min="0"
            step="0.01"
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-600 focus:ring-1 focus:ring-primary-600"
            placeholder="e.g., 50.00"
          />
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-600 focus:ring-1 focus:ring-primary-600"
          >
            {PROJECT_STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-600 focus:ring-1 focus:ring-primary-600"
            placeholder="Project description..."
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Start Date</label>
            <input
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-600 focus:ring-1 focus:ring-primary-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">End Date</label>
            <input
              type="date"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-600 focus:ring-1 focus:ring-primary-600"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            <FiSave className="h-4 w-4" />
            {createMutation.isPending ? 'Saving...' : 'Save Project'}
          </button>
        </div>
      </form>
    </div>
  )
}