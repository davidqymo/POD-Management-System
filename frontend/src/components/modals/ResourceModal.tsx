import { useState, useEffect } from 'react'
import { FiSave } from 'react-icons/fi'
import Modal from '../common/Modal'
import type { Resource } from '../../types'
import { resourceCategories, resourceStatuses } from '../../api/resources'
import { useQuery } from '@tanstack/react-query'
import { listFiltersByCategory } from '../../api/admin'

// Default fallback options when API unavailable
const DEFAULT_COST_CENTER_OPTIONS = ['HT366', 'ENG-CC1', 'ENG-CC2', 'ENG-CC3', 'ENG-CC4', 'FIN-CC1', 'FIN-CC2', 'PM-CC1', 'PM-CC2'];
const DEFAULT_BILLABLE_TEAM_OPTIONS = ['ITDDEVPEM18', 'BTC-API', 'TC001', 'TC002'];
const DEFAULT_SKILL_OPTIONS = ['Java', 'React', 'Python', 'RPG', 'general', 'frontend', 'backend', 'qa', 'devops', 'design'];
const DEFAULT_LEVEL_OPTIONS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
const DEFAULT_L5_TEAM_OPTIONS = ['AM-LENDING', 'AM-PAYMENTS', 'AM-CORE'];

interface ResourceModalProps {
  open: boolean
  onClose: () => void
  onSave: (resource: Partial<Resource>) => Promise<void>
  editResource?: Resource | null
}

export default function ResourceModal({ open, onClose, onSave, editResource }: ResourceModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch filter options from admin API
  const { data: costCenterFilters = [] } = useQuery({
    queryKey: ['admin', 'filters', 'cost_center'],
    queryFn: () => listFiltersByCategory('cost_center'),
  });

  const { data: billableTeamFilters = [] } = useQuery({
    queryKey: ['admin', 'filters', 'billable_team'],
    queryFn: () => listFiltersByCategory('billable_team'),
  });

  const { data: skillFilters = [] } = useQuery({
    queryKey: ['admin', 'filters', 'skill'],
    queryFn: () => listFiltersByCategory('skill'),
  });

  const { data: levelFilters = [] } = useQuery({
    queryKey: ['admin', 'filters', 'level'],
    queryFn: () => listFiltersByCategory('level'),
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
  const SKILL_OPTIONS = skillFilters.length > 0
    ? skillFilters.map(f => f.value)
    : DEFAULT_SKILL_OPTIONS;
  const LEVEL_OPTIONS = levelFilters.length > 0
    ? levelFilters.map(f => f.value)
    : DEFAULT_LEVEL_OPTIONS;
  const L5_TEAM_OPTIONS = l5TeamFilters.length > 0
    ? l5TeamFilters.map(f => f.value)
    : DEFAULT_L5_TEAM_OPTIONS;

  const [form, setForm] = useState({
    externalId: '',
    name: '',
    costCenterId: '',
    billableTeamCode: '',
    category: 'PERMANENT',
    skill: '',
    level: 1,
    status: 'ACTIVE',
    functionalManager: '',
    l5TeamCode: '',
    isBillable: true,
  })

  useEffect(() => {
    if (editResource) {
      setForm({
        externalId: editResource.externalId || '',
        name: editResource.name || '',
        costCenterId: editResource.costCenterId || '',
        billableTeamCode: editResource.billableTeamCode || '',
        category: editResource.category || 'PERMANENT',
        skill: editResource.skill || '',
        level: editResource.level || 1,
        status: editResource.status || 'ACTIVE',
        functionalManager: editResource.functionalManager || '',
        l5TeamCode: editResource.l5TeamCode || '',
        isBillable: editResource.isBillable ?? true,
      })
    } else {
      setForm({
        externalId: '',
        name: '',
        costCenterId: '',
        billableTeamCode: '',
        category: 'PERMANENT',
        skill: '',
        level: 1,
        status: 'ACTIVE',
        functionalManager: '',
        l5TeamCode: '',
        isBillable: true,
      })
    }
    setError(null)
  }, [editResource, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await onSave(form as any)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save resource')
    } finally {
      setLoading(false)
    }
  }

  const updateField = (field: string, value: string | number | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  return (
    <Modal open={open} onClose={onClose} title={editResource ? 'Edit Resource' : 'Add Resource'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">External ID *</label>
            <input
              type="text"
              required
              value={form.externalId}
              onChange={e => updateField('externalId', e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-600 focus:ring-1 focus:ring-primary-600"
              placeholder="EMP001"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Name *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={e => updateField('name', e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-600 focus:ring-1 focus:ring-primary-600"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Cost Center *</label>
            <select
              required
              value={form.costCenterId}
              onChange={e => updateField('costCenterId', e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-600 focus:ring-1 focus:ring-primary-600"
            >
              <option value="">Select Cost Center</option>
              {COST_CENTER_OPTIONS.map(cc => (
                <option key={cc} value={cc}>{cc}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Billable Team Code *</label>
            <select
              required
              value={form.billableTeamCode}
              onChange={e => updateField('billableTeamCode', e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-600 focus:ring-1 focus:ring-primary-600"
            >
              <option value="">Select Billable Team</option>
              {BILLABLE_TEAM_OPTIONS.map(team => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Category</label>
            <select
              value={form.category}
              onChange={e => updateField('category', e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-600 focus:ring-1 focus:ring-primary-600"
            >
              {resourceCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select
              value={form.status}
              onChange={e => updateField('status', e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-600 focus:ring-1 focus:ring-primary-600"
            >
              {resourceStatuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Skill</label>
            <select
              value={form.skill}
              onChange={e => updateField('skill', e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-600 focus:ring-1 focus:ring-primary-600"
            >
              <option value="">Select Skill</option>
              {SKILL_OPTIONS.map(skill => (
                <option key={skill} value={skill}>{skill}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Level</label>
            <select
              value={String(form.level)}
              onChange={e => updateField('level', parseInt(e.target.value))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-600 focus:ring-1 focus:ring-primary-600"
            >
              {LEVEL_OPTIONS.map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700">Functional Manager</label>
            <input
              type="text"
              value={form.functionalManager}
              onChange={e => updateField('functionalManager', e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-600 focus:ring-1 focus:ring-primary-600"
              placeholder="Manager Name"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700">L5 Team Code</label>
            <select
              value={form.l5TeamCode}
              onChange={e => updateField('l5TeamCode', e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-600 focus:ring-1 focus:ring-primary-600"
            >
              <option value="">Select L5 Team</option>
              {L5_TEAM_OPTIONS.map(team => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>
          </div>

          <div className="col-span-2">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.isBillable}
                onChange={e => updateField('isBillable', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-600"
              />
              Billable
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            <FiSave className="h-4 w-4" />
            {loading ? 'Saving...' : 'Save Resource'}
          </button>
        </div>
      </form>
    </Modal>
  )
}