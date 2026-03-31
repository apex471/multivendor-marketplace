import Image from 'next/image';
import Link from 'next/link';
import type { Product } from '../../types';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const discountPercentage = product.compareAtPrice 
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0;

  return (
    <Link href={`/products/${product.id}`} className="group">
      <div className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300">
        {/* Product Image */}
        <div className="relative aspect-[3/4] overflow-hidden bg-gray-100">
          <Image
            src={product.images[0] || '/placeholder-product.jpg'}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
          
          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-2">
            {product.isFeatured && (
              <span className="px-2 py-1 bg-primary-600 text-white text-xs font-semibold rounded">
                Featured
              </span>
            )}
            {discountPercentage > 0 && (
              <span className="px-2 py-1 bg-red-600 text-white text-xs font-semibold rounded">
                -{discountPercentage}%
              </span>
            )}
          </div>

          {/* Quick Actions */}
          <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-100">
              ❤️
            </button>
            <button className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-100">
              👁️
            </button>
          </div>

          {/* Out of Stock Overlay */}
          {product.stock === 0 && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <span className="px-4 py-2 bg-white text-gray-900 font-semibold rounded">
                Out of Stock
              </span>
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="p-4">
          {/* Vendor Name */}
          <p className="text-xs text-gray-500 mb-1">{product.vendor?.storeName || 'Vendor'}</p>
          
          {/* Product Name */}
          <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
            {product.name}
          </h3>

          {/* Rating */}
          <div className="flex items-center gap-1 mb-2">
            <span className="text-yellow-500">⭐</span>
            <span className="text-sm font-medium text-gray-700">{product.rating.toFixed(1)}</span>
            <span className="text-sm text-gray-500">({product.reviewCount})</span>
          </div>

          {/* Price */}
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-gray-900">
              ${product.price.toFixed(2)}
            </span>
            {product.compareAtPrice && (
              <span className="text-sm text-gray-500 line-through">
                ${product.compareAtPrice.toFixed(2)}
              </span>
            )}
          </div>

          {/* Available Colors */}
          {product.colors.length > 0 && (
            <div className="flex gap-1 mt-3">
              {product.colors.slice(0, 5).map((color: any, index: number) => (
                <div
                  key={index}
                  className="w-5 h-5 rounded-full border-2 border-gray-300"
                  style={{ backgroundColor: color.hexCode }}
                  title={color.name}
                />
              ))}
              {product.colors.length > 5 && (
                <span className="text-xs text-gray-500 ml-1">
                  +{product.colors.length - 5}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
