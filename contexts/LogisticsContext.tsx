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

export function LogisticsProvider({ children }: { children: ReactNode }) {
  const [logisticProviders, setLogisticProviders] = useState<LogisticProvider[]>([]);
  const [selectedLogistics, setSelectedLogistics] = useState<SelectedLogistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/logistics/providers')
      .then(r => r.json())
      .then(json => {
        if (json.success && Array.isArray(json.data?.providers)) {
          setLogisticProviders(json.data.providers);
        }
      })
      .catch(() => { /* non-critical — providers stay empty */ })
      .finally(() => setIsLoading(false));
  }, []);

  const selectLogistics = async (provider: LogisticProvider) => {
    try {
      setIsLoading(true);
      setError(null);

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
