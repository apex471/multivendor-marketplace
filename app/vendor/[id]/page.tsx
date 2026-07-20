'use client';

import { getAuthToken } from '@/lib/api/auth';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import Header from '../../../components/common/Header';
import Footer from '../../../components/common/Footer';
import { useCart } from '../../../contexts/CartContext';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useToast } from '@/components/common/Toast';

interface VendorInfo {
  id: string;
  name: string;
  logo: string | null;
  banner: string | null;
  description: string;
  rating: number;
  reviews: number;
  productCount: number;
  followers: number;
  verified: boolean;
  location: string;
  joinedDate: string;
  email: string;
  phone: string;
  storeName: string;
  role: string;
}

interface VendorProduct {
  id: string;
  name: string;
  price: number;
  oldPrice?: number;
  image: string;
  rating: number;
  sales: number;
  inStock: boolean;
}

export default function VendorDetailPage() {
  const params = useParams();
  const vendorId = params.id as string;
  const router = useRouter();
  const { addItem: addToCart } = useCart();
  const { formatPrice } = useLocalization();
  const { success: toastSuccess, info: toastInfo } = useToast();
  const [activeTab, setActiveTab] = useState<'products' | 'about'>('products');
  const [isFollowing, setIsFollowing] = useState(false);

  const [vendor, setVendor] = useState<VendorInfo | null>(null);
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [bannerError, setBannerError] = useState(false);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    fetch(`/api/vendors/${vendorId}`)
      .then(r => r.json())
      .then(json => {
        if (!json.success || !json.data?.vendor) return;
        const v = json.data.vendor;
        setVendor({
          id:           String(v.id),
          name:         v.storeName || v.name,
          logo:         v.avatar || null,
          banner:       v.banner || null,
          description:  v.bio || `Welcome to ${v.storeName || v.name}'s store.`,
          rating:       v.rating ?? 0,
          reviews:      v.reviewCount ?? 0,
          productCount: v.productCount,
          followers:    v.followerCount ?? 0,
          verified:     true,
          location:     v.businessCity ? `${v.businessCity}${v.businessState ? ', ' + v.businessState : ''}` : '',
          joinedDate:   new Date(v.joinedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          email:        v.email || '',
          phone:        v.phoneNumber || '',
          storeName:    v.storeName || v.name,
          role:         v.role || 'vendor',
        });
        setProducts((json.data.products ?? []).map((p: {
          id: string; name: string; price: number; oldPrice?: number;
          image?: string; rating?: number; salesCount?: number; inStock?: boolean;
        }) => ({
          id:      String(p.id),
          name:    p.name,
          price:   p.price,
          oldPrice: p.oldPrice,
          image:   p.image || '/images/placeholder.jpg',
          rating:  p.rating ?? 0,
          sales:   p.salesCount ?? 0,
          inStock: p.inStock ?? true,
        })));
      })
      .catch(err => console.error('Error fetching vendor details:', err))
      .finally(() => setIsLoading(false));
  }, [vendorId]);

  useEffect(() => {
    if (vendor?.name) {
      document.title = `${vendor.storeName || vendor.name} | Certified Luxury World`;
    }
  }, [vendor]);

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
    toastSuccess('Added to cart!');
  };

  const handleFollow = async () => {
    const token = getAuthToken();
    if (!token) { toastInfo('Please log in to follow vendors'); router.push('/auth/login'); return; }
    const method = isFollowing ? 'DELETE' : 'POST';
    const url = isFollowing ? `/api/follow?followingId=${params.id}` : '/api/follow';
    const opts: RequestInit = {
      method,
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    };
    if (!isFollowing) opts.body = JSON.stringify({ followingId: params.id });
    await fetch(url, opts);
    setIsFollowing(!isFollowing);
    toastSuccess(isFollowing ? 'Unfollowed' : 'Now following! 🎉');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cool-gray-50 dark:bg-charcoal-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-gold-600 border-t-transparent animate-spin" />
          <p className="text-charcoal-600 dark:text-cool-gray-400">Loading store…</p>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-cool-gray-50 dark:bg-charcoal-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-xl font-bold text-charcoal-900 dark:text-white mb-2">Store not found</h2>
          <p className="text-charcoal-500 dark:text-cool-gray-400 mb-6">This store may have moved or been deactivated.</p>
          <Link href="/vendors" className="px-6 py-3 bg-gold-600 text-white rounded-xl font-semibold hover:bg-gold-700 transition-colors">
            Browse All Stores
          </Link>
        </div>
      </div>
    );
  }

  const showBanner = !!vendor.banner && !bannerError;
  const showLogo   = !!vendor.logo   && !logoError;

  return (
    <div className="min-h-screen bg-cool-gray-50 dark:bg-charcoal-900">
      <Header />

      {/* ── Banner ────────────────────────────────────────────────────────── */}
      <div className="relative h-52 sm:h-72 md:h-80 overflow-hidden">
        {showBanner ? (
          <Image
            src={vendor.banner!}
            alt={`${vendor.name} banner`}
            fill
            className="object-cover"
            priority
            onError={() => setBannerError(true)}
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-charcoal-700 via-charcoal-800 to-charcoal-950">
            <div className="absolute inset-0 opacity-30"
              style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #B8962E 0%, transparent 55%), radial-gradient(circle at 80% 20%, #6B4E0A 0%, transparent 55%)' }} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Profile Card ───────────────────────────────────────────────── */}
        <div className="relative -mt-20 sm:-mt-24 mb-8 z-10">
          <div className="bg-white dark:bg-charcoal-800 rounded-2xl shadow-xl border border-cool-gray-100 dark:border-charcoal-700 p-5 sm:p-8">
            <div className="flex flex-col sm:flex-row gap-5 sm:gap-8">

              {/* Logo */}
              <div className="shrink-0 mx-auto sm:mx-0 relative">
                <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full border-4 border-white dark:border-charcoal-800 shadow-xl overflow-hidden bg-gradient-to-br from-gold-600 to-gold-800 ring-2 ring-gold-500/20">
                  {showLogo ? (
                    <Image
                      src={vendor.logo!}
                      alt={vendor.name}
                      width={144}
                      height={144}
                      className="object-cover w-full h-full"
                      onError={() => setLogoError(true)}
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-4xl font-bold select-none">
                      {vendor.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                {vendor.verified && (
                  <div className="absolute bottom-1 right-1 w-7 h-7 bg-blue-600 rounded-full border-2 border-white dark:border-charcoal-800 flex items-center justify-center shadow" title="Verified">
                    <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 text-center sm:text-left">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center justify-center sm:justify-start gap-2 mb-1 flex-wrap">
                      <h1 className="text-2xl sm:text-3xl font-bold text-charcoal-900 dark:text-white">{vendor.name}</h1>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold-100 dark:bg-gold-900/30 text-gold-700 dark:text-gold-400 font-bold uppercase tracking-wide shrink-0">
                        {vendor.role === 'brand' ? 'Brand' : 'Vendor'}
                      </span>
                    </div>
                    {vendor.location && (
                      <p className="text-sm text-charcoal-500 dark:text-cool-gray-400 flex items-center justify-center sm:justify-start gap-1 mb-1">
                        <span>📍</span>{vendor.location}
                      </p>
                    )}
                    <p className="text-xs text-charcoal-400 dark:text-cool-gray-500">Member since {vendor.joinedDate}</p>
                  </div>
                  <button
                    onClick={handleFollow}
                    className={`shrink-0 px-6 py-2.5 rounded-xl font-semibold transition-all text-sm shadow-sm hover:shadow-md active:scale-95 ${
                      isFollowing
                        ? 'bg-cool-gray-100 dark:bg-charcoal-700 text-charcoal-700 dark:text-white hover:bg-cool-gray-200'
                        : 'bg-gold-600 text-white hover:bg-gold-700'
                    }`}
                  >
                    {isFollowing ? '✓ Following' : '+ Follow'}
                  </button>
                </div>

                <p className="text-sm text-charcoal-600 dark:text-cool-gray-300 mb-5 max-w-prose">{vendor.description}</p>

                {/* Stats */}
                <div className="flex flex-wrap justify-center sm:justify-start gap-5">
                  {[
                    { label: 'Products', value: vendor.productCount },
                    { label: 'Followers', value: vendor.followers.toLocaleString() },
                    { label: 'Rating', value: vendor.rating > 0 ? `${vendor.rating.toFixed(1)} ⭐` : '— ⭐' },
                    { label: 'Reviews', value: vendor.reviews },
                  ].map(({ label, value }) => (
                    <div key={label} className="text-center sm:text-left min-w-[60px]">
                      <p className="text-lg font-bold text-charcoal-900 dark:text-white leading-none">{value}</p>
                      <p className="text-xs text-charcoal-400 dark:text-cool-gray-500 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tabs ─────────────────────────────────────────────────────────── */}
        <div className="mb-6">
          <div className="flex gap-1 bg-white dark:bg-charcoal-800 rounded-xl border border-cool-gray-100 dark:border-charcoal-700 p-1 shadow-sm w-fit">
            {(['products', 'about'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 rounded-lg font-semibold text-sm capitalize transition-all ${
                  activeTab === tab
                    ? 'bg-gold-600 text-white shadow-sm'
                    : 'text-charcoal-600 dark:text-cool-gray-400 hover:text-charcoal-900 dark:hover:text-white'
                }`}
              >
                {tab === 'products' ? `Products (${vendor.productCount})` : 'About'}
              </button>
            ))}
          </div>
        </div>

        {/* ── Content ─────────────────────────────────────────────────────── */}
        <div className="pb-16">
          {activeTab === 'products' && (
            products.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-charcoal-800 rounded-2xl border border-cool-gray-100 dark:border-charcoal-700">
                <div className="text-5xl mb-4">🛍️</div>
                <h3 className="text-xl font-bold text-charcoal-900 dark:text-white mb-2">No products yet</h3>
                <p className="text-charcoal-500 dark:text-cool-gray-400">This store hasn't listed any products yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                {products.map(product => (
                  <div key={product.id} className="group bg-white dark:bg-charcoal-800 rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-cool-gray-100 dark:border-charcoal-700 flex flex-col">
                    <Link href={`/product/${product.id}`} className="relative aspect-square overflow-hidden block">
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        unoptimized
                      />
                      {product.oldPrice && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded-full">SALE</span>
                      )}
                      {!product.inStock && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="text-white text-xs font-bold bg-black/60 px-3 py-1 rounded-full">Out of Stock</span>
                        </div>
                      )}
                    </Link>
                    <div className="p-3 flex flex-col flex-1">
                      <h3 className="font-semibold text-xs sm:text-sm text-charcoal-900 dark:text-white mb-1.5 line-clamp-2 leading-tight flex-1">
                        {product.name}
                      </h3>
                      <div className="flex items-center gap-1 mb-2">
                        <span className="text-yellow-500 text-xs">⭐</span>
                        <span className="text-xs text-charcoal-600 dark:text-cool-gray-400">{product.rating > 0 ? product.rating.toFixed(1) : 'New'}</span>
                        {product.sales > 0 && <span className="text-xs text-charcoal-400 dark:text-cool-gray-500">({product.sales} sold)</span>}
                      </div>
                      <div className="flex items-center gap-1.5 mb-3">
                        <span className="font-bold text-sm text-charcoal-900 dark:text-white">{formatPrice(product.price)}</span>
                        {product.oldPrice && (
                          <span className="text-xs text-charcoal-400 line-through">{formatPrice(product.oldPrice)}</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleAddToCart(product)}
                        disabled={!product.inStock}
                        className="w-full py-2 bg-gold-600 hover:bg-gold-700 disabled:bg-cool-gray-200 dark:disabled:bg-charcoal-700 text-white disabled:text-charcoal-400 rounded-lg transition-all font-semibold text-xs active:scale-95 disabled:cursor-not-allowed"
                      >
                        {product.inStock ? 'Add to Cart' : 'Out of Stock'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {activeTab === 'about' && (
            <div className="bg-white dark:bg-charcoal-800 rounded-2xl border border-cool-gray-100 dark:border-charcoal-700 p-6 sm:p-8 shadow-sm">
              <h2 className="text-xl font-bold text-charcoal-900 dark:text-white mb-4">About {vendor.name}</h2>
              <p className="text-charcoal-600 dark:text-cool-gray-300 leading-relaxed mb-8">{vendor.description}</p>

              <div className="grid sm:grid-cols-2 gap-5">
                <div className="p-4 rounded-xl bg-cool-gray-50 dark:bg-charcoal-900 border border-cool-gray-200 dark:border-charcoal-700">
                  <h3 className="font-semibold text-charcoal-900 dark:text-white mb-3 flex items-center gap-2 text-sm">
                    <span>📬</span> Contact
                  </h3>
                  <div className="space-y-2 text-sm text-charcoal-600 dark:text-cool-gray-400">
                    {vendor.location && <p>📍 {vendor.location}</p>}
                    {vendor.email && <p>✉️ {vendor.email}</p>}
                    {vendor.phone && <p>📞 {vendor.phone}</p>}
                    {!vendor.location && !vendor.email && !vendor.phone && (
                      <p className="text-charcoal-400 italic text-xs">No contact info provided</p>
                    )}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-cool-gray-50 dark:bg-charcoal-900 border border-cool-gray-200 dark:border-charcoal-700">
                  <h3 className="font-semibold text-charcoal-900 dark:text-white mb-3 flex items-center gap-2 text-sm">
                    <span>📊</span> Store Stats
                  </h3>
                  <div className="space-y-2 text-sm text-charcoal-600 dark:text-cool-gray-400">
                    <p>🗓️ Joined {vendor.joinedDate}</p>
                    <p>📦 {vendor.productCount} active product{vendor.productCount !== 1 ? 's' : ''}</p>
                    <p>👥 {vendor.followers.toLocaleString()} follower{vendor.followers !== 1 ? 's' : ''}</p>
                    {vendor.rating > 0 && <p>⭐ {vendor.rating.toFixed(1)} avg. rating ({vendor.reviews} reviews)</p>}
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
