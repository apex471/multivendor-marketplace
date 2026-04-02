'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Header from '../../../components/common/Header';
import Footer from '../../../components/common/Footer';

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating: number;
  reviews: number;
}

interface Collection {
  id: string;
  name: string;
  description: string;
  image: string;
  productCount: number;
}

export default function BrandPage() {
  const params = useParams();
  const brandId = params?.id as string;
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('featured');

  // Mock brand data
  const brand = {
    id: brandId,
    name: 'Luxe Couture',
    tagline: 'Timeless Elegance, Modern Style',
    logo: 'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=200',
    banner: 'https://images.unsplash.com/photo-1558769132-cb1aea1c7043?w=1200',
    description: 'Founded in Paris in 1985, Luxe Couture has been at the forefront of luxury fashion for over three decades. Our commitment to exceptional craftsmanship, innovative design, and sustainable practices has made us a global leader in haute couture. Each piece is meticulously crafted by skilled artisans using the finest materials sourced from around the world.',
    established: '1985',
    headquarters: 'Paris, France',
    categories: ['Clothing', 'Accessories', 'Footwear', 'Jewelry'],
    awards: ['Best Luxury Brand 2023', 'Sustainable Fashion Award 2022'],
    philosophy: 'We believe fashion should be timeless, sustainable, and accessible to all who appreciate quality and artistry.',
    followers: 245789,
    rating: 4.8,
    totalProducts: 342,
  };

  const collections: Collection[] = [
    {
      id: '1',
      name: 'Spring 2024 Collection',
      description: 'Fresh florals and vibrant colors',
      image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600',
      productCount: 45,
    },
    {
      id: '2',
      name: 'Evening Elegance',
      description: 'Sophisticated gowns for special occasions',
      image: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=600',
      productCount: 32,
    },
    {
      id: '3',
      name: 'Heritage Collection',
      description: 'Classic designs reimagined',
      image: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=600',
      productCount: 28,
    },
  ];

  const products: Product[] = [
    {
      id: '1',
      name: 'Silk Evening Gown',
      price: 1299.99,
      originalPrice: 1599.99,
      image: 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=400',
      rating: 4.9,
      reviews: 156,
    },
    {
      id: '2',
      name: 'Designer Cocktail Dress',
      price: 899.99,
      image: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=400',
      rating: 4.8,
      reviews: 203,
    },
    {
      id: '3',
      name: 'Luxury Handbag',
      price: 1599.99,
      image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400',
      rating: 5.0,
      reviews: 98,
    },
    {
      id: '4',
      name: 'Classic Trench Coat',
      price: 749.99,
      image: 'https://images.unsplash.com/photo-1539533113208-f6df8cc8b543?w=400',
      rating: 4.7,
      reviews: 134,
    },
    {
      id: '5',
      name: 'Designer Sunglasses',
      price: 399.99,
      image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400',
      rating: 4.6,
      reviews: 287,
    },
    {
      id: '6',
      name: 'Leather Ankle Boots',
      price: 599.99,
      image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400',
      rating: 4.8,
      reviews: 165,
    },
  ];

  const categories = ['all', 'clothing', 'accessories', 'footwear', 'jewelry'];

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      <Header />

      {/* Brand Hero Section */}
      <div className="relative h-64 md:h-96 bg-charcoal-800">
        <Image
          src={brand.banner}
          alt={brand.name}
          fill
          className="object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent flex items-end">
          <div className="container mx-auto px-4 pb-8">
            <div className="flex items-end gap-6">
              <div className="relative w-20 h-20 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-white dark:border-charcoal-900 bg-white flex-shrink-0">
                <Image src={brand.logo} alt={brand.name} fill className="object-cover" />
              </div>
              <div className="mb-2">
                <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">
                  {brand.name}
                </h1>
                <p className="text-lg md:text-xl text-white/90">{brand.tagline}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Brand Stats */}
        <div className="bg-white dark:bg-charcoal-800 rounded-lg border border-cool-gray-300 dark:border-charcoal-700 p-6 mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-2xl md:text-3xl font-bold text-charcoal-900 dark:text-white mb-1">
                {brand.established}
              </p>
              <p className="text-sm text-charcoal-600 dark:text-cool-gray-400">Est.</p>
            </div>
            <div className="text-center">
              <p className="text-2xl md:text-3xl font-bold text-charcoal-900 dark:text-white mb-1">
                {brand.totalProducts}+
              </p>
              <p className="text-sm text-charcoal-600 dark:text-cool-gray-400">Products</p>
            </div>
            <div className="text-center">
              <p className="text-2xl md:text-3xl font-bold text-charcoal-900 dark:text-white mb-1">
                {brand.rating} ⭐
              </p>
              <p className="text-sm text-charcoal-600 dark:text-cool-gray-400">Rating</p>
            </div>
            <div className="text-center">
              <p className="text-2xl md:text-3xl font-bold text-charcoal-900 dark:text-white mb-1">
                {(brand.followers / 1000).toFixed(0)}K
              </p>
              <p className="text-sm text-charcoal-600 dark:text-cool-gray-400">Followers</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-6 justify-center">
            <button className="px-6 py-2 bg-gold-600 text-white rounded-lg hover:bg-gold-700 transition-colors font-semibold">
              ➕ Follow Brand
            </button>
            <button className="px-6 py-2 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 transition-colors font-semibold">
              📤 Share
            </button>
          </div>
        </div>

        {/* About Brand */}
        <div className="bg-white dark:bg-charcoal-800 rounded-lg border border-cool-gray-300 dark:border-charcoal-700 p-6 mb-8">
          <h2 className="text-2xl font-bold text-charcoal-900 dark:text-white mb-4">
            About {brand.name}
          </h2>
          <p className="text-charcoal-700 dark:text-cool-gray-300 mb-6 leading-relaxed">
            {brand.description}
          </p>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-bold text-charcoal-900 dark:text-white mb-2">📍 Headquarters</h3>
              <p className="text-charcoal-700 dark:text-cool-gray-300">{brand.headquarters}</p>
            </div>
            <div>
              <h3 className="font-bold text-charcoal-900 dark:text-white mb-2">🏆 Awards</h3>
              <ul className="text-charcoal-700 dark:text-cool-gray-300 space-y-1">
                {brand.awards.map((award, index) => (
                  <li key={index}>• {award}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gold-50 dark:bg-gold-900/10 border border-gold-200 dark:border-gold-800 rounded-lg">
            <p className="text-charcoal-800 dark:text-cool-gray-200 italic">
              "{brand.philosophy}"
            </p>
          </div>
        </div>

        {/* Featured Collections */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-charcoal-900 dark:text-white mb-6">
            Featured Collections
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {collections.map((collection) => (
              <Link
                key={collection.id}
                href={`/brands/${brandId}/collections/${collection.id}`}
                className="group bg-white dark:bg-charcoal-800 rounded-lg overflow-hidden border border-cool-gray-300 dark:border-charcoal-700 hover:shadow-lg transition-all"
              >
                <div className="relative aspect-[4/5] overflow-hidden">
                  <Image
                    src={collection.image}
                    alt={collection.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-charcoal-900 dark:text-white mb-1">
                    {collection.name}
                  </h3>
                  <p className="text-sm text-charcoal-600 dark:text-cool-gray-400 mb-2">
                    {collection.description}
                  </p>
                  <p className="text-sm text-gold-600 font-semibold">
                    {collection.productCount} items
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Products Section */}
        <div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <h2 className="text-2xl font-bold text-charcoal-900 dark:text-white mb-4 md:mb-0">
              All Products
            </h2>
            
            <div className="flex flex-wrap gap-3">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg bg-white dark:bg-charcoal-800 focus:outline-none focus:ring-2 focus:ring-gold-600"
              >
                <option value="featured">Featured</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
                <option value="newest">Newest</option>
              </select>
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                  activeCategory === category
                    ? 'bg-gold-600 text-white'
                    : 'bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 hover:bg-cool-gray-50 dark:hover:bg-charcoal-700'
                }`}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/product/${product.id}`}
                className="group bg-white dark:bg-charcoal-800 rounded-lg overflow-hidden border border-cool-gray-300 dark:border-charcoal-700 hover:shadow-lg transition-all"
              >
                <div className="relative aspect-square overflow-hidden">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {product.originalPrice && (
                    <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">
                      SALE
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-charcoal-900 dark:text-white mb-2 line-clamp-2">
                    {product.name}
                  </h3>
                  <div className="flex items-center gap-1 mb-2">
                    <span className="text-gold-600">⭐</span>
                    <span className="text-sm font-semibold">{product.rating}</span>
                    <span className="text-xs text-charcoal-600 dark:text-cool-gray-400">
                      ({product.reviews})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-bold text-gold-600">${product.price}</p>
                    {product.originalPrice && (
                      <p className="text-sm text-charcoal-600 dark:text-cool-gray-400 line-through">
                        ${product.originalPrice}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
