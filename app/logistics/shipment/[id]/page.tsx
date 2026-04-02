'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ShipmentDetailsPage({ params }: { params: { id: string } }) {
  const [updateStatus, setUpdateStatus] = useState('');

  // Mock shipment data
  const shipment = {
    id: params.id,
    trackingNumber: 'SD-2025-001234',
    status: 'in-transit',
    sender: {
      name: 'Gucci Official',
      address: '123 Fashion Ave, New York, NY 10001',
      phone: '+1-212-555-1234',
      email: 'shipping@gucci.com',
    },
    recipient: {
      name: 'John Smith',
      address: '456 Main St, Boston, MA 02101',
      phone: '+1-617-555-5678',
      email: 'john.smith@email.com',
    },
    items: [
      { id: 1, name: 'Gucci Leather Handbag', quantity: 1, weight: 1.2 },
      { id: 2, name: 'Gucci Sunglasses', quantity: 2, weight: 0.3 },
    ],
    weight: 1.5,
    dimensions: { length: 30, width: 20, height: 15 },
    value: 1200,
    pickupDate: '2025-12-20T09:00:00',
    deliveryDate: '2025-12-22',
    origin: 'New York, NY',
    destination: 'Boston, MA',
    carrier: 'SwiftDeliver Express',
    insurance: true,
    signature: true,
    timeline: [
      { status: 'Pending', time: '2025-12-20 08:00', location: 'New York, NY', description: 'Order received' },
      { status: 'Picked Up', time: '2025-12-20 10:30', location: 'New York, NY', description: 'Package picked up' },
      { status: 'In Transit', time: '2025-12-21 14:20', location: 'Philadelphia, PA', description: 'In transit to destination' },
      { status: 'Out for Delivery', time: '2025-12-22 08:45', location: 'Boston, MA', description: 'Out for delivery' },
    ],
  };

  const handleStatusUpdate = async () => {
    console.log('Updating status to:', updateStatus);
    setUpdateStatus('');
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'pending': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200',
      'picked-up': 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200',
      'in-transit': 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200',
      'out-for-delivery': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200',
      'delivered': 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200',
    };
    return colors[status.toLowerCase().replace(' ', '-')] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      {/* Header */}
      <header className="bg-charcoal-900 dark:bg-charcoal-950 text-white border-b border-charcoal-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/logistics/dashboard" className="hover:text-gold-400 transition-colors">
                ← Back
              </Link>
              <div>
                <h1 className="text-xl font-bold">Shipment Details</h1>
                <p className="text-xs text-cool-gray-400">{shipment.trackingNumber}</p>
              </div>
            </div>
            <span className={`px-4 py-2 rounded-full font-semibold text-sm ${getStatusColor(shipment.status)}`}>
              {shipment.status.replace('-', ' ').toUpperCase()}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Timeline */}
            <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-xl p-6">
              <h2 className="text-xl font-bold text-charcoal-900 dark:text-white mb-6">Shipment Timeline</h2>
              <div className="space-y-6">
                {shipment.timeline.map((event, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${idx === shipment.timeline.length - 1 ? 'bg-green-600' : 'bg-charcoal-600 dark:bg-charcoal-700'}`}>
                        {idx + 1}
                      </div>
                      {idx < shipment.timeline.length - 1 && <div className="w-0.5 h-16 bg-cool-gray-300 dark:bg-charcoal-600 mt-2"></div>}
                    </div>
                    <div className="pb-6">
                      <h3 className="font-bold text-charcoal-900 dark:text-white">{event.status}</h3>
                      <p className="text-sm text-charcoal-600 dark:text-cool-gray-400">{event.time}</p>
                      <p className="text-sm text-charcoal-600 dark:text-cool-gray-400">{event.location}</p>
                      <p className="text-sm text-charcoal-500 dark:text-cool-gray-500 mt-1">{event.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Items */}
            <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-xl p-6">
              <h2 className="text-xl font-bold text-charcoal-900 dark:text-white mb-4">Items in Shipment</h2>
              <div className="divide-y divide-cool-gray-200 dark:divide-charcoal-700">
                {shipment.items.map((item) => (
                  <div key={item.id} className="py-4 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-charcoal-900 dark:text-white">{item.name}</p>
                      <p className="text-sm text-charcoal-600 dark:text-cool-gray-400">Qty: {item.quantity} • Weight: {item.weight} kg</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Shipment Summary */}
            <div className="bg-cool-gray-50 dark:bg-charcoal-800 border border-cool-gray-200 dark:border-charcoal-700 rounded-xl p-6">
              <h3 className="font-bold text-charcoal-900 dark:text-white mb-4">Shipment Summary</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-charcoal-600 dark:text-cool-gray-400 uppercase tracking-wide">Tracking Number</p>
                  <p className="font-mono font-bold text-charcoal-900 dark:text-white">{shipment.trackingNumber}</p>
                </div>
                <div className="border-t border-cool-gray-200 dark:border-charcoal-700 pt-4">
                  <p className="text-xs text-charcoal-600 dark:text-cool-gray-400 uppercase tracking-wide">Weight</p>
                  <p className="font-bold text-charcoal-900 dark:text-white">{shipment.weight} kg</p>
                </div>
                <div className="border-t border-cool-gray-200 dark:border-charcoal-700 pt-4">
                  <p className="text-xs text-charcoal-600 dark:text-cool-gray-400 uppercase tracking-wide">Dimensions</p>
                  <p className="font-bold text-charcoal-900 dark:text-white">{shipment.dimensions.length} × {shipment.dimensions.width} × {shipment.dimensions.height} cm</p>
                </div>
                <div className="border-t border-cool-gray-200 dark:border-charcoal-700 pt-4">
                  <p className="text-xs text-charcoal-600 dark:text-cool-gray-400 uppercase tracking-wide">Declared Value</p>
                  <p className="font-bold text-charcoal-900 dark:text-white">${shipment.value.toLocaleString()}</p>
                </div>
                <div className="border-t border-cool-gray-200 dark:border-charcoal-700 pt-4">
                  <p className="text-xs text-charcoal-600 dark:text-cool-gray-400 uppercase tracking-wide">Carrier</p>
                  <p className="font-bold text-charcoal-900 dark:text-white">{shipment.carrier}</p>
                </div>
                <div className="border-t border-cool-gray-200 dark:border-charcoal-700 pt-4 space-y-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={shipment.insurance} readOnly className="w-4 h-4 rounded" />
                    <span className="text-sm text-charcoal-700 dark:text-cool-gray-300">Insurance Coverage</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={shipment.signature} readOnly className="w-4 h-4 rounded" />
                    <span className="text-sm text-charcoal-700 dark:text-cool-gray-300">Signature Required</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Sender Info */}
            <div className="bg-cool-gray-50 dark:bg-charcoal-800 border border-cool-gray-200 dark:border-charcoal-700 rounded-xl p-6">
              <h3 className="font-bold text-charcoal-900 dark:text-white mb-4">Sender Information</h3>
              <div className="space-y-2 text-sm">
                <p className="font-medium text-charcoal-900 dark:text-white">{shipment.sender.name}</p>
                <p className="text-charcoal-600 dark:text-cool-gray-400">{shipment.sender.address}</p>
                <p className="text-charcoal-600 dark:text-cool-gray-400">{shipment.sender.phone}</p>
                <p className="text-charcoal-600 dark:text-cool-gray-400">{shipment.sender.email}</p>
              </div>
            </div>

            {/* Recipient Info */}
            <div className="bg-cool-gray-50 dark:bg-charcoal-800 border border-cool-gray-200 dark:border-charcoal-700 rounded-xl p-6">
              <h3 className="font-bold text-charcoal-900 dark:text-white mb-4">Recipient Information</h3>
              <div className="space-y-2 text-sm">
                <p className="font-medium text-charcoal-900 dark:text-white">{shipment.recipient.name}</p>
                <p className="text-charcoal-600 dark:text-cool-gray-400">{shipment.recipient.address}</p>
                <p className="text-charcoal-600 dark:text-cool-gray-400">{shipment.recipient.phone}</p>
                <p className="text-charcoal-600 dark:text-cool-gray-400">{shipment.recipient.email}</p>
              </div>
            </div>

            {/* Update Status */}
            <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-xl p-6">
              <h3 className="font-bold text-charcoal-900 dark:text-white mb-4">Update Status</h3>
              <div className="space-y-3">
                <select
                  value={updateStatus}
                  onChange={(e) => setUpdateStatus(e.target.value)}
                  className="w-full px-4 py-2 border border-cool-gray-300 dark:border-charcoal-600 rounded-lg bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white text-sm"
                >
                  <option value="">Select new status</option>
                  <option value="picked-up">Picked Up</option>
                  <option value="in-transit">In Transit</option>
                  <option value="out-for-delivery">Out for Delivery</option>
                  <option value="delivered">Delivered</option>
                </select>
                <button
                  onClick={handleStatusUpdate}
                  disabled={!updateStatus}
                  className="w-full px-4 py-2 bg-linear-to-r from-gold-600 to-gold-700 text-white font-semibold rounded-lg hover:from-gold-700 hover:to-gold-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Update Status
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
