import type { Resource } from '../types'

export function exportToCSV(data: Resource[], filename: string = 'resources.csv') {
  const headers = ['External ID', 'Name', 'Cost Center', 'Billable Team Code', 'Skill', 'Level', 'Category', 'Status']
  const rows = data.map(r => [
    r.externalId,
    r.name,
    r.costCenterId,
    r.billableTeamCode,
    r.skill,
    r.level.toString(),
    r.category,
    r.status,
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell || ''}"`).join(',')),
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}