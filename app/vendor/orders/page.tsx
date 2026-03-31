'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Header from '../../../components/common/Header';
import Footer from '../../../components/common/Footer';

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

export default function VendorOrdersPage() {
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 10;

  // Mock orders data
  const [orders] = useState<Order[]>([
    {
      id: '1',
      orderNumber: 'ORD-2025001',
      customer: {
        name: 'Sarah Johnson',
        email: 'sarah.j@email.com'
      },
      items: [
        {
          id: '1',
          name: 'Designer Silk Dress',
          image: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=100',
          quantity: 1,
          price: 299.99
        }
      ],
      total: 324.99,
      status: 'pending',
      createdAt: '2025-12-20T08:30:00Z',
      shippingAddress: '123 Main St, New York, NY 10001'
    },
    {
      id: '2',
      orderNumber: 'ORD-2025002',
      customer: {
        name: 'Michael Chen',
        email: 'mchen@email.com'
      },
      items: [
        {
          id: '2',
          name: 'Evening Clutch',
          image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=100',
          quantity: 2,
          price: 149.99
        }
      ],
      total: 324.98,
      status: 'processing',
      createdAt: '2025-12-19T14:20:00Z',
      shippingAddress: '456 Oak Ave, Los Angeles, CA 90012'
    },
    {
      id: '3',
      orderNumber: 'ORD-2025003',
      customer: {
        name: 'Emma Wilson',
        email: 'emma.w@email.com'
      },
      items: [
        {
          id: '3',
          name: 'Leather Handbag',
          image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=100',
          quantity: 1,
          price: 399.99
        }
      ],
      total: 431.99,
      status: 'shipped',
      createdAt: '2025-12-18T10:15:00Z',
      shippingAddress: '789 Pine Rd, Chicago, IL 60601'
    },
    {
      id: '4',
      orderNumber: 'ORD-2025004',
      customer: {
        name: 'David Martinez',
        email: 'dmartinez@email.com'
      },
      items: [
        {
          id: '1',
          name: 'Designer Silk Dress',
          image: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=100',
          quantity: 1,
          price: 299.99
        }
      ],
      total: 324.99,
      status: 'delivered',
      createdAt: '2025-12-15T16:45:00Z',
      shippingAddress: '321 Elm St, Houston, TX 77001'
    },
    {
      id: '5',
      orderNumber: 'ORD-2025005',
      customer: {
        name: 'Lisa Anderson',
        email: 'l.anderson@email.com'
      },
      items: [
        {
          id: '2',
          name: 'Evening Clutch',
          image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=100',
          quantity: 1,
          price: 149.99
        }
      ],
      total: 171.99,
      status: 'cancelled',
      createdAt: '2025-12-19T09:00:00Z',
      shippingAddress: '654 Maple Dr, Miami, FL 33101'
    }
  ]);

  // Calculate stats
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    processing: orders.filter(o => o.status === 'processing').length,
    revenue: orders.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + o.total, 0)
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
    console.log('Exporting orders to CSV...');
    alert('CSV export feature would download filtered orders here');
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
              onChange={(e) => setStatusFilter(e.target.value as any)}
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
              onChange={(e) => setDateRange(e.target.value as any)}
              className="px-4 py-2 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-white"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
          </div>
        </div>

        {/* Orders List */}
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
                      <div className="relative w-12 h-12 rounded overflow-hidden flex-shrink-0">
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

        {/* Empty State */}
        {filteredOrders.length === 0 && (
          <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg p-12 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-bold text-charcoal-900 dark:text-white mb-2">
              No orders found
            </h3>
            <p className="text-charcoal-600 dark:text-cool-gray-400">
              Try adjusting your filters or search query
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
