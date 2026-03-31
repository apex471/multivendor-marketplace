'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import Header from '../../../components/common/Header';
import Footer from '../../../components/common/Footer';

export default function CustomerDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'wishlist' | 'posts' | 'profile'>('overview');

  // Mock data
  const stats = {
    totalOrders: 12,
    totalSpent: 3450.00,
    wishlistItems: 8,
    savedPosts: 23,
  };

  const recentOrders = [
    {
      id: 'ORD-001',
      date: '2025-12-10',
      items: 2,
      total: 450.00,
      status: 'Delivered',
      image: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=400',
    },
    {
      id: 'ORD-002',
      date: '2025-12-08',
      items: 1,
      total: 890.00,
      status: 'In Transit',
      image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400',
    },
    {
      id: 'ORD-003',
      date: '2025-12-05',
      items: 3,
      total: 1200.00,
      status: 'Delivered',
      image: 'https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=400',
    },
  ];

  const wishlistItems = [
    {
      id: 1,
      name: 'Designer Leather Handbag',
      price: 1200.00,
      image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400',
      vendor: 'Luxury Goods Co.',
    },
    {
      id: 2,
      name: 'Classic Watch Collection',
      price: 2500.00,
      image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=400',
      vendor: 'Time Masters',
    },
    {
      id: 3,
      name: 'Premium Sunglasses',
      price: 450.00,
      image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400',
      vendor: 'Vision Elite',
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900 flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Header Section */}
        <div className="bg-gradient-to-br from-primary-800 to-primary-600 text-white">
          <div className="container mx-auto px-4 py-8 sm:py-12">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-secondary-400 flex items-center justify-center text-3xl sm:text-4xl">
                👤
              </div>
              <div className="text-center sm:text-left">
                <h1 className="text-2xl sm:text-3xl font-display font-bold mb-2">Welcome Back, Sarah</h1>
                <p className="text-white/80">Member since January 2025</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="container mx-auto px-4 -mt-8 mb-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
              <div className="text-2xl sm:text-3xl font-bold text-primary-700 mb-1">{stats.totalOrders}</div>
              <div className="text-xs sm:text-sm text-gray-600">Total Orders</div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
              <div className="text-2xl sm:text-3xl font-bold text-primary-700 mb-1">${stats.totalSpent.toFixed(2)}</div>
              <div className="text-xs sm:text-sm text-gray-600">Total Spent</div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
              <div className="text-2xl sm:text-3xl font-bold text-primary-700 mb-1">{stats.wishlistItems}</div>
              <div className="text-xs sm:text-sm text-gray-600">Wishlist Items</div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
              <div className="text-2xl sm:text-3xl font-bold text-primary-700 mb-1">{stats.savedPosts}</div>
              <div className="text-xs sm:text-sm text-gray-600">Saved Posts</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="container mx-auto px-4 mb-8">
          <div className="bg-white rounded-xl shadow-md p-2 overflow-x-auto">
            <div className="flex gap-2 min-w-max">
              {[
                { id: 'overview', label: 'Overview', icon: '📊' },
                { id: 'orders', label: 'My Orders', icon: '📦' },
                { id: 'wishlist', label: 'Wishlist', icon: '❤️' },
                { id: 'posts', label: 'Saved Posts', icon: '🔖' },
                { id: 'profile', label: 'Profile', icon: '⚙️' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all min-h-[44px] ${
                    activeTab === tab.id
                      ? 'bg-primary-700 text-white shadow-md'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span className="whitespace-nowrap">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="container mx-auto px-4 pb-12">
          {activeTab === 'overview' && (
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Recent Orders */}
              <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-display font-bold text-gray-900">Recent Orders</h2>
                  <Link href="/orders" className="text-primary-700 hover:text-primary-800 text-sm font-semibold">
                    View All →
                  </Link>
                </div>
                <div className="space-y-4">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="flex gap-4 p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden flex-shrink-0">
                        <Image src={order.image} alt="Order" fill className="object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                          <span className="font-semibold text-sm sm:text-base">{order.id}</span>
                          <span className={`text-xs px-2 py-1 rounded-full w-fit ${
                            order.status === 'Delivered' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600 mb-1">{order.items} items • {order.date}</p>
                        <p className="font-bold text-primary-700 text-sm sm:text-base">${order.total.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
                <h2 className="text-xl font-display font-bold text-gray-900 mb-6">Quick Actions</h2>
                <div className="space-y-3">
                  <Link 
                    href="/shop"
                    className="flex items-center gap-4 p-4 bg-gradient-to-r from-primary-700 to-primary-600 text-white rounded-lg hover:from-primary-800 hover:to-primary-700 transition-all shadow-md hover:shadow-lg min-h-[60px]"
                  >
                    <span className="text-2xl">🛍️</span>
                    <div>
                      <div className="font-semibold">Continue Shopping</div>
                      <div className="text-sm text-white/80">Discover new luxury items</div>
                    </div>
                  </Link>
                  
                  <Link 
                    href="/feed"
                    className="flex items-center gap-4 p-4 bg-gradient-to-r from-secondary-600 to-secondary-500 text-primary-900 rounded-lg hover:from-secondary-700 hover:to-secondary-600 transition-all shadow-md hover:shadow-lg min-h-[60px]"
                  >
                    <span className="text-2xl">📸</span>
                    <div>
                      <div className="font-semibold">Share Your Style</div>
                      <div className="text-sm opacity-80">Post to your feed</div>
                    </div>
                  </Link>

                  <Link 
                    href="/vendors"
                    className="flex items-center gap-4 p-4 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors min-h-[60px]"
                  >
                    <span className="text-2xl">📍</span>
                    <div>
                      <div className="font-semibold">Find Nearby Vendors</div>
                      <div className="text-sm text-gray-600">Discover local luxury</div>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'wishlist' && (
            <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
              <h2 className="text-2xl font-display font-bold text-gray-900 mb-6">My Wishlist</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {wishlistItems.map((item) => (
                  <div key={item.id} className="group border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="relative aspect-square">
                      <Image src={item.image} alt={item.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                      <button className="absolute top-3 right-3 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-red-50 transition-colors">
                        ❤️
                      </button>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-1 text-sm sm:text-base">{item.name}</h3>
                      <p className="text-xs sm:text-sm text-gray-600 mb-2">{item.vendor}</p>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-primary-700 text-base sm:text-lg">${item.price.toFixed(2)}</span>
                        <button className="px-3 sm:px-4 py-2 bg-primary-700 text-white rounded-lg hover:bg-primary-800 transition-colors text-xs sm:text-sm font-semibold min-h-[36px]">
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
              <h2 className="text-2xl font-display font-bold text-gray-900 mb-6">Order History</h2>
              <div className="space-y-4">
                {recentOrders.map((order) => (
                  <div key={order.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="relative w-full sm:w-32 h-32 rounded-lg overflow-hidden flex-shrink-0">
                        <Image src={order.image} alt="Order" fill className="object-cover" />
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                          <div>
                            <h3 className="font-bold text-lg">{order.id}</h3>
                            <p className="text-sm text-gray-600">{order.date}</p>
                          </div>
                          <span className={`text-sm px-3 py-1.5 rounded-full w-fit font-semibold ${
                            order.status === 'Delivered' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                        <p className="text-gray-700 mb-3">{order.items} items</p>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <span className="text-xl font-bold text-primary-700">${order.total.toFixed(2)}</span>
                          <div className="flex gap-2">
                            <button className="flex-1 sm:flex-none px-4 py-2 border border-primary-700 text-primary-700 rounded-lg hover:bg-primary-50 transition-colors font-semibold min-h-[40px]">
                              View Details
                            </button>
                            {order.status === 'Delivered' && (
                              <button className="flex-1 sm:flex-none px-4 py-2 bg-primary-700 text-white rounded-lg hover:bg-primary-800 transition-colors font-semibold min-h-[40px]">
                                Buy Again
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'posts' && (
            <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-display font-bold text-gray-900">Saved Posts</h2>
                <Link href="/dashboard/customer/posts" className="text-primary-700 hover:text-primary-800 text-sm font-semibold">
                  Manage All →
                </Link>
              </div>
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📝</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No saved drafts yet</h3>
                <p className="text-gray-600 mb-6">Start creating and saving your fashion posts</p>
                <Link
                  href="/post/create"
                  className="inline-block px-6 py-3 bg-primary-700 text-white rounded-lg hover:bg-primary-800 transition-colors font-semibold"
                >
                  Create Post
                </Link>
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
              <h2 className="text-2xl font-display font-bold text-gray-900 mb-6">Profile Settings</h2>
              <div className="max-w-2xl space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                  <input type="text" defaultValue="Sarah Johnson" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                  <input type="email" defaultValue="sarah.johnson@example.com" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                  <input type="tel" defaultValue="+1 (555) 123-4567" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Shipping Address</label>
                  <textarea rows={3} defaultValue="123 Luxury Avenue, Suite 456, New York, NY 10001" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"></textarea>
                </div>
                <div className="flex gap-3">
                  <button className="px-6 py-3 bg-primary-700 text-white rounded-lg hover:bg-primary-800 transition-colors font-semibold min-h-[48px]">
                    Save Changes
                  </button>
                  <button className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold min-h-[48px]">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
