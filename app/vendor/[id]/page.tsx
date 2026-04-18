'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Header from '../../../components/common/Header';
import Footer from '../../../components/common/Footer';
import { useCart } from '../../../contexts/CartContext';

export default function VendorDetailPage({ params }: { params: { id: string } }) {
  const { addItem: addToCart } = useCart();
  const [activeTab, setActiveTab] = useState<'products' | 'posts' | 'about'>('products');
  const [isFollowing, setIsFollowing] = useState(false);

  interface VendorInfo {
    id: string; name: string; logo: string; banner: string; description: string;
    category: string; rating: number; reviews: number; products: number;
    followers: number; verified: boolean; location: string; distance: number;
    responseTime: string; joinedDate: string;
  }
  interface VendorProduct {
    id: string; name: string; price: number; oldPrice?: number;
    image: string; rating: number; sales: number; inStock: boolean;
  }

  const [vendor, setVendor] = useState<VendorInfo | null>(null);
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/vendors/${params.id}`)
      .then(r => r.json())
      .then(json => {
        if (!json.success || !json.data?.vendor) return;
        const v = json.data.vendor;
        setVendor({
          id:           String(v.id),
          name:         v.name,
          logo:         v.avatar || '/images/placeholder.jpg',
          banner:       '/images/placeholder.jpg',
          description:  v.bio || `Welcome to ${v.name}'s store.`,
          category:     'Vendor',
          rating:       0,
          reviews:      0,
          products:     v.productCount,
          followers:    0,
          verified:     true,
          location:     '',
          distance:     0,
          responseTime: 'N/A',
          joinedDate:   new Date(v.joinedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setProducts((json.data.products ?? []).map((p: any) => ({
          id:      String(p.id),
          name:    p.name,
          price:   p.price,
          oldPrice: p.oldPrice,
          image:   p.image,
          rating:  p.rating ?? 0,
          sales:   p.salesCount ?? 0,
          inStock: p.inStock ?? true,
        })));
      })
      .finally(() => setIsLoading(false));
  }, [params.id]);

  const handleAddToCart = (product: VendorProduct) => {
    addToCart({
      productId: product.id,
      name:      product.name,
      price:     product.price,
      image:     product.image,
      vendor:    vendor?.name ?? 'Vendor',
      size:      '',
      color:     '',
      quantity:  1,
    });
  };

  const handleFollow = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!token) { alert('Please log in to follow vendors'); return; }
    const method = isFollowing ? 'DELETE' : 'POST';
    const url = isFollowing ? `/api/follow?followingId=${params.id}` : '/api/follow';
    const opts: RequestInit = {
      method,
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    };
    if (!isFollowing) opts.body = JSON.stringify({ followingId: params.id });
    await fetch(url, opts);
    setIsFollowing(!isFollowing);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-charcoal-900 flex items-center justify-center">
        <div className="text-center"><div className="text-6xl mb-4">⏳</div><p>Loading...</p></div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-white dark:bg-charcoal-900 flex items-center justify-center">
        <div className="text-center"><div className="text-6xl mb-4">❌</div><p>Vendor not found</p></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      <Header />

      {/* Vendor Banner */}
      <div className="relative h-48 sm:h-64 md:h-80 bg-linear-to-r from-primary-600 to-secondary-600">
        <Image
          src={vendor.banner}
          alt={vendor.name}
          fill
          className="object-cover opacity-50"
        />
      </div>

      <div className="container mx-auto px-4">
        {/* Vendor Header */}
        <div className="relative -mt-16 sm:-mt-20 mb-8">
          <div className="bg-white rounded-xl shadow-xl p-4 sm:p-6 md:p-8">
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
              {/* Logo */}
              <div className="flex-shrink-0 mx-auto sm:mx-0">
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white bg-white shadow-lg overflow-hidden">
                  <Image
                    src={vendor.logo}
                    alt={vendor.name}
                    width={128}
                    height={128}
                    className="object-cover w-full h-full"
                  />
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 text-center sm:text-left">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                      <h1 className="text-2xl sm:text-3xl font-display font-bold text-gray-900">
                        {vendor.name}
                      </h1>
                      {vendor.verified && (
                        <span className="text-blue-600 text-2xl sm:text-3xl" title="Verified">✓</span>
                      )}
                    </div>
                    <p className="text-sm sm:text-base text-gray-600 flex items-center justify-center sm:justify-start gap-1 mb-2">
                      <span>📍</span> {vendor.location} • {vendor.distance} km away
                    </p>
                    <p className="text-sm sm:text-base text-gray-500">Member since {vendor.joinedDate}</p>
                  </div>
                  <button
                    onClick={handleFollow}
                    className={`px-6 py-3 min-h-[44px] rounded-lg font-semibold transition-all text-sm sm:text-base touch-manipulation ${
                      isFollowing
                        ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        : 'bg-primary-700 text-white hover:bg-primary-800'
                    }`}
                  >
                    {isFollowing ? '✓ Following' : '+ Follow'}
                  </button>
                </div>

                <p className="text-sm sm:text-base text-gray-700 mb-4">{vendor.description}</p>

                {/* Stats */}
                <div className="flex flex-wrap justify-center sm:justify-start gap-4 sm:gap-6 text-sm sm:text-base">
                  <div className="flex items-center gap-1.5">
                    <span className="text-yellow-500">⭐</span>
                    <span className="font-semibold">{vendor.rating}</span>
                    <span className="text-gray-500">({vendor.reviews} reviews)</span>
                  </div>
                  <div className="text-gray-700">
                    <span className="font-semibold">{vendor.products}</span> Products
                  </div>
                  <div className="text-gray-700">
                    <span className="font-semibold">{vendor.followers.toLocaleString()}</span> Followers
                  </div>
                  <div className="text-gray-700">
                    Response: <span className="font-semibold">{vendor.responseTime}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 sm:mb-8">
          <div className="flex gap-2 sm:gap-4 border-b border-gray-200 overflow-x-auto">
            <button
              onClick={() => setActiveTab('products')}
              className={`px-4 sm:px-6 py-3 sm:py-4 font-semibold whitespace-nowrap transition-colors touch-manipulation text-sm sm:text-base ${
                activeTab === 'products'
                  ? 'text-primary-700 border-b-2 border-primary-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Products ({vendor.products})
            </button>
            <button
              onClick={() => setActiveTab('posts')}
              className={`px-4 sm:px-6 py-3 sm:py-4 font-semibold whitespace-nowrap transition-colors touch-manipulation text-sm sm:text-base ${
                activeTab === 'posts'
                  ? 'text-primary-700 border-b-2 border-primary-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Posts
            </button>
            <button
              onClick={() => setActiveTab('about')}
              className={`px-4 sm:px-6 py-3 sm:py-4 font-semibold whitespace-nowrap transition-colors touch-manipulation text-sm sm:text-base ${
                activeTab === 'about'
                  ? 'text-primary-700 border-b-2 border-primary-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              About
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="pb-12">
          {activeTab === 'products' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
              {products.map(product => (
                <div key={product.id} className="group bg-white rounded-lg sm:rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all">
                  <a
                    href={`/product/${product.id}`}
                    className="relative aspect-square overflow-hidden w-full touch-manipulation block"
                  >
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    {product.oldPrice && (
                      <span className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 px-1.5 py-0.5 sm:px-2 sm:py-1 bg-red-600 text-white text-[10px] sm:text-xs font-bold rounded">
                        SALE
                      </span>
                    )}
                  </a>
                  <div className="p-2 sm:p-3">
                    <h3 className="font-semibold text-xs sm:text-sm text-gray-900 mb-1 sm:mb-2 line-clamp-2 leading-tight">
                      {product.name}
                    </h3>
                    <div className="flex items-center gap-0.5 sm:gap-1 mb-1 sm:mb-2">
                      <span className="text-yellow-500 text-[10px] sm:text-xs">⭐</span>
                      <span className="text-[10px] sm:text-xs font-medium text-gray-700">{product.rating}</span>
                      <span className="text-[10px] sm:text-xs text-gray-500">({product.sales})</span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 mb-1.5 sm:mb-2">
                      <span className="font-bold text-sm sm:text-base text-gray-900">${product.price}</span>
                      {product.oldPrice && (
                        <span className="text-[10px] sm:text-xs text-gray-500 line-through">${product.oldPrice}</span>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleAddToCart(product);
                      }}
                      className="w-full py-1.5 sm:py-2 min-h-[36px] bg-primary-700 text-white rounded-lg hover:bg-primary-800 active:scale-95 transition-all font-semibold text-[11px] sm:text-xs touch-manipulation"
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'posts' && (
            <div className="text-center py-12 bg-white rounded-xl">
              <div className="text-5xl mb-4">📝</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No posts yet</h3>
              <p className="text-gray-600">This vendor has not shared any posts yet</p>
            </div>
          )}

          {activeTab === 'about' && (
            <div className="bg-white rounded-xl p-6 sm:p-8 shadow-md">
              <h2 className="text-xl sm:text-2xl font-display font-bold text-gray-900 mb-4">About {vendor.name}</h2>
              <p className="text-sm sm:text-base text-gray-700 mb-6">{vendor.description}</p>
              
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 text-base sm:text-lg">Contact Information</h3>
                  <div className="space-y-2 text-sm sm:text-base">
                    <p className="text-gray-700">📍 {vendor.location}</p>
                    <p className="text-gray-700">📧 contact@luxuryfashionco.com</p>
                    <p className="text-gray-700">📞 +1 (555) 123-4567</p>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 text-base sm:text-lg">Business Hours</h3>
                  <div className="space-y-2 text-sm sm:text-base text-gray-700">
                    <p>Monday - Friday: 9:00 AM - 8:00 PM</p>
                    <p>Saturday: 10:00 AM - 6:00 PM</p>
                    <p>Sunday: Closed</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
