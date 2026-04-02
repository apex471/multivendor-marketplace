'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface LogisticsDashboardOrder {
  id: string;
  trackingNumber: string;
  sender: string;
  recipient: string;
  pickupDate: string;
  deliveryDate?: string;
  status: 'pending' | 'picked-up' | 'in-transit' | 'delivered' | 'cancelled';
  origin: string;
  destination: string;
  weight: number;
  value: number;
  items: number;
  lastUpdate: string;
}

interface ApiStats {
  totalRevenue: number;
  monthRevenue: number;
  totalDeliveries: number;
  monthDeliveries: number;
}

export default function LogisticsDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'shipments' | 'analytics' | 'settings'>('overview');
  const [selectedStatus, setSelectedStatus] = useState<'all' | LogisticsDashboardOrder['status']>('all');
  const [providerName, setProviderName] = useState('My Logistics');
  const [apiStats, setApiStats] = useState<ApiStats>({ totalRevenue: 0, monthRevenue: 0, totalDeliveries: 0, monthDeliveries: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    const authToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!authToken) { setStatsLoading(false); return; }
    fetch('/api/dashboard/logistics', { headers: { Authorization: `Bearer ${authToken}` } })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const p = d.data.profile;
          const name = [p.firstName, p.lastName].filter(Boolean).join(' ') || p.email || 'My Logistics';
          setProviderName(name);
          setApiStats(d.data.stats);
        }
      })
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, []);

  // Logistics provider display info (uses live name, keeps other fields as defaults)
  const providerInfo = {
    name: providerName,
    logo: '🚚',
    location: 'Your Location',
    rating: 0,
    totalShipments: apiStats.totalDeliveries,
    activeShipments: 0,
    monthlyRevenue: apiStats.monthRevenue,
  };

  // Mock shipments data
  const allShipments: LogisticsDashboardOrder[] = [
    {
      id: 'SHP-001',
      trackingNumber: 'SD-2025-001234',
      sender: 'Gucci Official',
      recipient: 'John Smith',
      pickupDate: '2025-12-20',
      deliveryDate: '2025-12-22',
      status: 'delivered',
      origin: 'New York, NY',
      destination: 'Boston, MA',
      weight: 2.5,
      value: 1200,
      items: 3,
      lastUpdate: '2 hours ago',
    },
    {
      id: 'SHP-002',
      trackingNumber: 'SD-2025-001235',
      sender: 'Louis Vuitton',
      recipient: 'Emma Wilson',
      pickupDate: '2025-12-21',
      status: 'in-transit',
      origin: 'New York, NY',
      destination: 'Philadelphia, PA',
      weight: 1.8,
      value: 2500,
      items: 2,
      lastUpdate: '30 minutes ago',
    },
    {
      id: 'SHP-003',
      trackingNumber: 'SD-2025-001236',
      sender: 'Prada Store',
      recipient: 'Michael Brown',
      pickupDate: '2025-12-21',
      status: 'picked-up',
      origin: 'New York, NY',
      destination: 'Washington, DC',
      weight: 3.2,
      value: 1800,
      items: 4,
      lastUpdate: '1 hour ago',
    },
    {
      id: 'SHP-004',
      trackingNumber: 'SD-2025-001237',
      sender: 'Hermès Boutique',
      recipient: 'Sarah Johnson',
      pickupDate: '2025-12-22',
      status: 'pending',
      origin: 'New York, NY',
      destination: 'Chicago, IL',
      weight: 2.1,
      value: 3500,
      items: 2,
      lastUpdate: '5 minutes ago',
    },
    {
      id: 'SHP-005',
      trackingNumber: 'SD-2025-001238',
      sender: 'Luxury Boutique',
      recipient: 'David Lee',
      pickupDate: '2025-12-19',
      status: 'delivered',
      origin: 'New York, NY',
      destination: 'Los Angeles, CA',
      weight: 4.5,
      value: 2200,
      items: 5,
      lastUpdate: '1 day ago',
    },
  ];

  const filteredShipments = selectedStatus === 'all' ? allShipments : allShipments.filter((s) => s.status === selectedStatus);

  const stats = {
    totalActive: allShipments.filter((s) => ['pending', 'picked-up', 'in-transit'].includes(s.status)).length,
    totalDelivered: apiStats.totalDeliveries > 0 ? apiStats.totalDeliveries : allShipments.filter((s) => s.status === 'delivered').length,
    averageDeliveryTime: 2.1,
    onTimeRate: 98.5,
  };

  const getStatusColor = (status: LogisticsDashboardOrder['status']) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200',
      'picked-up': 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200',
      'in-transit': 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200',
      'delivered': 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200',
      'cancelled': 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200',
    };
    return colors[status];
  };

  const getStatusIcon = (status: LogisticsDashboardOrder['status']) => {
    const icons = {
      'pending': '⏳',
      'picked-up': '📦',
      'in-transit': '🚚',
      'delivered': '✅',
      'cancelled': '❌',
    };
    return icons[status];
  };

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      {/* Header */}
      <header className="bg-charcoal-900 dark:bg-charcoal-950 text-white border-b border-charcoal-800 dark:border-charcoal-900 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <span className="text-2xl">{providerInfo.logo}</span>
              <div>
                <h1 className="text-xl font-bold">{providerInfo.name}</h1>
                <p className="text-xs text-cool-gray-400">Logistics Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/logistics/settings" className="text-sm hover:text-gold-400 transition-colors">
                Settings
              </Link>
              <button className="text-sm hover:text-gold-400">Logout</button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-linear-to-br from-blue-500 to-blue-600 text-white rounded-xl p-6">
            <div className="text-3xl mb-2">📦</div>
            <div className="text-2xl font-bold">{stats.totalActive}</div>
            <div className="text-sm opacity-90">Active Shipments</div>
          </div>
          <div className="bg-linear-to-br from-green-500 to-green-600 text-white rounded-xl p-6">
            <div className="text-3xl mb-2">✅</div>
            <div className="text-2xl font-bold">{stats.totalDelivered}</div>
            <div className="text-sm opacity-90">Delivered Today</div>
          </div>
          <div className="bg-linear-to-br from-purple-500 to-purple-600 text-white rounded-xl p-6">
            <div className="text-3xl mb-2">⏱️</div>
            <div className="text-2xl font-bold">{stats.averageDeliveryTime}d</div>
            <div className="text-sm opacity-90">Avg Delivery Time</div>
          </div>
          <div className="bg-linear-to-br from-gold-500 to-gold-600 text-white rounded-xl p-6">
            <div className="text-3xl mb-2">⭐</div>
            <div className="text-2xl font-bold">{stats.onTimeRate}%</div>
            <div className="text-sm opacity-90">On-Time Rate</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-xl mb-6">
          <div className="flex border-b border-cool-gray-300 dark:border-charcoal-700 overflow-x-auto">
            {(['overview', 'shipments', 'analytics', 'settings'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-shrink-0 px-6 py-4 text-sm font-semibold capitalize transition-colors whitespace-nowrap ${
                  activeTab === tab
                    ? 'text-gold-600 dark:text-gold-400 border-b-2 border-gold-600 dark:border-gold-400'
                    : 'text-charcoal-600 dark:text-cool-gray-400 hover:text-charcoal-900 dark:hover:text-cool-gray-300'
                }`}
              >
                {tab === 'overview' && '📊 Overview'}
                {tab === 'shipments' && '🚚 Shipments'}
                {tab === 'analytics' && '📈 Analytics'}
                {tab === 'settings' && '⚙️ Settings'}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6 sm:p-8">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-charcoal-900 dark:text-white mb-4">Welcome, {providerInfo.name}</h2>
                  <p className="text-charcoal-600 dark:text-cool-gray-400">
                    You have <span className="font-bold text-gold-600">{stats.totalActive} active shipments</span> to manage and{' '}
                    <span className="font-bold text-green-600">{stats.totalDelivered} deliveries completed</span> today.
                  </p>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-4 bg-cool-gray-50 dark:bg-charcoal-700 rounded-lg border border-cool-gray-200 dark:border-charcoal-600">
                    <div className="text-sm text-charcoal-600 dark:text-cool-gray-400 mb-1">Location</div>
                    <div className="font-bold text-charcoal-900 dark:text-white">{providerInfo.location}</div>
                  </div>
                  <div className="p-4 bg-cool-gray-50 dark:bg-charcoal-700 rounded-lg border border-cool-gray-200 dark:border-charcoal-600">
                    <div className="text-sm text-charcoal-600 dark:text-cool-gray-400 mb-1">Total Shipments</div>
                    <div className="font-bold text-charcoal-900 dark:text-white">{providerInfo.totalShipments.toLocaleString()}</div>
                  </div>
                  <div className="p-4 bg-cool-gray-50 dark:bg-charcoal-700 rounded-lg border border-cool-gray-200 dark:border-charcoal-600">
                    <div className="text-sm text-charcoal-600 dark:text-cool-gray-400 mb-1">Provider Rating</div>
                    <div className="font-bold text-charcoal-900 dark:text-white flex items-center gap-1">
                      {providerInfo.rating}
                      <span className="text-yellow-500">⭐</span>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-cool-gray-50 dark:bg-charcoal-700 rounded-lg p-6 border border-cool-gray-200 dark:border-charcoal-600">
                  <h3 className="font-bold text-charcoal-900 dark:text-white mb-4">Recent Shipments</h3>
                  <div className="space-y-3">
                    {allShipments.slice(0, 3).map((shipment) => (
                      <div key={shipment.id} className="flex items-center justify-between p-3 bg-white dark:bg-charcoal-800 rounded-lg border border-cool-gray-200 dark:border-charcoal-600">
                        <div className="flex-1">
                          <p className="font-medium text-charcoal-900 dark:text-white">{shipment.sender} → {shipment.recipient}</p>
                          <p className="text-xs text-cool-gray-500 dark:text-cool-gray-400">{shipment.trackingNumber} • {shipment.lastUpdate}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(shipment.status)}`}>
                          {getStatusIcon(shipment.status)} {shipment.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'shipments' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-charcoal-900 dark:text-white mb-4">All Shipments</h2>
                  <p className="text-charcoal-600 dark:text-cool-gray-400">Showing {filteredShipments.length} shipments</p>
                </div>

                {/* Status Filter */}
                <div className="flex flex-wrap gap-2">
                  {(['all', 'pending', 'picked-up', 'in-transit', 'delivered', 'cancelled'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => setSelectedStatus(status)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                        selectedStatus === status
                          ? 'bg-gold-600 text-white'
                          : 'bg-cool-gray-100 dark:bg-charcoal-700 text-charcoal-900 dark:text-white hover:bg-cool-gray-200 dark:hover:bg-charcoal-600'
                      }`}
                    >
                      {status === 'all' && `All (${allShipments.length})`}
                      {status === 'pending' && `⏳ Pending (${allShipments.filter((s) => s.status === 'pending').length})`}
                      {status === 'picked-up' && `📦 Picked Up (${allShipments.filter((s) => s.status === 'picked-up').length})`}
                      {status === 'in-transit' && `🚚 In Transit (${allShipments.filter((s) => s.status === 'in-transit').length})`}
                      {status === 'delivered' && `✅ Delivered (${allShipments.filter((s) => s.status === 'delivered').length})`}
                      {status === 'cancelled' && `❌ Cancelled (${allShipments.filter((s) => s.status === 'cancelled').length})`}
                    </button>
                  ))}
                </div>

                {/* Shipments Table */}
                <div className="overflow-x-auto border border-cool-gray-200 dark:border-charcoal-700 rounded-lg">
                  <table className="w-full">
                    <thead className="bg-cool-gray-50 dark:bg-charcoal-700 border-b border-cool-gray-200 dark:border-charcoal-600">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-charcoal-900 dark:text-white">Tracking</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-charcoal-900 dark:text-white">From → To</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-charcoal-900 dark:text-white">Weight</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-charcoal-900 dark:text-white">Value</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-charcoal-900 dark:text-white">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-charcoal-900 dark:text-white">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-cool-gray-200 dark:divide-charcoal-600">
                      {filteredShipments.map((shipment) => (
                        <tr key={shipment.id} className="hover:bg-cool-gray-50 dark:hover:bg-charcoal-800 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-medium text-charcoal-900 dark:text-white text-sm">{shipment.trackingNumber}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-charcoal-600 dark:text-cool-gray-400">
                              {shipment.origin.split(',')[0]} → {shipment.destination.split(',')[0]}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-charcoal-900 dark:text-white">{shipment.weight} kg</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-charcoal-900 dark:text-white">${shipment.value}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(shipment.status)}`}>
                              {getStatusIcon(shipment.status)} {shipment.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <Link href={`/logistics/shipment/${shipment.id}`} className="text-sm text-gold-600 dark:text-gold-400 hover:text-gold-700 dark:hover:text-gold-300 font-medium">
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-charcoal-900 dark:text-white">Performance Analytics</h2>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Monthly Performance */}
                  <div className="bg-cool-gray-50 dark:bg-charcoal-700 rounded-lg p-6 border border-cool-gray-200 dark:border-charcoal-600">
                    <h3 className="font-bold text-charcoal-900 dark:text-white mb-4">Monthly Performance</h3>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm text-charcoal-600 dark:text-cool-gray-400">On-Time Delivery</span>
                          <span className="text-sm font-bold text-charcoal-900 dark:text-white">98.5%</span>
                        </div>
                        <div className="w-full bg-cool-gray-200 dark:bg-charcoal-600 rounded-full h-2">
                          <div className="bg-green-600 h-2 rounded-full" style={{ width: '98.5%' }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm text-charcoal-600 dark:text-cool-gray-400">Customer Satisfaction</span>
                          <span className="text-sm font-bold text-charcoal-900 dark:text-white">4.8/5</span>
                        </div>
                        <div className="w-full bg-cool-gray-200 dark:bg-charcoal-600 rounded-full h-2">
                          <div className="bg-gold-600 h-2 rounded-full" style={{ width: '96%' }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm text-charcoal-600 dark:text-cool-gray-400">Capacity Utilization</span>
                          <span className="text-sm font-bold text-charcoal-900 dark:text-white">85%</span>
                        </div>
                        <div className="w-full bg-cool-gray-200 dark:bg-charcoal-600 rounded-full h-2">
                          <div className="bg-blue-600 h-2 rounded-full" style={{ width: '85%' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Key Metrics */}
                  <div className="bg-cool-gray-50 dark:bg-charcoal-700 rounded-lg p-6 border border-cool-gray-200 dark:border-charcoal-600">
                    <h3 className="font-bold text-charcoal-900 dark:text-white mb-4">Key Metrics</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-white dark:bg-charcoal-800 rounded-lg">
                        <span className="text-charcoal-600 dark:text-cool-gray-400">Avg Delivery Time</span>
                        <span className="font-bold text-charcoal-900 dark:text-white">2.1 days</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-white dark:bg-charcoal-800 rounded-lg">
                        <span className="text-charcoal-600 dark:text-cool-gray-400">Total Revenue (MTD)</span>
                        <span className="font-bold text-charcoal-900 dark:text-white">${providerInfo.monthlyRevenue.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-white dark:bg-charcoal-800 rounded-lg">
                        <span className="text-charcoal-600 dark:text-cool-gray-400">Active Routes</span>
                        <span className="font-bold text-charcoal-900 dark:text-white">12</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-white dark:bg-charcoal-800 rounded-lg">
                        <span className="text-charcoal-600 dark:text-cool-gray-400">Partner Vendors</span>
                        <span className="font-bold text-charcoal-900 dark:text-white">45</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Shipments by Status */}
                <div className="bg-cool-gray-50 dark:bg-charcoal-700 rounded-lg p-6 border border-cool-gray-200 dark:border-charcoal-600">
                  <h3 className="font-bold text-charcoal-900 dark:text-white mb-4">Shipments by Status</h3>
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    {[
                      { label: 'Pending', count: allShipments.filter((s) => s.status === 'pending').length, color: 'bg-yellow-500' },
                      { label: 'Picked Up', count: allShipments.filter((s) => s.status === 'picked-up').length, color: 'bg-blue-500' },
                      { label: 'In Transit', count: allShipments.filter((s) => s.status === 'in-transit').length, color: 'bg-purple-500' },
                      { label: 'Delivered', count: allShipments.filter((s) => s.status === 'delivered').length, color: 'bg-green-500' },
                      { label: 'Cancelled', count: allShipments.filter((s) => s.status === 'cancelled').length, color: 'bg-red-500' },
                    ].map((item) => (
                      <div key={item.label} className="p-4 bg-white dark:bg-charcoal-800 rounded-lg">
                        <div className={`w-full h-2 ${item.color} rounded-full mb-3`}></div>
                        <div className="text-2xl font-bold text-charcoal-900 dark:text-white mb-1">{item.count}</div>
                        <div className="text-xs text-charcoal-600 dark:text-cool-gray-400">{item.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-charcoal-900 dark:text-white">Settings</h2>

                <div className="bg-cool-gray-50 dark:bg-charcoal-700 rounded-lg p-6 border border-cool-gray-200 dark:border-charcoal-600">
                  <h3 className="font-bold text-charcoal-900 dark:text-white mb-4">Operational Settings</h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-white dark:bg-charcoal-800 rounded-lg border border-cool-gray-200 dark:border-charcoal-600">
                      <label className="flex items-center gap-3">
                        <input type="checkbox" defaultChecked className="w-4 h-4 text-gold-600 rounded" />
                        <span className="font-medium text-charcoal-900 dark:text-white">Enable automated pickup scheduling</span>
                      </label>
                    </div>
                    <div className="p-4 bg-white dark:bg-charcoal-800 rounded-lg border border-cool-gray-200 dark:border-charcoal-600">
                      <label className="flex items-center gap-3">
                        <input type="checkbox" defaultChecked className="w-4 h-4 text-gold-600 rounded" />
                        <span className="font-medium text-charcoal-900 dark:text-white">Enable real-time tracking updates</span>
                      </label>
                    </div>
                    <div className="p-4 bg-white dark:bg-charcoal-800 rounded-lg border border-cool-gray-200 dark:border-charcoal-600">
                      <label className="flex items-center gap-3">
                        <input type="checkbox" className="w-4 h-4 text-gold-600 rounded" />
                        <span className="font-medium text-charcoal-900 dark:text-white">Accept international shipments</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="bg-cool-gray-50 dark:bg-charcoal-700 rounded-lg p-6 border border-cool-gray-200 dark:border-charcoal-600">
                  <h3 className="font-bold text-charcoal-900 dark:text-white mb-4">Rate Configuration</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-charcoal-700 dark:text-cool-gray-300 mb-2">Base Fee ($)</label>
                      <input type="number" defaultValue="5.00" className="w-full px-4 py-2 border border-cool-gray-300 dark:border-charcoal-600 rounded-lg bg-white dark:bg-charcoal-800 text-charcoal-900 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-charcoal-700 dark:text-cool-gray-300 mb-2">Price per KG ($)</label>
                      <input type="number" defaultValue="2.50" className="w-full px-4 py-2 border border-cool-gray-300 dark:border-charcoal-600 rounded-lg bg-white dark:bg-charcoal-800 text-charcoal-900 dark:text-white" />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-4">
                  <button className="px-6 py-2 border border-cool-gray-300 dark:border-charcoal-600 text-charcoal-900 dark:text-white font-semibold rounded-lg hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 transition-colors">
                    Cancel
                  </button>
                  <button className="px-6 py-2 bg-linear-to-r from-gold-600 to-gold-700 text-white font-semibold rounded-lg hover:from-gold-700 hover:to-gold-800 transition-all shadow-md hover:shadow-lg">
                    Save Settings
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
