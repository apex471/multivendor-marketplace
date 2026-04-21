'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Header from '../../../components/common/Header';
import Footer from '../../../components/common/Footer';
import { getAuthToken } from '@/lib/api/auth';

interface OrderItem {
  id: string;
  name: string;
  image: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  orderNumber: string;
  customer: {
    name: string;
    email: string;
  };
  items: OrderItem[];
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
  shippingAddress: string;
}

interface ApiStats {
  totalOrders: number;
  revenue: number;
  monthlyRevenue: number;
}

export default function VendorOrdersPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 10;

  const [orders, setOrders] = useState<Order[]>([]);
  const [apiStats, setApiStats] = useState<ApiStats>({ totalOrders: 0, revenue: 0, monthlyRevenue: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchOrders = useCallback(async () => {
    const token = getAuthToken();
    if (!token) { router.replace('/auth/vendor/login'); return; }
    try {
      const res  = await fetch('/api/vendor/orders', { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (!json.success) { setError(json.message || 'Failed to load orders'); return; }
      setOrders(json.data.orders ?? []);
      setApiStats(json.data.stats ?? { totalOrders: 0, revenue: 0, monthlyRevenue: 0 });
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const stats = {
    total:      apiStats.totalOrders,
    pending:    orders.filter(o => o.status === 'pending').length,
    processing: orders.filter(o => o.status === 'processing').length,
    revenue:    apiStats.monthlyRevenue,
  };

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesSearch = order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.customer.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesDate = true;
    if (dateRange !== 'all') {
      const orderDate = new Date(order.createdAt);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (dateRange === 'today') matchesDate = diffDays === 0;
      else if (dateRange === 'week') matchesDate = diffDays <= 7;
      else if (dateRange === 'month') matchesDate = diffDays <= 30;
    }
    
    return matchesStatus && matchesSearch && matchesDate;
  });

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
  const startIndex = (currentPage - 1) * ordersPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + ordersPerPage);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400';
      case 'processing':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400';
      case 'shipped':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400';
      case 'delivered':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400';
      case 'cancelled':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400';
      default:
        return 'bg-cool-gray-100 dark:bg-charcoal-700 text-charcoal-700 dark:text-cool-gray-400';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleExportCSV = () => {
    const rows = [
      ['Order #', 'Customer', 'Email', 'Items', 'Total', 'Status', 'Date'],
      ...filteredOrders.map(o => [
        o.orderNumber, o.customer.name, o.customer.email,
        o.items.length, o.total.toFixed(2), o.status,
        new Date(o.createdAt).toLocaleDateString(),
      ]),
    ];
    const csv  = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'vendor-orders.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      <Header />

      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-charcoal-900 dark:text-white mb-2">
              Orders
            </h1>
            <p className="text-charcoal-600 dark:text-cool-gray-400">
              Manage and fulfill customer orders
            </p>
          </div>
          <button
            onClick={handleExportCSV}
            className="px-6 py-3 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 transition-colors font-semibold flex items-center gap-2"
          >
            <span>📊</span>
            Export CSV
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg p-4">
            <p className="text-sm text-charcoal-600 dark:text-cool-gray-400 mb-1">Total Orders</p>
            <p className="text-2xl font-bold text-charcoal-900 dark:text-white">{stats.total}</p>
          </div>
          <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg p-4">
            <p className="text-sm text-charcoal-600 dark:text-cool-gray-400 mb-1">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </div>
          <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg p-4">
            <p className="text-sm text-charcoal-600 dark:text-cool-gray-400 mb-1">Processing</p>
            <p className="text-2xl font-bold text-blue-600">{stats.processing}</p>
          </div>
          <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg p-4">
            <p className="text-sm text-charcoal-600 dark:text-cool-gray-400 mb-1">Revenue</p>
            <p className="text-2xl font-bold text-gold-600">${stats.revenue.toFixed(2)}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg p-4 mb-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <input
                type="text"
                placeholder="Search by order # or customer name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-white"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled')}
              className="px-4 py-2 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as 'all' | 'today' | 'week' | 'month')}
              className="px-4 py-2 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-white"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg p-4 mb-6">{error}</div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white dark:bg-charcoal-800 border border-cool-gray-200 dark:border-charcoal-700 rounded-lg p-6 animate-pulse">
                <div className="h-5 bg-cool-gray-200 dark:bg-charcoal-600 rounded w-1/4 mb-3" />
                <div className="h-4 bg-cool-gray-100 dark:bg-charcoal-700 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* Orders List */}
        {!loading && (
        <div className="space-y-4">
          {paginatedOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg p-6 hover:border-gold-500 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-charcoal-900 dark:text-white">
                      {order.orderNumber}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(order.status)}`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </div>
                  <p className="text-sm text-charcoal-600 dark:text-cool-gray-400">
                    {formatDate(order.createdAt)}
                  </p>
                </div>
                <Link
                  href={`/vendor/orders/${order.id}`}
                  className="px-4 py-2 bg-gold-600 text-white rounded-lg hover:bg-gold-700 transition-colors font-semibold text-sm"
                >
                  View Details
                </Link>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-charcoal-600 dark:text-cool-gray-400 mb-1">Customer</p>
                  <p className="font-semibold text-charcoal-900 dark:text-white">{order.customer.name}</p>
                  <p className="text-sm text-charcoal-600 dark:text-cool-gray-400">{order.customer.email}</p>
                </div>
                <div>
                  <p className="text-xs text-charcoal-600 dark:text-cool-gray-400 mb-1">Shipping Address</p>
                  <p className="text-sm text-charcoal-900 dark:text-white">{order.shippingAddress}</p>
                </div>
              </div>

              <div className="border-t border-cool-gray-200 dark:border-charcoal-700 pt-4">
                <p className="text-xs text-charcoal-600 dark:text-cool-gray-400 mb-3">Items ({order.items.length})</p>
                <div className="flex items-center gap-4 mb-4">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <div className="relative w-12 h-12 rounded overflow-hidden shrink-0">
                        <Image src={item.image} alt={item.name} fill className="object-cover" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-charcoal-900 dark:text-white">{item.name}</p>
                        <p className="text-xs text-charcoal-600 dark:text-cool-gray-400">Qty: {item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-charcoal-600 dark:text-cool-gray-400">Order Total</p>
                  <p className="text-xl font-bold text-charcoal-900 dark:text-white">
                    ${order.total.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
        )}

        {/* Empty State */}
        {!loading && filteredOrders.length === 0 && (
          <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg p-12 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-bold text-charcoal-900 dark:text-white mb-2">
              {orders.length === 0 ? 'No orders yet' : 'No orders match your filters'}
            </h3>
            <p className="text-charcoal-600 dark:text-cool-gray-400">
              {orders.length === 0 ? 'Orders will appear here once customers purchase your products' : 'Try adjusting your filters or search query'}
            </p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-charcoal-600 dark:text-cool-gray-400">
              Showing {startIndex + 1} to {Math.min(startIndex + ordersPerPage, filteredOrders.length)} of {filteredOrders.length} orders
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      currentPage === page
                        ? 'bg-gold-600 text-white'
                        : 'border border-cool-gray-300 dark:border-charcoal-700 hover:bg-cool-gray-50 dark:hover:bg-charcoal-700'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
