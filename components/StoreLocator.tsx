'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLocation } from '../contexts/LocationContext';

interface Store {
  id: string;
  name: string;
  type: 'vendor' | 'brand';
  category: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  phone: string;
  hours: string;
  rating: number;
  logo: string;
}

interface StoreLocatorProps {
  maxResults?: number;
  showMap?: boolean;
  filterType?: 'vendor' | 'brand' | 'all';
}

export default function StoreLocator({ 
  maxResults = 10, 
  showMap = true,
  filterType = 'all' 
}: StoreLocatorProps) {
  const { 
    userLocation, 
    requestLocation, 
    calculateDistance, 
    formatDistance,
    isLoadingLocation 
  } = useLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [stores, setStores] = useState<Store[]>([]);

  // Mock store data
  const mockStores: Store[] = [
    {
      id: '1',
      name: 'Chic Boutique Downtown',
      type: 'vendor',
      category: 'Fashion',
      address: '123 Market St',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94103',
      coordinates: { lat: 37.7749, lng: -122.4194 },
      phone: '(415) 555-0101',
      hours: 'Mon-Sat 10am-8pm, Sun 11am-6pm',
      rating: 4.8,
      logo: '👗'
    },
    {
      id: '2',
      name: 'Gucci Union Square',
      type: 'brand',
      category: 'Luxury',
      address: '789 Union Square',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94108',
      coordinates: { lat: 37.7879, lng: -122.4074 },
      phone: '(415) 555-0201',
      hours: 'Mon-Sat 10am-7pm, Sun 12pm-6pm',
      rating: 4.9,
      logo: '👑'
    },
    {
      id: '3',
      name: 'Urban Threads',
      type: 'vendor',
      category: 'Streetwear',
      address: '456 Valencia St',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94110',
      coordinates: { lat: 37.7599, lng: -122.4214 },
      phone: '(415) 555-0102',
      hours: 'Daily 11am-9pm',
      rating: 4.7,
      logo: '👕'
    },
    {
      id: '4',
      name: 'Nike Store SF',
      type: 'brand',
      category: 'Sportswear',
      address: '278 Post St',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94108',
      coordinates: { lat: 37.7885, lng: -122.4077 },
      phone: '(415) 555-0202',
      hours: 'Mon-Sat 10am-9pm, Sun 11am-7pm',
      rating: 4.6,
      logo: '⚡'
    },
    {
      id: '5',
      name: 'Eco Wear Oakland',
      type: 'vendor',
      category: 'Sustainable',
      address: '567 Broadway',
      city: 'Oakland',
      state: 'CA',
      zipCode: '94607',
      coordinates: { lat: 37.8044, lng: -122.2712 },
      phone: '(510) 555-0301',
      hours: 'Tue-Sat 10am-6pm',
      rating: 4.9,
      logo: '🌱'
    }
  ];

  useEffect(() => {
    let filtered = mockStores;

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(store => store.type === filterType);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(store => 
        store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        store.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        store.address.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by city
    if (selectedCity !== 'all') {
      filtered = filtered.filter(store => store.city === selectedCity);
    }

    // Calculate distances and sort if user location available
    if (userLocation) {
      filtered = filtered.map(store => ({
        ...store,
        distance: calculateDistance(
          userLocation.lat,
          userLocation.lng,
          store.coordinates.lat,
          store.coordinates.lng
        )
      })).sort((a: any, b: any) => a.distance - b.distance);
    }

    setStores(filtered.slice(0, maxResults));
  }, [searchQuery, selectedCity, userLocation, filterType, maxResults]);

  const cities = ['all', ...Array.from(new Set(mockStores.map(s => s.city)))];

  return (
    <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-charcoal-900 dark:bg-charcoal-950 p-6 border-b border-charcoal-800 dark:border-charcoal-900">
        <h2 className="text-2xl font-bold text-white mb-2">🏪 Store Locator</h2>
        <p className="text-cool-gray-400">Find stores near you</p>
      </div>

      {/* Search & Filters */}
      <div className="p-6 border-b border-cool-gray-300 dark:border-charcoal-700">
        <div className="grid md:grid-cols-3 gap-4 mb-4">
          {/* Search */}
          <input
            type="text"
            placeholder="Search by name, city, or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-4 py-2 border border-cool-gray-300 dark:border-charcoal-600 rounded-lg bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white"
          />

          {/* City Filter */}
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="px-4 py-2 border border-cool-gray-300 dark:border-charcoal-600 rounded-lg bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white"
          >
            {cities.map(city => (
              <option key={city} value={city}>
                {city === 'all' ? 'All Cities' : city}
              </option>
            ))}
          </select>

          {/* Location Button */}
          {!userLocation ? (
            <button
              onClick={requestLocation}
              disabled={isLoadingLocation}
              className="px-4 py-2 bg-gold-600 dark:bg-gold-700 text-white rounded-lg hover:bg-gold-700 dark:hover:bg-gold-800 disabled:bg-cool-gray-400 transition-colors"
            >
              {isLoadingLocation ? 'Getting Location...' : '📍 Use My Location'}
            </button>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 bg-gold-100 dark:bg-gold-900/30 text-gold-800 dark:text-gold-400 rounded-lg">
              <span>✓ Location enabled</span>
            </div>
          )}
        </div>

        {/* View Toggle */}
        {showMap && (
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('list')}
              className={`flex-1 px-4 py-2 rounded-lg font-semibold ${
                viewMode === 'list'
                  ? 'bg-gold-600 text-white'
                  : 'bg-cool-gray-100 dark:bg-charcoal-700 text-charcoal-900 dark:text-white'
              }`}
            >
              📋 List View
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex-1 px-4 py-2 rounded-lg font-semibold ${
                viewMode === 'map'
                  ? 'bg-gold-600 text-white'
                  : 'bg-cool-gray-100 dark:bg-charcoal-700 text-charcoal-900 dark:text-white'
              }`}
            >
              🗺️ Map View
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="p-6">
        {stores.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-lg font-bold text-charcoal-900 dark:text-white mb-2">
              No stores found
            </h3>
            <p className="text-charcoal-600 dark:text-cool-gray-400">
              Try adjusting your search criteria
            </p>
          </div>
        ) : (
          <>
            <div className="text-sm text-charcoal-600 dark:text-cool-gray-400 mb-4">
              Found {stores.length} store{stores.length !== 1 ? 's' : ''}
            </div>

            {viewMode === 'list' ? (
              <div className="space-y-4">
                {stores.map((store) => {
                  const distance = userLocation ? calculateDistance(
                    userLocation.lat,
                    userLocation.lng,
                    store.coordinates.lat,
                    store.coordinates.lng
                  ) : null;

                  return (
                    <div
                      key={store.id}
                      className="p-4 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg hover:shadow-md transition-shadow"
                    >
                      <div className="flex gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-gold-400 to-gold-600 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">
                          {store.logo}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-1">
                            <div>
                              <h3 className="font-bold text-charcoal-900 dark:text-white">
                                {store.name}
                              </h3>
                              <div className="flex items-center gap-2 text-xs text-charcoal-600 dark:text-cool-gray-400">
                                <span className={`px-2 py-0.5 rounded-full ${
                                  store.type === 'brand'
                                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400'
                                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'
                                }`}>
                                  {store.type === 'brand' ? '👑 Brand' : '🏪 Vendor'}
                                </span>
                                <span>⭐ {store.rating}</span>
                              </div>
                            </div>
                            {distance !== null && (
                              <div className="text-right">
                                <div className="font-bold text-gold-600">
                                  {formatDistance(distance)}
                                </div>
                                <div className="text-xs text-charcoal-600 dark:text-cool-gray-400">
                                  away
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="text-sm text-charcoal-600 dark:text-cool-gray-400 mb-2">
                            <div>📍 {store.address}, {store.city}, {store.state} {store.zipCode}</div>
                            <div>📞 {store.phone}</div>
                            <div>🕐 {store.hours}</div>
                          </div>
                          <div className="flex gap-2">
                            <Link
                              href={`/${store.type === 'brand' ? 'brands' : 'vendors'}/${store.id}`}
                              className="text-sm px-3 py-1 bg-gold-600 text-white rounded-lg hover:bg-gold-700"
                            >
                              View Store
                            </Link>
                            <a
                              href={`https://www.google.com/maps/dir/?api=1&destination=${store.coordinates.lat},${store.coordinates.lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm px-3 py-1 border border-cool-gray-300 dark:border-charcoal-600 rounded-lg hover:bg-cool-gray-50 dark:hover:bg-charcoal-700"
                            >
                              Directions
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-96 bg-gradient-to-br from-cool-gray-100 to-cool-gray-200 dark:from-charcoal-700 dark:to-charcoal-600 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-4">🗺️</div>
                  <h3 className="text-lg font-bold text-charcoal-900 dark:text-white mb-2">
                    Map View
                  </h3>
                  <p className="text-charcoal-600 dark:text-cool-gray-400">
                    Integrate Mapbox or Google Maps API here
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
