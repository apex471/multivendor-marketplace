'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import type { Product } from '../../types';
import { useLocalization } from '../../contexts/LocalizationContext';
import { useCart } from '../../contexts/CartContext';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { formatPrice } = useLocalization();
  const { addItem } = useCart();
  const [isHovered, setIsHovered] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);

  const discountPercentage = product.compareAtPrice
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.images[0] || '',
      vendor: product.vendor?.storeName || 'Vendor',
      size: product.sizes?.[0]?.name || 'One Size',
      color: product.colors?.[0]?.name || 'Default',
      quantity: 1,
    });
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  return (
    <Link href={`/product/${product.id}`} className="group">
      <div
        className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Product Image */}
        <div className="relative aspect-[3/4] overflow-hidden bg-gray-100">
          <Image
            src={product.images[0] || '/placeholder-product.jpg'}
            alt={product.name}
            fill
            className={`object-cover transition-transform duration-500 ${isHovered ? 'scale-108' : 'scale-100'}`}
            style={{ transform: isHovered ? 'scale(1.08)' : 'scale(1)' }}
          />

          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1.5 z-10">
            {product.isFeatured && (
              <span className="px-2 py-0.5 bg-charcoal-900 text-white text-[10px] font-bold rounded tracking-wider uppercase">
                Featured
              </span>
            )}
            {discountPercentage > 0 && (
              <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded tracking-wider">
                -{discountPercentage}%
              </span>
            )}
          </div>

          {/* Wishlist */}
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
            className="absolute top-2 right-2 z-10 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white hover:scale-110 active:scale-95 duration-200"
            aria-label="Add to wishlist"
          >
            <svg className="w-4 h-4 text-charcoal-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>

          {/* Out of Stock Overlay */}
          {product.stock === 0 && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
              <span className="px-4 py-2 bg-white text-gray-900 font-semibold rounded-lg text-sm">
                Out of Stock
              </span>
            </div>
          )}

          {/* Quick-View / Add to Cart hover overlay */}
          {product.stock > 0 && (
            <div
              className={`absolute inset-x-0 bottom-0 z-20 transition-all duration-300 ${
                isHovered ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
              }`}
            >
              {/* Color swatches row */}
              {product.colors.length > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/95 backdrop-blur-sm border-t border-gray-100">
                  {product.colors.slice(0, 6).map((color: { name: string; hexCode: string }, i: number) => (
                    <div
                      key={i}
                      className="w-4 h-4 rounded-full border border-gray-300 shrink-0 cursor-pointer hover:scale-110 transition-transform"
                      style={{ backgroundColor: color.hexCode }}
                      title={color.name}
                    />
                  ))}
                  {product.colors.length > 6 && (
                    <span className="text-[10px] text-gray-500 ml-0.5">+{product.colors.length - 6}</span>
                  )}
                </div>
              )}

              {/* Add to Cart button */}
              <button
                onClick={handleQuickAdd}
                className={`w-full py-3 font-semibold text-sm transition-colors duration-200 ${
                  addedToCart
                    ? 'bg-green-600 text-white'
                    : 'bg-charcoal-900 hover:bg-gold-600 text-white active:scale-95'
                }`}
              >
                {addedToCart ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    Added to Cart
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    Quick Add
                  </span>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="p-3 sm:p-4">
          {/* Vendor Name */}
          <p className="text-xs text-gray-500 mb-0.5 truncate">{product.vendor?.storeName || 'Vendor'}</p>

          {/* Product Name */}
          <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 text-sm sm:text-base group-hover:text-gold-700 transition-colors leading-snug">
            {product.name}
          </h3>

          {/* Rating */}
          <div className="flex items-center gap-1 mb-2">
            <div className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <svg key={i} className={`w-3 h-3 ${i < Math.round(product.rating) ? 'text-amber-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="text-xs text-gray-500">({product.reviewCount})</span>
          </div>

          {/* Price */}
          <div className="flex items-center gap-2">
            <span className="text-base sm:text-lg font-bold text-charcoal-900">
              {formatPrice(product.price)}
            </span>
            {product.compareAtPrice && (
              <span className="text-xs sm:text-sm text-gray-400 line-through">
                {formatPrice(product.compareAtPrice)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
