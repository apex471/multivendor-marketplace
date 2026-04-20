'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '../../../../components/common/Header';
import Footer from '../../../../components/common/Footer';
import { useLogistics, LogisticProvider } from '../../../../contexts/LogisticsContext';
import LogisticSelector from '../../../../components/marketplace/LogisticSelector';

export default function VendorLogisticsPage() {
  const { selectedLogistics } = useLogistics();
  const [activeTab, setActiveTab] = useState<'select' | 'settings' | 'performance'>('select');

  const handleSelectionComplete = (provider: LogisticProvider) => {
    console.log('Provider selected:', provider.name);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900 flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Header Section */}
        <div className="bg-linear-to-r from-charcoal-800 to-charcoal-900 dark:from-charcoal-900 dark:to-charcoal-950 text-white">
          <div className="container mx-auto px-4 py-8 sm:py-12">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gold-500 flex items-center justify-center text-3xl sm:text-4xl shrink-0">
                🚚
              </div>
              <div className="text-center sm:text-left flex-1">
                <h1 className="text-2xl sm:text-3xl font-display font-bold">Logistics Management</h1>
                <p className="text-cool-gray-300 text-sm mt-1">Manage your delivery partners and shipping settings</p>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8 sm:py-12">
          {/* Current Provider Status */}
          {selectedLogistics && (
            <div className="mb-8 bg-linear-to-r from-gold-50 to-gold-100 dark:from-charcoal-800 dark:to-charcoal-750 border border-gold-200 dark:border-gold-800 rounded-xl p-6">
              <div className="flex items-center gap-4">
                <div className="text-4xl">✅</div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-charcoal-900 dark:text-white">Active Logistics Provider</h3>
                  <p className="text-charcoal-600 dark:text-cool-gray-400">
                    You are currently using <span className="font-semibold text-gold-700 dark:text-gold-400">{selectedLogistics.providerName}</span> for your deliveries
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('select')}
                  className="px-4 py-2 bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white font-semibold rounded-lg hover:bg-cool-gray-50 dark:hover:bg-charcoal-600 transition-colors whitespace-nowrap"
                >
                  Change Provider
                </button>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-xl overflow-hidden">
            <div className="flex border-b border-cool-gray-300 dark:border-charcoal-700 overflow-x-auto">
              {(['select', 'settings', 'performance'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`shrink-0 px-6 py-4 text-sm font-semibold capitalize transition-colors whitespace-nowrap ${
                    activeTab === tab
                      ? 'text-gold-600 dark:text-gold-400 border-b-2 border-gold-600 dark:border-gold-400'
                      : 'text-charcoal-600 dark:text-cool-gray-400 hover:text-charcoal-900 dark:hover:text-cool-gray-300'
                  }`}
                >
                  {tab === 'select' && '🚚 Select Provider'}
                  {tab === 'settings' && '⚙️ Settings'}
                  {tab === 'performance' && '📊 Performance'}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-6 sm:p-8">
              {activeTab === 'select' && (
                <LogisticSelector
                  userRole="vendor"
                  title="Choose Your Logistics Partner"
                  subtitle="Select a reliable logistics provider to handle deliveries for your store orders. You can change providers at any time."
                  onSelectionComplete={handleSelectionComplete}
                />
              )}

              {activeTab === 'settings' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-charcoal-900 dark:text-white mb-4">Delivery Settings</h3>
                    <div className="space-y-4">
                      <div className="p-4 bg-cool-gray-50 dark:bg-charcoal-700 rounded-lg border border-cool-gray-200 dark:border-charcoal-600">
                        <label className="flex items-center gap-3">
                          <input type="checkbox" defaultChecked className="w-4 h-4 text-gold-600 rounded" />
                          <span className="font-medium text-charcoal-900 dark:text-white">Enable real-time tracking notifications</span>
                        </label>
                      </div>
                      <div className="p-4 bg-cool-gray-50 dark:bg-charcoal-700 rounded-lg border border-cool-gray-200 dark:border-charcoal-600">
                        <label className="flex items-center gap-3">
                          <input type="checkbox" defaultChecked className="w-4 h-4 text-gold-600 rounded" />
                          <span className="font-medium text-charcoal-900 dark:text-white">Allow customers to choose delivery date</span>
                        </label>
                      </div>
                      <div className="p-4 bg-cool-gray-50 dark:bg-charcoal-700 rounded-lg border border-cool-gray-200 dark:border-charcoal-600">
                        <label className="flex items-center gap-3">
                          <input type="checkbox" className="w-4 h-4 text-gold-600 rounded" />
                          <span className="font-medium text-charcoal-900 dark:text-white">Enable signature requirement</span>
                        </label>
                      </div>
                      <div className="p-4 bg-cool-gray-50 dark:bg-charcoal-700 rounded-lg border border-cool-gray-200 dark:border-charcoal-600">
                        <label className="flex items-center gap-3">
                          <input type="checkbox" defaultChecked className="w-4 h-4 text-gold-600 rounded" />
                          <span className="font-medium text-charcoal-900 dark:text-white">Include delivery insurance</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-cool-gray-200 dark:border-charcoal-700 pt-6">
                    <h3 className="text-lg font-bold text-charcoal-900 dark:text-white mb-4">Packaging Preferences</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 bg-cool-gray-50 dark:bg-charcoal-700 rounded-lg border-2 border-gold-400 dark:border-gold-600">
                        <label className="flex items-center gap-3">
                          <input type="radio" name="packaging" defaultChecked className="w-4 h-4 text-gold-600" />
                          <span className="font-medium text-charcoal-900 dark:text-white">Standard</span>
                        </label>
                      </div>
                      <div className="p-4 bg-cool-gray-50 dark:bg-charcoal-700 rounded-lg border border-cool-gray-200 dark:border-charcoal-600">
                        <label className="flex items-center gap-3">
                          <input type="radio" name="packaging" className="w-4 h-4 text-gold-600" />
                          <span className="font-medium text-charcoal-900 dark:text-white">Premium</span>
                        </label>
                      </div>
                      <div className="p-4 bg-cool-gray-50 dark:bg-charcoal-700 rounded-lg border border-cool-gray-200 dark:border-charcoal-600">
                        <label className="flex items-center gap-3">
                          <input type="radio" name="packaging" className="w-4 h-4 text-gold-600" />
                          <span className="font-medium text-charcoal-900 dark:text-white">Eco-Friendly</span>
                        </label>
                      </div>
                      <div className="p-4 bg-cool-gray-50 dark:bg-charcoal-700 rounded-lg border border-cool-gray-200 dark:border-charcoal-600">
                        <label className="flex items-center gap-3">
                          <input type="radio" name="packaging" className="w-4 h-4 text-gold-600" />
                          <span className="font-medium text-charcoal-900 dark:text-white">Custom</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-cool-gray-200 dark:border-charcoal-700 pt-6 flex justify-end gap-4">
                    <button className="px-6 py-2 border border-cool-gray-300 dark:border-charcoal-600 text-charcoal-900 dark:text-white font-semibold rounded-lg hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 transition-colors">
                      Cancel
                    </button>
                    <button className="px-6 py-2 bg-linear-to-r from-gold-600 to-gold-700 text-white font-semibold rounded-lg hover:from-gold-700 hover:to-gold-800 transition-all shadow-md hover:shadow-lg">
                      Save Settings
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'performance' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-charcoal-900 dark:text-white">Logistics Performance</h3>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-blue-50 dark:bg-charcoal-800 rounded-lg p-4 border border-blue-200 dark:border-charcoal-700">
                      <div className="text-2xl mb-2">📦</div>
                      <div className="text-2xl font-bold text-charcoal-900 dark:text-white">856</div>
                      <div className="text-sm text-charcoal-600 dark:text-cool-gray-400">Total Shipments</div>
                    </div>
                    <div className="bg-green-50 dark:bg-charcoal-800 rounded-lg p-4 border border-green-200 dark:border-charcoal-700">
                      <div className="text-2xl mb-2">✅</div>
                      <div className="text-2xl font-bold text-charcoal-900 dark:text-white">97.8%</div>
                      <div className="text-sm text-charcoal-600 dark:text-cool-gray-400">Delivery Rate</div>
                    </div>
                    <div className="bg-yellow-50 dark:bg-charcoal-800 rounded-lg p-4 border border-yellow-200 dark:border-charcoal-700">
                      <div className="text-2xl mb-2">⏱️</div>
                      <div className="text-2xl font-bold text-charcoal-900 dark:text-white">2.3</div>
                      <div className="text-sm text-charcoal-600 dark:text-cool-gray-400">Avg Days</div>
                    </div>
                    <div className="bg-purple-50 dark:bg-charcoal-800 rounded-lg p-4 border border-purple-200 dark:border-charcoal-700">
                      <div className="text-2xl mb-2">⭐</div>
                      <div className="text-2xl font-bold text-charcoal-900 dark:text-white">4.7</div>
                      <div className="text-sm text-charcoal-600 dark:text-cool-gray-400">Provider Rating</div>
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="bg-cool-gray-50 dark:bg-charcoal-800 rounded-lg p-6 border border-cool-gray-200 dark:border-charcoal-700">
                    <h4 className="font-bold text-charcoal-900 dark:text-white mb-4">Recent Shipments</h4>
                    <div className="space-y-3">
                      {[
                        { id: 'SH-451', status: 'Delivered', date: '2 days ago' },
                        { id: 'SH-452', status: 'In Transit', date: '1 day ago' },
                        { id: 'SH-453', status: 'Processing', date: 'Today' },
                      ].map((shipment) => (
                        <div key={shipment.id} className="flex items-center justify-between p-3 bg-white dark:bg-charcoal-700 rounded-lg border border-cool-gray-200 dark:border-charcoal-600">
                          <div>
                            <p className="font-medium text-charcoal-900 dark:text-white">{shipment.id}</p>
                            <p className="text-xs text-cool-gray-500 dark:text-cool-gray-400">{shipment.date}</p>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                              shipment.status === 'Delivered'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200'
                                : shipment.status === 'In Transit'
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                                  : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200'
                            }`}
                          >
                            {shipment.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Help Section */}
          <div className="mt-8 bg-cool-gray-50 dark:bg-charcoal-800 rounded-xl p-6 border border-cool-gray-200 dark:border-charcoal-700">
            <h3 className="font-bold text-charcoal-900 dark:text-white mb-4">Need Help?</h3>
            <p className="text-charcoal-600 dark:text-cool-gray-400 mb-4">
              Our logistics team is here to assist you. Contact support for help with provider selection, rates, or delivery optimization.
            </p>
            <button className="px-6 py-2 bg-white dark:bg-charcoal-700 border border-cool-gray-300 dark:border-charcoal-600 text-charcoal-900 dark:text-white font-semibold rounded-lg hover:bg-cool-gray-100 dark:hover:bg-charcoal-600 transition-colors">
              📧 Contact Support
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
