'use client';

import { useState, useEffect, useCallback } from 'react';

interface Product {
  _id: string;
  name: string;
  vendorName: string;
  category: string;
  price: number;
  stock: number;
  status: 'pending' | 'active' | 'rejected' | 'suspended';
  featured: boolean;
  salesCount: number;
  rating: number;
  reviewCount: number;
  createdAt: string;
  rejectionReason?: string;
}

interface Counts { pending: number; active: number; rejected: number; suspended: number; }

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-900/40 text-yellow-300',
  active: 'bg-green-900/40 text-green-300',
  rejected: 'bg-red-900/40 text-red-300',
  suspended: 'bg-gray-700 text-cool-gray-300',
};

export default function ProductManagementPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [counts, setCounts] = useState<Counts>({ pending: 0, active: 0, rejected: 0, suspended: 0 });
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selected, setSelected] = useState<Product | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const fetchProducts = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const p = new URLSearchParams({
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(categoryFilter !== 'all' && { category: categoryFilter }),
        ...(search && { search }),
      });
      const res = await fetch(`/api/admin/products?${p}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setProducts(data.data.products);
      setCounts(data.data.counts);
      setCategories(data.data.categories || []);
    } catch { setError('Failed to load products.'); }
    finally { setLoading(false); }
  }, [statusFilter, categoryFilter, search]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const updateProduct = async (productId: string, update: Record<string, unknown>) => {
    setActionLoading(productId);
    try {
      const res = await fetch('/api/admin/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ productId, ...update }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed');
      showToast(data.message || 'Product updated');
      setSelected(null);
      fetchProducts();
    } catch (e: unknown) { showToast(e instanceof Error ? e.message : 'Failed'); }
    finally { setActionLoading(null); }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {toast && <div className="fixed top-4 right-4 z-50 bg-charcoal-800 border border-gold-600 text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-medium">{toast}</div>}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Product Management</h1>
        <p className="text-cool-gray-400 text-sm mt-1">Review, approve, and manage marketplace products</p>
      </div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        {(['pending', 'active', 'rejected', 'suspended'] as const).map(s => (
          <button key={s} onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)}
            className={`rounded-xl p-4 text-center border transition-all ${statusFilter === s ? 'border-gold-500 ring-1 ring-gold-500' : 'border-charcoal-700'} bg-charcoal-800`}>
            <div className={`text-2xl font-bold ${STATUS_COLORS[s].split(' ')[1]}`}>{counts[s]}</div>
            <div className="text-xs text-cool-gray-400 mt-0.5 capitalize">{s}</div>
          </button>
        ))}
      </div>
      {error && <div className="mb-4 p-4 bg-red-900/20 border border-red-700 rounded-xl text-red-300 text-sm">{error}</div>}
      <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <form onSubmit={e => { e.preventDefault(); setSearch(searchInput); }} className="flex gap-2">
            <input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Search products..."
              className="flex-1 px-4 py-2 bg-charcoal-700 border border-charcoal-600 text-white placeholder-cool-gray-500 rounded-lg text-sm outline-none focus:ring-2 focus:ring-gold-500" />
            <button type="submit" className="px-3 py-2 bg-gold-600 hover:bg-gold-500 text-white rounded-lg text-sm font-semibold">Go</button>
          </form>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-charcoal-700 border border-charcoal-600 text-white rounded-lg text-sm outline-none focus:ring-2 focus:ring-gold-500">
            <option value="all">All Status</option>
            {['pending', 'active', 'rejected', 'suspended'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
            className="px-4 py-2 bg-charcoal-700 border border-charcoal-600 text-white rounded-lg text-sm outline-none focus:ring-2 focus:ring-gold-500">
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="space-y-3">
        {loading ? <div className="text-center py-12 text-cool-gray-500">Loading products...</div>
          : products.length === 0 ? (
            <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl py-16 text-center">
              <div className="text-4xl mb-3">🛍️</div>
              <p className="text-white font-semibold">No products found</p>
              <p className="text-cool-gray-400 text-sm mt-1">Try changing your filters.</p>
            </div>
          ) : products.map(product => (
            <div key={product._id} className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-semibold">{product.name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[product.status]}`}>{product.status}</span>
                  {product.featured && <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gold-900/40 text-gold-400">⭐ Featured</span>}
                </div>
                <div className="text-sm text-cool-gray-400 mt-0.5">
                  <span className="text-cool-gray-300">{product.vendorName}</span>
                  {' · '}<span>{product.category}</span>
                  {' · '}<span className="text-white font-medium">${'{'}product.price.toFixed(2){'}'}</span>
                </div>
                <div className="text-xs text-cool-gray-500 mt-0.5">
                  Stock: {'{'}product.stock{'}'} · Sales: {'{'}product.salesCount{'}'} · Rating: {'{'}product.rating.toFixed(1){'}'} ({'{'}product.reviewCount{'}'}) · {'{'}new Date(product.createdAt).toLocaleDateString(){'}'}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                {product.status === 'pending' && (
                  <>
                    <button onClick={() => updateProduct(product._id, { status: 'active' })} disabled={actionLoading === product._id}
                      className="px-3 py-2 bg-green-700 hover:bg-green-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50">Approve</button>
                    <button onClick={() => { setSelected(product); setNewStatus('rejected'); setRejectionReason(''); }} disabled={actionLoading === product._id}
                      className="px-3 py-2 bg-red-800 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50">Reject</button>
                  </>
                )}
                <button onClick={() => { setSelected(product); setNewStatus(product.status); setRejectionReason(product.rejectionReason || ''); }}
                  className="px-3 py-2 bg-charcoal-600 hover:bg-charcoal-500 text-white text-xs font-semibold rounded-lg transition-colors">Edit</button>
              </div>
            </div>
          ))}
      </div>
      {selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-charcoal-800 border border-charcoal-700 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-charcoal-700">
              <div>
                <h2 className="text-lg font-bold text-white">Edit Product</h2>
                <p className="text-cool-gray-400 text-xs mt-0.5 truncate max-w-[260px]">{selected.name}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-cool-gray-400 hover:text-white text-2xl leading-none">×</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-cool-gray-400 mb-1.5">Status</label>
                <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
                  className="w-full px-4 py-2 bg-charcoal-700 border border-charcoal-600 text-white rounded-lg text-sm outline-none focus:ring-2 focus:ring-gold-500">
                  {['pending', 'active', 'rejected', 'suspended'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {newStatus === 'rejected' && (
                <div>
                  <label className="block text-xs font-semibold text-cool-gray-400 mb-1.5">Rejection Reason</label>
                  <textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)}
                    placeholder="Explain why the product is being rejected..." rows={3}
                    className="w-full px-4 py-3 bg-charcoal-700 border border-charcoal-600 text-white placeholder-cool-gray-500 rounded-xl text-sm outline-none focus:ring-2 focus:ring-gold-500 resize-none" />
                </div>
              )}
              <div className="flex items-center justify-between p-3 bg-charcoal-700 rounded-xl">
                <span className="text-sm text-white">Featured product</span>
                <button onClick={() => updateProduct(selected._id, { featured: !selected.featured })} disabled={actionLoading === selected._id}
                  className={`relative w-10 h-5 rounded-full transition-colors disabled:opacity-50 ${selected.featured ? 'bg-gold-500' : 'bg-charcoal-500'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${selected.featured ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>
              <button onClick={() => updateProduct(selected._id, { status: newStatus, ...(newStatus === 'rejected' && { rejectionReason }) })}
                disabled={actionLoading === selected._id}
                className="w-full py-3 bg-gold-600 hover:bg-gold-500 text-white font-semibold rounded-xl transition-colors disabled:opacity-50">
                {actionLoading === selected._id ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
