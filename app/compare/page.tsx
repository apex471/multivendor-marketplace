'use client';

import { useState } from 'react';
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

export default function ComparePage() {
  const [products] = useState<Product[]>([
    {
      id: '1',
      name: 'Gucci Marmont Bag',
      price: 2200,
      image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400',
      rating: 4.9,
      brand: 'Gucci',
      category: 'Handbags',
      inStock: true,
      specs: {
        material: 'Leather',
        color: 'Black',
        size: '28cm x 18cm',
        weight: '0.8kg',
      },
    },
    {
      id: '2',
      name: 'Louis Vuitton Neverfull',
      price: 1800,
      image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400',
      rating: 4.8,
      brand: 'Louis Vuitton',
      category: 'Handbags',
      inStock: true,
      specs: {
        material: 'Canvas',
        color: 'Brown',
        size: '31cm x 28cm',
        weight: '0.6kg',
      },
    },
    {
      id: '3',
      name: 'Prada Galleria Bag',
      price: 2500,
      image: 'https://images.unsplash.com/photo-1591348278863-e0b6f9c5e6f8?w=400',
      rating: 4.9,
      brand: 'Prada',
      category: 'Handbags',
      inStock: false,
      specs: {
        material: 'Saffiano Leather',
        color: 'Black',
        size: '30cm x 23cm',
        weight: '1.0kg',
      },
    },
  ]);

  const handleRemoveProduct = (id: string) => {
    console.log('Remove product:', id);
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

        {products.length === 0 ? (
          <div className="bg-white dark:bg-charcoal-800 rounded-xl shadow-md p-12 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-bold text-charcoal-900 dark:text-white mb-2">No products to compare</h3>
            <p className="text-charcoal-600 dark:text-cool-gray-400 mb-6">
              Add products from the shop to compare them
            </p>
            <Link
              href="/shop"
              className="inline-block px-6 py-3 bg-gold-600 text-white rounded-lg font-semibold hover:bg-gold-700 transition-colors"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {products.map((product) => (
                  <div key={product.id} className="bg-white dark:bg-charcoal-800 rounded-xl shadow-md overflow-hidden">
                    {/* Product Image */}
                    <div className="relative h-64 bg-cool-gray-100 dark:bg-charcoal-700">
                      <Image src={product.image} alt={product.name} fill className="object-cover" />
                      <button
                        onClick={() => handleRemoveProduct(product.id)}
                        className="absolute top-2 right-2 w-8 h-8 bg-white dark:bg-charcoal-800 rounded-full flex items-center justify-center shadow-md hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                      >
                        <span className="text-red-600">✕</span>
                      </button>
                    </div>

                    {/* Product Info */}
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-charcoal-900 dark:text-white mb-2">{product.name}</h3>
                      <p className="text-sm text-charcoal-600 dark:text-cool-gray-400 mb-4">{product.brand}</p>

                      <div className="space-y-4 mb-6">
                        {/* Price */}
                        <div className="flex justify-between items-center pb-4 border-b border-cool-gray-200 dark:border-charcoal-700">
                          <span className="text-charcoal-600 dark:text-cool-gray-400">Price</span>
                          <span className="text-2xl font-bold text-gold-600">${product.price}</span>
                        </div>

                        {/* Rating */}
                        <div className="flex justify-between items-center pb-4 border-b border-cool-gray-200 dark:border-charcoal-700">
                          <span className="text-charcoal-600 dark:text-cool-gray-400">Rating</span>
                          <div className="flex items-center gap-1">
                            <span className="text-yellow-500">⭐</span>
                            <span className="font-semibold text-charcoal-900 dark:text-white">{product.rating}</span>
                          </div>
                        </div>

                        {/* Stock */}
                        <div className="flex justify-between items-center pb-4 border-b border-cool-gray-200 dark:border-charcoal-700">
                          <span className="text-charcoal-600 dark:text-cool-gray-400">Availability</span>
                          <span
                            className={`font-semibold ${
                              product.inStock ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {product.inStock ? 'In Stock' : 'Out of Stock'}
                          </span>
                        </div>

                        {/* Category */}
                        <div className="flex justify-between items-center pb-4 border-b border-cool-gray-200 dark:border-charcoal-700">
                          <span className="text-charcoal-600 dark:text-cool-gray-400">Category</span>
                          <span className="font-semibold text-charcoal-900 dark:text-white">{product.category}</span>
                        </div>

                        {/* Specifications */}
                        <div className="space-y-3">
                          <h4 className="font-semibold text-charcoal-900 dark:text-white">Specifications</h4>
                          {Object.entries(product.specs).map(([key, value]) => (
                            <div key={key} className="flex justify-between text-sm">
                              <span className="text-charcoal-600 dark:text-cool-gray-400 capitalize">{key}:</span>
                              <span className="text-charcoal-900 dark:text-white">{value}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="space-y-2">
                        <Link
                          href={`/product/${product.id}`}
                          className="block w-full text-center px-4 py-3 bg-gold-600 text-white rounded-lg font-semibold hover:bg-gold-700 transition-colors"
                        >
                          View Details
                        </Link>
                        <button className="w-full px-4 py-3 border-2 border-cool-gray-300 dark:border-charcoal-600 text-charcoal-700 dark:text-cool-gray-300 rounded-lg font-semibold hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 transition-colors">
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Add More Products Card */}
                {products.length < 4 && (
                  <div className="bg-white dark:bg-charcoal-800 rounded-xl shadow-md overflow-hidden flex items-center justify-center min-h-150">
                    <div className="text-center p-8">
                      <div className="text-6xl mb-4">➕</div>
                      <h3 className="text-xl font-bold text-charcoal-900 dark:text-white mb-2">Add Product</h3>
                      <p className="text-charcoal-600 dark:text-cool-gray-400 mb-6">
                        Compare up to 4 products
                      </p>
                      <Link
                        href="/shop"
                        className="inline-block px-6 py-3 bg-gold-600 text-white rounded-lg font-semibold hover:bg-gold-700 transition-colors"
                      >
                        Browse Products
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
