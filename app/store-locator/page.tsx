'use client';

import { useState } from 'react';
import Link from 'next/link';
import StoreLocator from '../../components/StoreLocator';

export default function StoreLocatorPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      {/* Header */}
      <header className="bg-charcoal-900 dark:bg-charcoal-950 text-white border-b border-charcoal-800 dark:border-charcoal-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">🗺️ Store Locator</h1>
              <p className="text-cool-gray-400 mt-1">Find fashion stores and brands near you</p>
            </div>
            <Link href="/" className="text-sm hover:text-gold-400 transition-colors">
              ← Back to Home
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <StoreLocator maxResults={20} showMap={true} filterType="all" />
      </div>
    </div>
  );
}
