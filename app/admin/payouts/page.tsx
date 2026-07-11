'use client';

import { useState, useEffect, useCallback } from 'react';

interface PayoutRequest {
  id: string;
  transactionId: string;
  type: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
  description: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    storeName: string | null;
    businessCity: string | null;
    businessState: string | null;
  } | null;
  metadata?: {
    bankName?: string;
    accountNumber?: string;
    accountHolderName?: string;
    routingNumber?: string;
    role?: string;
    submittedAt?: string;
    adminNotes?: string;
    processedAt?: string;
  };
}

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');

  // Modal State
  const [selectedPayout, setSelectedPayout] = useState<PayoutRequest | null>(null);
  const [modalAction, setModalAction] = useState<'approve' | 'reject' | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;

  const fetchPayouts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        status: statusFilter,
      });
      const res = await fetch(`/api/admin/payouts?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Failed to fetch payouts');
      const json = await res.json();
      
      let fetched = json.data.payouts as PayoutRequest[];
      if (roleFilter !== 'all') {
        fetched = fetched.filter(p => p.user?.role === roleFilter);
      }
      
      setPayouts(fetched);
    } catch (err) {
      console.error(err);
      setError('Failed to load payout requests.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, roleFilter]);

  useEffect(() => {
    fetchPayouts();
  }, [fetchPayouts]);

  const handleActionSubmit = async () => {
    if (!selectedPayout || !modalAction) return;

    if (modalAction === 'reject' && !adminNotes.trim()) {
      showToast('⚠️ Please provide rejection reasons/notes.');
      return;
    }

    setActionLoading(selectedPayout.id);
    try {
      const res = await fetch('/api/admin/payouts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          payoutId: selectedPayout.id,
          action: modalAction,
          notes: adminNotes.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Operation failed');

      showToast(`🟢 Payout successfully ${modalAction}d!`);
      setSelectedPayout(null);
      setModalAction(null);
      setAdminNotes('');
      fetchPayouts();
    } catch (err: any) {
      showToast(`❌ Error: ${err.message || 'Something went wrong'}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Metrics
  const pendingCount = payouts.filter(p => p.status === 'pending').length;
  const pendingVolume = payouts.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);
  const completedVolume = payouts.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0);

  const fmtMoney = (val: number) =>
    `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const roleBadge = (role: string) => {
    const map: Record<string, string> = {
      vendor: 'bg-purple-900/40 text-purple-300 border border-purple-800/30',
      brand: 'bg-amber-900/40 text-amber-300 border border-amber-800/30',
      logistics: 'bg-emerald-900/40 text-emerald-300 border border-emerald-800/30',
    };
    return map[role] ?? 'bg-charcoal-700 text-cool-gray-400';
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      completed: 'bg-green-950/60 text-green-300 border border-green-900/50',
      pending: 'bg-yellow-950/60 text-yellow-300 border border-yellow-900/50 animate-pulse',
      failed: 'bg-red-950/60 text-red-300 border border-red-900/50',
    };
    return map[status] ?? 'bg-charcoal-700 text-cool-gray-400';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-charcoal-900 border border-gold-500 text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-semibold">
          {toast}
        </div>
      )}

      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Payout Payout Approvals</h1>
        <p className="text-cool-gray-400 text-sm mt-1">Review and disburse funds to vendors, brand owners, and logistics providers.</p>
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-charcoal-800 border border-charcoal-700 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/10 rounded-full blur-2xl"></div>
          <p className="text-xs font-semibold text-cool-gray-400 uppercase tracking-wider">Pending Payouts Count</p>
          <h3 className="text-3xl font-black text-white mt-2">{pendingCount}</h3>
          <p className="text-xs text-yellow-400 mt-1">Awaiting administrator approval</p>
        </div>

        <div className="bg-charcoal-800 border border-charcoal-700 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gold-500/15 rounded-full blur-2xl"></div>
          <p className="text-xs font-semibold text-cool-gray-400 uppercase tracking-wider">Pending Payouts Value</p>
          <h3 className="text-3xl font-black text-gold-400 mt-2">{fmtMoney(pendingVolume)}</h3>
          <p className="text-xs text-cool-gray-400 mt-1">Funds currently locked in processing</p>
        </div>

        <div className="bg-charcoal-800 border border-charcoal-700 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl"></div>
          <p className="text-xs font-semibold text-cool-gray-400 uppercase tracking-wider">Total Approved Disbursements</p>
          <h3 className="text-3xl font-black text-emerald-400 mt-2">{fmtMoney(completedVolume)}</h3>
          <p className="text-xs text-cool-gray-400 mt-1">Successfully transferred to bank accounts</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-900/20 border border-red-700/50 rounded-xl text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-charcoal-800 border border-charcoal-700 rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
        <div className="w-full sm:w-1/2">
          <label className="text-xs font-bold text-cool-gray-400 block mb-1">Status Filter</label>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="w-full px-4 py-2.5 bg-charcoal-700 border border-charcoal-600 text-white rounded-xl text-sm outline-none focus:ring-2 focus:ring-gold-500 transition-shadow"
          >
            <option value="all">All Payout Statuses</option>
            <option value="pending">⏳ Pending Approval</option>
            <option value="completed">✅ Approved & Disbursed</option>
            <option value="failed">❌ Rejected / Cancelled</option>
          </select>
        </div>

        <div className="w-full sm:w-1/2">
          <label className="text-xs font-bold text-cool-gray-400 block mb-1">Requester Role</label>
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="w-full px-4 py-2.5 bg-charcoal-700 border border-charcoal-600 text-white rounded-xl text-sm outline-none focus:ring-2 focus:ring-gold-500 transition-shadow"
          >
            <option value="all">All User Roles</option>
            <option value="vendor">🏪 Vendors</option>
            <option value="brand">👑 Brand Owners</option>
            <option value="logistics">🚚 Logistics Providers</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-charcoal-800 border border-charcoal-700 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-charcoal-900/60 border-b border-charcoal-700">
              <tr>
                <th className="px-5 py-4 text-xs font-bold text-cool-gray-400 uppercase tracking-wider">Transaction</th>
                <th className="px-5 py-4 text-xs font-bold text-cool-gray-400 uppercase tracking-wider">Requester</th>
                <th className="px-5 py-4 text-xs font-bold text-cool-gray-400 uppercase tracking-wider">Destination Bank Details</th>
                <th className="px-5 py-4 text-xs font-bold text-cool-gray-400 uppercase tracking-wider text-right">Amount</th>
                <th className="px-5 py-4 text-xs font-bold text-cool-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-5 py-4 text-xs font-bold text-cool-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal-750">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-cool-gray-500">
                    <div className="w-6 h-6 border-2 border-gold-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Loading payout records...
                  </td>
                </tr>
              ) : payouts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <div className="text-4xl mb-3">💸</div>
                    <p className="text-white font-semibold">No payout requests found</p>
                    <p className="text-cool-gray-500 text-xs mt-1">Requests matching selected filters will show up here</p>
                  </td>
                </tr>
              ) : (
                payouts.map(payout => {
                  const lastDigits = payout.metadata?.accountNumber?.slice(-4) || 'N/A';
                  return (
                    <tr key={payout.id} className="hover:bg-charcoal-750/30 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-mono text-xs text-white font-semibold">{payout.transactionId}</div>
                        <div className="text-cool-gray-500 text-xs mt-0.5">
                          Requested: {new Date(payout.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {payout.user ? (
                          <div>
                            <div className="text-white font-semibold text-sm">
                              {payout.user.firstName} {payout.user.lastName}
                            </div>
                            <div className="text-cool-gray-400 text-xs">{payout.user.email}</div>
                            <div className="flex gap-1.5 mt-1.5 flex-wrap">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold capitalize ${roleBadge(payout.user.role)}`}>
                                {payout.user.role}
                              </span>
                              {payout.user.storeName && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-charcoal-700 text-cool-gray-300 border border-charcoal-600">
                                  🏪 {payout.user.storeName}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-cool-gray-500 italic text-xs">Unknown User</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="bg-charcoal-900/40 border border-charcoal-700/60 rounded-xl p-3 space-y-1.5 text-xs max-w-xs">
                          <div className="flex justify-between text-cool-gray-400">
                            <span>Holder:</span>
                            <span className="text-white font-medium truncate ml-2">
                              {payout.metadata?.accountHolderName || 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between text-cool-gray-400">
                            <span>Bank:</span>
                            <span className="text-white font-medium truncate ml-2">
                              {payout.metadata?.bankName || 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between text-cool-gray-400">
                            <span>Account:</span>
                            <span className="text-white font-mono font-medium ml-2">
                              ****{lastDigits}
                            </span>
                          </div>
                          {payout.metadata?.routingNumber && (
                            <div className="flex justify-between text-cool-gray-400">
                              <span>Routing:</span>
                              <span className="text-white font-mono ml-2">
                                {payout.metadata.routingNumber}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="text-base font-black text-white">{fmtMoney(payout.amount)}</div>
                        <div className="text-cool-gray-500 text-xs">{payout.currency}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusBadge(payout.status)}`}>
                          {payout.status}
                        </span>
                        {payout.metadata?.adminNotes && (
                          <div className="text-cool-gray-500 text-xs mt-1.5 max-w-[180px] break-words">
                            Note: {payout.metadata.adminNotes}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {payout.status === 'pending' ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setSelectedPayout(payout);
                                setModalAction('approve');
                                setAdminNotes('');
                              }}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-colors border border-emerald-500/20"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setSelectedPayout(payout);
                                setModalAction('reject');
                                setAdminNotes('');
                              }}
                              className="px-3 py-1.5 bg-red-800 hover:bg-red-700 text-white font-bold text-xs rounded-lg transition-colors border border-red-700/20"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-cool-gray-500 text-xs italic">
                            Processed {payout.metadata?.processedAt ? new Date(payout.metadata.processedAt).toLocaleDateString() : 'N/A'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approve/Reject Modal */}
      {selectedPayout && modalAction && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-charcoal-800 border border-charcoal-700 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-charcoal-700">
              <div>
                <h2 className="text-lg font-black text-white capitalize">{modalAction} Payout</h2>
                <p className="text-cool-gray-400 text-xs mt-0.5">
                  Confirm payout of {fmtMoney(selectedPayout.amount)} to {selectedPayout.user?.firstName} {selectedPayout.user?.lastName}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedPayout(null);
                  setModalAction(null);
                }}
                className="text-cool-gray-400 hover:text-white text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-charcoal-900/60 border border-charcoal-750 rounded-xl p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-cool-gray-400">Total Requested</span>
                  <span className="text-white font-bold text-sm">{fmtMoney(selectedPayout.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cool-gray-400">Destination Bank</span>
                  <span className="text-white font-medium">{selectedPayout.metadata?.bankName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cool-gray-400">Holder Name</span>
                  <span className="text-white font-medium">{selectedPayout.metadata?.accountHolderName}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-cool-gray-400 block">
                  Notes {modalAction === 'reject' ? '(Required for Rejection)' : '(Optional)'}
                </label>
                <textarea
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  placeholder={modalAction === 'reject' ? "Please specify reason for rejection..." : "Add optional notes or check references..."}
                  rows={3}
                  className="w-full px-4 py-3 bg-charcoal-700 border border-charcoal-600 text-white placeholder-cool-gray-500 rounded-xl text-sm outline-none focus:ring-2 focus:ring-gold-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => {
                    setSelectedPayout(null);
                    setModalAction(null);
                  }}
                  className="py-3 bg-charcoal-700 hover:bg-charcoal-600 text-cool-gray-300 font-semibold rounded-xl transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleActionSubmit}
                  disabled={actionLoading === selectedPayout.id}
                  className={`py-3 font-semibold rounded-xl transition-colors text-sm text-white ${
                    modalAction === 'approve'
                      ? 'bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800'
                      : 'bg-red-800 hover:bg-red-700 disabled:bg-red-950'
                  }`}
                >
                  {actionLoading === selectedPayout.id
                    ? 'Processing...'
                    : modalAction === 'approve'
                    ? 'Confirm Approval'
                    : 'Confirm Rejection'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
