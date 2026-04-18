'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useLocation } from '../../../contexts/LocationContext';

interface Vendor {
  id: string;
  name: string;
  description: string;
  category: string;
  rating: number;
  reviewCount: number;
  coordinates: {
    lat: number;
    lng: number;
  };
  address: string;
  phone: string;
  hours: string;
  products: number;
  verified: boolean;
  deliveryRadius: number; // in km
  logo: string;
}

export default function NearbyVendorsPage() {
  const { 
    userLocation, 
    isLoadingLocation, 
    locationError, 
    requestLocation, 
    calculateDistance, 
    formatDistance,
    isWithinDeliveryZone 
  } = useLocation();

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [mapRadius, setMapRadius] = useState(5); // km
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'distance' | 'rating'>('distance');
  const mapRef = useRef<HTMLDivElement>(null);

  // Load real vendors from API and filter by distance client-side
  const [allApiVendors, setAllApiVendors] = useState<Vendor[]>([]);

  useEffect(() => {
    fetch('/api/vendors?limit=100')
      .then(r => r.json())
      .then(json => {
        if (json.success) setAllApiVendors(json.data.vendors ?? []);
      });
  }, []);

  useEffect(() => {
    const source = allApiVendors.length > 0 ? allApiVendors : [];
    if (userLocation && source.length > 0) {
      const vendorsWithDistance = source
        .filter(v => v.coordinates?.lat && v.coordinates?.lng)
        .map(vendor => ({
          ...vendor,
          distance: calculateDistance(
            userLocation.lat,
            userLocation.lng,
            vendor.coordinates.lat,
            vendor.coordinates.lng
          )
        })).filter(vendor => vendor.distance <= mapRadius);

      const sorted = [...vendorsWithDistance].sort((a, b) => {
        if (sortBy === 'distance') return (a as Vendor & { distance: number }).distance - (b as Vendor & { distance: number }).distance;
        return b.rating - a.rating;
      });

      setVendors(sorted as Vendor[]);
    } else if (!userLocation && source.length > 0) {
      // No location: just show all vendors sorted by rating
      setVendors([...source].sort((a, b) => b.rating - a.rating).slice(0, 20));
    }
  }, [userLocation, allApiVendors, mapRadius, sortBy, calculateDistance]);

  const categories = ['all', 'Fashion', 'Streetwear', 'Luxury', 'Fast Fashion', 'Sustainable'];

  const filteredVendors = filterCategory === 'all' 
    ? vendors 
    : vendors.filter(v => v.category === filterCategory);

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      {/* Header */}
      <header className="bg-charcoal-900 dark:bg-charcoal-950 text-white border-b border-charcoal-800 dark:border-charcoal-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">📍 Nearby Vendors</h1>
              <p className="text-cool-gray-400 mt-1">Discover fashion stores near you</p>
            </div>
            <Link href="/" className="text-sm hover:text-gold-400 transition-colors">
              ← Back to Home
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Location Request */}
        {!userLocation && (
          <div className="bg-cool-gray-50 dark:bg-charcoal-800 border border-cool-gray-200 dark:border-charcoal-700 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="text-4xl">📍</div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-charcoal-900 dark:text-white mb-2">
                  Enable Location Services
                </h3>
                <p className="text-charcoal-600 dark:text-cool-gray-400 mb-4">
                  Allow us to access your location to find nearby vendors and show accurate delivery options.
                </p>
                <button
                  onClick={requestLocation}
                  disabled={isLoadingLocation}
                  className="px-6 py-2 bg-gold-600 dark:bg-gold-700 text-white rounded-lg hover:bg-gold-700 dark:hover:bg-gold-800 disabled:bg-cool-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoadingLocation ? 'Getting Location...' : 'Enable Location'}
                </button>
                {locationError && (
                  <p className="text-red-600 dark:text-red-400 text-sm mt-2">
                    {locationError}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {userLocation && (
          <>
            {/* Filters & Controls */}
            <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-xl p-6 mb-6">
              <div className="grid md:grid-cols-3 gap-4">
                {/* Radius Filter */}
                <div>
                  <label className="block text-sm font-semibold text-charcoal-900 dark:text-white mb-2">
                    Search Radius: {mapRadius}km
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={mapRadius}
                    onChange={(e) => setMapRadius(Number(e.target.value))}
                    className="w-full accent-gold-600"
                  />
                  <div className="flex justify-between text-xs text-charcoal-600 dark:text-cool-gray-400 mt-1">
                    <span>1km</span>
                    <span>20km</span>
                  </div>
                </div>

                {/* Category Filter */}
                <div>
                  <label className="block text-sm font-semibold text-charcoal-900 dark:text-white mb-2">
                    Category
                  </label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full px-4 py-2 border border-cool-gray-300 dark:border-charcoal-600 rounded-lg bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sort By */}
                <div>
                  <label className="block text-sm font-semibold text-charcoal-900 dark:text-white mb-2">
                    Sort By
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'distance' | 'rating')}
                    className="w-full px-4 py-2 border border-cool-gray-300 dark:border-charcoal-600 rounded-lg bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white"
                  >
                    <option value="distance">Distance</option>
                    <option value="rating">Rating</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 text-sm text-charcoal-600 dark:text-cool-gray-400">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                Found {filteredVendors.length} vendor{filteredVendors.length !== 1 ? 's' : ''} within {mapRadius}km
              </div>
            </div>

            {/* Map View */}
            <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-xl p-6 mb-6">
              <h2 className="text-xl font-bold text-charcoal-900 dark:text-white mb-4">
                🗺️ Map View
              </h2>
              <div 
                ref={mapRef}
                className="w-full h-96 bg-linear-to-br from-cool-gray-100 to-cool-gray-200 dark:from-charcoal-700 dark:to-charcoal-600 rounded-lg flex items-center justify-center relative overflow-hidden"
              >
                {/* Simple map representation - Replace with real Mapbox/Google Maps */}
                <div className="absolute inset-0 opacity-10">
                  <div className="grid grid-cols-8 grid-rows-8 h-full">
                    {Array.from({ length: 64 }).map((_, i) => (
                      <div key={i} className="border border-cool-gray-400"></div>
                    ))}
                  </div>
                </div>
                
                {/* Your Location Marker */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                  <div className="relative">
                    <div className="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg"></div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-blue-400 rounded-full opacity-30 animate-ping"></div>
                  </div>
                  <div className="text-xs font-bold text-blue-600 mt-1 whitespace-nowrap">You</div>
                </div>

                {/* Vendor Markers */}
                {filteredVendors.slice(0, 5).map((vendor, index) => {
                  const angle = (index / filteredVendors.length) * 2 * Math.PI;
                  const radius = 100 + (index * 20);
                  const x = 50 + radius * Math.cos(angle);
                  const y = 50 + radius * Math.sin(angle);
                  
                  return (
                    <div
                      key={vendor.id}
                      className="absolute cursor-pointer hover:scale-110 transition-transform z-20"
                      style={{ 
                        left: `${x}%`, 
                        top: `${y}%`,
                        transform: 'translate(-50%, -50%)'
                      }}
                      onClick={() => setSelectedVendor(vendor)}
                    >
                      <div className={`w-8 h-8 ${vendor.verified ? 'bg-gold-600' : 'bg-purple-600'} rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-lg`}>
                        {vendor.logo}
                      </div>
                    </div>
                  );
                })}

                <div className="absolute bottom-4 left-4 bg-white dark:bg-charcoal-800 px-4 py-2 rounded-lg shadow-lg text-xs">
                  <div className="font-semibold text-charcoal-900 dark:text-white">Interactive Map</div>
                  <div className="text-charcoal-600 dark:text-cool-gray-400">
                    Integrate Mapbox or Google Maps API
                  </div>
                </div>
              </div>
            </div>

            {/* Vendor List */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-charcoal-900 dark:text-white">
                Vendor List
              </h2>
              
              {filteredVendors.length === 0 ? (
                <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-xl p-8 text-center">
                  <div className="text-6xl mb-4">🔍</div>
                  <h3 className="text-lg font-bold text-charcoal-900 dark:text-white mb-2">
                    No vendors found
                  </h3>
                  <p className="text-charcoal-600 dark:text-cool-gray-400">
                    Try increasing the search radius or changing the category filter.
                  </p>
                </div>
              ) : (
                filteredVendors.map((vendor) => {
                  const distance = userLocation ? calculateDistance(
                    userLocation.lat,
                    userLocation.lng,
                    vendor.coordinates.lat,
                    vendor.coordinates.lng
                  ) : 0;
                  const canDeliver = isWithinDeliveryZone(
                    vendor.coordinates.lat,
                    vendor.coordinates.lng,
                    vendor.deliveryRadius
                  );

                  return (
                    <div
                      key={vendor.id}
                      className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-xl p-6 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex gap-4">
                        {/* Logo */}
                        <div className="w-16 h-16 bg-linear-to-br from-gold-400 to-gold-600 rounded-lg flex items-center justify-center text-3xl flex-shrink-0">
                          {vendor.logo}
                        </div>

                        {/* Info */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold text-charcoal-900 dark:text-white">
                                  {vendor.name}
                                </h3>
                                {vendor.verified && (
                                  <span className="text-blue-600">✓</span>
                                )}
                              </div>
                              <p className="text-sm text-charcoal-600 dark:text-cool-gray-400">
                                {vendor.description}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-gold-600">
                                {formatDistance(distance)}
                              </div>
                              <div className="text-xs text-charcoal-600 dark:text-cool-gray-400">
                                away
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-4 text-sm text-charcoal-600 dark:text-cool-gray-400 mb-3">
                            <div>⭐ {vendor.rating} ({vendor.reviewCount})</div>
                            <div>🛍️ {vendor.products} products</div>
                            <div>🏷️ {vendor.category}</div>
                            <div>📞 {vendor.phone}</div>
                            <div>🕐 {vendor.hours}</div>
                          </div>

                          <div className="flex items-center gap-2 mb-3">
                            <div className="text-sm text-charcoal-600 dark:text-cool-gray-400">
                              📍 {vendor.address}
                            </div>
                          </div>

                          {/* Delivery Status */}
                          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-3 ${
                            canDeliver
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                          }`}>
                            {canDeliver ? '✓ Delivers to you' : `⚠️ Outside delivery zone (${vendor.deliveryRadius}km)`}
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2">
                            <Link
                              href={`/vendors/${vendor.id}`}
                              className="px-4 py-2 bg-gold-600 text-white rounded-lg hover:bg-gold-700 text-sm font-semibold"
                            >
                              View Store
                            </Link>
                            <button
                              onClick={() => setSelectedVendor(vendor)}
                              className="px-4 py-2 border border-cool-gray-300 dark:border-charcoal-600 rounded-lg hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 text-sm font-semibold text-charcoal-900 dark:text-white"
                            >
                              Show on Map
                            </button>
                            <a
                              href={`https://www.google.com/maps/dir/?api=1&destination=${vendor.coordinates.lat},${vendor.coordinates.lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 border border-cool-gray-300 dark:border-charcoal-600 rounded-lg hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 text-sm font-semibold text-charcoal-900 dark:text-white"
                            >
                              Get Directions
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>

      {/* Selected Vendor Modal */}
      {selectedVendor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedVendor(null)}>
          <div className="bg-white dark:bg-charcoal-800 rounded-xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-charcoal-900 dark:text-white">
                {selectedVendor.name}
              </h3>
              <button
                onClick={() => setSelectedVendor(null)}
                className="text-charcoal-600 dark:text-cool-gray-400 hover:text-charcoal-900 dark:hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3">
              <div className="text-4xl text-center mb-4">{selectedVendor.logo}</div>
              <p className="text-charcoal-600 dark:text-cool-gray-400">{selectedVendor.description}</p>
              <div className="text-sm text-charcoal-600 dark:text-cool-gray-400">
                <div>📍 {selectedVendor.address}</div>
                <div>📞 {selectedVendor.phone}</div>
                <div>🕐 {selectedVendor.hours}</div>
                <div>⭐ {selectedVendor.rating} ({selectedVendor.reviewCount} reviews)</div>
              </div>
              <Link
                href={`/vendors/${selectedVendor.id}`}
                className="block w-full px-4 py-2 bg-gold-600 text-white rounded-lg hover:bg-gold-700 text-center font-semibold"
              >
                View Store
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
