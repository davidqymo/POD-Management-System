import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listScrollNotices,
  createScrollNotice,
  updateScrollNotice,
  deleteScrollNotice,
  updateScrollNoticeStatus,
  ScrollNotice,
  SPEED_LABELS,
  DIRECTION_LABELS,
  STATUS_LABELS,
} from '../../api/scrollNotice'
import Modal from '../../components/common/Modal'

export default function AdminScrollNotices() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(0)
  const [keyword, setKeyword] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingNotice, setEditingNotice] = useState<ScrollNotice | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    content: '',
    speed: 2,
    direction: 1,
    status: 1,
    link: '',
    remark: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['scrollNotices', page, keyword],
    queryFn: () => listScrollNotices({ page, size: 10, keyword: keyword || undefined }),
  })

  const createMutation = useMutation({
    mutationFn: createScrollNotice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scrollNotices'] })
      setShowAddModal(false)
      resetForm()
    },
    onError: (error: Error) => {
      alert('Failed to create: ' + error.message)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: typeof formData }) =>
      updateScrollNotice(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scrollNotices'] })
      setEditingNotice(null)
      resetForm()
    },
    onError: (error: Error) => {
      alert('Failed to update: ' + error.message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteScrollNotice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scrollNotices'] })
      setDeletingId(null)
    },
    onError: (error: Error) => {
      alert('Failed to delete: ' + error.message)
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: number }) =>
      updateScrollNoticeStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scrollNotices'] })
    },
    onError: (error: Error) => {
      alert('Failed to update status: ' + error.message)
    },
  })

  const resetForm = () => {
    setFormData({
      content: '',
      speed: 2,
      direction: 1,
      status: 1,
      link: '',
      remark: '',
    })
  }

  const isValidUrl = (url: string): boolean => {
    if (!url) return true // Empty is allowed
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  const handleSubmit = () => {
    if (!formData.content.trim()) return
    if (formData.link && !isValidUrl(formData.link)) {
      alert('Please enter a valid URL (e.g., https://example.com)')
      return
    }
    createMutation.mutate(formData)
  }

  const handleEdit = () => {
    if (!editingNotice || !formData.content.trim()) return
    if (formData.link && !isValidUrl(formData.link)) {
      alert('Please enter a valid URL (e.g., https://example.com)')
      return
    }
    updateMutation.mutate({ id: editingNotice.id, data: formData })
  }

  const openEditModal = (notice: ScrollNotice) => {
    setEditingNotice(notice)
    setFormData({
      content: notice.content,
      speed: notice.speed,
      direction: notice.direction,
      status: notice.status,
      link: notice.link || '',
      remark: notice.remark || '',
    })
  }

  const truncateContent = (content: string, maxLength = 20) => {
    return content.length > maxLength ? content.substring(0, maxLength) + '...' : content
  }

  const notices = data?.content || []
  const totalPages = data?.totalPages || 0

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <span
            className="text-sm font-medium"
            style={{ color: '#78716c' }}
          >
            Manage scrolling announcements for frontend header
          </span>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
        >
          + Add Scroll Notice
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by content..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="w-full max-w-md px-4 py-2 border border-gray-200 rounded-lg"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">No</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Content</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Speed</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Direction</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">Loading...</td>
              </tr>
            ) : notices.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">No scroll notices found</td>
              </tr>
            ) : (
              notices.map((notice, index) => (
                <tr key={notice.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-500">{page * 10 + index + 1}</td>
                  <td className="px-4 py-3 text-sm">
                    <span title={notice.content}>{truncateContent(notice.content)}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{SPEED_LABELS[notice.speed as keyof typeof SPEED_LABELS]}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{DIRECTION_LABELS[notice.direction as keyof typeof DIRECTION_LABELS]}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => statusMutation.mutate({
                        id: notice.id,
                        status: notice.status === 1 ? 0 : 1,
                      })}
                      className={`px-2 py-1 text-xs rounded font-medium ${
                        notice.status === 1
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {STATUS_LABELS[notice.status as keyof typeof STATUS_LABELS]}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(notice.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openEditModal(notice)}
                      className="text-blue-600 hover:text-blue-800 text-sm mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeletingId(notice.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-3 py-1 text-gray-600">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page >= totalPages - 1}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Add Modal */}
      <Modal
        open={showAddModal}
        onClose={() => { setShowAddModal(false); resetForm() }}
        title="Add Scroll Notice"
        footer={
          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setShowAddModal(false); resetForm() }}
              className="px-4 py-2 border rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={createMutation.isPending || !formData.content.trim()}
              className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Adding...' : 'Submit'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value.slice(0, 200) })}
              maxLength={200}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Enter scroll notice content (max 200 chars)"
            />
            <div className="text-xs text-gray-500 mt-1">{formData.content.length}/200</div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Speed</label>
              <select
                value={formData.speed}
                onChange={(e) => setFormData({ ...formData, speed: Number(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value={1}>Slow (2px/frame)</option>
                <option value={2}>Medium (3px/frame)</option>
                <option value={3}>Fast (5px/frame)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Direction</label>
              <select
                value={formData.direction}
                onChange={(e) => setFormData({ ...formData, direction: Number(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value={1}>Right to Left</option>
                <option value={2}>Left to Right</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Link (optional)</label>
            <input
              type="text"
              value={formData.link}
              onChange={(e) => setFormData({ ...formData, link: e.target.value })}
              maxLength={500}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="https://example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Remark (optional)</label>
            <input
              type="text"
              value={formData.remark}
              onChange={(e) => setFormData({ ...formData, remark: e.target.value.slice(0, 100) })}
              maxLength={100}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Admin notes (not displayed on frontend)"
            />
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={!!editingNotice}
        onClose={() => { setEditingNotice(null); resetForm() }}
        title="Edit Scroll Notice"
        footer={
          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setEditingNotice(null); resetForm() }}
              className="px-4 py-2 border rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleEdit}
              disabled={updateMutation.isPending || !formData.content.trim()}
              className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value.slice(0, 200) })}
              maxLength={200}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Speed</label>
              <select
                value={formData.speed}
                onChange={(e) => setFormData({ ...formData, speed: Number(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value={1}>Slow (2px/frame)</option>
                <option value={2}>Medium (3px/frame)</option>
                <option value={3}>Fast (5px/frame)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Direction</label>
              <select
                value={formData.direction}
                onChange={(e) => setFormData({ ...formData, direction: Number(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value={1}>Right to Left</option>
                <option value={2}>Left to Right</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Link (optional)</label>
            <input
              type="text"
              value={formData.link}
              onChange={(e) => setFormData({ ...formData, link: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Remark (optional)</label>
            <input
              type="text"
              value={formData.remark}
              onChange={(e) => setFormData({ ...formData, remark: e.target.value.slice(0, 100) })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        open={!!deletingId}
        onClose={() => setDeletingId(null)}
        title="Confirm Delete"
        footer={
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setDeletingId(null)}
              className="px-4 py-2 border rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => deleteMutation.mutate(deletingId!)}
              disabled={deleteMutation.isPending}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
            </button>
          </div>
        }
      >
        <p className="text-gray-600">
          Are you sure you want to delete this scroll notice? This action cannot be recovered.
        </p>
      </Modal>
    </div>
  )
}