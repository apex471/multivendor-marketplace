'use client';

import { useState, useEffect, useCallback } from 'react';

interface Application {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  applicationStatus: 'pending' | 'approved' | 'rejected';
  applicationNotes?: string;
  createdAt: string;
}

interface Counts {
  vendors: number;
  brands: number;
  logistics: number;
}

export default function ApprovalsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [counts, setCounts] = useState<Counts>({ vendors: 0, brands: 0, logistics: 0 });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  // Filters
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('pending');

  // Review modal
  const [selected, setSelected] = useState<Application | null>(null);
  const [notes, setNotes] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };
  const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        ...(typeFilter !== 'all' && { type: typeFilter }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
      });
      const res = await fetch(`/api/admin/approvals?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setApplications(data.data.applications);
      setCounts(data.data.counts);
    } catch {
      setError('Failed to load applications.');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter]);

  useEffect(() => { fetchApplications(); }, [fetchApplications]);

  const doAction = async (userId: string, action: 'approve' | 'reject') => {
    if (action === 'reject' && !notes.trim()) {
      showToast('Please provide rejection notes'); return;
    }
    setActionLoading(userId);
    try {
      const res = await fetch('/api/admin/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ userId, action, notes: notes.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed');
      showToast(data.message);
      setSelected(null);
      setNotes('');
      fetchApplications();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const roleBadge = (role: string) => {
    const map: Record<string, string> = {
      vendor: 'bg-purple-900/40 text-purple-300',
      brand: 'bg-gold-900/40 text-gold-400',
      logistics: 'bg-green-900/40 text-green-300',
    };
    return map[role] ?? 'bg-charcoal-700 text-cool-gray-400';
  };

  const roleIcon = (role: string) => ({ vendor: '🏪', brand: '👑', logistics: '🚚' }[role] ?? '👤');

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-charcoal-800 border border-gold-600 text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-medium">
          {toast}
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Application Approvals</h1>
        <p className="text-cool-gray-400 text-sm mt-1">Review vendor, brand & logistics applications</p>
      </div>

      {/* Badge Counts */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-purple-900/30 border border-purple-800/40 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-purple-300">{counts.vendors}</div>
          <div className="text-xs text-purple-400 mt-1">🏪 Vendors Pending</div>
        </div>
        <div className="bg-gold-900/30 border border-gold-800/40 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-gold-400">{counts.brands}</div>
          <div className="text-xs text-gold-500 mt-1">👑 Brands Pending</div>
        </div>
        <div className="bg-green-900/30 border border-green-800/40 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-300">{counts.logistics}</div>
          <div className="text-xs text-green-400 mt-1">🚚 Logistics Pending</div>
        </div>
      </div>

      {error && <div className="mb-4 p-4 bg-red-900/20 border border-red-700 rounded-xl text-red-300 text-sm">{error}</div>}

      {/* Filters */}
      <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-4 mb-6">
        <div className="grid grid-cols-2 gap-3">
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-4 py-2 bg-charcoal-700 border border-charcoal-600 text-white rounded-lg text-sm outline-none focus:ring-2 focus:ring-gold-500"
          >
            <option value="all">All Types</option>
            <option value="vendor">Vendors</option>
            <option value="brand">Brands</option>
            <option value="logistics">Logistics</option>
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-charcoal-700 border border-charcoal-600 text-white rounded-lg text-sm outline-none focus:ring-2 focus:ring-gold-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Applications List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12 text-cool-gray-500">Loading applications...</div>
        ) : applications.length === 0 ? (
          <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl py-16 text-center">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-white font-semibold">No applications found</p>
            <p className="text-cool-gray-400 text-sm mt-1">
              {statusFilter === 'pending' ? 'All caught up! No pending applications.' : 'Try changing your filters.'}
            </p>
          </div>
        ) : applications.map(app => (
          <div key={app._id} className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="w-12 h-12 bg-charcoal-700 rounded-xl flex items-center justify-center text-2xl shrink-0">
                {roleIcon(app.role)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-semibold">{app.firstName} {app.lastName}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${roleBadge(app.role)}`}>
                    {app.role}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    app.applicationStatus === 'pending' ? 'bg-yellow-900/40 text-yellow-300' :
                    app.applicationStatus === 'approved' ? 'bg-green-900/40 text-green-300' :
                    'bg-red-900/40 text-red-300'
                  }`}>
                    {app.applicationStatus}
                  </span>
                </div>
                <div className="text-cool-gray-400 text-sm mt-0.5 truncate">{app.email}</div>
                <div className="text-cool-gray-500 text-xs mt-0.5">
                  Applied {new Date(app.createdAt).toLocaleDateString()}
                  {app.applicationNotes && <span className="ml-2 text-yellow-400">Note: {app.applicationNotes}</span>}
                </div>
              </div>
            </div>
            {app.applicationStatus === 'pending' && (
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => { setSelected(app); setNotes(''); }}
                  className="px-4 py-2 bg-gold-600 hover:bg-gold-500 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  Review
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Review Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-charcoal-800 border border-charcoal-700 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-charcoal-700">
              <div>
                <h2 className="text-lg font-bold text-white">Review Application</h2>
                <p className="text-cool-gray-400 text-xs mt-0.5 capitalize">{selected.role} · {selected.firstName} {selected.lastName}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-cool-gray-400 hover:text-white text-2xl leading-none">×</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-charcoal-700 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-cool-gray-400">Name</span>
                  <span className="text-white font-medium">{selected.firstName} {selected.lastName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cool-gray-400">Email</span>
                  <span className="text-white">{selected.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cool-gray-400">Role applying for</span>
                  <span className="text-white capitalize">{selected.role}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cool-gray-400">Applied</span>
                  <span className="text-white">{new Date(selected.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Notes (required for rejection, optional for approval)..."
                rows={3}
                className="w-full px-4 py-3 bg-charcoal-700 border border-charcoal-600 text-white placeholder-cool-gray-500 rounded-xl text-sm outline-none focus:ring-2 focus:ring-gold-500 resize-none"
              />

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => doAction(selected._id, 'approve')}
                  disabled={actionLoading === selected._id}
                  className="py-3 bg-green-700 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
                >
                  {actionLoading === selected._id ? '...' : '✓ Approve'}
                </button>
                <button
                  onClick={() => doAction(selected._id, 'reject')}
                  disabled={actionLoading === selected._id}
                  className="py-3 bg-red-800 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
                >
                  {actionLoading === selected._id ? '...' : '✕ Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
