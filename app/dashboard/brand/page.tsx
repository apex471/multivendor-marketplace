'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
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

  useEffect(() => {
    const authToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
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

  const [affiliateRequests, setAffiliateRequests] = useState<AffiliateRequest[]>([
    {
      id: '1',
      vendorName: 'Sarah Johnson',
      storeName: 'Elegant Boutique',
      email: 'sarah@elegantboutique.com',
      phone: '+1 (555) 123-4567',
      requestDate: '2024-01-15',
      status: 'pending',
      message: 'I would love to feature your luxury brand in my boutique. My store specializes in high-end fashion and has been in business for 5 years.',
    },
    {
      id: '2',
      vendorName: 'Michael Chen',
      storeName: 'Style Hub',
      email: 'michael@stylehub.com',
      phone: '+1 (555) 234-5678',
      requestDate: '2024-01-14',
      status: 'pending',
      message: 'Your brand aligns perfectly with our customer base. We have 3 physical locations and a strong online presence.',
    },
    {
      id: '3',
      vendorName: 'Emily Davis',
      storeName: 'Fashion Forward',
      email: 'emily@fashionforward.com',
      phone: '+1 (555) 345-6789',
      requestDate: '2024-01-13',
      status: 'pending',
      message: 'Interested in carrying your luxury line. We have established relationships with high-end clientele.',
    },
  ]);

  const [affiliatePartners, _setAffiliatePartners] = useState<AffiliatePartner[]>([
    {
      id: '1',
      vendorName: 'Jessica Martinez',
      storeName: 'Luxury Lane',
      email: 'jessica@luxurylane.com',
      joinedDate: '2023-11-20',
      commissionRate: 15,
      totalSales: 45600,
      productsListed: 32,
      status: 'active',
    },
    {
      id: '2',
      vendorName: 'David Kim',
      storeName: 'Premium Style Co',
      email: 'david@premiumstyle.com',
      joinedDate: '2023-10-15',
      commissionRate: 12,
      totalSales: 67800,
      productsListed: 45,
      status: 'active',
    },
    {
      id: '3',
      vendorName: 'Amanda White',
      storeName: 'Chic Collection',
      email: 'amanda@chiccollection.com',
      joinedDate: '2023-12-01',
      commissionRate: 10,
      totalSales: 28900,
      productsListed: 23,
      status: 'active',
    },
  ]);

  const handleRequestAction = useCallback((requestId: string, action: 'approve' | 'reject') => {
    setAffiliateRequests(prev =>
      prev.map(req =>
        req.id === requestId
          ? { ...req, status: action === 'approve' ? 'approved' : 'rejected' }
          : req
      )
    );
    alert(`Request ${action === 'approve' ? 'approved' : 'rejected'} successfully!`);
  }, []);

  const handleLogout = () => {
    router.push('/auth/login');
  };

  // Tab content via useMemo — avoids "components during render" lint error
  const logisticsTab = useMemo(() => (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-linear-to-br from-gray-900 to-gray-700 text-white rounded-xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-display font-bold mb-1">Logistics Management</h2>
            <p className="text-white/70 text-sm">
              Browse trusted delivery partners and invite logistics companies to join CLW.
            </p>
          </div>
          <Link
            href="/logistics/providers"
            className="shrink-0 inline-flex items-center gap-2 px-5 py-3 bg-yellow-500 hover:bg-yellow-400 text-gray-900 rounded-xl font-bold text-sm transition-all"
          >
            <span>🚚</span> Browse Providers
          </Link>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: '📦', label: 'Active Shipments', value: '8', color: 'bg-blue-50 border-blue-200 text-blue-700' },
          { icon: '✅', label: 'Delivery Rate', value: '98.5%', color: 'bg-green-50 border-green-200 text-green-700' },
          { icon: '⏱️', label: 'Avg Delivery', value: '1.9 days', color: 'bg-purple-50 border-purple-200 text-purple-700' },
          { icon: '⭐', label: 'Provider Rating', value: '4.9/5', color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.color.split(' ').slice(0, 2).join(' ')}`}>
            <div className="text-2xl mb-1">{s.icon}</div>
            <p className="text-xs font-medium text-gray-600 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color.split(' ')[2]}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Invite Logistics Provider */}
      <div className="bg-white rounded-xl shadow-md p-5 sm:p-6 border-2 border-dashed border-yellow-400">
        <div className="flex items-start gap-4 mb-5">
          <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center text-2xl shrink-0">🔗</div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Invite a Logistics Provider</h3>
            <p className="text-sm text-gray-600">
              As a brand owner, you can generate a unique referral link and share it with a logistics company. They&apos;ll use it to register on CLW. Customers cannot generate or view these invitations.
            </p>
          </div>
        </div>

        {!referralLink ? (
          <button
            onClick={handleGenerateReferral}
            className="w-full sm:w-auto px-6 py-3 bg-yellow-600 text-white rounded-xl hover:bg-yellow-700 transition-colors font-semibold"
          >
            🔗 Generate Referral Link
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <span className="text-green-600 font-bold text-sm shrink-0">✓ Ready</span>
              <input
                type="text"
                readOnly
                value={referralLink}
                className="flex-1 bg-transparent text-xs text-gray-600 outline-none font-mono truncate"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleCopyReferral}
                className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  referralCopied ? 'bg-green-600 text-white' : 'bg-yellow-600 text-white hover:bg-yellow-700'
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
                className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors"
              >
                📧 Send via Email
              </button>
              <button
                onClick={() => setReferralLink('')}
                className="px-4 py-2.5 text-gray-500 rounded-xl font-semibold text-sm hover:bg-gray-100 transition-colors"
              >
                ↺ Reset
              </button>
            </div>
            <p className="text-xs text-gray-500">⏰ This link expires in 7 days. Each use creates a new registration application that you can track from the admin panel once approved.</p>
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
        <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2"><span>ℹ️</span> Why invite logistics providers?</h4>
        <ul className="space-y-1.5 text-sm text-blue-800">
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
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Total Products</h3>
            <span className="text-2xl">📦</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{brandStats.totalProducts}</p>
          <p className="text-xs text-gray-500 mt-2">In your catalog</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Active Affiliates</h3>
            <span className="text-2xl">🤝</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{brandStats.totalAffiliates}</p>
          <p className="text-xs text-gray-500 mt-2">{brandStats.pendingRequests} pending requests</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Total Revenue</h3>
            <span className="text-2xl">💰</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">${brandStats.totalRevenue.toLocaleString()}</p>
          <p className="text-xs text-green-600 mt-2">+12% from last month</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Monthly Revenue</h3>
            <span className="text-2xl">📈</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">${brandStats.monthRevenue.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-2">Current month</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Affiliate Earnings</h3>
            <span className="text-2xl">💸</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">${brandStats.affiliateEarnings.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-2">Paid to partners</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Pending Requests</h3>
            <span className="text-2xl">⏳</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{brandStats.pendingRequests}</p>
          <p className="text-xs text-yellow-600 mt-2">Requires action</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-display font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={() => setActiveTab('products')}
            className="px-4 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors min-h-11"
          >
            Add Product
          </button>
          <button
            onClick={() => setActiveTab('affiliates')}
            className="px-4 py-3 bg-yellow-600 text-white rounded-lg font-semibold hover:bg-yellow-700 transition-colors min-h-11"
          >
            Review Requests
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className="px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors min-h-11"
          >
            View Analytics
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className="px-4 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors min-h-11"
          >
            Settings
          </button>
        </div>
      </div>
    </div>
  ), [brandStats, setActiveTab]);

  const productsTab = useMemo(() => (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-display font-bold text-gray-900">Product Catalog</h2>
        <button className="px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors min-h-11">
          + Add Product
        </button>
      </div>
      <div className="text-center py-12">
        <span className="text-6xl mb-4 block">📦</span>
        <p className="text-gray-600 mb-4">Manage your product catalog here</p>
        <p className="text-sm text-gray-500">Add products that affiliates can showcase in their stores</p>
      </div>
    </div>
  ), []);

  const affiliatesTab = useMemo(() => (
    <div className="space-y-6">
      {/* Pending Requests */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-display font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="text-2xl">⏳</span>
          Pending Partnership Requests ({affiliateRequests.filter(r => r.status === 'pending').length})
        </h2>
        <div className="space-y-4">
          {affiliateRequests
            .filter(req => req.status === 'pending')
            .map(request => (
              <div key={request.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-linear-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {request.vendorName.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{request.vendorName}</h3>
                        <p className="text-sm text-gray-600">{request.storeName}</p>
                      </div>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600 ml-15">
                      <p>📧 {request.email}</p>
                      <p>📱 {request.phone}</p>
                      <p>📅 Requested: {new Date(request.requestDate).toLocaleDateString()}</p>
                    </div>
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700">{request.message}</p>
                    </div>
                  </div>
                  <div className="flex sm:flex-col gap-2">
                    <button
                      onClick={() => handleRequestAction(request.id, 'approve')}
                      className="flex-1 sm:flex-none px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors min-h-11"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => handleRequestAction(request.id, 'reject')}
                      className="flex-1 sm:flex-none px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors min-h-11"
                    >
                      ✗ Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          {affiliateRequests.filter(r => r.status === 'pending').length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No pending requests</p>
            </div>
          )}
        </div>
      </div>

      {/* Active Partners */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-display font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="text-2xl">🤝</span>
          Active Affiliate Partners ({affiliatePartners.length})
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Partner</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Commission</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Products</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Total Sales</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Joined</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {affiliatePartners.map(partner => (
                <tr key={partner.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-4">
                    <div>
                      <p className="font-semibold text-gray-900">{partner.vendorName}</p>
                      <p className="text-sm text-gray-600">{partner.storeName}</p>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="font-semibold text-yellow-600">{partner.commissionRate}%</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-gray-900">{partner.productsListed}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="font-semibold text-green-600">${partner.totalSales.toLocaleString()}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm text-gray-600">{new Date(partner.joinedDate).toLocaleDateString()}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      partner.status === 'active' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-700'
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
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-display font-bold text-gray-900 mb-4">Analytics & Reports</h2>
      <div className="text-center py-12">
        <span className="text-6xl mb-4 block">📊</span>
        <p className="text-gray-600 mb-4">Detailed analytics and performance metrics</p>
        <p className="text-sm text-gray-500">Track sales, affiliate performance, and revenue trends</p>
      </div>
    </div>
  ), []);

  const settingsTab = useMemo(() => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-display font-bold text-gray-900 mb-4">Brand Settings</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Brand Name</label>
            <input
              type="text"
              defaultValue="Luxury Brand Co."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent min-h-11"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Default Commission Rate (%)</label>
            <input
              type="number"
              defaultValue="10"
              min="0"
              max="100"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent min-h-11"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Brand Description</label>
            <textarea
              rows={4}
              defaultValue="A premium luxury brand offering certified high-end fashion products."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            />
          </div>
          <button className="px-6 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors min-h-11">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  ), []);

  return (
    <div className="min-h-screen bg-linear-to-br from-gold-600/10 via-white to-gold-600/5 dark:from-charcoal-900 dark:via-charcoal-900 dark:to-charcoal-800">
      {/* Header */}
      <header className="bg-white dark:bg-charcoal-800 border-b border-cool-gray-300 dark:border-charcoal-700 shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">👑</span>
              <div>
                <h1 className="text-xl sm:text-2xl font-display font-bold text-gray-900">Brand Dashboard</h1>
                <p className="text-xs sm:text-sm text-gray-600">Luxury Brand Co.</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors text-sm sm:text-base min-h-11"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Tabs */}
        <div className="mb-6 sm:mb-8">
          <div className="border-b border-gray-200 overflow-x-auto">
            <nav className="flex gap-4 sm:gap-8 min-w-max" aria-label="Tabs">
              {[
                { id: 'overview', label: 'Overview', icon: '📊' },
                { id: 'products', label: 'Products', icon: '📦' },
                { id: 'affiliates', label: 'Affiliates', icon: '🤝' },
                { id: 'analytics', label: 'Analytics', icon: '📈' },
                { id: 'logistics', label: 'Logistics', icon: '🚚' },
                { id: 'settings', label: 'Settings', icon: '⚙️' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`
                    py-3 sm:py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors min-h-11
                    ${activeTab === tab.id
                      ? 'border-yellow-600 text-yellow-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
