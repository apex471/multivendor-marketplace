'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getAuthToken } from '@/lib/api/auth';
import { buildLogisticsReferralUrl } from '@/lib/utils/referral';

type TabType = 'overview' | 'products' | 'affiliates' | 'analytics' | 'settings' | 'logistics';

interface AffiliateRequest {
  id: string;
  vendorName: string;
  storeName: string;
  email: string;
  phone: string;
  requestDate: string;
  status: 'pending' | 'approved' | 'rejected';
  message: string;
}

interface AffiliatePartner {
  id: string;
  vendorName: string;
  storeName: string;
  email: string;
  joinedDate: string;
  commissionRate: number;
  totalSales: number;
  productsListed: number;
  status: 'active' | 'paused';
}

interface BrandStats {
  totalProducts: number;
  activeProducts: number;
  pendingProducts: number;
  totalRevenue: number;
  monthRevenue: number;
  totalAffiliates: number;
  pendingRequests: number;
  affiliateEarnings: number;
}

export default function BrandDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [referralLink, setReferralLink] = useState('');
  const [referralCopied, setReferralCopied] = useState(false);
  const [brandStats, setBrandStats] = useState<BrandStats>({
    totalProducts: 0, activeProducts: 0, pendingProducts: 0,
    totalRevenue: 0, monthRevenue: 0,
    totalAffiliates: 0, pendingRequests: 0, affiliateEarnings: 0,
  });
  const [_statsLoading, setStatsLoading] = useState(true);

  // Products state
  interface BrandProduct {
    id: string; name: string; price: number; stock: number;
    status: string; category: string; image: string; sku: string;
  }
  const [products, setProducts] = useState<BrandProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  const fetchProducts = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;
    setProductsLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (productSearch) params.set('search', productSearch);
      const res = await fetch(`/api/vendor/products?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setProducts((json.data.products as Array<{ _id: string; name: string; price: number; stock?: number; status: string; category: string; images?: string[]; sku?: string }>).map(p => ({
          id: p._id, name: p.name, price: p.price, stock: p.stock ?? 0,
          status: p.status, category: p.category,
          image: p.images?.[0] ?? '/images/placeholder.jpg', sku: p.sku ?? '—',
        })));
      }
    } catch { /* silent */ }
    finally { setProductsLoading(false); }
  }, [productSearch]);

  useEffect(() => {
    if (activeTab === 'products') fetchProducts();
  }, [activeTab, fetchProducts]);

  useEffect(() => {
    const authToken = getAuthToken();
    if (!authToken) return;
    fetch('/api/dashboard/brand', { headers: { Authorization: `Bearer ${authToken}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setBrandStats(d.data.stats); })
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, []);

  const handleGenerateReferral = () => {
    const url = buildLogisticsReferralUrl(
      user?.id || 'brand-id',
      'brand',
      user?.username || 'CLW Brand'
    );
    setReferralLink(url);
    setReferralCopied(false);
  };

  const handleCopyReferral = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = referralLink;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setReferralCopied(true);
    setTimeout(() => setReferralCopied(false), 2500);
  };

  const [affiliateRequests, setAffiliateRequests] = useState<AffiliateRequest[]>([]);
  const [affiliatePartners, _setAffiliatePartners] = useState<AffiliatePartner[]>([]);

  // Fetch affiliate data — no dedicated API yet; stub for future wiring
  useEffect(() => {
    const authToken = getAuthToken();
    if (!authToken) return;
    // TODO: replace with real endpoint once affiliate model is implemented
    // fetch('/api/brand/affiliates', { headers: { Authorization: `Bearer ${authToken}` } })
    //   .then(r => r.json())
    //   .then(d => { if (d.success) { setAffiliateRequests(d.data.requests); _setAffiliatePartners(d.data.partners); } });
  }, []);

  const handleRequestAction = useCallback((requestId: string, action: 'approve' | 'reject') => {
    // TODO: call /api/brand/affiliates PATCH when endpoint is available
    setAffiliateRequests(prev =>
      prev.map(req =>
        req.id === requestId
          ? { ...req, status: action === 'approve' ? 'approved' : 'rejected' }
          : req
      )
    );
  }, []);

  const handleLogout = () => {
    router.push('/auth/login');
  };

  // Tab content via useMemo — avoids "components during render" lint error
  const logisticsTab = useMemo(() => (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-linear-to-br from-charcoal-950 to-charcoal-800 border border-charcoal-700 text-white rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-display font-bold mb-1">Logistics Management</h2>
            <p className="text-cool-gray-400 text-sm">
              Browse trusted delivery partners and invite logistics companies to join CLW.
            </p>
          </div>
          <Link
            href="/logistics/providers"
            className="shrink-0 inline-flex items-center gap-2 px-5 py-3 bg-gold-600 hover:bg-gold-500 text-charcoal-950 rounded-xl font-bold text-sm transition-all"
          >
            <span>🚚</span> Browse Providers
          </Link>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: '📦', label: 'Active Shipments', value: brandStats.totalProducts > 0 ? '—' : '0',      color: 'bg-charcoal-800 border-charcoal-700 text-white' },
          { icon: '✅', label: 'Delivery Rate',    value: '—',                                            color: 'bg-charcoal-800 border-charcoal-700 text-white' },
          { icon: '⏱️', label: 'Avg Delivery',     value: '—',                                            color: 'bg-charcoal-800 border-charcoal-700 text-white' },
          { icon: '⭐', label: 'Provider Rating',  value: '—',                                            color: 'bg-charcoal-800 border-charcoal-700 text-white' },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.color.split(' ').slice(0, 2).join(' ')}`}>
            <div className="text-2xl mb-1">{s.icon}</div>
            <p className="text-xs font-medium text-cool-gray-500 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color.split(' ')[2]}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Invite Logistics Provider */}
      <div className="bg-charcoal-800 border-2 border-dashed border-gold-600/50 rounded-2xl p-5 sm:p-6">
        <div className="flex items-start gap-4 mb-5">
          <div className="w-12 h-12 bg-gold-900/20 border border-gold-700/40 rounded-xl flex items-center justify-center text-2xl shrink-0">🔗</div>
          <div>
            <h3 className="text-lg font-bold text-white mb-1">Invite a Logistics Provider</h3>
            <p className="text-sm text-cool-gray-400">
              As a brand owner, you can generate a unique referral link and share it with a logistics company. They&apos;ll use it to register on CLW. Customers cannot generate or view these invitations.
            </p>
          </div>
        </div>

        {!referralLink ? (
          <button
            onClick={handleGenerateReferral}
            className="w-full sm:w-auto px-6 py-3 bg-gold-600 text-charcoal-950 rounded-xl hover:bg-gold-500 transition-colors font-bold"
          >
            🔗 Generate Referral Link
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-charcoal-700 border border-charcoal-600 rounded-lg">
              <span className="text-gold-400 font-bold text-sm shrink-0">✓ Ready</span>
              <input
                type="text"
                readOnly
                value={referralLink}
                className="flex-1 bg-transparent text-xs text-cool-gray-400 outline-none font-mono truncate"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleCopyReferral}
                className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  referralCopied ? 'bg-emerald-700 text-white' : 'bg-gold-600 text-charcoal-950 hover:bg-gold-500'
                }`}
              >
                {referralCopied ? '✓ Copied!' : '📋 Copy Link'}
              </button>
              <button
                onClick={() => {
                  const subject = encodeURIComponent('Join CLW as a Logistics Provider');
                  const body = encodeURIComponent(
                    `Hi,\n\nAs a brand owner on CLW (Certified Luxury World), I\'d like to invite you to join our platform as a certified logistics provider.\n\nRegister here (link valid for 7 days):\n${referralLink}\n\nBest regards`
                  );
                  window.open(`mailto:?subject=${subject}&body=${body}`);
                }}
                className="px-5 py-2.5 border border-charcoal-600 text-cool-gray-300 rounded-xl font-semibold text-sm hover:bg-charcoal-700 transition-colors"
              >
                📧 Send via Email
              </button>
              <button
                onClick={() => setReferralLink('')}
                className="px-4 py-2.5 text-cool-gray-500 rounded-xl font-semibold text-sm hover:bg-charcoal-700 transition-colors"
              >
                ↺ Reset
              </button>
            </div>
            <p className="text-xs text-cool-gray-500">⏰ This link expires in 7 days. Each use creates a new registration application that you can track from the admin panel once approved.</p>
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="bg-charcoal-800/60 border border-charcoal-700 rounded-xl p-5">
        <h4 className="font-semibold text-cool-gray-200 mb-2 flex items-center gap-2"><span>ℹ️</span> Why invite logistics providers?</h4>
        <ul className="space-y-1.5 text-sm text-cool-gray-400">
          <li>• Ensure your orders are handled by logistics companies you personally vetted</li>
          <li>• Invite companies that specialize in luxury goods, fragile items, or white-glove delivery</li>
          <li>• Invited providers must pass CLW&apos;s approval process before appearing in the directory</li>
          <li>• Your referral is tracked — you become the primary contact for that provider relationship</li>
        </ul>
      </div>
    </div>
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [referralLink, referralCopied]);

  const overviewTab = useMemo(() => (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-cool-gray-400">Total Products</h3>
            <span className="text-2xl">📦</span>
          </div>
          <p className="text-3xl font-bold text-white">{brandStats.totalProducts}</p>
          <p className="text-xs text-cool-gray-500 mt-2">In your catalog</p>
        </div>

        <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-cool-gray-400">Active Affiliates</h3>
            <span className="text-2xl">🤝</span>
          </div>
          <p className="text-3xl font-bold text-cool-gray-600">—</p>
          <p className="text-xs text-cool-gray-500 mt-2">Affiliate system coming soon</p>
        </div>

        <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-cool-gray-400">Total Revenue</h3>
            <span className="text-2xl">💰</span>
          </div>
          <p className="text-3xl font-bold text-white">${brandStats.totalRevenue.toLocaleString()}</p>
          <p className="text-xs text-cool-gray-500 mt-2">Total revenue earned</p>
        </div>

        <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-cool-gray-400">Monthly Revenue</h3>
            <span className="text-2xl">📈</span>
          </div>
          <p className="text-3xl font-bold text-white">${brandStats.monthRevenue.toLocaleString()}</p>
          <p className="text-xs text-cool-gray-500 mt-2">Current month</p>
        </div>

        <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-cool-gray-400">Affiliate Earnings</h3>
            <span className="text-2xl">💸</span>
          </div>
          <p className="text-3xl font-bold text-white">${brandStats.affiliateEarnings.toLocaleString()}</p>
          <p className="text-xs text-cool-gray-500 mt-2">Paid to partners</p>
        </div>

        <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-cool-gray-400">Pending Requests</h3>
            <span className="text-2xl">⏳</span>
          </div>
          <p className="text-3xl font-bold text-white">{brandStats.pendingRequests}</p>
          <p className="text-xs text-gold-500 mt-2">Requires action</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-6">
        <h2 className="text-xl font-display font-bold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={() => router.push('/vendor/products/add')}
            className="px-4 py-3 bg-gold-600 hover:bg-gold-500 text-charcoal-950 rounded-xl font-bold transition-colors min-h-11"
          >
            ➕ Add Product
          </button>
          <button
            onClick={() => setActiveTab('affiliates')}
            className="px-4 py-3 bg-charcoal-700 hover:bg-charcoal-600 border border-charcoal-600 text-cool-gray-200 rounded-xl font-semibold transition-colors min-h-11"
          >
            📋 Review Requests
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className="px-4 py-3 bg-charcoal-700 hover:bg-charcoal-600 border border-charcoal-600 text-cool-gray-200 rounded-xl font-semibold transition-colors min-h-11"
          >
            📊 View Analytics
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className="px-4 py-3 bg-charcoal-700 hover:bg-charcoal-600 border border-charcoal-600 text-cool-gray-200 rounded-xl font-semibold transition-colors min-h-11"
          >
            ⚙️ Settings
          </button>
        </div>
      </div>
    </div>
  ), [brandStats, setActiveTab, router]);

  const productsTab = useMemo(() => (
    <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-display font-bold text-white">Product Catalog</h2>
        <button
          onClick={() => router.push('/vendor/products/add')}
          className="px-4 py-2 bg-gold-600 hover:bg-gold-500 text-charcoal-950 rounded-xl font-bold transition-colors min-h-11"
        >
          + Add Product
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search products…"
          value={productSearch}
          onChange={e => setProductSearch(e.target.value)}
          className="w-full px-4 py-2 rounded-lg bg-charcoal-900 border border-charcoal-700 text-white placeholder-cool-gray-500 focus:outline-none focus:border-gold-500"
        />
      </div>

      {productsLoading ? (
        <div className="text-center py-12 text-cool-gray-400">Loading products…</div>
      ) : products.length === 0 ? (
        <div className="text-center py-12">
          <span className="text-6xl mb-4 block">📦</span>
          <p className="text-cool-gray-400 mb-4">No products yet</p>
          <p className="text-sm text-cool-gray-500 mb-6">Add products that affiliates can showcase in their stores</p>
          <button
            onClick={() => router.push('/vendor/products/add')}
            className="px-6 py-3 bg-gold-600 hover:bg-gold-500 text-charcoal-950 rounded-xl font-bold transition-colors"
          >
            + Add Your First Product
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-charcoal-700 text-cool-gray-400 text-left">
                <th className="pb-3 pr-4">Product</th>
                <th className="pb-3 pr-4">Category</th>
                <th className="pb-3 pr-4">Price</th>
                <th className="pb-3 pr-4">Stock</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id} className="border-b border-charcoal-700/50 hover:bg-charcoal-700/30 transition-colors">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-charcoal-700 shrink-0">
                        <Image src={p.image} alt={p.name} width={40} height={40} className="object-cover w-full h-full" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">{p.name}</p>
                        <p className="text-xs text-cool-gray-500">SKU: {p.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-cool-gray-300">{p.category}</td>
                  <td className="py-3 pr-4 text-white font-semibold">${p.price.toFixed(2)}</td>
                  <td className="py-3 pr-4 text-cool-gray-300">{p.stock}</td>
                  <td className="py-3 pr-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      p.status === 'active'   ? 'bg-green-900/40 text-green-400' :
                      p.status === 'pending'  ? 'bg-yellow-900/40 text-yellow-400' :
                      p.status === 'rejected' ? 'bg-red-900/40 text-red-400' :
                      'bg-charcoal-700 text-cool-gray-400'
                    }`}>
                      {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                    </span>
                  </td>
                  <td className="py-3">
                    <button
                      onClick={() => router.push(`/vendor/products/${p.id}`)}
                      className="text-gold-400 hover:text-gold-300 text-xs font-semibold"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  ), [products, productsLoading, productSearch, setProductSearch, router]);

  const affiliatesTab = useMemo(() => (
    <div className="space-y-6">
      {/* Coming Soon notice */}
      <div className="bg-gold-900/20 border border-gold-700/40 rounded-xl p-4 flex items-start gap-3">
        <span className="text-2xl">🚧</span>
        <div>
          <p className="font-semibold text-gold-300">Affiliate Management — Coming Soon</p>
          <p className="text-sm text-gold-400/80 mt-1">
            Full affiliate management (approvals, commissions, payouts) is under active development.
            Changes made here are not yet saved and will not be reflected to partners.
          </p>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-display font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="text-2xl">⏳</span>
          Pending Partnership Requests ({affiliateRequests.filter(r => r.status === 'pending').length})
        </h2>
        <div className="space-y-4">
          {affiliateRequests
            .filter(req => req.status === 'pending')
            .map(request => (
              <div key={request.id} className="border border-charcoal-700 rounded-xl p-4 hover:border-charcoal-600 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-linear-to-br from-gold-700 to-gold-500 rounded-full flex items-center justify-center text-charcoal-950 font-bold text-lg">
                        {request.vendorName.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{request.vendorName}</h3>
                        <p className="text-sm text-cool-gray-400">{request.storeName}</p>
                      </div>
                    </div>
                    <div className="space-y-1 text-sm text-cool-gray-400 ml-15">
                      <p>📧 {request.email}</p>
                      <p>📱 {request.phone}</p>
                      <p>📅 Requested: {new Date(request.requestDate).toLocaleDateString()}</p>
                    </div>
                    <div className="mt-3 p-3 bg-charcoal-700 rounded-lg">
                      <p className="text-sm text-cool-gray-300">{request.message}</p>
                    </div>
                  </div>
                  <div className="flex sm:flex-col gap-2">
                    <button
                      onClick={() => handleRequestAction(request.id, 'approve')}
                      className="flex-1 sm:flex-none px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-semibold transition-colors min-h-11"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => handleRequestAction(request.id, 'reject')}
                      className="flex-1 sm:flex-none px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-xl font-semibold transition-colors min-h-11"
                    >
                      ✗ Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          {affiliateRequests.filter(r => r.status === 'pending').length === 0 && (
            <div className="text-center py-8">
              <p className="text-cool-gray-500">No pending requests</p>
            </div>
          )}
        </div>
      </div>

      {/* Active Partners */}
      <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-6">
        <h2 className="text-xl font-display font-bold text-white mb-4 flex items-center gap-2">
          <span className="text-2xl">🤝</span>
          Active Affiliate Partners ({affiliatePartners.length})
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-charcoal-700">
                <th className="text-left py-3 px-4 text-sm font-semibold text-cool-gray-400">Partner</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-cool-gray-400">Commission</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-cool-gray-400">Products</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-cool-gray-400">Total Sales</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-cool-gray-400">Joined</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-cool-gray-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {affiliatePartners.map(partner => (
                <tr key={partner.id} className="border-b border-charcoal-700/50 hover:bg-charcoal-700/30">
                  <td className="py-4 px-4">
                    <div>
                      <p className="font-semibold text-white">{partner.vendorName}</p>
                      <p className="text-sm text-cool-gray-400">{partner.storeName}</p>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="font-semibold text-gold-500">{partner.commissionRate}%</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-white">{partner.productsListed}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="font-semibold text-emerald-400">${partner.totalSales.toLocaleString()}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm text-cool-gray-400">{new Date(partner.joinedDate).toLocaleDateString()}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      partner.status === 'active'
                        ? 'bg-emerald-900/30 text-emerald-400'
                        : 'bg-charcoal-700 text-cool-gray-400'
                    }`}>
                      {partner.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  ), [affiliateRequests, affiliatePartners, handleRequestAction]);

  const analyticsTab = useMemo(() => (
    <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-6">
      <h2 className="text-xl font-display font-bold text-white mb-4">Analytics & Reports</h2>
      <div className="text-center py-12">
        <span className="text-6xl mb-4 block">📊</span>
        <p className="text-cool-gray-400 mb-4">Detailed analytics and performance metrics</p>
        <p className="text-sm text-cool-gray-500">Track sales, affiliate performance, and revenue trends</p>
      </div>
    </div>
  ), []);

  const settingsTab = useMemo(() => (
    <div className="space-y-6">
      <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-6">
        <h2 className="text-xl font-display font-bold text-white mb-6">Brand Settings</h2>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const fd   = new FormData(form);
            const authToken = getAuthToken();
            if (!authToken) return;
            const nameParts = String(fd.get('brandName') ?? '').trim().split(' ');
            await fetch('/api/auth/profile', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
              body: JSON.stringify({
                firstName: nameParts[0] || '',
                lastName:  nameParts.slice(1).join(' ') || '',
                bio: fd.get('description'),
              }),
            });
          }}
          className="space-y-5"
        >
          <div>
            <label className="block text-sm font-semibold text-cool-gray-300 mb-2">Brand Name</label>
            <input
              name="brandName"
              type="text"
              defaultValue={user?.fullName || ''}
              className="w-full px-4 py-3 bg-charcoal-700 border border-charcoal-600 text-white rounded-xl focus:ring-2 focus:ring-gold-500 focus:border-transparent outline-none min-h-11"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-cool-gray-300 mb-2">Default Commission Rate (%)</label>
            <input
              type="number"
              defaultValue="10"
              min="0"
              max="100"
              className="w-full px-4 py-3 bg-charcoal-700 border border-charcoal-600 text-white rounded-xl focus:ring-2 focus:ring-gold-500 focus:border-transparent outline-none min-h-11"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-cool-gray-300 mb-2">Brand Description</label>
            <textarea
              name="description"
              rows={4}
              defaultValue={(user as unknown as Record<string,string>)?.bio || ''}
              placeholder="Describe your brand…"
              className="w-full px-4 py-3 bg-charcoal-700 border border-charcoal-600 text-white rounded-xl focus:ring-2 focus:ring-gold-500 focus:border-transparent outline-none placeholder:text-cool-gray-600"
            />
          </div>
          <button type="submit" className="px-6 py-3 bg-gold-600 hover:bg-gold-500 text-charcoal-950 rounded-xl font-bold transition-colors min-h-11">
            Save Changes
          </button>
        </form>
      </div>
    </div>
  ), [user]);

  return (
    <div className="min-h-screen bg-charcoal-950">
      {/* Header */}
      <header className="bg-charcoal-900 border-b border-charcoal-800 shadow-lg shadow-charcoal-950/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="shrink-0">
                <Image
                  src="/images/brand/clw-logo.png"
                  alt="CLW"
                  width={40}
                  height={28}
                  className="h-9 w-auto object-contain"
                />
              </Link>
              <div className="hidden sm:block w-px h-8 bg-charcoal-700" />
              <div>
                <h1 className="text-lg sm:text-xl font-display font-bold text-white flex items-center gap-2">
                  <span>👑</span> Brand Dashboard
                </h1>
                <p className="text-xs text-cool-gray-500">{user?.fullName || user?.email || 'My Brand'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/" className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-cool-gray-400 hover:text-gold-400 transition-colors">
                ← Marketplace
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-2 border border-charcoal-700 hover:border-red-700/50 text-cool-gray-400 hover:text-red-400 rounded-xl text-sm font-semibold transition-colors min-h-9"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

        {/* Brand identity strip */}
        <div className="mb-6 p-5 bg-charcoal-900 border border-charcoal-800 rounded-2xl flex items-center gap-4">
          <div className="w-1 h-12 bg-linear-to-b from-gold-500 to-gold-700 rounded-full shrink-0" />
          <div>
            <p className="text-gold-500 text-xs font-semibold tracking-widest uppercase mb-0.5">Brand Owner Portal</p>
            <h2 className="text-xl font-display font-bold text-white">{user?.fullName || 'My Brand'}</h2>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 sm:mb-8">
          <div className="border-b border-charcoal-800 overflow-x-auto">
            <nav className="flex gap-1 min-w-max" aria-label="Tabs">
              {[
                { id: 'overview',   label: 'Overview',   icon: '📊' },
                { id: 'products',   label: 'Products',   icon: '📦' },
                { id: 'affiliates', label: 'Affiliates', icon: '🤝' },
                { id: 'analytics',  label: 'Analytics',  icon: '📈' },
                { id: 'logistics',  label: 'Logistics',  icon: '🚚' },
                { id: 'settings',   label: 'Settings',   icon: '⚙️' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`
                    py-3 sm:py-4 px-3 sm:px-5 border-b-2 font-medium text-sm whitespace-nowrap transition-all min-h-11
                    ${activeTab === tab.id
                      ? 'border-gold-500 text-gold-400'
                      : 'border-transparent text-cool-gray-500 hover:text-cool-gray-300 hover:border-charcoal-600'
                    }
                  `}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'overview' && overviewTab}
          {activeTab === 'products' && productsTab}
          {activeTab === 'affiliates' && affiliatesTab}
          {activeTab === 'analytics' && analyticsTab}
          {activeTab === 'logistics' && logisticsTab}
          {activeTab === 'settings' && settingsTab}
        </div>
      </main>
    </div>
  );
}
