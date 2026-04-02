'use client';

import Link from 'next/link';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';

export default function CategoriesPage() {
  const categories = [
    { id: 'clothing', name: 'Clothing', icon: '👔', count: 1245, subcategories: ['Dresses', 'Shirts', 'Pants', 'Jackets', 'Suits'] },
    { id: 'shoes', name: 'Shoes', icon: '👟', count: 856, subcategories: ['Sneakers', 'Heels', 'Boots', 'Loafers', 'Sandals'] },
    { id: 'bags', name: 'Bags', icon: '👜', count: 634, subcategories: ['Handbags', 'Backpacks', 'Clutches', 'Totes', 'Crossbody'] },
    { id: 'watches', name: 'Watches', icon: '⌚', count: 423, subcategories: ['Luxury', 'Sport', 'Smart', 'Classic', 'Fashion'] },
    { id: 'jewelry', name: 'Jewelry', icon: '💎', count: 789, subcategories: ['Necklaces', 'Rings', 'Earrings', 'Bracelets', 'Watches'] },
    { id: 'accessories', name: 'Accessories', icon: '🕶️', count: 567, subcategories: ['Sunglasses', 'Belts', 'Scarves', 'Hats', 'Gloves'] },
    { id: 'sportswear', name: 'Sportswear', icon: '⚽', count: 445, subcategories: ['Athletic', 'Yoga', 'Running', 'Training', 'Outdoor'] },
    { id: 'beauty', name: 'Beauty', icon: '💄', count: 892, subcategories: ['Makeup', 'Skincare', 'Fragrance', 'Haircare', 'Tools'] },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      <Header />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-charcoal-900 dark:text-white mb-4">Shop by Category</h1>
          <p className="text-lg text-charcoal-600 dark:text-cool-gray-400">
            Browse our complete collection of luxury fashion categories
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/shop?category=${category.id}`}
              className="group bg-white dark:bg-charcoal-800 rounded-xl overflow-hidden shadow-md hover:shadow-2xl transition-all hover:-translate-y-1"
            >
              <div className="bg-linear-to-br from-gold-600 to-gold-700 p-8 text-center">
                <div className="text-6xl mb-2">{category.icon}</div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-charcoal-900 dark:text-white mb-2 group-hover:text-gold-600 transition-colors">
                  {category.name}
                </h3>
                <p className="text-charcoal-600 dark:text-cool-gray-400 mb-4">
                  {category.count} Products
                </p>
                <div className="space-y-1">
                  {category.subcategories.slice(0, 3).map((sub, index) => (
                    <div key={index} className="text-sm text-charcoal-600 dark:text-cool-gray-400">
                      • {sub}
                    </div>
                  ))}
                  {category.subcategories.length > 3 && (
                    <div className="text-sm text-gold-600 font-semibold">
                      +{category.subcategories.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Featured Collections */}
        <div className="bg-linear-to-r from-gold-600 to-gold-700 rounded-2xl p-8 md:p-12 text-white text-center">
          <h2 className="text-3xl font-bold mb-4">Can't Find What You're Looking For?</h2>
          <p className="text-lg mb-6">Use our advanced search to find specific items</p>
          <Link
            href="/search"
            className="inline-block px-8 py-4 bg-white text-gold-700 rounded-lg font-bold text-lg hover:bg-cool-gray-100 transition-colors"
          >
            Advanced Search
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
