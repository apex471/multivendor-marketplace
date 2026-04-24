'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Header from '../../../components/common/Header';
import Footer from '../../../components/common/Footer';
import { useRouter, useParams } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';

interface Review {
  id: string;
  author: string;
  avatar: string | null;
  rating: number;
  date: string;
  comment: string;
  images?: string[];
  verified: boolean;
  helpful: number;
}

interface ProductData {
  id: string;
  name: string;
  price: number;
  oldPrice?: number;
  vendor: { name: string; id: string; rating: number; verified: boolean };
  rating: number;
  reviews: number;
  sales: number;
  description: string;
  features: string[];
  specifications: { label: string; value: string }[];
  images: string[];
  sizes: string[];
  colors: { name: string; hex: string }[];
  inStock: boolean;
  stockCount: number;
  category: string;
  sku: string;
  tags: string[];
}

interface RelatedProduct {
  id: string;
  name: string;
  price: number;
  image: string;
  rating: number;
}

export default function ProductDetailPage() {
  const router = useRouter();
  const { id: productId } = useParams() as { id: string };  const { addItem: addToCart } = useCart();
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [activeTab, setActiveTab] = useState<'description' | 'specifications' | 'reviews'>('description');
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const [product,        setProduct]        = useState<ProductData | null>(null);
  const [reviews,         setReviews]         = useState<Review[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>([]);
  const [isLoading,       setIsLoading]       = useState(true);
  const [notFound,        setNotFound]        = useState(false);

  useEffect(() => {
    fetch(`/api/products/${productId}/reviews`)
      .then(r => r.json())
      .then(json => {
        if (!json.success) return;
        setReviews((json.data.reviews ?? []).map((r: {
          _id: string; userName: string; userAvatar?: string;
          rating: number; createdAt: string; comment: string;
          verified?: boolean; helpful?: number;
        }) => ({
          id: String(r._id), author: r.userName,
          avatar: r.userAvatar ?? null,
          rating: r.rating, date: new Date(r.createdAt).toLocaleDateString(),
          comment: r.comment, verified: r.verified ?? false, helpful: r.helpful ?? 0,
        })));
      });
  }, [productId]);

  useEffect(() => {
    fetch(`/api/products/${productId}`)
      .then(r => r.json())
      .then(json => {
        if (!json.success || !json.data?.product) { setNotFound(true); return; }
        const p = json.data.product;
        const displayPrice  = p.salePrice && p.salePrice < p.price ? p.salePrice : p.price;
        const originalPrice = p.salePrice && p.salePrice < p.price ? p.price    : undefined;
        const sizes = [...new Set<string>(
          (p.variants ?? []).map((v: Record<string, string>) => v.size).filter(Boolean)
        )];
        const colorMap = new Map<string, { name: string; hex: string }>();
        (p.variants ?? []).forEach((v: Record<string, string>) => {
          if (v.color) colorMap.set(v.color, { name: v.color, hex: '#888888' });
        });
        setProduct({
          id:             p._id,
          name:           p.name,
          price:          displayPrice,
          oldPrice:       originalPrice,
          vendor: {
            name:     p.vendorId?.firstName
              ? `${p.vendorId.firstName} ${p.vendorId.lastName ?? ''}`.trim()
              : 'Vendor',
            id:       typeof p.vendorId === 'string' ? p.vendorId : (p.vendorId?._id ?? ''),
            rating:   0,
            verified: true,
          },
          rating:         p.averageRating ?? 0,
          reviews:        p.reviewCount   ?? 0,
          sales:          p.salesCount    ?? 0,
          description:    p.description   ?? '',
          features:       [],
          specifications: p.sku
            ? [{ label: 'SKU', value: p.sku }, { label: 'Category', value: p.category ?? '' }]
            : [],
          images:     p.images?.length ? p.images : ['/images/placeholder.jpg'],
          sizes,
          colors:     [...colorMap.values()],
          inStock:    (p.stock ?? 0) > 0,
          stockCount: p.stock ?? 0,
          category:   p.category ?? '',
          sku:        p.sku ?? '',
          tags:       p.tags ?? [],
        });
        setRelatedProducts(
          (json.data.related ?? []).map((r: Record<string, unknown>) => ({
            id:     r._id as string,
            name:   r.name as string,
            price:  r.price as number,
            image:  (r.images as string[])?.[0] ?? '/images/placeholder.jpg',
            rating: (r.averageRating as number) ?? 0,
          }))
        );
      })
      .catch(() => setNotFound(true))
      .finally(() => setIsLoading(false));
  }, [productId]);

  useEffect(() => {
    if (notFound) router.push('/shop');
  }, [notFound, router]);

  if (isLoading) return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      <Header />
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gold-600 border-t-transparent" />
      </div>
      <Footer />
    </div>
  );

  if (!product) return null;

  const handleAddToCart = () => {
    if (!selectedSize) {
      alert('Please select a size');
      return;
    }
    if (!selectedColor) {
      alert('Please select a color');
      return;
    }
    addToCart({
      productId: product.id,
      name:      product.name,
      price:     product.price,
      image:     product.images[0] ?? '/images/placeholder.jpg',
      vendor:    product.vendor.name,
      size:      selectedSize,
      color:     selectedColor,
      quantity,
    });
    alert(`"${product.name}" added to cart! 🛒`);
  };

  const handleBuyNow = () => {
    if (!selectedSize || !selectedColor) {
      alert('Please select size and color');
      return;
    }
    handleAddToCart();
    router.push('/checkout');
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <span key={i} className={i < Math.round(rating) ? 'text-yellow-500' : 'text-cool-gray-300 dark:text-charcoal-600'}>
        ⭐
      </span>
    ));
  };

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      <Header />

      <div className="container mx-auto px-4 py-6 sm:py-8 md:py-12">
        {/* Breadcrumb */}
        <div className="mb-4 sm:mb-6 text-xs sm:text-sm text-charcoal-600 dark:text-cool-gray-400 flex items-center gap-2 overflow-x-auto">
          <Link href="/" className="hover:text-gold-600 whitespace-nowrap">Home</Link>
          <span>›</span>
          <Link href="/shop" className="hover:text-gold-600 whitespace-nowrap">Shop</Link>
          <span>›</span>
          <Link href={`/shop?category=${product.category}`} className="hover:text-gold-600 whitespace-nowrap">{product.category}</Link>
          <span>›</span>
          <span className="text-charcoal-900 dark:text-white truncate">{product.name}</span>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 mb-12">
          {/* Product Images */}
          <div>
            {/* Main Image */}
            <div className="relative aspect-square mb-4 rounded-xl overflow-hidden bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700">
              <Image
                src={product.images[selectedImage]}
                alt={product.name}
                fill
                className="object-cover"
                priority
              />
              {product.oldPrice && (
                <span className="absolute top-3 sm:top-4 left-3 sm:left-4 px-2 sm:px-3 py-1 sm:py-1.5 bg-red-600 text-white text-xs sm:text-sm font-bold rounded">
                  {Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)}% OFF
                </span>
              )}
              <button
                onClick={() => setIsInWishlist(!isInWishlist)}
                className="absolute top-3 sm:top-4 right-3 sm:right-4 w-10 h-10 bg-white dark:bg-charcoal-800 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
              >
                <span className="text-xl">{isInWishlist ? '❤️' : '🤍'}</span>
              </button>
            </div>

            {/* Thumbnail Images */}
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              {product.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`relative aspect-square rounded-lg overflow-hidden border-2 ${
                    selectedImage === index
                      ? 'border-gold-600 dark:border-gold-500'
                      : 'border-cool-gray-300 dark:border-charcoal-700'
                  }`}
                >
                  <Image src={image} alt={`Product ${index + 1}`} fill className="object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div>
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-charcoal-900 dark:text-white mb-2">
                  {product.name}
                </h1>
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex items-center gap-1">
                    {renderStars(product.rating)}
                    <span className="ml-2 text-sm text-charcoal-600 dark:text-cool-gray-400">
                      {product.rating} ({product.reviews} reviews)
                    </span>
                  </div>
                  <span className="text-sm text-charcoal-600 dark:text-cool-gray-400">
                    {product.sales} sold
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowShareModal(true)}
                className="px-4 py-2 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg hover:bg-cool-gray-50 dark:hover:bg-charcoal-800 transition-colors"
              >
                📤 Share
              </button>
            </div>

            {/* Vendor Info */}
            <Link
              href={`/vendors/${product.vendor.id}`}
              className="flex items-center gap-3 p-4 bg-cool-gray-50 dark:bg-charcoal-800 rounded-lg mb-6 hover:bg-cool-gray-100 dark:hover:bg-charcoal-700 transition-colors"
            >
              <div className="w-12 h-12 bg-linear-to-br from-gold-400 to-gold-600 rounded-full flex items-center justify-center text-2xl">
                🏪
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-charcoal-900 dark:text-white">{product.vendor.name}</span>
                  {product.vendor.verified && <span className="text-blue-600">✓</span>}
                </div>
                <div className="flex items-center gap-1 text-sm text-charcoal-600 dark:text-cool-gray-400">
                  <span>⭐</span>
                  <span>{product.vendor.rating} Store Rating</span>
                </div>
              </div>
              <span className="text-sm text-gold-600 dark:text-gold-500">Visit Store →</span>
            </Link>

            {/* Price */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl sm:text-4xl font-bold text-gold-600">${product.price}</span>
                {product.oldPrice && (
                  <span className="text-xl text-charcoal-500 dark:text-cool-gray-500 line-through">${product.oldPrice}</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm">
                {product.inStock ? (
                  <span className="text-green-600 dark:text-green-400">✓ In Stock ({product.stockCount} available)</span>
                ) : (
                  <span className="text-red-600 dark:text-red-400">✗ Out of Stock</span>
                )}
              </div>
            </div>

            {/* Color Selection */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-charcoal-900 dark:text-white">
                  Color: {selectedColor || 'Select'}
                </label>
              </div>
              <div className="flex gap-3">
                {product.colors.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => setSelectedColor(color.name)}
                    className={`relative w-12 h-12 rounded-full border-2 ${
                      selectedColor === color.name
                        ? 'border-gold-600 dark:border-gold-500'
                        : 'border-cool-gray-300 dark:border-charcoal-700'
                    }`}
                    title={color.name}
                  >
                    <div
                      className="w-full h-full rounded-full"
                      style={{ backgroundColor: color.hex }}
                    />
                    {selectedColor === color.name && (
                      <span className="absolute inset-0 flex items-center justify-center text-white text-xl">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Size Selection */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-charcoal-900 dark:text-white">
                  Size: {selectedSize || 'Select'}
                </label>
                <button
                  onClick={() => setShowSizeGuide(true)}
                  className="text-sm text-gold-600 dark:text-gold-500 hover:underline"
                >
                  Size Guide
                </button>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`py-2 px-4 rounded-lg border ${
                      selectedSize === size
                        ? 'bg-gold-600 text-white border-gold-600'
                        : 'bg-white dark:bg-charcoal-800 border-cool-gray-300 dark:border-charcoal-700 text-charcoal-900 dark:text-white hover:border-gold-600 dark:hover:border-gold-500'
                    } transition-colors`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div className="mb-6">
              <label className="text-sm font-semibold text-charcoal-900 dark:text-white block mb-3">
                Quantity
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 rounded-lg border border-cool-gray-300 dark:border-charcoal-700 hover:bg-cool-gray-50 dark:hover:bg-charcoal-800 transition-colors"
                >
                  −
                </button>
                <span className="w-16 text-center font-semibold text-charcoal-900 dark:text-white">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(product.stockCount, quantity + 1))}
                  className="w-10 h-10 rounded-lg border border-cool-gray-300 dark:border-charcoal-700 hover:bg-cool-gray-50 dark:hover:bg-charcoal-800 transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mb-6">
              <button
                onClick={handleAddToCart}
                disabled={!product.inStock}
                className="flex-1 py-4 bg-charcoal-900 dark:bg-charcoal-800 text-white rounded-lg hover:bg-charcoal-800 dark:hover:bg-charcoal-700 disabled:bg-cool-gray-400 disabled:cursor-not-allowed transition-colors font-semibold"
              >
                🛒 Add to Cart
              </button>
              <button
                onClick={handleBuyNow}
                disabled={!product.inStock}
                className="flex-1 py-4 bg-gold-600 dark:bg-gold-700 text-white rounded-lg hover:bg-gold-700 dark:hover:bg-gold-800 disabled:bg-cool-gray-400 disabled:cursor-not-allowed transition-colors font-semibold"
              >
                Buy Now
              </button>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {product.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/shop?tag=${tag}`}
                  className="px-3 py-1 bg-cool-gray-100 dark:bg-charcoal-800 text-charcoal-700 dark:text-cool-gray-400 rounded-full text-sm hover:bg-gold-100 dark:hover:bg-gold-900/20 transition-colors"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="mb-12">
          <div className="border-b border-cool-gray-300 dark:border-charcoal-700 mb-6">
            <div className="flex gap-8">
              {(['description', 'specifications', 'reviews'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-4 text-sm sm:text-base font-semibold capitalize ${
                    activeTab === tab
                      ? 'text-gold-600 dark:text-gold-500 border-b-2 border-gold-600 dark:border-gold-500'
                      : 'text-charcoal-600 dark:text-cool-gray-400'
                  }`}
                >
                  {tab} {tab === 'reviews' && `(${product.reviews})`}
                </button>
              ))}
            </div>
          </div>

          {/* Description Tab */}
          {activeTab === 'description' && (
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-charcoal-700 dark:text-cool-gray-300 mb-6">{product.description}</p>
              <h3 className="text-lg font-bold text-charcoal-900 dark:text-white mb-4">Features:</h3>
              <ul className="space-y-2">
                {product.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-charcoal-700 dark:text-cool-gray-300">
                    <span className="text-gold-600 dark:text-gold-500">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Specifications Tab */}
          {activeTab === 'specifications' && (
            <div className="grid sm:grid-cols-2 gap-4">
              {product.specifications.map((spec, index) => (
                <div
                  key={index}
                  className="flex justify-between p-4 bg-cool-gray-50 dark:bg-charcoal-800 rounded-lg"
                >
                  <span className="font-semibold text-charcoal-900 dark:text-white">{spec.label}:</span>
                  <span className="text-charcoal-700 dark:text-cool-gray-300">{spec.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Reviews Tab */}
          {activeTab === 'reviews' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-4xl font-bold text-charcoal-900 dark:text-white">{product.rating}</span>
                    <div>
                      <div className="flex">{renderStars(product.rating)}</div>
                      <span className="text-sm text-charcoal-600 dark:text-cool-gray-400">
                        Based on {product.reviews} reviews
                      </span>
                    </div>
                  </div>
                </div>
                <button className="px-6 py-2 bg-gold-600 dark:bg-gold-700 text-white rounded-lg hover:bg-gold-700 dark:hover:bg-gold-800 transition-colors">
                  Write Review
                </button>
              </div>

              <div className="space-y-6">
                {reviews.map((review) => (
                  <div key={review.id} className="border-b border-cool-gray-300 dark:border-charcoal-700 pb-6 last:border-0">
                    <div className="flex items-start gap-4">
                      {review.avatar ? (
                        <Image
                          src={review.avatar}
                          alt={review.author}
                          width={48}
                          height={48}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-charcoal-200 dark:bg-charcoal-600 flex items-center justify-center text-lg font-bold text-charcoal-600 dark:text-white shrink-0">{review.author.charAt(0)}</div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-charcoal-900 dark:text-white">{review.author}</span>
                              {review.verified && (
                                <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 text-xs rounded">
                                  ✓ Verified Purchase
                                </span>
                              )}
                            </div>
                            <span className="text-sm text-charcoal-600 dark:text-cool-gray-400">{review.date}</span>
                          </div>
                        </div>
                        <div className="flex mb-2">{renderStars(review.rating)}</div>
                        <p className="text-charcoal-700 dark:text-cool-gray-300 mb-3">{review.comment}</p>
                        {review.images && (
                          <div className="flex gap-2 mb-3">
                            {review.images.map((img, idx) => (
                              <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden">
                                <Image src={img} alt="Review" fill className="object-cover" />
                              </div>
                            ))}
                          </div>
                        )}
                        <button className="text-sm text-charcoal-600 dark:text-cool-gray-400 hover:text-gold-600">
                          Helpful ({review.helpful})
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Related Products */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-charcoal-900 dark:text-white mb-6">You May Also Like</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
            {relatedProducts.map((item) => (
              <Link
                key={item.id}
                href={`/product/${item.id}`}
                className="group bg-white dark:bg-charcoal-800 rounded-xl overflow-hidden border border-cool-gray-300 dark:border-charcoal-700 hover:shadow-lg transition-shadow"
              >
                <div className="relative aspect-square overflow-hidden">
                  <Image src={item.image} alt={item.name} fill className="object-cover group-hover:scale-110 transition-transform" />
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-charcoal-900 dark:text-white mb-1 line-clamp-2">{item.name}</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-gold-600 font-bold">${item.price}</span>
                    <div className="flex items-center gap-1 text-xs">
                      <span className="text-yellow-500">⭐</span>
                      <span className="text-charcoal-600 dark:text-cool-gray-400">{item.rating}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Size Guide Modal */}
      {showSizeGuide && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowSizeGuide(false)}>
          <div className="bg-white dark:bg-charcoal-800 rounded-xl p-6 max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-charcoal-900 dark:text-white">Size Guide</h3>
              <button onClick={() => setShowSizeGuide(false)} className="text-2xl">✕</button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cool-gray-300 dark:border-charcoal-700">
                  <th className="py-2 text-left">Size</th>
                  <th className="py-2 text-left">Bust (in)</th>
                  <th className="py-2 text-left">Waist (in)</th>
                  <th className="py-2 text-left">Hip (in)</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { size: 'XS', bust: '30-32', waist: '23-25', hip: '33-35' },
                  { size: 'S', bust: '32-34', waist: '25-27', hip: '35-37' },
                  { size: 'M', bust: '34-36', waist: '27-29', hip: '37-39' },
                  { size: 'L', bust: '36-38', waist: '29-31', hip: '39-41' },
                  { size: 'XL', bust: '38-40', waist: '31-33', hip: '41-43' }
                ].map((row) => (
                  <tr key={row.size} className="border-b border-cool-gray-200 dark:border-charcoal-700">
                    <td className="py-2 font-semibold">{row.size}</td>
                    <td className="py-2">{row.bust}</td>
                    <td className="py-2">{row.waist}</td>
                    <td className="py-2">{row.hip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowShareModal(false)}>
          <div className="bg-white dark:bg-charcoal-800 rounded-xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-charcoal-900 dark:text-white">Share Product</h3>
              <button onClick={() => setShowShareModal(false)} className="text-2xl">✕</button>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {[
                { name: 'Facebook', icon: '📘' },
                { name: 'Twitter', icon: '🐦' },
                { name: 'WhatsApp', icon: '💬' },
                { name: 'Email', icon: '📧' },
                { name: 'Copy Link', icon: '🔗' },
                { name: 'Pinterest', icon: '📌' }
              ].map((platform) => (
                <button
                  key={platform.name}
                  className="flex flex-col items-center gap-2 p-4 bg-cool-gray-50 dark:bg-charcoal-700 rounded-lg hover:bg-cool-gray-100 dark:hover:bg-charcoal-600 transition-colors"
                >
                  <span className="text-3xl">{platform.icon}</span>
                  <span className="text-xs text-charcoal-900 dark:text-white">{platform.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
