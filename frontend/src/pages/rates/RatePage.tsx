import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ratesApi, CreateRateRequest } from '@/api/rates';

export default function RatePage() {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<CreateRateRequest>({
    costCenterId: '',
    billableTeamCode: '',
    monthlyRateK: 0,
    effectiveFrom: '',
    billable: true,
  });

  const { data: rates = [], isLoading, refetch } = useQuery({
    queryKey: ['rates'],
    queryFn: () => ratesApi.list(),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ratesApi.create(form);
      setShowModal(false);
      setForm({ costCenterId: '', billableTeamCode: '', monthlyRateK: 0, effectiveFrom: '', billable: true });
      refetch();
    } catch (error: any) {
      console.error('Failed to create rate:', error);
      alert(error.message || 'Failed to create rate. Make sure there are no gaps in the rate periods.');
    }
  };

  // Group rates by cost center + team
  const groupedRates = rates.reduce((acc: Record<string, any[]>, rate) => {
    const key = `${rate.costCenterId}|${rate.billableTeamCode}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(rate);
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span
            className="text-sm font-medium"
            style={{ color: '#78716c' }}
          >
            Monthly cost per HCM (K USD) by cost center and billable team
          </span>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white"
          style={{
            background: 'linear-gradient(135deg, #209d9d 0%, #0D4F4F 100%)',
            boxShadow: '0 2px 8px rgba(32, 158, 157, 0.25)'
          }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Rate
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
        </div>
      ) : rates.length === 0 ? (
        <div className="p-8 text-center text-gray-500 rounded-lg border border-gray-200">No rates found.</div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedRates).map(([key, rateList]) => {
            const [costCenterId, billableTeamCode] = key.split('|');
            const activeRate = rateList.find((r: any) => !r.effectiveTo);

            return (
              <div key={key} className="rounded-lg border border-gray-200 overflow-hidden">
                <div className="bg-gray-100 px-4 py-3 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-gray-900">{costCenterId}</span>
                    <span className="text-gray-400 mx-2">/</span>
                    <span className="text-sm text-gray-700">{billableTeamCode}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">
                    ${activeRate?.monthlyRateK}K/month
                  </span>
                </div>
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Effective From</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Effective To</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rateList.map((rate: any) => (
                      <tr key={rate.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-900">{rate.effectiveFrom}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{rate.effectiveTo || '—'}</td>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900 text-right">${rate.monthlyRateK}K</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Create New Rate</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cost Center ID</label>
                <input
                  type="text"
                  value={form.costCenterId}
                  onChange={(e) => setForm({ ...form, costCenterId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Billable Team Code</label>
                <input
                  type="text"
                  value={form.billableTeamCode}
                  onChange={(e) => setForm({ ...form, billableTeamCode: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Rate (K USD)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.monthlyRateK}
                  onChange={(e) => setForm({ ...form, monthlyRateK: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Effective From (YYYYMM)</label>
                <input
                  type="text"
                  value={form.effectiveFrom}
                  onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })}
                  placeholder="202601"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 text-white rounded-lg"
                  style={{ backgroundColor: '#209d9d' }}
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}