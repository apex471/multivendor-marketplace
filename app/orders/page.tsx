'use client';

import { getAuthToken } from '@/lib/api/auth';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';

interface OrderItem {
  id: string;
  name: string;
  image: string;
  quantity: number;
}

interface Order {
  id: string;
  date: string;
  status: 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total: number;
  items: OrderItem[];
  itemCount: number;
}

export default function OrdersPage() {
  const router = useRouter();
  useEffect(() => { if (!getAuthToken()) router.replace('/auth/login?redirect=/orders'); }, [router]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateRange, setDateRange] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');

  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    // Wrap in Promise.resolve to avoid synchronous setState-in-effect lint warning
    Promise.resolve(getAuthToken())
      .then(token => {
        if (!token) {
          setFetchError('Please log in to view your orders.');
          return;
        }
        return fetch('/api/customer/orders', {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then(r => r.json())
          .then(data => {
            if (data.success) {
              const normalized: Order[] = (data.data.orders as Array<{
                id: string; date: string; status: string; total: number; itemCount: number; items: OrderItem[];
              }>).map(o => ({
                ...o,
                status: (o.status === 'pending' ? 'processing' : o.status) as Order['status'],
              }));
              setAllOrders(normalized);
            } else {
              setFetchError(data.message || 'Failed to load orders.');
            }
          });
      })
      .catch(() => setFetchError('Network error. Please try again.'))
      .finally(() => setIsLoading(false));
  }, []);

  const filteredOrders = allOrders
    .filter(order => {
      // Status filter
      const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
      
      // Search filter (order ID or product name)
      const matchesSearch = searchQuery === '' || 
        order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.items.some(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Date range filter
      let matchesDate = true;
      const orderDate = new Date(order.date);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (dateRange === '7days') matchesDate = daysDiff <= 7;
      else if (dateRange === '30days') matchesDate = daysDiff <= 30;
      else if (dateRange === '90days') matchesDate = daysDiff <= 90;
      
      return matchesStatus && matchesSearch && matchesDate;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortBy === 'oldest') return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sortBy === 'amount-high') return b.total - a.total;
      if (sortBy === 'amount-low') return a.total - b.total;
      return 0;
    });

  const statusConfig = {
    processing: { color: 'bg-yellow-100 text-yellow-800', icon: '⏳', label: 'Processing' },
    shipped: { color: 'bg-blue-100 text-blue-800', icon: '🚚', label: 'Shipped' },
    delivered: { color: 'bg-green-100 text-green-800', icon: '✓', label: 'Delivered' },
    cancelled: { color: 'bg-red-100 text-red-800', icon: '✕', label: 'Cancelled' },
  };

  const filters = [
    { value: 'all', label: 'All Orders' },
    { value: 'processing', label: 'Processing' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      <Header />

      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-charcoal-900 dark:text-white mb-2">My Orders</h1>
          <p className="text-charcoal-600 dark:text-cool-gray-400">Track and manage all your orders</p>
        </div>

        {/* Loading / Error states */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-gold-600 border-t-transparent" />
          </div>
        )}
        {!isLoading && fetchError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center mb-6">
            <p className="text-red-700 dark:text-red-400 font-semibold">{fetchError}</p>
            {fetchError.includes('log in') && (
              <Link href="/auth/customer/login" className="mt-3 inline-block px-5 py-2 bg-gold-600 text-white rounded-lg text-sm font-semibold hover:bg-gold-700">
                Log In
              </Link>
            )}
          </div>
        )}
        {!isLoading && !fetchError && (
        <>
        {/* Filters */}
        <div className="bg-white dark:bg-charcoal-800 rounded-lg border border-cool-gray-300 dark:border-charcoal-700 shadow-md p-4 mb-6">
          {/* Search and Sort Row */}
          <div className="grid md:grid-cols-3 gap-3 mb-4">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search by order # or product..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 pl-10 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg bg-white dark:bg-charcoal-900 focus:outline-none focus:ring-2 focus:ring-gold-600"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400">🔍</span>
            </div>
            
            {/* Date Range */}
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg bg-white dark:bg-charcoal-900 focus:outline-none focus:ring-2 focus:ring-gold-600"
            >
              <option value="all">All Time</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="90days">Last 90 Days</option>
            </select>
            
            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg bg-white dark:bg-charcoal-900 focus:outline-none focus:ring-2 focus:ring-gold-600"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="amount-high">Amount: High to Low</option>
              <option value="amount-low">Amount: Low to High</option>
            </select>
          </div>
          
          {/* Status Filter Tabs */}
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setFilterStatus(filter.value)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterStatus === filter.value
                    ? 'bg-gold-600 text-white'
                    : 'bg-cool-gray-100 dark:bg-charcoal-700 text-charcoal-700 dark:text-cool-gray-300 hover:bg-cool-gray-200 dark:hover:bg-charcoal-600'
                }`}
              >
                {filter.label}
                {filter.value === 'all' && ` (${allOrders.length})`}
                {filter.value !== 'all' && ` (${allOrders.filter(o => o.status === filter.value).length})`}
              </button>
            ))}
          </div>
          
          {/* Active Filters Display */}
          {(searchQuery || dateRange !== 'all' || filterStatus !== 'all') && (
            <div className="mt-3 pt-3 border-t border-cool-gray-300 dark:border-charcoal-700">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-charcoal-600 dark:text-cool-gray-400">Active filters:</span>
                {searchQuery && (
                  <span className="px-2 py-1 bg-gold-100 dark:bg-gold-900/30 text-gold-800 dark:text-gold-400 text-xs rounded flex items-center gap-1">
                    Search: &ldquo;{searchQuery}&rdquo;
                    <button onClick={() => setSearchQuery('')} className="hover:text-gold-900">✕</button>
                  </span>
                )}
                {dateRange !== 'all' && (
                  <span className="px-2 py-1 bg-gold-100 dark:bg-gold-900/30 text-gold-800 dark:text-gold-400 text-xs rounded flex items-center gap-1">
                    Date: {dateRange === '7days' ? 'Last 7 Days' : dateRange === '30days' ? 'Last 30 Days' : 'Last 90 Days'}
                    <button onClick={() => setDateRange('all')} className="hover:text-gold-900">✕</button>
                  </span>
                )}
                {filterStatus !== 'all' && (
                  <span className="px-2 py-1 bg-gold-100 dark:bg-gold-900/30 text-gold-800 dark:text-gold-400 text-xs rounded flex items-center gap-1">
                    Status: {filters.find(f => f.value === filterStatus)?.label}
                    <button onClick={() => setFilterStatus('all')} className="hover:text-gold-900">✕</button>
                  </span>
                )}
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setDateRange('all');
                    setFilterStatus('all');
                  }}
                  className="text-xs text-gold-600 hover:text-gold-700 font-semibold"
                >
                  Clear all
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="bg-white dark:bg-charcoal-800 rounded-lg shadow-md p-12 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-bold text-charcoal-900 dark:text-white mb-2">No orders found</h3>
            <p className="text-charcoal-600 dark:text-cool-gray-400 mb-6">
              {filterStatus === 'all'
                ? "You haven't placed any orders yet"
                : `No ${filterStatus} orders`}
            </p>
            <Link
              href="/shop"
              className="inline-block px-6 py-3 bg-gold-600 text-white rounded-lg font-semibold hover:bg-gold-700 transition-colors"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const status = statusConfig[order.status];
              return (
                <div key={order.id} className="bg-white dark:bg-charcoal-800 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                  {/* Order Header */}
                  <div className="p-4 sm:p-6 border-b dark:border-charcoal-700">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-charcoal-900 dark:text-white">Order #{order.id}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${status.color}`}>
                            {status.icon} {status.label}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-charcoal-600 dark:text-cool-gray-400">
                          <span>
                            📅 {new Date(order.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                          <span>📦 {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}</span>
                          <span className="font-semibold text-charcoal-900 dark:text-white">
                            💰 ${order.total.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <Link
                        href={`/order/${order.id}`}
                        className="px-6 py-2 bg-gold-600 text-white rounded-lg font-semibold hover:bg-gold-700 transition-colors text-center"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>

                  {/* Order Items Preview */}
                  <div className="p-4 sm:p-6">
                    <div className="flex gap-4 overflow-x-auto pb-2">
                      {order.items.map((item) => (
                        <div key={item.id} className="shrink-0">
                          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden border dark:border-charcoal-700">
                            <Image
                              src={item.image}
                              alt={item.name}
                              fill
                              className="object-cover"
                            />
                            {item.quantity > 1 && (
                              <div className="absolute top-1 right-1 w-6 h-6 bg-charcoal-900 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                {item.quantity}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {order.itemCount > order.items.length && (
                        <div className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-lg border border-dashed border-gray-300 dark:border-charcoal-600 flex items-center justify-center text-charcoal-600 dark:text-cool-gray-400">
                          <span className="text-sm font-medium">
                            +{order.itemCount - order.items.length}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Order Actions */}
                  <div className="p-4 sm:p-6 border-t dark:border-charcoal-700 bg-gray-50 dark:bg-charcoal-900 flex flex-wrap gap-2">
                    {order.status === 'shipped' && (
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
                        Track Package
                      </button>
                    )}
                    {order.status === 'delivered' && (
                      <>
                        <button className="px-4 py-2 bg-charcoal-900 text-white rounded-lg text-sm font-semibold hover:bg-charcoal-800 transition-colors">
                          Buy Again
                        </button>
                        <button className="px-4 py-2 border-2 border-gray-300 dark:border-charcoal-600 text-charcoal-700 dark:text-cool-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-100 dark:hover:bg-charcoal-700 transition-colors">
                          Leave Review
                        </button>
                        <button className="px-4 py-2 border-2 border-gray-300 dark:border-charcoal-600 text-charcoal-700 dark:text-cool-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-100 dark:hover:bg-charcoal-700 transition-colors">
                          Return Items
                        </button>
                      </>
                    )}
                    {order.status === 'processing' && (
                      <button
                        onClick={async () => {
                          if (confirm('Are you sure you want to cancel this order?')) {
                            const token = getAuthToken();
                            const res = await fetch(`/api/orders/${order.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                              body: JSON.stringify({ status: 'cancelled' }),
                            });
                            if (res.ok) {
                              setAllOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'cancelled' } : o));
                            }
                          }
                        }}
                        className="px-4 py-2 border-2 border-red-300 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-50 transition-colors"
                      >
                        Cancel Order
                      </button>
                    )}
                    <button className="px-4 py-2 border-2 border-gray-300 dark:border-charcoal-600 text-charcoal-700 dark:text-cool-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-100 dark:hover:bg-charcoal-700 transition-colors">
                      Get Help
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Help Section */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <span className="text-3xl">💬</span>
            <div>
              <h3 className="font-semibold text-charcoal-900 dark:text-white mb-2">Need help with your order?</h3>
              <p className="text-sm text-charcoal-600 dark:text-cool-gray-400 mb-4">
                Our customer support team is here to help you with any questions or concerns.
              </p>
              <Link
                href="/contact"
                className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Contact Support
              </Link>
            </div>
          </div>
        </div>
        </>
        )}
      </div>

      <Footer />
    </div>
  );
}
