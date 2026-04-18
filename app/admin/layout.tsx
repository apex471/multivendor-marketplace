'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

const PUBLIC_PATHS = ['/admin/login'];

const NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: '⚡', desc: 'Overview & KPIs' },
  { href: '/admin/approvals', label: 'Approvals', icon: '✅', desc: 'Vendor & rider review', badgeKey: 'approvals' as const },
  { href: '/admin/users', label: 'Users', icon: '👥', desc: 'Account management' },
  { href: '/admin/brands', label: 'Brands', icon: '👑', desc: 'Brand management' },
  { href: '/admin/logistics', label: 'Logistics', icon: '🚚', desc: 'Logistics providers' },
  { href: '/admin/transactions', label: 'Transactions', icon: '💳', desc: 'Payment history' },
  { href: '/admin/orders', label: 'Orders', icon: '📦', desc: 'Order tracking' },
  { href: '/admin/products', label: 'Products', icon: '🏷️', desc: 'Catalog control' },
  { href: '/admin/escrow', label: 'Escrow', icon: '🔒', desc: 'Payment releases', badgeKey: 'escrow' as const },
  { href: '/admin/support', label: 'Support', icon: '💬', desc: 'Customer tickets', badgeKey: 'tickets' as const },
  { href: '/admin/reports', label: 'Reports', icon: '📊', desc: 'Analytics & exports' },
  { href: '/admin/settings', label: 'Settings', icon: '⚙️', desc: 'Platform config' },
];

interface BadgeCounts {
  approvals: number;
  tickets: number;
  escrow: number;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [badges, setBadges] = useState<BadgeCounts>({ approvals: 0, tickets: 0, escrow: 0 });
  const [adminName, setAdminName] = useState('Administrator');
  const [adminInitial, setAdminInitial] = useState('A');
  const [isVerifying, setIsVerifying] = useState(true);
  const [currentTime, setCurrentTime] = useState('');

  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  // Clock
  useEffect(() => {
    const tick = () =>
      setCurrentTime(
        new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      );
    tick();
    const t = setInterval(tick, 60000);
    return () => clearInterval(t);
  }, []);

  // Auth guard + badge fetch
  useEffect(() => {
    if (isPublicPath) {
      setIsVerifying(false);
      return;
    }

    const adminToken = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
    if (!adminToken) {
      router.replace('/admin/login');
      return;
    }

    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (!data.success || data.data?.user?.role !== 'admin') {
          localStorage.removeItem('adminToken');
          router.replace('/admin/login');
          return null;
        }
        const u = data.data.user;
        const name = `${u.firstName} ${u.lastName}`;
        setAdminName(name);
        setAdminInitial(name.charAt(0).toUpperCase());
        setIsVerifying(false);
        return fetch('/api/admin/stats', {
          headers: { Authorization: `Bearer ${adminToken}` },
        }).then((r) => r.json());
      })
      .then((statsData) => {
        if (statsData?.success) {
          setBadges({
            approvals: statsData.data.pending.approvals || 0,
            tickets: statsData.data.pending.tickets || 0,
            escrow: statsData.data.pending.escrow || 0,
          });
        }
      })
      .catch(() => {
        router.replace('/admin/login');
      });
  }, [pathname, isPublicPath]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    router.push('/admin/login');
  };

  // Public paths (login) — no layout wrapper
  if (isPublicPath) return <>{children}</>;

  // Verifying auth
  if (isVerifying) {
    return (
      <div className="min-h-screen bg-charcoal-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-gold-500/40 flex items-center justify-center mx-auto mb-6 animate-pulse shadow-lg">
            <Image
              src="/images/brand/clw-logo.jpg"
              alt="CLW"
              width={56}
              height={56}
              className="w-full h-full object-cover object-top"
              style={{ mixBlendMode: 'luminosity', filter: 'brightness(1.2) contrast(1.1)' }}
            />
          </div>
          <div className="w-8 h-8 border-4 border-gold-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-cool-gray-400 text-sm">Verifying access...</p>
        </div>
      </div>
    );
  }

  const totalBadge = badges.approvals + badges.tickets + badges.escrow;

  return (
    <div className="flex h-screen bg-cool-gray-50 dark:bg-charcoal-900 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ─── SIDEBAR ─── */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50 w-64 flex flex-col
          bg-charcoal-950 border-r border-charcoal-800
          transform transition-transform duration-300 ease-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-charcoal-800">
          <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 shadow-lg border border-gold-500/30">
            <Image
              src="/images/brand/clw-logo.jpg"
              alt="CLW"
              width={40}
              height={40}
              className="w-full h-full object-cover object-top"
              style={{ mixBlendMode: 'luminosity', filter: 'brightness(1.15) contrast(1.1)' }}
            />
          </div>
          <div>
            <h1 className="text-white font-bold text-sm leading-none">Admin Portal</h1>
            <p className="text-cool-gray-500 text-xs mt-0.5">Control Center</p>
          </div>
          <button
            className="ml-auto lg:hidden text-cool-gray-500 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            ✕
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 scrollbar-hide">
          <div className="space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + '/');
              const badgeCount = item.badgeKey ? badges[item.badgeKey] : 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center justify-between px-3 py-2.5 rounded-xl
                    transition-all duration-150 group
                    ${
                      isActive
                        ? 'bg-gold-600/15 border border-gold-500/20 text-gold-400'
                        : 'text-cool-gray-400 hover:bg-charcoal-800 hover:text-cool-gray-100'
                    }
                  `}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`text-base shrink-0 ${isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`}
                    >
                      {item.icon}
                    </span>
                    <span className="text-sm font-medium truncate">{item.label}</span>
                  </div>
                  {badgeCount > 0 && (
                    <span className="shrink-0 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-tight">
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Admin profile & logout */}
        <div className="shrink-0 border-t border-charcoal-800 p-3 space-y-1">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-charcoal-800/50">
            <div className="w-8 h-8 bg-linear-to-br from-gold-500 to-gold-700 rounded-full flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">{adminInitial}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-cool-gray-100 text-sm font-medium truncate">{adminName}</p>
              <p className="text-cool-gray-500 text-xs">Super Admin</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-cool-gray-500 hover:text-red-400 hover:bg-red-900/20 rounded-xl transition-all text-sm"
          >
            <span className="text-base">🚪</span>
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ─── MAIN AREA ─── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top header bar */}
        <header className="shrink-0 bg-white dark:bg-charcoal-900 border-b border-cool-gray-200 dark:border-charcoal-700 px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          {/* Mobile menu toggle */}
          <button
            className="lg:hidden p-2 rounded-lg text-charcoal-600 dark:text-cool-gray-400 hover:bg-cool-gray-100 dark:hover:bg-charcoal-700 transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Breadcrumb */}
          <div className="hidden sm:flex items-center gap-2 text-sm text-charcoal-500 dark:text-cool-gray-500">
            <span className="font-semibold text-charcoal-700 dark:text-cool-gray-300">
              {NAV_ITEMS.find((n) => pathname === n.href || pathname.startsWith(n.href + '/'))?.label || 'Admin'}
            </span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Time */}
            <span className="hidden md:block text-xs text-cool-gray-400 dark:text-charcoal-500 font-mono">
              {currentTime}
            </span>

            {/* Notifications */}
            <Link
              href="/admin/approvals"
              className="relative p-2 text-charcoal-500 dark:text-cool-gray-400 hover:text-gold-600 transition-colors"
            >
              <span className="text-lg">🔔</span>
              {totalBadge > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-charcoal-900 animate-pulse"></span>
              )}
            </Link>

            {/* View site link */}
            <Link
              href="/"
              target="_blank"
              className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-gold-600 hover:text-gold-700 border border-gold-500/30 px-3 py-1.5 rounded-lg hover:bg-gold-500/10 transition-all"
            >
              <span>View Site</span>
              <span className="text-[10px]">↗</span>
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
