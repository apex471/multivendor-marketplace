import { NextRequest } from 'next/server';
import { connectDB } from '@/backend/config/database';
import { sendSuccess, sendServerError } from '@/backend/utils/responseAppRouter';

// GET /api/logistics/providers — returns all active logistics providers
export async function GET(_req: NextRequest) {
  try {
    await connectDB();

    // Attempt to load from DB if a LogisticsProvider model is available.
    // Falls back to a curated static list so checkout never breaks even before
    // an admin has configured providers in the database.
    let providers: unknown[] = [];

    try {
      // Dynamic import so the build never fails if the model doesn't exist yet.
      const mod = require('@/backend/models/LogisticsProvider');
      if (mod?.default) {
        providers = await mod.default.find({ isActive: true }).lean();
      }
    } catch {
      // Model not yet created — fall through to static list
    }

    if (!providers || providers.length === 0) {
      providers = [
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
    }

    return sendSuccess({ providers });
  } catch {
    return sendServerError();
  }
}
