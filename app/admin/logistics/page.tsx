'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { COURIERS } from '@/lib/couriers';

interface Provider {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  applicationStatus: 'none' | 'pending' | 'approved' | 'rejected';
  isActive: boolean;
  suspensionReason?: string;
  applicationNotes?: string;
  createdAt: string;
}

interface Counts { pending: number; approved: number; rejected: number; }

interface LiveOrder {
  id: string;
  customerName: string;
  shippingAddress: string;
  products: string[];
  total: number;
  status: 'processing' | 'shipped' | 'pending';
  assignedDriverName?: string;
  acceptedAt?: string;
  pickedUpAt?: string;
  courier: { id: string; name: string; icon: string; price: number };
  orderDate: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-900/40 text-yellow-300',
  approved: 'bg-green-900/40 text-green-300',
  rejected: 'bg-red-900/40 text-red-300',
  none: 'bg-charcoal-700 text-cool-gray-400',
};

export default function AdminLogisticsPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [counts, setCounts] = useState<Counts>({ pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selected, setSelected] = useState<Provider | null>(null);
  const [notes, setNotes] = useState('');
  const [action, setAction] = useState('');

  // ── Live deliveries state ─────────────────────────────────────────────
  const [liveOrders,  setLiveOrders]  = useState<LiveOrder[]>([]);
  const [courierStats, setCourierStats] = useState<Record<string, { orders: number; revenue: number }>>({});
  const [liveLoading, setLiveLoading] = useState(true);
  const [liveSummary, setLiveSummary] = useState({ total: 0, active: 0, queue: 0, delivered: 0 });

  const fetchLive = useCallback(async () => {
    try {
      const res  = await fetch('/api/admin/logistics/orders?type=active', { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      if (data.success) {
        setLiveOrders(data.data.orders ?? []);
        setCourierStats(data.data.courierStats ?? {});
        setLiveSummary(data.data.summary ?? { total: 0, active: 0, queue: 0, delivered: 0 });
      }
    } catch { /* silent — stale data stays visible */ }
    finally { setLiveLoading(false); }
  }, []);

  useEffect(() => {
    fetchLive();
    const interval = setInterval(fetchLive, 15_000);
    return () => clearInterval(interval);
  }, [fetchLive]);

  const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const fetchProviders = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const p = new URLSearchParams({
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(search && { search }),
      });
      const res = await fetch(`/api/admin/logistics?${p}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed');
      setProviders(data.data.providers);
      setCounts(data.data.counts);
    } catch { setError('Failed to load logistics providers.'); }
    finally { setLoading(false); }
  }, [statusFilter, search]);

  useEffect(() => { fetchProviders(); }, [fetchProviders]);

  const doAction = async () => {
    if (!selected) return;
    if (action === 'reject' && !notes.trim()) { showToast('Notes required for rejection'); return; }
    if (action === 'suspend' && !notes.trim()) { showToast('Reason required for suspension'); return; }
    setActionLoading(selected._id);
    try {
      const res = await fetch('/api/admin/logistics', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ providerId: selected._id, action, notes: notes.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed');
      showToast(data.message);
      setSelected(null); setNotes(''); setAction('');
      fetchProviders();
    } catch (e: unknown) { showToast(e instanceof Error ? e.message : 'Failed'); }
    finally { setActionLoading(null); }
  };

  const openAction = (provider: Provider, act: string) => {
    setSelected(provider); setAction(act); setNotes('');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-charcoal-800 border border-gold-600 text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-medium">
          {toast}
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Logistics Management</h1>
        <p className="text-cool-gray-400 text-sm mt-1">Manage all logistics provider accounts and applications</p>
      </div>

      {/* Counts */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { key: 'pending', label: '⏳ Pending', color: 'text-yellow-300', border: 'border-yellow-800/40' },
          { key: 'approved', label: '✅ Approved', color: 'text-green-300', border: 'border-green-800/40' },
          { key: 'rejected', label: '❌ Rejected', color: 'text-red-300', border: 'border-red-800/40' },
        ].map(({ key, label, color, border }) => (
          <button key={key} onClick={() => setStatusFilter(statusFilter === key ? 'all' : key)}
            className={`bg-charcoal-800 border ${border} rounded-xl p-4 text-center transition-all ${statusFilter === key ? 'ring-2 ring-gold-500' : ''}`}>
            <div className={`text-2xl font-bold ${color}`}>{counts[key as keyof Counts]}</div>
            <div className="text-xs text-cool-gray-400 mt-1">{label}</div>
          </button>
        ))}
      </div>

      {error && <div className="mb-4 p-4 bg-red-900/20 border border-red-700 rounded-xl text-red-300 text-sm">{error}</div>}

      {/* Filters */}
      <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <form onSubmit={e => { e.preventDefault(); setSearch(searchInput); }} className="flex gap-2 col-span-2">
            <input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Search by name or email..."
              className="flex-1 px-4 py-2 bg-charcoal-700 border border-charcoal-600 text-white placeholder-cool-gray-500 rounded-lg text-sm outline-none focus:ring-2 focus:ring-gold-500" />
            <button type="submit" className="px-3 py-2 bg-gold-600 hover:bg-gold-500 text-white rounded-lg text-sm font-semibold">Search</button>
          </form>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-charcoal-700 border border-charcoal-600 text-white rounded-lg text-sm outline-none focus:ring-2 focus:ring-gold-500">
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Provider list */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12 text-cool-gray-500">Loading providers...</div>
        ) : providers.length === 0 ? (
          <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl py-16 text-center">
            <div className="text-4xl mb-3">🚚</div>
            <p className="text-white font-semibold">No logistics providers found</p>
            <p className="text-cool-gray-400 text-sm mt-1">Try adjusting your filters.</p>
          </div>
        ) : providers.map(provider => (
          <div key={provider._id} className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="w-12 h-12 bg-green-900/30 rounded-xl flex items-center justify-center text-2xl shrink-0">🚚</div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-semibold">{provider.firstName} {provider.lastName}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[provider.applicationStatus]}`}>
                    {provider.applicationStatus}
                  </span>
                  {!provider.isActive && provider.applicationStatus === 'approved' && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-900/40 text-red-300">Suspended</span>
                  )}
                </div>
                <div className="text-cool-gray-400 text-sm mt-0.5 truncate">{provider.email}</div>
                <div className="text-cool-gray-500 text-xs mt-0.5">
                  Joined {new Date(provider.createdAt).toLocaleDateString()}
                  {provider.applicationNotes && <span className="ml-2 text-yellow-400">· {provider.applicationNotes}</span>}
                </div>
              </div>
            </div>
            <div className="flex gap-2 shrink-0 flex-wrap">
              {provider.applicationStatus === 'pending' && (
                <>
                  <button onClick={() => openAction(provider, 'approve')}
                    className="px-3 py-2 bg-green-700 hover:bg-green-600 text-white text-xs font-semibold rounded-lg transition-colors">
                    ✓ Approve
                  </button>
                  <button onClick={() => openAction(provider, 'reject')}
                    className="px-3 py-2 bg-red-800 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors">
                    ✕ Reject
                  </button>
                </>
              )}
              {provider.applicationStatus === 'approved' && provider.isActive && (
                <button onClick={() => openAction(provider, 'suspend')}
                  className="px-3 py-2 bg-orange-800 hover:bg-orange-700 text-white text-xs font-semibold rounded-lg transition-colors">
                  ⛔ Suspend
                </button>
              )}
              {provider.applicationStatus === 'approved' && !provider.isActive && (
                <button onClick={() => openAction(provider, 'unsuspend')}
                  className="px-3 py-2 bg-green-800 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors">
                  ✓ Unsuspend
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Live Deliveries Monitor ─────────────────────────────────────── */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white">📡 Live Deliveries</h2>
            <p className="text-cool-gray-400 text-xs mt-0.5">Active orders currently being delivered — refreshes every 15s</p>
          </div>
          <div className="flex gap-3 text-xs">
            <span className="px-2 py-1 bg-blue-900/40 text-blue-300 rounded-full">{liveSummary.active} active</span>
            <span className="px-2 py-1 bg-yellow-900/40 text-yellow-300 rounded-full">{liveSummary.queue} in queue</span>
            <span className="px-2 py-1 bg-green-900/40 text-green-300 rounded-full">{liveSummary.delivered} delivered</span>
          </div>
        </div>

        {liveLoading ? (
          <div className="text-center py-8 text-cool-gray-500">Loading live deliveries…</div>
        ) : liveOrders.length === 0 ? (
          <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl py-10 text-center">
            <div className="text-4xl mb-2">📤</div>
            <p className="text-white font-semibold">No active deliveries right now</p>
            <p className="text-cool-gray-400 text-xs mt-1">Orders in queue will appear here once a driver accepts them.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {liveOrders.map(order => (
              <div key={order.id} className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-4 flex flex-col sm:flex-row gap-4 sm:items-center">
                {/* Courier icon + order id */}
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-2xl">{order.courier.icon}</span>
                  <div>
                    <p className="text-white font-semibold text-sm">{order.id}</p>
                    <p className="text-cool-gray-400 text-xs">{order.courier.name}</p>
                  </div>
                </div>

                {/* Customer + address */}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{order.customerName}</p>
                  <p className="text-cool-gray-400 text-xs truncate">{order.shippingAddress}</p>
                  <p className="text-cool-gray-500 text-xs mt-0.5">{order.products.slice(0, 2).join(', ')}{order.products.length > 2 ? ` +${order.products.length - 2} more` : ''}</p>
                </div>

                {/* Driver + timestamps */}
                <div className="shrink-0 text-right">
                  {order.assignedDriverName ? (
                    <>
                      <p className="text-green-400 text-xs font-semibold">🚴 {order.assignedDriverName}</p>
                      {order.acceptedAt  && <p className="text-cool-gray-500 text-[10px]">Accepted {new Date(order.acceptedAt).toLocaleTimeString()}</p>}
                      {order.pickedUpAt  && <p className="text-cool-gray-500 text-[10px]">Picked up {new Date(order.pickedUpAt).toLocaleTimeString()}</p>}
                    </>
                  ) : (
                    <p className="text-yellow-400 text-xs">⏳ Awaiting driver</p>
                  )}
                </div>

                {/* Status badge */}
                <div className="shrink-0">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                    order.status === 'shipped'    ? 'bg-purple-900/40 text-purple-300' :
                    order.status === 'processing' ? 'bg-blue-900/40 text-blue-300' :
                                                    'bg-yellow-900/40 text-yellow-300'
                  }`}>
                    {order.status === 'processing' ? '✅ Accepted' : order.status === 'shipped' ? '📦 Picked Up' : order.status}
                  </span>
                  <p className="text-cool-gray-500 text-[10px] mt-1 text-right">${order.total.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Courier Analytics ────────────────────────────────────────── */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white">📦 Courier Tier Analytics</h2>
            <p className="text-cool-gray-400 text-xs mt-0.5">Order volume and revenue breakdown by courier tier</p>
          </div>
          <Link href="/admin/orders" className="text-xs text-gold-500 hover:text-gold-400 font-medium">View Orders →</Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {COURIERS.map((courier) => {
            const stats     = courierStats[courier.id] ?? { orders: 0, revenue: 0 };
            const realOrders  = stats.orders;
            const realRevenue = stats.revenue;
            const maxOrders   = Math.max(...Object.values(courierStats).map(s => s.orders), 1);
            const barPct      = Math.round((realOrders / maxOrders) * 100);
            return (
              <div key={courier.id} className="bg-charcoal-800 border border-charcoal-700 rounded-xl overflow-hidden">
                {/* Header */}
                <div className="bg-charcoal-900 px-4 py-3 flex items-center gap-3">
                  <span className="text-2xl select-none">{courier.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm leading-tight">{courier.name}</p>
                    <p className="text-charcoal-400 text-xs">{courier.carrier}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`font-bold text-sm ${courier.price === 0 ? 'text-green-400' : 'text-gold-400'}`}>
                      {courier.price === 0 ? 'FREE' : `$${courier.price.toFixed(2)}`}
                    </p>
                    <p className="text-charcoal-500 text-[10px]">per order</p>
                  </div>
                </div>
                {/* Stats */}
                <div className="px-4 py-3 space-y-3">
                  <div className="flex justify-between text-xs text-cool-gray-400">
                    <span>Orders this month</span>
                    <span className="text-white font-semibold">{realOrders}</span>
                  </div>
                  {/* Bar */}
                  <div className="h-2 bg-charcoal-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gold-600 rounded-full transition-all"
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-cool-gray-400">
                    <span>Revenue generated</span>
                    <span className={`font-semibold ${courier.price === 0 ? 'text-green-400' : 'text-gold-400'}`}>
                      {courier.price === 0 ? '—' : `$${realRevenue.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-cool-gray-400">
                    <span>Avg. delivery</span>
                    <span className="text-white font-semibold">{courier.deliveryDays}</span>
                  </div>
                </div>
                {/* Footer */}
                <div className="px-4 pb-3">
                  <Link
                    href={`/admin/orders?courier=${courier.id}`}
                    className="block w-full text-center py-1.5 bg-charcoal-700 hover:bg-charcoal-600 text-cool-gray-300 hover:text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    View {courier.name} orders →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-charcoal-800 border border-charcoal-700 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-charcoal-700">
              <div>
                <h2 className="text-lg font-bold text-white capitalize">{action} Provider</h2>
                <p className="text-cool-gray-400 text-xs mt-0.5">{selected.firstName} {selected.lastName} · {selected.email}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-cool-gray-400 hover:text-white text-2xl leading-none">×</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-cool-gray-400 mb-1.5">
                  {action === 'reject' ? 'Rejection reason (required)' : action === 'suspend' ? 'Suspension reason (required)' : 'Notes (optional)'}
                </label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Add notes..." rows={3}
                  className="w-full px-4 py-3 bg-charcoal-700 border border-charcoal-600 text-white placeholder-cool-gray-500 rounded-xl text-sm outline-none focus:ring-2 focus:ring-gold-500 resize-none" />
              </div>
              <button onClick={doAction} disabled={actionLoading === selected._id}
                className={`w-full py-3 font-semibold rounded-xl transition-colors disabled:opacity-50 text-white ${
                  action === 'approve' || action === 'unsuspend' ? 'bg-green-700 hover:bg-green-600' :
                  action === 'reject' || action === 'suspend' ? 'bg-red-800 hover:bg-red-700' : 'bg-gold-600 hover:bg-gold-500'
                }`}>
                {actionLoading === selected._id ? 'Processing...' : `Confirm ${action}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
