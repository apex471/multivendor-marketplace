'use client';

import { useState, useEffect, useCallback } from 'react';

interface Transaction {
  _id: string;
  transactionId: string;
  type: string;
  status: string;
  amount: number;
  currency: string;
  description?: string;
  fromUser?: { firstName: string; lastName: string; email: string };
  toUser?: { firstName: string; lastName: string; email: string };
  createdAt: string;
}

interface Summary {
  totalVolume: number;
  completedCount: number;
  avgAmount: number;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary>({ totalVolume: 0, completedCount: 0, avgAmount: 0 });
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 25, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState('30d');
  const [page, setPage] = useState(1);

  const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '25',
        dateRange,
        ...(typeFilter !== 'all' && { type: typeFilter }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
      });
      const res = await fetch(`/api/admin/transactions?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Failed to fetch transactions');
      const data = await res.json();
      setTransactions(data.data.transactions);
      setSummary(data.data.summary);
      setPagination(data.data.pagination);
    } catch {
      setError('Failed to load transactions.');
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, statusFilter, dateRange]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const fmtMoney = (n: number) => `$${(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const typeBadge = (type: string) => {
    const map: Record<string, string> = {
      order_payment: 'bg-blue-900/40 text-blue-300',
      escrow_release: 'bg-green-900/40 text-green-300',
      refund: 'bg-red-900/40 text-red-300',
      commission_payout: 'bg-purple-900/40 text-purple-300',
      withdrawal: 'bg-yellow-900/40 text-yellow-300',
    };
    return map[type] ?? 'bg-charcoal-700 text-cool-gray-400';
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      completed: 'bg-green-900/40 text-green-300',
      pending: 'bg-yellow-900/40 text-yellow-300',
      failed: 'bg-red-900/40 text-red-300',
      refunded: 'bg-purple-900/40 text-purple-300',
    };
    return map[status] ?? 'bg-charcoal-700 text-cool-gray-400';
  };

  const typeLabel = (type: string) =>
    type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Transactions</h1>
        <p className="text-cool-gray-400 text-sm mt-1">All financial activity on the platform</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-gold-600 rounded-xl p-5 text-white">
          <div className="text-xs font-semibold uppercase mb-1 opacity-80">Total Volume</div>
          <div className="text-2xl font-bold">{fmtMoney(summary.totalVolume)}</div>
        </div>
        <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5">
          <div className="text-xs font-semibold text-cool-gray-400 uppercase mb-1">Completed Transactions</div>
          <div className="text-2xl font-bold text-white">{summary.completedCount.toLocaleString()}</div>
        </div>
        <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5">
          <div className="text-xs font-semibold text-cool-gray-400 uppercase mb-1">Average Transaction</div>
          <div className="text-2xl font-bold text-white">{fmtMoney(summary.avgAmount)}</div>
        </div>
      </div>

      {error && <div className="mb-4 p-4 bg-red-900/20 border border-red-700 rounded-xl text-red-300 text-sm">{error}</div>}

      {/* Filters */}
      <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-4 mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <select
            value={typeFilter}
            onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 bg-charcoal-700 border border-charcoal-600 text-white rounded-lg text-sm outline-none focus:ring-2 focus:ring-gold-500"
          >
            <option value="all">All Types</option>
            <option value="order_payment">Order Payments</option>
            <option value="escrow_release">Escrow Releases</option>
            <option value="refund">Refunds</option>
            <option value="commission_payout">Commission Payouts</option>
            <option value="withdrawal">Withdrawals</option>
          </select>
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 bg-charcoal-700 border border-charcoal-600 text-white rounded-lg text-sm outline-none focus:ring-2 focus:ring-gold-500"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
          <select
            value={dateRange}
            onChange={e => { setDateRange(e.target.value); setPage(1); }}
            className="px-4 py-2 bg-charcoal-700 border border-charcoal-600 text-white rounded-lg text-sm outline-none focus:ring-2 focus:ring-gold-500"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-charcoal-700">
                <th className="px-4 py-3 text-left text-xs font-semibold text-cool-gray-400 uppercase">Transaction ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-cool-gray-400 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-cool-gray-400 uppercase">From</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-cool-gray-400 uppercase">To</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-cool-gray-400 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-cool-gray-400 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-cool-gray-400 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-cool-gray-500">Loading transactions...</td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="text-3xl mb-2">💳</div>
                    <p className="text-cool-gray-400">No transactions found</p>
                    <p className="text-cool-gray-500 text-xs mt-1">Transactions will appear here once orders are placed</p>
                  </td>
                </tr>
              ) : transactions.map(tx => (
                <tr key={tx._id} className="hover:bg-charcoal-750 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-cool-gray-300 font-mono text-xs">{tx.transactionId}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${typeBadge(tx.type)}`}>
                      {typeLabel(tx.type)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {tx.fromUser ? (
                      <div>
                        <div className="text-white text-xs font-medium">{tx.fromUser.firstName} {tx.fromUser.lastName}</div>
                        <div className="text-cool-gray-500 text-xs">{tx.fromUser.email}</div>
                      </div>
                    ) : (
                      <span className="text-cool-gray-600 text-xs">Platform</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {tx.toUser ? (
                      <div>
                        <div className="text-white text-xs font-medium">{tx.toUser.firstName} {tx.toUser.lastName}</div>
                        <div className="text-cool-gray-500 text-xs">{tx.toUser.email}</div>
                      </div>
                    ) : (
                      <span className="text-cool-gray-600 text-xs">Platform</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-semibold ${tx.type === 'refund' ? 'text-red-400' : 'text-white'}`}>
                      {tx.type === 'refund' ? '-' : ''}{fmtMoney(tx.amount)}
                    </span>
                    <div className="text-cool-gray-500 text-xs">{tx.currency}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadge(tx.status)}`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-cool-gray-400 text-xs">
                    {new Date(tx.createdAt).toLocaleDateString()}
                    <div className="text-cool-gray-600">{new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-charcoal-700">
            <span className="text-xs text-cool-gray-400">
              {pagination.total.toLocaleString()} transactions · Page {pagination.page} of {pagination.pages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 bg-charcoal-700 text-white text-xs rounded-lg disabled:opacity-40 hover:bg-charcoal-600 transition-colors"
              >
                ← Prev
              </button>
              <button
                onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                disabled={page === pagination.pages}
                className="px-3 py-1.5 bg-charcoal-700 text-white text-xs rounded-lg disabled:opacity-40 hover:bg-charcoal-600 transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
