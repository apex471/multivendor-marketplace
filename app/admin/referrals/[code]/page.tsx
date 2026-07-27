'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Affiliate {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  avatar?: string | null;
  joinedAt?: string;
  affiliateEarnings: number;
  totalEarnings: number;
  totalTransactions: number;
}

interface CodeSummary {
  id: string;
  code: string;
  label: string;
  isActive: boolean;
  totalSignups: number;
  totalEarnings: number;
  totalTransactions: number;
  createdAt?: string;
}

interface PageSummary {
  totalAffiliates: number;
  grandTotalEarnings: number;
  grandTotalTxns: number;
}

export default function ReferralCodeDetailPage() {
  const params   = useParams<{ code: string }>();
  const router   = useRouter();
  const codeSlug = params.code;

  const [refCode, setRefCode]   = useState<CodeSummary | null>(null);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [pageSummary, setPageSummary] = useState<PageSummary | null>(null);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [copied, setCopied]     = useState(false);

  const token   = typeof window !== 'undefined' ? localStorage.getItem('adminToken') || '' : '';
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const refUrl  = refCode ? `${baseUrl}/auth/signup?ref=${refCode.code}` : '';

  const fetchData = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/admin/referrals/${codeSlug}/affiliates?page=${p}&limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setRefCode(data.data.code);
        setAffiliates(data.data.affiliates || []);
        setPageSummary(data.data.summary);
        setTotalPages(data.data.pagination?.totalPages || 1);
        setPage(p);
      } else if (res.status === 404) {
        router.replace('/admin/referrals');
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [codeSlug, token, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const copyUrl = () => {
    navigator.clipboard.writeText(refUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const formatDate = (d?: string) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Back */}
      <Link
        href="/admin/referrals"
        className="inline-flex items-center gap-1.5 text-sm text-cool-gray-500 hover:text-charcoal-700 dark:hover:text-cool-gray-200 transition-colors"
      >
        ← Back to Referrals
      </Link>

      {loading && !refCode ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-4 border-gold-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : refCode ? (
        <>
          {/* Code Header */}
          <div className="bg-white dark:bg-charcoal-800 rounded-2xl border border-cool-gray-200 dark:border-charcoal-700 p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-xl text-charcoal-900 dark:text-white bg-cool-gray-100 dark:bg-charcoal-700 px-3 py-1 rounded-xl tracking-widest">
                    {refCode.code}
                  </span>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold
                      ${refCode.isActive
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'bg-cool-gray-100 text-cool-gray-500 dark:bg-charcoal-700 dark:text-cool-gray-400'
                      }`}
                  >
                    {refCode.isActive ? '● Active' : '○ Inactive'}
                  </span>
                </div>
                <p className="text-charcoal-600 dark:text-cool-gray-400 text-sm">{refCode.label}</p>
                <p className="text-xs text-cool-gray-400">Created {formatDate(refCode.createdAt)}</p>
              </div>

              {/* Referral URL Copy */}
              <div className="flex-shrink-0">
                <p className="text-xs text-cool-gray-400 mb-1.5 font-semibold uppercase tracking-wide">Referral URL</p>
                <div className="flex items-center gap-2">
                  <code className="bg-cool-gray-50 dark:bg-charcoal-900 border border-cool-gray-200 dark:border-charcoal-700 rounded-lg px-3 py-1.5 text-xs text-charcoal-700 dark:text-cool-gray-300 max-w-[260px] truncate block">
                    {refUrl}
                  </code>
                  <button
                    onClick={copyUrl}
                    className="shrink-0 px-3 py-1.5 bg-gold-600 hover:bg-gold-700 text-white rounded-lg text-xs font-semibold transition-colors"
                  >
                    {copied ? '✅ Copied' : '📋 Copy'}
                  </button>
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-cool-gray-100 dark:border-charcoal-700">
              {[
                { label: 'Total Sign-ups',   value: pageSummary?.totalAffiliates ?? refCode.totalSignups, icon: '👥' },
                { label: 'Total Earnings',   value: `$${(pageSummary?.grandTotalEarnings ?? refCode.totalEarnings ?? 0).toFixed(2)}`, icon: '💰' },
                { label: 'Total Orders',     value: pageSummary?.grandTotalTxns ?? refCode.totalTransactions, icon: '📦' },
              ].map(stat => (
                <div key={stat.label} className="text-center">
                  <p className="text-xl font-bold text-charcoal-900 dark:text-white">
                    {stat.icon} {stat.value}
                  </p>
                  <p className="text-xs text-cool-gray-500 mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Affiliates Table */}
          <div className="bg-white dark:bg-charcoal-800 rounded-2xl border border-cool-gray-200 dark:border-charcoal-700 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-cool-gray-100 dark:border-charcoal-700">
              <h2 className="font-semibold text-charcoal-900 dark:text-white text-sm">
                Referred Users ({pageSummary?.totalAffiliates ?? 0})
              </h2>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-14">
                <div className="w-7 h-7 border-4 border-gold-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : affiliates.length === 0 ? (
              <div className="text-center py-14 text-cool-gray-400">
                <p className="text-4xl mb-2">👥</p>
                <p className="font-medium">No sign-ups yet</p>
                <p className="text-sm mt-1">Share the referral URL to start earning commissions</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-cool-gray-50 dark:bg-charcoal-900/40">
                    <tr>
                      {['User', 'Role', 'Joined', 'Orders (via Ref)', 'Earnings Generated', 'Wallet Balance'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-cool-gray-500 uppercase tracking-wide">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cool-gray-100 dark:divide-charcoal-700">
                    {affiliates.map(aff => (
                      <tr key={aff.id} className="hover:bg-cool-gray-50 dark:hover:bg-charcoal-700/30 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-linear-to-br from-gold-400 to-gold-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                              {aff.avatar
                                ? <img src={aff.avatar} alt="" className="w-full h-full object-cover rounded-full" />
                                : (aff.firstName?.[0] || '?').toUpperCase()
                              }
                            </div>
                            <div>
                              <p className="font-medium text-charcoal-800 dark:text-cool-gray-100">
                                {aff.firstName} {aff.lastName}
                              </p>
                              <p className="text-xs text-cool-gray-400">{aff.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="capitalize text-charcoal-600 dark:text-cool-gray-400 text-xs bg-cool-gray-100 dark:bg-charcoal-700 px-2 py-0.5 rounded-md">
                            {aff.role}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-cool-gray-500 text-xs">
                          {formatDate(aff.joinedAt)}
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-charcoal-800 dark:text-cool-gray-200">
                          {aff.totalTransactions}
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-emerald-600 dark:text-emerald-400">
                          ${aff.totalEarnings.toFixed(2)}
                        </td>
                        <td className="px-4 py-3.5 text-charcoal-700 dark:text-cool-gray-300">
                          ${(aff.affiliateEarnings || 0).toFixed(2)}
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
                  onClick={() => fetchData(page - 1)}
                  disabled={page <= 1}
                  className="text-sm text-cool-gray-500 hover:text-charcoal-700 disabled:opacity-30"
                >
                  ← Prev
                </button>
                <span className="text-xs text-cool-gray-400">Page {page} of {totalPages}</span>
                <button
                  onClick={() => fetchData(page + 1)}
                  disabled={page >= totalPages}
                  className="text-sm text-cool-gray-500 hover:text-charcoal-700 disabled:opacity-30"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
