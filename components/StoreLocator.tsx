'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
  phone: string;
  avatar: string | null;
  bio: string;
  products: number;
  coordinates: { lat: number; lng: number } | null;
}

interface StoreLocatorProps {
  maxResults?: number;
  showMap?: boolean;
  filterType?: 'vendor' | 'brand' | 'all';
}

export default function StoreLocator({
  maxResults = 10,
  showMap = true,
  filterType = 'all',
}: StoreLocatorProps) {
  const {
    userLocation,
    requestLocation,
    calculateDistance,
    formatDistance,
    isLoadingLocation,
  } = useLocation();

  const [searchQuery, setSearchQuery]   = useState('');
  const [selectedCity, setSelectedCity] = useState('all');
  const [viewMode, setViewMode]         = useState<'list' | 'map'>('list');
  const [allStores, setAllStores]       = useState<Store[]>([]);
  const [cities, setCities]             = useState<string[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchStores = useCallback(async (search: string, city: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ type: filterType, limit: String(maxResults * 4) });
      if (search) params.set('search', search);
      if (city && city !== 'all') params.set('city', city);
      const res  = await fetch(`/api/store-locator?${params}`);
      const json = await res.json();
      if (json.success) {
        setAllStores(json.data.stores ?? []);
        setCities(['all', ...(json.data.cities ?? [])]);
      }
    } catch { /* silent */ }
    finally { setIsLoading(false); }
  }, [filterType, maxResults]);

  // Initial load
  useEffect(() => { fetchStores('', 'all'); }, [fetchStores]);

  // Re-fetch when city changes
  useEffect(() => { fetchStores(searchQuery, selectedCity); }, [selectedCity, fetchStores, searchQuery]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchStores(searchQuery, selectedCity), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery, fetchStores, selectedCity]);

  // Sort by distance if user location available, otherwise keep API order
  const stores = (() => {
    let list = [...allStores];
    if (userLocation) {
      list = list
        .filter(s => s.coordinates)
        .map(s => ({
          ...s,
          _dist: calculateDistance(
            userLocation.lat, userLocation.lng,
            s.coordinates!.lat, s.coordinates!.lng
          ),
        }))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .sort((a: any, b: any) => a._dist - b._dist);
    }
    return list.slice(0, maxResults);
  })();

  const StoreAvatar = ({ store }: { store: Store }) => {
    const initials = store.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    if (store.avatar) {
      return (
        <Image src={store.avatar} alt={store.name} width={48} height={48}
          className="w-12 h-12 rounded-lg object-cover" />
      );
    }
    return (
      <div className="w-12 h-12 rounded-lg bg-linear-to-br from-gold-400 to-gold-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
        {store.type === 'brand' ? '👑' : initials}
      </div>
    );
  };

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
          {/* Loading indicator */}
          {isLoading && (
            <div className="flex items-center px-4 py-2 text-sm text-charcoal-500 dark:text-cool-gray-400">
              Loading stores…
            </div>
          )}

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
        {isLoading && stores.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4 animate-pulse">🏪</div>
            <p className="text-charcoal-600 dark:text-cool-gray-400">Loading stores…</p>
          </div>
        ) : stores.length === 0 ? (
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
                  const distance =
                    userLocation && store.coordinates
                      ? calculateDistance(
                          userLocation.lat, userLocation.lng,
                          store.coordinates.lat, store.coordinates.lng
                        )
                      : null;

                  return (
                    <div
                      key={store.id}
                      className="p-4 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg hover:shadow-md transition-shadow"
                    >
                      <div className="flex gap-4">
                        <StoreAvatar store={store} />
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
                                {store.category && <span className="capitalize">{store.category}</span>}
                                {store.products > 0 && <span>{store.products} products</span>}
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
                            {(store.address || store.city) && (
                              <div>📍 {[store.address, store.city, store.state, store.zipCode].filter(Boolean).join(', ')}</div>
                            )}
                            {store.phone && <div>📞 {store.phone}</div>}
                            {store.bio && <div className="line-clamp-1">ℹ️ {store.bio}</div>}
                          </div>
                          <div className="flex gap-2">
                            <Link
                              href={`/${store.type === 'brand' ? 'brands' : 'vendor'}/${store.id}`}
                              className="text-sm px-3 py-1 bg-gold-600 text-white rounded-lg hover:bg-gold-700"
                            >
                              View Store
                            </Link>
                            {store.coordinates && (
                              <a
                                href={`https://www.google.com/maps/dir/?api=1&destination=${store.coordinates.lat},${store.coordinates.lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm px-3 py-1 border border-cool-gray-300 dark:border-charcoal-600 rounded-lg hover:bg-cool-gray-50 dark:hover:bg-charcoal-700"
                              >
                                Directions
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-96 bg-linear-to-br from-cool-gray-100 to-cool-gray-200 dark:from-charcoal-700 dark:to-charcoal-600 rounded-lg flex items-center justify-center">
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
