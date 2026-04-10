'use client';

import { useState } from 'react';
import Link from 'next/link';

interface CourierInfo {
  id: string;
  name: string;
  icon: string;
  price: number;
  eta: string;
  carrier: string;
  tracking: string;
}

interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  vendorName: string;
  products: string[];
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  paymentStatus: 'paid' | 'pending' | 'failed' | 'refunded';
  orderDate: string;
  trackingNumber?: string;
  shippingAddress: string;
  courier: CourierInfo;
}

export default function OrderManagementPage() {
  const [statusFilter, setStatusFilter] = useState<'all' | Order['status']>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | Order['paymentStatus']>('all');
  const [courierFilter, setCourierFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showModal, setShowModal] = useState(false);

  const [orders, setOrders] = useState<Order[]>([
    {
      id: 'ORD-2024-1001',
      customerName: 'John Doe',
      customerEmail: 'john@example.com',
      vendorName: 'Luxury Fashion Co.',
      products: ['Designer Jacket', 'Premium Sneakers'],
      total: 549.99,
      status: 'pending',
      paymentStatus: 'paid',
      orderDate: '2024-12-15T10:30:00',
      shippingAddress: '123 Main St, New York, NY 10001',
      courier: { id: 'quickbox', name: 'QuickBox Express', icon: '🚀', price: 12.99, eta: 'Apr 14–15', carrier: 'QuickBox Courier', tracking: 'realtime' },
    },
    {
      id: 'ORD-2024-1002',
      customerName: 'Jane Smith',
      customerEmail: 'jane@example.com',
      vendorName: 'Elite Wear',
      products: ['Silk Dress', 'Leather Handbag'],
      total: 899.00,
      status: 'processing',
      paymentStatus: 'paid',
      orderDate: '2024-12-14T15:45:00',
      trackingNumber: 'TRK123456789',
      shippingAddress: '456 Oak Ave, Los Angeles, CA 90001',
      courier: { id: 'swiftship', name: 'SwiftShip Standard', icon: '📦', price: 5.99, eta: 'Apr 17–21', carrier: 'SwiftShip Express', tracking: 'standard' },
    },
    {
      id: 'ORD-2024-1003',
      customerName: 'Mike Johnson',
      customerEmail: 'mike@example.com',
      vendorName: 'Gucci Official',
      products: ['Gucci Loafers'],
      total: 1200.00,
      status: 'shipped',
      paymentStatus: 'paid',
      orderDate: '2024-12-13T09:20:00',
      trackingNumber: 'TRK987654321',
      shippingAddress: '789 Pine Rd, Chicago, IL 60601',
      courier: { id: 'flashrun', name: 'FlashRunner Next Day', icon: '⚡', price: 24.99, eta: 'Apr 11', carrier: 'FlashRunner Logistics', tracking: 'realtime' },
    },
    {
      id: 'ORD-2024-1004',
      customerName: 'Sarah Williams',
      customerEmail: 'sarah@example.com',
      vendorName: 'Luxury Fashion Co.',
      products: ['Winter Coat', 'Cashmere Scarf'],
      total: 1450.00,
      status: 'delivered',
      paymentStatus: 'paid',
      orderDate: '2024-12-10T11:15:00',
      trackingNumber: 'TRK555666777',
      shippingAddress: '321 Elm St, Boston, MA 02101',
      courier: { id: 'ecopost', name: 'EcoPost Free', icon: '🌿', price: 0, eta: 'Apr 28 – May 8', carrier: 'EcoPost Logistics', tracking: 'basic' },
    },
    {
      id: 'ORD-2024-1005',
      customerName: 'Tom Brown',
      customerEmail: 'tom@example.com',
      vendorName: 'Elite Wear',
      products: ['Sports Watch'],
      total: 299.99,
      status: 'cancelled',
      paymentStatus: 'refunded',
      orderDate: '2024-12-12T14:00:00',
      shippingAddress: '555 Maple Dr, Miami, FL 33101',
      courier: { id: 'ecopost', name: 'EcoPost Free', icon: '🌿', price: 0, eta: 'Apr 28 – May 8', carrier: 'EcoPost Logistics', tracking: 'basic' },
    },
    {
      id: 'ORD-2024-1006',
      customerName: 'Emily Davis',
      customerEmail: 'emily@example.com',
      vendorName: 'Gucci Official',
      products: ['Designer Belt', 'Sunglasses'],
      total: 850.00,
      status: 'processing',
      paymentStatus: 'paid',
      orderDate: '2024-12-16T08:30:00',
      shippingAddress: '777 Birch Ln, Seattle, WA 98101',
      courier: { id: 'quickbox', name: 'QuickBox Express', icon: '🚀', price: 12.99, eta: 'Apr 14–15', carrier: 'QuickBox Courier', tracking: 'realtime' },
    },
  ]);

  const filteredOrders = orders.filter(order => {
    const matchesStatus  = statusFilter === 'all'  || order.status === statusFilter;
    const matchesPayment = paymentFilter === 'all' || order.paymentStatus === paymentFilter;
    const matchesCourier = courierFilter === 'all' || order.courier?.id === courierFilter;
    const matchesSearch  = order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           order.vendorName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesPayment && matchesCourier && matchesSearch;
  });

  const handleUpdateStatus = (orderId: string, newStatus: Order['status']) => {
    setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    if (selectedOrder?.id === orderId) {
      setSelectedOrder({ ...selectedOrder, status: newStatus });
    }
    alert(`Order ${orderId} status updated to ${newStatus}`);
  };

  const handleUpdateTracking = (orderId: string, trackingNumber: string) => {
    setOrders(orders.map(o => o.id === orderId ? { ...o, trackingNumber } : o));
    if (selectedOrder?.id === orderId) {
      setSelectedOrder({ ...selectedOrder, trackingNumber });
    }
    alert(`Tracking number updated for order ${orderId}`);
  };

  const handleRefund = (orderId: string) => {
    if (confirm('Are you sure you want to process a refund for this order?')) {
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: 'refunded', paymentStatus: 'refunded' } : o));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: 'refunded', paymentStatus: 'refunded' });
      }
      alert(`Refund processed for order ${orderId}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'processing': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'shipped': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'delivered': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'refunded': return 'bg-gray-100 text-gray-800 dark:bg-charcoal-700 dark:text-cool-gray-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-charcoal-700 dark:text-cool-gray-400';
    }
  };

  const getPaymentColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'refunded': return 'bg-gray-100 text-gray-800 dark:bg-charcoal-700 dark:text-cool-gray-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-charcoal-700 dark:text-cool-gray-400';
    }
  };

  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const processingOrders = orders.filter(o => o.status === 'processing').length;
  const shippedOrders = orders.filter(o => o.status === 'shipped').length;
  const deliveredOrders = orders.filter(o => o.status === 'delivered').length;
  const totalRevenue = orders.reduce((sum, o) => o.paymentStatus === 'paid' ? sum + o.total : sum, 0);

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      {/* Header */}
      <header className="bg-white dark:bg-charcoal-800 border-b border-cool-gray-300 dark:border-charcoal-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/admin/dashboard" className="text-gold-600 hover:text-gold-700">
                ← Back
              </Link>
              <div>
                <h1 className="text-xl font-bold text-charcoal-900 dark:text-white">Order Management</h1>
                <p className="text-xs text-charcoal-600 dark:text-cool-gray-400">Manage all platform orders</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-xl p-4">
            <div className="text-3xl mb-2">📦</div>
            <div className="text-2xl font-bold text-charcoal-900 dark:text-white">{totalOrders}</div>
            <div className="text-xs text-charcoal-600 dark:text-cool-gray-400">Total Orders</div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
            <div className="text-3xl mb-2">⏳</div>
            <div className="text-2xl font-bold text-yellow-900 dark:text-yellow-400">{pendingOrders}</div>
            <div className="text-xs text-yellow-800 dark:text-yellow-500">Pending</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <div className="text-3xl mb-2">⚙️</div>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-400">{processingOrders}</div>
            <div className="text-xs text-blue-800 dark:text-blue-500">Processing</div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
            <div className="text-3xl mb-2">🚚</div>
            <div className="text-2xl font-bold text-purple-900 dark:text-purple-400">{shippedOrders}</div>
            <div className="text-xs text-purple-800 dark:text-purple-500">Shipped</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
            <div className="text-3xl mb-2">✅</div>
            <div className="text-2xl font-bold text-green-900 dark:text-green-400">{deliveredOrders}</div>
            <div className="text-xs text-green-800 dark:text-green-500">Delivered</div>
          </div>
          <div className="bg-linear-to-br from-gold-400 to-gold-600 rounded-xl p-4 text-white">
            <div className="text-3xl mb-2">💰</div>
            <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
            <div className="text-xs opacity-90">Total Revenue</div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-xl p-6 mb-6">
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-charcoal-900 dark:text-white mb-2">Search Orders</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Order ID, customer, vendor..."
                className="w-full px-4 py-2 bg-white dark:bg-charcoal-700 border border-cool-gray-300 dark:border-charcoal-600 text-charcoal-900 dark:text-white rounded-lg focus:ring-2 focus:ring-gold-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-charcoal-900 dark:text-white mb-2">Filter by Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as Order['status'] | 'all')}
                className="w-full px-4 py-2 bg-white dark:bg-charcoal-700 border border-cool-gray-300 dark:border-charcoal-600 text-charcoal-900 dark:text-white rounded-lg focus:ring-2 focus:ring-gold-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-charcoal-900 dark:text-white mb-2">Filter by Payment</label>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value as Order['paymentStatus'] | 'all')}
                className="w-full px-4 py-2 bg-white dark:bg-charcoal-700 border border-cool-gray-300 dark:border-charcoal-600 text-charcoal-900 dark:text-white rounded-lg focus:ring-2 focus:ring-gold-500"
              >
                <option value="all">All Payments</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-charcoal-900 dark:text-white mb-2">Filter by Courier</label>
              <select
                value={courierFilter}
                onChange={(e) => setCourierFilter(e.target.value)}
                className="w-full px-4 py-2 bg-white dark:bg-charcoal-700 border border-cool-gray-300 dark:border-charcoal-600 text-charcoal-900 dark:text-white rounded-lg focus:ring-2 focus:ring-gold-500"
              >
                <option value="all">All Couriers</option>
                <option value="ecopost">🌿 EcoPost Free</option>
                <option value="swiftship">📦 SwiftShip Standard</option>
                <option value="quickbox">🚀 QuickBox Express</option>
                <option value="flashrun">⚡ FlashRunner Next Day</option>
                <option value="zerowait">🏠️ ZeroWait Same Day</option>
              </select>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-cool-gray-50 dark:bg-charcoal-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-charcoal-600 dark:text-cool-gray-400 uppercase">Order ID</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-charcoal-600 dark:text-cool-gray-400 uppercase">Customer</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-charcoal-600 dark:text-cool-gray-400 uppercase">Vendor</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-charcoal-600 dark:text-cool-gray-400 uppercase">Courier</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-charcoal-600 dark:text-cool-gray-400 uppercase">Total</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-charcoal-600 dark:text-cool-gray-400 uppercase">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-charcoal-600 dark:text-cool-gray-400 uppercase">Payment</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-charcoal-600 dark:text-cool-gray-400 uppercase">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-charcoal-600 dark:text-cool-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cool-gray-200 dark:divide-charcoal-700">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-charcoal-900 dark:text-white">{order.id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-charcoal-900 dark:text-white">{order.customerName}</div>
                      <div className="text-xs text-charcoal-600 dark:text-cool-gray-400">{order.customerEmail}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-charcoal-700 dark:text-cool-gray-300">{order.vendorName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-lg select-none">{order.courier?.icon ?? '📦'}</span>
                        <div>
                          <div className="text-sm font-medium text-charcoal-900 dark:text-white leading-tight">
                            {order.courier?.name ?? '—'}
                          </div>
                          <div className="text-xs text-charcoal-400 dark:text-cool-gray-500">
                            {order.courier?.price === 0 ? 'FREE' : order.courier?.price != null ? `$${order.courier.price.toFixed(2)}` : '—'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gold-600">${order.total.toFixed(2)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${getPaymentColor(order.paymentStatus)}`}>
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-charcoal-700 dark:text-cool-gray-300">
                      {new Date(order.orderDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowModal(true);
                        }}
                        className="px-3 py-1 bg-gold-600 text-white text-xs font-semibold rounded hover:bg-gold-700 transition-colors"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Order Detail Modal */}
      {showModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-charcoal-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-cool-gray-300 dark:border-charcoal-700">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-charcoal-900 dark:text-white">Order Details</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-charcoal-600 dark:text-cool-gray-400 hover:text-charcoal-900 dark:hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-charcoal-600 dark:text-cool-gray-400 uppercase">Order ID</label>
                  <p className="text-lg font-bold text-charcoal-900 dark:text-white">{selectedOrder.id}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-charcoal-600 dark:text-cool-gray-400 uppercase">Order Date</label>
                  <p className="text-lg font-bold text-charcoal-900 dark:text-white">
                    {new Date(selectedOrder.orderDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-charcoal-600 dark:text-cool-gray-400 uppercase">Customer</label>
                  <p className="text-sm font-medium text-charcoal-900 dark:text-white">{selectedOrder.customerName}</p>
                  <p className="text-xs text-charcoal-600 dark:text-cool-gray-400">{selectedOrder.customerEmail}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-charcoal-600 dark:text-cool-gray-400 uppercase">Vendor</label>
                  <p className="text-sm font-medium text-charcoal-900 dark:text-white">{selectedOrder.vendorName}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-charcoal-600 dark:text-cool-gray-400 uppercase">Shipping Address</label>
                  <p className="text-sm text-charcoal-700 dark:text-cool-gray-300">{selectedOrder.shippingAddress}</p>
                </div>
              </div>

              {/* Products */}
              <div className="border-t border-cool-gray-300 dark:border-charcoal-700 pt-4">
                <h3 className="font-semibold text-charcoal-900 dark:text-white mb-3">Products</h3>
                <div className="space-y-2">
                  {selectedOrder.products.map((product, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-cool-gray-50 dark:bg-charcoal-700 rounded-lg">
                      <span className="text-sm text-charcoal-900 dark:text-white">{product}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between text-lg font-bold">
                  <span className="text-charcoal-900 dark:text-white">Total</span>
                  <span className="text-gold-600">${selectedOrder.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Courier */}
              {selectedOrder.courier && (
                <div className="border-t border-cool-gray-300 dark:border-charcoal-700 pt-4">
                  <h3 className="font-semibold text-charcoal-900 dark:text-white mb-3">🚚 Delivery Method</h3>
                  <div className="rounded-xl overflow-hidden border border-cool-gray-200 dark:border-charcoal-700">
                    {/* Dark header */}
                    <div className="bg-charcoal-900 dark:bg-charcoal-950 px-4 py-3 flex items-center gap-3">
                      <span className="text-2xl select-none">{selectedOrder.courier.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold leading-tight">{selectedOrder.courier.name}</p>
                        <p className="text-charcoal-400 text-xs">{selectedOrder.courier.carrier}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`font-bold text-lg leading-tight ${selectedOrder.courier.price === 0 ? 'text-green-400' : 'text-gold-400'}`}>
                          {selectedOrder.courier.price === 0 ? 'FREE' : `$${selectedOrder.courier.price.toFixed(2)}`}
                        </p>
                        <p className="text-charcoal-400 text-xs">shipping fee</p>
                      </div>
                    </div>
                    {/* Details row */}
                    <div className="bg-cool-gray-50 dark:bg-charcoal-800 px-4 py-3 grid grid-cols-3 gap-3 text-center">
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-charcoal-400 dark:text-cool-gray-500 mb-0.5">Est. Arrival</p>
                        <p className="text-sm font-semibold text-charcoal-900 dark:text-white">{selectedOrder.courier.eta}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-charcoal-400 dark:text-cool-gray-500 mb-0.5">Tracking</p>
                        <p className="text-sm font-semibold text-charcoal-900 dark:text-white capitalize">{selectedOrder.courier.tracking}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-charcoal-400 dark:text-cool-gray-500 mb-0.5">Courier ID</p>
                        <p className="text-sm font-semibold text-charcoal-900 dark:text-white">{selectedOrder.courier.id}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tracking */}
              <div className="border-t border-cool-gray-300 dark:border-charcoal-700 pt-4">
                <h3 className="font-semibold text-charcoal-900 dark:text-white mb-3">Tracking Information</h3>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={selectedOrder.trackingNumber || ''}
                    onChange={(e) => {
                      if (selectedOrder) {
                        setSelectedOrder({ ...selectedOrder, trackingNumber: e.target.value });
                      }
                    }}
                    placeholder="Enter tracking number..."
                    className="flex-1 px-4 py-2 bg-white dark:bg-charcoal-700 border border-cool-gray-300 dark:border-charcoal-600 text-charcoal-900 dark:text-white rounded-lg"
                  />
                  <button
                    onClick={() => {
                      if (selectedOrder.trackingNumber) {
                        handleUpdateTracking(selectedOrder.id, selectedOrder.trackingNumber);
                      }
                    }}
                    className="px-4 py-2 bg-gold-600 text-white font-semibold rounded-lg hover:bg-gold-700"
                  >
                    Update
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="border-t border-cool-gray-300 dark:border-charcoal-700 pt-4">
                <h3 className="font-semibold text-charcoal-900 dark:text-white mb-3">Update Order Status</h3>
                <select
                  value={selectedOrder.status}
                  onChange={(e) => handleUpdateStatus(selectedOrder.id, e.target.value as Order['status'])}
                  className="w-full px-4 py-3 bg-white dark:bg-charcoal-700 border border-cool-gray-300 dark:border-charcoal-600 text-charcoal-900 dark:text-white rounded-lg font-semibold"
                >
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>

              {/* Refund */}
              {selectedOrder.paymentStatus === 'paid' && selectedOrder.status !== 'refunded' && (
                <div className="border-t border-cool-gray-300 dark:border-charcoal-700 pt-4">
                  <h3 className="font-semibold text-red-600 dark:text-red-400 mb-3">⚠️ Refund Order</h3>
                  <button
                    onClick={() => handleRefund(selectedOrder.id)}
                    className="w-full py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Process Refund
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
