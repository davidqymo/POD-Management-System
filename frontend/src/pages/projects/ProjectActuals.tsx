import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FiUpload } from 'react-icons/fi'
import { projectsApi, type Project } from '../../api/projects'
import { listAllocations } from '@/api/allocations'
import { getActualsByClarityId, createOrUpdateActual, deleteActual } from '../../api/actuals'
import ImportActualsModal from '../../components/modals/ImportActualsModal'
import ActualGrid from '../../components/actuals/ActualGrid'
import type { Resource } from '../../types'
import { getResources } from '../../api/resources'

export default function ProjectActuals() {
  const queryClient = useQueryClient()
  const [selectedClarityId, setSelectedClarityId] = useState<string>('')
  const [importModalOpen, setImportModalOpen] = useState(false)

  // Fetch all projects for selector
  const { data: projectsData } = useQuery({
    queryKey: ['projects', 'all'],
    queryFn: () => projectsApi.list({ page: 0, size: 500 }),
  })
  const projects: Project[] = projectsData?.data?.content || []
  const selectedProject = projects.find((p) => p.clarityId === selectedClarityId)

  // Fetch allocations for selected project (to filter resources)
  const { data: allocationsData } = useQuery({
    queryKey: ['allocations', 'project', selectedProject?.id],
    queryFn: () => listAllocations({ projectId: selectedProject?.id }),
    enabled: !!selectedProject?.id,
  })

  // Fetch actuals for selected project
  const { data: actuals = [], isLoading: loadingActuals } = useQuery({
    queryKey: ['projectActuals', selectedClarityId],
    queryFn: () => getActualsByClarityId(selectedClarityId),
    enabled: !!selectedClarityId,
  })

  // Fetch all resources
  const { data: resourcesData } = useQuery({
    queryKey: ['resources', 'all'],
    queryFn: () => getResources({ page: 0, size: 500 }),
  })
  // Filter to only show resources allocated to this project
  const allocatedResourceIds = new Set(allocationsData?.map((a: any) => a.resourceId) || [])
  const resources: Resource[] = (resourcesData?.content || []).filter((r: Resource) => allocatedResourceIds.has(r.id))

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async ({ resourceId, monthlyData }: { resourceId: number; monthlyData: Record<string, number> }) => {
      const project = projects.find((p) => p.clarityId === selectedClarityId)
      await createOrUpdateActual(selectedClarityId, {
        resourceId,
        projectName: project?.name || '',
        monthlyData,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectActuals'] })
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await deleteActual(selectedClarityId, id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectActuals'] })
    },
  })

  // Add new resource
  const handleAddResource = async (resourceId: number) => {
    const emptyData: Record<string, number> = {}
    await saveMutation.mutateAsync({ resourceId, monthlyData: emptyData })
  }

  // Calculate total actual HCM
  const totalActualHCM = actuals.reduce((sum, a) =>
    sum + Object.values(a.monthlyData).reduce((s, v) => s + v, 0), 0
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Project Actuals</h1>
          <p className="text-sm text-gray-500">Track actual resource consumption vs budget</p>
        </div>
        <button
          onClick={() => setImportModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <FiUpload className="h-4 w-4" />
          Import CSV
        </button>
      </div>

      {/* Project Selector */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700">Select Project:</label>
        <select
          value={selectedClarityId}
          onChange={(e) => setSelectedClarityId(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        >
          <option value="">-- Select Project --</option>
          {projects.map((p) => (
            <option key={p.id} value={p.clarityId}>
              {p.name} ({p.clarityId})
            </option>
          ))}
        </select>
      </div>

      {/* Summary Bar */}
      {selectedProject && (
        <div className="rounded-lg bg-gray-50 p-4 flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">Project</div>
            <div className="text-lg font-semibold">{selectedProject.name}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Budget</div>
            <div className="text-lg font-semibold">${selectedProject.budgetTotalK}K</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Total Actual HCM</div>
            <div className="text-lg font-semibold">{totalActualHCM.toFixed(1)}</div>
          </div>
        </div>
      )}

      {/* Actual Grid */}
      {selectedClarityId && (
        <div>
          {loadingActuals ? (
            <div className="py-8 text-center text-gray-500">Loading...</div>
          ) : actuals.length === 0 && resources.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-gray-500">
              No data. Import a CSV or add resources manually.
            </div>
          ) : (
            <ActualGrid
              actuals={actuals}
              resources={resources}
              onSave={async (resourceId, monthlyData) => {
                await saveMutation.mutateAsync({ resourceId, monthlyData })
              }}
              onDelete={async (id) => {
                await deleteMutation.mutateAsync(id)
              }}
              onAddResource={handleAddResource}
            />
          )}
        </div>
      )}

      <ImportActualsModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['projectActuals'] })
        }}
      />
    </div>
  )
}