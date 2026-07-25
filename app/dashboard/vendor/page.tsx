'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { buildLogisticsReferralUrl } from '@/lib/utils/referral';
import { useAuth } from '@/contexts/AuthContext';
import { getAuthToken } from '@/lib/api/auth';
import { useLocalization } from '@/contexts/LocalizationContext';

type TabType = 'overview' | 'products' | 'orders' | 'logistics' | 'analytics' | 'payouts' | 'settings';

export default function VendorDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const { user, isLoading, isAuthenticated, updateUser } = useAuth();
  const { formatPrice } = useLocalization();
  const [referralLink, setReferralLink] = useState('');
  const [referralCopied, setReferralCopied] = useState(false);
  const [avatar, setAvatar] = useState('');
  const [banner, setBanner] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  useEffect(() => { if (user) { setAvatar(user.avatar || ''); setBanner(user.banner || ''); } }, [user]);

  type VendorOrder = { id: string; customer: string; date: string; items: number; total: number; status: string };
  const [stats, setStats] = useState({ totalProducts: 0, totalOrders: 0, revenue: 0, avgRating: 0 });
  const [recentOrders, setRecentOrders] = useState<VendorOrder[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [totalWithdrawn, setTotalWithdrawn] = useState(0);
  const [payoutHistory, setPayoutHistory] = useState<any[]>([]);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutBankName, setPayoutBankName] = useState('');
  const [payoutAccHolder, setPayoutAccHolder] = useState('');
  const [payoutAccNumber, setPayoutAccNumber] = useState('');
  const [payoutRouting, setPayoutRouting] = useState('');
  const [payoutError, setPayoutError] = useState('');
  const [payoutSuccess, setPayoutSuccess] = useState('');
  const [isSubmittingPayout, setIsSubmittingPayout] = useState(false);

  const loadPayoutData = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) return;
      const res = await fetch('/api/withdraw', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      const json = await res.json();
      if (json.success) {
        setWalletBalance(json.data.balance ?? 0);
        setTotalEarned(json.data.totalEarned ?? 0);
        setTotalWithdrawn(json.data.totalWithdrawn ?? 0);
        setPayoutHistory(json.data.history ?? []);
      }
    } catch { /* silent */ }
  }, []);

  const handlePayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayoutError(''); setPayoutSuccess('');
    const amount = parseFloat(payoutAmount);
    if (!amount || amount <= 0) { setPayoutError('Enter a valid amount'); return; }
    if (!payoutBankName.trim() || !payoutAccHolder.trim() || !payoutAccNumber.trim()) {
      setPayoutError('Bank name, account holder, and account number are required'); return;
    }
    try {
      setIsSubmittingPayout(true);
      const token = getAuthToken();
      const res = await fetch('/api/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount, bankName: payoutBankName, accountHolderName: payoutAccHolder, accountNumber: payoutAccNumber, routingNumber: payoutRouting }),
      });
      const json = await res.json();
      if (!res.ok) { setPayoutError(json.message || 'Request failed'); return; }
      setPayoutSuccess('Withdrawal request submitted! Admin will review within 2-3 business days.');
      setPayoutAmount(''); setPayoutBankName(''); setPayoutAccHolder(''); setPayoutAccNumber(''); setPayoutRouting('');
      loadPayoutData();
      setTimeout(() => { setShowPayoutModal(false); setPayoutSuccess(''); }, 2500);
    } catch (err: any) { setPayoutError(err.message || 'Failed to submit withdrawal request'); }
    finally { setIsSubmittingPayout(false); }
  };

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || !user) { router.replace('/auth/vendor/login'); return; }
    if (user.isEmailVerified === false) { router.replace(`/auth/verify-email/pending?email=${encodeURIComponent(user.email)}&role=vendor`); return; }
    if (user.role !== 'vendor') {
      const paths: Record<string, string> = { brand: '/dashboard/brand', customer: '/dashboard/customer', logistics: '/dashboard/logistics', admin: '/admin/dashboard' };
      router.replace(paths[user.role] || '/');
    }
  }, [isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (isLoading || !isAuthenticated || !user || user.role !== 'vendor') return;
    const token = getAuthToken();
    if (!token) return;
    Promise.all([
      fetch('/api/vendor/orders', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch('/api/vendor/products?limit=1', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([ordersJson, productsJson]) => {
      if (ordersJson?.data?.orders) {
        const rows: VendorOrder[] = (ordersJson.data.orders ?? []).map((o: { id: string; customer: string | { name?: string }; date?: string; createdAt?: string; items: number | unknown[]; total: number; status: string }) => ({
          id: o.id ?? '',
          customer: typeof o.customer === 'object' ? ((o.customer as { name?: string })?.name ?? '') : (o.customer ?? ''),
          date: (() => { try { return new Date(o.createdAt ?? o.date ?? Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return '—'; } })(),
          items: Array.isArray(o.items) ? o.items.length : (typeof o.items === 'number' ? o.items : 0),
          total: typeof o.total === 'number' ? o.total : 0,
          status: o.status ? (o.status.charAt(0).toUpperCase() + o.status.slice(1)) : 'Unknown',
        }));
        setRecentOrders(rows);
        setStats(prev => ({ ...prev, totalOrders: ordersJson.data.totalOrders ?? rows.length, revenue: ordersJson.data.monthlyRevenue ?? 0 }));
      }
      if (productsJson?.data) setStats(prev => ({ ...prev, totalProducts: productsJson.data.total ?? productsJson.data.products?.length ?? 0 }));
    }).catch(() => {});
    loadPayoutData();
  }, [isLoading, isAuthenticated, user, loadPayoutData]);

  type VendorProduct = { id: string; name: string; price: number; stock: number; sales: number; image: string; status: string };
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

  useEffect(() => {
    if (activeTab !== 'products' || isLoading || !isAuthenticated || !user || user.role !== 'vendor') return;
    const token = getAuthToken();
    if (!token) return;
    setProductsLoading(true);
    fetch('/api/vendor/products?limit=50', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data?.products)
          setProducts((json.data.products as any[]).map(p => ({ id: p.id, name: p.name, price: p.price, stock: p.stock ?? 0, sales: p.totalSold ?? 0, image: p.images?.[0] ?? '/images/placeholder.jpg', status: (p.stock ?? 0) > 0 ? 'Active' : 'Out of Stock' })));
      }).catch(() => {}).finally(() => setProductsLoading(false));
  }, [activeTab, isLoading, isAuthenticated, user]);

  const [settingsForm, setSettingsForm] = useState({ storeName: '', bio: '', email: '', phone: '' });
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState('');

  useEffect(() => {
    if (user) setSettingsForm({ storeName: user.fullName || '', bio: (user as any).bio || '', email: user.email || '', phone: (user as any).phoneNumber || '' });
  }, [user]);

  const handleGenerateReferral = () => { setReferralLink(buildLogisticsReferralUrl(user?.id || 'vendor-id', 'vendor', user?.username || 'CLW Vendor')); setReferralCopied(false); };
  const handleCopyReferral = async () => {
    if (!referralLink) return;
    try { await navigator.clipboard.writeText(referralLink); } catch { const ta = document.createElement('textarea'); ta.value = referralLink; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); }
    setReferralCopied(true);
    setTimeout(() => setReferralCopied(false), 2500);
  };

  if (isLoading || !isAuthenticated || !user || user.role !== 'vendor') {
    return (
      <div className="min-h-screen bg-charcoal-950 flex items-center justify-center">
        <div className="text-center"><div className="text-5xl mb-4 animate-pulse">🏪</div><p className="text-cool-gray-400">Loading your dashboard…</p></div>
      </div>
    );
  }

  const statusBadge = (status: string) => {
    const s = (status ?? '').toLowerCase();
    if (s === 'pending')    return 'bg-yellow-950/60 text-yellow-300 border border-yellow-900/40';
    if (s === 'processing') return 'bg-blue-950/60 text-blue-300 border border-blue-900/40';
    if (s === 'shipped')    return 'bg-purple-950/60 text-purple-300 border border-purple-900/40';
    if (s === 'delivered')  return 'bg-green-950/60 text-green-300 border border-green-900/40';
    if (s === 'cancelled')  return 'bg-red-950/60 text-red-300 border border-red-900/40';
    return 'bg-charcoal-700 text-cool-gray-300 border border-charcoal-600';
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' }, { id: 'products', label: 'Products', icon: '📦' },
    { id: 'orders', label: 'Orders', icon: '🛍️' }, { id: 'logistics', label: 'Logistics', icon: '🚚' },
    { id: 'analytics', label: 'Analytics', icon: '📈' }, { id: 'payouts', label: 'Payouts', icon: '💸' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen bg-charcoal-950">
      {/* Sticky Header */}
      <header className="bg-charcoal-900 border-b border-charcoal-800 shadow-lg shadow-charcoal-950/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="shrink-0">
                <Image src="/images/brand/clw-logo.png" alt="CLW" width={40} height={28} className="h-9 w-auto object-contain" />
              </Link>
              <div className="hidden sm:block w-px h-8 bg-charcoal-700" />
              <div>
                <h1 className="text-lg sm:text-xl font-display font-bold text-white flex items-center gap-2"><span>🏪</span> Vendor Dashboard</h1>
                <p className="text-xs text-cool-gray-500">{user?.fullName || user?.email || 'My Store'}{stats.avgRating > 0 ? ` · ${stats.avgRating}★` : ''}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/" className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-cool-gray-400 hover:text-purple-400 transition-colors">← Marketplace</Link>
              <button onClick={() => router.push('/auth/login')} className="px-4 py-2 border border-charcoal-700 hover:border-red-700/50 text-cool-gray-400 hover:text-red-400 rounded-xl text-sm font-semibold transition-colors min-h-9">Logout</button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Identity strip */}
        <div className="mb-6 p-5 bg-charcoal-900 border border-charcoal-800 rounded-2xl flex items-center gap-4">
          <div className="w-1 h-12 bg-linear-to-b from-purple-500 to-purple-700 rounded-full shrink-0" />
          <div>
            <p className="text-purple-400 text-xs font-semibold tracking-widest uppercase mb-0.5">Vendor Portal</p>
            <h2 className="text-xl font-display font-bold text-white">{user?.fullName || 'My Store'}</h2>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-6 sm:mb-8">
          {[
            { label: 'Active Products', value: stats.totalProducts, icon: '📦', accent: 'text-purple-400', sub: 'In your catalog' },
            { label: 'Total Orders',    value: stats.totalOrders,   icon: '🛍️', accent: 'text-blue-400',   sub: 'All time' },
            { label: 'Monthly Revenue', value: formatPrice(stats.revenue), icon: '💰', accent: 'text-green-400', sub: 'Current month' },
            { label: 'Avg Rating',      value: stats.avgRating || '—', icon: '⭐', accent: 'text-gold-400', sub: 'Out of 5.0' },
          ].map(card => (
            <div key={card.label} className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-4 sm:p-5 shadow-lg hover:border-charcoal-600 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs sm:text-sm font-medium text-cool-gray-400">{card.label}</p>
                <span className="text-2xl">{card.icon}</span>
              </div>
              <p className={`text-2xl sm:text-3xl font-bold ${card.accent}`}>{card.value}</p>
              <p className="text-xs text-cool-gray-600 mt-1">{card.sub}</p>
            </div>
          ))}
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 sm:mb-8">
          <div className="border-b border-charcoal-800 overflow-x-auto scrollbar-hide">
            <nav className="flex gap-1 min-w-max" aria-label="Tabs">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`py-3 sm:py-4 px-3 sm:px-5 border-b-2 font-medium text-sm whitespace-nowrap transition-all min-h-11 ${activeTab === tab.id ? 'border-purple-500 text-purple-400' : 'border-transparent text-cool-gray-500 hover:text-cool-gray-300 hover:border-charcoal-600'}`}
                >
                  <span className="mr-2">{tab.icon}</span>{tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div>
          {/* Overview */}
          {activeTab === 'overview' && (
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-4 sm:p-6 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-display font-bold text-white">Recent Orders</h2>
                  <button onClick={() => setActiveTab('orders')} className="text-purple-400 hover:text-purple-300 text-sm font-semibold transition-colors">View All →</button>
                </div>
                <div className="space-y-3">
                  {recentOrders.length === 0 ? (
                    <div className="text-center py-10"><div className="text-4xl mb-3">🛍️</div><p className="text-cool-gray-500 text-sm">No orders yet</p></div>
                  ) : recentOrders.slice(0, 5).map(order => (
                    <div key={order.id} className="p-3 sm:p-4 bg-charcoal-700/60 border border-charcoal-600/50 rounded-xl hover:bg-charcoal-700 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-sm text-white">#{order.id.slice(-8)}</span>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${statusBadge(order.status)}`}>{order.status}</span>
                      </div>
                      <p className="text-xs text-cool-gray-400 mb-2">{order.customer} · {order.date}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-cool-gray-500">{order.items} item{order.items !== 1 ? 's' : ''}</span>
                        <span className="font-bold text-purple-400 text-sm">{formatPrice(order.total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-4 sm:p-6 shadow-lg">
                <h2 className="text-xl font-display font-bold text-white mb-5">Quick Actions</h2>
                <div className="space-y-3">
                  <button onClick={() => router.push('/vendor/products/add')} className="w-full flex items-center gap-4 p-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-all shadow-md hover:shadow-lg min-h-[60px] group">
                    <span className="text-2xl group-hover:scale-110 transition-transform">➕</span>
                    <div className="text-left"><div className="font-bold">Add New Product</div><div className="text-sm text-purple-200/80">List a new luxury item</div></div>
                  </button>
                  <Link href="/post/create" className="w-full flex items-center gap-4 p-4 bg-gold-600 hover:bg-gold-500 text-charcoal-950 rounded-xl transition-all shadow-md min-h-[60px] group">
                    <span className="text-2xl group-hover:scale-110 transition-transform">📸</span>
                    <div className="text-left"><div className="font-bold">Create Post</div><div className="text-sm opacity-70">Share to social feed</div></div>
                  </Link>
                  <Link href="/feed" className="w-full flex items-center gap-4 p-4 bg-charcoal-700 hover:bg-charcoal-600 border border-charcoal-600 hover:border-purple-700/50 text-white rounded-xl transition-all min-h-[60px] group">
                    <span className="text-2xl group-hover:scale-110 transition-transform">🗂️</span>
                    <div className="text-left"><div className="font-bold">View Social Feed</div><div className="text-sm text-cool-gray-400">Browse your posts</div></div>
                  </Link>
                  <button onClick={() => setActiveTab('logistics')} className="w-full flex items-center gap-4 p-4 bg-charcoal-700 hover:bg-charcoal-600 border border-charcoal-600 text-white rounded-xl transition-all min-h-[60px] group">
                    <span className="text-2xl group-hover:scale-110 transition-transform">🚚</span>
                    <div className="text-left"><div className="font-bold">Manage Logistics</div><div className="text-sm text-cool-gray-400">Configure shipping</div></div>
                  </button>
                  <button onClick={() => setActiveTab('analytics')} className="w-full flex items-center gap-4 p-4 bg-charcoal-700 hover:bg-charcoal-600 border border-charcoal-600 text-white rounded-xl transition-colors min-h-[60px] group">
                    <span className="text-2xl group-hover:scale-110 transition-transform">📊</span>
                    <div className="text-left"><div className="font-bold">View Analytics</div><div className="text-sm text-cool-gray-400">Track performance</div></div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Products */}
          {activeTab === 'products' && (
            <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-4 sm:p-6 shadow-lg">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <h2 className="text-2xl font-display font-bold text-white">My Products</h2>
                <button onClick={() => router.push('/vendor/products/add')} className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-colors font-semibold min-h-11 w-full sm:w-auto shadow-md">+ Add Product</button>
              </div>
              {productsLoading ? (
                <div className="text-center py-12"><div className="text-4xl mb-3 animate-pulse">📦</div><p className="text-cool-gray-500">Loading products…</p></div>
              ) : products.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">📦</div>
                  <h3 className="text-lg font-bold text-white mb-2">No products yet</h3>
                  <p className="text-cool-gray-400 mb-6">Add products to start selling</p>
                  <button onClick={() => router.push('/vendor/products/add')} className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-colors font-semibold">+ Add Your First Product</button>
                </div>
              ) : (
                <div className="space-y-3">
                  {products.map(product => (
                    <div key={product.id} className="border border-charcoal-600 bg-charcoal-700/40 rounded-xl p-4 hover:border-charcoal-500 hover:bg-charcoal-700/70 transition-all">
                      <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative w-full sm:w-20 h-28 sm:h-20 rounded-lg overflow-hidden shrink-0 bg-charcoal-600">
                          <Image src={product.image} alt={product.name} fill className="object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-3">
                            <div className="flex-1">
                              <h3 className="font-bold text-base sm:text-lg mb-1 text-white">{product.name}</h3>
                              <p className="text-xl font-bold text-purple-400">{formatPrice(product.price)}</p>
                            </div>
                            <span className={`text-xs px-3 py-1.5 rounded-full w-fit font-semibold ${product.status === 'Active' ? 'bg-green-950/60 text-green-300 border border-green-900/40' : 'bg-red-950/60 text-red-300 border border-red-900/40'}`}>{product.status}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 mb-3">
                            <div><p className="text-xs text-cool-gray-500">Stock</p><p className="font-semibold text-cool-gray-200">{product.stock} units</p></div>
                            <div><p className="text-xs text-cool-gray-500">Total Sales</p><p className="font-semibold text-cool-gray-200">{product.sales} sold</p></div>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <button onClick={() => router.push(`/vendor/products/${product.id}/edit`)} className="flex-1 px-4 py-2 border border-purple-600/60 text-purple-400 rounded-lg hover:bg-purple-950/40 hover:border-purple-500 transition-colors font-semibold min-h-10">Edit</button>
                            <button className="flex-1 px-4 py-2 border border-red-900/60 text-red-400 rounded-lg hover:bg-red-950/40 transition-colors font-semibold min-h-10">Delete</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Orders */}
          {activeTab === 'orders' && (
            <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-4 sm:p-6 shadow-lg">
              <h2 className="text-2xl font-display font-bold text-white mb-6">Order Management</h2>
              <div className="space-y-4">
                {recentOrders.length === 0 && (
                  <div className="text-center py-12"><div className="text-5xl mb-4">🛍️</div><h3 className="text-lg font-bold text-white mb-2">No orders yet</h3><p className="text-sm text-cool-gray-400">Orders containing your products will appear here</p></div>
                )}
                {recentOrders.map(order => (
                  <div key={order.id} className="border border-charcoal-600 bg-charcoal-700/40 rounded-xl p-4 hover:border-charcoal-500 transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                          <h3 className="font-bold text-lg text-white">#{order.id.slice(-8)}</h3>
                          <span className={`text-sm px-3 py-1.5 rounded-full w-fit font-semibold ${statusBadge(order.status)}`}>{order.status}</span>
                        </div>
                        <p className="text-sm text-cool-gray-400 mb-1">Customer: <span className="text-cool-gray-300">{order.customer}</span></p>
                        <p className="text-sm text-cool-gray-400 mb-2">{order.items} item{order.items !== 1 ? 's' : ''} · {order.date}</p>
                        <p className="text-xl font-bold text-purple-400">{formatPrice(order.total)}</p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 lg:flex-col lg:min-w-[140px]">
                        <button className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-colors font-semibold min-h-10 text-sm">View Details</button>
                        {order.status === 'Pending' && <button className="px-4 py-2 bg-green-700 hover:bg-green-600 text-white rounded-xl transition-colors font-semibold min-h-10 text-sm">Process Order</button>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Logistics */}
          {activeTab === 'logistics' && (
            <div className="space-y-6">
              <div className="bg-linear-to-br from-charcoal-950 to-charcoal-800 border border-charcoal-700 text-white rounded-2xl p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div><h2 className="text-xl sm:text-2xl font-display font-bold mb-1">Logistics Management</h2><p className="text-cool-gray-400 text-sm">Browse trusted delivery partners and invite logistics companies to join CLW.</p></div>
                  <Link href="/logistics/providers" className="shrink-0 inline-flex items-center gap-2 px-5 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-sm transition-all"><span>🚚</span> Browse Providers</Link>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[{ icon: '📦', label: 'Active Shipments', value: stats.totalOrders > 0 ? '—' : '0' }, { icon: '✅', label: 'Delivery Rate', value: '—' }, { icon: '⏱️', label: 'Avg Delivery', value: '—' }, { icon: '⭐', label: 'Provider Rating', value: '—' }].map(s => (
                  <div key={s.label} className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-4">
                    <div className="text-2xl mb-2">{s.icon}</div>
                    <p className="text-xs text-cool-gray-500 mb-1">{s.label}</p>
                    <p className="text-2xl font-bold text-white">{s.value}</p>
                  </div>
                ))}
              </div>
              <div className="bg-charcoal-800 border-2 border-dashed border-purple-700/50 rounded-2xl p-5 sm:p-6">
                <div className="flex items-start gap-4 mb-5">
                  <div className="w-12 h-12 bg-purple-900/30 border border-purple-700/40 rounded-xl flex items-center justify-center text-2xl shrink-0">🔗</div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">Invite a Logistics Provider</h3>
                    <p className="text-sm text-cool-gray-400">Know a reliable logistics company? Generate a referral link and share it with them.</p>
                  </div>
                </div>
                {!referralLink ? (
                  <button onClick={handleGenerateReferral} className="w-full sm:w-auto px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-colors font-bold">🔗 Generate Referral Link</button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 p-3 bg-charcoal-700 border border-charcoal-600 rounded-lg">
                      <span className="text-green-400 font-bold text-sm shrink-0">✓ Ready</span>
                      <input type="text" readOnly value={referralLink} className="flex-1 bg-transparent text-xs text-cool-gray-400 outline-none font-mono truncate" onClick={e => (e.target as HTMLInputElement).select()} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={handleCopyReferral} className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${referralCopied ? 'bg-green-700 text-white' : 'bg-purple-600 hover:bg-purple-500 text-white'}`}>{referralCopied ? '✓ Copied!' : '📋 Copy Link'}</button>
                      <button onClick={() => { const s = encodeURIComponent('Join CLW as a Logistics Provider'); const b = encodeURIComponent(`Hi,\n\nI'd like to invite you to join CLW as a logistics provider.\n\nRegister here (valid 7 days):\n${referralLink}`); window.open(`mailto:?subject=${s}&body=${b}`); }} className="px-5 py-2.5 border border-charcoal-600 text-cool-gray-300 rounded-xl font-semibold text-sm hover:bg-charcoal-700 transition-colors">📧 Send via Email</button>
                      <button onClick={() => setReferralLink('')} className="px-4 py-2.5 text-cool-gray-500 rounded-xl font-semibold text-sm hover:bg-charcoal-700 transition-colors">↺ Reset</button>
                    </div>
                    <p className="text-xs text-cool-gray-500">⏰ This link expires in 7 days. The provider must complete all registration steps to become active.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Analytics */}
          {activeTab === 'analytics' && (
            <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-4 sm:p-6 shadow-lg">
              <h2 className="text-2xl font-display font-bold text-white mb-4">Sales Analytics</h2>
              {stats.totalOrders === 0 ? (
                <div className="text-center py-12"><div className="text-5xl mb-4">📊</div><h3 className="text-lg font-bold text-white mb-2">No sales data yet</h3><p className="text-cool-gray-400">Analytics will appear once you start receiving orders</p></div>
              ) : (
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="bg-purple-950/40 border border-purple-900/50 rounded-xl p-5 text-center"><p className="text-xs text-cool-gray-400 mb-1">Total Orders</p><p className="text-3xl font-bold text-purple-400">{stats.totalOrders}</p></div>
                  <div className="bg-green-950/40 border border-green-900/50 rounded-xl p-5 text-center"><p className="text-xs text-cool-gray-400 mb-1">Monthly Revenue</p><p className="text-3xl font-bold text-green-400">{formatPrice(stats.revenue)}</p></div>
                  <div className="bg-blue-950/40 border border-blue-900/50 rounded-xl p-5 text-center"><p className="text-xs text-cool-gray-400 mb-1">Active Products</p><p className="text-3xl font-bold text-blue-400">{stats.totalProducts}</p></div>
                </div>
              )}
            </div>
          )}

          {/* Settings */}
          {activeTab === 'settings' && (
            <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-4 sm:p-6 shadow-lg">
              <h2 className="text-2xl font-display font-bold text-white mb-6">Store Settings</h2>
              {settingsMsg && <div className={`mb-6 px-4 py-3 rounded-xl text-sm font-semibold ${settingsMsg.startsWith('✓') ? 'bg-green-950/60 text-green-300 border border-green-900/50' : 'bg-red-950/60 text-red-300 border border-red-900/50'}`}>{settingsMsg}</div>}
              <div className="max-w-2xl space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-charcoal-700">
                  <div>
                    <label className="block text-sm font-semibold text-cool-gray-300 mb-2">Store Logo</label>
                    <div className="flex items-center gap-4">
                      <div className="relative w-20 h-20 rounded-full overflow-hidden bg-charcoal-700 border border-charcoal-600 flex items-center justify-center shrink-0">
                        {avatar ? <Image src={avatar} alt="Logo Preview" fill className="object-cover" /> : <span className="text-2xl">🏪</span>}
                        {isUploadingAvatar && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /></div>}
                      </div>
                      <div>
                        <input type="file" accept="image/*" id="vendor-logo-file" className="hidden" onChange={async e => { const file = e.target.files?.[0]; if (!file) return; setIsUploadingAvatar(true); setSettingsMsg(''); try { const token = getAuthToken(); const fd = new FormData(); fd.append('file', file); fd.append('folder', 'profiles'); const res = await fetch('/api/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd }); const json = await res.json(); if (res.ok && json.success) { setAvatar(json.data.url); setSettingsMsg('✓ Logo uploaded!'); } else { setSettingsMsg(json.message || 'Upload failed.'); } } catch { setSettingsMsg('Upload failed.'); } finally { setIsUploadingAvatar(false); } }} />
                        <label htmlFor="vendor-logo-file" className="px-4 py-2 bg-charcoal-700 hover:bg-charcoal-600 text-white rounded-lg text-sm font-semibold cursor-pointer transition-colors inline-block">Upload Logo</label>
                        <p className="text-xs text-cool-gray-500 mt-1.5">Square image. Max 10MB.</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-cool-gray-300 mb-2">Store Banner</label>
                    <div className="flex flex-col gap-3">
                      <div className="relative w-full h-24 rounded-xl overflow-hidden bg-charcoal-700 border border-charcoal-600 flex items-center justify-center">
                        {banner ? <Image src={banner} alt="Banner Preview" fill className="object-cover" /> : <span className="text-cool-gray-500 text-sm">No Banner Uploaded</span>}
                        {isUploadingBanner && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" /></div>}
                      </div>
                      <div>
                        <input type="file" accept="image/*" id="vendor-banner-file" className="hidden" onChange={async e => { const file = e.target.files?.[0]; if (!file) return; setIsUploadingBanner(true); setSettingsMsg(''); try { const token = getAuthToken(); const fd = new FormData(); fd.append('file', file); fd.append('folder', 'banners'); const res = await fetch('/api/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd }); const json = await res.json(); if (res.ok && json.success) { setBanner(json.data.url); setSettingsMsg('✓ Banner uploaded!'); } else { setSettingsMsg(json.message || 'Upload failed.'); } } catch { setSettingsMsg('Upload failed.'); } finally { setIsUploadingBanner(false); } }} />
                        <label htmlFor="vendor-banner-file" className="px-4 py-2 bg-charcoal-700 hover:bg-charcoal-600 text-white rounded-lg text-sm font-semibold cursor-pointer transition-colors inline-block">Upload Banner</label>
                        <p className="text-xs text-cool-gray-500 mt-1.5">Recommended ratio 3:1. Max 10MB.</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div><label className="block text-sm font-semibold text-cool-gray-300 mb-2">Store Name</label><input type="text" value={settingsForm.storeName} onChange={e => setSettingsForm(f => ({ ...f, storeName: e.target.value }))} className="w-full px-4 py-3 bg-charcoal-700 border border-charcoal-600 text-white rounded-xl focus:ring-2 focus:ring-purple-500 outline-none placeholder:text-cool-gray-600" /></div>
                <div><label className="block text-sm font-semibold text-cool-gray-300 mb-2">Store Description</label><textarea rows={4} value={settingsForm.bio} onChange={e => setSettingsForm(f => ({ ...f, bio: e.target.value }))} placeholder="Describe your store…" className="w-full px-4 py-3 bg-charcoal-700 border border-charcoal-600 text-white rounded-xl focus:ring-2 focus:ring-purple-500 outline-none placeholder:text-cool-gray-600" /></div>
                <div><label className="block text-sm font-semibold text-cool-gray-300 mb-2">Business Email</label><input type="email" value={settingsForm.email} readOnly className="w-full px-4 py-3 bg-charcoal-900 border border-charcoal-700 text-cool-gray-500 rounded-xl cursor-not-allowed" /></div>
                <div><label className="block text-sm font-semibold text-cool-gray-300 mb-2">Business Phone</label><input type="tel" value={settingsForm.phone} onChange={e => setSettingsForm(f => ({ ...f, phone: e.target.value }))} placeholder="e.g. +1 (555) 000-0000" className="w-full px-4 py-3 bg-charcoal-700 border border-charcoal-600 text-white rounded-xl focus:ring-2 focus:ring-purple-500 outline-none placeholder:text-cool-gray-600" /></div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button disabled={settingsSaving} onClick={async () => { const token = getAuthToken(); if (!token) return; setSettingsSaving(true); setSettingsMsg(''); const parts = settingsForm.storeName.trim().split(' '); try { const res = await fetch('/api/auth/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ firstName: parts[0] || '', lastName: parts.slice(1).join(' ') || '', bio: settingsForm.bio, phoneNumber: settingsForm.phone, avatar: avatar || undefined, banner: banner || undefined }) }); const d = await res.json(); if (res.ok && d.success) { setSettingsMsg('✓ Settings saved'); updateUser({ avatar: avatar || undefined, banner: banner || undefined, fullName: settingsForm.storeName, bio: settingsForm.bio, phoneNumber: settingsForm.phone }); } else { setSettingsMsg(d.message || 'Save failed'); } } catch { setSettingsMsg('Save failed — please try again'); } finally { setSettingsSaving(false); setTimeout(() => setSettingsMsg(''), 3000); } }} className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-colors font-bold min-h-12 disabled:opacity-60">
                    {settingsSaving ? 'Saving…' : 'Save Changes'}
                  </button>
                  <button onClick={() => { setSettingsForm({ storeName: user?.fullName || '', bio: (user as any)?.bio || '', email: user?.email || '', phone: (user as any)?.phoneNumber || '' }); setAvatar(user?.avatar || ''); setBanner(user?.banner || ''); }} className="px-6 py-3 border border-charcoal-600 text-cool-gray-300 rounded-xl hover:bg-charcoal-700 transition-colors font-semibold min-h-12">Cancel</button>
                </div>
              </div>
            </div>
          )}

          {/* Payouts */}
          {activeTab === 'payouts' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5 shadow-lg hover:border-charcoal-600 transition-colors">
                  <p className="text-xs font-semibold text-cool-gray-400 uppercase tracking-wider">Available Balance</p>
                  <h3 className="text-3xl font-black text-white mt-2">{formatPrice(walletBalance)}</h3>
                  <p className="text-[11px] text-cool-gray-500 mt-1">Cleared funds ready to withdraw</p>
                  <button onClick={() => { setPayoutError(''); setPayoutSuccess(''); setShowPayoutModal(true); }} disabled={walletBalance <= 0} className="mt-4 w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors min-h-10 disabled:opacity-50 disabled:cursor-not-allowed">💳 Request Payout</button>
                </div>
                <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5 shadow-lg">
                  <p className="text-xs font-semibold text-cool-gray-400 uppercase tracking-wider">Lifetime Earnings</p>
                  <h3 className="text-3xl font-black text-green-400 mt-2">{formatPrice(totalEarned)}</h3>
                  <p className="text-[11px] text-cool-gray-500 mt-1">Total revenue generated (released escrow)</p>
                </div>
                <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5 shadow-lg">
                  <p className="text-xs font-semibold text-cool-gray-400 uppercase tracking-wider">Withdrawn / Pending</p>
                  <h3 className="text-3xl font-black text-white mt-2">{formatPrice(totalWithdrawn)}</h3>
                  <p className="text-[11px] text-cool-gray-500 mt-1">Includes both pending & processed requests</p>
                </div>
              </div>
              <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl overflow-hidden shadow-lg">
                <div className="px-5 py-4 border-b border-charcoal-700">
                  <h3 className="text-lg font-bold text-white">Transaction & Payout History</h3>
                  <p className="text-xs text-cool-gray-500 mt-0.5">List of incoming earnings and outgoing payout requests</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-charcoal-900/60 text-cool-gray-400 border-b border-charcoal-700">
                      <tr>
                        <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider">Details</th>
                        <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider">Type</th>
                        <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-right">Amount</th>
                        <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-charcoal-700/50">
                      {payoutHistory.length === 0 ? (
                        <tr><td colSpan={4} className="px-5 py-12 text-center text-cool-gray-500">No transactions recorded yet.</td></tr>
                      ) : payoutHistory.map((tx: any, txIdx: number) => {
                        const isIncome = tx.type === 'escrow_release';
                        let txDateStr = '—', txTimeStr = '';
                        try { if (tx.createdAt) { const d = new Date(tx.createdAt); if (!isNaN(d.getTime())) { txDateStr = d.toLocaleDateString(); txTimeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } } } catch { /* ignore */ }
                        return (
                          <tr key={tx.id ?? tx.transactionId ?? txIdx} className="hover:bg-charcoal-700/30 transition-colors">
                            <td className="px-5 py-4">
                              <div className="font-semibold text-white text-sm">{isIncome ? 'Order Escrow Release' : 'Withdrawal Request'}</div>
                              <div className="text-xs text-cool-gray-400 mt-0.5">{tx.description}</div>
                              <div className="text-[10px] text-cool-gray-500 mt-1">ID: {tx.transactionId ?? '—'} · {txDateStr}{txTimeStr ? ` ${txTimeStr}` : ''}</div>
                            </td>
                            <td className="px-5 py-4"><span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${isIncome ? 'bg-green-950/60 text-green-300 border border-green-900/50' : 'bg-yellow-950/60 text-yellow-300 border border-yellow-900/50'}`}>{isIncome ? 'Income' : 'Withdrawal'}</span></td>
                            <td className="px-5 py-4 text-right"><div className={`font-bold ${isIncome ? 'text-green-400' : 'text-white'}`}>{isIncome ? '+' : '-'}{formatPrice(tx.amount)}</div></td>
                            <td className="px-5 py-4">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${tx.status === 'completed' ? 'bg-green-950/60 text-green-300 border border-green-900/50' : tx.status === 'pending' ? 'bg-yellow-950/60 text-yellow-300 border border-yellow-900/50 animate-pulse' : 'bg-red-950/60 text-red-300 border border-red-900/50'}`}>{tx.status}</span>
                              {tx.metadata?.adminNotes && <div className="text-cool-gray-400 text-[11px] mt-1 max-w-[150px] break-words">{tx.metadata.adminNotes}</div>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              {showPayoutModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-xs">
                  <div className="bg-charcoal-800 border border-charcoal-700 rounded-2xl w-full max-w-md shadow-2xl p-6">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-charcoal-700">
                      <h3 className="text-lg font-bold text-white">Request Payout</h3>
                      <button onClick={() => setShowPayoutModal(false)} className="text-cool-gray-400 hover:text-white text-2xl leading-none transition-colors">×</button>
                    </div>
                    <form onSubmit={handlePayoutSubmit} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-cool-gray-400 uppercase tracking-wider mb-1">Amount to Withdraw ($)</label>
                        <input type="number" step="0.01" placeholder="0.00" value={payoutAmount} onChange={e => setPayoutAmount(e.target.value)} max={walletBalance} className="w-full px-4 py-2.5 bg-charcoal-700 border border-charcoal-600 rounded-xl text-white outline-none focus:ring-2 focus:ring-purple-500 text-sm font-semibold" />
                        <p className="text-[11px] text-cool-gray-500 mt-1">Available: {formatPrice(walletBalance)} (Min. withdrawal {formatPrice(50)})</p>
                      </div>
                      {[{ label: 'Bank Name', ph: 'e.g. JPMorgan Chase', val: payoutBankName, set: setPayoutBankName }, { label: 'Account Holder Name', ph: 'e.g. Acme Corp LLC', val: payoutAccHolder, set: setPayoutAccHolder }, { label: 'Account Number', ph: 'Bank account number', val: payoutAccNumber, set: setPayoutAccNumber }, { label: 'Routing Number (Optional)', ph: '9-digit routing number', val: payoutRouting, set: setPayoutRouting }].map(f => (
                        <div key={f.label}><label className="block text-xs font-bold text-cool-gray-400 uppercase tracking-wider mb-1">{f.label}</label><input type="text" placeholder={f.ph} value={f.val} onChange={e => f.set(e.target.value)} className="w-full px-4 py-2.5 bg-charcoal-700 border border-charcoal-600 rounded-xl text-white outline-none focus:ring-2 focus:ring-purple-500 text-sm" /></div>
                      ))}
                      {payoutError   && <div className="p-3 bg-red-950/60 text-red-300 border border-red-900/50 rounded-xl text-xs font-semibold">{payoutError}</div>}
                      {payoutSuccess && <div className="p-3 bg-green-950/60 text-green-300 border border-green-900/50 rounded-xl text-xs font-semibold">{payoutSuccess}</div>}
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <button type="button" onClick={() => setShowPayoutModal(false)} className="py-2.5 bg-charcoal-700 hover:bg-charcoal-600 text-cool-gray-300 font-semibold rounded-xl text-sm min-h-11 transition-colors">Cancel</button>
                        <button type="submit" disabled={isSubmittingPayout} className="py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl text-sm min-h-11 disabled:opacity-50 transition-colors">{isSubmittingPayout ? 'Submitting…' : 'Submit Request'}</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
