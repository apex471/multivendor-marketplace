'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../../components/common/Header';
import Footer from '../../../components/common/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { getAuthToken } from '@/lib/api/auth';

type OrderRow = { id: string; date: string; items: number; total: number; status: string; image: string };
type WishlistItem = { wishlistId: string; productId: string; name: string; price: number; image: string; vendor: string };

export default function CustomerDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'wishlist' | 'posts' | 'profile'>('overview');
  const { user } = useAuth();

  // Auth guard
  useEffect(() => {
    if (!getAuthToken()) router.replace('/auth/login?redirect=/dashboard/customer');
  }, [router]);

  const [stats, setStats] = useState({ totalOrders: 0, totalSpent: 0, wishlistItems: 0, savedPosts: 0 });
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);

  // Profile form state
  const [profileForm, setProfileForm] = useState({ fullName: '', email: '', phone: '', address: '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  // Sync profile form with user context
  useEffect(() => {
    if (user) {
      setProfileForm({
        fullName: user.fullName || '',
        email: user.email || '',
        phone: (user as unknown as Record<string, string>).phoneNumber || '',
        address: (user as unknown as Record<string, string>).address || '',
      });
    }
  }, [user]);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;
    // Fetch orders
    fetch('/api/customer/orders', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          const rows: OrderRow[] = (json.data.orders ?? []).map((o: {
            id: string; date: string; status: string; total: number;
            itemCount: number; items: { image?: string }[];
          }) => ({
            id: o.id,
            date: new Date(o.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
            items: o.itemCount,
            total: o.total,
            status: o.status.charAt(0).toUpperCase() + o.status.slice(1),
            image: o.items?.[0]?.image || '/images/placeholder.jpg',
          }));
          setOrders(rows);
          setStats(prev => ({
            ...prev,
            totalOrders: json.data.total,
            totalSpent: rows.reduce((s, o) => s + o.total, 0),
          }));
        }
      })
      .catch(() => {});

    // Fetch wishlist
    fetch('/api/wishlist', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setWishlistItems(json.data.wishlist ?? []);
          setStats(prev => ({ ...prev, wishlistItems: (json.data.wishlist ?? []).length }));
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveProfile = async () => {
    const token = getAuthToken();
    if (!token) return;
    setProfileSaving(true);
    setProfileMsg('');
    const nameParts = profileForm.fullName.trim().split(' ');
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          firstName: nameParts[0] || '',
          lastName:  nameParts.slice(1).join(' ') || '',
          phoneNumber: profileForm.phone,
        }),
      });
      const data = await res.json();
      setProfileMsg(data.success ? '✓ Profile saved' : data.message || 'Save failed');
    } catch {
      setProfileMsg('Save failed — please try again');
    } finally {
      setProfileSaving(false);
      setTimeout(() => setProfileMsg(''), 3000);
    }
  };

  const handleRemoveWishlist = async (wishlistId: string, productId: string) => {
    const token = getAuthToken();
    if (!token) return;
    setWishlistItems(prev => prev.filter(i => i.wishlistId !== wishlistId));
    setStats(prev => ({ ...prev, wishlistItems: Math.max(0, prev.wishlistItems - 1) }));
    await fetch(`/api/wishlist?productId=${productId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  };

  const recentOrders = orders.slice(0, 3);

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900 flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Header Section */}
        <div className="bg-linear-to-br from-primary-800 to-primary-600 text-white">
          <div className="container mx-auto px-4 py-8 sm:py-12">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-secondary-400 flex items-center justify-center text-3xl sm:text-4xl">
                👤
              </div>
              <div className="text-center sm:text-left">
                <h1 className="text-2xl sm:text-3xl font-display font-bold mb-2">
                  Welcome Back, {user?.fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'there'}
                </h1>
                <p className="text-white/80">{user?.email || ''}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="container mx-auto px-4 -mt-8 mb-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            <div className="bg-white dark:bg-charcoal-800 rounded-xl shadow-md p-4 sm:p-6">
              <div className="text-2xl sm:text-3xl font-bold text-primary-700 dark:text-gold-400 mb-1">{stats.totalOrders}</div>
              <div className="text-xs sm:text-sm text-gray-600 dark:text-cool-gray-400">Total Orders</div>
            </div>
            <div className="bg-white dark:bg-charcoal-800 rounded-xl shadow-md p-4 sm:p-6">
              <div className="text-2xl sm:text-3xl font-bold text-primary-700 dark:text-gold-400 mb-1">${stats.totalSpent.toFixed(2)}</div>
              <div className="text-xs sm:text-sm text-gray-600 dark:text-cool-gray-400">Total Spent</div>
            </div>
            <div className="bg-white dark:bg-charcoal-800 rounded-xl shadow-md p-4 sm:p-6">
              <div className="text-2xl sm:text-3xl font-bold text-primary-700 dark:text-gold-400 mb-1">{stats.wishlistItems}</div>
              <div className="text-xs sm:text-sm text-gray-600 dark:text-cool-gray-400">Wishlist Items</div>
            </div>
            <div className="bg-white dark:bg-charcoal-800 rounded-xl shadow-md p-4 sm:p-6">
              <div className="text-2xl sm:text-3xl font-bold text-primary-700 dark:text-gold-400 mb-1">{stats.savedPosts}</div>
              <div className="text-xs sm:text-sm text-gray-600 dark:text-cool-gray-400">Saved Posts</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="container mx-auto px-4 mb-8">
          <div className="bg-white dark:bg-charcoal-800 rounded-xl shadow-md p-2 overflow-x-auto">
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
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all min-h-11 ${
                    activeTab === tab.id
                      ? 'bg-primary-700 text-white shadow-md'
                      : 'text-gray-700 dark:text-cool-gray-300 hover:bg-gray-100 dark:hover:bg-charcoal-700'
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
              <div className="bg-white dark:bg-charcoal-800 rounded-xl shadow-md p-4 sm:p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white">Recent Orders</h2>
                  <Link href="/orders" className="text-primary-700 hover:text-primary-800 text-sm font-semibold">
                    View All →
                  </Link>
                </div>
                <div className="space-y-4">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="flex gap-4 p-3 sm:p-4 bg-gray-50 dark:bg-charcoal-700 rounded-lg hover:bg-gray-100 dark:hover:bg-charcoal-600 transition-colors">
                      <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden shrink-0">
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
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-cool-gray-400 mb-1">{order.items} items • {order.date}</p>
                        <p className="font-bold text-primary-700 dark:text-gold-400 text-sm sm:text-base">${order.total.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white dark:bg-charcoal-800 rounded-xl shadow-md p-4 sm:p-6">
                <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-6">Quick Actions</h2>
                <div className="space-y-3">
                  <Link 
                    href="/shop"
                    className="flex items-center gap-4 p-4 bg-linear-to-r from-primary-700 to-primary-600 text-white rounded-lg hover:from-primary-800 hover:to-primary-700 transition-all shadow-md hover:shadow-lg min-h-15"
                  >
                    <span className="text-2xl">🛍️</span>
                    <div>
                      <div className="font-semibold">Continue Shopping</div>
                      <div className="text-sm text-white/80">Discover new luxury items</div>
                    </div>
                  </Link>
                  
                  <Link 
                    href="/feed"
                    className="flex items-center gap-4 p-4 bg-linear-to-r from-secondary-600 to-secondary-500 text-primary-900 rounded-lg hover:from-secondary-700 hover:to-secondary-600 transition-all shadow-md hover:shadow-lg min-h-15"
                  >
                    <span className="text-2xl">📸</span>
                    <div>
                      <div className="font-semibold">Share Your Style</div>
                      <div className="text-sm opacity-80">Post to your feed</div>
                    </div>
                  </Link>

                  <Link 
                    href="/vendors"
                    className="flex items-center gap-4 p-4 bg-gray-100 dark:bg-charcoal-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-charcoal-600 transition-colors min-h-15"
                  >
                    <span className="text-2xl">📍</span>
                    <div>
                      <div className="font-semibold">Find Nearby Vendors</div>
                      <div className="text-sm text-gray-600 dark:text-cool-gray-400">Discover local luxury</div>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'wishlist' && (
            <div className="bg-white dark:bg-charcoal-800 rounded-xl shadow-md p-4 sm:p-6">
              <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-6">My Wishlist</h2>
              {wishlistItems.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">❤️</div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Your wishlist is empty</h3>
                  <p className="text-gray-600 dark:text-cool-gray-400 mb-4">Browse products and save your favourites</p>
                  <Link href="/shop" className="inline-block px-6 py-3 bg-primary-700 text-white rounded-lg font-semibold hover:bg-primary-800 transition-colors">Browse Products</Link>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {wishlistItems.map((item) => (
                    <div key={item.wishlistId} className="group border border-gray-200 dark:border-charcoal-700 rounded-xl overflow-hidden hover:shadow-lg transition-shadow">
                      <div className="relative aspect-square">
                        <Image src={item.image} alt={item.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                        <button
                          onClick={() => handleRemoveWishlist(item.wishlistId, item.productId)}
                          className="absolute top-3 right-3 w-10 h-10 bg-white/90 dark:bg-charcoal-800/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                          title="Remove from wishlist"
                        >
                          ❤️
                        </button>
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1 text-sm sm:text-base">{item.name}</h3>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-cool-gray-400 mb-2">{item.vendor}</p>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-primary-700 dark:text-gold-400 text-base sm:text-lg">${item.price.toFixed(2)}</span>
                          <Link
                            href={`/product/${item.productId}`}
                            className="px-3 sm:px-4 py-2 bg-primary-700 text-white rounded-lg hover:bg-primary-800 transition-colors text-xs sm:text-sm font-semibold min-h-9"
                          >
                            View
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="bg-white dark:bg-charcoal-800 rounded-xl shadow-md p-4 sm:p-6">
              <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-6">Order History</h2>
              <div className="space-y-4">
                {orders.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-4">🛍️</div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No orders yet</h3>
                    <p className="text-gray-600 dark:text-cool-gray-400 mb-4">Start shopping to see your orders here</p>
                    <Link href="/shop" className="inline-block px-6 py-3 bg-primary-700 text-white rounded-lg font-semibold hover:bg-primary-800 transition-colors">Browse Products</Link>
                  </div>
                )}
                {orders.map((order) => (
                  <div key={order.id} className="border border-gray-200 dark:border-charcoal-700 rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="relative w-full sm:w-32 h-32 rounded-lg overflow-hidden shrink-0">
                        <Image src={order.image} alt="Order" fill className="object-cover" />
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                          <div>
                            <h3 className="font-bold text-lg dark:text-white">{order.id}</h3>
                            <p className="text-sm text-gray-600 dark:text-cool-gray-400">{order.date}</p>
                          </div>
                          <span className={`text-sm px-3 py-1.5 rounded-full w-fit font-semibold ${
                            order.status === 'Delivered' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                        <p className="text-gray-700 dark:text-cool-gray-300 mb-3">{order.items} items</p>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <span className="text-xl font-bold text-primary-700 dark:text-gold-400">${order.total.toFixed(2)}</span>
                          <div className="flex gap-2">
                            <button className="flex-1 sm:flex-none px-4 py-2 border border-primary-700 text-primary-700 rounded-lg hover:bg-primary-50 transition-colors font-semibold min-h-10">
                              View Details
                            </button>
                            {order.status === 'Delivered' && (
                              <button className="flex-1 sm:flex-none px-4 py-2 bg-primary-700 text-white rounded-lg hover:bg-primary-800 transition-colors font-semibold min-h-10">
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
            <div className="bg-white dark:bg-charcoal-800 rounded-xl shadow-md p-4 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Saved Posts</h2>
                <Link href="/dashboard/customer/posts" className="text-primary-700 hover:text-primary-800 text-sm font-semibold">
                  Manage All →
                </Link>
              </div>
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📝</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No saved drafts yet</h3>
                <p className="text-gray-600 dark:text-cool-gray-400 mb-6">Start creating and saving your fashion posts</p>
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
            <div className="bg-white dark:bg-charcoal-800 rounded-xl shadow-md p-4 sm:p-6">
              <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-6">Profile Settings</h2>
              {profileMsg && (
                <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-semibold ${profileMsg.startsWith('✓') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {profileMsg}
                </div>
              )}
              <div className="max-w-2xl space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-cool-gray-300 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={profileForm.fullName}
                    onChange={e => setProfileForm(f => ({ ...f, fullName: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-charcoal-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-charcoal-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-cool-gray-300 mb-2">Email Address</label>
                  <input
                    type="email"
                    value={profileForm.email}
                    readOnly
                    className="w-full px-4 py-3 border border-gray-200 dark:border-charcoal-700 rounded-lg bg-gray-50 dark:bg-charcoal-800 text-gray-500 dark:text-cool-gray-500 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-400 mt-1">Email cannot be changed here.</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-cool-gray-300 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="e.g. +1 (555) 000-0000"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-charcoal-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-charcoal-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleSaveProfile}
                    disabled={profileSaving}
                    className="px-6 py-3 bg-primary-700 text-white rounded-lg hover:bg-primary-800 transition-colors font-semibold min-h-12 disabled:opacity-60"
                  >
                    {profileSaving ? 'Saving…' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => setProfileForm({ fullName: user?.fullName || '', email: user?.email || '', phone: (user as unknown as Record<string,string>)?.phoneNumber || '', address: '' })}
                    className="px-6 py-3 border border-gray-300 dark:border-charcoal-600 text-gray-700 dark:text-cool-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-charcoal-700 transition-colors font-semibold min-h-12"
                  >
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
