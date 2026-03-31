'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Header from '../../../components/common/Header';
import Footer from '../../../components/common/Footer';

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  status: 'active' | 'draft' | 'out-of-stock';
  category: string;
  image: string;
  sales: number;
  sku: string;
  createdAt: string;
}

export default function VendorProductsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft' | 'out-of-stock'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 10;

  // Mock products data
  const [products] = useState<Product[]>([
    {
      id: '1',
      name: 'Designer Silk Dress',
      price: 299.99,
      stock: 23,
      status: 'active',
      category: 'Dresses',
      image: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=200',
      sales: 156,
      sku: 'DRS-001',
      createdAt: '2025-11-15'
    },
    {
      id: '2',
      name: 'Evening Clutch',
      price: 149.99,
      stock: 0,
      status: 'out-of-stock',
      category: 'Accessories',
      image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=200',
      sales: 89,
      sku: 'ACC-002',
      createdAt: '2025-11-10'
    },
    {
      id: '3',
      name: 'Leather Handbag',
      price: 399.99,
      stock: 45,
      status: 'active',
      category: 'Bags',
      image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=200',
      sales: 234,
      sku: 'BAG-003',
      createdAt: '2025-10-20'
    },
    {
      id: '4',
      name: 'Summer Collection Preview',
      price: 199.99,
      stock: 100,
      status: 'draft',
      category: 'Dresses',
      image: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=200',
      sales: 0,
      sku: 'DRS-004',
      createdAt: '2025-12-01'
    }
  ]);

  const categories = ['All', 'Dresses', 'Accessories', 'Bags', 'Shoes'];

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  const startIndex = (currentPage - 1) * productsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + productsPerPage);

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

  const handleBulkDelete = () => {
    if (selectedProducts.length === 0) return;
    if (confirm(`Delete ${selectedProducts.length} selected products?`)) {
      console.log('Deleting products:', selectedProducts);
      setSelectedProducts([]);
    }
  };

  const handleBulkStatusChange = (newStatus: string) => {
    if (selectedProducts.length === 0) return;
    console.log(`Changing ${selectedProducts.length} products to ${newStatus}`);
    setSelectedProducts([]);
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
            <p className="text-2xl font-bold text-charcoal-900 dark:text-white">{products.length}</p>
          </div>
          <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg p-4">
            <p className="text-sm text-charcoal-600 dark:text-cool-gray-400 mb-1">Active</p>
            <p className="text-2xl font-bold text-green-600">
              {products.filter(p => p.status === 'active').length}
            </p>
          </div>
          <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg p-4">
            <p className="text-sm text-charcoal-600 dark:text-cool-gray-400 mb-1">Out of Stock</p>
            <p className="text-2xl font-bold text-red-600">
              {products.filter(p => p.status === 'out-of-stock').length}
            </p>
          </div>
          <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg p-4">
            <p className="text-sm text-charcoal-600 dark:text-cool-gray-400 mb-1">Draft</p>
            <p className="text-2xl font-bold text-yellow-600">
              {products.filter(p => p.status === 'draft').length}
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
              onChange={(e) => setStatusFilter(e.target.value as any)}
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
                {paginatedProducts.map((product) => (
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
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
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
                          onClick={() => confirm('Delete this product?') && console.log('Delete', product.id)}
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
                Showing {startIndex + 1} to {Math.min(startIndex + productsPerPage, filteredProducts.length)} of {filteredProducts.length} products
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
