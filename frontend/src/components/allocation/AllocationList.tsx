import { useState } from 'react';
import type { Allocation } from '@/api/allocations';

interface AllocationListProps {
  allocations: Allocation[];
  loading?: boolean;
  onSelectAllocation?: (allocation: Allocation) => void;
  selectedIds?: number[];
  onSelectId?: (id: number) => void;
}

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-emerald-100 text-emerald-800',
  REJECTED: 'bg-red-100 text-red-800',
  LOCKED: 'bg-gray-100 text-gray-800',
};

export default function AllocationList({
  allocations,
  loading,
  onSelectAllocation,
  selectedIds = [],
  onSelectId,
}: AllocationListProps) {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [projectFilter, setProjectFilter] = useState<string>('');

  const filteredAllocations = allocations.filter((a) => {
    if (statusFilter && a.status !== statusFilter) return false;
    if (projectFilter && a.projectName !== projectFilter) return false;
    return true;
  });

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading allocations...</div>;
  }

  if (allocations.length === 0) {
    return <div className="p-8 text-center text-gray-500">No allocations found</div>;
  }

  const uniqueProjects = [...new Set(allocations.map((a) => a.projectName))];

  return (
    <div className="w-full">
      {/* Filters */}
      <div className="flex gap-4 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>

        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
        >
          <option value="">All Projects</option>
          {uniqueProjects.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {onSelectId && (
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Select
                </th>
              )}
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Resource
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Project
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Week
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Hours
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {filteredAllocations.map((allocation) => (
              <tr
                key={allocation.id}
                className={`transition-colors hover:bg-gray-50 ${onSelectAllocation ? 'cursor-pointer' : ''}`}
                onClick={() => onSelectAllocation?.(allocation)}
              >
                {onSelectId && (
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(allocation.id)}
                      onChange={() => onSelectId(allocation.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-600"
                    />
                  </td>
                )}
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {allocation.resourceName}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {allocation.projectName}
                </td>
                <td className="px-4 py-3 text-sm font-mono text-gray-500">
                  {allocation.weekStartDate}
                </td>
                <td className="px-4 py-3 text-sm font-mono text-gray-600">
                  {allocation.hours}h
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                      statusColors[allocation.status]
                    }`}
                  >
                    {allocation.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}