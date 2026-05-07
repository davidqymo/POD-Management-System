import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listFilters,
  createFilter,
  updateFilter,
  deleteFilter,
} from '../../api/admin';

export default function AdminFilters() {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [newValue, setNewValue] = useState('');
  const [newCategoryKey, setNewCategoryKey] = useState('');
  const [newCategoryLabel, setNewCategoryLabel] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryLabel, setEditCategoryLabel] = useState('');
  const [editCategoryDesc, setEditCategoryDesc] = useState('');

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

  const createCategoryMutation = useMutation({
    mutationFn: () => createFilter({
      category: newCategoryKey,
      value: newCategoryKey,
      description: newCategoryDesc,
      displayOrder: 0,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'filters'] });
      setNewCategoryKey('');
      setNewCategoryLabel('');
      setNewCategoryDesc('');
      setShowNewCategory(false);
      setSelectedCategory(newCategoryKey);
    },
  });

  // Extract unique categories from filters, or use defaults if none exist
  const categories = useMemo(() => {
    const existingCategories = [...new Set(filters.map(f => f.category))];
    if (existingCategories.length === 0) {
      // Default categories if none exist
      return [
        { key: 'skill', label: 'Skills', description: 'Resource technical skills' },
        { key: 'level', label: 'Levels', description: 'Resource level (1-5)' },
        { key: 'status', label: 'Status', description: 'Resource status' },
        { key: 'cost_center', label: 'Cost Centers', description: 'Cost center codes' },
        { key: 'l5_team', label: 'L5 Teams', description: 'L5 team codes' },
        { key: 'billable_team', label: 'Billable Teams', description: 'Billable team codes' },
      ];
    }
    // Convert existing categories to format with label = key (can be edited later)
    return existingCategories.map(cat => ({
      key: cat,
      label: cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: filters.find(f => f.category === cat)?.description || '',
    }));
  }, [filters]);

  // Auto-select first category if none selected
  useMemo(() => {
    if (!selectedCategory && categories.length > 0) {
      setSelectedCategory(categories[0].key);
    }
  }, [categories, selectedCategory]);

  const categoryFilters = filters.filter((f) => f.category === selectedCategory);

  const selectedCategoryInfo = categories.find(c => c.key === selectedCategory);

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
    if (confirm('Delete this value?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleCreateCategory = () => {
    if (!newCategoryKey.trim() || !newCategoryLabel.trim()) return;
    createCategoryMutation.mutate();
  };

  const handleEditCategory = (cat: { key: string; label: string; description: string }) => {
    setEditingCategory(cat.key);
    setEditCategoryLabel(cat.label);
    setEditCategoryDesc(cat.description);
  };

  const handleSaveCategory = () => {
    // Find the filter that represents this category and update it
    const categoryFilter = filters.find(f => f.category === editingCategory && f.value === editingCategory);
    if (categoryFilter) {
      updateMutation.mutate({
        id: categoryFilter.id,
        data: { value: editCategoryLabel, description: editCategoryDesc } as { value: string; description?: string }
      });
    }
    setEditingCategory(null);
    setEditCategoryLabel('');
    setEditCategoryDesc('');
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <span className="text-sm font-medium" style={{ color: '#78716c' }}>
          Define standard data values for dropdown selections
        </span>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((cat) => (
          <div key={cat.key} className="flex items-center gap-1">
            {editingCategory === cat.key ? (
              <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-300 rounded-lg px-2 py-1">
                <input
                  type="text"
                  value={editCategoryLabel}
                  onChange={(e) => setEditCategoryLabel(e.target.value)}
                  className="px-2 py-1 text-sm border border-gray-300 rounded w-28"
                  autoFocus
                />
                <button
                  onClick={handleSaveCategory}
                  className="text-emerald-600 hover:text-emerald-800 p-1"
                  title="Save"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <button
                  onClick={() => setEditingCategory(null)}
                  className="text-gray-500 hover:text-gray-700 p-1"
                  title="Cancel"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setSelectedCategory(cat.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedCategory === cat.key
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat.label}
              </button>
            )}
            {!editingCategory && (
              <button
                onClick={() => handleEditCategory(cat)}
                className="text-gray-400 hover:text-amber-600 p-1"
                title="Edit category"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            )}
          </div>
        ))}
        <button
          onClick={() => setShowNewCategory(true)}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-50 text-gray-500 hover:bg-gray-100 border border-dashed border-gray-300"
        >
          + New Category
        </button>
      </div>

      {/* New Category Modal */}
      {showNewCategory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Create New Category</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Key (ID)</label>
                <input
                  type="text"
                  value={newCategoryKey}
                  onChange={(e) => setNewCategoryKey(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                  placeholder="e.g., project_type"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">Unique identifier (use underscores)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display Label</label>
                <input
                  type="text"
                  value={newCategoryLabel}
                  onChange={(e) => setNewCategoryLabel(e.target.value)}
                  placeholder="e.g., Project Types"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newCategoryDesc}
                  onChange={(e) => setNewCategoryDesc(e.target.value)}
                  placeholder="Brief description of this category"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  rows={2}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowNewCategory(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCategory}
                disabled={!newCategoryKey.trim() || !newCategoryLabel.trim() || createCategoryMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {createCategoryMutation.isPending ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Values panel */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                {selectedCategoryInfo?.label || selectedCategory}
              </h2>
              <p className="text-sm text-gray-500">
                {selectedCategoryInfo?.description || 'Manage values for this category'}
              </p>
            </div>
            <span className="text-sm text-gray-400">
              {categoryFilters.length} value{categoryFilters.length !== 1 ? 's' : ''}
            </span>
          </div>
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
              {createMutation.isPending ? 'Adding...' : 'Add'}
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