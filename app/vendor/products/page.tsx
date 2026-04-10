'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Header from '../../../components/common/Header';
import Footer from '../../../components/common/Footer';
import { getAuthToken } from '@/lib/api/auth';

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  status: 'active' | 'draft' | 'out-of-stock' | 'pending' | 'rejected';
  category: string;
  image: string;
  sales: number;
  sku: string;
  createdAt: string;
}

interface RawProduct {
  _id: string;
  name: string;
  price: number;
  stock?: number;
  status: Product['status'];
  category: string;
  images?: string[];
  salesCount?: number;
  sku?: string;
  createdAt: string;
}


export default function VendorProductsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft' | 'out-of-stock'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 10;

  const [products,   setProducts]   = useState<Product[]>([]);
  const [stats,      setStats]      = useState({ total: 0, active: 0, outOfStock: 0, draft: 0 });
  const [isLoading,  setIsLoading]  = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Debounce search input so we don't fire on every keystroke
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery]);

  const fetchProducts = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page:  String(currentPage),
        limit: String(productsPerPage),
      });
      if (debouncedSearch)          params.set('search',   debouncedSearch);
      if (statusFilter !== 'all')   params.set('status',   statusFilter);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);

      const res  = await fetch(`/api/vendor/products?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        const normalized: Product[] = (json.data.products as RawProduct[]).map(p => ({
          id:        p._id,
          name:      p.name,
          price:     p.price,
          stock:     p.stock ?? 0,
          status:    p.status,
          category:  p.category,
          image:     p.images?.[0] ?? '/images/placeholder.jpg',
          sales:     p.salesCount ?? 0,
          sku:       p.sku ?? '—',
          createdAt: p.createdAt,
        }));
        setProducts(normalized);
        setTotalPages(json.data.pagination.totalPages);
        setTotalCount(json.data.pagination.total);
        setStats({
          total:      json.data.pagination.total,
          active:     normalized.filter(p => p.status === 'active').length,
          outOfStock: normalized.filter(p => p.status === 'out-of-stock').length,
          draft:      normalized.filter(p => p.status === 'draft').length,
        });
      }
    } catch (err) {
      console.error('[VendorProducts] fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, debouncedSearch, statusFilter, categoryFilter]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const categories = ['All', 'Dresses', 'Accessories', 'Bags', 'Shoes'];

  const startIndex = (currentPage - 1) * productsPerPage;
  const paginatedProducts = products; // server paginates

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedProducts(paginatedProducts.map(p => p.id));
    } else {
      setSelectedProducts([]);
    }
  };

  const handleSelectProduct = (productId: string) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0) return;
    if (!confirm(`Delete ${selectedProducts.length} selected product(s)?`)) return;
    const token = getAuthToken();
    await Promise.all(
      selectedProducts.map(id =>
        fetch(`/api/vendor/products/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        })
      )
    );
    setSelectedProducts([]);
    fetchProducts();
  };

  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedProducts.length === 0) return;
    const token = getAuthToken();
    await Promise.all(
      selectedProducts.map(id =>
        fetch(`/api/vendor/products/${id}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        })
      )
    );
    setSelectedProducts([]);
    fetchProducts();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400';
      case 'draft':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400';
      case 'out-of-stock':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400';
      default:
        return 'bg-cool-gray-100 dark:bg-charcoal-700 text-charcoal-700 dark:text-cool-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      <Header />

      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-charcoal-900 dark:text-white mb-2">
              My Products
            </h1>
            <p className="text-charcoal-600 dark:text-cool-gray-400">
              Manage your product inventory
            </p>
          </div>
          <Link
            href="/vendor/products/add"
            className="px-6 py-3 bg-gold-600 text-white rounded-lg hover:bg-gold-700 transition-colors font-semibold flex items-center gap-2"
          >
            <span className="text-xl">+</span>
            Add Product
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg p-4">
            <p className="text-sm text-charcoal-600 dark:text-cool-gray-400 mb-1">Total Products</p>
            <p className="text-2xl font-bold text-charcoal-900 dark:text-white">{stats.total}</p>
          </div>
          <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg p-4">
            <p className="text-sm text-charcoal-600 dark:text-cool-gray-400 mb-1">Active</p>
            <p className="text-2xl font-bold text-green-600">
              {stats.active}
            </p>
          </div>
          <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg p-4">
            <p className="text-sm text-charcoal-600 dark:text-cool-gray-400 mb-1">Out of Stock</p>
            <p className="text-2xl font-bold text-red-600">
              {stats.outOfStock}
            </p>
          </div>
          <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg p-4">
            <p className="text-sm text-charcoal-600 dark:text-cool-gray-400 mb-1">Draft</p>
            <p className="text-2xl font-bold text-yellow-600">
              {stats.draft}
            </p>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg p-4 mb-6">
          <div className="grid md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <input
                type="text"
                placeholder="Search products by name or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-white"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'draft' | 'out-of-stock')}
              className="px-4 py-2 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="out-of-stock">Out of Stock</option>
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-white"
            >
              {categories.map(cat => (
                <option key={cat} value={cat.toLowerCase()}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedProducts.length > 0 && (
          <div className="bg-gold-50 dark:bg-gold-900/20 border border-gold-300 dark:border-gold-700 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-charcoal-900 dark:text-white font-semibold">
                {selectedProducts.length} product(s) selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleBulkStatusChange('active')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                >
                  Set Active
                </button>
                <button
                  onClick={() => handleBulkStatusChange('draft')}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm"
                >
                  Set Draft
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Products Table */}
        <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-cool-gray-50 dark:bg-charcoal-900 border-b border-cool-gray-300 dark:border-charcoal-700">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={selectedProducts.length === paginatedProducts.length && paginatedProducts.length > 0}
                      className="w-4 h-4 text-gold-600 border-cool-gray-300 rounded"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal-700 dark:text-cool-gray-300 uppercase">
                    Product
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal-700 dark:text-cool-gray-300 uppercase">
                    SKU
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal-700 dark:text-cool-gray-300 uppercase">
                    Price
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal-700 dark:text-cool-gray-300 uppercase">
                    Stock
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal-700 dark:text-cool-gray-300 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal-700 dark:text-cool-gray-300 uppercase">
                    Sales
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-charcoal-700 dark:text-cool-gray-300 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cool-gray-200 dark:divide-charcoal-700">
                {isLoading && Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-4 bg-cool-gray-200 dark:bg-charcoal-700 rounded" />
                      </td>
                    ))}
                  </tr>
                ))}
                {!isLoading && paginatedProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-cool-gray-50 dark:hover:bg-charcoal-900 transition-colors">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(product.id)}
                        onChange={() => handleSelectProduct(product.id)}
                        className="w-4 h-4 text-gold-600 border-cool-gray-300 rounded"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0">
                          <Image src={product.image} alt={product.name} fill className="object-cover" />
                        </div>
                        <div>
                          <p className="font-semibold text-charcoal-900 dark:text-white">{product.name}</p>
                          <p className="text-sm text-charcoal-600 dark:text-cool-gray-400">{product.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-charcoal-700 dark:text-cool-gray-300">
                      {product.sku}
                    </td>
                    <td className="px-4 py-4 font-semibold text-charcoal-900 dark:text-white">
                      ${product.price.toFixed(2)}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`${product.stock === 0 ? 'text-red-600' : product.stock < 10 ? 'text-yellow-600' : 'text-green-600'}`}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(product.status)}`}>
                        {product.status.replace('-', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-charcoal-700 dark:text-cool-gray-300">
                      {product.sales}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/vendor/products/${product.id}/edit`}
                          className="px-3 py-1 text-sm text-gold-600 dark:text-gold-500 hover:underline"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={async () => {
                            if (!confirm('Delete this product?')) return;
                            const token = getAuthToken();
                            await fetch(`/api/vendor/products/${product.id}`, {
                              method: 'DELETE',
                              headers: { Authorization: `Bearer ${token}` },
                            });
                            fetchProducts();
                          }}
                          className="px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-cool-gray-300 dark:border-charcoal-700">
              <div className="text-sm text-charcoal-600 dark:text-cool-gray-400">
                Showing {startIndex + 1} to {Math.min(startIndex + productsPerPage, totalCount)} of {totalCount} products
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
