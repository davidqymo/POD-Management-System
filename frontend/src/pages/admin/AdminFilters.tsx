import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listFilters,
  createFilter,
  updateFilter,
  deleteFilter,
} from '../../api/admin';

const CATEGORIES = [
  { key: 'skill', label: 'Skills', description: 'Resource technical skills' },
  { key: 'level', label: 'Levels', description: 'Resource level (1-5)' },
  { key: 'status', label: 'Status', description: 'Resource status' },
  { key: 'cost_center', label: 'Cost Centers', description: 'Cost center codes' },
  { key: 'l5_team', label: 'L5 Teams', description: 'L5 team codes' },
  { key: 'billable_team', label: 'Billable Teams', description: 'Billable team codes' },
];

export default function AdminFilters() {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState('skill');
  const [newValue, setNewValue] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  const { data: filters = [], isLoading } = useQuery({
    queryKey: ['admin', 'filters'],
    queryFn: listFilters,
  });

  const createMutation = useMutation({
    mutationFn: createFilter,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'filters'] });
      setNewValue('');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { value: string } }) =>
      updateFilter(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'filters'] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFilter,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'filters'] });
    },
  });

  const categoryFilters = filters.filter((f) => f.category === selectedCategory);

  const handleCreate = () => {
    if (!newValue.trim()) return;
    createMutation.mutate({
      category: selectedCategory,
      value: newValue.trim(),
      displayOrder: categoryFilters.length + 1,
    });
  };

  const handleUpdate = (id: number) => {
    if (!editValue.trim()) return;
    updateMutation.mutate({ id, data: { value: editValue.trim() } });
  };

  const handleDelete = (id: number) => {
    if (confirm('Delete this filter value?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <span
          className="text-sm font-medium"
          style={{ color: '#78716c' }}
        >
          Define standard data values for dropdown selections
        </span>
      </div>

      <div className="flex gap-4 mb-6">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setSelectedCategory(cat.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedCategory === cat.key
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            {CATEGORIES.find((c) => c.key === selectedCategory)?.label}
          </h2>
          <p className="text-sm text-gray-500">
            {CATEGORIES.find((c) => c.key === selectedCategory)?.description}
          </p>
        </div>

        <div className="p-4">
          {/* Add new value */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="Add new value..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <button
              onClick={handleCreate}
              disabled={!newValue.trim() || createMutation.isPending}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>

          {/* Filter list */}
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : categoryFilters.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No values yet. Add one above.
            </div>
          ) : (
            <div className="space-y-2">
              {categoryFilters.map((filter) => (
                <div
                  key={filter.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {editingId === filter.id ? (
                    <div className="flex gap-2 flex-1">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUpdate(filter.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                      />
                      <button
                        onClick={() => handleUpdate(filter.id)}
                        className="text-emerald-600 hover:text-emerald-800"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="font-medium text-gray-700">{filter.value}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingId(filter.id);
                            setEditValue(filter.value);
                          }}
                          className="text-gray-400 hover:text-amber-600 p-1"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(filter.id)}
                          className="text-gray-400 hover:text-red-600 p-1"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}