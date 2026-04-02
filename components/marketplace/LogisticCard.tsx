'use client';

import { LogisticProvider } from '../../contexts/LogisticsContext';

interface LogisticCardProps {
  provider: LogisticProvider;
  isSelected?: boolean;
  onSelect?: (provider: LogisticProvider) => void;
  isLoading?: boolean;
}

export default function LogisticCard({ provider, isSelected, onSelect, isLoading }: LogisticCardProps) {
  return (
    <div
      className={`relative border-2 rounded-xl p-6 transition-all duration-300 cursor-pointer ${
        isSelected
          ? 'border-gold-600 bg-gold-50 dark:bg-charcoal-800 dark:border-gold-500'
          : 'border-cool-gray-300 dark:border-charcoal-700 bg-white dark:bg-charcoal-800 hover:border-gold-400 dark:hover:border-gold-400'
      }`}
      onClick={() => !isLoading && onSelect?.(provider)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-4xl">{provider.logo}</div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-charcoal-900 dark:text-white">{provider.name}</h3>
            <p className="text-sm text-cool-gray-600 dark:text-cool-gray-400">{provider.description}</p>
          </div>
        </div>

        {/* Selection Indicator */}
        {isSelected && (
          <div className="flex-shrink-0">
            <div className="w-6 h-6 bg-gold-600 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Rating and Reviews */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <svg
              key={i}
              className={`w-4 h-4 ${i < Math.floor(provider.rating) ? 'text-gold-500' : 'text-cool-gray-300 dark:text-charcoal-600'}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
          <span className="text-sm font-semibold text-charcoal-900 dark:text-white ml-1">{provider.rating}</span>
        </div>
        <span className="text-sm text-cool-gray-500 dark:text-cool-gray-400">({provider.totalReviews} reviews)</span>
      </div>

      {/* Coverage */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-charcoal-700 dark:text-cool-gray-300 uppercase tracking-wider mb-2">Coverage</p>
        <div className="flex flex-wrap gap-2">
          {provider.coverageArea.slice(0, 3).map((area, idx) => (
            <span key={idx} className="inline-block px-3 py-1 bg-gold-100 dark:bg-charcoal-700 text-gold-800 dark:text-gold-400 text-xs rounded-full font-medium">
              {area}
            </span>
          ))}
          {provider.coverageArea.length > 3 && (
            <span className="inline-block px-3 py-1 bg-cool-gray-100 dark:bg-charcoal-700 text-cool-gray-700 dark:text-cool-gray-400 text-xs rounded-full font-medium">
              +{provider.coverageArea.length - 3} more
            </span>
          )}
        </div>
      </div>

      {/* Features */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-charcoal-700 dark:text-cool-gray-300 uppercase tracking-wider mb-2">Features</p>
        <ul className="grid grid-cols-2 gap-2">
          {provider.features.slice(0, 4).map((feature, idx) => (
            <li key={idx} className="flex items-start gap-2 text-xs text-charcoal-600 dark:text-cool-gray-400">
              <span className="text-gold-600 mt-0.5">✓</span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Pricing and Delivery Info */}
      <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-cool-gray-50 dark:bg-charcoal-700 rounded-lg">
        <div>
          <p className="text-xs text-cool-gray-600 dark:text-cool-gray-400 mb-1">Base Fee</p>
          <p className="text-lg font-bold text-charcoal-900 dark:text-white">${provider.baseFee.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-cool-gray-600 dark:text-cool-gray-400 mb-1">Per KG</p>
          <p className="text-lg font-bold text-charcoal-900 dark:text-white">${provider.pricePerKg.toFixed(2)}</p>
        </div>
        <div className="col-span-2">
          <p className="text-xs text-cool-gray-600 dark:text-cool-gray-400 mb-1">Estimated Delivery</p>
          <p className="text-base font-semibold text-charcoal-900 dark:text-white">{provider.estimatedDelivery}</p>
        </div>
      </div>

      {/* Contact Info */}
      <div className="pt-4 border-t border-cool-gray-200 dark:border-charcoal-700">
        <p className="text-xs text-cool-gray-600 dark:text-cool-gray-400 mb-2">Support Contact</p>
        <div className="text-xs space-y-1">
          <p className="text-charcoal-700 dark:text-cool-gray-300">
            <span className="font-medium">Email:</span> {provider.contactEmail}
          </p>
          <p className="text-charcoal-700 dark:text-cool-gray-300">
            <span className="font-medium">Phone:</span> {provider.contactPhone}
          </p>
        </div>
      </div>

      {/* Select Button */}
      {!isSelected && (
        <button
          onClick={() => !isLoading && onSelect?.(provider)}
          disabled={isLoading}
          className="mt-4 w-full py-3 px-4 bg-linear-to-r from-gold-600 to-gold-700 text-white font-semibold rounded-lg hover:from-gold-700 hover:to-gold-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
        >
          {isLoading ? 'Selecting...' : 'Select Provider'}
        </button>
      )}

      {isSelected && (
        <div className="mt-4 py-3 px-4 bg-gold-100 dark:bg-charcoal-700 text-gold-800 dark:text-gold-400 font-semibold rounded-lg text-center">
          ✓ Selected Provider
        </div>
      )}
    </div>
  );
}
