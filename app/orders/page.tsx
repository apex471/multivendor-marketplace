'use client';

import { getAuthToken } from '@/lib/api/auth';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useCart } from '@/contexts/CartContext';

interface OrderItem {
  id: string;
  name: string;
  image: string;
  quantity: number;
}

interface Order {
  id: string;
  date: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'completed' | 'cancelled' | 'returned';
  total: number;
  items: OrderItem[];
  itemCount: number;
}

export default function OrdersPage() {
  const router = useRouter();
  const { formatPrice } = useLocalization();
  useEffect(() => { if (!getAuthToken()) router.replace('/auth/login?redirect=/orders'); }, [router]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateRange, setDateRange] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');

  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const { addItem } = useCart();
  const [completingOrderId, setCompletingOrderId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Review Modal state
  const [reviewModal, setReviewModal] = useState<{
    isOpen: boolean;
    order: Order | null;
    selectedProductId: string;
    rating: number;
    title: string;
    comment: string;
    loading: boolean;
  }>({
    isOpen: false,
    order: null,
    selectedProductId: '',
    rating: 5,
    title: '',
    comment: '',
    loading: false,
  });

  // Ticket / Support Modal state
  const [ticketModal, setTicketModal] = useState<{
    isOpen: boolean;
    orderId: string;
    subject: string;
    message: string;
    category: string;
    loading: boolean;
  }>({
    isOpen: false,
    orderId: '',
    subject: '',
    message: '',
    category: 'order',
    loading: false,
  });

  const handleConfirmComplete = async (orderId: string) => {
    if (!confirm('Are you sure you have received your order in good condition? Confirming completion will release escrow payments to the vendor.')) return;
    setCompletingOrderId(orderId);
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ status: 'completed' }),
      });
      const json = await res.json();
      if (json.success) {
        setAllOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'completed' } : o));
        setToastMessage('Order completed! Escrow funds released to vendor. 🎉');
        setTimeout(() => setToastMessage(null), 3500);
      } else {
        alert(json.message ?? 'Failed to complete order');
      }
    } catch {
      alert('Network error — please check connection');
    } finally {
      setCompletingOrderId(null);
    }
  };

  const handleBuyAgain = (order: Order) => {
    if (!order.items.length) {
      router.push('/shop');
      return;
    }
    const unitPrice = Math.round((order.total / order.items.length) * 100) / 100 || 0;
    order.items.forEach(item => {
      addItem({
        productId: item.id,
        name: item.name,
        price: unitPrice,
        image: item.image,
        vendor: '',
        size: '',
        color: '',
        quantity: item.quantity || 1,
      });
    });
    setToastMessage(`Added ${order.items.length} item(s) to bag! 🛍️`);
    setTimeout(() => {
      setToastMessage(null);
      router.push('/cart');
    }, 1000);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewModal.selectedProductId) return;
    const token = getAuthToken();
    if (!token) {
      router.push('/auth/login?redirect=/orders');
      return;
    }
    setReviewModal(prev => ({ ...prev, loading: true }));
    try {
      const res = await fetch(`/api/products/${reviewModal.selectedProductId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          rating: reviewModal.rating,
          title: reviewModal.title || 'Verified Purchase',
          comment: reviewModal.comment,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setReviewModal({ isOpen: false, order: null, selectedProductId: '', rating: 5, title: '', comment: '', loading: false });
        setToastMessage('Review submitted successfully! Thank you for your feedback. ⭐');
        setTimeout(() => setToastMessage(null), 3500);
      } else {
        alert(json.message || 'Failed to submit review');
        setReviewModal(prev => ({ ...prev, loading: false }));
      }
    } catch {
      alert('Network error — please try again');
      setReviewModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getAuthToken();
    if (!token) return;
    setTicketModal(prev => ({ ...prev, loading: true }));
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          orderId: ticketModal.orderId,
          subject: ticketModal.subject,
          message: ticketModal.message,
          category: ticketModal.category,
        }),
      });
      const json = await res.json();
      if (json.success && json.data?.ticket) {
        setTicketModal({ isOpen: false, orderId: '', subject: '', message: '', category: 'order', loading: false });
        setToastMessage('Support ticket opened! Redirecting to live conversation... 🎫');
        setTimeout(() => {
          setToastMessage(null);
          router.push(`/dashboard/tickets/${json.data.ticket.id}`);
        }, 1100);
      } else {
        alert(json.message || 'Failed to submit ticket');
        setTicketModal(prev => ({ ...prev, loading: false }));
      }
    } catch {
      alert('Network error — please check connection');
      setTicketModal(prev => ({ ...prev, loading: false }));
    }
  };

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

  const statusConfig: Record<string, { color: string; icon: string; label: string }> = {
    pending: { color: 'bg-gray-100 text-gray-800', icon: '🕐', label: 'Pending' },
    processing: { color: 'bg-yellow-100 text-yellow-800', icon: '⏳', label: 'Processing' },
    shipped: { color: 'bg-blue-100 text-blue-800', icon: '🚚', label: 'Shipped' },
    delivered: { color: 'bg-green-100 text-green-800', icon: '✓', label: 'Delivered' },
    completed: { color: 'bg-green-100 text-green-800', icon: '🎉', label: 'Completed' },
    cancelled: { color: 'bg-red-100 text-red-800', icon: '✕', label: 'Cancelled' },
    returned: { color: 'bg-orange-100 text-orange-800', icon: '🔄', label: 'Returned' },
  };

  const filters = [
    { value: 'all', label: 'All Orders' },
    { value: 'processing', label: 'Processing' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'completed', label: 'Completed' },
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
                            💰 {formatPrice(order.total)}
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
                  <div className="p-4 sm:p-6 border-t dark:border-charcoal-700 bg-gray-50 dark:bg-charcoal-900 flex flex-wrap gap-2.5 items-center">
                    {(order.status === 'shipped' || order.status === 'delivered') && (
                      <button
                        type="button"
                        disabled={completingOrderId === order.id}
                        onClick={() => handleConfirmComplete(order.id)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 cursor-pointer active:scale-95 shadow-xs flex items-center gap-1.5"
                      >
                        <span>✓</span>
                        <span>{completingOrderId === order.id ? 'Releasing Escrow...' : 'Confirm Receipt / Complete'}</span>
                      </button>
                    )}
                    {order.status === 'shipped' && (
                      <Link
                        href={`/track/${order.id}`}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer active:scale-95 flex items-center gap-1"
                      >
                        <span>🚚</span>
                        <span>Track Package</span>
                      </Link>
                    )}
                    {(order.status === 'delivered' || order.status === 'completed') && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleBuyAgain(order)}
                          className="px-4 py-2 bg-charcoal-900 hover:bg-charcoal-800 dark:bg-charcoal-700 dark:hover:bg-charcoal-600 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer active:scale-95 flex items-center gap-1.5"
                        >
                          <span>🛍️</span>
                          <span>Buy Again</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setReviewModal({
                            isOpen: true,
                            order,
                            selectedProductId: order.items[0]?.id || '',
                            rating: 5,
                            title: '',
                            comment: '',
                            loading: false,
                          })}
                          className="px-4 py-2 border-2 border-cool-gray-300 dark:border-charcoal-600 text-charcoal-700 dark:text-cool-gray-200 rounded-lg text-sm font-semibold hover:bg-cool-gray-100 dark:hover:bg-charcoal-800 transition-colors cursor-pointer active:scale-95 flex items-center gap-1.5"
                        >
                          <span>⭐</span>
                          <span>Leave Review</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setTicketModal({
                            isOpen: true,
                            orderId: order.id,
                            subject: `Return Request for Order #${order.id}`,
                            message: 'I would like to request a return / refund for this order under the certified luxury escrow policy.',
                            category: 'return',
                            loading: false,
                          })}
                          className="px-4 py-2 border-2 border-orange-300 dark:border-orange-500/40 text-orange-600 dark:text-orange-400 rounded-lg text-sm font-semibold hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-colors cursor-pointer active:scale-95 flex items-center gap-1.5"
                        >
                          <span>🔄</span>
                          <span>Return Items</span>
                        </button>
                      </>
                    )}
                    {order.status === 'processing' && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (!confirm('Are you sure you want to cancel this order?')) return;
                          const token = getAuthToken();
                          const res = await fetch(`/api/orders/${order.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                            body: JSON.stringify({ status: 'cancelled' }),
                          });
                          if (res.ok) {
                            setAllOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'cancelled' } : o));
                            setToastMessage('Order cancelled successfully.');
                            setTimeout(() => setToastMessage(null), 2500);
                          }
                        }}
                        className="px-4 py-2 border-2 border-red-300 dark:border-red-500/40 text-red-600 dark:text-red-400 rounded-lg text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
                      >
                        Cancel Order
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setTicketModal({
                        isOpen: true,
                        orderId: order.id,
                        subject: `Support Inquiry for Order #${order.id}`,
                        message: '',
                        category: 'order',
                        loading: false,
                      })}
                      className="px-4 py-2 border-2 border-gold-500/50 text-gold-600 dark:text-gold-400 rounded-lg text-sm font-semibold hover:bg-gold-50 dark:hover:bg-gold-950/20 transition-colors cursor-pointer active:scale-95 flex items-center gap-1.5"
                    >
                      <span>💬</span>
                      <span>Get Help</span>
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

      {/* ── Review Modal ──────────────────────────────────────────────── */}
      {reviewModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-charcoal-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-cool-gray-200 dark:border-charcoal-700">
            <div className="p-6 border-b border-cool-gray-100 dark:border-charcoal-700 flex justify-between items-center bg-cool-gray-50/60 dark:bg-charcoal-750/50">
              <h3 className="text-lg font-bold text-charcoal-900 dark:text-white">Write a Product Review</h3>
              <button
                type="button"
                onClick={() => setReviewModal(prev => ({ ...prev, isOpen: false }))}
                className="text-cool-gray-400 hover:text-charcoal-600 dark:hover:text-white text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmitReview} className="p-6 space-y-4">
              {reviewModal.order && reviewModal.order.items.length > 1 && (
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 dark:text-cool-gray-300 mb-1.5 uppercase tracking-wider">
                    Select Item to Review
                  </label>
                  <select
                    value={reviewModal.selectedProductId}
                    onChange={e => setReviewModal(prev => ({ ...prev, selectedProductId: e.target.value }))}
                    className="w-full px-3 py-2 border border-cool-gray-300 dark:border-charcoal-600 rounded-lg text-sm bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white"
                  >
                    {reviewModal.order.items.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Star Rating */}
              <div>
                <label className="block text-xs font-semibold text-charcoal-700 dark:text-cool-gray-300 mb-2 uppercase tracking-wider">
                  Rating
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewModal(prev => ({ ...prev, rating: star }))}
                      className="text-2xl hover:scale-110 transition-transform cursor-pointer"
                    >
                      {star <= reviewModal.rating ? '⭐' : '☆'}
                    </button>
                  ))}
                  <span className="text-xs font-bold text-gold-600 dark:text-gold-400 self-center ml-2">
                    {reviewModal.rating} of 5 Stars
                  </span>
                </div>
              </div>

              {/* Review Title */}
              <div>
                <label className="block text-xs font-semibold text-charcoal-700 dark:text-cool-gray-300 mb-1.5 uppercase tracking-wider">
                  Headline
                </label>
                <input
                  type="text"
                  placeholder="e.g. Exceptional craftsmanship, authentic quality"
                  value={reviewModal.title}
                  onChange={e => setReviewModal(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-cool-gray-300 dark:border-charcoal-600 rounded-lg text-sm bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white"
                />
              </div>

              {/* Comment */}
              <div>
                <label className="block text-xs font-semibold text-charcoal-700 dark:text-cool-gray-300 mb-1.5 uppercase tracking-wider">
                  Your Review
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Share details about the fit, material quality, and delivery experience..."
                  value={reviewModal.comment}
                  onChange={e => setReviewModal(prev => ({ ...prev, comment: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-cool-gray-300 dark:border-charcoal-600 rounded-lg text-sm bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setReviewModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 text-charcoal-600 dark:text-cool-gray-300 font-semibold text-sm hover:bg-cool-gray-100 dark:hover:bg-charcoal-700 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewModal.loading}
                  className="px-5 py-2 bg-gold-600 hover:bg-gold-500 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 cursor-pointer active:scale-95 shadow-xs"
                >
                  {reviewModal.loading ? 'Submitting...' : 'Publish Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Ticket / Get Help Modal ─────────────────────────────────────── */}
      {ticketModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-charcoal-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-cool-gray-200 dark:border-charcoal-700">
            <div className="p-6 border-b border-cool-gray-100 dark:border-charcoal-700 flex justify-between items-center bg-cool-gray-50/60 dark:bg-charcoal-750/50">
              <div>
                <h3 className="text-lg font-bold text-charcoal-900 dark:text-white">Order Support Ticket</h3>
                <p className="text-xs text-cool-gray-500 dark:text-cool-gray-400 mt-0.5">Order #{ticketModal.orderId}</p>
              </div>
              <button
                type="button"
                onClick={() => setTicketModal(prev => ({ ...prev, isOpen: false }))}
                className="text-cool-gray-400 hover:text-charcoal-600 dark:hover:text-white text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmitTicket} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-charcoal-700 dark:text-cool-gray-300 mb-1.5 uppercase tracking-wider">
                  Category
                </label>
                <select
                  value={ticketModal.category}
                  onChange={e => setTicketModal(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-cool-gray-300 dark:border-charcoal-600 rounded-lg text-sm bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white"
                >
                  <option value="order">📦 Order Status / Inquiry</option>
                  <option value="delivery">🚚 Delivery / Courier Issue</option>
                  <option value="return">🔄 Return / Refund Request (Escrow)</option>
                  <option value="product">💎 Defect or Damage Report</option>
                  <option value="other">💬 Other Assistance</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-700 dark:text-cool-gray-300 mb-1.5 uppercase tracking-wider">
                  Subject
                </label>
                <input
                  type="text"
                  required
                  value={ticketModal.subject}
                  onChange={e => setTicketModal(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-cool-gray-300 dark:border-charcoal-600 rounded-lg text-sm bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-700 dark:text-cool-gray-300 mb-1.5 uppercase tracking-wider">
                  Describe the Issue
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Please provide specifics so our concierge team can assist or coordinate with the vendor and CourierPlus..."
                  value={ticketModal.message}
                  onChange={e => setTicketModal(prev => ({ ...prev, message: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-cool-gray-300 dark:border-charcoal-600 rounded-lg text-sm bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setTicketModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 text-charcoal-600 dark:text-cool-gray-300 font-semibold text-sm hover:bg-cool-gray-100 dark:hover:bg-charcoal-700 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={ticketModal.loading}
                  className="px-5 py-2 bg-gold-600 hover:bg-gold-500 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 cursor-pointer active:scale-95 shadow-xs"
                >
                  {ticketModal.loading ? 'Submitting...' : 'Open Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Toast Notification ───────────────────────────────────────────── */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-charcoal-900/95 text-white dark:bg-white/95 dark:text-charcoal-900 px-6 py-3 rounded-full shadow-2xl backdrop-blur-md border border-gold-500/30 flex items-center gap-2.5 text-sm font-semibold animate-fade-in pointer-events-none">
          <span>✨</span>
          <span>{toastMessage}</span>
        </div>
      )}

      <Footer />
    </div>
  );
}
