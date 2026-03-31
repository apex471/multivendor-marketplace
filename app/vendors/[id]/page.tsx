'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useLocation } from '../../../contexts/LocationContext';

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
}

interface VendorData {
  id: string;
  name: string;
  description: string;
  logo: string;
  banner: string;
  category: string;
  rating: number;
  reviewCount: number;
  verified: boolean;
  coordinates: {
    lat: number;
    lng: number;
  };
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  website: string;
  hours: {
    monday: string;
    tuesday: string;
    wednesday: string;
    thursday: string;
    friday: string;
    saturday: string;
    sunday: string;
  };
  deliveryRadius: number; // km
  minOrder: number;
  deliveryFee: number;
  products: Product[];
}

export default function VendorStorePage() {
  const params = useParams();
  const vendorId = params?.id as string;
  
  const { 
    userLocation, 
    requestLocation, 
    calculateDistance, 
    formatDistance,
    isWithinDeliveryZone,
    isLoadingLocation 
  } = useLocation();

  const [vendor, setVendor] = useState<VendorData | null>(null);
  const [activeTab, setActiveTab] = useState<'products' | 'about' | 'reviews'>('products');

  // Mock vendor data
  const mockVendor: VendorData = {
    id: vendorId,
    name: 'Chic Boutique',
    description: 'Modern fashion for the contemporary woman. We specialize in curated collections from emerging and established designers, bringing you the latest trends with a focus on quality and sustainability.',
    logo: '👗',
    banner: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1200',
    category: 'Fashion',
    rating: 4.8,
    reviewCount: 234,
    verified: true,
    coordinates: { lat: 37.7749, lng: -122.4194 },
    address: '123 Market Street',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94103',
    phone: '(415) 555-0101',
    email: 'info@chicboutique.com',
    website: 'www.chicboutique.com',
    hours: {
      monday: '10:00 AM - 8:00 PM',
      tuesday: '10:00 AM - 8:00 PM',
      wednesday: '10:00 AM - 8:00 PM',
      thursday: '10:00 AM - 8:00 PM',
      friday: '10:00 AM - 9:00 PM',
      saturday: '10:00 AM - 9:00 PM',
      sunday: '11:00 AM - 6:00 PM'
    },
    deliveryRadius: 5,
    minOrder: 25,
    deliveryFee: 5.99,
    products: [
      { id: '1', name: 'Summer Dress', price: 89.99, image: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=300', category: 'Dresses' },
      { id: '2', name: 'Denim Jacket', price: 129.99, image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=300', category: 'Outerwear' },
      { id: '3', name: 'Silk Blouse', price: 79.99, image: 'https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=300', category: 'Tops' },
      { id: '4', name: 'Wide Leg Pants', price: 99.99, image: 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=300', category: 'Bottoms' },
      { id: '5', name: 'Leather Handbag', price: 199.99, image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=300', category: 'Accessories' },
      { id: '6', name: 'Ankle Boots', price: 159.99, image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=300', category: 'Shoes' }
    ]
  };

  useEffect(() => {
    setVendor(mockVendor);
  }, [vendorId]);

  if (!vendor) {
    return (
      <div className="min-h-screen bg-white dark:bg-charcoal-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⏳</div>
          <p className="text-charcoal-600 dark:text-cool-gray-400">Loading vendor...</p>
        </div>
      </div>
    );
  }

  const distance = userLocation ? calculateDistance(
    userLocation.lat,
    userLocation.lng,
    vendor.coordinates.lat,
    vendor.coordinates.lng
  ) : null;

  const canDeliver = isWithinDeliveryZone(
    vendor.coordinates.lat,
    vendor.coordinates.lng,
    vendor.deliveryRadius
  );

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      {/* Banner */}
      <div className="h-64 bg-gradient-to-r from-charcoal-800 via-charcoal-900 to-charcoal-950 dark:from-charcoal-900 dark:via-charcoal-950 dark:to-black relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gold-600/10 to-transparent"></div>
        <div className="absolute inset-0 flex items-end">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
            <div className="flex items-end gap-6">
              <div className="w-32 h-32 bg-white dark:bg-charcoal-800 rounded-xl flex items-center justify-center text-6xl border-4 border-white shadow-xl">
                {vendor.logo}
              </div>
              <div className="flex-1 pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-4xl font-bold text-white">{vendor.name}</h1>
                  {vendor.verified && (
                    <span className="text-2xl" title="Verified Vendor">✓</span>
                  )}
                </div>
                <p className="text-white/90">{vendor.category}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Location & Delivery Info */}
            <div className="bg-cool-gray-50 dark:bg-charcoal-800 border border-cool-gray-200 dark:border-charcoal-700 rounded-xl p-6 mb-6">
              <h2 className="text-xl font-bold text-charcoal-900 dark:text-white mb-4">
                📍 Location & Delivery
              </h2>
              
              {!userLocation ? (
                <div className="mb-4">
                  <p className="text-charcoal-600 dark:text-cool-gray-400 mb-3">
                    Enable location to see delivery availability and distance
                  </p>
                  <button
                    onClick={requestLocation}
                    disabled={isLoadingLocation}
                    className="px-6 py-2 bg-gold-600 text-white rounded-lg hover:bg-gold-700 disabled:bg-cool-gray-400"
                  >
                    {isLoadingLocation ? 'Getting Location...' : 'Enable Location'}
                  </button>
                </div>
              ) : (
                <div className="space-y-3 mb-4">
                  <div className={`flex items-center gap-3 p-3 rounded-lg ${
                    canDeliver
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                  }`}>
                    <div className="text-2xl">{canDeliver ? '✓' : '✗'}</div>
                    <div>
                      <div className="font-bold">
                        {canDeliver ? 'Delivers to your location' : 'Outside delivery zone'}
                      </div>
                      <div className="text-sm">
                        {distance !== null && `${formatDistance(distance)} away`} • 
                        Delivers within {vendor.deliveryRadius}km
                      </div>
                    </div>
                  </div>
                  
                  {canDeliver && (
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="p-3 bg-white dark:bg-charcoal-800 rounded-lg">
                        <div className="text-charcoal-600 dark:text-cool-gray-400">Delivery Fee</div>
                        <div className="font-bold text-charcoal-900 dark:text-white">${vendor.deliveryFee}</div>
                      </div>
                      <div className="p-3 bg-white dark:bg-charcoal-800 rounded-lg">
                        <div className="text-charcoal-600 dark:text-cool-gray-400">Min. Order</div>
                        <div className="font-bold text-charcoal-900 dark:text-white">${vendor.minOrder}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Map */}
              <div className="h-48 bg-gradient-to-br from-cool-gray-100 to-cool-gray-200 dark:from-charcoal-700 dark:to-charcoal-600 rounded-lg flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                  <div className="grid grid-cols-6 grid-rows-6 h-full">
                    {Array.from({ length: 36 }).map((_, i) => (
                      <div key={i} className="border border-cool-gray-400"></div>
                    ))}
                  </div>
                </div>
                <div className="text-center z-10">
                  <div className="text-4xl mb-2">📍</div>
                  <div className="text-sm font-semibold text-charcoal-900 dark:text-white">
                    {vendor.address}
                  </div>
                  <div className="text-xs text-charcoal-600 dark:text-cool-gray-400">
                    {vendor.city}, {vendor.state} {vendor.zipCode}
                  </div>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${vendor.coordinates.lat},${vendor.coordinates.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-3 px-4 py-2 bg-gold-600 text-white rounded-lg hover:bg-gold-700 text-sm"
                  >
                    Get Directions
                  </a>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-xl mb-6">
              <div className="flex border-b border-cool-gray-300 dark:border-charcoal-700">
                {(['products', 'about', 'reviews'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 px-6 py-4 text-sm font-semibold capitalize ${
                      activeTab === tab
                        ? 'text-gold-600 border-b-2 border-gold-600'
                        : 'text-charcoal-600 dark:text-cool-gray-400'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Products Tab */}
            {activeTab === 'products' && (
              <div className="grid md:grid-cols-2 gap-6">
                {vendor.products.map((product) => (
                  <div
                    key={product.id}
                    className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-xl overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    <div className="h-48 bg-gradient-to-br from-purple-200 to-pink-200 dark:from-purple-900/30 dark:to-pink-900/30 flex items-center justify-center text-6xl">
                      📸
                    </div>
                    <div className="p-4">
                      <div className="text-xs text-charcoal-600 dark:text-cool-gray-400 mb-1">
                        {product.category}
                      </div>
                      <h3 className="font-bold text-charcoal-900 dark:text-white mb-2">
                        {product.name}
                      </h3>
                      <div className="flex items-center justify-between">
                        <div className="text-xl font-bold text-gold-600">
                          ${product.price}
                        </div>
                        <Link
                          href={`/product/${product.id}`}
                          className="px-4 py-2 bg-gold-600 text-white rounded-lg hover:bg-gold-700 text-sm"
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* About Tab */}
            {activeTab === 'about' && (
              <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-xl p-6">
                <h2 className="text-xl font-bold text-charcoal-900 dark:text-white mb-4">
                  About {vendor.name}
                </h2>
                <p className="text-charcoal-600 dark:text-cool-gray-400 mb-6">
                  {vendor.description}
                </p>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-charcoal-900 dark:text-white mb-2">
                      Contact Information
                    </h3>
                    <div className="space-y-2 text-sm text-charcoal-600 dark:text-cool-gray-400">
                      <div>📞 {vendor.phone}</div>
                      <div>📧 {vendor.email}</div>
                      <div>🌐 {vendor.website}</div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-charcoal-900 dark:text-white mb-2">
                      Store Hours
                    </h3>
                    <div className="space-y-1 text-sm text-charcoal-600 dark:text-cool-gray-400">
                      {Object.entries(vendor.hours).map(([day, hours]) => (
                        <div key={day} className="flex justify-between">
                          <span className="capitalize font-medium">{day}</span>
                          <span>{hours}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Reviews Tab */}
            {activeTab === 'reviews' && (
              <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-xl p-6">
                <h2 className="text-xl font-bold text-charcoal-900 dark:text-white mb-4">
                  Customer Reviews
                </h2>
                <p className="text-charcoal-600 dark:text-cool-gray-400">
                  Reviews coming soon...
                </p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Rating Card */}
            <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-xl p-6">
              <div className="text-center mb-4">
                <div className="text-5xl font-bold text-gold-600 mb-2">
                  {vendor.rating}
                </div>
                <div className="text-yellow-500 text-2xl mb-2">
                  ⭐⭐⭐⭐⭐
                </div>
                <div className="text-sm text-charcoal-600 dark:text-cool-gray-400">
                  {vendor.reviewCount} reviews
                </div>
              </div>
              <button className="w-full px-4 py-2 border border-cool-gray-300 dark:border-charcoal-600 rounded-lg hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 font-semibold text-charcoal-900 dark:text-white">
                Write a Review
              </button>
            </div>

            {/* Quick Info */}
            <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-xl p-6">
              <h3 className="font-bold text-charcoal-900 dark:text-white mb-4">
                Quick Info
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📦</span>
                  <div>
                    <div className="font-semibold text-charcoal-900 dark:text-white">
                      {vendor.products.length} Products
                    </div>
                    <div className="text-charcoal-600 dark:text-cool-gray-400">
                      Available items
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🚚</span>
                  <div>
                    <div className="font-semibold text-charcoal-900 dark:text-white">
                      {vendor.deliveryRadius}km Radius
                    </div>
                    <div className="text-charcoal-600 dark:text-cool-gray-400">
                      Delivery zone
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">💰</span>
                  <div>
                    <div className="font-semibold text-charcoal-900 dark:text-white">
                      ${vendor.minOrder} minimum
                    </div>
                    <div className="text-charcoal-600 dark:text-cool-gray-400">
                      Order requirement
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Link
                href={`/vendors/nearby`}
                className="block w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-500 text-white text-center rounded-lg hover:from-purple-700 hover:to-purple-600 font-semibold"
              >
                🗺️ Find Nearby Vendors
              </Link>
              <button className="w-full px-4 py-3 border border-cool-gray-300 dark:border-charcoal-600 rounded-lg hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 font-semibold text-charcoal-900 dark:text-white">
                📞 Contact Vendor
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
