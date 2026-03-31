'use client';

import { useState, useEffect } from 'react';

interface ReportData {
  range: string;
  users: {
    total: number; new: number;
    vendors: number; pendingVendors: number;
    brands: number; pendingBrands: number;
    customers: number;
  };
  orders: {
    total: number; new: number;
    pending: number; processing: number; shipped: number; delivered: number;
  };
  revenue: { period: number; total: number; };
  charts: {
    dailyRevenue: { _id: string; revenue: number; count: number; }[];
    dailySignups: { _id: string; count: number; }[];
  };
  recentTransactions: {
    _id: string; transactionId: string; type: string;
    amount: number; status: string; description: string; createdAt: string;
  }[];
}

type Range = '7days' | '30days' | '90days' | 'year';

const TX_COLORS: Record<string, string> = {
  completed: 'bg-green-900/40 text-green-300',
  pending: 'bg-yellow-900/40 text-yellow-300',
  failed: 'bg-red-900/40 text-red-300',
  refunded: 'bg-gray-700 text-cool-gray-300',
};

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [range, setRange] = useState<Range>('30days');

  const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;

  useEffect(() => {
    setLoading(true); setError('');
    fetch(`/api/admin/reports?range=${range}`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setData(d.data); else setError(d.message || 'Failed'); })
      .catch(() => setError('Failed to load reports.'))
      .finally(() => setLoading(false));
  }, [range]);

  const fmt = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(2)}`;

  if (loading) return <div className="p-6 text-center py-20 text-cool-gray-500">Loading reports...</div>;
  if (error) return <div className="p-6"><div className="p-4 bg-red-900/20 border border-red-700 rounded-xl text-red-300 text-sm">{error}</div></div>;
  if (!data) return null;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports & Analytics</h1>
          <p className="text-cool-gray-400 text-sm mt-1">Platform-wide performance overview</p>
        </div>
        <select value={range} onChange={e => setRange(e.target.value as Range)}
          className="px-4 py-2 bg-charcoal-700 border border-charcoal-600 text-white rounded-lg text-sm outline-none focus:ring-2 focus:ring-gold-500">
          <option value="7days">Last 7 Days</option>
          <option value="30days">Last 30 Days</option>
          <option value="90days">Last 90 Days</option>
          <option value="year">Last Year</option>
        </select>
      </div>

      {/* Revenue Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-charcoal-800 border border-gold-800/40 rounded-xl p-5">
          <div className="text-xs text-gold-400 font-semibold uppercase tracking-wide">Period Revenue</div>
          <div className="text-3xl font-bold text-gold-300 mt-1">{fmt(data.revenue.period)}</div>
          <div className="text-xs text-cool-gray-500 mt-1">Completed transactions</div>
        </div>
        <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5">
          <div className="text-xs text-cool-gray-400 font-semibold uppercase tracking-wide">All-Time Revenue</div>
          <div className="text-3xl font-bold text-white mt-1">{fmt(data.revenue.total)}</div>
          <div className="text-xs text-cool-gray-500 mt-1">Since launch</div>
        </div>
        <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5">
          <div className="text-xs text-cool-gray-400 font-semibold uppercase tracking-wide">New Orders</div>
          <div className="text-3xl font-bold text-blue-300 mt-1">{data.orders.new}</div>
          <div className="text-xs text-cool-gray-500 mt-1">of {data.orders.total} total</div>
        </div>
        <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5">
          <div className="text-xs text-cool-gray-400 font-semibold uppercase tracking-wide">New Users</div>
          <div className="text-3xl font-bold text-purple-300 mt-1">{data.users.new}</div>
          <div className="text-xs text-cool-gray-500 mt-1">of {data.users.total} total</div>
        </div>
      </div>

      {/* User Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
        <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5">
          <h3 className="text-sm font-bold text-white mb-4">User Breakdown</h3>
          <div className="space-y-3">
            {[
              { label: 'Customers', value: data.users.customers, color: 'text-blue-300' },
              { label: 'Vendors', value: data.users.vendors, sub: `${data.users.pendingVendors} pending`, color: 'text-purple-300' },
              { label: 'Brands', value: data.users.brands, sub: `${data.users.pendingBrands} pending`, color: 'text-gold-400' },
            ].map(({ label, value, sub, color }) => (
              <div key={label} className="flex items-center justify-between p-3 bg-charcoal-700 rounded-lg">
                <span className="text-cool-gray-300 text-sm">{label}</span>
                <div className="text-right">
                  <span className={`text-lg font-bold ${color}`}>{value}</span>
                  {sub && <div className="text-xs text-cool-gray-500">{sub}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5">
          <h3 className="text-sm font-bold text-white mb-4">Order Status</h3>
          <div className="space-y-3">
            {[
              { label: 'Pending', value: data.orders.pending, color: 'text-yellow-300' },
              { label: 'Processing', value: data.orders.processing, color: 'text-blue-300' },
              { label: 'Shipped', value: data.orders.shipped, color: 'text-purple-300' },
              { label: 'Delivered', value: data.orders.delivered, color: 'text-green-300' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between p-3 bg-charcoal-700 rounded-lg">
                <span className="text-cool-gray-300 text-sm">{label}</span>
                <span className={`text-lg font-bold ${color}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Daily Revenue Chart (text-based) */}
      {data.charts.dailyRevenue.length > 0 && (
        <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5 mb-6">
          <h3 className="text-sm font-bold text-white mb-4">Daily Revenue ({data.charts.dailyRevenue.length} days)</h3>
          <div className="overflow-x-auto">
            <div className="flex items-end gap-1 h-24 min-w-0">
              {data.charts.dailyRevenue.map(d => {
                const max = Math.max(...data.charts.dailyRevenue.map(x => x.revenue), 1);
                const h = Math.round((d.revenue / max) * 100);
                return (
                  <div key={d._id} className="flex-1 flex flex-col items-center gap-0.5 min-w-[8px]" title={`${d._id}: $${d.revenue.toFixed(2)}`}>
                    <div className="w-full bg-gold-600/70 rounded-sm" style={{ height: `${h}%` }} />
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex justify-between text-xs text-cool-gray-500 mt-1">
            <span>{data.charts.dailyRevenue[0]?._id}</span>
            <span>{data.charts.dailyRevenue[data.charts.dailyRevenue.length - 1]?._id}</span>
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5">
        <h3 className="text-sm font-bold text-white mb-4">Recent Transactions</h3>
        {data.recentTransactions.length === 0 ? (
          <p className="text-cool-gray-500 text-sm text-center py-6">No transactions yet.</p>
        ) : (
          <div className="space-y-2">
            {data.recentTransactions.map(tx => (
              <div key={tx._id} className="flex items-center justify-between p-3 bg-charcoal-700 rounded-lg">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-medium font-mono">{tx.transactionId}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${TX_COLORS[tx.status] || ''}`}>{tx.status}</span>
                  </div>
                  <div className="text-xs text-cool-gray-400 truncate mt-0.5">{tx.description}</div>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <div className="text-white font-bold text-sm">${tx.amount.toFixed(2)}</div>
                  <div className="text-xs text-cool-gray-500">{new Date(tx.createdAt).toLocaleDateString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
