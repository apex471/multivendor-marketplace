'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  vendor: string;
}

interface Order {
  id: string;
  status: 'processing' | 'shipped' | 'delivered' | 'cancelled';
  date: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  shippingAddress: {
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    phone: string;
  };
  trackingNumber?: string;
  estimatedDelivery?: string;
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  // Mock order data - replace with API call
  const order: Order = {
    id: orderId,
    status: 'shipped',
    date: new Date().toISOString(),
    items: [
      {
        id: '1',
        name: 'Designer Leather Jacket',
        price: 299.99,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400',
        vendor: 'Luxury Fashion Co.',
      },
      {
        id: '2',
        name: 'Premium Sneakers',
        price: 149.99,
        quantity: 2,
        image: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400',
        vendor: 'Urban Footwear',
      },
    ],
    subtotal: 599.97,
    shipping: 15.00,
    tax: 47.99,
    total: 662.96,
    shippingAddress: {
      name: 'John Doe',
      address: '123 Main Street, Apt 4B',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      phone: '+1 (555) 123-4567',
    },
    trackingNumber: 'TRK-' + Date.now(),
    estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }),
  };

  const statusConfig = {
    processing: { color: 'bg-yellow-100 text-yellow-800', icon: '⏳', label: 'Processing' },
    shipped: { color: 'bg-blue-100 text-blue-800', icon: '🚚', label: 'Shipped' },
    delivered: { color: 'bg-green-100 text-green-800', icon: '✓', label: 'Delivered' },
    cancelled: { color: 'bg-red-100 text-red-800', icon: '✕', label: 'Cancelled' },
  };

  const currentStatus = statusConfig[order.status];

  const orderSteps = [
    { status: 'processing', label: 'Order Placed', date: new Date(order.date).toLocaleDateString() },
    { status: 'processing', label: 'Processing', date: new Date(order.date).toLocaleDateString() },
    { status: 'shipped', label: 'Shipped', date: order.status === 'shipped' || order.status === 'delivered' ? new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toLocaleDateString() : '' },
    { status: 'delivered', label: 'Delivered', date: order.status === 'delivered' ? new Date().toLocaleDateString() : '' },
  ];

  const getStepStatus = (stepStatus: string) => {
    const statusOrder = ['processing', 'shipped', 'delivered'];
    const currentIndex = statusOrder.indexOf(order.status);
    const stepIndex = statusOrder.indexOf(stepStatus);
    
    if (order.status === 'cancelled') return 'cancelled';
    if (stepIndex <= currentIndex) return 'completed';
    return 'pending';
  };

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      <Header />

      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-charcoal-600 hover:text-gold-600 mb-6"
        >
          <span>←</span>
          <span>Back to Orders</span>
        </button>

        {/* Order Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl font-bold text-charcoal-900 mb-2">Order #{order.id}</h1>
              <p className="text-sm text-charcoal-600">
                Placed on {new Date(order.date).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
            <div>
              <span className={`px-4 py-2 rounded-full text-sm font-semibold ${currentStatus.color}`}>
                {currentStatus.icon} {currentStatus.label}
              </span>
            </div>
          </div>

          {order.trackingNumber && order.status !== 'cancelled' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-blue-600 text-xl">📦</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 mb-1">Tracking Number</p>
                  <p className="text-sm text-blue-700 font-mono">{order.trackingNumber}</p>
                  {order.estimatedDelivery && (
                    <p className="text-xs text-blue-600 mt-2">
                      Estimated delivery: {order.estimatedDelivery}
                    </p>
                  )}
                </div>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
                  Track Package
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Order Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Timeline */}
            {order.status !== 'cancelled' && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-charcoal-900 mb-6">Order Status</h2>
                <div className="space-y-4">
                  {orderSteps.map((step, index) => {
                    const stepStatus = getStepStatus(step.status);
                    return (
                      <div key={index} className="flex items-start gap-4">
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                              stepStatus === 'completed'
                                ? 'bg-gold-600 text-white'
                                : stepStatus === 'cancelled'
                                ? 'bg-red-600 text-white'
                                : 'bg-gray-200 text-gray-500'
                            }`}
                          >
                            {stepStatus === 'completed' ? '✓' : index + 1}
                          </div>
                          {index < orderSteps.length - 1 && (
                            <div
                              className={`w-0.5 h-12 ${
                                stepStatus === 'completed' ? 'bg-gold-600' : 'bg-gray-200'
                              }`}
                            />
                          )}
                        </div>
                        <div className="flex-1 pb-8">
                          <p
                            className={`font-semibold ${
                              stepStatus === 'completed'
                                ? 'text-charcoal-900'
                                : 'text-gray-500'
                            }`}
                          >
                            {step.label}
                          </p>
                          {step.date && (
                            <p className="text-sm text-charcoal-600 mt-1">{step.date}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Order Items */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-charcoal-900 mb-6">Order Items</h2>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex gap-4 pb-4 border-b last:border-b-0 last:pb-0">
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-charcoal-900 mb-1">{item.name}</h3>
                      <p className="text-sm text-charcoal-600 mb-1">{item.vendor}</p>
                      <p className="text-sm text-charcoal-600">Quantity: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-charcoal-900">${(item.price * item.quantity).toFixed(2)}</p>
                      <p className="text-sm text-charcoal-600">${item.price.toFixed(2)} each</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t">
                <Link
                  href={`/vendor/${order.items[0].id}`}
                  className="text-gold-600 hover:text-gold-700 font-medium text-sm"
                >
                  View Vendor Profile →
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column - Summary & Actions */}
          <div className="lg:col-span-1 space-y-6">
            {/* Order Summary */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold text-charcoal-900 mb-4">Order Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-charcoal-600">Subtotal</span>
                  <span className="font-medium text-charcoal-900">${order.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-charcoal-600">Shipping</span>
                  <span className="font-medium text-charcoal-900">${order.shipping.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-charcoal-600">Tax</span>
                  <span className="font-medium text-charcoal-900">${order.tax.toFixed(2)}</span>
                </div>
              </div>
              <div className="border-t mt-4 pt-4">
                <div className="flex justify-between">
                  <span className="text-lg font-bold text-charcoal-900">Total</span>
                  <span className="text-lg font-bold text-gold-600">${order.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold text-charcoal-900 mb-4">Shipping Address</h3>
              <div className="text-sm text-charcoal-600 space-y-1">
                <p className="font-medium text-charcoal-900">{order.shippingAddress.name}</p>
                <p>{order.shippingAddress.address}</p>
                <p>
                  {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
                </p>
                <p>{order.shippingAddress.phone}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold text-charcoal-900 mb-4">Need Help?</h3>
              <div className="space-y-3">
                <Link
                  href="/contact"
                  className="block w-full px-4 py-3 bg-gray-100 text-charcoal-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors text-center"
                >
                  Contact Support
                </Link>
                {order.status === 'processing' && (
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to cancel this order?')) {
                        console.log('Cancel order:', order.id);
                        alert('Order cancellation requested');
                      }
                    }}
                    className="block w-full px-4 py-3 border-2 border-red-300 text-red-600 rounded-lg font-semibold hover:bg-red-50 transition-colors text-center"
                  >
                    Cancel Order
                  </button>
                )}
                {order.status === 'delivered' && (
                  <button
                    onClick={() => {
                      console.log('Return order:', order.id);
                      alert('Return process initiated');
                    }}
                    className="block w-full px-4 py-3 border-2 border-gray-300 text-charcoal-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors text-center"
                  >
                    Return Items
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
