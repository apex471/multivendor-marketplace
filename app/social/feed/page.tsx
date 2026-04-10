'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Header from '../../../components/common/Header';
import Footer from '../../../components/common/Footer';
import { useCart } from '../../../contexts/CartContext';

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
    username: string;
    avatar: string;
    verified: boolean;
    type: 'customer' | 'vendor' | 'brand';
  };
  content: {
    text: string;
    images: string[];
  };
  likes: number;
  comments: number;
  shares: number;
  timestamp: string;
  tags: string[];
  isLiked: boolean;
  product?: PostProduct;
}

interface Story {
  id: string;
  author: {
    name: string;
    avatar: string;
  };
  thumbnail: string;
  viewed: boolean;
}

export default function FeedPage() {
  const router = useRouter();
  const { addItem } = useCart();
  const [activeTab, setActiveTab] = useState<'foryou' | 'following' | 'trending'>('foryou');
  
  const [stories] = useState<Story[]>([
    {
      id: '1',
      author: { name: 'Fashion Daily', avatar: '👗' },
      thumbnail: '/images/story1.jpg',
      viewed: false
    },
    {
      id: '2',
      author: { name: 'Style Tips', avatar: '💅' },
      thumbnail: '/images/story2.jpg',
      viewed: false
    },
    {
      id: '3',
      author: { name: 'Gucci Official', avatar: '👑' },
      thumbnail: '/images/story3.jpg',
      viewed: true
    },
    {
      id: '4',
      author: { name: 'Luxury Fashion', avatar: '✨' },
      thumbnail: '/images/story4.jpg',
      viewed: false
    },
  ]);

  const [posts, setPosts] = useState<Post[]>([
    {
      id: '1',
      author: {
        name: 'Fashion Daily',
        username: '@fashiondaily',
        avatar: '👗',
        verified: true,
        type: 'vendor'
      },
      content: {
        text: 'New Summer Collection 2025! 🌞 Discover the latest trends in sustainable fashion. Limited edition pieces available now! #SummerStyle #SustainableFashion',
        images: ['/images/post1.jpg', '/images/post1b.jpg']
      },
      likes: 2543,
      comments: 187,
      shares: 92,
      timestamp: '2 hours ago',
      tags: ['summer', 'sustainable', 'collection'],
      isLiked: false,
      product: { id: 'social-p1', name: 'Summer Linen Dress', price: 189.99, image: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=400', vendor: 'Fashion Daily', vendorId: 'vendor-social-1' },
    },
    {
      id: '2',
      author: {
        name: 'Sarah Chen',
        username: '@sarahstyle',
        avatar: '👩',
        verified: false,
        type: 'customer'
      },
      content: {
        text: 'OOTD: Mixing vintage with modern pieces 💫 Found this amazing jacket at @luxuryfashion! What do you think? #OOTD #StreetStyle',
        images: ['/images/post2.jpg']
      },
      likes: 1234,
      comments: 89,
      shares: 34,
      timestamp: '4 hours ago',
      tags: ['ootd', 'streetstyle', 'vintage'],
      isLiked: true
    },
    {
      id: '3',
      author: {
        name: 'Gucci',
        username: '@gucci',
        avatar: '👑',
        verified: true,
        type: 'brand'
      },
      content: {
        text: 'Introducing the Encore Collection. A celebration of Italian craftsmanship and timeless elegance. 🇮🇹✨ Now available exclusively on our platform.',
        images: ['/images/post3.jpg', '/images/post3b.jpg', '/images/post3c.jpg']
      },
      likes: 45678,
      comments: 2341,
      shares: 890,
      timestamp: '6 hours ago',
      tags: ['gucci', 'luxury', 'newcollection'],
      isLiked: false,
      product: { id: 'social-p3', name: 'Gucci Encore Bag', price: 2450.00, image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400', vendor: 'Gucci', vendorId: 'vendor-gucci' },
    },
  ]);

  const handleLike = (postId: string) => {
    setPosts(posts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          isLiked: !post.isLiked,
          likes: post.isLiked ? post.likes - 1 : post.likes + 1
        };
      }
      return post;
    }));
  };

  const getAuthorBadge = (type: string) => {
    switch (type) {
      case 'vendor': return '🏪';
      case 'brand': return '👑';
      default: return '';
    }
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

  // Static post counts — no Math.random during render
  const trendingCounts = [24, 47, 13, 31, 8];

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      <Header />
      
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Feed */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stories */}
            <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-xl p-4">
              <div className="flex gap-4 overflow-x-auto">
                {/* Add Story */}
                <button className="shrink-0 flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-full bg-linear-to-br from-gold-400 to-gold-600 flex items-center justify-center text-2xl border-4 border-white dark:border-charcoal-800">
                    +
                  </div>
                  <span className="text-xs text-charcoal-600 dark:text-cool-gray-400">Add Story</span>
                </button>

                {/* Stories */}
                {stories.map((story) => (
                  <button key={story.id} className="shrink-0 flex flex-col items-center gap-2">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl border-4 ${
                      story.viewed 
                        ? 'border-cool-gray-300 dark:border-charcoal-600' 
                        : 'border-gradient-to-br from-pink-500 to-purple-500'
                    } ${!story.viewed ? 'ring-2 ring-gold-600' : ''}`}>
                      {story.author.avatar}
                    </div>
                    <span className="text-xs text-charcoal-600 dark:text-cool-gray-400 max-w-16 truncate">
                      {story.author.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-xl">
              <div className="flex border-b border-cool-gray-300 dark:border-charcoal-700">
                {(['foryou', 'following', 'trending'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 px-6 py-4 text-sm font-semibold capitalize transition-colors ${
                      activeTab === tab
                        ? 'text-gold-600 border-b-2 border-gold-600'
                        : 'text-charcoal-600 dark:text-cool-gray-400'
                    }`}
                  >
                    {tab === 'foryou' ? 'For You' : tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Posts */}
            {posts.map((post) => (
              <div key={post.id} className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-xl overflow-hidden">
                {/* Post Header */}
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-linear-to-br from-gold-400 to-gold-600 flex items-center justify-center text-2xl">
                      {post.author.avatar}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-charcoal-900 dark:text-white">{post.author.name}</span>
                        {post.author.verified && <span className="text-blue-500">✓</span>}
                        {getAuthorBadge(post.author.type) && (
                          <span className="text-sm">{getAuthorBadge(post.author.type)}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-charcoal-600 dark:text-cool-gray-400">
                        <span>{post.author.username}</span>
                        <span>•</span>
                        <span>{post.timestamp}</span>
                      </div>
                    </div>
                  </div>
                  <button className="text-charcoal-600 dark:text-cool-gray-400 hover:text-charcoal-900 dark:hover:text-white">
                    ⋯
                  </button>
                </div>

                {/* Post Content */}
                <div className="px-4 pb-4">
                  <p className="text-charcoal-900 dark:text-white mb-3 whitespace-pre-line">{post.content.text}</p>
                  
                  {/* Post Images */}
                  {post.content.images.length > 0 && (
                    <div className={`grid gap-2 ${post.content.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                      {post.content.images.map((img, idx) => (
                        <div key={idx} className="aspect-square bg-cool-gray-200 dark:bg-charcoal-700 rounded-lg overflow-hidden">
                          <div className="w-full h-full flex items-center justify-center text-4xl">
                            📸
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ── Product Card (vendor / brand only) ─────────────────────────── */}
                  {post.product && (
                    <div className="mt-3 border border-gold-200 dark:border-gold-800 rounded-xl overflow-hidden bg-gold-50 dark:bg-gold-900/20">
                      <div className="flex items-center gap-3 p-3">
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0">
                          <Image
                            src={post.product.image}
                            alt={post.product.name}
                            fill
                            className="object-cover"
                          />
                        </div>
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
                </div>

                {/* Post Actions */}
                <div className="border-t border-cool-gray-300 dark:border-charcoal-700 px-4 py-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-6">
                      <button 
                        onClick={() => handleLike(post.id)}
                        className="flex items-center gap-2 text-charcoal-600 dark:text-cool-gray-400 hover:text-gold-600 transition-colors"
                      >
                        <span className="text-xl">{post.isLiked ? '❤️' : '🤍'}</span>
                        <span className="text-sm font-semibold">{post.likes.toLocaleString()}</span>
                      </button>
                      <button className="flex items-center gap-2 text-charcoal-600 dark:text-cool-gray-400 hover:text-gold-600 transition-colors">
                        <span className="text-xl">💬</span>
                        <span className="text-sm font-semibold">{post.comments}</span>
                      </button>
                      <button className="flex items-center gap-2 text-charcoal-600 dark:text-cool-gray-400 hover:text-gold-600 transition-colors">
                        <span className="text-xl">🔄</span>
                        <span className="text-sm font-semibold">{post.shares}</span>
                      </button>
                    </div>
                    <button className="text-charcoal-600 dark:text-cool-gray-400 hover:text-gold-600 transition-colors">
                      <span className="text-xl">🔖</span>
                    </button>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag, idx) => (
                      <Link 
                        key={idx}
                        href={`/explore/tag/${tag}`}
                        className="text-xs text-gold-600 hover:text-gold-700 font-semibold"
                      >
                        #{tag}
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Comment Input */}
                <div className="border-t border-cool-gray-300 dark:border-charcoal-700 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-linear-to-br from-gold-400 to-gold-600 flex items-center justify-center text-lg">
                      👤
                    </div>
                    <input
                      type="text"
                      placeholder="Write a comment..."
                      className="flex-1 px-4 py-2 bg-cool-gray-50 dark:bg-charcoal-700 border border-cool-gray-300 dark:border-charcoal-600 text-charcoal-900 dark:text-white rounded-full focus:ring-2 focus:ring-gold-500 text-sm"
                    />
                    <button className="text-gold-600 hover:text-gold-700 font-semibold text-sm">
                      Post
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Trending Tags */}
            <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-xl p-4">
              <h3 className="font-bold text-charcoal-900 dark:text-white mb-4">🔥 Trending</h3>
              <div className="space-y-3">
                {['#SummerFashion2025', '#OOTD', '#LuxuryStyle', '#SustainableFashion', '#StreetWear'].map((tag, idx) => (
                  <Link 
                    key={idx}
                    href={`/explore/tag/${tag.slice(1)}`}
                    className="block hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 p-2 rounded-lg transition-colors"
                  >
                    <div className="font-semibold text-charcoal-900 dark:text-white">{tag}</div>
                    <div className="text-xs text-charcoal-600 dark:text-cool-gray-400">{trendingCounts[idx]}K posts</div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Suggested Follows */}
            <div className="bg-white dark:bg-charcoal-800 border border-cool-gray-300 dark:border-charcoal-700 rounded-xl p-4">
              <h3 className="font-bold text-charcoal-900 dark:text-white mb-4">👥 Suggested for You</h3>
              <div className="space-y-4">
                {[
                  { name: 'Luxury Fashion Co.', username: '@luxuryfashion', avatar: '🏪', verified: true },
                  { name: 'Style Insider', username: '@styleinsider', avatar: '✨', verified: false },
                  { name: 'Prada Official', username: '@prada', avatar: '👑', verified: true },
                ].map((user, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-linear-to-br from-gold-400 to-gold-600 flex items-center justify-center text-xl">
                        {user.avatar}
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-sm text-charcoal-900 dark:text-white">{user.name}</span>
                          {user.verified && <span className="text-blue-500 text-xs">✓</span>}
                        </div>
                        <div className="text-xs text-charcoal-600 dark:text-cool-gray-400">{user.username}</div>
                      </div>
                    </div>
                    <button className="px-4 py-1 bg-gold-600 text-white text-xs font-semibold rounded-full hover:bg-gold-700 transition-colors">
                      Follow
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
