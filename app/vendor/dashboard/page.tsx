'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function VendorDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'orders' | 'analytics'>('overview');

  const stats = {
    totalRevenue: 45890,
    totalOrders: 234,
    activeProducts: 89,
    pendingOrders: 12
  };

  const recentOrders = [
    { id: 'ORD-1001', customer: 'John Doe', product: 'Designer Jacket', amount: 549.99, status: 'pending' },
    { id: 'ORD-1002', customer: 'Jane Smith', product: 'Silk Dress', amount: 399.00, status: 'shipped' },
    { id: 'ORD-1003', customer: 'Mike Johnson', product: 'Leather Boots', amount: 299.99, status: 'delivered' },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      {/* Header */}
      <header className="bg-charcoal-900 dark:bg-charcoal-950 text-white border-b border-charcoal-800 dark:border-charcoal-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <span className="text-2xl">🏪</span>
              <div>
                <h1 className="text-xl font-bold">Vendor Dashboard</h1>
                <p className="text-xs text-cool-gray-400">Luxury Fashion Co.</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/social/feed" className="text-sm hover:text-gold-400">
                Feed
              </Link>
              <Link href="/vendor/settings" className="text-sm hover:text-gold-400">
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
          <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl p-6 text-white">
            <div className="text-3xl mb-2">📦</div>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <div className="text-sm opacity-90">Total Orders</div>
          </div>
          <div className="bg-gradient-to-br from-green-400 to-green-600 rounded-xl p-6 text-white">
            <div className="text-3xl mb-2">🛍️</div>
            <div className="text-2xl font-bold">{stats.activeProducts}</div>
            <div className="text-sm opacity-90">Active Products</div>
          </div>
          <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl p-6 text-white">
            <div className="text-3xl mb-2">⏳</div>
            <div className="text-2xl font-bold">{stats.pendingOrders}</div>
            <div className="text-sm opacity-90">Pending Orders</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-xl mb-6">
          <div className="flex border-b border-cool-gray-300 dark:border-charcoal-700">
            {(['overview', 'products', 'orders', 'analytics'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-6 py-4 text-sm font-semibold capitalize ${
                  activeTab === tab
                    ? 'text-gold-600 dark:text-gold-500 border-b-2 border-gold-600 dark:border-gold-500'
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
            <div className="grid md:grid-cols-3 gap-4">
              <Link href="/vendor/products/add" className="bg-gradient-to-br from-gold-600 to-gold-700 dark:from-gold-700 dark:to-gold-800 text-white rounded-xl p-6 hover:from-gold-700 hover:to-gold-800 dark:hover:from-gold-800 dark:hover:to-gold-900 transition-all shadow-lg">
                <div className="text-3xl mb-2">➕</div>
                <div className="font-bold">Add New Product</div>
                <div className="text-sm opacity-90">List a new item for sale</div>
              </Link>
              <Link href="/vendor/orders" className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-xl p-6 hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 transition-colors">
                <div className="text-3xl mb-2">📋</div>
                <div className="font-bold text-charcoal-900 dark:text-white">Manage Orders</div>
                <div className="text-sm text-charcoal-600 dark:text-cool-gray-400">View and process orders</div>
              </Link>
              <Link href="/vendor/analytics" className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-xl p-6 hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 transition-colors">
                <div className="text-3xl mb-2">📊</div>
                <div className="font-bold text-charcoal-900 dark:text-white">View Analytics</div>
                <div className="text-sm text-charcoal-600 dark:text-cool-gray-400">Track your performance</div>
              </Link>
            </div>

            {/* Recent Orders */}
            <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-xl p-6">
              <h2 className="text-xl font-bold text-charcoal-900 dark:text-white mb-4">Recent Orders</h2>
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-4 bg-cool-gray-50 dark:bg-charcoal-700 rounded-lg">
                    <div className="flex-1">
                      <div className="font-semibold text-charcoal-900 dark:text-white">{order.id}</div>
                      <div className="text-sm text-charcoal-600 dark:text-cool-gray-400">{order.customer} • {order.product}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gold-600">${order.amount}</div>
                      <div className={`text-xs px-2 py-1 rounded-full inline-block ${
                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        order.status === 'shipped' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                        'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      }`}>
                        {order.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-charcoal-900 dark:text-white">Your Products</h2>
              <Link href="/vendor/products/add" className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                + Add Product
              </Link>
            </div>
            <p className="text-charcoal-600 dark:text-cool-gray-400">Product management interface would go here...</p>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-xl p-6">
            <h2 className="text-xl font-bold text-charcoal-900 dark:text-white mb-6">Order Management</h2>
            <p className="text-charcoal-600 dark:text-cool-gray-400">Order management interface would go here...</p>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-xl p-6">
            <h2 className="text-xl font-bold text-charcoal-900 dark:text-white mb-6">Analytics & Reports</h2>
            <p className="text-charcoal-600 dark:text-cool-gray-400">Analytics interface would go here...</p>
          </div>
        )}
      </div>
    </div>
  );
}
