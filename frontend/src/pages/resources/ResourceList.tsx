import { useState, useEffect, useMemo, useCallback } from 'react'
import { FiSearch, FiPlus, FiDownload, FiX } from 'react-icons/fi'
import DataTable from '../../components/common/DataTable'
import ImportModal from '../../components/modals/ImportModal'
import { useResources } from '../../hooks/useResources'
import type { Resource, ResourceFilters } from '../../types'

/* ─── Helpers ─────────────────────────────────────────── */

function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2)
}

const statusMeta: Record<string, { bg: string; text: string; label: string; dot: string }> = {
  ACTIVE: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Active', dot: 'bg-emerald-500' },
  ON_LEAVE: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'On Leave', dot: 'bg-amber-500' },
  TERMINATED: { bg: 'bg-gray-50', text: 'text-gray-500', label: 'Terminated', dot: 'bg-gray-400' },
}

/* ─── Sub-components ──────────────────────────────────── */

function StatusBadge(props: Readonly<{ status: string }>) {
  const { status } = props
  const meta = statusMeta[status] || statusMeta.TERMINATED
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${meta.bg} ${meta.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  )
}

function LevelDots(props: Readonly<{ level: number }>) {
  const { level } = props
  return (
    <span className="inline-flex items-center gap-[3px]" aria-label={`Level ${level}`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={`h-2 w-2 rounded-full transition-colors ${
            i < level ? 'bg-primary-600' : 'bg-gray-200'
          }`}
        />
      ))}
    </span>
  )
}

function ActiveFilters(props: Readonly<{
  search: string
  skill: string
  costCenter: string
  status: string
  onClear: () => void
  onRemove: (key: string) => void
}>) {
  const { search, skill, costCenter, status, onClear, onRemove } = props;
  const filters = [
    search && { key: 's', label: `Search: "${search}"` },
    skill && { key: 'skill', label: skill },
    costCenter && { key: 'cc', label: costCenter },
    status && { key: 'status', label: status },
  ].filter(Boolean) as { key: string; label: string }[]

  if (!filters.length) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      {filters.map((f) => (
        <span
          key={f.key}
          className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] font-medium text-gray-600"
        >
          {f.label}
          <button onClick={() => onRemove(f.key)} className="ml-0.5 text-gray-400 hover:text-gray-600" aria-label={`Remove ${f.label}`}>
            <FiX className="h-3 w-3" />
          </button>
        </span>
      ))}
      <button onClick={onClear} className="text-[11px] font-medium text-gray-400 underline-offset-2 hover:text-gray-600 hover:underline">
        Clear all
      </button>
    </div>
  )
}

/* ─── Page ─────────────────────────────────────────────── */

export default function ResourceList() {
  const [search, setSearch] = useState('')
  const [skill, setSkill] = useState('')
  const [costCenter, setCostCenter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showImport, setShowImport] = useState(false)

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState(search)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  // Build filters for the API query
  const filters: ResourceFilters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      skill: skill || undefined,
      costCenter: costCenter || undefined,
      status: statusFilter || undefined,
    }),
    [debouncedSearch, skill, costCenter, statusFilter],
  )

  // TanStack Query — data fetched from backend via useResources hook
  const { data: resources = [], isLoading } = useResources(filters)

  const handleReset = useCallback(() => {
    setSearch('')
    setSkill('')
    setCostCenter('')
    setStatusFilter('')
  }, [])

  const handleRemove = useCallback(
    (key: string) => {
      if (key === 's') setSearch('')
      else if (key === 'skill') setSkill('')
      else if (key === 'cc') setCostCenter('')
      else if (key === 'status') setStatusFilter('')
    },
    [],
  )

  const columns = [
    {
      key: 'name',
      header: 'Name',
      width: 'w-[260px]',
      render: (r: Resource) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[11px] font-semibold text-gray-500">
            {initials(r.name)}
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">{r.name}</div>
            <div className="text-[11px] text-gray-400">{r.externalId}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'costCenter',
      header: 'Cost Center',
      width: 'w-[140px]',
      render: (r: Resource) => <span className="text-sm text-gray-600">{r.costCenterId}</span>,
    },
    {
      key: 'skill',
      header: 'Skill',
      width: 'w-[140px]',
      render: (r: Resource) => <span className="text-sm text-gray-600">{r.skill}</span>,
    },
    {
      key: 'level',
      header: 'Level',
      width: 'w-[100px]',
      render: (r: Resource) => <LevelDots level={r.level} />,
    },
    {
      key: 'category',
      header: 'Category',
      width: 'w-[120px]',
      render: (r: Resource) => (
        <span className="text-sm text-gray-600">
          {(r.category as string).replaceAll('_', ' ')}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: 'w-[120px]',
      render: (r: Resource) => <StatusBadge status={r.status} />,
    },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">Resources</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {isLoading ? 'Loading...' : `${resources.length} ${resources.length === 1 ? 'resource' : 'resources'} in the system`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
            <FiDownload className="h-4 w-4" />
            Export
          </button>
          <button
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
            onClick={() => setShowImport(true)}
          >
            <FiPlus className="h-4 w-4" />
            Import CSV
          </button>
        </div>
      </div>

      {/* Filters bar */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, ID, or cost center..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 transition-colors focus:border-primary-600 focus:ring-1 focus:ring-primary-600"
            />
          </div>

          {/* Skill filter */}
          <select
            value={skill}
            onChange={(e) => setSkill(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white py-2 pl-3 pr-8 text-sm text-gray-700 outline-none transition-colors focus:border-primary-600 focus:ring-1 focus:ring-primary-600"
          >
            <option value="">All Skills</option>
            <option value="Engineer">Engineer</option>
            <option value="Designer">Designer</option>
            <option value="PM">PM</option>
            <option value="QA">QA</option>
          </select>

          {/* Cost Center */}
          <select
            value={costCenter}
            onChange={(e) => setCostCenter(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white py-2 pl-3 pr-8 text-sm text-gray-700 outline-none transition-colors focus:border-primary-600 focus:ring-1 focus:ring-primary-600"
          >
            <option value="">All Cost Centers</option>
            <option value="CC-ENG">CC-ENG</option>
            <option value="CC-DES">CC-DES</option>
            <option value="CC-PM">CC-PM</option>
          </select>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white py-2 pl-3 pr-8 text-sm text-gray-700 outline-none transition-colors focus:border-primary-600 focus:ring-1 focus:ring-primary-600"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="ON_LEAVE">On Leave</option>
            <option value="TERMINATED">Terminated</option>
          </select>
        </div>

        {/* Active filter tags */}
        <ActiveFilters
          search={search}
          skill={skill}
          costCenter={costCenter}
          status={statusFilter}
          onClear={handleReset}
          onRemove={handleRemove}
        />
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={resources}
        isLoading={isLoading}
        emptyMessage="No resources found matching your filters."
      />

      {/* Import Modal */}
      <ImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onImport={(_resources) => {
          setShowImport(false)
        }}
      />
    </div>
  )
}
