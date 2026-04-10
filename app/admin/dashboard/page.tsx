'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface StatsData {
  users: {
    total: number;
    customers: number;
    vendors: number;
    brands: number;
    logistics: number;
    admins: number;
    suspended: number;
    newToday: number;
    growthPercent: number;
  };
  pending: {
    approvals: number;
    tickets: number;
    escrow: number;
  };
  financials: {
    totalRevenue: number;
    monthRevenue: number;
    pendingEscrow: number;
    commissionEarned: number;
  };
  charts: {
    weeklySignups: { date: string; count: number }[];
  };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchStats = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
      const res = await fetch('/api/admin/stats', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Failed to fetch stats');
      const data = await res.json();
      setStats(data.data);
      setLastRefresh(new Date());
    } catch {
      setError('Failed to load dashboard stats.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 60_000); // auto-refresh every minute
    return () => clearInterval(interval);
  }, []);

  const fmt = (n: number) => n?.toLocaleString() ?? '—';
  const fmtMoney = (n: number) => n != null ? `$${n.toLocaleString(undefined, { minimumFractionDigits: 0 })}` : '—';

  const maxWeekly = stats ? Math.max(...stats.charts.weeklySignups.map(d => d.count), 1) : 1;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gold-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-cool-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Platform Overview</h1>
          <p className="text-cool-gray-400 text-sm mt-1">
            Live data · Last updated {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); fetchStats(); }}
          className="flex items-center gap-2 px-4 py-2 bg-charcoal-700 hover:bg-charcoal-600 text-white text-sm font-medium rounded-lg transition-colors border border-charcoal-600"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-700 rounded-xl text-red-300 text-sm">{error}</div>
      )}

      {/* KPI Cards Row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Revenue */}
        <div className="bg-gold-600 rounded-xl p-5 text-white col-span-1">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
              {stats?.users.growthPercent != null
                ? `${stats.users.growthPercent >= 0 ? '+' : ''}${stats.users.growthPercent}%`
                : ''}
            </span>
          </div>
          <div className="text-2xl font-bold">{fmtMoney(stats?.financials.totalRevenue ?? 0)}</div>
          <div className="text-xs mt-1 text-white/80">Total Revenue</div>
        </div>

        {/* This Month */}
        <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5">
          <div className="w-10 h-10 bg-green-900/40 rounded-lg flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div className="text-2xl font-bold text-white">{fmtMoney(stats?.financials.monthRevenue ?? 0)}</div>
          <div className="text-xs text-cool-gray-400 mt-1">This Month</div>
        </div>

        {/* Platform Commission */}
        <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5">
          <div className="w-10 h-10 bg-purple-900/40 rounded-lg flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
            </svg>
          </div>
          <div className="text-2xl font-bold text-white">{fmtMoney(stats?.financials.commissionEarned ?? 0)}</div>
          <div className="text-xs text-cool-gray-400 mt-1">Commission Earned (10%)</div>
        </div>

        {/* Pending Escrow */}
        <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-yellow-900/40 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            {(stats?.pending.escrow ?? 0) > 0 && (
              <Link href="/admin/escrow" className="text-xs text-gold-500 hover:text-gold-400 font-medium">Review →</Link>
            )}
          </div>
          <div className="text-2xl font-bold text-white">{fmtMoney(stats?.financials.pendingEscrow ?? 0)}</div>
          <div className="text-xs text-cool-gray-400 mt-1">Pending Escrow</div>
        </div>
      </div>

      {/* User Stats + Pending Actions Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* User Breakdown */}
        <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-white">User Breakdown</h2>
            <Link href="/admin/users" className="text-xs text-gold-500 hover:text-gold-400 font-medium">Manage →</Link>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-charcoal-700 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-white">{fmt(stats?.users.total ?? 0)}</div>
              <div className="text-xs text-cool-gray-400 mt-0.5">Total Users</div>
            </div>
            <div className="bg-blue-900/30 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-blue-300">{fmt(stats?.users.customers ?? 0)}</div>
              <div className="text-xs text-blue-400/80 mt-0.5">Customers</div>
            </div>
            <div className="bg-purple-900/30 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-purple-300">{fmt(stats?.users.vendors ?? 0)}</div>
              <div className="text-xs text-purple-400/80 mt-0.5">Vendors</div>
            </div>
            <div className="bg-gold-900/30 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-gold-400">{fmt(stats?.users.brands ?? 0)}</div>
              <div className="text-xs text-gold-500/80 mt-0.5">Brands</div>
            </div>
            <div className="bg-green-900/30 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-green-300">{fmt(stats?.users.logistics ?? 0)}</div>
              <div className="text-xs text-green-400/80 mt-0.5">Logistics</div>
            </div>
            <div className="bg-red-900/30 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-red-300">{fmt(stats?.users.suspended ?? 0)}</div>
              <div className="text-xs text-red-400/80 mt-0.5">Suspended</div>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-3 border-t border-charcoal-700">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs text-cool-gray-400">
              <span className="text-green-400 font-semibold">{fmt(stats?.users.newToday ?? 0)}</span> new users today
            </span>
          </div>
        </div>

        {/* Pending Actions */}
        <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5">
          <h2 className="text-base font-bold text-white mb-5">Pending Actions</h2>
          <div className="space-y-3">
            <Link href="/admin/approvals" className="flex items-center justify-between p-3 bg-charcoal-700 hover:bg-charcoal-600 rounded-lg transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-yellow-900/40 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-sm text-white">Applications</span>
              </div>
              <div className="flex items-center gap-2">
                {(stats?.pending.approvals ?? 0) > 0 && (
                  <span className="bg-yellow-500 text-charcoal-900 text-xs font-bold px-2 py-0.5 rounded-full">
                    {stats?.pending.approvals}
                  </span>
                )}
                <svg className="w-4 h-4 text-cool-gray-500 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
            <Link href="/admin/support" className="flex items-center justify-between p-3 bg-charcoal-700 hover:bg-charcoal-600 rounded-lg transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-red-900/40 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                </div>
                <span className="text-sm text-white">Support Tickets</span>
              </div>
              <div className="flex items-center gap-2">
                {(stats?.pending.tickets ?? 0) > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {stats?.pending.tickets}
                  </span>
                )}
                <svg className="w-4 h-4 text-cool-gray-500 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
            <Link href="/admin/escrow" className="flex items-center justify-between p-3 bg-charcoal-700 hover:bg-charcoal-600 rounded-lg transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-900/40 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <span className="text-sm text-white">Escrow Releases</span>
              </div>
              <div className="flex items-center gap-2">
                {(stats?.pending.escrow ?? 0) > 0 && (
                  <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {stats?.pending.escrow}
                  </span>
                )}
                <svg className="w-4 h-4 text-cool-gray-500 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Weekly Signups Chart */}
      <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-white">New Signups — Last 7 Days</h2>
            <p className="text-xs text-cool-gray-400 mt-0.5">
              Total: {stats?.charts.weeklySignups.reduce((s, d) => s + d.count, 0) ?? 0} new users
            </p>
          </div>
        </div>
        <div className="flex items-end gap-2 h-32">
          {stats?.charts.weeklySignups.map((day, i) => {
            const pct = Math.round((day.count / maxWeekly) * 100);
            const label = new Date(day.date).toLocaleDateString('en', { weekday: 'short' });
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                <span className="text-xs text-cool-gray-500 group-hover:text-white transition-colors opacity-0 group-hover:opacity-100">
                  {day.count}
                </span>
                <div className="w-full relative flex items-end" style={{ height: '80px' }}>
                  <div
                    className="w-full bg-gold-600 hover:bg-gold-500 rounded-t transition-all cursor-default"
                    style={{ height: `${Math.max(pct, 4)}%`, minHeight: '4px' }}
                    title={`${label}: ${day.count} signups`}
                  />
                </div>
                <span className="text-xs text-cool-gray-500">{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Delivery Overview */}
      <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-white">🚚 Delivery Overview</h2>
            <p className="text-xs text-cool-gray-400 mt-0.5">Courier usage breakdown across all orders</p>
          </div>
          <Link href="/admin/orders" className="text-xs text-gold-500 hover:text-gold-400 font-medium">All Orders →</Link>
        </div>
        <div className="space-y-3">
          {[
            { id: 'ecopost',     icon: '🌿', name: 'EcoPost',         price: 0,     orders: 18, color: 'bg-green-500' },
            { id: 'swiftship',   icon: '📦', name: 'SwiftShip',       price: 4.99,  orders: 34, color: 'bg-blue-500' },
            { id: 'quickbox',    icon: '🚀', name: 'QuickBox Express',price: 12.99, orders: 27, color: 'bg-gold-500' },
            { id: 'flashrunner', icon: '⚡', name: 'FlashRunner',     price: 24.99, orders: 12, color: 'bg-orange-500' },
            { id: 'zerowait',    icon: '🔥', name: 'ZeroWait',        price: 49.99, orders: 6,  color: 'bg-red-500' },
          ].map(courier => {
            const maxOrders = 34;
            const pct = Math.round((courier.orders / maxOrders) * 100);
            return (
              <div key={courier.id} className="flex items-center gap-3">
                <span className="text-xl w-7 text-center select-none shrink-0">{courier.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-white truncate">{courier.name}</span>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-xs text-cool-gray-400">{courier.orders} orders</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        courier.price === 0 ? 'bg-green-900/50 text-green-400' : 'bg-charcoal-700 text-gold-400'
                      }`}>
                        {courier.price === 0 ? 'FREE' : `$${courier.price}`}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-charcoal-700 rounded-full overflow-hidden">
                    <div className={`h-full ${courier.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <Link
                  href={`/admin/orders?courier=${courier.id}`}
                  className="shrink-0 text-[10px] text-cool-gray-500 hover:text-gold-400 transition-colors"
                >
                  →
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { href: '/admin/users', icon: '👥', label: 'Users', sub: 'Manage accounts' },
          { href: '/admin/approvals', icon: '✅', label: 'Approvals', sub: 'Review applications' },
          { href: '/admin/transactions', icon: '💳', label: 'Transactions', sub: 'View all payments' },
          { href: '/admin/orders', icon: '📦', label: 'Orders', sub: 'Track orders' },
          { href: '/admin/escrow', icon: '🔒', label: 'Escrow', sub: 'Approve releases' },
          { href: '/admin/support', icon: '💬', label: 'Support', sub: 'Help customers' },
          { href: '/admin/reports', icon: '📊', label: 'Reports', sub: 'Platform analytics' },
          { href: '/admin/settings', icon: '⚙️', label: 'Settings', sub: 'Configure platform' },
        ].map(({ href, icon, label, sub }) => (
          <Link
            key={href}
            href={href}
            className="p-4 bg-charcoal-800 border border-charcoal-700 rounded-xl hover:border-gold-600 hover:bg-charcoal-750 transition-all text-center group"
          >
            <span className="text-3xl mb-2 block">{icon}</span>
            <div className="text-sm font-semibold text-white group-hover:text-gold-400 transition-colors">{label}</div>
            <div className="text-xs text-cool-gray-500 mt-0.5">{sub}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
