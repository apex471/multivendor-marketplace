'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

export interface LogisticProvider {
  id: string;
  name: string;
  logo: string;
  description: string;
  coverageArea: string[];
  estimatedDelivery: string;
  rating: number;
  totalReviews: number;
  pricePerKg: number;
  baseFee: number;
  features: string[];
  isActive: boolean;
  contactEmail: string;
  contactPhone: string;
}

export interface SelectedLogistics {
  providerId: string;
  providerName: string;
  selectedAt: Date;
}

interface LogisticsContextType {
  logisticProviders: LogisticProvider[];
  selectedLogistics: SelectedLogistics | null;
  selectLogistics: (provider: LogisticProvider) => Promise<void>;
  getAvailableProviders: (location?: string) => LogisticProvider[];
  updateLogisticSettings: (settings: Partial<SelectedLogistics>) => void;
  isLoading: boolean;
  error: string | null;
}

const LogisticsContext = createContext<LogisticsContextType | undefined>(undefined);

// Mock logistics data
const mockLogisticProviders: LogisticProvider[] = [
  {
    id: 'logistics-001',
    name: 'SwiftDeliver Express',
    logo: '🚚',
    description: 'Fast and reliable nationwide delivery service',
    coverageArea: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'],
    estimatedDelivery: '2-3 days',
    rating: 4.8,
    totalReviews: 2450,
    pricePerKg: 2.5,
    baseFee: 5.0,
    features: ['Real-time tracking', 'Insurance coverage', 'Signature required', 'Temperature control'],
    isActive: true,
    contactEmail: 'support@swiftdeliver.com',
    contactPhone: '+1-800-SWIFT-01',
  },
  {
    id: 'logistics-002',
    name: 'Premium Global Logistics',
    logo: '✈️',
    description: 'International and premium delivery solutions',
    coverageArea: ['Worldwide', 'Express available'],
    estimatedDelivery: '1-2 days',
    rating: 4.9,
    totalReviews: 3120,
    pricePerKg: 4.2,
    baseFee: 12.0,
    features: ['International shipping', 'Premium packaging', 'VIP tracking', 'Customs handling', 'White-glove service'],
    isActive: true,
    contactEmail: 'premium@globallogistics.com',
    contactPhone: '+1-800-PREMIUM-1',
  },
  {
    id: 'logistics-003',
    name: 'EcoShip Solutions',
    logo: '🌱',
    description: 'Sustainable and eco-friendly delivery options',
    coverageArea: ['North America', 'Europe'],
    estimatedDelivery: '3-5 days',
    rating: 4.6,
    totalReviews: 1890,
    pricePerKg: 1.8,
    baseFee: 3.0,
    features: ['Carbon-neutral delivery', 'Recyclable packaging', 'Scheduled delivery', 'Local hubs'],
    isActive: true,
    contactEmail: 'green@ecoshipsolutions.com',
    contactPhone: '+1-800-ECO-SHIP',
  },
  {
    id: 'logistics-004',
    name: 'FastTrack Regional',
    logo: '🚛',
    description: 'Regional specialist with best local coverage',
    coverageArea: ['California', 'Texas', 'Florida', 'New York'],
    estimatedDelivery: '2-4 days',
    rating: 4.7,
    totalReviews: 1650,
    pricePerKg: 2.0,
    baseFee: 4.0,
    features: ['Local pickup points', 'Same-day options', 'Flexible delivery', 'No size limits'],
    isActive: true,
    contactEmail: 'support@fasttrackregional.com',
    contactPhone: '+1-800-FAST-TRACK',
  },
  {
    id: 'logistics-005',
    name: 'LuxeShip Premium',
    logo: '💎',
    description: 'Luxury brand specialized delivery service',
    coverageArea: ['Metropolitan areas', 'Luxury districts'],
    estimatedDelivery: '24 hours',
    rating: 4.95,
    totalReviews: 980,
    pricePerKg: 6.5,
    baseFee: 25.0,
    features: ['Exclusive routes', 'Armed guards available', 'Luxury packaging', 'Concierge service', 'Insurance up to $100k'],
    isActive: true,
    contactEmail: 'luxury@luxeshipmx.com',
    contactPhone: '+1-800-LUXE-SHIP',
  },
];

export function LogisticsProvider({ children }: { children: ReactNode }) {
  const [logisticProviders] = useState<LogisticProvider[]>(mockLogisticProviders);
  const [selectedLogistics, setSelectedLogistics] = useState<SelectedLogistics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectLogistics = async (provider: LogisticProvider) => {
    try {
      setIsLoading(true);
      setError(null);

      // TODO: Replace with actual API call
      // await api.selectLogistics(provider.id);

      setSelectedLogistics({
        providerId: provider.id,
        providerName: provider.name,
        selectedAt: new Date(),
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to select logistics provider';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const getAvailableProviders = (location?: string): LogisticProvider[] => {
    if (!location) {
      return logisticProviders;
    }

    return logisticProviders.filter((provider) =>
      provider.coverageArea.some(
        (area) => area.toLowerCase().includes(location.toLowerCase()) || area === 'Worldwide' || area.includes('available')
      )
    );
  };

  const updateLogisticSettings = (settings: Partial<SelectedLogistics>) => {
    if (selectedLogistics) {
      setSelectedLogistics({
        ...selectedLogistics,
        ...settings,
      });
    }
  };

  return (
    <LogisticsContext.Provider
      value={{
        logisticProviders,
        selectedLogistics,
        selectLogistics,
        getAvailableProviders,
        updateLogisticSettings,
        isLoading,
        error,
      }}
    >
      {children}
    </LogisticsContext.Provider>
  );
}

export function useLogistics() {
  const context = useContext(LogisticsContext);
  if (context === undefined) {
    throw new Error('useLogistics must be used within a LogisticsProvider');
  }
  return context;
}
