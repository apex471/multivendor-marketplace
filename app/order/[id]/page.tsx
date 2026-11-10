'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import { getAuthToken } from '@/lib/api/auth';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useCart } from '@/contexts/CartContext';

interface OrderItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  vendor: string;
  vendorId?: string;
  vendorRole?: string;
  size?: string;
  color?: string;
}

interface OrderDetail {
  id: string;
  orderId: string;
  docId: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'completed' | 'cancelled' | 'returned';
  paymentStatus: 'pending' | 'pending_manual' | 'paid' | 'failed' | 'refunded';
  date: string;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  tax: number;
  discount: number;
  total: number;
  couponCode?: string;
  shippingAddress: {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    formattedAddress: string;
  };
  trackingNumber?: string;
  courierPlusWaybillNumber?: string;
  courierPlusTrackingId?: string;
  courierPlusStatus?: string;
  courier?: {
    id?: string;
    name?: string;
    icon?: string;
    price?: number;
    eta?: string;
    carrier?: string;
  };
  assignedDriverName?: string;
  acceptedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = (params?.id as string) || '';
  const { formatPrice } = useLocalization();
  const { addItem } = useCart();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Review Modal state
  const [reviewModal, setReviewModal] = useState<{
    isOpen: boolean;
    productId: string;
    productName: string;
    rating: number;
    title: string;
    comment: string;
    loading: boolean;
  }>({
    isOpen: false,
    productId: '',
    productName: '',
    rating: 5,
    title: '',
    comment: '',
    loading: false,
  });

  // Support / Return Modal state
  const [ticketModal, setTicketModal] = useState<{
    isOpen: boolean;
    subject: string;
    message: string;
    category: string;
    loading: boolean;
  }>({
    isOpen: false,
    subject: '',
    message: '',
    category: 'order',
    loading: false,
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchOrderDetail = useCallback(async () => {
    if (!rawId) return;
    setLoading(true);
    setErrorMessage('');
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/orders/${encodeURIComponent(rawId)}`, { headers });
      const json = await res.json();

      if (!res.ok || !json.success || !json.data?.order) {
        setErrorMessage(json.message || 'Order could not be found.');
        return;
      }

      const raw = json.data.order;

      // Extract items array safely
      const rawItems: any[] = Array.isArray(raw.items) && raw.items.length > 0
        ? raw.items
        : Array.isArray(raw.products)
        ? raw.products.map((pName: string, idx: number) => ({
            productId: `prod-${idx}`,
            name: pName,
            price: raw.total / (raw.products.length || 1),
            quantity: 1,
            image: '/images/placeholder.jpg',
            vendor: raw.vendorName || 'CLW Merchant',
          }))
        : [];

      const cleanItems: OrderItem[] = rawItems.map((item, idx) => ({
        id: item.id || item.productId || `item-${idx}`,
        productId: item.productId || item.id || `item-${idx}`,
        name: item.name || 'Luxury Item',
        price: Number(item.price ?? 0),
        quantity: Number(item.quantity ?? 1),
        image: item.image || '/images/placeholder.jpg',
        vendor: item.vendor || raw.vendorName || 'CLW Merchant',
        vendorId: item.vendorId,
        vendorRole: item.vendorRole || 'vendor',
        size: item.size,
        color: item.color,
      }));

      // Extract shipping address safely without object rendering crashes
      let addrObj = {
        fullName: '',
        phone: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        zipCode: '',
        country: '',
        formattedAddress: 'Address on file',
      };

      if (typeof raw.shippingAddress === 'string') {
        addrObj.formattedAddress = raw.shippingAddress;
        addrObj.fullName = raw.customerName || '';
        addrObj.phone = raw.customerPhone || '';
      } else if (raw.shippingAddress && typeof raw.shippingAddress === 'object') {
        const sa = raw.shippingAddress;
        addrObj = {
          fullName: sa.fullName || raw.customerName || '',
          phone: sa.phone || raw.customerPhone || '',
          addressLine1: sa.addressLine1 || sa.address || '',
          addressLine2: sa.addressLine2 || '',
          city: sa.city || '',
          state: sa.state || '',
          zipCode: sa.zipCode || '',
          country: sa.country || 'Nigeria',
          formattedAddress:
            sa.formattedAddress ||
            [sa.addressLine1 || sa.address, sa.addressLine2, sa.city, sa.state, sa.zipCode, sa.country]
              .filter(Boolean)
              .join(', ') ||
            'Address on file',
        };
      }

      const dateStr = raw.createdAt || raw.orderDate || raw.date || new Date().toISOString();

      setOrder({
        id: raw.orderId || raw.id || rawId,
        orderId: raw.orderId || raw.id || rawId,
        docId: raw.id || raw.orderId || rawId,
        status: (raw.status ?? 'processing') as OrderDetail['status'],
        paymentStatus: (raw.paymentStatus ?? 'pending') as OrderDetail['paymentStatus'],
        date: dateStr,
        items: cleanItems,
        subtotal: Number(raw.subtotal ?? raw.total ?? 0),
        shippingCost: Number(raw.shippingCost ?? raw.courier?.price ?? 0),
        tax: Number(raw.tax ?? 0),
        discount: Number(raw.discount ?? 0),
        total: Number(raw.total ?? 0),
        couponCode: raw.couponCode,
        shippingAddress: addrObj,
        trackingNumber: raw.trackingNumber,
        courierPlusWaybillNumber: raw.courierPlusWaybillNumber || raw.courierPlusTrackingId,
        courierPlusTrackingId: raw.courierPlusTrackingId,
        courierPlusStatus: raw.courierPlusStatus,
        courier: raw.courier,
        assignedDriverName: raw.assignedDriverName,
        acceptedAt: raw.acceptedAt,
        pickedUpAt: raw.pickedUpAt,
        deliveredAt: raw.deliveredAt,
      });
    } catch (err: any) {
      console.error('[OrderDetailPage] Fetch error:', err);
      setErrorMessage('Could not load order details. Please check your network connection.');
    } finally {
      setLoading(false);
    }
  }, [rawId]);

  useEffect(() => {
    fetchOrderDetail();
  }, [fetchOrderDetail]);

  // Handle Confirm Receipt / Escrow Release
  const handleConfirmComplete = async () => {
    if (!order) return;
    if (
      !confirm(
        'Are you sure you have received all items in good condition? Confirming completion will release the escrow funds to the vendor.'
      )
    ) {
      return;
    }

    setActionLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/orders/${encodeURIComponent(order.docId || order.orderId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: 'completed' }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setOrder(prev => (prev ? { ...prev, status: 'completed' } : prev));
        showToast('Order completed! Escrow funds released to vendor. 🎉');
      } else {
        alert(json.message || 'Failed to complete order. Please try again.');
      }
    } catch {
      alert('Network error while completing order.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Buy Again
  const handleBuyAgain = () => {
    if (!order || order.items.length === 0) {
      router.push('/shop');
      return;
    }

    order.items.forEach(item => {
      addItem({
        productId: item.productId,
        name: item.name,
        price: item.price,
        image: item.image,
        vendor: item.vendor,
        size: item.size || '',
        color: item.color || '',
        quantity: item.quantity || 1,
      });
    });

    showToast(`Added ${order.items.length} item(s) to bag! 🛍️`);
    setTimeout(() => {
      router.push('/cart');
    }, 900);
  };

  // Submit Review
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewModal.productId) return;
    const token = getAuthToken();
    if (!token) {
      router.push('/auth/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }

    setReviewModal(prev => ({ ...prev, loading: true }));
    try {
      const res = await fetch(`/api/products/${reviewModal.productId}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rating: reviewModal.rating,
          title: reviewModal.title || 'Verified Luxury Purchase',
          comment: reviewModal.comment,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setReviewModal({
          isOpen: false,
          productId: '',
          productName: '',
          rating: 5,
          title: '',
          comment: '',
          loading: false,
        });
        showToast('Review submitted successfully! Thank you for your feedback. ⭐');
      } else {
        alert(json.message || 'Failed to submit review.');
        setReviewModal(prev => ({ ...prev, loading: false }));
      }
    } catch {
      alert('Network error submitting review.');
      setReviewModal(prev => ({ ...prev, loading: false }));
    }
  };

  // Submit Support Ticket / Return Request
  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    const token = getAuthToken();
    if (!token) {
      router.push('/auth/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }

    setTicketModal(prev => ({ ...prev, loading: true }));
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderId: order.orderId,
          subject: ticketModal.subject || `Support request for Order #${order.orderId}`,
          message: ticketModal.message,
          category: ticketModal.category,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success && json.data?.ticket) {
        setTicketModal({ isOpen: false, subject: '', message: '', category: 'order', loading: false });
        showToast('Support ticket created! Opening concierge conversation... 🎫');
        setTimeout(() => {
          router.push(`/dashboard/tickets/${json.data.ticket.id}`);
        }, 1000);
      } else {
        alert(json.message || 'Failed to create support ticket.');
        setTicketModal(prev => ({ ...prev, loading: false }));
      }
    } catch {
      alert('Network error creating support ticket.');
      setTicketModal(prev => ({ ...prev, loading: false }));
    }
  };

  const statusConfig: Record<string, { bg: string; text: string; border: string; icon: string; label: string }> = {
    pending: {
      bg: 'bg-amber-950/40',
      text: 'text-amber-300',
      border: 'border-amber-800/40',
      icon: '⏳',
      label: 'Pending Payment',
    },
    processing: {
      bg: 'bg-blue-950/40',
      text: 'text-blue-300',
      border: 'border-blue-800/40',
      icon: '⚙️',
      label: 'Processing Order',
    },
    shipped: {
      bg: 'bg-purple-950/40',
      text: 'text-purple-300',
      border: 'border-purple-800/40',
      icon: '🚚',
      label: 'Shipped & In Transit',
    },
    delivered: {
      bg: 'bg-emerald-950/40',
      text: 'text-emerald-300',
      border: 'border-emerald-800/40',
      icon: '📦',
      label: 'Delivered',
    },
    completed: {
      bg: 'bg-gold-950/40',
      text: 'text-gold-300',
      border: 'border-gold-800/40',
      icon: '✨',
      label: 'Completed (Escrow Cleared)',
    },
    cancelled: {
      bg: 'bg-red-950/40',
      text: 'text-red-300',
      border: 'border-red-800/40',
      icon: '✕',
      label: 'Cancelled',
    },
    returned: {
      bg: 'bg-orange-950/40',
      text: 'text-orange-300',
      border: 'border-orange-800/40',
      icon: '🔄',
      label: 'Return in Progress',
    },
  };

  const currentStatus = order ? statusConfig[order.status] || {
    bg: 'bg-charcoal-800',
    text: 'text-cool-gray-300',
    border: 'border-charcoal-700',
    icon: '📦',
    label: order.status,
  } : null;

  const orderDateObj = order?.date ? new Date(order.date) : new Date();
  const validDate = isNaN(orderDateObj.getTime()) ? new Date() : orderDateObj;

  const orderSteps = [
    { key: 'placed', label: 'Order Confirmed', time: validDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
    { key: 'processing', label: 'Processing & Packaging', time: order?.status !== 'pending' ? 'Verified' : 'Pending' },
    {
      key: 'shipped',
      label: 'Dispatched with CourierPlus',
      time: order?.pickedUpAt ? new Date(order.pickedUpAt).toLocaleDateString() : order?.status === 'shipped' || order?.status === 'delivered' || order?.status === 'completed' ? 'In Transit' : null,
    },
    {
      key: 'delivered',
      label: 'Delivered to Destination',
      time: order?.deliveredAt ? new Date(order.deliveredAt).toLocaleDateString() : order?.status === 'delivered' || order?.status === 'completed' ? 'Delivered' : null,
    },
    {
      key: 'completed',
      label: 'Escrow Finalized & Complete',
      time: order?.status === 'completed' ? 'Escrow Released' : null,
    },
  ];

  const getStepState = (stepIndex: number) => {
    if (!order) return 'upcoming';
    if (order.status === 'cancelled') return 'cancelled';
    const statusIndices: Record<string, number> = {
      pending: 0,
      processing: 1,
      shipped: 2,
      delivered: 3,
      completed: 4,
    };
    const currentIdx = statusIndices[order.status] ?? 1;
    if (stepIndex < currentIdx) return 'completed';
    if (stepIndex === currentIdx) return 'active';
    return 'upcoming';
  };

  return (
    <div className="min-h-screen bg-charcoal-900 text-cool-gray-100 flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/orders"
            className="inline-flex items-center gap-2 text-cool-gray-400 hover:text-gold-400 font-semibold text-sm transition-colors cursor-pointer"
          >
            <span className="text-lg">←</span>
            <span>Back to All Orders</span>
          </Link>

          {order && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-charcoal-700 bg-charcoal-800 hover:bg-charcoal-750 text-cool-gray-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                <span>🖨️</span>
                <span>Print Receipt</span>
              </button>
              <Link
                href={`/track/${encodeURIComponent(order.orderId)}`}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gold-600 hover:bg-gold-500 text-white text-xs font-bold transition-all shadow-md shadow-gold-900/20 active:scale-95 cursor-pointer"
              >
                <span>🚚</span>
                <span>Live Courier Tracking</span>
              </Link>
            </div>
          )}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="bg-charcoal-800/80 border border-charcoal-700 rounded-2xl p-16 text-center shadow-xl">
            <div className="w-12 h-12 border-3 border-gold-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-1">Loading Order Details</h3>
            <p className="text-cool-gray-400 text-sm">Retrieving your luxury order information...</p>
          </div>
        )}

        {/* Error / Not Found state */}
        {!loading && (errorMessage || !order) && (
          <div className="bg-charcoal-800 border border-charcoal-700 rounded-2xl p-12 sm:p-16 text-center max-w-xl mx-auto shadow-2xl">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Order Not Found</h2>
            <p className="text-cool-gray-400 text-sm mb-8 leading-relaxed">
              {errorMessage || `We couldn't locate order reference "${rawId}". It may have been archived or belongs to another account.`}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/orders"
                className="px-6 py-3 bg-gold-600 hover:bg-gold-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-gold-900/30"
              >
                View My Orders
              </Link>
              <Link
                href="/shop"
                className="px-6 py-3 bg-charcoal-700 hover:bg-charcoal-600 text-cool-gray-200 rounded-xl font-semibold text-sm transition-colors border border-charcoal-600"
              >
                Browse Luxury Catalog
              </Link>
            </div>
          </div>
        )}

        {/* Main Order Content */}
        {!loading && order && currentStatus && (
          <div className="space-y-8 animate-fade-in">
            {/* Top Order Card */}
            <div className="bg-charcoal-800 border border-charcoal-700/80 rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-gold-500/5 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-charcoal-700/70">
                <div>
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                      Order #{order.orderId}
                    </h1>
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${currentStatus.bg} ${currentStatus.text} ${currentStatus.border}`}
                    >
                      <span>{currentStatus.icon}</span>
                      <span>{currentStatus.label}</span>
                    </span>
                  </div>
                  <p className="text-cool-gray-400 text-xs sm:text-sm">
                    Placed on{' '}
                    <strong className="text-cool-gray-200">
                      {validDate.toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </strong>{' '}
                    &bull; Escrow Protection Active
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {(order.status === 'shipped' || order.status === 'delivered') && (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={handleConfirmComplete}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-900/30 cursor-pointer disabled:opacity-50"
                    >
                      {actionLoading ? 'Processing...' : '✓ Confirm Receipt / Complete Order'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleBuyAgain}
                    className="px-4 py-2.5 bg-charcoal-700 hover:bg-charcoal-650 text-white rounded-xl text-sm font-semibold transition-colors border border-charcoal-600 cursor-pointer"
                  >
                    🛍️ Buy Again
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setTicketModal({
                        isOpen: true,
                        subject: `Assistance with Order #${order.orderId}`,
                        message: `Hello Concierge, I need assistance regarding my order #${order.orderId}.`,
                        category: 'order',
                        loading: false,
                      })
                    }
                    className="px-4 py-2.5 bg-charcoal-700/60 hover:bg-charcoal-700 text-gold-400 border border-gold-500/30 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                  >
                    💬 Concierge Help
                  </button>
                </div>
              </div>

              {/* CourierPlus Logistics Banner */}
              <div className="mt-6 bg-charcoal-900/80 border border-charcoal-700 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gold-500/10 border border-gold-500/30 flex items-center justify-center text-2xl shrink-0">
                    🚚
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm sm:text-base">
                        {order.courier?.name || 'CourierPlus Express Delivery'}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-950/60 text-blue-300 border border-blue-900/40">
                        Official Logistics
                      </span>
                    </div>
                    <p className="text-xs text-cool-gray-400 mt-0.5">
                      Carrier: <span className="text-cool-gray-300">{order.courier?.carrier || 'CourierPlus Nigeria'}</span> &bull; Estimated Delivery:{' '}
                      <span className="text-gold-400 font-semibold">{order.courier?.eta || '2–4 business days'}</span>
                    </p>
                    {order.courierPlusWaybillNumber && (
                      <p className="text-xs font-mono text-cool-gray-300 mt-1">
                        Waybill / Tracking: <span className="text-white font-bold select-all">{order.courierPlusWaybillNumber}</span>
                      </p>
                    )}
                  </div>
                </div>

                <Link
                  href={`/track/${encodeURIComponent(order.orderId)}`}
                  className="px-4 py-2.5 bg-charcoal-800 hover:bg-charcoal-700 border border-charcoal-600 text-white rounded-xl text-xs font-bold transition-colors text-center shrink-0 cursor-pointer"
                >
                  Inspect Live Tracking Map &rarr;
                </Link>
              </div>

              {/* Order Status Stepper */}
              {order.status !== 'cancelled' && (
                <div className="mt-8 pt-6 border-t border-charcoal-700/60">
                  <h4 className="text-xs font-bold text-cool-gray-400 uppercase tracking-wider mb-6">
                    Order Progression & Escrow Timeline
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 relative">
                    {orderSteps.map((step, idx) => {
                      const state = getStepState(idx);
                      const isDone = state === 'completed';
                      const isActive = state === 'active';
                      return (
                        <div key={step.key} className="flex sm:flex-col items-center sm:text-center gap-3 sm:gap-2">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-all ${
                              isDone
                                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
                                : isActive
                                ? 'bg-gold-500 text-charcoal-950 ring-4 ring-gold-500/20'
                                : 'bg-charcoal-700 text-cool-gray-500 border border-charcoal-600'
                            }`}
                          >
                            {isDone ? '✓' : idx + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p
                              className={`text-xs font-bold leading-tight ${
                                isDone ? 'text-cool-gray-200' : isActive ? 'text-gold-400' : 'text-cool-gray-500'
                              }`}
                            >
                              {step.label}
                            </p>
                            {step.time && (
                              <p className="text-[11px] text-cool-gray-500 mt-0.5">{step.time}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Layout Grid: Items vs Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Items */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-charcoal-800 border border-charcoal-700 rounded-2xl p-6 sm:p-8 shadow-xl">
                  <div className="flex items-center justify-between pb-4 border-b border-charcoal-700 mb-6">
                    <h3 className="text-lg font-black text-white tracking-tight">
                      Order Items ({order.items.length})
                    </h3>
                    <span className="text-xs text-cool-gray-400">Escrow Protected</span>
                  </div>

                  <div className="divide-y divide-charcoal-700/60">
                    {order.items.map(item => (
                      <div key={item.id} className="py-5 first:pt-0 last:pb-0 flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                        <div className="flex gap-4 items-center">
                          <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-charcoal-900 border border-charcoal-700 shrink-0">
                            <Image
                              src={item.image}
                              alt={item.name}
                              fill
                              className="object-cover"
                              sizes="80px"
                            />
                          </div>
                          <div>
                            <h4 className="font-bold text-white text-base leading-snug">{item.name}</h4>
                            <p className="text-xs text-cool-gray-400 mt-1">
                              Sold by: <span className="text-gold-400 font-semibold">{item.vendor}</span>
                            </p>
                            {(item.size || item.color) && (
                              <div className="flex gap-2 text-xs text-cool-gray-400 mt-1">
                                {item.size && <span className="bg-charcoal-700 px-2 py-0.5 rounded text-[11px]">Size: {item.size}</span>}
                                {item.color && <span className="bg-charcoal-700 px-2 py-0.5 rounded text-[11px]">Color: {item.color}</span>}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 border-t sm:border-t-0 pt-2 sm:pt-0 border-charcoal-750">
                          <div className="text-right">
                            <div className="text-white font-black text-base">{formatPrice(item.price * item.quantity)}</div>
                            <div className="text-cool-gray-400 text-xs">
                              {formatPrice(item.price)} &times; {item.quantity}
                            </div>
                          </div>

                          {(order.status === 'delivered' || order.status === 'completed') && (
                            <button
                              type="button"
                              onClick={() =>
                                setReviewModal({
                                  isOpen: true,
                                  productId: item.productId,
                                  productName: item.name,
                                  rating: 5,
                                  title: '',
                                  comment: '',
                                  loading: false,
                                })
                              }
                              className="text-xs text-gold-400 hover:text-gold-300 font-bold transition-colors cursor-pointer"
                            >
                              ⭐ Leave Review
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Delivery Address Card */}
                <div className="bg-charcoal-800 border border-charcoal-700 rounded-2xl p-6 shadow-xl">
                  <h4 className="text-xs font-bold text-cool-gray-400 uppercase tracking-wider mb-4">
                    Delivery Destination & Contact
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-cool-gray-400 text-xs mb-1">Recipient Name</p>
                      <p className="text-white font-bold">{order.shippingAddress.fullName || 'Valued Client'}</p>
                      <p className="text-cool-gray-300 text-xs mt-1">{order.shippingAddress.phone || 'Phone on file'}</p>
                    </div>
                    <div>
                      <p className="text-cool-gray-400 text-xs mb-1">Shipping Address</p>
                      <p className="text-white font-medium leading-relaxed">{order.shippingAddress.formattedAddress}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Financial Summary & Actions */}
              <div className="space-y-6">
                {/* Cost Breakdown */}
                <div className="bg-charcoal-800 border border-charcoal-700 rounded-2xl p-6 shadow-xl">
                  <h3 className="text-lg font-black text-white tracking-tight pb-4 border-b border-charcoal-700 mb-4">
                    Payment Breakdown
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between text-cool-gray-400">
                      <span>Items Subtotal</span>
                      <span className="text-white font-semibold">{formatPrice(order.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-cool-gray-400">
                      <span>Logistics & Shipping</span>
                      <span className="text-white font-semibold">
                        {order.shippingCost === 0 ? 'FREE' : formatPrice(order.shippingCost)}
                      </span>
                    </div>
                    {order.tax > 0 && (
                      <div className="flex justify-between text-cool-gray-400">
                        <span>Estimated Tax</span>
                        <span className="text-white font-semibold">{formatPrice(order.tax)}</span>
                      </div>
                    )}
                    {order.discount > 0 && (
                      <div className="flex justify-between text-emerald-400 font-semibold">
                        <span>Discount {order.couponCode ? `(${order.couponCode})` : ''}</span>
                        <span>-{formatPrice(order.discount)}</span>
                      </div>
                    )}

                    <div className="pt-3 border-t border-charcoal-700 flex justify-between items-baseline">
                      <span className="text-base font-bold text-white">Grand Total</span>
                      <span className="text-2xl font-black text-gold-400">{formatPrice(order.total)}</span>
                    </div>

                    <div className="pt-2 text-[11px] text-cool-gray-500 leading-relaxed">
                      Payment processed securely via Flutterwave. Protected by the Certified Luxury World Escrow Guarantee.
                    </div>
                  </div>
                </div>

                {/* Return / Refund Guidance */}
                <div className="bg-charcoal-800 border border-charcoal-700 rounded-2xl p-6 shadow-xl">
                  <h4 className="text-sm font-bold text-white mb-2">Need to Return an Item?</h4>
                  <p className="text-xs text-cool-gray-400 leading-relaxed mb-4">
                    Certified Luxury World offers dedicated buyer protection. If your item does not match its luxury certification or arrives damaged, you can request an escrow refund within 36 hours of delivery.
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setTicketModal({
                        isOpen: true,
                        subject: `Return Request for Order #${order.orderId}`,
                        message: `I would like to request an inspection/return for Order #${order.orderId} under the Certified Luxury World Escrow Policy.`,
                        category: 'return',
                        loading: false,
                      })
                    }
                    className="w-full py-2.5 bg-charcoal-700 hover:bg-charcoal-650 text-cool-gray-300 hover:text-white rounded-xl text-xs font-bold transition-colors border border-charcoal-600 cursor-pointer"
                  >
                    Request Return / Dispute Escrow
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Review Modal */}
      {reviewModal.isOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
          <div className="bg-charcoal-800 border border-charcoal-700 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between mb-4 border-b border-charcoal-700 pb-3">
              <h3 className="text-lg font-black text-white">Write Product Review</h3>
              <button
                type="button"
                onClick={() => setReviewModal(prev => ({ ...prev, isOpen: false }))}
                className="text-cool-gray-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              <p className="text-xs text-gold-400 font-semibold">{reviewModal.productName}</p>

              <div>
                <label className="text-xs font-bold text-cool-gray-300 block mb-1">Rating</label>
                <div className="flex gap-2 text-2xl">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setReviewModal(prev => ({ ...prev, rating: star }))}
                      className="cursor-pointer transition-transform hover:scale-110"
                    >
                      {star <= reviewModal.rating ? '⭐' : '☆'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-cool-gray-300 block mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Exquisite quality, exactly as described"
                  value={reviewModal.title}
                  onChange={e => setReviewModal(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-charcoal-700 border border-charcoal-600 text-white rounded-xl text-sm outline-none focus:ring-2 focus:ring-gold-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-cool-gray-300 block mb-1">Your Review</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Share details of your experience..."
                  value={reviewModal.comment}
                  onChange={e => setReviewModal(prev => ({ ...prev, comment: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-charcoal-700 border border-charcoal-600 text-white rounded-xl text-sm outline-none focus:ring-2 focus:ring-gold-500 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewModal(prev => ({ ...prev, isOpen: false }))}
                  className="w-1/2 py-2.5 bg-charcoal-700 text-cool-gray-300 rounded-xl font-bold text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewModal.loading}
                  className="w-1/2 py-2.5 bg-gold-600 hover:bg-gold-500 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                >
                  {reviewModal.loading ? 'Submitting...' : 'Post Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Concierge Support Modal */}
      {ticketModal.isOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
          <div className="bg-charcoal-800 border border-charcoal-700 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between mb-4 border-b border-charcoal-700 pb-3">
              <h3 className="text-lg font-black text-white">Client Concierge Support</h3>
              <button
                type="button"
                onClick={() => setTicketModal(prev => ({ ...prev, isOpen: false }))}
                className="text-cool-gray-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitTicket} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-cool-gray-300 block mb-1">Subject</label>
                <input
                  type="text"
                  required
                  value={ticketModal.subject}
                  onChange={e => setTicketModal(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-charcoal-700 border border-charcoal-600 text-white rounded-xl text-sm outline-none focus:ring-2 focus:ring-gold-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-cool-gray-300 block mb-1">Message</label>
                <textarea
                  required
                  rows={4}
                  value={ticketModal.message}
                  onChange={e => setTicketModal(prev => ({ ...prev, message: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-charcoal-700 border border-charcoal-600 text-white rounded-xl text-sm outline-none focus:ring-2 focus:ring-gold-500 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setTicketModal(prev => ({ ...prev, isOpen: false }))}
                  className="w-1/2 py-2.5 bg-charcoal-700 text-cool-gray-300 rounded-xl font-bold text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={ticketModal.loading}
                  className="w-1/2 py-2.5 bg-gold-600 hover:bg-gold-500 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                >
                  {ticketModal.loading ? 'Sending...' : 'Open Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[110] bg-charcoal-800/95 text-white border border-gold-500/40 px-6 py-3 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-2 text-sm font-bold animate-fade-in pointer-events-none">
          <span>✨</span>
          <span>{toastMessage}</span>
        </div>
      )}

      <Footer />
    </div>
  );
}
