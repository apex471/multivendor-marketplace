'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import { useRouter } from 'next/navigation';
import { useCart } from '../../contexts/CartContext';

interface PostProduct {
  id: string;
  name: string;
  price: number;
  image: string;
  vendor: string;
  vendorId: string;
}

interface Post {
  id: string;
  author: {
    name: string;
    avatar: string;
    verified: boolean;
    isVendor: boolean;
  };
  content: string;
  images: string[];
  likes: number;
  comments: number;
  shares: number;
  timestamp: string;
  liked: boolean;
  saved: boolean;
  product?: PostProduct;
}

export default function FeedPage() {
  const router = useRouter();
  const { addItem } = useCart();

  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [, setIsLoadingFeed] = useState(true);

  // Fetch live posts from API
  useEffect(() => {
    fetch('/api/posts?limit=20')
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data?.posts?.length) {
          const livePosts: Post[] = json.data.posts.map((p: {
            _id: string; authorName: string; authorRole: string;
            content: string; images: string[]; product?: PostProduct;
            likes: number; comments: number; shares: number; createdAt: string;
          }) => ({
            id:        p._id,
            author: {
              name:     p.authorName,
              avatar:   '/images/placeholder.jpg',
              verified: p.authorRole !== 'customer',
              isVendor: p.authorRole === 'vendor' || p.authorRole === 'brand',
            },
            content:   p.content,
            images:    p.images ?? [],
            product:   p.product,
            likes:     p.likes,
            comments:  p.comments,
            shares:    p.shares,
            timestamp: new Date(p.createdAt).toLocaleDateString(),
            liked:     false,
            saved:     false,
          }));
          // Set live posts
          setPosts(livePosts);
        }
      })
      .catch(() => { /* keep empty feed */ })
      .finally(() => setIsLoadingFeed(false));
  }, []);

  const handleLike = (postId: string) => {
    setPosts(posts.map(post =>
      post.id === postId
        ? { ...post, liked: !post.liked, likes: post.liked ? post.likes - 1 : post.likes + 1 }
        : post
    ));
  };

  const handleSave = (postId: string) => {
    setPosts(posts.map(post =>
      post.id === postId ? { ...post, saved: !post.saved } : post
    ));
  };

  const handleBuyNow = (product: PostProduct) => {
    addItem({
      productId: product.id,
      name:      product.name,
      price:     product.price,
      image:     product.image,
      vendor:    product.vendor,
      size:      'One Size',
      color:     'Default',
      quantity:  1,
    });
    router.push('/checkout/review');
  };

  const handleCreatePost = () => {
    if (!newPostContent.trim()) {
      router.push('/post/create');
      return;
    }
    alert('Post created! (This would save to backend)');
    setNewPostContent('');
  };

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      <Header />

      <div className="container mx-auto px-4 py-6 sm:py-8 md:py-12">
        <div className="max-w-2xl mx-auto">
          {/* Page Header */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-charcoal-900 dark:text-white mb-2">
              Fashion Feed
            </h1>
            <p className="text-sm sm:text-base text-charcoal-600 dark:text-cool-gray-400">
              Share and discover the latest fashion trends
            </p>
          </div>

          {/* Create Post */}
          <div className="bg-white dark:bg-charcoal-800 rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-md mb-6">
            <div className="flex gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-linear-to-br from-gold-600 to-gold-700 flex items-center justify-center text-white font-bold shrink-0">
                U
              </div>
              <div className="flex-1">
                <textarea
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder="Share your fashion moment..."
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg border border-cool-gray-300 dark:border-charcoal-700 bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white focus:outline-none focus:border-gold-600 resize-none text-sm sm:text-base"
                  rows={3}
                />
                <div className="flex items-center justify-between mt-3">
                  <div className="flex gap-2">
                    <button className="p-2 hover:bg-cool-gray-100 dark:hover:bg-charcoal-700 rounded-lg transition-colors touch-manipulation" title="Add photo">
                      <span className="text-lg sm:text-xl">📷</span>
                    </button>
                    <button className="p-2 hover:bg-cool-gray-100 dark:hover:bg-charcoal-700 rounded-lg transition-colors touch-manipulation" title="Add emoji">
                      <span className="text-lg sm:text-xl">😊</span>
                    </button>
                    <button className="p-2 hover:bg-cool-gray-100 dark:hover:bg-charcoal-700 rounded-lg transition-colors touch-manipulation" title="Tag product">
                      <span className="text-lg sm:text-xl">🏷️</span>
                    </button>
                  </div>
                  <button
                    onClick={handleCreatePost}
                    className="px-4 sm:px-6 py-2 min-h-9 bg-gold-600 text-white rounded-lg font-semibold hover:bg-gold-700 active:scale-95 transition-all text-xs sm:text-sm touch-manipulation"
                  >
                    Post
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Posts */}
          <div className="space-y-6">
            {posts.map(post => (
              <div key={post.id} className="bg-white dark:bg-charcoal-800 rounded-lg sm:rounded-xl shadow-md overflow-hidden">
                {/* Post Header */}
                <div className="p-4 sm:p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden shrink-0">
                      <Image
                        src={post.author.avatar}
                        alt={post.author.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-semibold text-sm sm:text-base text-charcoal-900 dark:text-white truncate">
                          {post.author.name}
                        </h3>
                        {post.author.verified && (
                          <span className="text-blue-600 text-sm sm:text-base shrink-0">✓</span>
                        )}
                        {post.author.isVendor && (
                          <span className="px-2 py-0.5 bg-secondary-100 text-secondary-800 text-[10px] sm:text-xs font-semibold rounded">
                            VENDOR
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-charcoal-600 dark:text-cool-gray-400">{post.timestamp}</p>
                    </div>
                    <button className="p-1.5 hover:bg-cool-gray-100 dark:hover:bg-charcoal-700 rounded-lg transition-colors touch-manipulation">
                      <span className="text-lg sm:text-xl">⋯</span>
                    </button>
                  </div>

                  {/* Post Content */}
                  <p className="text-sm sm:text-base text-charcoal-800 dark:text-cool-gray-300 mb-4 whitespace-pre-line">
                    {post.content}
                  </p>
                </div>

                {/* Post Images */}
                {post.images.length > 0 && (
                  <div className={`grid ${post.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-1`}>
                    {post.images.slice(0, 4).map((image, index) => (
                      <div
                        key={index}
                        className={`relative ${post.images.length === 1 ? 'aspect-4/3' : post.images.length === 3 && index === 0 ? 'col-span-2 aspect-video' : 'aspect-square'}`}
                      >
                        <Image
                          src={image}
                          alt={`Post image ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Product Card (vendor / brand posts only) ──────────────── */}
                {post.product && (
                  <div className="mx-4 sm:mx-6 my-3 border border-gold-200 dark:border-gold-800 rounded-xl overflow-hidden bg-gold-50 dark:bg-gold-900/20">
                    <div className="flex items-center gap-3 p-3">
                      {/* Product image */}
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0">
                        <Image
                          src={post.product.image}
                          alt={post.product.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      {/* Product info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-charcoal-900 dark:text-white truncate">
                          {post.product.name}
                        </p>
                        <p className="text-gold-600 font-bold text-base">
                          ${post.product.price.toFixed(2)}
                        </p>
                        {post.product.vendor && (
                          <p className="text-xs text-charcoal-500 dark:text-cool-gray-400 truncate">
                            by {post.product.vendor}
                          </p>
                        )}
                      </div>
                    </div>
                    {/* CTA buttons */}
                    <div className="flex border-t border-gold-200 dark:border-gold-800 divide-x divide-gold-200 dark:divide-gold-800">
                      <Link
                        href={`/product/${post.product.id}`}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold text-charcoal-700 dark:text-cool-gray-300 hover:bg-gold-100 dark:hover:bg-gold-900/40 transition-colors"
                      >
                        <span>👁️</span>
                        <span>View Product</span>
                      </Link>
                      <button
                        onClick={() => handleBuyNow(post.product!)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold bg-gold-600 text-white hover:bg-gold-700 transition-colors"
                      >
                        <span>🛍️</span>
                        <span>Buy Now</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Post Actions */}
                <div className="p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4 text-xs sm:text-sm text-gray-500">
                    <span>{post.likes.toLocaleString()} likes</span>
                    <div className="flex gap-3">
                      <span>{post.comments} comments</span>
                      <span>{post.shares} shares</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-4 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => handleLike(post.id)}
                      className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-3 rounded-lg font-semibold transition-all text-xs sm:text-sm touch-manipulation min-h-9 ${
                        post.liked
                          ? 'text-red-600 bg-red-50 dark:bg-red-900/30'
                          : 'text-charcoal-700 dark:text-cool-gray-300 hover:bg-cool-gray-100 dark:hover:bg-charcoal-700'
                      }`}
                    >
                      <span className="text-base sm:text-lg">{post.liked ? '❤️' : '🤍'}</span>
                      <span>Like</span>
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-3 rounded-lg font-semibold text-charcoal-700 dark:text-cool-gray-300 hover:bg-cool-gray-100 dark:hover:bg-charcoal-700 transition-all text-xs sm:text-sm touch-manipulation min-h-9">
                      <span className="text-base sm:text-lg">💬</span>
                      <span>Comment</span>
                    </button>
                    <button
                      onClick={() => handleSave(post.id)}
                      className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-3 rounded-lg font-semibold transition-all text-xs sm:text-sm touch-manipulation min-h-9 ${
                        post.saved
                          ? 'text-gold-600 bg-gold-50 dark:bg-gold-900/30'
                          : 'text-charcoal-700 dark:text-cool-gray-300 hover:bg-cool-gray-100 dark:hover:bg-charcoal-700'
                      }`}
                    >
                      <span className="text-base sm:text-lg">{post.saved ? '🔖' : '📑'}</span>
                      <span>Save</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Load More */}
          <div className="text-center mt-8">
            <button className="px-6 py-3 bg-white dark:bg-charcoal-800 text-charcoal-700 dark:text-cool-gray-300 border-2 border-cool-gray-300 dark:border-charcoal-600 rounded-lg font-semibold hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 transition-colors text-sm sm:text-base touch-manipulation min-h-11">
              Load More Posts
            </button>
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3">
        <Link
          href="/stories/create"
          className="w-14 h-14 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          title="Create Story"
        >
          <span className="text-2xl">📷</span>
        </Link>
        <Link
          href="/post/create"
          className="w-14 h-14 bg-gold-600 hover:bg-gold-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          title="Create Post"
        >
          <span className="text-2xl">✏️</span>
        </Link>
      </div>

      <Footer />
    </div>
  );
}
