'use client';

import { useState, useEffect, useCallback } from 'react';

interface Transaction {
  _id: string;
  transactionId: string;
  type: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  description: string;
  orderId?: string;
  fromUser?: { _id: string; firstName: string; lastName: string; email: string; };
  toUser?: { _id: string; firstName: string; lastName: string; email: string; };
  createdAt: string;
}

interface EscrowData {
  transactions: Transaction[];
  pagination: { total: number };
  counts: { pending: number; completed: number; refunded: number; };
  totalHeld: number;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-900/40 text-yellow-300',
  completed: 'bg-green-900/40 text-green-300',
  failed: 'bg-red-900/40 text-red-300',
  refunded: 'bg-gray-700 text-cool-gray-300',
};

const TYPE_LABELS: Record<string, string> = {
  order_payment: 'Order Payment',
  escrow_release: 'Escrow Release',
  refund: 'Refund',
};

export default function EscrowManagementPage() {
  const [escrow, setEscrow] = useState<EscrowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [reason, setReason] = useState('');

  const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const fetchEscrow = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const p = new URLSearchParams({ ...(statusFilter !== 'all' && { status: statusFilter }) });
      const res = await fetch(`/api/admin/escrow?${p}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setEscrow(data.data);
    } catch { setError('Failed to load escrow data.'); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { fetchEscrow(); }, [fetchEscrow]);

  const doAction = async (transactionId: string, action: 'release' | 'refund') => {
    setActionLoading(transactionId);
    try {
      const res = await fetch('/api/admin/escrow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ transactionId, action, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed');
      showToast(data.message);
      setSelected(null);
      setReason('');
      fetchEscrow();
    } catch (e: unknown) { showToast(e instanceof Error ? e.message : 'Failed'); }
    finally { setActionLoading(null); }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {toast && <div className="fixed top-4 right-4 z-50 bg-charcoal-800 border border-gold-600 text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-medium">{toast}</div>}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Escrow Management</h1>
        <p className="text-cool-gray-400 text-sm mt-1">Manage held funds and payment releases</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-charcoal-800 border border-gold-800/40 rounded-xl p-5 col-span-2 sm:col-span-1">
          <div className="text-xs text-gold-400 font-semibold uppercase">Held in Escrow</div>
          <div className="text-3xl font-bold text-gold-300 mt-1">${escrow?.totalHeld?.toFixed(2) ?? '0.00'}</div>
        </div>
        {[
          { label: 'Pending', value: escrow?.counts?.pending ?? 0, color: 'text-yellow-300', key: 'pending' },
          { label: 'Released', value: escrow?.counts?.completed ?? 0, color: 'text-green-300', key: 'completed' },
          { label: 'Refunded', value: escrow?.counts?.refunded ?? 0, color: 'text-cool-gray-300', key: 'refunded' },
        ].map(({ label, value, color, key }) => (
          <button key={key} onClick={() => setStatusFilter(statusFilter === key ? 'all' : key)}
            className={`rounded-xl p-5 text-center border transition-all ${statusFilter === key ? 'border-gold-500 ring-1 ring-gold-500' : 'border-charcoal-700'} bg-charcoal-800`}>
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-cool-gray-400 mt-0.5">{label}</div>
          </button>
        ))}
      </div>

      {error && <div className="mb-4 p-4 bg-red-900/20 border border-red-700 rounded-xl text-red-300 text-sm">{error}</div>}

      <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-4 mb-6">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-charcoal-700 border border-charcoal-600 text-white rounded-lg text-sm outline-none focus:ring-2 focus:ring-gold-500">
          <option value="all">All Transactions</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      <div className="space-y-3">
        {loading ? <div className="text-center py-12 text-cool-gray-500">Loading escrow data...</div>
          : !escrow?.transactions?.length ? (
            <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl py-16 text-center">
              <div className="text-4xl mb-3">🔒</div>
              <p className="text-white font-semibold">No escrow transactions</p>
              <p className="text-cool-gray-400 text-sm mt-1">No funds currently held.</p>
            </div>
          ) : escrow.transactions.map(tx => (
            <div key={tx._id} className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-semibold font-mono text-sm">{tx.transactionId}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[tx.status]}`}>{tx.status}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-charcoal-600 text-cool-gray-300">{TYPE_LABELS[tx.type] || tx.type}</span>
                </div>
                <div className="text-sm text-cool-gray-400 mt-0.5 truncate">{tx.description}</div>
                {tx.fromUser && <div className="text-xs text-cool-gray-500 mt-0.5">From: {tx.fromUser.firstName} {tx.fromUser.lastName} ({tx.fromUser.email})</div>}
                {tx.toUser && <div className="text-xs text-cool-gray-500">To: {tx.toUser.firstName} {tx.toUser.lastName} ({tx.toUser.email})</div>}
                <div className="text-xs text-cool-gray-500 mt-0.5">{new Date(tx.createdAt).toLocaleDateString()}</div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <div className="text-white font-bold text-lg">${tx.amount.toFixed(2)}</div>
                  <div className="text-xs text-cool-gray-500">{tx.currency}</div>
                </div>
                {tx.status === 'pending' && (
                  <button onClick={() => { setSelected(tx); setReason(''); }}
                    className="px-4 py-2 bg-gold-600 hover:bg-gold-500 text-white text-sm font-semibold rounded-lg transition-colors">
                    Action
                  </button>
                )}
              </div>
            </div>
          ))}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-charcoal-800 border border-charcoal-700 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-charcoal-700">
              <div>
                <h2 className="text-lg font-bold text-white">Escrow Action</h2>
                <p className="text-cool-gray-400 text-xs mt-0.5 font-mono">{selected.transactionId}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-cool-gray-400 hover:text-white text-2xl leading-none">×</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-charcoal-700 rounded-xl p-4 text-sm space-y-2">
                <div className="flex justify-between"><span className="text-cool-gray-400">Amount</span><span className="text-white font-bold">${selected.amount.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-cool-gray-400">Type</span><span className="text-white">{TYPE_LABELS[selected.type] || selected.type}</span></div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-cool-gray-400 mb-1.5">Notes (optional)</label>
                <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Add a note for this action..."
                  className="w-full px-4 py-2 bg-charcoal-700 border border-charcoal-600 text-white placeholder-cool-gray-500 rounded-lg text-sm outline-none focus:ring-2 focus:ring-gold-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => doAction(selected._id, 'release')} disabled={actionLoading === selected._id}
                  className="py-3 bg-green-700 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50">
                  {actionLoading === selected._id ? '...' : '✓ Release'}
                </button>
                <button onClick={() => doAction(selected._id, 'refund')} disabled={actionLoading === selected._id}
                  className="py-3 bg-red-800 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50">
                  {actionLoading === selected._id ? '...' : '↩ Refund'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
