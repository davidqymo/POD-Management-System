import { useState } from 'react'
import type { ProjectActual, Resource } from '../../types'

interface ActualGridProps {
  actuals: ProjectActual[]
  resources: Resource[]
  onSave: (resourceId: number, monthlyData: Record<string, number>) => Promise<void>
  onDelete: (id: number) => Promise<void>
  onAddResource: (resourceId: number) => void
}

const MONTHS = [
  { key: '202512', label: 'Dec' },
  { key: '202601', label: 'Jan' },
  { key: '202602', label: 'Feb' },
  { key: '202603', label: 'Mar' },
  { key: '202604', label: 'Apr' },
  { key: '202605', label: 'May' },
  { key: '202606', label: 'Jun' },
  { key: '202607', label: 'Jul' },
  { key: '202608', label: 'Aug' },
  { key: '202609', label: 'Sep' },
  { key: '202610', label: 'Oct' },
  { key: '202611', label: 'Nov' },
]

export default function ActualGrid({ actuals, resources, onSave, onDelete, onAddResource }: ActualGridProps) {
  const [editData, setEditData] = useState<Record<number, Record<string, string>>>({})
  const [saving, setSaving] = useState<number | null>(null)

  const getValue = (actual: ProjectActual, monthKey: string): string => {
    return editData[actual.id]?.[monthKey] ?? String(actual.monthlyData[monthKey] ?? '')
  }

  const handleChange = (actualId: number, monthKey: string, value: string) => {
    setEditData((prev) => ({
      ...prev,
      [actualId]: {
        ...prev[actualId],
        [monthKey]: value,
      },
    }))
  }

  const handleSave = async (actual: ProjectActual) => {
    setSaving(actual.id)
    try {
      const monthlyData: Record<string, number> = {}
      MONTHS.forEach(({ key }) => {
        const val = getValue(actual, key)
        if (val !== '' && !isNaN(Number(val))) {
          monthlyData[key] = Number(val)
        }
      })
      await onSave(actual.resourceId, monthlyData)
      setEditData((prev) => {
        const next = { ...prev }
        delete next[actual.id]
        return next
      })
    } finally {
      setSaving(null)
    }
  }

  const hasChanges = (actual: ProjectActual): boolean => {
    return MONTHS.some(({ key }) => {
      const current = String(actual.monthlyData[key] ?? '')
      const edited = getValue(actual, key)
      return current !== edited && edited !== ''
    })
  }

  // Build rows from actuals + resources not yet added
  const actualsMap = new Map(actuals.map((a) => [a.resourceId, a]))
  const availableResources = resources.filter((r) => !actualsMap.has(r.id))

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-gray-600">Resource</th>
            {MONTHS.map(({ key, label }) => (
              <th key={key} className="px-2 py-2 text-center font-medium text-gray-600 w-20">
                {label}
              </th>
            ))}
            <th className="px-3 py-2 text-center font-medium text-gray-600 w-32">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {actuals.map((actual) => (
            <tr key={actual.id} className="hover:bg-gray-50">
              <td className="px-3 py-2">
                <div className="font-medium">{actual.resourceName || 'Unknown'}</div>
                <div className="text-xs text-gray-500">{actual.resourceExternalId}</div>
              </td>
              {MONTHS.map(({ key }) => (
                <td key={key} className="px-1 py-1">
                  <input
                    type="number"
                    step="0.1"
                    value={getValue(actual, key)}
                    onChange={(e) => handleChange(actual.id, key, e.target.value)}
                    className="w-full rounded border border-gray-200 px-2 py-1 text-center text-sm"
                    placeholder="0"
                  />
                </td>
              ))}
              <td className="px-2 py-1 text-center">
                {hasChanges(actual) ? (
                  <button
                    onClick={() => handleSave(actual)}
                    disabled={saving === actual.id}
                    className="rounded bg-primary-600 px-2 py-1 text-xs text-white hover:bg-primary-700 disabled:opacity-50"
                  >
                    {saving === actual.id ? 'Saving...' : 'Save'}
                  </button>
                ) : (
                  <button
                    onClick={() => onDelete(actual.id)}
                    className="rounded text-red-600 hover:text-red-800 text-xs"
                  >
                    Delete
                  </button>
                )}
              </td>
            </tr>
          ))}
          {availableResources.length > 0 && (
            <tr className="bg-gray-50">
              <td className="px-3 py-2">
                <select
                  onChange={(e) => {
                    if (e.target.value) onAddResource(Number(e.target.value))
                  }}
                  className="rounded border border-gray-200 px-2 py-1 text-sm"
                  defaultValue=""
                >
                  <option value="">+ Add Resource</option>
                  {availableResources.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.externalId})
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
  )
}