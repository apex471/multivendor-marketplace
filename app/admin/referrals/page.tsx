'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface ReferralCode {
  id: string;
  code: string;
  label: string;
  isActive: boolean;
  totalSignups: number;
  totalEarnings: number;
  totalTransactions: number;
  createdAt?: string;
}

interface Summary {
  totalCodes: number;
  totalSignups: number;
  totalEarnings: number;
  totalTransactions: number;
}

export default function AdminReferralsPage() {
  const [codes, setCodes] = useState<ReferralCode[]>([]);
  const [summary, setSummary] = useState<Summary>({ totalCodes: 0, totalSignups: 0, totalEarnings: 0, totalTransactions: 0 });
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [labelInput, setLabelInput] = useState('');
  const [affiliateUserIdInput, setAffiliateUserIdInput] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') || '' : '';
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchCodes = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/admin/referrals?page=${p}&limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setCodes(data.data.codes || []);
        setSummary(data.data.summary || {});
        setTotalPages(data.data.pagination?.totalPages || 1);
        setPage(p);
      }
    } catch {
      showToast('Failed to load referral codes', 'error');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchCodes(); }, [fetchCodes]);

  const handleCreate = async () => {
    if (!labelInput.trim()) return showToast('Please enter a label', 'error');
    setCreating(true);
    try {
      const res  = await fetch('/api/admin/referrals', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: labelInput.trim(), affiliateUserId: affiliateUserIdInput.trim() || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Code "${data.data.code}" created!`);
        setShowModal(false);
        setLabelInput('');
        setAffiliateUserIdInput('');
        fetchCodes(page);
      } else {
        showToast(data.message || 'Creation failed', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (code: ReferralCode) => {
    setTogglingId(code.id);
    try {
      const res  = await fetch('/api/admin/referrals', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: code.id, isActive: !code.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Code ${!code.isActive ? 'activated' : 'deactivated'}`);
        fetchCodes(page);
      } else {
        showToast(data.message || 'Update failed', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this referral code? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      const res  = await fetch('/api/admin/referrals', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Code deleted');
        fetchCodes(page);
      } else {
        showToast(data.message || 'Delete failed', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const copyUrl = (code: string) => {
    const url = `${baseUrl}/auth/signup?ref=${code}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(code);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium transition-all
            ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}
        >
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal-900 dark:text-white">Referral Programs</h1>
          <p className="text-sm text-cool-gray-500 mt-1">
            Generate affiliate links · Track signups & commissions · Affiliates earn 5% per order
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 bg-gold-600 hover:bg-gold-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm"
        >
          <span className="text-base">+</span> Generate Referral Code
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Codes',     value: summary.totalCodes,        icon: '🔗', color: 'from-blue-500 to-blue-700' },
          { label: 'Total Sign-ups',  value: summary.totalSignups,      icon: '👥', color: 'from-emerald-500 to-emerald-700' },
          { label: 'Total Earnings',  value: `$${(summary.totalEarnings || 0).toFixed(2)}`, icon: '💰', color: 'from-gold-500 to-gold-700' },
          { label: 'Transactions',    value: summary.totalTransactions,  icon: '📊', color: 'from-purple-500 to-purple-700' },
        ].map(card => (
          <div key={card.label} className="bg-white dark:bg-charcoal-800 rounded-2xl p-4 border border-cool-gray-200 dark:border-charcoal-700 shadow-sm">
            <div className={`w-10 h-10 rounded-xl bg-linear-to-br ${card.color} flex items-center justify-center text-lg mb-3`}>
              {card.icon}
            </div>
            <p className="text-2xl font-bold text-charcoal-900 dark:text-white">{card.value}</p>
            <p className="text-xs text-cool-gray-500 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Fee Distribution Info */}
      <div className="bg-linear-to-r from-gold-500/10 to-emerald-500/10 border border-gold-400/30 rounded-2xl p-4">
        <h2 className="text-sm font-semibold text-charcoal-700 dark:text-cool-gray-200 mb-3 flex items-center gap-2">
          <span>📐</span> How Affiliate Commissions Work
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          {[
            { label: 'Buyer pays',      value: '+10%', color: 'text-blue-600 dark:text-blue-400' },
            { label: 'Seller pays',     value: '+10%', color: 'text-purple-600 dark:text-purple-400' },
            { label: 'Affiliate gets',  value: '5%',   color: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Admin keeps',     value: '≈15%', color: 'text-gold-600 dark:text-gold-400' },
          ].map(f => (
            <div key={f.label} className="bg-white/60 dark:bg-charcoal-800/60 rounded-xl p-3">
              <p className={`text-2xl font-bold ${f.color}`}>{f.value}</p>
              <p className="text-xs text-cool-gray-500 mt-1">{f.label}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-cool-gray-500 mt-3">
          * 5% affiliate commission is taken from the platform&apos;s 20% gross. Rates apply on merchandise subtotal only — not shipping or tax.
        </p>
      </div>

      {/* Codes Table */}
      <div className="bg-white dark:bg-charcoal-800 rounded-2xl border border-cool-gray-200 dark:border-charcoal-700 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-cool-gray-100 dark:border-charcoal-700">
          <h2 className="font-semibold text-charcoal-900 dark:text-white text-sm">All Referral Codes</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-gold-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : codes.length === 0 ? (
          <div className="text-center py-16 text-cool-gray-400">
            <p className="text-4xl mb-3">🔗</p>
            <p className="font-medium">No referral codes yet</p>
            <p className="text-sm mt-1">Click &quot;Generate Referral Code&quot; to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-cool-gray-50 dark:bg-charcoal-900/40">
                <tr>
                  {['Code', 'Label', 'Sign-ups', 'Transactions', 'Earnings', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-cool-gray-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-cool-gray-100 dark:divide-charcoal-700">
                {codes.map(code => (
                  <tr key={code.id} className="hover:bg-cool-gray-50 dark:hover:bg-charcoal-700/30 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-charcoal-800 dark:text-cool-gray-100 bg-cool-gray-100 dark:bg-charcoal-700 px-2 py-0.5 rounded-md text-xs">
                          {code.code}
                        </span>
                        <button
                          onClick={() => copyUrl(code.code)}
                          title="Copy referral URL"
                          className="text-cool-gray-400 hover:text-gold-600 transition-colors text-xs"
                        >
                          {copied === code.code ? '✅' : '📋'}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-charcoal-700 dark:text-cool-gray-300 max-w-[160px] truncate">
                      {code.label}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-charcoal-800 dark:text-cool-gray-200">
                      {code.totalSignups || 0}
                    </td>
                    <td className="px-4 py-3.5 text-charcoal-700 dark:text-cool-gray-300">
                      {code.totalTransactions || 0}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-emerald-600 dark:text-emerald-400">
                      ${(code.totalEarnings || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold
                          ${code.isActive
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-cool-gray-100 text-cool-gray-500 dark:bg-charcoal-700 dark:text-cool-gray-400'
                          }`}
                      >
                        {code.isActive ? '● Active' : '○ Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/referrals/${code.code}`}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => handleToggle(code)}
                          disabled={togglingId === code.id}
                          className="text-xs text-gold-600 hover:text-gold-700 font-medium disabled:opacity-50"
                        >
                          {togglingId === code.id ? '...' : code.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleDelete(code.id)}
                          disabled={deletingId === code.id}
                          className="text-xs text-red-500 hover:text-red-600 font-medium disabled:opacity-50"
                        >
                          {deletingId === code.id ? '...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-cool-gray-100 dark:border-charcoal-700 flex items-center justify-between">
            <button
              onClick={() => fetchCodes(page - 1)}
              disabled={page <= 1}
              className="text-sm text-cool-gray-500 hover:text-charcoal-700 disabled:opacity-30"
            >
              ← Prev
            </button>
            <span className="text-xs text-cool-gray-400">Page {page} of {totalPages}</span>
            <button
              onClick={() => fetchCodes(page + 1)}
              disabled={page >= totalPages}
              className="text-sm text-cool-gray-500 hover:text-charcoal-700 disabled:opacity-30"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white dark:bg-charcoal-900 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-charcoal-900 dark:text-white">Generate Referral Code</h3>
              <button onClick={() => setShowModal(false)} className="text-cool-gray-400 hover:text-charcoal-600 text-xl">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-charcoal-600 dark:text-cool-gray-400 mb-1.5 uppercase tracking-wide">
                  Campaign Label <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={labelInput}
                  onChange={e => setLabelInput(e.target.value)}
                  placeholder="e.g. Instagram Influencer Q3"
                  className="w-full bg-cool-gray-50 dark:bg-charcoal-800 border border-cool-gray-200 dark:border-charcoal-700 rounded-xl px-4 py-3 text-sm text-charcoal-900 dark:text-white placeholder-cool-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-charcoal-600 dark:text-cool-gray-400 mb-1.5 uppercase tracking-wide">
                  Affiliate User ID <span className="text-cool-gray-400 font-normal">(optional — who earns the 5%)</span>
                </label>
                <input
                  type="text"
                  value={affiliateUserIdInput}
                  onChange={e => setAffiliateUserIdInput(e.target.value)}
                  placeholder="Leave blank to credit admin account"
                  className="w-full bg-cool-gray-50 dark:bg-charcoal-800 border border-cool-gray-200 dark:border-charcoal-700 rounded-xl px-4 py-3 text-sm text-charcoal-900 dark:text-white placeholder-cool-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-500 font-mono"
                />
              </div>
              <div className="bg-gold-50 dark:bg-gold-900/10 border border-gold-200 dark:border-gold-700/30 rounded-xl p-3">
                <p className="text-xs text-charcoal-600 dark:text-cool-gray-400">
                  🔑 A unique code like <strong>REF-ABC123</strong> will be auto-generated. The referral URL will be:<br />
                  <span className="font-mono text-gold-700 dark:text-gold-400">
                    {baseUrl}/auth/signup?ref=REF-XXXXXX
                  </span>
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 border border-cool-gray-200 dark:border-charcoal-700 rounded-xl text-sm font-medium text-cool-gray-600 dark:text-cool-gray-400 hover:bg-cool-gray-50 dark:hover:bg-charcoal-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex-1 px-4 py-2.5 bg-gold-600 hover:bg-gold-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {creating ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating...</>
                ) : 'Generate Code'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
