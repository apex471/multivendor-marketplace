'use client';

import { getAuthToken } from '@/lib/api/auth';
import { useState, useEffect, useCallback, useRef } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

type DriverStatus  = 'offline' | 'online' | 'on-delivery';
type OrderStatus   = 'pending' | 'accepted' | 'picked-up' | 'in-transit' | 'delivered' | 'cancelled';
type LocPermission = 'prompt' | 'granted' | 'denied' | 'unavailable';

interface DriverLocation {
  lat:       number;
  lng:       number;
  accuracy:  number;
  heading:   number | null;
  speed:     number | null;
  area:      string;
  updatedAt: string;
}

interface DeliveryOrder {
  id:             string;
  orderId:        string;
  customer:       string;
  customerPhone:  string;
  pickupAddress:  string;
  pickupStore:    string;
  dropoffAddress: string;
  distance:       string;
  estimatedTime:  string;
  items:          string[];
  itemCount:      number;
  orderValue:     number;
  deliveryFee:    number;
  courierName:    string;
  courierIcon:    string;
  status:         OrderStatus;
  acceptedAt?:    string;
  pickedUpAt?:    string;
  deliveredAt?:   string;
  createdAt:      string;
}

const STATUS_STEPS: { key: OrderStatus; label: string; icon: string }[] = [
  { key: 'accepted',   label: 'Accepted',   icon: '✅' },
  { key: 'picked-up',  label: 'Picked Up',  icon: '📦' },
  { key: 'in-transit', label: 'In Transit', icon: '🚚' },
  { key: 'delivered',  label: 'Delivered',  icon: '🏠' },
];

const CTA_LABEL: Partial<Record<OrderStatus, string>> = {
  'accepted':   '📦  Confirm Pickup',
  'picked-up':  '🚚  Start Delivery',
  'in-transit': '✅  Mark as Delivered',
};

// ─── Reverse geocode (Nominatim — no API key needed) ─────────────────────────
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const d = await r.json();
    const a = d.address ?? {};
    return (
      a.suburb ?? a.neighbourhood ?? a.city_district ??
      a.city ?? a.town ?? a.village ?? 'Current location'
    );
  } catch {
    return 'Current location';
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LogisticsDashboard() {
  const [driverStatus,    setDriverStatus]    = useState<DriverStatus>('offline');
  const [activeTab,       setActiveTab]       = useState<'home' | 'history' | 'earnings'>('home');
  const [incomingOrder,   setIncomingOrder]   = useState<DeliveryOrder | null>(null);
  const [activeOrder,     setActiveOrder]     = useState<DeliveryOrder | null>(null);
  const [history,         setHistory]         = useState<DeliveryOrder[]>([]);
  const [countdown,       setCountdown]       = useState(15);
  const [providerName,    setProviderName]    = useState('Courier');
  const [todayEarnings,   setTodayEarnings]   = useState(0);
  const [todayDeliveries, setTodayDeliveries] = useState(0);
  const [weekEarnings,    setWeekEarnings]    = useState(0);
  const [monthEarnings,   setMonthEarnings]   = useState(0);
  const [showToggleSheet, setShowToggleSheet] = useState(false);
  const [toastMsg,        setToastMsg]        = useState('');
  const [deliveredFlash,  setDeliveredFlash]  = useState(false);

  // ── Location state ───────────────────────────────────────────────────────
  const [locPermission, setLocPermission] = useState<LocPermission>('prompt');
  const [driverLoc,     setDriverLoc]     = useState<DriverLocation | null>(null);
  const [locLoading,    setLocLoading]    = useState(false);
  const [locError,      setLocError]      = useState('');
  const watchIdRef   = useRef<number | null>(null);
  const incomingRef  = useRef<DeliveryOrder | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  }, []);

  // ── Load profile + today stats ──────────────────────────────────────────
  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;
    fetch('/api/dashboard/logistics', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const p = d.data.profile;
          setProviderName([p.firstName, p.lastName].filter(Boolean).join(' ') || 'Courier');
          const s = d.data.stats;
          if (s?.todayRevenue    > 0) setTodayEarnings(s.todayRevenue);
          if (s?.todayDeliveries > 0) setTodayDeliveries(s.todayDeliveries);
          if (s?.monthRevenue    > 0) setMonthEarnings(s.monthRevenue);
          if (s?.weekRevenue     > 0) setWeekEarnings(s.weekRevenue);
        }
      })
      .catch(() => {});
  }, []);

  // ── Load delivery history on mount ────────────────────────────────────────
  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;
    fetch('/api/logistics/orders?type=history', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.success && d.data.orders?.length > 0) setHistory(d.data.orders); })
      .catch(() => {});
  }, []);

  // ── Check location permission on mount ───────────────────────────────────
  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    if (!('geolocation' in navigator)) {
      setTimeout(() => setLocPermission('unavailable'), 0);
      return;
    }
    navigator.permissions?.query({ name: 'geolocation' }).then(result => {
      setLocPermission(result.state as LocPermission);
      result.onchange = () => setLocPermission(result.state as LocPermission);
    }).catch(() => {});
  }, []);

  // ── Start GPS watch ───────────────────────────────────────────────────────
  const startLocationWatch = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setLocPermission('unavailable');
      setLocError('GPS not available on this device');
      return;
    }
    setLocLoading(true);
    setLocError('');

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        setLocLoading(false);
        setLocPermission('granted');
        const { latitude: lat, longitude: lng, accuracy, heading, speed } = pos.coords;
        const area = await reverseGeocode(lat, lng);
        const loc: DriverLocation = {
          lat, lng, accuracy,
          heading: heading ?? null,
          speed:   speed ? Math.round(speed * 3.6) : null,
          area,
          updatedAt: new Date().toISOString(),
        };
        setDriverLoc(loc);
        // Broadcast to server
        const token = getAuthToken() ?? '';
        if (token) {
          fetch('/api/logistics/location', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(loc),
          }).catch(() => {});
        }
      },
      (err) => {
        setLocLoading(false);
        if (err.code === 1) {
          setLocPermission('denied');
          setLocError('Location denied. Enable it in browser settings.');
        } else {
          setLocError('Unable to get location. Check GPS signal.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
  }, []);

  // ── Stop GPS watch ────────────────────────────────────────────────────────
  const stopLocationWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setDriverLoc(null);
    setLocLoading(false);
  }, []);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => () => stopLocationWatch(), [stopLocationWatch]);

  // ── Keep incomingRef in sync for stale-closure-safe polling ────────────────
  useEffect(() => { incomingRef.current = incomingOrder; }, [incomingOrder]);

  // ── Poll /api/logistics/orders?type=queue when online ─────────────────────
  useEffect(() => {
    if (driverStatus !== 'online') {
      setTimeout(() => setIncomingOrder(null), 0);
      return;
    }
    const pollQueue = async () => {
      if (incomingRef.current) return; // already showing a request
      const token = getAuthToken() ?? '';
      if (!token) return;
      try {
        const r = await fetch('/api/logistics/orders?type=queue', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const d = await r.json();
        if (d.success && d.data.orders?.length > 0) {
          setIncomingOrder({ ...d.data.orders[0], status: 'pending' });
          setCountdown(15);
        }
      } catch { /* network error — retry on next interval */ }
    };
    pollQueue();
    const interval = setInterval(pollQueue, 8000);
    return () => clearInterval(interval);
  }, [driverStatus]);

  // ── Countdown ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!incomingOrder) return;
    if (countdown <= 0) {
      setTimeout(() => {
        setIncomingOrder(null);
        showToast('Request expired — looking for next order…');
      }, 0);
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [incomingOrder, countdown, showToast]);

  // ── Go online ─────────────────────────────────────────────────────────────
  const goOnline = useCallback(() => {
    setShowToggleSheet(false);
    setLocError('');
    startLocationWatch();
    setDriverStatus('online');
    showToast("🟢 You're online — waiting for orders");
  }, [startLocationWatch, showToast]);

  // ── Go offline ────────────────────────────────────────────────────────────
  const goOffline = useCallback(() => {
    setShowToggleSheet(false);
    stopLocationWatch();
    setDriverStatus('offline');
    setIncomingOrder(null);
    showToast("⛔ You're offline");
  }, [stopLocationWatch, showToast]);

  // ── Accept order ──────────────────────────────────────────────────────────
  const acceptOrder = async (order: DeliveryOrder) => {
    const token = getAuthToken() ?? '';
    try {
      await fetch('/api/logistics/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ orderId: order.orderId, action: 'accept', driverName: providerName }),
      });
    } catch { /* proceed with optimistic local update */ }
    setActiveOrder({ ...order, status: 'accepted', acceptedAt: new Date().toISOString() });
    setIncomingOrder(null);
    setDriverStatus('on-delivery');
    setActiveTab('home');
    showToast('Order accepted! Head to pickup');
  };

  // ── Decline order ─────────────────────────────────────────────────────────
  const declineOrder = async () => {
    const token = getAuthToken() ?? '';
    if (incomingOrder) {
      try {
        await fetch('/api/logistics/orders', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ orderId: incomingOrder.orderId, action: 'decline' }),
        });
      } catch { /* network error — still clear locally */ }
    }
    setIncomingOrder(null);
    showToast('Order declined');
  };

  // ── Advance delivery status ───────────────────────────────────────────────
  const advanceStatus = async () => {
    if (!activeOrder) return;
    const next: Partial<Record<OrderStatus, OrderStatus>> = {
      'accepted':   'picked-up',
      'picked-up':  'in-transit',
      'in-transit': 'delivered',
    };
    const nextStatus = next[activeOrder.status];
    if (!nextStatus) return;

    const apiActionMap: Partial<Record<OrderStatus, string>> = {
      'picked-up':  'pickup',
      'in-transit': 'transit',
      'delivered':  'delivered',
    };
    const apiAction = apiActionMap[nextStatus];
    const token = getAuthToken() ?? '';
    if (apiAction) {
      try {
        await fetch('/api/logistics/orders', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ orderId: activeOrder.orderId, action: apiAction }),
        });
      } catch { /* network error — proceed with optimistic update */ }
    }

    const updated: DeliveryOrder = {
      ...activeOrder, status: nextStatus,
      ...(nextStatus === 'picked-up' ? { pickedUpAt:  new Date().toISOString() } : {}),
      ...(nextStatus === 'delivered' ? { deliveredAt: new Date().toISOString() } : {}),
    };
    setActiveOrder(updated);
    if (nextStatus === 'delivered') {
      setDeliveredFlash(true);
      setTimeout(() => setDeliveredFlash(false), 2000);
      setTimeout(async () => {
        setHistory(h => [updated, ...h]);
        setTodayEarnings(e => +(e + updated.deliveryFee).toFixed(2));
        setTodayDeliveries(d => d + 1);
        setActiveOrder(null);
        setDriverStatus('online');
        showToast(`🎉 Delivered! +$${updated.deliveryFee.toFixed(2)} earned`);
        // Refresh history from API (replace optimistic with real data)
        if (token) {
          try {
            const r = await fetch('/api/logistics/orders?type=history', {
              headers: { Authorization: `Bearer ${token}` },
            });
            const d = await r.json();
            if (d.success && d.data.orders?.length > 0) setHistory(d.data.orders);
          } catch { /* keep optimistic entry */ }
        }
      }, 1800);
    }
  };

  const stepIndex        = activeOrder ? STATUS_STEPS.findIndex(s => s.key === activeOrder.status) : -1;
  const deliveredHistory = history.filter(o => o.status === 'delivered');

  const headingLabel = (h: number | null) => {
    if (h === null) return null;
    const dirs = ['N','NE','E','SE','S','SW','W','NW'];
    return dirs[Math.round(h / 45) % 8];
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col select-none">

      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-100 bg-gray-800 border border-yellow-600 text-white px-5 py-3 rounded-2xl shadow-2xl text-sm font-semibold whitespace-nowrap pointer-events-none animate-fade-in">
          {toastMsg}
        </div>
      )}

      {/* Delivered flash overlay */}
      {deliveredFlash && (
        <div className="fixed inset-0 z-90 flex items-center justify-center bg-black/50 pointer-events-none">
          <div className="text-center">
            <div className="text-8xl mb-3 animate-bounce">🎉</div>
            <p className="text-3xl font-black text-white">Delivered!</p>
            <p className="text-yellow-400 font-semibold mt-1">+${activeOrder?.deliveryFee.toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-700 rounded-full flex items-center justify-center font-black text-lg text-white shadow">
            {providerName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-white text-sm leading-tight">{providerName}</p>
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${
                driverStatus === 'online'      ? 'bg-green-400 animate-pulse' :
                driverStatus === 'on-delivery' ? 'bg-yellow-400 animate-pulse' : 'bg-gray-600'
              }`} />
              <p className="text-[10px] text-gray-400 leading-none">
                {driverStatus === 'online' ? 'Active' : driverStatus === 'on-delivery' ? 'On Delivery' : 'Offline'}
                {driverLoc && driverStatus !== 'offline' && (
                  <span className="text-gray-500"> · {driverLoc.area}</span>
                )}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => driverStatus !== 'on-delivery' && setShowToggleSheet(true)}
          disabled={driverStatus === 'on-delivery'}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
            driverStatus === 'online'      ? 'bg-green-600 text-white shadow-lg shadow-green-900/40' :
            driverStatus === 'on-delivery' ? 'bg-yellow-600 text-white cursor-not-allowed' :
                                             'bg-gray-700 text-gray-300'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${
            driverStatus === 'online'      ? 'bg-green-300 animate-pulse' :
            driverStatus === 'on-delivery' ? 'bg-yellow-200 animate-pulse' : 'bg-gray-500'
          }`} />
          {driverStatus === 'online' ? 'ONLINE' : driverStatus === 'on-delivery' ? 'ON DELIVERY' : 'OFFLINE'}
        </button>
      </header>

      {/* ── Go Online / Go Offline Bottom Sheet ─────────────────────────── */}
      {showToggleSheet && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center"
          onClick={() => setShowToggleSheet(false)}
        >
          <div
            className="bg-gray-800 border border-gray-700 rounded-t-3xl w-full max-w-md pb-8"
            onClick={e => e.stopPropagation()}
          >
            {driverStatus === 'offline' ? (
              <>
                {/* Faux map preview */}
                <div className="relative h-44 bg-gray-900 rounded-t-3xl overflow-hidden flex items-center justify-center">
                  <div className="absolute inset-0 opacity-20"
                    style={{ backgroundImage: 'linear-gradient(#4b5563 1px,transparent 1px),linear-gradient(90deg,#4b5563 1px,transparent 1px)', backgroundSize: '28px 28px' }} />
                  <div className="absolute inset-0">
                    <div className="absolute top-1/2 left-0 right-0 h-4 bg-gray-700/60 -translate-y-1/2" />
                    <div className="absolute left-1/2 top-0 bottom-0 w-4 bg-gray-700/60 -translate-x-1/2" />
                    <div className="absolute top-1/3 left-0 right-0 h-2 bg-gray-700/40 rotate-3" />
                    <div className="absolute top-2/3 left-0 right-0 h-2 bg-gray-700/40 -rotate-2" />
                  </div>
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="w-14 h-14 rounded-full bg-green-600/20 border-2 border-green-500 flex items-center justify-center animate-pulse">
                      <div className="w-6 h-6 rounded-full bg-green-500 shadow-lg shadow-green-500/50" />
                    </div>
                    {driverLoc ? (
                      <div className="mt-2 bg-gray-800/90 border border-gray-700 px-3 py-1 rounded-full text-xs text-white font-semibold">
                        📍 {driverLoc.area}
                      </div>
                    ) : (
                      <div className="mt-2 bg-gray-800/90 border border-gray-700 px-3 py-1 rounded-full text-xs text-gray-400">
                        {locPermission === 'denied' ? '🚫 Location blocked' : '📍 Location will activate on Go Online'}
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-0 inset-x-0 h-10 bg-linear-to-t from-gray-800 to-transparent" />
                </div>

                <div className="px-6 pt-5">
                  <h3 className="text-xl font-black text-white mb-1">Go Online?</h3>
                  <p className="text-sm text-gray-400 mb-4">
                    Start receiving delivery requests. Your location will be tracked while online.
                  </p>

                  {/* Location status card */}
                  <div className={`flex items-start gap-3 p-3.5 rounded-2xl mb-5 ${
                    locPermission === 'granted' ? 'bg-green-900/30 border border-green-800/50' :
                    locPermission === 'denied'  ? 'bg-red-900/30 border border-red-800/50' :
                                                  'bg-gray-700/50 border border-gray-600'
                  }`}>
                    <span className="text-2xl shrink-0 mt-0.5">
                      {locPermission === 'granted' ? '📍' : locPermission === 'denied' ? '🚫' : '📡'}
                    </span>
                    <div className="flex-1">
                      {locPermission === 'granted' && driverLoc && (
                        <>
                          <p className="text-green-300 font-semibold text-sm">Location active</p>
                          <p className="text-green-400/70 text-xs mt-0.5">
                            {driverLoc.area} · {driverLoc.lat.toFixed(4)}°, {driverLoc.lng.toFixed(4)}°
                            {driverLoc.accuracy < 50 ? ' · High accuracy' : ''}
                          </p>
                        </>
                      )}
                      {locPermission === 'granted' && !driverLoc && (
                        <p className="text-green-300 font-semibold text-sm">
                          {locLoading ? 'Getting location…' : 'Location activates when online'}
                        </p>
                      )}
                      {locPermission === 'denied' && (
                        <>
                          <p className="text-red-300 font-semibold text-sm">Location blocked</p>
                          <p className="text-red-400/70 text-xs mt-0.5">Enable in browser settings to go online</p>
                        </>
                      )}
                      {(locPermission === 'prompt' || locPermission === 'unavailable') && (
                        <>
                          <p className="text-gray-300 font-semibold text-sm">Location access needed</p>
                          <p className="text-gray-400 text-xs mt-0.5">
                            We&apos;ll request permission when you tap Go Online
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {locError && (
                    <div className="bg-red-900/20 border border-red-800/40 rounded-xl px-3 py-2 mb-4">
                      <p className="text-red-400 text-xs">{locError}</p>
                    </div>
                  )}

                  <button
                    onClick={goOnline}
                    disabled={locPermission === 'denied' || locPermission === 'unavailable'}
                    className="w-full py-4 bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-2xl mb-3 transition-colors text-base"
                  >
                    🟢 Go Online
                  </button>
                  {locPermission === 'denied' && (
                    <p className="text-center text-xs text-gray-400 mb-3">
                      Browser → Settings → Permissions → Location → Allow
                    </p>
                  )}
                  <button
                    onClick={() => setShowToggleSheet(false)}
                    className="w-full py-2 text-gray-400 hover:text-white text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              /* Go Offline sheet */
              <div className="px-6 pt-7">
                {/* Location summary */}
                {driverLoc && (
                  <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 mb-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-green-900/40 border border-green-700/50 rounded-full flex items-center justify-center text-xl shrink-0">
                        📍
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-bold text-sm">{driverLoc.area}</p>
                        <p className="text-gray-400 text-xs">
                          {driverLoc.lat.toFixed(5)}°, {driverLoc.lng.toFixed(5)}°
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wide">Accuracy</p>
                        <p className="text-xs font-bold text-white">±{Math.round(driverLoc.accuracy)}m</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-gray-800 rounded-xl py-2">
                        <p className="text-sm font-bold text-white">
                          {driverLoc.speed !== null ? `${driverLoc.speed} km/h` : '—'}
                        </p>
                        <p className="text-[10px] text-gray-400">Speed</p>
                      </div>
                      <div className="bg-gray-800 rounded-xl py-2">
                        <p className="text-sm font-bold text-white">
                          {headingLabel(driverLoc.heading) ?? '—'}
                        </p>
                        <p className="text-[10px] text-gray-400">Heading</p>
                      </div>
                      <div className="bg-gray-800 rounded-xl py-2">
                        <p className="text-xs font-bold text-green-400">● Live</p>
                        <p className="text-[10px] text-gray-400">GPS</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="text-5xl text-center mb-3">⛔</div>
                <h3 className="text-xl font-black text-center text-white mb-1">Go Offline?</h3>
                <p className="text-sm text-gray-400 text-center mb-6">
                  You&apos;ll stop receiving requests and GPS location tracking will pause.
                </p>
                <button
                  onClick={goOffline}
                  className="w-full py-4 bg-red-700 hover:bg-red-600 text-white font-bold rounded-2xl mb-3 transition-colors text-base"
                >
                  Go Offline
                </button>
                <button
                  onClick={() => setShowToggleSheet(false)}
                  className="w-full py-2 text-gray-400 hover:text-white text-sm transition-colors"
                >
                  Stay Online
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Incoming order card ───────────────────────────────────────────── */}
      {incomingOrder && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center">
          <div className="bg-gray-800 border border-gray-700 rounded-t-3xl w-full max-w-md p-5 pb-8">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-0.5">New Delivery Request</p>
                <p className="text-xl font-black text-white">{incomingOrder.pickupStore}</p>
                <p className="text-xs text-gray-400">{incomingOrder.courierIcon} {incomingOrder.courierName}</p>
              </div>
              {/* Countdown ring */}
              <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
                <svg className="absolute inset-0 -rotate-90" viewBox="0 0 40 40">
                  <circle cx="20" cy="20" r="17" fill="none" stroke="#374151" strokeWidth="3" />
                  <circle
                    cx="20" cy="20" r="17" fill="none" stroke="#D4A017" strokeWidth="3"
                    strokeDasharray={`${(countdown / 15) * 106.8} 106.8`}
                    className="transition-all duration-1000"
                  />
                </svg>
                <span className="text-lg font-bold text-yellow-400 relative z-10">{countdown}</span>
              </div>
            </div>

            {/* Route preview */}
            <div className="bg-gray-900 rounded-2xl p-4 mb-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-8 h-8 bg-green-900/60 border border-green-700 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-green-400 text-xs font-bold">A</span>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Pickup</p>
                  <p className="text-sm font-bold text-white">{incomingOrder.pickupStore}</p>
                  <p className="text-xs text-gray-400">{incomingOrder.pickupAddress}</p>
                </div>
              </div>
              <div className="ml-4 border-l-2 border-dashed border-gray-700 h-4 mb-3" />
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-yellow-900/60 border border-yellow-700 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-yellow-400 text-xs font-bold">B</span>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Drop-off</p>
                  <p className="text-sm font-bold text-white">{incomingOrder.customer}</p>
                  <p className="text-xs text-gray-400">{incomingOrder.dropoffAddress}</p>
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: 'Delivery Fee', value: `$${incomingOrder.deliveryFee.toFixed(2)}`, accent: true },
                { label: 'Distance',     value: incomingOrder.distance },
                { label: 'Est. Time',    value: incomingOrder.estimatedTime },
              ].map(s => (
                <div key={s.label} className="bg-gray-900 rounded-xl p-3 text-center">
                  <p className={`text-base font-bold ${s.accent ? 'text-yellow-400' : 'text-white'}`}>{s.value}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-400 mb-5">
              {incomingOrder.itemCount} item{incomingOrder.itemCount > 1 ? 's' : ''}: {incomingOrder.items.join(', ')}
              <span className="text-gray-500"> · Order value ${incomingOrder.orderValue.toFixed(2)}</span>
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={declineOrder}
                className="py-4 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-2xl transition-colors"
              >
                ✕  Decline
              </button>
              <button
                onClick={() => acceptOrder(incomingOrder)}
                className="py-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded-2xl transition-colors"
              >
                ✓  Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto pb-28">

        {/* ── HOME TAB ──────────────────────────────────────────────────── */}
        {activeTab === 'home' && (
          <div className="p-4 space-y-4 max-w-lg mx-auto">

            {/* OFFLINE state */}
            {driverStatus === 'offline' && (
              <div className="bg-gray-800 border border-gray-700 rounded-3xl overflow-hidden mt-4">
                <div className="relative h-52 bg-gray-900 flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 opacity-10"
                    style={{ backgroundImage: 'linear-gradient(#9ca3af 1px,transparent 1px),linear-gradient(90deg,#9ca3af 1px,transparent 1px)', backgroundSize: '24px 24px' }} />
                  <div className="absolute inset-0">
                    <div className="absolute top-1/2 left-0 right-0 h-5 bg-gray-700/50 -translate-y-1/2" />
                    <div className="absolute left-1/2 top-0 bottom-0 w-4 bg-gray-700/50 -translate-x-1/2" />
                  </div>
                  <div className="relative z-10 text-center">
                    <div className="w-16 h-16 rounded-full bg-gray-700 border-2 border-gray-600 flex items-center justify-center mx-auto mb-2">
                      <span className="text-3xl opacity-40">🔴</span>
                    </div>
                    <p className="text-gray-500 text-xs">GPS inactive · Go online to start</p>
                  </div>
                  <div className="absolute bottom-0 inset-x-0 h-14 bg-linear-to-t from-gray-800 to-transparent" />
                </div>
                <div className="p-8 text-center">
                  <h2 className="text-2xl font-black text-white mb-2">You&apos;re Offline</h2>
                  <p className="text-gray-400 text-sm mb-6">
                    Go online to start GPS tracking and receive delivery requests
                  </p>
                  <button
                    onClick={() => setShowToggleSheet(true)}
                    className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded-2xl transition-colors text-base"
                  >
                    🟢 Go Online
                  </button>
                </div>
              </div>
            )}

            {/* ONLINE + WAITING state */}
            {driverStatus === 'online' && !activeOrder && (
              <>
                {/* Live location card */}
                <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden mt-4">
                  <div className="relative h-36 bg-gray-900 flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 opacity-15"
                      style={{ backgroundImage: 'linear-gradient(#6b7280 1px,transparent 1px),linear-gradient(90deg,#6b7280 1px,transparent 1px)', backgroundSize: '22px 22px' }} />
                    <div className="absolute inset-0">
                      <div className="absolute top-1/2 left-0 right-0 h-5 bg-gray-700/60 -translate-y-1/2" />
                      <div className="absolute left-1/2 top-0 bottom-0 w-4 bg-gray-700/60 -translate-x-1/2" />
                    </div>
                    <div className="relative z-10 flex flex-col items-center">
                      {locLoading ? (
                        <>
                          <div className="w-12 h-12 rounded-full border-2 border-green-500 animate-ping opacity-75" />
                          <p className="text-green-400 text-xs mt-3 font-semibold">Getting location…</p>
                        </>
                      ) : driverLoc ? (
                        <>
                          <div className="relative">
                            <div className="w-12 h-12 rounded-full bg-green-600/20 border-2 border-green-500 flex items-center justify-center shadow-lg shadow-green-500/30">
                              <div className="w-5 h-5 rounded-full bg-green-500" />
                            </div>
                            <div className="absolute inset-0 rounded-full border-2 border-green-400/30 animate-ping" />
                          </div>
                          <div className="mt-2 bg-gray-800/90 border border-gray-700 px-3 py-1 rounded-full text-xs text-white font-semibold">
                            📍 {driverLoc.area}
                          </div>
                        </>
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-yellow-600/20 border-2 border-yellow-500/50 flex items-center justify-center">
                          <span className="text-2xl">📡</span>
                        </div>
                      )}
                    </div>
                    <div className="absolute bottom-0 inset-x-0 h-10 bg-linear-to-t from-gray-800 to-transparent" />
                  </div>

                  {driverLoc ? (
                    <div className="grid grid-cols-3 gap-px bg-gray-700 border-t border-gray-700">
                      <div className="bg-gray-800 px-3 py-3 text-center">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Coords</p>
                        <p className="text-xs font-bold text-white leading-tight">{driverLoc.lat.toFixed(4)}°</p>
                        <p className="text-xs font-bold text-white leading-tight">{driverLoc.lng.toFixed(4)}°</p>
                      </div>
                      <div className="bg-gray-800 px-3 py-3 text-center">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Accuracy</p>
                        <p className="text-xs font-bold text-white">±{Math.round(driverLoc.accuracy)}m</p>
                        <p className="text-[9px] text-green-400">{driverLoc.accuracy < 50 ? 'High' : 'Normal'}</p>
                      </div>
                      <div className="bg-gray-800 px-3 py-3 text-center">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">GPS</p>
                        <p className="text-xs font-bold text-green-400">● Live</p>
                        <p className="text-[9px] text-gray-400">Tracking</p>
                      </div>
                    </div>
                  ) : locError ? (
                    <div className="px-4 py-3 border-t border-gray-700">
                      <p className="text-red-400 text-xs text-center">{locError}</p>
                    </div>
                  ) : null}
                </div>

                {/* Waiting for orders pulse */}
                <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 text-center">
                  <div className="text-5xl mb-4">📡</div>
                  <h2 className="text-xl font-black text-white mb-2">Finding Orders…</h2>
                  <p className="text-gray-400 text-sm mb-6">
                    We&apos;ll notify you as soon as a delivery is available nearby
                  </p>
                  <div className="flex justify-center gap-2">
                    {[0, 1, 2].map(i => (
                      <div
                        key={i}
                        className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"
                        style={{ animationDelay: `${i * 0.25}s` }}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ON DELIVERY state */}
            {activeOrder && (
              <>
                {/* Progress tracker */}
                <div className="bg-gray-900 rounded-2xl overflow-hidden mt-4">
                  <div className="bg-yellow-600 px-5 py-3.5 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-yellow-100/80 font-semibold">Active Delivery</p>
                      <p className="text-white font-black text-lg">{activeOrder.orderId}</p>
                    </div>
                    <span className="text-3xl">{activeOrder.courierIcon}</span>
                  </div>
                  <div className="px-6 py-5">
                    <div className="relative flex items-start justify-between">
                      <div className="absolute top-4 left-4 right-4 h-0.5 bg-gray-700" />
                      <div
                        className="absolute top-4 left-4 h-0.5 bg-yellow-500 transition-all duration-700"
                        style={{ width: stepIndex > 0 ? `${(stepIndex / (STATUS_STEPS.length - 1)) * 100}%` : '0%' }}
                      />
                      {STATUS_STEPS.map((step, i) => (
                        <div key={step.key} className="flex flex-col items-center gap-1.5 relative z-10 flex-1">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                            i < stepIndex  ? 'bg-yellow-600 text-white' :
                            i === stepIndex ? 'bg-yellow-500 text-white ring-2 ring-yellow-300/50' : 'bg-gray-700 text-gray-500'
                          }`}>
                            {i < stepIndex ? '✓' : step.icon}
                          </div>
                          <p className={`text-[9px] text-center leading-tight max-w-12 ${
                            i <= stepIndex ? 'text-yellow-400 font-semibold' : 'text-gray-500'
                          }`}>{step.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Route card */}
                <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
                  <div className="p-4 flex gap-4">
                    <div className="flex flex-col items-center pt-1 shrink-0">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <div className="flex-1 border-l-2 border-dashed border-gray-600 my-1.5" />
                      <div className="w-3 h-3 rounded-sm bg-yellow-500" />
                    </div>
                    <div className="flex-1 space-y-4">
                      <div>
                        <p className="text-[10px] uppercase text-gray-400 tracking-wide mb-0.5">Pickup from</p>
                        <p className="text-sm font-bold text-white">{activeOrder.pickupStore}</p>
                        <p className="text-xs text-gray-400">{activeOrder.pickupAddress}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-gray-400 tracking-wide mb-0.5">Deliver to</p>
                        <p className="text-sm font-bold text-white">{activeOrder.customer}</p>
                        <p className="text-xs text-gray-400">{activeOrder.dropoffAddress}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xl font-bold text-yellow-400">${activeOrder.deliveryFee.toFixed(2)}</p>
                      <p className="text-[10px] text-gray-400">your fee</p>
                    </div>
                  </div>
                  <div className="border-t border-gray-700 px-4 py-3">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">
                      {activeOrder.itemCount} item{activeOrder.itemCount > 1 ? 's' : ''}
                    </p>
                    <p className="text-sm text-white">{activeOrder.items.join(' · ')}</p>
                  </div>
                  <div className="border-t border-gray-700 px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Customer</p>
                      <p className="text-sm font-bold text-white">{activeOrder.customer}</p>
                      <p className="text-xs text-gray-400">{activeOrder.customerPhone}</p>
                    </div>
                    <a
                      href={`tel:${activeOrder.customerPhone}`}
                      className="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center text-lg transition-colors"
                    >
                      📞
                    </a>
                  </div>
                </div>

                {/* Live GPS bar during delivery */}
                {driverLoc && (
                  <div className="bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-900/40 border border-green-700/50 rounded-full flex items-center justify-center shrink-0">
                      <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">📍 {driverLoc.area}</p>
                      <p className="text-[10px] text-gray-400">
                        {driverLoc.lat.toFixed(5)}°, {driverLoc.lng.toFixed(5)}° · ±{Math.round(driverLoc.accuracy)}m
                      </p>
                    </div>
                    <p className="text-[10px] text-green-400 shrink-0 font-semibold">● Live GPS</p>
                  </div>
                )}
              </>
            )}

            {/* Today summary */}
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-4 font-semibold">Today</p>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-2xl font-black text-yellow-400">${todayEarnings.toFixed(2)}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Earned</p>
                </div>
                <div className="border-x border-gray-700">
                  <p className="text-2xl font-black text-white">{todayDeliveries}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Deliveries</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-white">98%</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">On-Time</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── HISTORY TAB ──────────────────────────────────────────────── */}
        {activeTab === 'history' && (
          <div className="p-4 space-y-3 max-w-lg mx-auto">
            <div className="flex items-center justify-between pt-1 pb-1">
              <h2 className="text-lg font-black text-white">Order History</h2>
              <span className="text-xs text-gray-400 bg-gray-800 border border-gray-700 px-2.5 py-1 rounded-full">
                {history.length} orders
              </span>
            </div>
            {history.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-5xl mb-4">📋</div>
                <p className="text-white font-bold">No deliveries yet</p>
                <p className="text-gray-400 text-sm mt-1">Completed orders will appear here</p>
              </div>
            ) : history.map(order => (
              <div key={order.id} className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{order.courierIcon}</span>
                    <div>
                      <p className="text-sm font-bold text-white">{order.orderId}</p>
                      <p className="text-[11px] text-gray-400">
                        {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {' · '}
                        {new Date(order.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                    order.status === 'delivered' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
                  }`}>
                    {order.status === 'delivered' ? '✅ Delivered' : '❌ Cancelled'}
                  </span>
                </div>
                <div className="px-4 py-3 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-green-500 text-sm">●</span>
                    <span className="text-sm text-white">{order.pickupStore}</span>
                  </div>
                  <div className="pl-3 text-gray-600 text-xs">↓</div>
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-500 text-sm">■</span>
                    <span className="text-sm text-white">{order.customer} · {order.dropoffAddress.split(',')[0]}</span>
                  </div>
                </div>
                <div className="px-4 pb-3 flex items-center justify-between border-t border-gray-700 pt-2">
                  <p className="text-xs text-gray-400">{order.distance} · {order.itemCount} item{order.itemCount > 1 ? 's' : ''}</p>
                  <p className={`text-base font-bold ${order.status === 'delivered' ? 'text-yellow-400' : 'text-gray-600'}`}>
                    {order.status === 'delivered' ? `+$${order.deliveryFee.toFixed(2)}` : '—'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── EARNINGS TAB ─────────────────────────────────────────────── */}
        {activeTab === 'earnings' && (
          <div className="p-4 space-y-4 max-w-lg mx-auto">
            <h2 className="text-lg font-black text-white pt-1">Earnings</h2>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Today',      value: todayEarnings,  highlight: true  },
                { label: 'This Week',  value: weekEarnings,   highlight: false },
                { label: 'This Month', value: monthEarnings,  highlight: false },
              ].map(p => (
                <div key={p.label} className={`rounded-2xl p-4 border ${
                  p.highlight ? 'bg-yellow-700 border-yellow-600' : 'bg-gray-800 border-gray-700'
                }`}>
                  <p className="text-[11px] text-yellow-200/60 mb-1">{p.label}</p>
                  <p className="text-xl font-black text-white">${p.value.toFixed(2)}</p>
                </div>
              ))}
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-700">
                <p className="text-sm font-bold text-white">Delivery Breakdown</p>
              </div>
              {deliveredHistory.length === 0 ? (
                <div className="text-center py-10 text-gray-500 text-sm">No completed deliveries yet</div>
              ) : (
                <>
                  {deliveredHistory.map(order => (
                    <div key={order.id} className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-700/50 last:border-0">
                      <span className="text-2xl shrink-0">{order.courierIcon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">
                          {order.pickupStore} → {order.customer.split(' ')[0]}
                        </p>
                        <p className="text-[11px] text-gray-400">
                          {order.distance} · {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <p className="text-base font-bold text-yellow-400 shrink-0">+${order.deliveryFee.toFixed(2)}</p>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-4 py-3.5 bg-gray-700/50">
                    <p className="text-sm font-bold text-white">Total ({deliveredHistory.length} deliveries)</p>
                    <p className="text-base font-black text-yellow-400">
                      ${deliveredHistory.reduce((s, o) => s + o.deliveryFee, 0).toFixed(2)}
                    </p>
                  </div>
                </>
              )}
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 space-y-4">
              <p className="text-sm font-bold text-white">Performance</p>
              {[
                { label: 'On-Time Rate',          value: '98.5%', pct: 98.5, color: 'bg-green-500' },
                { label: 'Customer Satisfaction', value: '4.9 / 5', pct: 98, color: 'bg-yellow-500' },
                { label: 'Acceptance Rate',       value: '87%',   pct: 87,   color: 'bg-blue-500'  },
              ].map(m => (
                <div key={m.label}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-xs text-gray-400">{m.label}</span>
                    <span className="text-xs font-bold text-white">{m.value}</span>
                  </div>
                  <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div className={`h-full ${m.color} rounded-full transition-all`} style={{ width: `${m.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom navigation ─────────────────────────────────────────────── */}
      <nav className="fixed bottom-0 inset-x-0 bg-gray-900 border-t border-gray-800 flex z-40">
        {([
          { tab: 'home',     icon: '🏠', label: 'Home'     },
          { tab: 'history',  icon: '📋', label: 'History'  },
          { tab: 'earnings', icon: '💰', label: 'Earnings' },
        ] as const).map(({ tab, icon, label }) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-3 text-xs font-semibold transition-colors ${
              activeTab === tab ? 'text-yellow-400' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <span className="text-xl">{icon}</span>
            {label}
          </button>
        ))}
      </nav>

      {/* ── Sticky CTA (advance delivery status) ─────────────────────────── */}
      {activeOrder && CTA_LABEL[activeOrder.status] && (
        <div className="fixed bottom-16 inset-x-0 px-4 z-30">
          <button
            onClick={advanceStatus}
            className="w-full max-w-lg mx-auto block py-4 bg-yellow-600 hover:bg-yellow-500 active:bg-yellow-700 text-white font-black rounded-2xl text-base shadow-2xl shadow-yellow-900/40 transition-colors"
          >
            {CTA_LABEL[activeOrder.status]}
          </button>
        </div>
      )}
    </div>
  );
}
