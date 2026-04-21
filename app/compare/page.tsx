'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  rating: number;
  brand: string;
  category: string;
  inStock: boolean;
  specs: {
    material?: string;
    color?: string;
    size?: string;
    weight?: string;
  };
}

function CompareContent() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ids = searchParams.getAll('id');
    if (ids.length === 0) return;

    Promise.all(
      ids.map(id =>
        fetch(`/api/products/${id}`)
          .then(r => r.json())
          .then(json => {
            if (!json.success || !json.data?.product) return null;
            const p = json.data.product;
            return {
              id:       String(p._id),
              name:     p.name,
              price:    p.salePrice && p.salePrice < p.price ? p.salePrice : p.price,
              image:    p.images?.[0] ?? '/images/placeholder.jpg',
              rating:   p.rating ?? 0,
              brand:    p.brand ?? '—',
              category: p.category ?? '—',
              inStock:  (p.stock ?? 0) > 0,
              specs: {
                material: p.material,
                color:    p.color,
                size:     p.size,
                weight:   p.weight,
              },
            } as Product;
          })
          .catch(() => null)
      )
    ).then(results => {
      setProducts(results.filter((p): p is Product => p !== null));
      setLoading(false);
    });
  }, [searchParams]);

  const handleRemoveProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      <Header />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-charcoal-900 dark:text-white mb-2">Compare Products</h1>
          <p className="text-charcoal-600 dark:text-cool-gray-400">
            Compare features, prices, and specifications side by side
          </p>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4 animate-pulse">⚖️</div>
            <p className="text-charcoal-600 dark:text-cool-gray-400">Loading products…</p>
          </div>
        )}

        {!loading && products.length === 0 ? (
          <div className="bg-white dark:bg-charcoal-800 rounded-xl shadow-md p-12 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-bold text-charcoal-900 dark:text-white mb-2">No products to compare</h3>
            <p className="text-charcoal-600 dark:text-cool-gray-400 mb-6">
              Add products from the shop to compare them. Use the ?id=... query parameter.
            </p>
            <Link href="/shop" className="px-6 py-3 bg-gold-600 text-white rounded-lg font-semibold hover:bg-gold-700 transition-colors">
              Browse Products
            </Link>
          </div>
        ) : !loading && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left p-4 bg-cool-gray-50 dark:bg-charcoal-800 font-bold text-charcoal-900 dark:text-white w-40">
                    Feature
                  </th>
                  {products.map(product => (
                    <th key={product.id} className="p-4 bg-cool-gray-50 dark:bg-charcoal-800 min-w-48">
                      <div className="flex flex-col items-center">
                        <div className="relative w-32 h-32 mb-3">
                          <Image src={product.image} alt={product.name} fill className="object-contain rounded-lg" />
                        </div>
                        <h3 className="font-bold text-charcoal-900 dark:text-white text-center mb-2">{product.name}</h3>
                        <p className="text-xl font-bold text-gold-600 mb-2">${product.price.toFixed(2)}</p>
                        <div className="flex gap-2">
                          <Link href={`/product/${product.id}`} className="px-3 py-1 bg-gold-600 text-white rounded text-sm font-semibold hover:bg-gold-700">
                            View
                          </Link>
                          <button onClick={() => handleRemoveProduct(product.id)} className="px-3 py-1 border border-red-400 text-red-600 rounded text-sm font-semibold hover:bg-red-50">
                            Remove
                          </button>
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { key: 'rating',   label: 'Rating',   render: (p: Product) => `${p.rating.toFixed(1)} ⭐` },
                  { key: 'brand',    label: 'Brand',    render: (p: Product) => p.brand },
                  { key: 'category', label: 'Category', render: (p: Product) => p.category },
                  { key: 'inStock',  label: 'In Stock', render: (p: Product) => p.inStock ? '✅ Yes' : '❌ No' },
                  { key: 'material', label: 'Material', render: (p: Product) => p.specs.material ?? '—' },
                  { key: 'color',    label: 'Color',    render: (p: Product) => p.specs.color    ?? '—' },
                  { key: 'size',     label: 'Size',     render: (p: Product) => p.specs.size     ?? '—' },
                  { key: 'weight',   label: 'Weight',   render: (p: Product) => p.specs.weight   ?? '—' },
                ].map((row, i) => (
                  <tr key={row.key} className={i % 2 === 0 ? 'bg-white dark:bg-charcoal-900' : 'bg-cool-gray-50 dark:bg-charcoal-800'}>
                    <td className="p-4 font-semibold text-charcoal-700 dark:text-cool-gray-300">{row.label}</td>
                    {products.map(p => (
                      <td key={p.id} className="p-4 text-center text-charcoal-900 dark:text-white">{row.render(p)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p>Loading…</p></div>}>
      <CompareContent />
    </Suspense>
  );
}
