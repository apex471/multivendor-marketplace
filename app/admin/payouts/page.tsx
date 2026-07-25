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
    payoutMethod?: string;
    manualPayment?: {
      bankReference?: string;
      confirmationNote?: string;
      processedAt?: string;
    };
  };
}

const NGN_RATE = 1600;
const fmtUSD = (v: number) => `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtNGN = (v: number) => `₦${Math.round(v * NGN_RATE).toLocaleString()}`;

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState('pending');
  const [roleFilter, setRoleFilter] = useState('all');

  type ModalMode = 'manual' | 'auto' | 'reject' | null;
  const [selectedPayout, setSelectedPayout] = useState<PayoutRequest | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [bankReference, setBankReference] = useState('');
  const [confirmationNote, setConfirmationNote] = useState('');

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;

  const copyToClipboard = async (text: string, field: string) => {
    try { await navigator.clipboard.writeText(text); } catch {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
    }
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const fetchPayouts = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ status: statusFilter });
      const res = await fetch(`/api/admin/payouts?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Failed to fetch payouts');
      const json = await res.json();
      let fetched = json.data.payouts as PayoutRequest[];
      if (roleFilter !== 'all') fetched = fetched.filter(p => p.user?.role === roleFilter);
      setPayouts(fetched);
    } catch (err) {
      console.error(err);
      setError('Failed to load payout requests.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, roleFilter]);

  useEffect(() => { fetchPayouts(); }, [fetchPayouts]);

  const openModal = (payout: PayoutRequest, mode: ModalMode) => {
    setSelectedPayout(payout); setModalMode(mode);
    setAdminNotes(''); setBankReference(''); setConfirmationNote('');
  };
  const closeModal = () => { setSelectedPayout(null); setModalMode(null); };

  const handleSubmit = async () => {
    if (!selectedPayout || !modalMode) return;
    if (modalMode === 'reject' && !adminNotes.trim()) { showToast('Please provide a rejection reason.', 'error'); return; }
    if (modalMode === 'manual' && !bankReference.trim()) { showToast('Please enter the bank transfer reference number.', 'error'); return; }

    setActionLoading(selectedPayout.id);
    try {
      const body: Record<string, string> = { payoutId: selectedPayout.id };
      if (modalMode === 'manual') {
        body.action = 'manual_approve';
        body.bankReference = bankReference.trim();
        body.confirmationNote = confirmationNote.trim();
        body.notes = adminNotes.trim() || `Manual bank transfer. Ref: ${bankReference.trim()}`;
      } else if (modalMode === 'auto') {
        body.action = 'approve';
        body.notes = adminNotes.trim();
      } else {
        body.action = 'reject';
        body.notes = adminNotes.trim();
      }

      const res = await fetch('/api/admin/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Operation failed');

      showToast(
        modalMode === 'manual' ? '✅ Payout marked as manually processed. Vendor balance updated!' :
        modalMode === 'auto'   ? '✅ Payout approved via Flutterwave!' :
                                 '🚫 Payout rejected successfully.',
        modalMode === 'reject' ? 'info' : 'success'
      );
      closeModal();
      fetchPayouts();
    } catch (err: any) {
      showToast(`❌ ${err.message || 'Something went wrong'}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const pendingCount  = payouts.filter(p => p.status === 'pending').length;
  const pendingVolume = payouts.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0);
  const completedVol  = payouts.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0);

  const roleBadge = (role: string) => {
    const m: Record<string,string> = {
      vendor: 'bg-purple-900/40 text-purple-300 border border-purple-800/30',
      brand: 'bg-amber-900/40 text-amber-300 border border-amber-800/30',
      logistics: 'bg-emerald-900/40 text-emerald-300 border border-emerald-800/30',
    };
    return m[role] ?? 'bg-charcoal-700 text-cool-gray-400';
  };

  const statusBadge = (status: string, method?: string) => {
    if (status === 'completed' && method === 'manual_bank_transfer')
      return 'bg-blue-950/60 text-blue-300 border border-blue-900/50';
    const m: Record<string,string> = {
      completed: 'bg-green-950/60 text-green-300 border border-green-900/50',
      pending:   'bg-yellow-950/60 text-yellow-300 border border-yellow-900/50 animate-pulse',
      failed:    'bg-red-950/60 text-red-300 border border-red-900/50',
    };
    return m[status] ?? 'bg-charcoal-700 text-cool-gray-400';
  };

  const toastColor = !toast ? '' :
    toast.type === 'error' ? 'border-red-500 text-red-200 bg-red-950/90' :
    toast.type === 'info'  ? 'border-blue-500 text-blue-200 bg-blue-950/90' :
                             'border-green-500 text-green-200 bg-green-950/90';

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">

      {toast && (
        <div className={`fixed top-4 right-4 z-50 border px-5 py-3 rounded-xl shadow-2xl text-sm font-semibold backdrop-blur-sm ${toastColor}`}>
          {toast.msg}
        </div>
      )}

      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Payout Approvals</h1>
        <p className="text-cool-gray-400 text-sm mt-1">Review and disburse funds to vendors, brand owners, and logistics providers.</p>
      </div>

      {/* Manual Transfer Warning Banner */}
      <div className="bg-amber-950/30 border border-amber-700/50 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <span className="text-2xl shrink-0">⚠️</span>
          <div>
            <p className="text-amber-300 font-bold text-sm mb-1">Flutterwave Withdrawal Unavailable — Use Manual Bank Transfer</p>
            <p className="text-amber-200/70 text-xs leading-relaxed">
              Your Flutterwave collection balance has funds but the automatic NGN static account is failing.
              <strong className="text-amber-200"> To process payouts:</strong>{' '}
              1) Open your bank app and send the NGN amount shown to the vendor&apos;s account,{' '}
              2) Click <strong className="text-blue-300">&quot;Mark as Manually Paid&quot;</strong> and enter your transfer reference.
              The vendor&apos;s dashboard will update immediately.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          { label: 'Pending Payouts', value: String(pendingCount), sub: 'Awaiting action', accent: 'text-white', glow: 'bg-yellow-500/10' },
          { label: 'Pending Volume', value: fmtUSD(pendingVolume), sub: `≈ ${fmtNGN(pendingVolume)} NGN`, accent: 'text-gold-400', glow: 'bg-gold-500/10' },
          { label: 'Total Disbursed', value: fmtUSD(completedVol), sub: 'Successfully processed', accent: 'text-emerald-400', glow: 'bg-emerald-500/10' },
        ].map(c => (
          <div key={c.label} className="bg-charcoal-800 border border-charcoal-700 rounded-2xl p-5 relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-24 h-24 ${c.glow} rounded-full blur-2xl`} />
            <p className="text-xs font-semibold text-cool-gray-400 uppercase tracking-wider">{c.label}</p>
            <h3 className={`text-3xl font-black mt-2 ${c.accent}`}>{c.value}</h3>
            <p className="text-xs text-cool-gray-500 mt-1">{c.sub}</p>
          </div>
        ))}
      </div>

      {error && <div className="p-4 bg-red-900/20 border border-red-700/50 rounded-xl text-red-300 text-sm">{error}</div>}

      {/* Filters */}
      <div className="bg-charcoal-800 border border-charcoal-700 rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
        <div className="w-full sm:w-1/2">
          <label className="text-xs font-bold text-cool-gray-400 block mb-1">Status</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="w-full px-4 py-2.5 bg-charcoal-700 border border-charcoal-600 text-white rounded-xl text-sm outline-none focus:ring-2 focus:ring-gold-500">
            <option value="all">All Statuses</option>
            <option value="pending">⏳ Pending</option>
            <option value="completed">✅ Completed</option>
            <option value="failed">❌ Rejected</option>
          </select>
        </div>
        <div className="w-full sm:w-1/2">
          <label className="text-xs font-bold text-cool-gray-400 block mb-1">Role</label>
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
            className="w-full px-4 py-2.5 bg-charcoal-700 border border-charcoal-600 text-white rounded-xl text-sm outline-none focus:ring-2 focus:ring-gold-500">
            <option value="all">All Roles</option>
            <option value="vendor">🏪 Vendors</option>
            <option value="brand">👑 Brand Owners</option>
            <option value="logistics">🚚 Logistics</option>
          </select>
        </div>
      </div>

      {/* Payout Cards */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-charcoal-800 border border-charcoal-700 rounded-2xl p-16 text-center">
            <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-cool-gray-400 text-sm">Loading payout requests…</p>
          </div>
        ) : payouts.length === 0 ? (
          <div className="bg-charcoal-800 border border-charcoal-700 rounded-2xl p-16 text-center">
            <div className="text-4xl mb-3">💸</div>
            <p className="text-white font-semibold">No payout requests found</p>
            <p className="text-cool-gray-500 text-xs mt-1">Matching requests will appear here</p>
          </div>
        ) : payouts.map(payout => {
          const acct = payout.metadata?.accountNumber ?? '';
          const isManual = payout.metadata?.payoutMethod === 'manual_bank_transfer';
          return (
            <div key={payout.id} className="bg-charcoal-800 border border-charcoal-700 rounded-2xl p-5 hover:border-charcoal-600 transition-colors">
              <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-5">

                {/* Left — identity */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    {payout.user && <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${roleBadge(payout.user.role)}`}>{payout.user.role}</span>}
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusBadge(payout.status, payout.metadata?.payoutMethod)}`}>
                      {payout.status === 'completed' && isManual ? '✓ Manual' : payout.status}
                    </span>
                    {payout.user?.storeName && (
                      <span className="px-2 py-0.5 rounded-md text-xs bg-charcoal-700 text-cool-gray-300 border border-charcoal-600">🏪 {payout.user.storeName}</span>
                    )}
                  </div>
                  <div className="text-white font-bold text-base">
                    {payout.user ? `${payout.user.firstName} ${payout.user.lastName}` : 'Unknown User'}
                  </div>
                  {payout.user?.email && <div className="text-cool-gray-400 text-xs mt-0.5">{payout.user.email}</div>}
                  <div className="text-cool-gray-500 text-xs mt-1 font-mono">{payout.transactionId}</div>
                  <div className="text-cool-gray-600 text-xs">Requested: {new Date(payout.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                  {payout.metadata?.adminNotes && (
                    <div className="mt-2 text-xs text-cool-gray-400 bg-charcoal-700/40 rounded-lg px-3 py-2 border border-charcoal-600/50">📝 {payout.metadata.adminNotes}</div>
                  )}
                  {isManual && payout.metadata?.manualPayment?.bankReference && (
                    <div className="mt-2 text-xs text-blue-300 bg-blue-950/30 rounded-lg px-3 py-2 border border-blue-900/40">🏦 Ref: {payout.metadata.manualPayment.bankReference}</div>
                  )}
                </div>

                {/* Center — Bank Details */}
                <div className="bg-charcoal-900/50 border border-charcoal-700/60 rounded-xl p-4 min-w-[240px] max-w-xs">
                  <p className="text-xs font-bold text-cool-gray-400 uppercase tracking-wider mb-3">Bank Details</p>
                  <div className="space-y-2.5 text-xs">
                    <div>
                      <p className="text-cool-gray-500">Account Holder</p>
                      <p className="text-white font-semibold mt-0.5">{payout.metadata?.accountHolderName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-cool-gray-500">Bank Name</p>
                      <p className="text-white font-semibold mt-0.5">{payout.metadata?.bankName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-cool-gray-500">Account Number</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-white font-mono font-bold text-sm tracking-wider">{acct || 'N/A'}</p>
                        {acct && (
                          <button onClick={() => copyToClipboard(acct, `acct-${payout.id}`)}
                            className="text-[10px] px-1.5 py-0.5 bg-charcoal-700 hover:bg-charcoal-600 text-cool-gray-300 rounded transition-colors">
                            {copiedField === `acct-${payout.id}` ? '✓' : 'Copy'}
                          </button>
                        )}
                      </div>
                    </div>
                    {payout.metadata?.routingNumber && (
                      <div>
                        <p className="text-cool-gray-500">Routing</p>
                        <p className="text-white font-mono mt-0.5">{payout.metadata.routingNumber}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right — Amount + Actions */}
                <div className="flex flex-col gap-3 xl:min-w-[170px] xl:items-end">
                  <div className="text-right">
                    <div className="text-2xl font-black text-white">{fmtUSD(payout.amount)}</div>
                    <div className="text-gold-400 font-bold text-base">{fmtNGN(payout.amount)}</div>
                    <div className="text-cool-gray-600 text-xs">≈ at ₦{NGN_RATE}/USD</div>
                  </div>

                  {payout.status === 'pending' ? (
                    <div className="flex flex-col gap-2 w-full">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); openModal(payout, 'manual'); }}
                        className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all text-center shadow-lg shadow-blue-900/30 cursor-pointer select-none">
                        🏦 Mark as Manually Paid
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); openModal(payout, 'auto'); }}
                        className="w-full px-4 py-2.5 bg-emerald-800 hover:bg-emerald-700 active:bg-emerald-900 text-white font-semibold text-sm rounded-xl transition-colors text-center cursor-pointer">
                        ⚡ Try Flutterwave Auto
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); openModal(payout, 'reject'); }}
                        className="w-full px-4 py-2.5 border border-red-900/60 text-red-400 font-semibold text-sm rounded-xl hover:bg-red-950/40 active:bg-red-950/60 transition-colors text-center cursor-pointer">
                        ✕ Reject
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs text-cool-gray-500 text-right">
                      {isManual ? '🏦 Manual transfer' : payout.status === 'completed' ? '⚡ Auto FLW' : ''}
                      <br />{payout.metadata?.processedAt ? new Date(payout.metadata.processedAt).toLocaleDateString() : '—'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {selectedPayout && modalMode && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-charcoal-800 border border-charcoal-700 rounded-2xl w-full max-w-lg shadow-2xl my-8">
            <div className="flex items-center justify-between p-5 border-b border-charcoal-700">
              <div>
                <h2 className="text-lg font-black text-white">
                  {modalMode === 'manual' ? '🏦 Manual Bank Transfer' :
                   modalMode === 'auto'   ? '⚡ Auto Flutterwave Payout' : '✕ Reject Payout'}
                </h2>
                <p className="text-cool-gray-400 text-xs mt-0.5">
                  {selectedPayout.user?.firstName} {selectedPayout.user?.lastName} — {fmtUSD(selectedPayout.amount)}
                </p>
              </div>
              <button onClick={closeModal} className="text-cool-gray-400 hover:text-white text-2xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-charcoal-700 transition-colors">×</button>
            </div>

            <div className="p-5 space-y-5">
              {/* Amount Summary */}
              <div className="bg-charcoal-900/60 border border-charcoal-700 rounded-xl p-4">
                <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                  <div>
                    <p className="text-cool-gray-400 mb-0.5">Amount (USD)</p>
                    <p className="text-white font-black text-xl">{fmtUSD(selectedPayout.amount)}</p>
                  </div>
                  <div>
                    <p className="text-cool-gray-400 mb-0.5">Send This Amount (NGN)</p>
                    <p className="text-gold-400 font-black text-xl">{fmtNGN(selectedPayout.amount)}</p>
                  </div>
                  <div>
                    <p className="text-cool-gray-400 mb-0.5">Account Holder</p>
                    <p className="text-white font-semibold">{selectedPayout.metadata?.accountHolderName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-cool-gray-400 mb-0.5">Bank</p>
                    <p className="text-white font-semibold">{selectedPayout.metadata?.bankName || 'N/A'}</p>
                  </div>
                </div>
                <div className="pt-3 border-t border-charcoal-700">
                  <p className="text-cool-gray-400 text-xs mb-1">Account Number</p>
                  <div className="flex items-center justify-between">
                    <p className="text-white font-mono font-black text-xl tracking-widest">
                      {selectedPayout.metadata?.accountNumber || 'N/A'}
                    </p>
                    {selectedPayout.metadata?.accountNumber && (
                      <button onClick={() => copyToClipboard(selectedPayout.metadata!.accountNumber!, 'modal-acct')}
                        className="px-3 py-1.5 bg-charcoal-700 hover:bg-charcoal-600 text-cool-gray-300 rounded-lg text-xs font-semibold transition-colors">
                        {copiedField === 'modal-acct' ? '✓ Copied!' : '📋 Copy'}
                      </button>
                    )}
                  </div>
                  {selectedPayout.metadata?.routingNumber && (
                    <p className="text-cool-gray-400 text-xs mt-1">Routing: {selectedPayout.metadata.routingNumber}</p>
                  )}
                </div>
              </div>

              {modalMode === 'manual' && (
                <>
                  <div className="bg-blue-950/30 border border-blue-800/40 rounded-xl p-4">
                    <p className="text-blue-300 font-bold text-sm mb-2">📋 Step-by-Step</p>
                    <ol className="text-blue-200/80 text-xs space-y-1.5 list-decimal list-inside leading-relaxed">
                      <li>Open your bank app or internet banking</li>
                      <li>Transfer <span className="font-bold text-white">{fmtNGN(selectedPayout.amount)}</span> to the account above</li>
                      <li>Copy your bank&apos;s transfer reference/session ID</li>
                      <li>Paste it below and click <em>Confirm Manual Payment</em></li>
                    </ol>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-cool-gray-300 block mb-1.5">
                      Bank Transfer Reference <span className="text-red-400">*</span>
                    </label>
                    <input type="text" value={bankReference} onChange={e => setBankReference(e.target.value)}
                      placeholder="e.g. TRF20240725XXXXXX or session/receipt ID"
                      className="w-full px-4 py-2.5 bg-charcoal-700 border border-charcoal-600 text-white rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-cool-gray-600 font-mono" />
                    <p className="text-cool-gray-500 text-xs mt-1">The reference number from your bank transfer confirmation</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-cool-gray-300 block mb-1.5">Confirmation Note <span className="text-cool-gray-500">(Optional)</span></label>
                    <input type="text" value={confirmationNote} onChange={e => setConfirmationNote(e.target.value)}
                      placeholder="e.g. Sent from GTB business account on 25 July"
                      className="w-full px-4 py-2.5 bg-charcoal-700 border border-charcoal-600 text-white rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-cool-gray-600" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-cool-gray-300 block mb-1.5">Admin Notes <span className="text-cool-gray-500">(Optional)</span></label>
                    <textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)}
                      placeholder="Any additional notes..." rows={2}
                      className="w-full px-4 py-2.5 bg-charcoal-700 border border-charcoal-600 text-white rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none placeholder:text-cool-gray-600" />
                  </div>
                </>
              )}

              {modalMode === 'auto' && (
                <>
                  <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl p-4 text-xs text-amber-200/80">
                    <p className="font-bold text-amber-300 mb-1">⚠️ May fail if Transfer Balance is unfunded</p>
                    <p>Flutterwave transfers debit the Transfer Balance, not the Collection Balance. If this fails, use Manual Bank Transfer instead.</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-cool-gray-300 block mb-1.5">Notes (Optional)</label>
                    <textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)}
                      placeholder="Optional notes..." rows={2}
                      className="w-full px-4 py-2.5 bg-charcoal-700 border border-charcoal-600 text-white rounded-xl text-sm outline-none focus:ring-2 focus:ring-gold-500 resize-none placeholder:text-cool-gray-600" />
                  </div>
                </>
              )}

              {modalMode === 'reject' && (
                <div>
                  <label className="text-xs font-bold text-cool-gray-300 block mb-1.5">Rejection Reason <span className="text-red-400">*</span></label>
                  <textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)}
                    placeholder="Specify why this payout is being rejected..." rows={3}
                    className="w-full px-4 py-2.5 bg-charcoal-700 border border-charcoal-600 text-white rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500 resize-none placeholder:text-cool-gray-600" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); closeModal(); }}
                  className="py-3 bg-charcoal-700 hover:bg-charcoal-600 active:bg-charcoal-800 text-cool-gray-300 font-semibold rounded-xl text-sm transition-colors cursor-pointer">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleSubmit(); }}
                  disabled={actionLoading === selectedPayout.id}
                  className={`py-3 font-bold rounded-xl text-sm text-white transition-colors disabled:opacity-50 cursor-pointer ${
                    modalMode === 'manual' ? 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700' :
                    modalMode === 'auto'   ? 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700' :
                                            'bg-red-700 hover:bg-red-600 active:bg-red-800'
                  }`}>
                  {actionLoading === selectedPayout.id ? 'Processing…' :
                   modalMode === 'manual' ? '✓ Confirm Manual Payment' :
                   modalMode === 'auto'   ? '⚡ Send via Flutterwave' : '✕ Confirm Rejection'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
