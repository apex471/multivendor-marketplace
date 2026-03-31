'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function BrandDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'performance' | 'content'>('overview');
  const [brandName, setBrandName] = useState('Brand Portal');
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalProducts: 0,
    followers: 0,
    engagement: 0,
  });

  useEffect(() => {
    const authToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!authToken) return;
    fetch('/api/dashboard/brand', { headers: { Authorization: `Bearer ${authToken}` } })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const p = d.data.profile;
          const s = d.data.stats;
          setBrandName([p.firstName, p.lastName].filter(Boolean).join(' ') || p.email || 'My Brand');
          setStats(prev => ({
            ...prev,
            totalRevenue: s.totalRevenue,
            totalProducts: s.totalProducts,
          }));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      {/* Header */}
      <header className="bg-charcoal-900 dark:bg-charcoal-950 text-white border-b border-charcoal-800 dark:border-charcoal-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <span className="text-2xl">👑</span>
              <div>
                <h1 className="text-xl font-bold">Brand Portal</h1>
                <p className="text-xs text-cool-gray-400">{brandName}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/brand/logistics" className="text-sm hover:text-gold-400 transition-colors">
                Logistics
              </Link>
              <Link href="/social/feed" className="text-sm hover:text-gold-400 transition-colors">
                Feed
              </Link>
              <Link href="/brand/settings" className="text-sm hover:text-gold-400 transition-colors">
                Settings
              </Link>
              <button className="text-sm hover:text-gold-400">Logout</button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-gold-400 to-gold-600 rounded-xl p-6 text-white">
            <div className="text-3xl mb-2">💰</div>
            <div className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</div>
            <div className="text-sm opacity-90">Total Revenue</div>
          </div>
          <div className="bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl p-6 text-white">
            <div className="text-3xl mb-2">🛍️</div>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <div className="text-sm opacity-90">Products Listed</div>
          </div>
          <div className="bg-gradient-to-br from-pink-400 to-pink-600 rounded-xl p-6 text-white">
            <div className="text-3xl mb-2">👥</div>
            <div className="text-2xl font-bold">{stats.followers.toLocaleString()}</div>
            <div className="text-sm opacity-90">Followers</div>
          </div>
          <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl p-6 text-white">
            <div className="text-3xl mb-2">📊</div>
            <div className="text-2xl font-bold">{stats.engagement}%</div>
            <div className="text-sm opacity-90">Engagement Rate</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-xl mb-6">
          <div className="flex border-b border-cool-gray-300 dark:border-charcoal-700">
            {(['overview', 'products', 'performance', 'content'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-6 py-4 text-sm font-semibold capitalize ${
                  activeTab === tab
                    ? 'text-gold-600 border-b-2 border-gold-600'
                    : 'text-charcoal-600 dark:text-cool-gray-400'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="grid md:grid-cols-4 gap-4">
              <Link href="/brand/products/add" className="bg-gradient-to-br from-gold-600 to-gold-700 dark:from-gold-700 dark:to-gold-800 text-white rounded-xl p-6 hover:from-gold-700 hover:to-gold-800 dark:hover:from-gold-800 dark:hover:to-gold-900 transition-all shadow-lg">
                <div className="text-3xl mb-2">➕</div>
                <div className="font-bold">Add Product</div>
                <div className="text-sm opacity-90">List new item</div>
              </Link>
              <Link href="/brand/logistics" className="bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 text-white rounded-xl p-6 hover:from-blue-700 hover:to-blue-800 dark:hover:from-blue-800 dark:hover:to-blue-900 transition-all shadow-lg">
                <div className="text-3xl mb-2">🚚</div>
                <div className="font-bold">Logistics</div>
                <div className="text-sm opacity-90">Manage shipping</div>
              </Link>
              <Link href="/brand/content/create" className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-xl p-6 hover:bg-cool-gray-50 dark:hover:bg-charcoal-700">
                <div className="text-3xl mb-2">📝</div>
                <div className="font-bold text-charcoal-900 dark:text-white">Create Post</div>
                <div className="text-sm text-charcoal-600 dark:text-cool-gray-400">Share content</div>
              </Link>
              <Link href="/brand/analytics" className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-xl p-6 hover:bg-cool-gray-50 dark:hover:bg-charcoal-700">
                <div className="text-3xl mb-2">📊</div>
                <div className="font-bold text-charcoal-900 dark:text-white">Analytics</div>
                <div className="text-sm text-charcoal-600 dark:text-cool-gray-400">View insights</div>
              </Link>
            </div>

            {/* Brand Performance */}
            <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-xl p-6">
              <h2 className="text-xl font-bold text-charcoal-900 dark:text-white mb-4">Brand Performance</h2>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 bg-cool-gray-50 dark:bg-charcoal-700 rounded-lg">
                  <div className="text-sm text-charcoal-600 dark:text-cool-gray-400">Total Reach</div>
                  <div className="text-2xl font-bold text-charcoal-900 dark:text-white">2.4M</div>
                  <div className="text-xs text-green-600 dark:text-green-400">+12% this month</div>
                </div>
                <div className="p-4 bg-cool-gray-50 dark:bg-charcoal-700 rounded-lg">
                  <div className="text-sm text-charcoal-600 dark:text-cool-gray-400">Impressions</div>
                  <div className="text-2xl font-bold text-charcoal-900 dark:text-white">5.8M</div>
                  <div className="text-xs text-green-600 dark:text-green-400">+8% this month</div>
                </div>
                <div className="p-4 bg-cool-gray-50 dark:bg-charcoal-700 rounded-lg">
                  <div className="text-sm text-charcoal-600 dark:text-cool-gray-400">Conversions</div>
                  <div className="text-2xl font-bold text-charcoal-900 dark:text-white">890</div>
                  <div className="text-xs text-green-600 dark:text-green-400">+15% this month</div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-xl p-6">
              <h2 className="text-xl font-bold text-charcoal-900 dark:text-white mb-4">Recent Activity</h2>
              <div className="space-y-3">
                {[
                  { action: 'New product added', item: 'Encore Collection Belt', time: '2 hours ago' },
                  { action: 'Campaign launched', item: 'Summer 2025 Campaign', time: '5 hours ago' },
                  { action: 'Post published', item: 'New Collection Announcement', time: '1 day ago' },
                ].map((activity, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-cool-gray-50 dark:bg-charcoal-700 rounded-lg">
                    <div>
                      <div className="font-semibold text-charcoal-900 dark:text-white">{activity.action}</div>
                      <div className="text-sm text-charcoal-600 dark:text-cool-gray-400">{activity.item}</div>
                    </div>
                    <div className="text-sm text-charcoal-600 dark:text-cool-gray-400">{activity.time}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-charcoal-900 dark:text-white">Product Catalog</h2>
              <Link href="/brand/products/add" className="px-4 py-2 bg-gold-600 text-white rounded-lg hover:bg-gold-700">
                + Add Product
              </Link>
            </div>
            <p className="text-charcoal-600 dark:text-cool-gray-400">Product catalog management interface...</p>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-xl p-6">
            <h2 className="text-xl font-bold text-charcoal-900 dark:text-white mb-6">Performance Analytics</h2>
            <p className="text-charcoal-600 dark:text-cool-gray-400">Detailed analytics and performance metrics...</p>
          </div>
        )}

        {activeTab === 'content' && (
          <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-xl p-6">
            <h2 className="text-xl font-bold text-charcoal-900 dark:text-white mb-6">Content Management</h2>
            <p className="text-charcoal-600 dark:text-cool-gray-400">Social media content and campaigns...</p>
          </div>
        )}
      </div>
    </div>
  );
}
