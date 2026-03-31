'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Coordinates {
  lat: number;
  lng: number;
}

interface LocationContextType {
  userLocation: Coordinates | null;
  isLoadingLocation: boolean;
  locationError: string | null;
  requestLocation: () => Promise<void>;
  calculateDistance: (lat1: number, lng1: number, lat2: number, lng2: number) => number;
  isWithinDeliveryZone: (vendorLat: number, vendorLng: number, maxDistance: number) => boolean;
  formatDistance: (distance: number) => string;
  clearLocation: () => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Try to load saved location from localStorage on mount
  useEffect(() => {
    const savedLocation = localStorage.getItem('userLocation');
    if (savedLocation) {
      try {
        const parsed = JSON.parse(savedLocation);
        setUserLocation(parsed);
      } catch (e) {
        console.error('Failed to parse saved location', e);
      }
    }
  }, []);

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Radius of the Earth in km
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance; // Returns distance in km
  };

  const toRad = (value: number): number => {
    return (value * Math.PI) / 180;
  };

  // Format distance for display
  const formatDistance = (distance: number): string => {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance.toFixed(1)}km`;
  };

  // Check if user is within delivery zone
  const isWithinDeliveryZone = (vendorLat: number, vendorLng: number, maxDistance: number): boolean => {
    if (!userLocation) return false;
    const distance = calculateDistance(userLocation.lat, userLocation.lng, vendorLat, vendorLng);
    return distance <= maxDistance;
  };

  // Request user's location
  const requestLocation = async (): Promise<void> => {
    setIsLoadingLocation(true);
    setLocationError(null);

    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by your browser');
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        });
      });

      const coords: Coordinates = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      setUserLocation(coords);
      localStorage.setItem('userLocation', JSON.stringify(coords));
      setLocationError(null);
    } catch (error: any) {
      let errorMessage = 'Unable to retrieve your location';
      
      if (error.code === 1) {
        errorMessage = 'Location access denied. Please enable location services.';
      } else if (error.code === 2) {
        errorMessage = 'Location information unavailable.';
      } else if (error.code === 3) {
        errorMessage = 'Location request timed out.';
      }
      
      setLocationError(errorMessage);
      console.error('Geolocation error:', error);
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const clearLocation = () => {
    setUserLocation(null);
    localStorage.removeItem('userLocation');
  };

  return (
    <LocationContext.Provider
      value={{
        userLocation,
        isLoadingLocation,
        locationError,
        requestLocation,
        calculateDistance,
        isWithinDeliveryZone,
        formatDistance,
        clearLocation
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}
