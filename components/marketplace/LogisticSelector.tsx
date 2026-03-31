'use client';

import { useState } from 'react';
import { useLogistics, LogisticProvider } from '../../contexts/LogisticsContext';
import LogisticCard from './LogisticCard';

interface LogisticSelectorProps {
  onSelectionComplete?: (provider: LogisticProvider) => void;
  userRole: 'brand' | 'vendor';
  title?: string;
  subtitle?: string;
}

export default function LogisticSelector({ onSelectionComplete, userRole, title, subtitle }: LogisticSelectorProps) {
  const { logisticProviders, selectedLogistics, selectLogistics, isLoading } = useLogistics();
  const [filterActive, setFilterActive] = useState(true);

  const filteredProviders = filterActive ? logisticProviders.filter((p) => p.isActive) : logisticProviders;

  const handleSelectProvider = async (provider: LogisticProvider) => {
    try {
      await selectLogistics(provider);
      onSelectionComplete?.(provider);
    } catch (error) {
      console.error('Failed to select logistics provider:', error);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      {(title || subtitle) && (
        <div>
          {title && <h2 className="text-2xl sm:text-3xl font-display font-bold text-charcoal-900 dark:text-white mb-2">{title}</h2>}
          {subtitle && <p className="text-charcoal-600 dark:text-cool-gray-400">{subtitle}</p>}
        </div>
      )}

      {/* Filter Controls */}
      <div className="flex items-center gap-4 flex-wrap">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filterActive}
            onChange={(e) => setFilterActive(e.target.checked)}
            className="w-4 h-4 rounded border-cool-gray-300 text-gold-600 focus:ring-gold-500"
          />
          <span className="text-sm font-medium text-charcoal-700 dark:text-cool-gray-300">Show only active providers</span>
        </label>
        <span className="text-sm text-cool-gray-500 dark:text-cool-gray-400">
          {filteredProviders.length} provider{filteredProviders.length !== 1 ? 's' : ''} available
        </span>
      </div>

      {/* Current Selection Info */}
      {selectedLogistics && (
        <div className="bg-gold-50 dark:bg-charcoal-800 border border-gold-200 dark:border-gold-800 rounded-lg p-4">
          <p className="text-sm text-charcoal-700 dark:text-cool-gray-300">
            <span className="font-semibold">Currently Selected:</span> {selectedLogistics.providerName}{' '}
            <span className="text-cool-gray-500 dark:text-cool-gray-400">
              (since {new Date(selectedLogistics.selectedAt).toLocaleDateString()})
            </span>
          </p>
        </div>
      )}

      {/* Logistics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredProviders.length > 0 ? (
          filteredProviders.map((provider) => (
            <LogisticCard
              key={provider.id}
              provider={provider}
              isSelected={selectedLogistics?.providerId === provider.id}
              onSelect={handleSelectProvider}
              isLoading={isLoading}
            />
          ))
        ) : (
          <div className="col-span-full py-12 text-center">
            <div className="text-5xl mb-4">🚚</div>
            <p className="text-lg text-charcoal-600 dark:text-cool-gray-400 mb-2">No logistics providers available</p>
            <p className="text-sm text-cool-gray-500 dark:text-cool-gray-500">Try adjusting your filters</p>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-charcoal-800 border border-blue-200 dark:border-charcoal-700 rounded-lg p-4">
        <p className="text-sm text-charcoal-700 dark:text-cool-gray-300">
          <span className="font-semibold">ℹ️ About Logistics:</span> Select a logistics provider to handle deliveries for your{' '}
          {userRole === 'brand' ? 'brand products' : 'store orders'}. You can change your provider at any time, and different products can use different logistics partners.
        </p>
      </div>
    </div>
  );
}
