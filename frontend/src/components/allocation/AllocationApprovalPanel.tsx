import { useState } from 'react';
import Modal from '../common/Modal';
import AllocationList from './AllocationList';
import type { Allocation, ApproveAllocationRequest } from '@/api/allocations';

interface AllocationApprovalPanelProps {
  allocations: Allocation[];
  loading?: boolean;
  onApprove: (request: ApproveAllocationRequest) => Promise<void>;
  onReject: (request: ApproveAllocationRequest) => Promise<void>;
  currentUserId: number;
}

export default function AllocationApprovalPanel({
  allocations,
  loading,
  onApprove,
  onReject,
  currentUserId,
}: AllocationApprovalPanelProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const pendingAllocations = allocations.filter((a) => a.status === 'PENDING');

  // Selection handler - not currently used but kept for potential future feature
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _unused_handleSelectId = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  void _unused_handleSelectId;

  const handleBulkApprove = async () => {
    setProcessing(true);
    try {
      for (const id of selectedIds) {
        await onApprove({
          allocationId: id,
          approverId: currentUserId,
          reason: 'Bulk approved',
        });
      }
      setSelectedIds([]);
    } catch (error) {
      console.error('Approve failed:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkReject = async () => {
    if (rejectReason.length < 10) {
      return;
    }
    setProcessing(true);
    try {
      for (const id of selectedIds) {
        await onReject({
          allocationId: id,
          approverId: currentUserId,
          reason: rejectReason,
        });
      }
      setSelectedIds([]);
      setRejectModalOpen(false);
      setRejectReason('');
    } catch (error) {
      console.error('Reject failed:', error);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Allocation Approvals</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {pendingAllocations.length} pending allocation{pendingAllocations.length !== 1 ? 's' : ''} awaiting review
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedIds(pendingAllocations.map((a) => a.id))}
            disabled={pendingAllocations.length === 0}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Select All
          </button>
          <button
            onClick={() => setSelectedIds([])}
            disabled={selectedIds.length === 0}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Selection Action Bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between p-4 rounded-lg bg-primary-50 border border-primary-200">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-100">
              <svg className="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-primary-900">
              {selectedIds.length} allocation{selectedIds.length !== 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkApprove}
              disabled={processing}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Approve
            </button>
            <button
              onClick={() => setRejectModalOpen(true)}
              disabled={processing}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Reject
            </button>
          </div>
        </div>
      )}

      {/* Pending allocations list */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <AllocationList
          allocations={pendingAllocations}
          loading={loading}
        />
      </div>

      {/* Reject Modal */}
      <Modal
        open={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Reject Allocation(s)"
        size="md"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-gray-500">
              {rejectReason.length < 10 ? 'Minimum 10 characters required' : `${selectedIds.length} allocation(s) will be rejected`}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkReject}
                disabled={rejectReason.length < 10 || processing}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {processing ? 'Rejecting...' : `Reject ${selectedIds.length} Allocation(s)`}
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Please provide a reason for rejecting {selectedIds.length} allocation{selectedIds.length !== 1 ? 's' : ''}. This will be visible to the resource owner.
          </p>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Reason <span className="text-red-500">*</span></label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600 transition-colors resize-none"
              rows={4}
              placeholder="Enter rejection reason (minimum 10 characters)..."
            />
            <div className="flex justify-end">
              <span className={`text-xs ${rejectReason.length >= 10 ? 'text-emerald-600' : 'text-gray-400'}`}>
                {rejectReason.length}/10 characters minimum
              </span>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}