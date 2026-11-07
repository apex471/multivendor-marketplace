'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../../components/common/Header';
import Footer from '../../../components/common/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { getAuthToken } from '@/lib/api/auth';
import { useLocalization } from '@/contexts/LocalizationContext';

type OrderRow = { id: string; date: string; items: number; total: number; status: string; image: string };
type WishlistItem = { wishlistId: string; productId: string; name: string; price: number; image: string; vendor: string };
type TicketRow = { id: string; ticketNumber: string; orderId: string; subject: string; status: string; createdAt: string };

export default function CustomerDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'wishlist' | 'posts' | 'profile' | 'tickets'>('overview');
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { formatPrice } = useLocalization();

  // Auth guard — wait for AuthContext to rehydrate before redirecting
  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace('/auth/login?redirect=/dashboard/customer');
  }, [authLoading, isAuthenticated, router]);

  // Sync tab and modal from URL params if present
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    const tabParam = sp.get('tab');
    const orderIdParam = sp.get('orderId');
    if (tabParam === 'orders' || tabParam === 'tickets' || tabParam === 'wishlist' || tabParam === 'posts' || tabParam === 'profile') {
      setActiveTab(tabParam);
    }
    if (orderIdParam) {
      setTicketModal(prev => ({
        ...prev,
        isOpen: true,
        orderId: orderIdParam,
        subject: `Help with Order #${orderIdParam}`,
      }));
    }
  }, []);

  const [stats, setStats] = useState({ totalOrders: 0, totalSpent: 0, wishlistItems: 0, savedPosts: 0, openTickets: 0 });
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [tickets, setTickets] = useState<TicketRow[]>([]);

  const [ticketCategory, setTicketCategory] = useState('delivery');
  const [ticketModal, setTicketModal] = useState<{ isOpen: boolean; orderId: string; subject: string; message: string; loading: boolean }>({ isOpen: false, orderId: '', subject: '', message: '', loading: false });
  const [toastMsg, setToastMsg] = useState<string | null>(null);

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

    // Fetch tickets
    fetch('/api/tickets', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setTickets(json.data.tickets ?? []);
          setStats(prev => ({ ...prev, openTickets: (json.data.tickets ?? []).filter((t: any) => t.status !== 'closed').length }));
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

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getAuthToken();
    if (!token) return;
    if (!ticketModal.orderId) {
      alert('Please select an order for this ticket');
      return;
    }
    setTicketModal(prev => ({ ...prev, loading: true }));
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          orderId: ticketModal.orderId,
          subject: ticketModal.subject,
          message: ticketModal.message,
          category: ticketCategory,
        })
      });
      const json = await res.json();
      if (json.success && json.data?.ticket) {
        const created = json.data.ticket;
        setTickets([created, ...tickets]);
        setTicketModal({ isOpen: false, orderId: '', subject: '', message: '', loading: false });
        setToastMsg('Ticket submitted successfully! Redirecting to live thread...');
        setTimeout(() => {
          setToastMsg(null);
          router.push(`/dashboard/tickets/${created.id}`);
        }, 1200);
      } else {
        alert(json.message || 'Failed to open ticket');
        setTicketModal(prev => ({ ...prev, loading: false }));
      }
    } catch {
      alert('Network error — please check connection');
      setTicketModal(prev => ({ ...prev, loading: false }));
    }
  };

  const recentOrders = orders.slice(0, 3);

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900 flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Header Section */}
        <div className="bg-linear-to-br from-charcoal-900 via-charcoal-850 to-charcoal-800 text-white border-b border-gold-500/20">
          <div className="container mx-auto px-4 py-8 sm:py-12">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gold-500/20 border-2 border-gold-500/40 flex items-center justify-center text-3xl sm:text-4xl text-gold-400">
                👤
              </div>
              <div className="text-center sm:text-left">
                <span className="inline-block px-3 py-1 bg-gold-500/20 text-gold-400 text-xs font-semibold rounded-full uppercase tracking-wider mb-2">
                  Client Dashboard
                </span>
                <h1 className="text-2xl sm:text-3xl font-display font-bold mb-1">
                  Welcome Back, {user?.fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'Member'}
                </h1>
                <p className="text-cool-gray-300 text-sm">{user?.email || ''}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="container mx-auto px-4 -mt-8 mb-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            <div className="bg-white dark:bg-charcoal-800 rounded-xl shadow-md p-4 sm:p-6 border border-cool-gray-200/60 dark:border-charcoal-700">
              <div className="text-2xl sm:text-3xl font-bold text-gold-600 dark:text-gold-400 mb-1">{stats.totalOrders}</div>
              <div className="text-xs sm:text-sm text-charcoal-600 dark:text-cool-gray-400">Total Orders</div>
            </div>
            <div className="bg-white dark:bg-charcoal-800 rounded-xl shadow-md p-4 sm:p-6 border border-cool-gray-200/60 dark:border-charcoal-700">
              <div className="text-2xl sm:text-3xl font-bold text-gold-600 dark:text-gold-400 mb-1">{formatPrice(stats.totalSpent)}</div>
              <div className="text-xs sm:text-sm text-charcoal-600 dark:text-cool-gray-400">Total Spent</div>
            </div>
            <div className="bg-white dark:bg-charcoal-800 rounded-xl shadow-md p-4 sm:p-6 border border-cool-gray-200/60 dark:border-charcoal-700">
              <div className="text-2xl sm:text-3xl font-bold text-gold-600 dark:text-gold-400 mb-1">{stats.wishlistItems}</div>
              <div className="text-xs sm:text-sm text-charcoal-600 dark:text-cool-gray-400">Wishlist Items</div>
            </div>
            <div className="bg-white dark:bg-charcoal-800 rounded-xl shadow-md p-4 sm:p-6 border border-cool-gray-200/60 dark:border-charcoal-700">
              <div className="text-2xl sm:text-3xl font-bold text-gold-600 dark:text-gold-400 mb-1">{stats.openTickets}</div>
              <div className="text-xs sm:text-sm text-charcoal-600 dark:text-cool-gray-400">Open Tickets</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="container mx-auto px-4 mb-8">
          <div className="bg-white dark:bg-charcoal-800 rounded-xl shadow-md p-2 overflow-x-auto border border-cool-gray-200/60 dark:border-charcoal-700">
            <div className="flex gap-2 min-w-max">
              {[
                { id: 'overview', label: 'Overview', icon: '📊' },
                { id: 'orders', label: 'My Orders', icon: '📦' },
                { id: 'tickets', label: 'Support Tickets', icon: '🎫' },
                { id: 'wishlist', label: 'Wishlist', icon: '❤️' },
                { id: 'posts', label: 'Saved Posts', icon: '🔖' },
                { id: 'profile', label: 'Profile', icon: '⚙️' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-all min-h-11 cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-gold-600 text-white shadow-md'
                      : 'text-charcoal-700 dark:text-cool-gray-300 hover:bg-cool-gray-100 dark:hover:bg-charcoal-700'
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
              <div className="bg-white dark:bg-charcoal-800 rounded-xl shadow-md p-4 sm:p-6 border border-cool-gray-200/60 dark:border-charcoal-700">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white">Recent Orders</h2>
                  <button onClick={() => setActiveTab('orders')} className="text-gold-600 dark:text-gold-400 hover:text-gold-500 text-sm font-semibold cursor-pointer">
                    View All →
                  </button>
                </div>
                <div className="space-y-4">
                  {recentOrders.length === 0 ? (
                    <div className="text-center py-8 text-cool-gray-400 text-sm">
                      <p>No recent orders found.</p>
                      <Link href="/shop" className="mt-2 inline-block text-gold-600 hover:underline font-semibold">Start shopping</Link>
                    </div>
                  ) : (
                    recentOrders.map((order) => (
                      <div key={order.id} className="p-3 sm:p-4 bg-cool-gray-50 dark:bg-charcoal-700 rounded-lg hover:bg-cool-gray-100 dark:hover:bg-charcoal-650 transition-colors border border-cool-gray-200/60 dark:border-charcoal-600">
                        <div className="flex gap-4">
                          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden shrink-0">
                            <Image src={order.image} alt="Order" fill className="object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                              <span className="font-semibold text-sm sm:text-base text-charcoal-900 dark:text-white truncate">Order #{order.id}</span>
                              <span className={`text-xs px-2.5 py-1 rounded-full w-fit font-bold ${
                                order.status === 'Delivered' || order.status === 'Completed'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                              }`}>
                                {order.status}
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm text-charcoal-600 dark:text-cool-gray-400 mb-1">{order.items} items • {order.date}</p>
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-cool-gray-200/60 dark:border-charcoal-600">
                              <span className="font-bold text-gold-600 dark:text-gold-400 text-sm sm:text-base">{formatPrice(order.total)}</span>
                              <Link
                                href={`/order/${order.id}`}
                                className="px-3.5 py-1.5 bg-gold-600 hover:bg-gold-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer active:scale-95"
                              >
                                View Details
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
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
                          <span className="font-bold text-primary-700 dark:text-gold-400 text-base sm:text-lg">{formatPrice(item.price)}</span>
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
                          <span className="text-xl font-bold text-gold-600 dark:text-gold-400">{formatPrice(order.total)}</span>
                          <div className="flex flex-wrap gap-2">
                            <Link
                              href={`/order/${order.id}`}
                              className="flex-1 sm:flex-none px-5 py-2.5 bg-gold-600 hover:bg-gold-500 text-white rounded-lg transition-colors font-semibold min-h-10 inline-flex items-center justify-center text-sm shadow-xs active:scale-95 cursor-pointer"
                            >
                              View Details
                            </Link>
                            {tickets.find(t => t.orderId === order.id) ? (
                              <button
                                type="button"
                                onClick={() => router.push(`/dashboard/tickets/${tickets.find(t => t.orderId === order.id)?.id}`)}
                                className="flex-1 sm:flex-none px-4 py-2.5 bg-charcoal-800 dark:bg-charcoal-700 hover:bg-charcoal-700 text-gold-400 border border-gold-500/40 rounded-lg transition-colors font-semibold min-h-10 text-sm active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <span>🎫</span> View Ticket
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setTicketModal({ isOpen: true, orderId: order.id, subject: `Inquiry for order #${order.id}`, message: '', loading: false })}
                                className="flex-1 sm:flex-none px-4 py-2.5 border border-cool-gray-300 dark:border-charcoal-600 text-charcoal-700 dark:text-cool-gray-200 hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 rounded-lg transition-colors font-semibold min-h-10 text-sm active:scale-95 cursor-pointer"
                              >
                                Need Help?
                              </button>
                            )}
                          </div>
                        </div>
                        {order.status === 'Delivered' && (
                          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-lg">
                            <p className="text-xs text-blue-700 dark:text-blue-300">
                              <span className="font-semibold">Return Policy:</span> You have 36 hours from delivery to report any issues with this order before funds are released to the vendor.
                            </p>
                          </div>
                        )}
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
          {activeTab === 'tickets' && (
            <div className="bg-white dark:bg-charcoal-800 rounded-xl shadow-md p-4 sm:p-6 border border-cool-gray-200/60 dark:border-charcoal-700">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-cool-gray-200/60 dark:border-charcoal-700">
                <div>
                  <h2 className="text-2xl font-display font-bold text-charcoal-900 dark:text-white">Support Tickets</h2>
                  <p className="text-xs sm:text-sm text-charcoal-500 dark:text-cool-gray-400 mt-1">Open tickets for dispute resolution, shipping inquiries, and escrow protection</p>
                </div>
                <button
                  type="button"
                  onClick={() => setTicketModal({
                    isOpen: true,
                    orderId: orders[0]?.id || '',
                    subject: '',
                    message: '',
                    loading: false
                  })}
                  className="px-4 py-2.5 bg-gold-600 hover:bg-gold-500 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-95"
                >
                  <span className="text-base font-bold">+</span>
                  <span>Open Support Ticket</span>
                </button>
              </div>

              <div className="space-y-4">
                {tickets.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-4">🎫</div>
                    <h3 className="text-lg font-bold text-charcoal-900 dark:text-white mb-2">No support tickets</h3>
                    <p className="text-charcoal-600 dark:text-cool-gray-400 mb-6 max-w-md mx-auto text-sm">
                      Need help with delivery, returns, or payment? Open a ticket to communicate directly with our customer concierge team.
                    </p>
                    <button
                      type="button"
                      onClick={() => setTicketModal({
                        isOpen: true,
                        orderId: orders[0]?.id || '',
                        subject: '',
                        message: '',
                        loading: false
                      })}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-gold-600 hover:bg-gold-500 text-white rounded-lg font-semibold text-sm shadow-xs transition-colors"
                    >
                      <span>+</span> Open Ticket Now
                    </button>
                  </div>
                )}
                {tickets.map((ticket) => (
                  <div key={ticket.id} className="border border-cool-gray-200 dark:border-charcoal-700 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row justify-between md:items-center gap-4 hover:shadow-md transition-shadow bg-cool-gray-50/50 dark:bg-charcoal-750/30">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5 mb-1">
                        <h3 className="font-bold text-base sm:text-lg text-charcoal-900 dark:text-white">{ticket.subject}</h3>
                        <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          ticket.status === 'open' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' :
                          ticket.status === 'closed' ? 'bg-cool-gray-200 text-cool-gray-700 dark:bg-charcoal-600 dark:text-cool-gray-300' :
                          'bg-gold-100 text-gold-800 dark:bg-gold-900/30 dark:text-gold-400'
                        }`}>
                          {ticket.status}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-charcoal-600 dark:text-cool-gray-300">
                        Order: <span className="font-mono font-semibold text-gold-600 dark:text-gold-400">#{ticket.orderId}</span> • Ticket: <span className="font-mono font-semibold">{ticket.ticketNumber}</span>
                      </p>
                      <div className="flex items-center gap-3 text-xs text-cool-gray-400 pt-1">
                        <span>Opened on {new Date(ticket.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        <span>•</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">Escrow Protected</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => router.push(`/dashboard/tickets/${ticket.id}`)}
                      className="px-5 py-2.5 bg-gold-600 hover:bg-gold-500 text-white rounded-lg transition-colors font-semibold text-sm shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95 whitespace-nowrap"
                    >
                      <span>💬</span> Track Progress & Chat
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Ticket Modal */}
      {ticketModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <div className="bg-white dark:bg-charcoal-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-cool-gray-200 dark:border-charcoal-700">
            <div className="p-6 border-b border-cool-gray-100 dark:border-charcoal-700 flex justify-between items-center bg-cool-gray-50/60 dark:bg-charcoal-750/50">
              <div>
                <h3 className="text-xl font-bold text-charcoal-900 dark:text-white">Open Support Ticket</h3>
                <p className="text-xs text-cool-gray-500 dark:text-cool-gray-400 mt-0.5">Submit an inquiry with official escrow protection</p>
              </div>
              <button
                type="button"
                onClick={() => setTicketModal(prev => ({ ...prev, isOpen: false }))}
                className="text-cool-gray-400 hover:text-charcoal-600 dark:hover:text-white text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateTicket} className="p-6 space-y-4">
              {/* Order Selection */}
              <div>
                <label className="block text-sm font-semibold text-charcoal-700 dark:text-cool-gray-300 mb-1.5">
                  Associated Order
                </label>
                {orders.length > 0 ? (
                  <select
                    required
                    value={ticketModal.orderId}
                    onChange={e => setTicketModal(prev => ({ ...prev, orderId: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-cool-gray-300 dark:border-charcoal-600 rounded-lg focus:ring-2 focus:ring-gold-500 bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white text-sm"
                  >
                    <option value="" disabled>Select an order...</option>
                    {orders.map(o => (
                      <option key={o.id} value={o.id}>
                        Order #{o.id} — {o.date} ({formatPrice(o.total)} • {o.status})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    placeholder="Enter Order ID"
                    value={ticketModal.orderId}
                    onChange={e => setTicketModal(prev => ({ ...prev, orderId: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-cool-gray-300 dark:border-charcoal-600 rounded-lg focus:ring-2 focus:ring-gold-500 bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white text-sm"
                  />
                )}
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-semibold text-charcoal-700 dark:text-cool-gray-300 mb-1.5">
                  Issue Category
                </label>
                <select
                  value={ticketCategory}
                  onChange={e => setTicketCategory(e.target.value)}
                  className="w-full px-4 py-2.5 border border-cool-gray-300 dark:border-charcoal-600 rounded-lg focus:ring-2 focus:ring-gold-500 bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white text-sm"
                >
                  <option value="delivery">🚚 Delivery / Shipping Issue</option>
                  <option value="return">🔄 Return / Refund Request (Escrow)</option>
                  <option value="product">💎 Item Quality / Defect</option>
                  <option value="order">📦 Order Status & Waybill</option>
                  <option value="other">💬 General Inquiry</option>
                </select>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-semibold text-charcoal-700 dark:text-cool-gray-300 mb-1.5">
                  Subject
                </label>
                <input
                  required
                  type="text"
                  value={ticketModal.subject}
                  onChange={e => setTicketModal(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Brief summary of the issue..."
                  className="w-full px-4 py-2.5 border border-cool-gray-300 dark:border-charcoal-600 rounded-lg focus:ring-2 focus:ring-gold-500 bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white text-sm"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-semibold text-charcoal-700 dark:text-cool-gray-300 mb-1.5">
                  Message Details
                </label>
                <textarea
                  required
                  rows={4}
                  value={ticketModal.message}
                  onChange={e => setTicketModal(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Describe your request in detail. Our concierge will review and respond promptly..."
                  className="w-full px-4 py-2.5 border border-cool-gray-300 dark:border-charcoal-600 rounded-lg focus:ring-2 focus:ring-gold-500 bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white resize-none text-sm"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setTicketModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-5 py-2.5 text-charcoal-600 dark:text-cool-gray-300 font-semibold hover:bg-cool-gray-100 dark:hover:bg-charcoal-700 rounded-lg transition-colors text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={ticketModal.loading}
                  className="px-6 py-2.5 bg-gold-600 hover:bg-gold-500 text-white font-bold rounded-lg shadow-sm transition-colors text-sm disabled:opacity-60 cursor-pointer active:scale-95"
                >
                  {ticketModal.loading ? 'Submitting...' : 'Submit Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Action Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-charcoal-900/95 text-white dark:bg-white/95 dark:text-charcoal-900 px-6 py-3 rounded-full shadow-2xl backdrop-blur-md border border-gold-500/30 flex items-center gap-2.5 text-sm font-semibold animate-fade-in pointer-events-none">
          <span>✨</span>
          <span>{toastMsg}</span>
        </div>
      )}

      <Footer />
    </div>
  );
}
