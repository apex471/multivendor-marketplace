'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { buildLogisticsReferralUrl } from '@/lib/utils/referral';
import { useAuth } from '@/contexts/AuthContext';

type TabType = 'overview' | 'products' | 'orders' | 'logistics' | 'analytics' | 'settings';

export default function VendorDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const { user, isLoading, isAuthenticated } = useAuth();
  const [referralLink, setReferralLink] = useState('');
  const [referralCopied, setReferralCopied] = useState(false);

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

  // Mock data
  const stats = {
    totalProducts: 45,
    totalOrders: 128,
    revenue: 12450.00,
    avgRating: 4.8,
  };

  const recentOrders = [
    {
      id: 'ORD-501',
      customer: 'John Smith',
      date: '2025-12-14',
      items: 2,
      total: 890.00,
      status: 'Pending',
    },
    {
      id: 'ORD-502',
      customer: 'Emma Wilson',
      date: '2025-12-14',
      items: 1,
      total: 450.00,
      status: 'Processing',
    },
    {
      id: 'ORD-503',
      customer: 'Michael Brown',
      date: '2025-12-13',
      items: 3,
      total: 1200.00,
      status: 'Shipped',
    },
  ];

  const products = [
    {
      id: 1,
      name: 'Designer Leather Handbag',
      price: 1200.00,
      stock: 8,
      sales: 24,
      image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400',
      status: 'Active',
    },
    {
      id: 2,
      name: 'Classic Watch Collection',
      price: 2500.00,
      stock: 3,
      sales: 12,
      image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=400',
      status: 'Active',
    },
    {
      id: 3,
      name: 'Premium Sunglasses',
      price: 450.00,
      stock: 0,
      sales: 31,
      image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400',
      status: 'Out of Stock',
    },
  ];

  const salesData = [
    { month: 'Jul', sales: 1200 },
    { month: 'Aug', sales: 1800 },
    { month: 'Sep', sales: 2400 },
    { month: 'Oct', sales: 3200 },
    { month: 'Nov', sales: 2800 },
    { month: 'Dec', sales: 3600 },
  ];

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
                  {user?.fullName || user?.email || 'My Store'} · {stats.avgRating}★ Rating
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
                    onClick={() => setActiveTab('products')}
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
                <button className="px-4 sm:px-6 py-2.5 sm:py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-semibold min-h-11 w-full sm:w-auto">
                  + Add Product
                </button>
              </div>
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
                          <button className="flex-1 px-4 py-2 border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 transition-colors font-semibold min-h-10">Edit</button>
                          <button className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 dark:text-cool-gray-300 dark:border-charcoal-500 rounded-lg hover:bg-gray-50 dark:hover:bg-charcoal-700 transition-colors font-semibold min-h-10">Duplicate</button>
                          <button className="flex-1 px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors font-semibold min-h-10">Delete</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Orders */}
          {activeTab === 'orders' && (
            <div className="bg-white dark:bg-charcoal-800 rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100 dark:border-charcoal-700">
              <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-6">Order Management</h2>
              <div className="space-y-4">
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
                    <p className="text-3xl font-bold text-blue-700 dark:text-blue-400">12</p>
                  </div>
                  <div className="p-5 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="text-3xl mb-2">✅</div>
                    <h3 className="font-bold text-gray-900 dark:text-white mb-1">Delivery Rate</h3>
                    <p className="text-3xl font-bold text-green-700 dark:text-green-400">97.8%</p>
                  </div>
                  <div className="p-5 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <div className="text-3xl mb-2">⏱️</div>
                    <h3 className="font-bold text-gray-900 dark:text-white mb-1">Avg Delivery</h3>
                    <p className="text-3xl font-bold text-purple-700 dark:text-purple-400">2.3 days</p>
                  </div>
                  <div className="p-5 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <div className="text-3xl mb-2">⭐</div>
                    <h3 className="font-bold text-gray-900 dark:text-white mb-1">Provider Rating</h3>
                    <p className="text-3xl font-bold text-yellow-700 dark:text-yellow-400">4.7/5</p>
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
                <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-6">Sales Analytics</h2>
                <div className="space-y-4">
                  {salesData.map((data) => (
                    <div key={data.month} className="flex items-center gap-4">
                      <span className="text-sm font-semibold text-gray-700 dark:text-cool-gray-300 w-12">{data.month}</span>
                      <div className="flex-1 bg-gray-200 dark:bg-charcoal-700 rounded-full h-8 relative overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 bg-linear-to-r from-purple-600 to-purple-400 rounded-full flex items-center justify-end pr-3"
                          style={{ width: `${(data.sales / 4000) * 100}%` }}
                        >
                          <span className="text-white text-xs font-semibold">${data.sales}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-charcoal-800 rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100 dark:border-charcoal-700">
                  <h3 className="font-display font-bold text-gray-900 dark:text-white mb-4">Top Products</h3>
                  <div className="space-y-3">
                    {products.map((product, index) => (
                      <div key={product.id} className="flex items-center gap-3">
                        <span className="text-2xl font-bold text-gray-300 dark:text-charcoal-600">#{index + 1}</span>
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0">
                          <Image src={product.image} alt={product.name} fill className="object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate text-gray-900 dark:text-white">{product.name}</p>
                          <p className="text-xs text-gray-600 dark:text-cool-gray-400">{product.sales} sales</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white dark:bg-charcoal-800 rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100 dark:border-charcoal-700">
                  <h3 className="font-display font-bold text-gray-900 dark:text-white mb-4">Performance</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600 dark:text-cool-gray-400">Conversion Rate</span>
                        <span className="font-semibold text-gray-900 dark:text-white">3.2%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-charcoal-700 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: '32%' }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600 dark:text-cool-gray-400">Customer Satisfaction</span>
                        <span className="font-semibold text-gray-900 dark:text-white">96%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-charcoal-700 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: '96%' }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600 dark:text-cool-gray-400">Response Time</span>
                        <span className="font-semibold text-gray-900 dark:text-white">2.5h avg</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-charcoal-700 rounded-full h-2">
                        <div className="bg-purple-600 h-2 rounded-full" style={{ width: '75%' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Settings */}
          {activeTab === 'settings' && (
            <div className="bg-white dark:bg-charcoal-800 rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100 dark:border-charcoal-700">
              <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-6">Store Settings</h2>
              <div className="max-w-2xl space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-cool-gray-300 mb-2">Store Name</label>
                  <input
                    type="text"
                    defaultValue={user?.fullName || 'My Store'}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-cool-gray-300 mb-2">Store Description</label>
                  <textarea
                    rows={4}
                    defaultValue="We offer premium luxury goods with certified authenticity. Expert curators handpick each item for quality and style."
                    className="w-full px-4 py-3 border border-gray-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-cool-gray-300 mb-2">Business Email</label>
                  <input
                    type="email"
                    defaultValue={user?.email || ''}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-cool-gray-300 mb-2">Business Phone</label>
                  <input
                    type="tel"
                    defaultValue="+1 (555) 987-6543"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-cool-gray-300 mb-2">Store Address</label>
                  <textarea
                    rows={3}
                    defaultValue="789 Fashion District, Suite 200, Los Angeles, CA 90015"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-semibold min-h-12">
                    Save Changes
                  </button>
                  <button className="px-6 py-3 border border-gray-300 dark:border-charcoal-600 text-gray-700 dark:text-cool-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-charcoal-700 transition-colors font-semibold min-h-12">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
