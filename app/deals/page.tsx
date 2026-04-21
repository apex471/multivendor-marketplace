'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';

interface Deal {
  id: string;
  name: string;
  price: number;
  compareAtPrice?: number;
  images: string[];
  rating?: number;
  ratingCount?: number;
  discount?: number;
}

export default function DealsPage() {
  const [activeTab, setActiveTab] = useState<'flash' | 'daily' | 'seasonal'>('flash');
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Flash sale ends in 48h from page load
  const [timeLeft, setTimeLeft] = useState(() => 48 * 3600 + 23 * 60 + 45);
  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000);
    return () => clearInterval(timer);
  }, []);
  const hrs  = Math.floor(timeLeft / 3600);
  const mins = Math.floor((timeLeft % 3600) / 60);
  const secs = timeLeft % 60;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/products?onSale=true&limit=12`)
      .then(r => r.json())
      .then(json => { if (!cancelled && json.success) setDeals(json.data.products ?? []); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const getDiscount = (deal: Deal) => {
    if (deal.discount) return deal.discount;
    if (deal.compareAtPrice && deal.compareAtPrice > deal.price)
      return Math.round((1 - deal.price / deal.compareAtPrice) * 100);
    return 0;
  };

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      <Header />

      <div className="container mx-auto px-4 py-8">
        {/* Hero Banner */}
        <div className="bg-linear-to-r from-gold-600 to-gold-700 rounded-2xl p-8 md:p-12 text-white text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">🔥 Hot Deals & Sales</h1>
          <p className="text-xl mb-6">Up to 70% off on luxury fashion items</p>
          <div className="flex justify-center gap-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-6 py-4">
              <div className="text-3xl font-bold">{String(hrs).padStart(2, '0')}</div>
              <div className="text-sm">Hours</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-6 py-4">
              <div className="text-3xl font-bold">{String(mins).padStart(2, '0')}</div>
              <div className="text-sm">Minutes</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-6 py-4">
              <div className="text-3xl font-bold">{String(secs).padStart(2, '0')}</div>
              <div className="text-sm">Seconds</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto">
          {[
            { id: 'flash', label: 'Flash Sales', icon: '⚡' },
            { id: 'daily', label: 'Daily Deals', icon: '📅' },
            { id: 'seasonal', label: 'Seasonal Offers', icon: '❄️' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'flash' | 'daily' | 'seasonal')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-gold-600 text-white'
                  : 'bg-white dark:bg-charcoal-800 text-charcoal-700 dark:text-cool-gray-300 hover:bg-cool-gray-100 dark:hover:bg-charcoal-700'
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Deals Grid */}
        {isLoading ? (
          <div className="text-center py-16 text-charcoal-500 dark:text-cool-gray-400">Loading deals...</div>
        ) : deals.length === 0 ? (
          <div className="text-center py-16 text-charcoal-500 dark:text-cool-gray-400">No deals available right now. Check back soon!</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {deals.map((deal) => {
              const disc = getDiscount(deal);
              return (
                <Link
                  key={deal.id}
                  href={`/product/${deal.id}`}
                  className="group bg-white dark:bg-charcoal-800 rounded-xl overflow-hidden shadow-md hover:shadow-2xl transition-all"
                >
                  <div className="relative h-56 bg-cool-gray-100 dark:bg-charcoal-700">
                    {deal.images?.[0] && (
                      <Image src={deal.images[0]} alt={deal.name} fill className="object-cover group-hover:scale-105 transition-transform" />
                    )}
                    {disc > 0 && (
                      <div className="absolute top-3 left-3 bg-red-600 text-white px-3 py-1 rounded-full font-bold text-sm">
                        -{disc}%
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-charcoal-900 dark:text-white mb-2 line-clamp-2">{deal.name}</h3>
                    {deal.rating && (
                      <div className="flex items-center gap-1 mb-3">
                        <span className="text-yellow-500">⭐</span>
                        <span className="text-sm font-semibold text-charcoal-900 dark:text-white">{deal.rating.toFixed(1)}</span>
                        {deal.ratingCount && <span className="text-xs text-charcoal-500">({deal.ratingCount})</span>}
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-gold-600">${deal.price.toFixed(2)}</span>
                      {deal.compareAtPrice && <span className="text-sm text-cool-gray-500 dark:text-cool-gray-400 line-through">${deal.compareAtPrice.toFixed(2)}</span>}
                    </div>
                    <button className="w-full mt-4 px-4 py-2 bg-gold-600 text-white rounded-lg font-semibold hover:bg-gold-700 transition-colors">
                      Shop Now
                    </button>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Coupon Section */}
        <div className="mt-12 bg-white dark:bg-charcoal-800 rounded-xl shadow-md p-8">
          <h2 className="text-2xl font-bold text-charcoal-900 dark:text-white mb-6 text-center">🎟️ Available Coupons</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { code: 'WINTER50', discount: '50% OFF', desc: 'On winter collection' },
              { code: 'LUXURY20', discount: '20% OFF', desc: 'On luxury items' },
              { code: 'FREESHIP', discount: 'FREE SHIPPING', desc: 'Orders over $500' },
            ].map((coupon, index) => (
              <div key={index} className="border-2 border-dashed border-gold-600 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-gold-600 mb-2">{coupon.discount}</div>
                <div className="text-sm text-charcoal-600 dark:text-cool-gray-400 mb-3">{coupon.desc}</div>
                <div className="bg-cool-gray-100 dark:bg-charcoal-700 px-4 py-2 rounded font-mono text-charcoal-900 dark:text-white font-bold">
                  {coupon.code}
                </div>
                <button className="mt-3 text-gold-600 hover:text-gold-700 text-sm font-semibold">
                  Copy Code
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
