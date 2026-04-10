'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Header from '../../../components/common/Header';
import Footer from '../../../components/common/Footer';
import { getAuthToken } from '@/lib/api/auth';

interface UploadedImage {
  id: string;
  url: string;
  file: File;
}

interface TaggedProduct {
  id: string;
  name: string;
  price: number;
  image: string;
}

export default function CreatePostPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [images, setImages]                   = useState<UploadedImage[]>([]);
  const [caption, setCaption]                 = useState('');
  const [hashtags, setHashtags]               = useState('');
  const [location, setLocation]               = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [taggedProducts, setTaggedProducts]   = useState<TaggedProduct[]>([]);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [privacy, setPrivacy]                 = useState<'public' | 'followers' | 'private'>('public');
  const [allowComments, setAllowComments]     = useState(true);
  const [isPublishing, setIsPublishing]       = useState(false);
  const [isSavingDraft, setIsSavingDraft]     = useState(false);
  const [vendorProducts, setVendorProducts]   = useState<TaggedProduct[]>([]);
  const [publishError, setPublishError]       = useState('');

  // ── Fetch vendor/brand products for product tagging ──────────────────────
  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;
    fetch('/api/vendor/products?limit=50', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data?.products) {
          const mapped: TaggedProduct[] = json.data.products.map((p: {
            _id: string; name: string; price: number; images?: string[];
          }) => ({
            id:    p._id,
            name:  p.name,
            price: p.price,
            image: p.images?.[0] ?? '/images/placeholder.jpg',
          }));
          setVendorProducts(mapped);
        }
      })
      .catch(() => { /* silently ignore — mock fallback below */ });
  }, []);

  // ── Pre-fill product from URL ?productId=xxx ─────────────────────────────
  useEffect(() => {
    const productId = searchParams.get('productId');
    if (!productId) return;
    const token = getAuthToken();
    if (!token) return;
    fetch(`/api/vendor/products/${productId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data) {
          const p = json.data;
          const product: TaggedProduct = {
            id:    p._id ?? productId,
            name:  p.name,
            price: p.price,
            image: p.images?.[0] ?? '/images/placeholder.jpg',
          };
          setTaggedProducts([product]);
          setCaption(`Check out my latest product: ${p.name}! 🛍️`);
        }
      })
      .catch(() => { /* ignore */ });
  }, [searchParams]);

  // Products shown in the search dropdown
  const mockProducts: TaggedProduct[] = vendorProducts.length > 0 ? vendorProducts : [
    { id: '1', name: 'Designer Silk Dress',  price: 299.99, image: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=100' },
    { id: '2', name: 'Leather Handbag',       price: 399.99, image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=100' },
    { id: '3', name: 'Evening Clutch',        price: 149.99, image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=100' },
  ];

  const filteredProducts = mockProducts.filter(
    product =>
      product.name.toLowerCase().includes(productSearchQuery.toLowerCase()) &&
      !taggedProducts.find(tp => tp.id === product.id)
  );

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > 10) {
      alert('Maximum 10 images allowed per post');
      return;
    }
    const newImages = files.map(file => ({
      id:  Date.now().toString() + Math.random(),
      url: URL.createObjectURL(file),
      file,
    }));
    setImages([...images, ...newImages]);
  };

  const removeImage = (id: string) => {
    setImages(images.filter(img => img.id !== id));
  };

  const moveImage = (id: string, direction: 'left' | 'right') => {
    const index = images.findIndex(img => img.id === id);
    if (
      (direction === 'left'  && index === 0) ||
      (direction === 'right' && index === images.length - 1)
    ) return;
    const newImages = [...images];
    const newIndex  = direction === 'left' ? index - 1 : index + 1;
    [newImages[index], newImages[newIndex]] = [newImages[newIndex], newImages[index]];
    setImages(newImages);
  };

  const addTaggedProduct = (product: TaggedProduct) => {
    if (taggedProducts.length >= 5) {
      alert('Maximum 5 products can be tagged per post');
      return;
    }
    setTaggedProducts([...taggedProducts, product]);
    setProductSearchQuery('');
  };

  const removeTaggedProduct = (id: string) => {
    setTaggedProducts(taggedProducts.filter(p => p.id !== id));
  };

  // ── Publish — wired to POST /api/posts ───────────────────────────────────
  const handlePublish = async () => {
    if (images.length === 0 && !caption.trim()) {
      alert('Please add an image or caption');
      return;
    }
    if (!caption.trim()) {
      alert('Please add a caption');
      return;
    }

    const token = getAuthToken();
    if (!token) {
      alert('You must be logged in to publish a post');
      router.push('/auth/login');
      return;
    }

    setIsPublishing(true);
    setPublishError('');

    try {
      const postData = {
        content:  caption.trim(),
        images:   images.map(img => img.url),
        product:  taggedProducts.length > 0
          ? {
              id:       taggedProducts[0].id,
              name:     taggedProducts[0].name,
              price:    taggedProducts[0].price,
              image:    taggedProducts[0].image,
              vendorId: '', // server fills from JWT
              vendor:   '', // server fills from JWT
            }
          : undefined,
        hashtags: hashtags.split(',').map(t => t.trim()).filter(t => t),
        privacy,
        status:   'published',
      };

      const res  = await fetch('/api/posts', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify(postData),
      });
      const json = await res.json();

      if (!json.success) {
        setPublishError(json.message || 'Failed to publish post');
        return;
      }

      router.push('/feed');
    } catch {
      setPublishError('Network error — please try again');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSaveDraft = async () => {
    if (images.length === 0 && !caption.trim()) {
      alert('Please add an image or caption');
      return;
    }

    const token = getAuthToken();
    if (!token) {
      alert('You must be logged in to save a draft');
      return;
    }

    setIsSavingDraft(true);
    try {
      const res  = await fetch('/api/posts', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({
          content:  caption.trim() || '(draft)',
          images:   images.map(img => img.url),
          hashtags: hashtags.split(',').map(t => t.trim()).filter(t => t),
          privacy,
          status:   'draft',
        }),
      });
      const json = await res.json();
      if (json.success) {
        router.push('/dashboard/vendor');
      } else {
        alert(json.message || 'Failed to save draft');
      }
    } catch {
      alert('Network error — please try again');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const suggestedHashtags = ['#fashion', '#style', '#ootd', '#luxury', '#fashionista', '#trendy'];

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      <Header />

      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-charcoal-900 dark:text-white mb-2">
              Create Post
            </h1>
            <p className="text-charcoal-600 dark:text-cool-gray-400">
              Share your fashion look with the community
            </p>
          </div>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 transition-colors"
          >
            Cancel
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Upload */}
            <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg p-6">
              <h2 className="text-xl font-bold text-charcoal-900 dark:text-white mb-4">
                Images
              </h2>

              {/* Upload Area */}
              {images.length < 10 && (
                <div className="border-2 border-dashed border-cool-gray-300 dark:border-charcoal-700 rounded-lg p-8 text-center mb-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center gap-3 w-full"
                  >
                    <div className="w-16 h-16 bg-gold-100 dark:bg-gold-900/30 rounded-full flex items-center justify-center text-3xl">
                      📷
                    </div>
                    <div>
                      <p className="text-charcoal-900 dark:text-white font-semibold">
                        Click to upload images
                      </p>
                      <p className="text-sm text-charcoal-600 dark:text-cool-gray-400">
                        JPG, PNG (max 5MB each, up to 10 images)
                      </p>
                    </div>
                  </button>
                </div>
              )}

              {/* Image Grid */}
              {images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {images.map((image, index) => (
                    <div key={image.id} className="relative group aspect-square">
                      <div className="relative w-full h-full rounded-lg overflow-hidden border-2 border-cool-gray-300 dark:border-charcoal-700">
                        <Image
                          src={image.url}
                          alt={`Upload ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                        {index === 0 && (
                          <div className="absolute top-2 left-2 bg-gold-600 text-white text-xs px-2 py-1 rounded">
                            Cover
                          </div>
                        )}
                      </div>
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                        {index > 0 && (
                          <button
                            onClick={() => moveImage(image.id, 'left')}
                            className="px-3 py-2 bg-white text-charcoal-900 rounded font-semibold text-sm"
                          >
                            ←
                          </button>
                        )}
                        <button
                          onClick={() => removeImage(image.id)}
                          className="px-3 py-2 bg-red-600 text-white rounded font-semibold text-sm"
                        >
                          Remove
                        </button>
                        {index < images.length - 1 && (
                          <button
                            onClick={() => moveImage(image.id, 'right')}
                            className="px-3 py-2 bg-white text-charcoal-900 rounded font-semibold text-sm"
                          >
                            →
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Caption */}
            <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg p-6">
              <h2 className="text-xl font-bold text-charcoal-900 dark:text-white mb-4">
                Caption
              </h2>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write a caption for your post..."
                rows={6}
                className="w-full px-4 py-3 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-white resize-none"
                maxLength={2200}
              />
              <div className="flex items-center justify-between mt-2">
                <p className="text-sm text-charcoal-600 dark:text-cool-gray-400">
                  {caption.length} / 2200 characters
                </p>
              </div>
            </div>

            {/* Hashtags */}
            <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg p-6">
              <h2 className="text-xl font-bold text-charcoal-900 dark:text-white mb-4">
                Hashtags
              </h2>
              <input
                type="text"
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                placeholder="fashion, style, ootd (comma-separated)"
                className="w-full px-4 py-3 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-white"
              />
              <div className="mt-3">
                <p className="text-xs text-charcoal-600 dark:text-cool-gray-400 mb-2">
                  Suggested:
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestedHashtags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => {
                        const currentTags = hashtags.split(',').map(t => t.trim()).filter(t => t);
                        if (!currentTags.includes(tag.substring(1))) {
                          setHashtags(currentTags.length > 0 ? `${hashtags}, ${tag.substring(1)}` : tag.substring(1));
                        }
                      }}
                      className="px-3 py-1 bg-cool-gray-100 dark:bg-charcoal-700 rounded-full text-sm hover:bg-gold-100 dark:hover:bg-gold-900/30 transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg p-6">
              <h2 className="text-xl font-bold text-charcoal-900 dark:text-white mb-4">
                Location
              </h2>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Add location (e.g., New York, NY)"
                className="w-full px-4 py-3 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-white"
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Tagged Products */}
            <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg p-4">
              <h3 className="font-bold text-charcoal-900 dark:text-white mb-3">
                Tag Products
              </h3>
              
              {!showProductSearch ? (
                <button
                  onClick={() => setShowProductSearch(true)}
                  className="w-full px-4 py-3 bg-gold-600 text-white rounded-lg hover:bg-gold-700 transition-colors font-semibold"
                >
                  🏷️ Tag Products
                </button>
              ) : (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={productSearchQuery}
                    onChange={(e) => setProductSearchQuery(e.target.value)}
                    placeholder="Search products..."
                    className="w-full px-3 py-2 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-white text-sm"
                    autoFocus
                  />
                  
                  {productSearchQuery && (
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {filteredProducts.map((product) => (
                        <button
                          key={product.id}
                          onClick={() => addTaggedProduct(product)}
                          className="w-full flex items-center gap-2 p-2 hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 rounded-lg transition-colors"
                        >
                          <div className="relative w-10 h-10 rounded overflow-hidden shrink-0">
                          </div>
                          <div className="text-left flex-1">
                            <p className="text-sm font-semibold text-charcoal-900 dark:text-white truncate">
                              {product.name}
                            </p>
                            <p className="text-xs text-charcoal-600 dark:text-cool-gray-400">
                              ${product.price}
                            </p>
                          </div>
                        </button>
                      ))}
                      {filteredProducts.length === 0 && (
                        <p className="text-sm text-charcoal-600 dark:text-cool-gray-400 text-center py-2">
                          No products found
                        </p>
                      )}
                    </div>
                  )}
                  
                  <button
                    onClick={() => {
                      setShowProductSearch(false);
                      setProductSearchQuery('');
                    }}
                    className="w-full px-3 py-2 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Tagged Products List */}
              {taggedProducts.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs text-charcoal-600 dark:text-cool-gray-400">
                    Tagged ({taggedProducts.length}/5)
                  </p>
                  {taggedProducts.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center gap-2 p-2 bg-cool-gray-50 dark:bg-charcoal-900 rounded"
                    >
                      <div className="relative w-10 h-10 rounded overflow-hidden shrink-0">
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-charcoal-900 dark:text-white truncate">
                          {product.name}
                        </p>
                      </div>
                      <button
                        onClick={() => removeTaggedProduct(product.id)}
                        className="text-red-600 hover:text-red-700 text-sm shrink-0"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Privacy Settings */}
            <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg p-4">
              <h3 className="font-bold text-charcoal-900 dark:text-white mb-3">
                Privacy
              </h3>
              <select
                value={privacy}
                onChange={(e) => setPrivacy(e.target.value as 'public' | 'followers' | 'private')}
                className="w-full px-3 py-2 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-white"
              >
                <option value="public">🌍 Public</option>
                <option value="followers">👥 Followers Only</option>
                <option value="private">🔒 Private</option>
              </select>

              <label className="flex items-center gap-2 mt-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowComments}
                  onChange={(e) => setAllowComments(e.target.checked)}
                  className="w-4 h-4 text-gold-600 border-cool-gray-300 rounded"
                />
                <span className="text-sm text-charcoal-700 dark:text-cool-gray-300">
                  Allow comments
                </span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {publishError && (
                <p className="text-sm text-red-600 dark:text-red-400 font-medium">{publishError}</p>
              )}
              <button
                onClick={handlePublish}
                disabled={isPublishing}
                className="w-full px-6 py-4 bg-gold-600 text-white rounded-lg hover:bg-gold-700 transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPublishing ? 'Publishing...' : '🚀 Publish Post'}
              </button>
              <button
                onClick={handleSaveDraft}
                disabled={isSavingDraft}
                className="w-full px-6 py-3 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSavingDraft ? 'Saving...' : '💾 Save Draft'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
