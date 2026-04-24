'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAuthToken } from '@/lib/api/auth';

interface TimelineEvent {
  status: string;
  time: string;
  description: string;
}

interface ShipmentItem {
  id?: string;
  name: string;
  quantity: number;
}

interface ShipmentData {
  id: string;
  orderId: string;
  trackingNumber: string;
  status: string;
  sender: { name: string; address: string };
  customer: { name: string; phone: string; email: string; address: string };
  items: ShipmentItem[];
  value: number;
  carrier: string;
  courierName?: string;
  deliveryFee: number;
  origin: string;
  destination: string;
  distance?: string;
  estimatedTime?: string;
  pickupDate: string;
  deliveryDate: string | null;
  timeline: TimelineEvent[];
}

export default function ShipmentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const shipmentId = params.id as string;

  const [shipment, setShipment] = useState<ShipmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [updateStatus, setUpdateStatus] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateMsg, setUpdateMsg] = useState('');

  useEffect(() => {
    const token = getAuthToken();
    if (!token) { router.replace('/auth/logistics/login'); return; }

    fetch(`/api/logistics/orders/${shipmentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(json => {
        if (!json.success || !json.data?.order) { setNotFound(true); return; }
        setShipment(json.data.order);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [shipmentId, router]);

  const handleStatusUpdate = async () => {
    if (!updateStatus || !shipment) return;
    const token = getAuthToken();
    if (!token) return;
    setUpdating(true);
    setUpdateMsg('');
    try {
      const actionMap: Record<string, string> = {
        'accepted':   'accept',
        'picked-up':  'pickup',
        'in-transit': 'transit',
        'delivered':  'delivered',
      };
      const action = actionMap[updateStatus];
      if (!action) return;
      const res = await fetch('/api/logistics/orders', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: shipment.orderId, action }),
      });
      const json = await res.json();
      if (json.success) {
        setUpdateMsg('✅ Status updated successfully');
        setUpdateStatus('');
        const refresh = await fetch(`/api/logistics/orders/${shipmentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const refreshJson = await refresh.json();
        if (refreshJson.success) setShipment(refreshJson.data.order);
      } else {
        setUpdateMsg(`❌ ${json.message || 'Update failed'}`);
      }
    } catch {
      setUpdateMsg('❌ Network error');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'pending':    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200',
      'processing': 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200',
      'picked-up':  'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200',
      'shipped':    'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200',
      'in-transit': 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200',
      'delivered':  'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200',
      'cancelled':  'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200',
    };
    return colors[status.toLowerCase()] || 'bg-gray-100 text-gray-700';
  };

  const formatTime = (iso: string) => {
    try { return new Date(iso).toLocaleString(); } catch { return iso; }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-charcoal-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🚚</div>
          <p className="text-charcoal-600 dark:text-cool-gray-400">Loading shipment details...</p>
        </div>
      </div>
    );
  }

  if (notFound || !shipment) {
    return (
      <div className="min-h-screen bg-white dark:bg-charcoal-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">📦</div>
          <h2 className="text-xl font-bold text-charcoal-900 dark:text-white mb-2">Shipment Not Found</h2>
          <p className="text-charcoal-600 dark:text-cool-gray-400 mb-4">This delivery could not be found or you don&apos;t have access.</p>
          <Link href="/logistics/dashboard" className="text-gold-600 hover:underline">← Back to Dashboard</Link>
        </div>
      </div>
    );
  }

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
                <p className="text-xs text-cool-gray-400 font-mono">{shipment.trackingNumber}</p>
              </div>
            </div>
            <span className={`px-4 py-2 rounded-full font-semibold text-sm ${getStatusColor(shipment.status)}`}>
              {shipment.status.replace(/-/g, ' ').toUpperCase()}
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
              {shipment.timeline.length === 0 ? (
                <p className="text-charcoal-600 dark:text-cool-gray-400">No timeline events yet.</p>
              ) : (
                <div className="space-y-6">
                  {shipment.timeline.map((event, idx) => (
                    <div key={idx} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${idx === shipment.timeline.length - 1 ? 'bg-green-600' : 'bg-charcoal-600 dark:bg-charcoal-700'}`}>
                          {idx + 1}
                        </div>
                        {idx < shipment.timeline.length - 1 && (
                          <div className="w-0.5 h-16 bg-cool-gray-300 dark:bg-charcoal-600 mt-2"></div>
                        )}
                      </div>
                      <div className="pb-6">
                        <h3 className="font-bold text-charcoal-900 dark:text-white">{event.status}</h3>
                        <p className="text-sm text-charcoal-600 dark:text-cool-gray-400">{formatTime(event.time)}</p>
                        <p className="text-sm text-charcoal-500 dark:text-cool-gray-500 mt-1">{event.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Items */}
            <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-xl p-6">
              <h2 className="text-xl font-bold text-charcoal-900 dark:text-white mb-4">Items in Shipment</h2>
              <div className="divide-y divide-cool-gray-200 dark:divide-charcoal-700">
                {shipment.items.map((item, idx) => (
                  <div key={item.id ?? idx} className="py-4 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-charcoal-900 dark:text-white">{item.name}</p>
                      <p className="text-sm text-charcoal-600 dark:text-cool-gray-400">Qty: {item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Route */}
            {(shipment.origin || shipment.destination) && (
              <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-xl p-6">
                <h2 className="text-xl font-bold text-charcoal-900 dark:text-white mb-4">Route</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-charcoal-500 dark:text-cool-gray-500 uppercase tracking-wide mb-1">From</p>
                    <p className="font-medium text-charcoal-900 dark:text-white">{shipment.origin}</p>
                  </div>
                  <div>
                    <p className="text-xs text-charcoal-500 dark:text-cool-gray-500 uppercase tracking-wide mb-1">To</p>
                    <p className="font-medium text-charcoal-900 dark:text-white">{shipment.destination}</p>
                  </div>
                  {shipment.distance && (
                    <div>
                      <p className="text-xs text-charcoal-500 dark:text-cool-gray-500 uppercase tracking-wide mb-1">Distance</p>
                      <p className="font-medium text-charcoal-900 dark:text-white">{shipment.distance}</p>
                    </div>
                  )}
                  {shipment.estimatedTime && (
                    <div>
                      <p className="text-xs text-charcoal-500 dark:text-cool-gray-500 uppercase tracking-wide mb-1">Est. Time</p>
                      <p className="font-medium text-charcoal-900 dark:text-white">{shipment.estimatedTime}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Shipment Summary */}
            <div className="bg-cool-gray-50 dark:bg-charcoal-800 border border-cool-gray-200 dark:border-charcoal-700 rounded-xl p-6">
              <h3 className="font-bold text-charcoal-900 dark:text-white mb-4">Shipment Summary</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-charcoal-600 dark:text-cool-gray-400 uppercase tracking-wide">Tracking Number</p>
                  <p className="font-mono font-bold text-charcoal-900 dark:text-white break-all">{shipment.trackingNumber}</p>
                </div>
                <div className="border-t border-cool-gray-200 dark:border-charcoal-700 pt-4">
                  <p className="text-xs text-charcoal-600 dark:text-cool-gray-400 uppercase tracking-wide">Order Value</p>
                  <p className="font-bold text-charcoal-900 dark:text-white">${shipment.value.toFixed(2)}</p>
                </div>
                <div className="border-t border-cool-gray-200 dark:border-charcoal-700 pt-4">
                  <p className="text-xs text-charcoal-600 dark:text-cool-gray-400 uppercase tracking-wide">Delivery Fee</p>
                  <p className="font-bold text-charcoal-900 dark:text-white">${shipment.deliveryFee.toFixed(2)}</p>
                </div>
                <div className="border-t border-cool-gray-200 dark:border-charcoal-700 pt-4">
                  <p className="text-xs text-charcoal-600 dark:text-cool-gray-400 uppercase tracking-wide">Carrier</p>
                  <p className="font-bold text-charcoal-900 dark:text-white">{shipment.courierName ?? shipment.carrier}</p>
                </div>
                {shipment.pickupDate && (
                  <div className="border-t border-cool-gray-200 dark:border-charcoal-700 pt-4">
                    <p className="text-xs text-charcoal-600 dark:text-cool-gray-400 uppercase tracking-wide">Accepted At</p>
                    <p className="font-bold text-charcoal-900 dark:text-white">{formatTime(shipment.pickupDate)}</p>
                  </div>
                )}
                {shipment.deliveryDate && (
                  <div className="border-t border-cool-gray-200 dark:border-charcoal-700 pt-4">
                    <p className="text-xs text-charcoal-600 dark:text-cool-gray-400 uppercase tracking-wide">Est. Delivery</p>
                    <p className="font-bold text-charcoal-900 dark:text-white">{shipment.deliveryDate}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Sender Info */}
            <div className="bg-cool-gray-50 dark:bg-charcoal-800 border border-cool-gray-200 dark:border-charcoal-700 rounded-xl p-6">
              <h3 className="font-bold text-charcoal-900 dark:text-white mb-4">Sender (Vendor)</h3>
              <div className="space-y-2 text-sm">
                <p className="font-medium text-charcoal-900 dark:text-white">{shipment.sender.name}</p>
                {shipment.sender.address && (
                  <p className="text-charcoal-600 dark:text-cool-gray-400">{shipment.sender.address}</p>
                )}
              </div>
            </div>

            {/* Recipient Info */}
            <div className="bg-cool-gray-50 dark:bg-charcoal-800 border border-cool-gray-200 dark:border-charcoal-700 rounded-xl p-6">
              <h3 className="font-bold text-charcoal-900 dark:text-white mb-4">Recipient</h3>
              <div className="space-y-2 text-sm">
                <p className="font-medium text-charcoal-900 dark:text-white">{shipment.customer.name}</p>
                <p className="text-charcoal-600 dark:text-cool-gray-400">{shipment.customer.address}</p>
                {shipment.customer.phone && (
                  <p className="text-charcoal-600 dark:text-cool-gray-400">{shipment.customer.phone}</p>
                )}
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
                  <option value="accepted">Accepted</option>
                  <option value="picked-up">Picked Up</option>
                  <option value="in-transit">In Transit</option>
                  <option value="delivered">Delivered</option>
                </select>
                {updateMsg && <p className="text-sm font-medium">{updateMsg}</p>}
                <button
                  onClick={handleStatusUpdate}
                  disabled={!updateStatus || updating}
                  className="w-full px-4 py-2 bg-linear-to-r from-gold-600 to-gold-700 text-white font-semibold rounded-lg hover:from-gold-700 hover:to-gold-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updating ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
