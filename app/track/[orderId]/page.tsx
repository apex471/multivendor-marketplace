'use client';

import { useState, useEffect, use, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import { getAuthToken } from '@/lib/api/auth';

interface TrackingTimelineItem {
  label: string;
  time: string | null;
  done: boolean;
}

interface TrackingData {
  orderId: string;
  orderRef: string;
  status: string;
  trackingNumber: string | null;
  customer: string;
  dropoffAddress: string;
  courierName: string | null;
  courierIcon: string;
  estimatedDelivery: string | null;
  assignedDriverName: string | null;
  driverLocation: {
    lat: number;
    lng: number;
    area: string;
    updatedAt: string;
  } | null;
  timeline: TrackingTimelineItem[];
  items: Array<{ name: string; quantity: number; price: number }>;
  total: number;
}

function TrackingDetail({ orderIdPromise }: { orderIdPromise: Promise<string> }) {
  const orderId = use(orderIdPromise);
  const [data, setData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTracking = async () => {
      try {
        const token = getAuthToken();
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`/api/orders/${orderId}/track`, { headers });
        const json = await res.json();

        if (!json.success) {
          throw new Error(json.message || 'Failed to load tracking details');
        }
        setData(json.data.tracking);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tracking');
      } finally {
        setLoading(false);
      }
    };

    fetchTracking();
    const interval = setInterval(fetchTracking, 15000); // Poll every 15s for live updates
    return () => clearInterval(interval);
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="animate-spin w-10 h-10 border-4 border-gold-600 border-t-transparent rounded-full mb-3" />
        <p className="text-cool-gray-500 dark:text-cool-gray-400 text-sm">Locating package...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-md mx-auto text-center py-16 bg-white dark:bg-charcoal-900 border border-cool-gray-150 dark:border-charcoal-800 rounded-2xl p-6 shadow-sm">
        <span className="text-5xl block mb-4">🔍</span>
        <h2 className="text-lg font-bold text-charcoal-900 dark:text-white mb-2">Tracking not found</h2>
        <p className="text-xs text-cool-gray-500 dark:text-cool-gray-400 mb-5 leading-relaxed">
          {error || 'Unable to load tracking details for this order.'}
        </p>
        <Link href="/" className="inline-block px-5 py-2.5 bg-gold-600 hover:bg-gold-700 text-white rounded-xl text-xs font-semibold transition-colors">
          Return Home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Summary Card */}
      <div className="bg-white dark:bg-charcoal-900 border border-cool-gray-150 dark:border-charcoal-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-6 border-b border-cool-gray-100 dark:border-charcoal-800">
          <div>
            <span className="text-[10px] uppercase font-bold text-gold-600 tracking-wider">Live Delivery Status</span>
            <h1 className="text-xl font-bold text-charcoal-900 dark:text-white mt-1">
              Order #{data.orderRef.slice(-6).toUpperCase()}
            </h1>
            {data.trackingNumber && (
              <p className="text-xs text-cool-gray-400 mt-1 font-mono">Tracking ID: {data.trackingNumber}</p>
            )}
          </div>
          <span className="px-3.5 py-1.5 bg-gold-500/10 text-gold-600 dark:text-gold-400 border border-gold-500/20 text-xs font-bold rounded-full uppercase tracking-wider">
            {data.status}
          </span>
        </div>

        {/* Courier / Driver Info */}
        <div className="grid sm:grid-cols-2 gap-5 mb-6">
          <div className="flex items-center gap-3.5 p-4 rounded-xl bg-cool-gray-50 dark:bg-charcoal-800 border border-cool-gray-100 dark:border-charcoal-700">
            <span className="text-3xl shrink-0">{data.courierIcon}</span>
            <div>
              <p className="text-[10px] text-cool-gray-400 uppercase font-semibold">Delivery Partner</p>
              <p className="font-bold text-sm text-charcoal-900 dark:text-white mt-0.5">{data.courierName || 'Assigned Courier'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-4 rounded-xl bg-cool-gray-50 dark:bg-charcoal-800 border border-cool-gray-100 dark:border-charcoal-700">
            <span className="text-3xl shrink-0">👤</span>
            <div>
              <p className="text-[10px] text-cool-gray-400 uppercase font-semibold">Assigned Courier / Driver</p>
              <p className="font-bold text-sm text-charcoal-900 dark:text-white mt-0.5">{data.assignedDriverName || 'Awaiting assignment'}</p>
            </div>
          </div>
        </div>

        {/* Delivery Address */}
        <div className="p-4 rounded-xl border border-cool-gray-100 dark:border-charcoal-800 space-y-1">
          <p className="text-[10px] text-cool-gray-400 uppercase font-semibold">Dropoff Destination</p>
          <p className="text-sm font-semibold text-charcoal-800 dark:text-cool-gray-200">{data.customer}</p>
          <p className="text-xs text-cool-gray-500 dark:text-cool-gray-400 leading-relaxed">{data.dropoffAddress}</p>
        </div>
      </div>

      {/* Live Map / Driver Coordinates Banner */}
      {data.driverLocation && (
        <div className="bg-white dark:bg-charcoal-900 border border-cool-gray-150 dark:border-charcoal-800 rounded-2xl p-6 shadow-sm">
          <h2 className="text-sm font-bold text-charcoal-900 dark:text-white mb-3 flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" /> Live Courier GPS Location
          </h2>
          <div className="bg-cool-gray-50 dark:bg-charcoal-800 rounded-xl p-4 border border-cool-gray-100 dark:border-charcoal-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div>
              <p className="text-xs text-charcoal-700 dark:text-cool-gray-300 font-semibold">📍 Current Area: {data.driverLocation.area}</p>
              <p className="text-[10px] text-cool-gray-400 mt-1">Coordinates: {data.driverLocation.lat.toFixed(6)}, {data.driverLocation.lng.toFixed(6)}</p>
            </div>
            <p className="text-[10px] text-cool-gray-400">Last updated: {new Date(data.driverLocation.updatedAt).toLocaleTimeString()}</p>
          </div>
        </div>
      )}

      {/* Delivery Timeline / Tracking Steps */}
      <div className="bg-white dark:bg-charcoal-900 border border-cool-gray-150 dark:border-charcoal-800 rounded-2xl p-6 shadow-sm">
        <h2 className="text-sm font-bold text-charcoal-900 dark:text-white mb-6">Delivery Progress</h2>
        <div className="relative pl-6 border-l-2 border-cool-gray-100 dark:border-charcoal-800 space-y-8 ml-2">
          {data.timeline.map((step, idx) => {
            const isCompleted = step.done;
            return (
              <div key={idx} className="relative">
                {/* Timeline node dot */}
                <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 transition-all ${
                  isCompleted 
                    ? 'bg-gold-600 border-gold-600 shadow-md shadow-gold-600/20' 
                    : 'bg-white dark:bg-charcoal-900 border-cool-gray-200 dark:border-charcoal-800'
                }`} />
                <div>
                  <h3 className={`text-sm font-bold ${isCompleted ? 'text-charcoal-900 dark:text-white' : 'text-cool-gray-400 dark:text-cool-gray-600'}`}>
                    {step.label}
                  </h3>
                  {step.time && (
                    <p className="text-[10px] text-cool-gray-400 mt-1">
                      {new Date(step.time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function TrackPage({ params }: { params: Promise<{ orderId: string }> }) {
  const orderIdPromise = params.then(p => p.orderId);

  return (
    <div className="min-h-screen bg-cool-gray-50 dark:bg-charcoal-950">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin w-10 h-10 border-4 border-gold-600 border-t-transparent rounded-full mb-3" />
            <p className="text-cool-gray-500 dark:text-cool-gray-400 text-sm">Locating package...</p>
          </div>
        }>
          <TrackingDetail orderIdPromise={orderIdPromise} />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
