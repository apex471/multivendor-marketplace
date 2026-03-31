'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';

export default function DealsPage() {
  const [activeTab, setActiveTab] = useState<'flash' | 'daily' | 'seasonal'>('flash');

  const deals = {
    flash: [
      { id: '1', name: 'Designer Watch', price: 799, oldPrice: 1299, image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=400', discount: 38, timeLeft: '2h 30m', rating: 4.9 },
      { id: '2', name: 'Leather Bag', price: 599, oldPrice: 899, image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400', discount: 33, timeLeft: '2h 30m', rating: 4.8 },
    ],
    daily: [
      { id: '3', name: 'Sunglasses', price: 249, oldPrice: 399, image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400', discount: 38, rating: 4.7 },
      { id: '4', name: 'Sneakers', price: 329, oldPrice: 499, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400', discount: 34, rating: 4.9 },
    ],
    seasonal: [
      { id: '5', name: 'Winter Coat', price: 899, oldPrice: 1499, image: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=400', discount: 40, rating: 4.8 },
      { id: '6', name: 'Designer Scarf', price: 199, oldPrice: 349, image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400', discount: 43, rating: 4.6 },
    ],
  };

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      <Header />

      <div className="container mx-auto px-4 py-8">
        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-gold-600 to-gold-700 rounded-2xl p-8 md:p-12 text-white text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">🔥 Hot Deals & Sales</h1>
          <p className="text-xl mb-6">Up to 70% off on luxury fashion items</p>
          <div className="flex justify-center gap-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-6 py-4">
              <div className="text-3xl font-bold">48</div>
              <div className="text-sm">Hours</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-6 py-4">
              <div className="text-3xl font-bold">23</div>
              <div className="text-sm">Minutes</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-6 py-4">
              <div className="text-3xl font-bold">45</div>
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
              onClick={() => setActiveTab(tab.id as any)}
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
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {deals[activeTab].map((deal) => (
            <Link
              key={deal.id}
              href={`/product/${deal.id}`}
              className="group bg-white dark:bg-charcoal-800 rounded-xl overflow-hidden shadow-md hover:shadow-2xl transition-all"
            >
              <div className="relative h-56 bg-cool-gray-100 dark:bg-charcoal-700">
                <Image src={deal.image} alt={deal.name} fill className="object-cover group-hover:scale-105 transition-transform" />
                <div className="absolute top-3 left-3 bg-red-600 text-white px-3 py-1 rounded-full font-bold text-sm">
                  -{deal.discount}%
                </div>
                {activeTab === 'flash' && 'timeLeft' in deal && (
                  <div className="absolute top-3 right-3 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    ⏰ {deal.timeLeft}
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-charcoal-900 dark:text-white mb-2 line-clamp-2">{deal.name}</h3>
                <div className="flex items-center gap-1 mb-3">
                  <span className="text-yellow-500">⭐</span>
                  <span className="text-sm font-semibold text-charcoal-900 dark:text-white">{deal.rating}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-gold-600">${deal.price}</span>
                  <span className="text-sm text-cool-gray-500 dark:text-cool-gray-400 line-through">${deal.oldPrice}</span>
                </div>
                <button className="w-full mt-4 px-4 py-2 bg-gold-600 text-white rounded-lg font-semibold hover:bg-gold-700 transition-colors">
                  Shop Now
                </button>
              </div>
            </Link>
          ))}
        </div>

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
