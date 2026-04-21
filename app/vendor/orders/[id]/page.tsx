'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Header from '../../../../components/common/Header';
import Footer from '../../../../components/common/Footer';

import { getAuthToken } from '@/lib/api/auth';

interface OrderItem {
  id: string;
  name: string;
  image: string;
  size: string;
  color: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  orderNumber: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  trackingNumber?: string;
  shippingAddress: {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  createdAt: string;
  statusHistory: {
    status: string;
    timestamp: string;
    note?: string;
  }[];
}

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<'processing' | 'shipped' | 'delivered' | 'cancelled' | null>(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const token = getAuthToken();
    if (!token || !orderId) return;
    fetch(`/api/vendor/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(json => {
        if (!json.success) return;
        const o = json.data.order;
        setOrder({
          ...o,
          shipping: o.shippingCost ?? 0,
          statusHistory: o.statusHistory ?? [],
        });
        setTrackingNumber(o.trackingNumber ?? '');
      })
      .catch(() => {});
  }, [orderId]);

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
      month: 'long', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAvailableStatusUpdates = (currentStatus: string) => {
    switch (currentStatus) {
      case 'pending':
        return [
          { value: 'processing', label: 'Mark as Processing', color: 'blue' },
          { value: 'cancelled', label: 'Cancel Order', color: 'red' }
        ];
      case 'processing':
        return [
          { value: 'shipped', label: 'Mark as Shipped', color: 'purple' },
          { value: 'cancelled', label: 'Cancel Order', color: 'red' }
        ];
      case 'shipped':
        return [
          { value: 'delivered', label: 'Mark as Delivered', color: 'green' }
        ];
      default:
        return [];
    }
  };

  const handleUpdateStatus = async () => {
    if (!newStatus || !order) return;

    if (newStatus === 'shipped' && !trackingNumber.trim()) {
      alert('Please enter a tracking number');
      return;
    }
    if (newStatus === 'cancelled' && !cancelReason.trim()) {
      alert('Please provide a cancellation reason');
      return;
    }

    setIsUpdating(true);
    try {
      const token = getAuthToken();
      const res  = await fetch(`/api/vendor/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus, trackingNumber, cancelReason }),
      });
      const json = await res.json();
      if (json.success) {
        setOrder(prev => prev ? {
          ...prev,
          status: newStatus,
          trackingNumber: newStatus === 'shipped' ? trackingNumber : prev.trackingNumber,
          statusHistory: [
            ...prev.statusHistory,
            {
              status: newStatus.charAt(0).toUpperCase() + newStatus.slice(1),
              timestamp: new Date().toISOString(),
              note: newStatus === 'cancelled' ? cancelReason : newStatus === 'shipped' ? `Tracking: ${trackingNumber}` : undefined,
            },
          ],
        } : prev);
        setShowStatusModal(false);
        setNewStatus(null);
        setTrackingNumber('');
        setCancelReason('');
      } else {
        alert(json.message || 'Failed to update order status');
      }
    } catch {
      alert('Network error — please try again');
    } finally {
      setIsUpdating(false);
    }
  };

  const openStatusModal = (status: 'processing' | 'shipped' | 'delivered' | 'cancelled') => {
    setNewStatus(status);
    setShowStatusModal(true);
  };

  const handlePrintLabel = () => {
    console.log('Printing shipping label...');
    alert('Shipping label would be generated and printed here');
  };

  const handleMessageCustomer = () => {
    if (order) {
      window.location.href = `mailto:${order.customer.email}?subject=Regarding Order ${order.orderNumber}`;
    }
  };

  if (!order) {
    return <div>Loading...</div>;
  }

  const availableUpdates = getAvailableStatusUpdates(order.status);
  const canUpdateStatus = availableUpdates.length > 0;

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      <Header />

      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-charcoal-600 dark:text-cool-gray-400 mb-4">
          <Link href="/vendor/dashboard" className="hover:text-gold-600">Dashboard</Link>
          <span>/</span>
          <Link href="/vendor/orders" className="hover:text-gold-600">Orders</Link>
          <span>/</span>
          <span>{order.orderNumber}</span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-charcoal-900 dark:text-white mb-2">
              Order {order.orderNumber}
            </h1>
            <p className="text-charcoal-600 dark:text-cool-gray-400">
              Placed on {formatDate(order.createdAt)}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handlePrintLabel}
              className="px-4 py-2 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 transition-colors flex items-center gap-2"
            >
              <span>🖨️</span>
              Print Label
            </button>
            <button
              onClick={handleMessageCustomer}
              className="px-4 py-2 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 transition-colors flex items-center gap-2"
            >
              <span>💬</span>
              Message Customer
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Status */}
            <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-charcoal-900 dark:text-white">Order Status</h2>
                <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusBadge(order.status)}`}>
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
              </div>

              {canUpdateStatus && (
                <div className="flex flex-wrap gap-2">
                  {availableUpdates.map((update) => (
                    <button
                      key={update.value}
                      onClick={() => openStatusModal(update.value as 'processing' | 'shipped' | 'delivered' | 'cancelled')}
                      className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                        update.color === 'blue' ? 'bg-blue-600 hover:bg-blue-700 text-white' :
                        update.color === 'purple' ? 'bg-purple-600 hover:bg-purple-700 text-white' :
                        update.color === 'green' ? 'bg-green-600 hover:bg-green-700 text-white' :
                        update.color === 'red' ? 'bg-red-600 hover:bg-red-700 text-white' : ''
                      }`}
                    >
                      {update.label}
                    </button>
                  ))}
                </div>
              )}

              {order.trackingNumber && (
                <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                  <p className="text-sm text-charcoal-600 dark:text-cool-gray-400 mb-1">Tracking Number</p>
                  <p className="font-mono font-bold text-purple-700 dark:text-purple-400">{order.trackingNumber}</p>
                </div>
              )}
            </div>

            {/* Order Items */}
            <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg p-6">
              <h2 className="text-xl font-bold text-charcoal-900 dark:text-white mb-4">Order Items</h2>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 pb-4 border-b border-cool-gray-200 dark:border-charcoal-700 last:border-0">
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden shrink-0">
                      <Image src={item.image} alt={item.name} fill className="object-cover" />
                    </div>
                    <div className="grow">
                      <p className="text-sm text-charcoal-600 dark:text-cool-gray-400">
                        Size: {item.size} • Color: {item.color}
                      </p>
                      <p className="text-sm text-charcoal-600 dark:text-cool-gray-400">
                        Quantity: {item.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-charcoal-900 dark:text-white">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                      <p className="text-sm text-charcoal-600 dark:text-cool-gray-400">
                        ${item.price.toFixed(2)} each
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Summary */}
              <div className="mt-6 pt-6 border-t border-cool-gray-200 dark:border-charcoal-700">
                <div className="space-y-2">
                  <div className="flex justify-between text-charcoal-700 dark:text-cool-gray-300">
                    <span>Subtotal</span>
                    <span>${order.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-charcoal-700 dark:text-cool-gray-300">
                    <span>Shipping</span>
                    <span>${order.shipping.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-charcoal-700 dark:text-cool-gray-300">
                    <span>Tax</span>
                    <span>${order.tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xl font-bold text-charcoal-900 dark:text-white pt-2 border-t border-cool-gray-200 dark:border-charcoal-700">
                    <span>Total</span>
                    <span>${order.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Timeline */}
            <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg p-6">
              <h2 className="text-xl font-bold text-charcoal-900 dark:text-white mb-4">Order Timeline</h2>
              <div className="space-y-4">
                {order.statusHistory.map((event, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full bg-gold-600 shrink-0"></div>
                      {index < order.statusHistory.length - 1 && (
                        <div className="w-0.5 h-full bg-cool-gray-300 dark:bg-charcoal-700 my-1"></div>
                      )}
                    </div>
                    <div className="grow pb-4">
                      <p className="font-semibold text-charcoal-900 dark:text-white">{event.status}</p>
                      <p className="text-sm text-charcoal-600 dark:text-cool-gray-400">
                        {formatDate(event.timestamp)}
                      </p>
                      {event.note && (
                        <p className="text-sm text-charcoal-600 dark:text-cool-gray-400 mt-1">
                          {event.note}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Customer Information */}
            <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg p-6">
              <h2 className="text-xl font-bold text-charcoal-900 dark:text-white mb-4">Customer</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-charcoal-600 dark:text-cool-gray-400 mb-1">Name</p>
                  <p className="font-semibold text-charcoal-900 dark:text-white">{order.customer.name}</p>
                </div>
                <div>
                  <p className="text-xs text-charcoal-600 dark:text-cool-gray-400 mb-1">Email</p>
                  <a href={`mailto:${order.customer.email}`} className="text-gold-600 hover:underline text-sm">
                    {order.customer.email}
                  </a>
                </div>
                <div>
                  <p className="text-xs text-charcoal-600 dark:text-cool-gray-400 mb-1">Phone</p>
                  <a href={`tel:${order.customer.phone}`} className="text-gold-600 hover:underline text-sm">
                    {order.customer.phone}
                  </a>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg p-6">
              <h2 className="text-xl font-bold text-charcoal-900 dark:text-white mb-4">Shipping Address</h2>
              <div className="text-sm text-charcoal-700 dark:text-cool-gray-300 space-y-1">
                <p className="font-semibold">{order.shippingAddress.fullName}</p>
                <p>{order.shippingAddress.addressLine1}</p>
                {order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
                <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}</p>
                <p>{order.shippingAddress.country}</p>
                <p className="pt-2">{order.shippingAddress.phone}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Update Modal */}
      {showStatusModal && newStatus && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-charcoal-800 rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-charcoal-900 dark:text-white mb-4">
              Update Order Status
            </h2>
            
            <p className="text-charcoal-600 dark:text-cool-gray-400 mb-6">
              Change order status to: <span className="font-semibold">{newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}</span>
            </p>

            {newStatus === 'shipped' && (
              <div className="mb-6">
                <label className="block text-sm font-semibold text-charcoal-700 dark:text-cool-gray-300 mb-2">
                  Tracking Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Enter tracking number"
                  className="w-full px-4 py-3 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-white"
                />
                <p className="text-xs text-charcoal-600 dark:text-cool-gray-500 mt-1">
                  Customer will receive this tracking number via email
                </p>
              </div>
            )}

            {newStatus === 'cancelled' && (
              <div className="mb-6">
                <label className="block text-sm font-semibold text-charcoal-700 dark:text-cool-gray-300 mb-2">
                  Cancellation Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Explain why this order is being cancelled"
                  rows={4}
                  className="w-full px-4 py-3 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-white"
                />
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowStatusModal(false);
                  setNewStatus(null);
                  setTrackingNumber('');
                  setCancelReason('');
                }}
                disabled={isUpdating}
                className="flex-1 px-4 py-3 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateStatus}
                disabled={isUpdating}
                className={`flex-1 px-4 py-3 rounded-lg transition-colors disabled:opacity-50 font-semibold text-white ${
                  newStatus === 'cancelled' ? 'bg-red-600 hover:bg-red-700' : 'bg-gold-600 hover:bg-gold-700'
                }`}
              >
                {isUpdating ? 'Updating...' : 'Confirm Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
