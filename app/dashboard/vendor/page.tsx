'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { buildLogisticsReferralUrl } from '@/lib/utils/referral';
import { useAuth } from '@/contexts/AuthContext';
import { getAuthToken } from '@/lib/api/auth';

type TabType = 'overview' | 'products' | 'orders' | 'logistics' | 'analytics' | 'payouts' | 'settings';

export default function VendorDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const { user, isLoading, isAuthenticated, updateUser } = useAuth();
  const [referralLink, setReferralLink] = useState('');
  const [referralCopied, setReferralCopied] = useState(false);

  // Profile avatar & banner states
  const [avatar, setAvatar] = useState('');
  const [banner, setBanner] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  useEffect(() => {
    if (user) {
      setAvatar(user.avatar || '');
      setBanner(user.banner || '');
    }
  }, [user]);

  // ── Dashboard data state ────────────────────────────────────────────
  type VendorOrder = { id: string; customer: string; date: string; items: number; total: number; status: string };
  const [stats, setStats] = useState({ totalProducts: 0, totalOrders: 0, revenue: 0, avgRating: 0 });
  const [recentOrders, setRecentOrders] = useState<VendorOrder[]>([]);

  // ── Payout & Wallet state ──
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
      const res = await fetch('/api/withdraw', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      if (json.success) {
        setWalletBalance(json.data.balance || 0);
        setTotalEarned(json.data.totalEarned || 0);
        setTotalWithdrawn(json.data.totalWithdrawn || 0);
        setPayoutHistory(json.data.history || []);
      }
    } catch (err) {
      console.error('Failed to load wallet data', err);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'payouts') {
      loadPayoutData();
    }
  }, [activeTab, loadPayoutData]);

  const handlePayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayoutError('');
    setPayoutSuccess('');
    setIsSubmittingPayout(true);

    const amount = Number(payoutAmount);
    if (!amount || amount <= 0 || isNaN(amount)) {
      setPayoutError('Please enter a valid amount');
      setIsSubmittingPayout(false);
      return;
    }

    if (!payoutBankName || !payoutAccHolder || !payoutAccNumber) {
      setPayoutError('Please fill in all required fields');
      setIsSubmittingPayout(false);
      return;
    }

    try {
      const token = getAuthToken();
      const res = await fetch('/api/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount,
          bankName: payoutBankName,
          accountHolderName: payoutAccHolder,
          accountNumber: payoutAccNumber,
          routingNumber: payoutRouting,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Withdrawal failed');

      setPayoutSuccess('🟢 Payout request submitted! Awaiting admin approval.');
      setPayoutAmount('');
      setPayoutBankName('');
      setPayoutAccHolder('');
      setPayoutAccNumber('');
      setPayoutRouting('');
      
      // Reload balance
      loadPayoutData();
      
      setTimeout(() => {
        setShowPayoutModal(false);
        setPayoutSuccess('');
      }, 2500);
    } catch (err: any) {
      setPayoutError(err.message || 'Failed to submit withdrawal request');
    } finally {
      setIsSubmittingPayout(false);
    }
  };
  // ── Auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isLoading) return; // wait for hydration

    if (!isAuthenticated || !user) {
      router.replace('/auth/vendor/login');
      return;
    }

    if (!user.isEmailVerified) {
      router.replace(
        `/auth/verify-email/pending?email=${encodeURIComponent(user.email)}&role=vendor`
      );
      return;
    }

    if (user.role !== 'vendor') {
      // Wrong role — send them to the correct dashboard
      const paths: Record<string, string> = {
        brand: '/dashboard/brand',
        customer: '/dashboard/customer',
        logistics: '/dashboard/logistics',
        admin: '/admin/dashboard',
      };
      router.replace(paths[user.role] || '/');
    }
  }, [isLoading, isAuthenticated, user, router]);

  // ── Fetch vendor data once auth confirms vendor role ─────────────────────
  useEffect(() => {
    if (isLoading || !isAuthenticated || !user || user.role !== 'vendor') return;
    const token = getAuthToken();
    if (!token) return;
    Promise.all([
      fetch('/api/vendor/orders',          { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch('/api/vendor/products?limit=1', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([ordersJson, productsJson]) => {
      if (ordersJson.success) {
        const rows: VendorOrder[] = (ordersJson.data.orders ?? []).map((o: {
          id: string; customer: string | { name?: string; email?: string }; date?: string; createdAt?: string; items: number; total: number; status: string;
        }) => ({
          id:       o.id,
          customer: typeof o.customer === 'object' ? (o.customer?.name ?? '') : (o.customer ?? ''),
          date:     new Date(o.createdAt ?? o.date ?? Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          items:    o.items,
          total:    o.total,
          status:   o.status.charAt(0).toUpperCase() + o.status.slice(1),
        }));
        setRecentOrders(rows);
        setStats(prev => ({
          ...prev,
          totalOrders: ordersJson.data.stats?.totalOrders ?? rows.length,
          revenue:     ordersJson.data.stats?.monthlyRevenue ?? 0,
        }));
      }
      if (productsJson.success) {
        setStats(prev => ({ ...prev, totalProducts: productsJson.data.total ?? 0 }));
      }
    }).catch(() => {});

    // Fetch full products list for the products tab
    setProductsLoading(true);
    fetch('/api/vendor/products', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setProducts((d.data.products ?? []).map((p: {
            _id?: string; id?: string; name: string; price: number; stock?: number;
            totalSold?: number; images?: string[]; status?: string;
          }) => ({
            id:     p._id ?? p.id ?? '',
            name:   p.name,
            price:  p.price,
            stock:  p.stock ?? 0,
            sales:  p.totalSold ?? 0,
            image:  p.images?.[0] ?? '/images/placeholder.jpg',
            status: (p.stock ?? 0) > 0 ? 'Active' : 'Out of Stock',
          })));
        }
      })
      .catch(() => {})
      .finally(() => setProductsLoading(false));
  }, [isLoading, isAuthenticated, user]);

  const handleGenerateReferral = () => {
    const url = buildLogisticsReferralUrl(
      user?.id || 'vendor-id',
      'vendor',
      user?.username || 'CLW Vendor'
    );
    setReferralLink(url);
    setReferralCopied(false);
  };

  const handleCopyReferral = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = referralLink;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setReferralCopied(true);
    setTimeout(() => setReferralCopied(false), 2500);
  };

  // ── Products state (fetched from API) ──────────────────────────────────────
  type VendorProduct = { id: string; name: string; price: number; stock: number; sales: number; image: string; status: string };
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

  // Settings form state
  const [settingsForm, setSettingsForm] = useState({ storeName: '', bio: '', email: '', phone: '' });
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState('');

  // Sync settings with user
  useEffect(() => {
    if (user) {
      setSettingsForm({
        storeName: user.fullName || '',
        bio: (user as unknown as Record<string,string>).bio || '',
        email: user.email || '',
        phone: (user as unknown as Record<string,string>).phoneNumber || '',
      });
    }
  }, [user]);

  // Show nothing while auth is being checked
  if (isLoading || !isAuthenticated || !user || !user.isEmailVerified || user.role !== 'vendor') {
    return (
      <div className="min-h-screen bg-linear-to-br from-purple-600/10 via-white to-purple-600/5 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-pulse">🏪</div>
          <p className="text-gray-500">Loading your dashboard…</p>
        </div>
      </div>
    );
  }
  // ─────────────────────────────────────────────────────────────────────────────

  const orderStatusClass = (status: string) =>
    status === 'Pending'
      ? 'bg-yellow-100 text-yellow-700'
      : status === 'Processing'
      ? 'bg-blue-100 text-blue-700'
      : 'bg-green-100 text-green-700';

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'products', label: 'Products', icon: '📦' },
    { id: 'orders', label: 'Orders', icon: '🛍️' },
    { id: 'logistics', label: 'Logistics', icon: '🚚' },
    { id: 'analytics', label: 'Analytics', icon: '📈' },
    { id: 'payouts', label: 'Payouts', icon: '💸' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen bg-linear-to-br from-purple-600/10 via-white to-purple-600/5 dark:from-charcoal-900 dark:via-charcoal-900 dark:to-charcoal-800">

      {/* Sticky Header */}
      <header className="bg-white dark:bg-charcoal-800 border-b border-cool-gray-300 dark:border-charcoal-700 shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🏪</span>
              <div>
                <h1 className="text-xl sm:text-2xl font-display font-bold text-gray-900 dark:text-white">
                  Vendor Dashboard
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-cool-gray-400">
                  {user?.fullName || user?.email || 'My Store'}{stats.avgRating > 0 ? ` · ${stats.avgRating}★` : ''}
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push('/auth/login')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors text-sm sm:text-base min-h-11"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white dark:bg-charcoal-800 rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100 dark:border-charcoal-700">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-cool-gray-400">Active Products</p>
              <span className="text-2xl">📦</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats.totalProducts}</p>
            <p className="text-xs text-gray-500 dark:text-cool-gray-500 mt-1">In your catalog</p>
          </div>
          <div className="bg-white dark:bg-charcoal-800 rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100 dark:border-charcoal-700">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-cool-gray-400">Total Orders</p>
              <span className="text-2xl">🛍️</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats.totalOrders}</p>
            <p className="text-xs text-gray-500 dark:text-cool-gray-500 mt-1">All time</p>
          </div>
          <div className="bg-white dark:bg-charcoal-800 rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100 dark:border-charcoal-700">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-cool-gray-400">Monthly Revenue</p>
              <span className="text-2xl">💰</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">${stats.revenue.toLocaleString()}</p>
            <p className="text-xs text-green-600 mt-1">Current month</p>
          </div>
          <div className="bg-white dark:bg-charcoal-800 rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100 dark:border-charcoal-700">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-cool-gray-400">Avg Rating</p>
              <span className="text-2xl">⭐</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats.avgRating}</p>
            <p className="text-xs text-gray-500 dark:text-cool-gray-500 mt-1">Out of 5.0</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 sm:mb-8">
          <div className="border-b border-gray-200 dark:border-charcoal-700 overflow-x-auto">
            <nav className="flex gap-4 sm:gap-8 min-w-max" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors min-h-11 ${
                    activeTab === tab.id
                      ? 'border-purple-600 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-cool-gray-400 dark:hover:text-white'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
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
              <div className="bg-white dark:bg-charcoal-800 rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100 dark:border-charcoal-700">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white">Recent Orders</h2>
                  <button onClick={() => setActiveTab('orders')} className="text-purple-600 hover:text-purple-700 text-sm font-semibold">
                    View All →
                  </button>
                </div>
                <div className="space-y-4">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="p-3 sm:p-4 bg-gray-50 dark:bg-charcoal-700 rounded-lg hover:bg-gray-100 dark:hover:bg-charcoal-600 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white">{order.id}</span>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${orderStatusClass(order.status)}`}>{order.status}</span>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-cool-gray-400 mb-1">{order.customer} · {order.date}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs sm:text-sm text-gray-700 dark:text-cool-gray-300">{order.items} items</span>
                        <span className="font-bold text-purple-600 text-sm sm:text-base">${order.total.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-charcoal-800 rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100 dark:border-charcoal-700">
                <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-6">Quick Actions</h2>
                <div className="space-y-3">
                  <button
                    onClick={() => router.push('/vendor/products/add')}
                    className="w-full flex items-center gap-4 p-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-all shadow-md hover:shadow-lg min-h-15"
                  >
                    <span className="text-2xl">➕</span>
                    <div className="text-left">
                      <div className="font-semibold">Add New Product</div>
                      <div className="text-sm text-white/80">List a new luxury item</div>
                    </div>
                  </button>
                  <Link href="/post/create" className="w-full flex items-center gap-4 p-4 bg-yellow-500 hover:bg-yellow-400 text-gray-900 rounded-xl transition-all shadow-md hover:shadow-lg min-h-15">
                    <span className="text-2xl">📸</span>
                    <div className="text-left">
                      <div className="font-semibold">Create Post</div>
                      <div className="text-sm opacity-70">Share to social feed</div>
                    </div>
                  </Link>
                  <Link href="/feed" className="w-full flex items-center gap-4 p-4 bg-pink-500 hover:bg-pink-600 text-white rounded-xl transition-all shadow-md hover:shadow-lg min-h-15">
                    <span className="text-2xl">🗂️</span>
                    <div className="text-left">
                      <div className="font-semibold">View Social Posts</div>
                      <div className="text-sm text-white/80">Browse your feed &amp; posts</div>
                    </div>
                  </Link>
                  <button
                    onClick={() => setActiveTab('logistics')}
                    className="w-full flex items-center gap-4 p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-md hover:shadow-lg min-h-15"
                  >
                    <span className="text-2xl">🚚</span>
                    <div className="text-left">
                      <div className="font-semibold">Manage Logistics</div>
                      <div className="text-sm opacity-80">Configure shipping</div>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('analytics')}
                    className="w-full flex items-center gap-4 p-4 bg-gray-100 hover:bg-gray-200 dark:bg-charcoal-700 dark:hover:bg-charcoal-600 text-gray-900 dark:text-white rounded-xl transition-colors min-h-15"
                  >
                    <span className="text-2xl">📊</span>
                    <div className="text-left">
                      <div className="font-semibold">View Analytics</div>
                      <div className="text-sm text-gray-600 dark:text-cool-gray-400">Track performance</div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Products */}
          {activeTab === 'products' && (
            <div className="bg-white dark:bg-charcoal-800 rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100 dark:border-charcoal-700">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-white">My Products</h2>
                <button
                  onClick={() => router.push('/vendor/products/add')}
                  className="px-4 sm:px-6 py-2.5 sm:py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-semibold min-h-11 w-full sm:w-auto"
                >
                  + Add Product
                </button>
              </div>
              {productsLoading ? (
                <div className="text-center py-12"><div className="text-4xl mb-3 animate-pulse">📦</div><p className="text-gray-500">Loading products…</p></div>
              ) : products.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">📦</div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No products yet</h3>
                  <p className="text-gray-600 dark:text-cool-gray-400 mb-6">Add products to start selling</p>
                  <button
                    onClick={() => router.push('/vendor/products/add')}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-semibold"
                  >
                    + Add Your First Product
                  </button>
                </div>
              ) : (
              <div className="space-y-4">
                {products.map((product) => (
                  <div key={product.id} className="border border-gray-200 dark:border-charcoal-600 rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="relative w-full sm:w-24 h-32 sm:h-24 rounded-lg overflow-hidden shrink-0">
                        <Image src={product.image} alt={product.name} fill className="object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                          <div className="flex-1">
                            <h3 className="font-bold text-base sm:text-lg mb-1 text-gray-900 dark:text-white">{product.name}</h3>
                            <p className="text-xl font-bold text-purple-600">${product.price.toFixed(2)}</p>
                          </div>
                          <span className={`text-xs px-3 py-1.5 rounded-full w-fit font-semibold ${
                            product.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {product.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <p className="text-xs text-gray-600 dark:text-cool-gray-400">Stock</p>
                            <p className="font-semibold text-gray-900 dark:text-white">{product.stock} units</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 dark:text-cool-gray-400">Total Sales</p>
                            <p className="font-semibold text-gray-900 dark:text-white">{product.sales} sold</p>
                          </div>
                        </div>
                         <div className="flex flex-col sm:flex-row gap-2">
                           <button
                             onClick={() => router.push(`/vendor/products/${product.id}/edit`)}
                             className="flex-1 px-4 py-2 border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 transition-colors font-semibold min-h-10"
                           >
                             Edit
                           </button>
                           <button className="flex-1 px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors font-semibold min-h-10">Delete</button>
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
            <div className="bg-white dark:bg-charcoal-800 rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100 dark:border-charcoal-700">
              <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-6">Order Management</h2>
              <div className="space-y-4">
                {recentOrders.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-4">🛍️</div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No orders yet</h3>
                    <p className="text-sm text-gray-600 dark:text-cool-gray-400">Orders containing your products will appear here</p>
                  </div>
                )}
                {recentOrders.map((order) => (
                  <div key={order.id} className="border border-gray-200 dark:border-charcoal-600 rounded-xl p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                          <h3 className="font-bold text-lg text-gray-900 dark:text-white">{order.id}</h3>
                          <span className={`text-sm px-3 py-1.5 rounded-full w-fit font-semibold ${orderStatusClass(order.status)}`}>{order.status}</span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-cool-gray-400 mb-1">Customer: {order.customer}</p>
                        <p className="text-sm text-gray-600 dark:text-cool-gray-400 mb-2">{order.items} items · {order.date}</p>
                        <p className="text-xl font-bold text-purple-600">${order.total.toFixed(2)}</p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 lg:flex-col">
                        <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-semibold min-h-10">View Details</button>
                        {order.status === 'Pending' && (
                          <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-semibold min-h-10">Process Order</button>
                        )}
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
              <div className="bg-white dark:bg-charcoal-800 rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100 dark:border-charcoal-700">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Logistics Management</h2>
                  <Link href="/logistics/providers" className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-semibold min-h-11 text-sm">
                    Browse Providers →
                  </Link>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-5 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="text-3xl mb-2">📦</div>
                    <h3 className="font-bold text-gray-900 dark:text-white mb-1">Active Shipments</h3>
                    <p className="text-3xl font-bold text-blue-700 dark:text-blue-400">{stats.totalOrders > 0 ? '—' : '0'}</p>
                  </div>
                  <div className="p-5 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="text-3xl mb-2">✅</div>
                    <h3 className="font-bold text-gray-900 dark:text-white mb-1">Delivery Rate</h3>
                    <p className="text-3xl font-bold text-green-700 dark:text-green-400">—</p>
                  </div>
                  <div className="p-5 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <div className="text-3xl mb-2">⏱️</div>
                    <h3 className="font-bold text-gray-900 dark:text-white mb-1">Avg Delivery</h3>
                    <p className="text-3xl font-bold text-purple-700 dark:text-purple-400">—</p>
                  </div>
                  <div className="p-5 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <div className="text-3xl mb-2">⭐</div>
                    <h3 className="font-bold text-gray-900 dark:text-white mb-1">Provider Rating</h3>
                    <p className="text-3xl font-bold text-yellow-700 dark:text-yellow-400">—</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-charcoal-800 rounded-xl shadow-lg p-4 sm:p-6 border-2 border-dashed border-purple-300 dark:border-purple-700">
                <div className="flex items-start gap-4 mb-5">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center text-2xl shrink-0">🔗</div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Invite a Logistics Provider</h3>
                    <p className="text-sm text-gray-600 dark:text-cool-gray-400">
                      Know a reliable logistics company? Generate a referral link and share it with them. Only vendors can generate these invitations.
                    </p>
                  </div>
                </div>
                {!referralLink ? (
                  <button
                    onClick={handleGenerateReferral}
                    className="w-full sm:w-auto px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-semibold"
                  >
                    🔗 Generate Referral Link
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-charcoal-700 border border-gray-200 dark:border-charcoal-600 rounded-lg">
                      <span className="text-green-600 font-bold text-sm shrink-0">✓ Generated</span>
                      <input
                        type="text"
                        readOnly
                        value={referralLink}
                        className="flex-1 bg-transparent text-xs text-gray-600 dark:text-cool-gray-400 outline-none font-mono truncate"
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={handleCopyReferral}
                        className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                          referralCopied ? 'bg-green-600 text-white' : 'bg-purple-600 hover:bg-purple-700 text-white'
                        }`}
                      >
                        {referralCopied ? '✓ Copied!' : '📋 Copy Link'}
                      </button>
                      <button
                        onClick={() => {
                          const subject = encodeURIComponent('Join CLW as a Logistics Provider');
                          const body = encodeURIComponent(`Hi,\n\nI'd like to invite you to join CLW as a logistics provider.\n\nRegister here (valid 7 days):\n${referralLink}`);
                          window.open(`mailto:?subject=${subject}&body=${body}`);
                        }}
                        className="px-5 py-2.5 border border-gray-300 dark:border-charcoal-500 text-gray-700 dark:text-cool-gray-300 rounded-lg font-semibold text-sm hover:bg-gray-50 dark:hover:bg-charcoal-700 transition-colors"
                      >
                        📧 Send via Email
                      </button>
                      <button
                        onClick={() => setReferralLink('')}
                        className="px-4 py-2.5 text-gray-500 rounded-lg font-semibold text-sm hover:bg-gray-100 dark:hover:bg-charcoal-700 transition-colors"
                      >
                        ↺ Reset
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-cool-gray-500">⏰ This link expires in 7 days. The provider will need to complete all registration steps to become active.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Analytics */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-charcoal-800 rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100 dark:border-charcoal-700">
                <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-4">Sales Analytics</h2>
                {stats.totalOrders === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-4">📊</div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No sales data yet</h3>
                    <p className="text-gray-600 dark:text-cool-gray-400">Analytics will appear once you start receiving orders</p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 text-center">
                      <p className="text-xs text-gray-600 dark:text-cool-gray-400 mb-1">Total Orders</p>
                      <p className="text-3xl font-bold text-purple-700 dark:text-purple-400">{stats.totalOrders}</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-center">
                      <p className="text-xs text-gray-600 dark:text-cool-gray-400 mb-1">Monthly Revenue</p>
                      <p className="text-3xl font-bold text-green-700 dark:text-green-400">${stats.revenue.toLocaleString()}</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-center">
                      <p className="text-xs text-gray-600 dark:text-cool-gray-400 mb-1">Active Products</p>
                      <p className="text-3xl font-bold text-blue-700 dark:text-blue-400">{stats.totalProducts}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Settings */}
          {activeTab === 'settings' && (
            <div className="bg-white dark:bg-charcoal-800 rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100 dark:border-charcoal-700">
              <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-6">Store Settings</h2>
              {settingsMsg && (
                <div className={`mb-6 px-4 py-3 rounded-lg text-sm font-semibold ${
                  settingsMsg.startsWith('✓') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>{settingsMsg}</div>
              )}
              <div className="max-w-2xl space-y-6">
                
                {/* Logo & Banner Upload Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-gray-200 dark:border-charcoal-700">
                  {/* Logo Upload */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-cool-gray-300 mb-2">Store Logo (Profile Picture)</label>
                    <div className="flex items-center gap-4">
                      <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gray-100 dark:bg-charcoal-700 border border-gray-200 dark:border-charcoal-600 flex items-center justify-center shrink-0">
                        {avatar ? (
                          <Image src={avatar} alt="Logo Preview" fill className="object-cover" />
                        ) : (
                          <span className="text-2xl">🏪</span>
                        )}
                        {isUploadingAvatar && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                      </div>
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          id="vendor-logo-file"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setIsUploadingAvatar(true);
                            setSettingsMsg('');
                            try {
                              const token = getAuthToken();
                              const fd = new FormData();
                              fd.append('file', file);
                              fd.append('folder', 'profiles');
                              const res = await fetch('/api/upload', {
                                method: 'POST',
                                headers: { Authorization: `Bearer ${token}` },
                                body: fd,
                              });
                              const json = await res.json();
                              if (res.ok && json.success) {
                                setAvatar(json.data.url);
                                setSettingsMsg('✓ Logo uploaded successfully!');
                              } else {
                                setSettingsMsg(json.message || 'Logo upload failed.');
                              }
                            } catch {
                              setSettingsMsg('Logo upload failed due to network error.');
                            } finally {
                              setIsUploadingAvatar(false);
                            }
                          }}
                        />
                        <label
                          htmlFor="vendor-logo-file"
                          className="px-4 py-2 bg-gray-200 dark:bg-charcoal-700 hover:bg-gray-300 dark:hover:bg-charcoal-600 text-gray-900 dark:text-white rounded-lg text-sm font-semibold cursor-pointer transition-colors inline-block"
                        >
                          Upload Logo
                        </label>
                        <p className="text-xs text-gray-500 mt-1.5">Square image. Max 10MB.</p>
                      </div>
                    </div>
                  </div>

                  {/* Banner Upload */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-cool-gray-300 mb-2">Store Banner</label>
                    <div className="flex flex-col gap-3">
                      <div className="relative w-full h-24 rounded-xl overflow-hidden bg-gray-100 dark:bg-charcoal-700 border border-gray-200 dark:border-charcoal-600 flex items-center justify-center">
                        {banner ? (
                          <Image src={banner} alt="Banner Preview" fill className="object-cover" />
                        ) : (
                          <span className="text-gray-500 text-sm">No Banner Uploaded</span>
                        )}
                        {isUploadingBanner && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                      </div>
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          id="vendor-banner-file"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setIsUploadingBanner(true);
                            setSettingsMsg('');
                            try {
                              const token = getAuthToken();
                              const fd = new FormData();
                              fd.append('file', file);
                              fd.append('folder', 'banners');
                              const res = await fetch('/api/upload', {
                                method: 'POST',
                                headers: { Authorization: `Bearer ${token}` },
                                body: fd,
                              });
                              const json = await res.json();
                              if (res.ok && json.success) {
                                setBanner(json.data.url);
                                setSettingsMsg('✓ Banner uploaded successfully!');
                              } else {
                                setSettingsMsg(json.message || 'Banner upload failed.');
                              }
                            } catch {
                              setSettingsMsg('Banner upload failed due to network error.');
                            } finally {
                              setIsUploadingBanner(false);
                            }
                          }}
                        />
                        <label
                          htmlFor="vendor-banner-file"
                          className="px-4 py-2 bg-gray-200 dark:bg-charcoal-700 hover:bg-gray-300 dark:hover:bg-charcoal-600 text-gray-900 dark:text-white rounded-lg text-sm font-semibold cursor-pointer transition-colors inline-block"
                        >
                          Upload Banner
                        </label>
                        <p className="text-xs text-gray-500 mt-1.5">Recommended ratio 3:1. Max 10MB.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-cool-gray-300 mb-2">Store Name</label>
                  <input
                    type="text"
                    value={settingsForm.storeName}
                    onChange={e => setSettingsForm(f => ({ ...f, storeName: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-cool-gray-300 mb-2">Store Description</label>
                  <textarea
                    rows={4}
                    value={settingsForm.bio}
                    onChange={e => setSettingsForm(f => ({ ...f, bio: e.target.value }))}
                    placeholder="Describe your store…"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-cool-gray-300 mb-2">Business Email</label>
                  <input
                    type="email"
                    value={settingsForm.email}
                    readOnly
                    className="w-full px-4 py-3 border border-gray-200 dark:border-charcoal-600 bg-gray-50 dark:bg-charcoal-800 text-gray-500 dark:text-cool-gray-500 rounded-lg cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-cool-gray-300 mb-2">Business Phone</label>
                  <input
                    type="tel"
                    value={settingsForm.phone}
                    onChange={e => setSettingsForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="e.g. +1 (555) 000-0000"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    disabled={settingsSaving}
                    onClick={async () => {
                      const token = getAuthToken();
                      if (!token) return;
                      setSettingsSaving(true);
                      setSettingsMsg('');
                      const parts = settingsForm.storeName.trim().split(' ');
                      try {
                        const res = await fetch('/api/auth/profile', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                          body: JSON.stringify({
                            firstName: parts[0] || '',
                            lastName:  parts.slice(1).join(' ') || '',
                            bio: settingsForm.bio,
                            phoneNumber: settingsForm.phone,
                            avatar: avatar || undefined,
                            banner: banner || undefined,
                          }),
                        });
                        const d = await res.json();
                        if (res.ok && d.success) {
                          setSettingsMsg('✓ Settings saved');
                          updateUser({
                            avatar: avatar || undefined,
                            banner: banner || undefined,
                            fullName: settingsForm.storeName,
                            bio: settingsForm.bio,
                            phoneNumber: settingsForm.phone,
                          });
                        } else {
                          setSettingsMsg(d.message || 'Save failed');
                        }
                      } catch {
                        setSettingsMsg('Save failed — please try again');
                      } finally {
                        setSettingsSaving(false);
                        setTimeout(() => setSettingsMsg(''), 3000);
                      }
                    }}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-semibold min-h-12 disabled:opacity-60"
                  >
                    {settingsSaving ? 'Saving…' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => {
                      setSettingsForm({ storeName: user?.fullName || '', bio: (user as unknown as Record<string,string>)?.bio || '', email: user?.email || '', phone: (user as unknown as Record<string,string>)?.phoneNumber || '' });
                      setAvatar(user?.avatar || '');
                      setBanner(user?.banner || '');
                    }}
                    className="px-6 py-3 border border-gray-300 dark:border-charcoal-600 text-gray-700 dark:text-cool-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-charcoal-700 transition-colors font-semibold min-h-12"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Payouts & Wallet */}
          {activeTab === 'payouts' && (
            <div className="space-y-6">
              {/* Financial Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-white dark:bg-charcoal-800 rounded-xl shadow-lg p-5 border border-gray-100 dark:border-charcoal-700 relative overflow-hidden">
                  <p className="text-xs font-semibold text-gray-500 dark:text-cool-gray-400 uppercase tracking-wider">Available Balance</p>
                  <h3 className="text-3xl font-black text-gray-900 dark:text-white mt-2">${walletBalance.toFixed(2)}</h3>
                  <p className="text-[11px] text-gray-400 dark:text-cool-gray-500 mt-1">Cleared funds ready to withdraw</p>
                  <button
                    onClick={() => {
                      setPayoutError('');
                      setPayoutSuccess('');
                      setShowPayoutModal(true);
                    }}
                    disabled={walletBalance <= 0}
                    className="mt-4 w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors min-h-10 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    💳 Request Payout
                  </button>
                </div>

                <div className="bg-white dark:bg-charcoal-800 rounded-xl shadow-lg p-5 border border-gray-100 dark:border-charcoal-700 relative overflow-hidden">
                  <p className="text-xs font-semibold text-gray-500 dark:text-cool-gray-400 uppercase tracking-wider">Lifetime Earnings</p>
                  <h3 className="text-3xl font-black text-gray-900 dark:text-white mt-2">${totalEarned.toFixed(2)}</h3>
                  <p className="text-[11px] text-gray-400 dark:text-cool-gray-500 mt-1">Total revenue generated (released escrow)</p>
                </div>

                <div className="bg-white dark:bg-charcoal-800 rounded-xl shadow-lg p-5 border border-gray-100 dark:border-charcoal-700 relative overflow-hidden">
                  <p className="text-xs font-semibold text-gray-500 dark:text-cool-gray-400 uppercase tracking-wider">Withdrawn / Pending</p>
                  <h3 className="text-3xl font-black text-gray-900 dark:text-white mt-2">${totalWithdrawn.toFixed(2)}</h3>
                  <p className="text-[11px] text-gray-400 dark:text-cool-gray-500 mt-1">Includes both pending & processed requests</p>
                </div>
              </div>

              {/* Transactions History */}
              <div className="bg-white dark:bg-charcoal-800 rounded-xl shadow-lg border border-gray-100 dark:border-charcoal-700 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-200 dark:border-charcoal-700">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Transaction & Payout History</h3>
                  <p className="text-xs text-gray-400 dark:text-cool-gray-500 mt-0.5">List of incoming earnings and outgoing payout requests</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-charcoal-900/60 text-gray-700 dark:text-cool-gray-400 border-b border-gray-200 dark:border-charcoal-700">
                      <tr>
                        <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider">Details</th>
                        <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider">Type</th>
                        <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-right">Amount</th>
                        <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150 dark:divide-charcoal-750">
                      {payoutHistory.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-5 py-12 text-center text-gray-400 dark:text-cool-gray-500">
                            No transactions recorded yet.
                          </td>
                        </tr>
                      ) : (
                        payoutHistory.map((tx: any) => {
                          const isIncome = tx.type === 'escrow_release';
                          return (
                            <tr key={tx.id} className="hover:bg-gray-50/50 dark:hover:bg-charcoal-750/30 transition-colors">
                              <td className="px-5 py-4">
                                <div className="font-semibold text-gray-900 dark:text-white text-sm">
                                  {isIncome ? 'Order Escrow Release' : 'Withdrawal Request'}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-cool-gray-400 mt-0.5">
                                  {tx.description}
                                </div>
                                <div className="text-[10px] text-gray-400 dark:text-cool-gray-500 mt-1">
                                  ID: {tx.transactionId} · {new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </td>
                              <td className="px-5 py-4">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                                  isIncome ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                                }`}>
                                  {isIncome ? 'Income' : 'Withdrawal'}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-right">
                                <div className={`font-bold ${isIncome ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
                                  {isIncome ? '+' : '-'}${tx.amount.toFixed(2)}
                                </div>
                              </td>
                              <td className="px-5 py-4">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                  tx.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300 border dark:border-green-900/50' :
                                  tx.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/60 dark:text-yellow-300 border dark:border-yellow-900/50 animate-pulse' :
                                  'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border dark:border-red-900/50'
                                }`}>
                                  {tx.status}
                                </span>
                                {tx.metadata?.adminNotes && (
                                  <div className="text-gray-500 dark:text-cool-gray-400 text-[11px] mt-1 max-w-[150px] break-words">
                                    {tx.metadata.adminNotes}
                                  </div>
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

              {/* Request Payout Modal */}
              {showPayoutModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-xs">
                  <div className="bg-white dark:bg-charcoal-800 border border-gray-200 dark:border-charcoal-700 rounded-2xl w-full max-w-md shadow-2xl p-6">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-150 dark:border-charcoal-700">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">Request Payout</h3>
                      <button
                        onClick={() => setShowPayoutModal(false)}
                        className="text-gray-400 hover:text-gray-700 dark:text-cool-gray-400 dark:hover:text-white text-2xl leading-none"
                      >
                        ×
                      </button>
                    </div>

                    <form onSubmit={handlePayoutSubmit} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-600 dark:text-cool-gray-400 uppercase tracking-wider mb-1">
                          Amount to Withdraw ($)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={payoutAmount}
                          onChange={e => setPayoutAmount(e.target.value)}
                          max={walletBalance}
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-charcoal-700 border border-gray-300 dark:border-charcoal-600 rounded-xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 text-sm font-semibold"
                        />
                        <p className="text-[11px] text-gray-500 dark:text-cool-gray-400 mt-1">
                          Available: ${walletBalance.toFixed(2)} (Min. withdrawal $50.00)
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-600 dark:text-cool-gray-400 uppercase tracking-wider mb-1">
                          Bank Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. JPMorgan Chase"
                          value={payoutBankName}
                          onChange={e => setPayoutBankName(e.target.value)}
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-charcoal-700 border border-gray-300 dark:border-charcoal-600 rounded-xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-600 dark:text-cool-gray-400 uppercase tracking-wider mb-1">
                          Account Holder Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Acme Corp LLC"
                          value={payoutAccHolder}
                          onChange={e => setPayoutAccHolder(e.target.value)}
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-charcoal-700 border border-gray-300 dark:border-charcoal-600 rounded-xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-600 dark:text-cool-gray-400 uppercase tracking-wider mb-1">
                          Account Number
                        </label>
                        <input
                          type="text"
                          placeholder="Bank account number"
                          value={payoutAccNumber}
                          onChange={e => setPayoutAccNumber(e.target.value)}
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-charcoal-700 border border-gray-300 dark:border-charcoal-600 rounded-xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 text-sm font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-600 dark:text-cool-gray-400 uppercase tracking-wider mb-1">
                          Routing Number (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="9-digit routing number"
                          value={payoutRouting}
                          onChange={e => setPayoutRouting(e.target.value)}
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-charcoal-700 border border-gray-300 dark:border-charcoal-600 rounded-xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 text-sm font-mono"
                        />
                      </div>

                      {payoutError && (
                        <div className="p-3 bg-red-100 text-red-700 rounded-xl text-xs font-semibold">
                          {payoutError}
                        </div>
                      )}

                      {payoutSuccess && (
                        <div className="p-3 bg-green-100 text-green-700 rounded-xl text-xs font-semibold">
                          {payoutSuccess}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowPayoutModal(false)}
                          className="py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-charcoal-700 dark:hover:bg-charcoal-600 text-gray-700 dark:text-cool-gray-300 font-semibold rounded-xl text-sm min-h-11"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmittingPayout}
                          className="py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl text-sm min-h-11 disabled:opacity-50"
                        >
                          {isSubmittingPayout ? 'Submitting...' : 'Submit Request'}
                        </button>
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
