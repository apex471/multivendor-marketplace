'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';

interface TrendingPost {
  id: string;
  image: string;
  likes: number;
  comments: number;
  user: {
    username: string;
    avatar: string;
  };
}

interface TrendingTag {
  name: string;
  count: number;
}

interface SuggestedUser {
  username: string;
  fullName: string;
  avatar: string;
  followers: number;
  isVerified: boolean;
  category: string;
}

// Pre-computed outside component — avoids impure Math.random() calls during render
const TRENDING_POSTS: TrendingPost[] = Array.from({ length: 24 }, (_, i) => ({
  id: String(i + 1),
  image: `https://images.unsplash.com/photo-${1551028719 + i}00167b16eac5?w=400`,
  likes: 500 + (i * 197 % 4500),
  comments: 50 + (i * 43 % 450),
  user: {
    username: `user_${i + 1}`,
    avatar: `https://i.pravatar.cc/150?u=user${i}`,
  },
}));

const TRENDING_TAGS: TrendingTag[] = [
  { name: 'FallFashion', count: 12345 },
  { name: 'OOTD', count: 9876 },
  { name: 'StreetStyle', count: 8765 },
  { name: 'Sneakers', count: 7654 },
  { name: 'Minimalist', count: 6543 },
  { name: 'VintageFashion', count: 5432 },
  { name: 'SustainableFashion', count: 4321 },
  { name: 'LuxuryFashion', count: 3210 },
  { name: 'CasualStyle', count: 2109 },
  { name: 'FormalWear', count: 1987 },
];

const SUGGESTED_USERS: SuggestedUser[] = [
    {
      username: 'fashionista_queen',
      fullName: 'Emma Wilson',
      avatar: 'https://i.pravatar.cc/150?u=emma',
      followers: 45600,
      isVerified: true,
      category: 'Fashion Influencer',
    },
    {
      username: 'urban_streetwear',
      fullName: 'Marcus Lee',
      avatar: 'https://i.pravatar.cc/150?u=marcus',
      followers: 32100,
      isVerified: true,
      category: 'Streetwear Expert',
    },
    {
      username: 'chic_boutique',
      fullName: 'Sophia Chen',
      avatar: 'https://i.pravatar.cc/150?u=sophia',
      followers: 28900,
      isVerified: false,
      category: 'Boutique Owner',
    },
    {
      username: 'minimalist_style',
      fullName: 'Alex Johnson',
      avatar: 'https://i.pravatar.cc/150?u=alex',
      followers: 19800,
      isVerified: true,
      category: 'Style Curator',
    },
    {
      username: 'vintage_finds',
      fullName: 'Isabella Rose',
      avatar: 'https://i.pravatar.cc/150?u=isabella',
      followers: 15400,
      isVerified: false,
      category: 'Vintage Collector',
    },
];

export default function ExplorePage() {
  const [activeTab, setActiveTab] = useState<'posts' | 'people' | 'tags'>('posts');
  const [searchQuery, setSearchQuery] = useState('');

  const trendingPosts = TRENDING_POSTS;
  const trendingTags = TRENDING_TAGS;
  const suggestedUsers = SUGGESTED_USERS;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: wire to search page
  };

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      <Header />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-charcoal-900 dark:text-white mb-4">Explore</h1>
          
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="max-w-2xl">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for posts, people, or tags..."
                className="w-full px-4 py-3 pl-12 border border-cool-gray-300 dark:border-charcoal-700 bg-white dark:bg-charcoal-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-600 focus:border-transparent text-charcoal-900 dark:text-white"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🔍</span>
            </div>
          </form>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-charcoal-800 rounded-lg shadow-md mb-6">
          <div className="flex border-b border-cool-gray-200 dark:border-charcoal-700">
            <button
              onClick={() => setActiveTab('posts')}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === 'posts'
                  ? 'text-gold-600 border-b-2 border-gold-600'
                  : 'text-charcoal-600 dark:text-cool-gray-400 hover:text-gold-600'
              }`}
            >
              🔥 Trending Posts
            </button>
            <button
              onClick={() => setActiveTab('people')}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === 'people'
                  ? 'text-gold-600 border-b-2 border-gold-600'
                  : 'text-charcoal-600 hover:text-gold-600'
              }`}
            >
              👥 Suggested People
            </button>
            <button
              onClick={() => setActiveTab('tags')}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === 'tags'
                  ? 'text-gold-600 border-b-2 border-gold-600'
                  : 'text-charcoal-600 hover:text-gold-600'
              }`}
            >
              #️⃣ Trending Tags
            </button>
          </div>
        </div>

        {/* Trending Posts Tab */}
        {activeTab === 'posts' && (
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
              {trendingPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/post/${post.id}`}
                  className="group relative aspect-square overflow-hidden rounded-lg bg-gray-200"
                >
                  <Image
                    src={post.image}
                    alt={`Post ${post.id}`}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform"
                  />
                  {/* User Avatar Overlay */}
                  <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Image
                      src={post.user.avatar}
                      alt={post.user.username}
                      width={32}
                      height={32}
                      className="rounded-full border-2 border-white"
                    />
                  </div>
                  {/* Stats Overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6 text-white">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">❤️</span>
                      <span className="font-semibold">{post.likes.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">💬</span>
                      <span className="font-semibold">{post.comments}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Load More */}
            <div className="mt-8 text-center">
              <button className="px-8 py-3 border-2 border-cool-gray-300 dark:border-charcoal-600 text-charcoal-700 dark:text-cool-gray-300 rounded-lg font-semibold hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 transition-colors">
                Load More Posts
              </button>
            </div>
          </div>
        )}

        {/* Suggested People Tab */}
        {activeTab === 'people' && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {suggestedUsers.map((user) => (
              <div key={user.username} className="bg-white dark:bg-charcoal-800 rounded-lg shadow-md p-6">
                <div className="flex flex-col items-center text-center">
                  <Link href={`/profile/${user.username}`} className="mb-4">
                    <div className="relative">
                      <Image
                        src={user.avatar}
                        alt={user.fullName}
                        width={80}
                        height={80}
                        className="rounded-full"
                      />
                      {user.isVerified && (
                        <div className="absolute bottom-0 right-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center border-2 border-white">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                    </div>
                  </Link>

                  <Link href={`/profile/${user.username}`} className="hover:text-gold-600">
                    <h3 className="font-bold text-lg text-charcoal-900 mb-1">{user.fullName}</h3>
                  </Link>
                  <p className="text-charcoal-600 mb-2">@{user.username}</p>
                  <p className="text-sm text-gold-600 font-medium mb-3">{user.category}</p>
                  <p className="text-sm text-charcoal-600 mb-4">
                    {user.followers.toLocaleString()} followers
                  </p>

                  <div className="flex gap-2 w-full">
                    <Link
                      href={`/profile/${user.username}`}
                      className="flex-1 px-4 py-2 bg-gold-600 text-white rounded-lg font-semibold hover:bg-gold-700 transition-colors text-center"
                    >
                      View Profile
                    </Link>
                    <button className="px-4 py-2 border-2 border-cool-gray-300 dark:border-charcoal-600 text-charcoal-700 dark:text-cool-gray-300 rounded-lg font-semibold hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 transition-colors">
                      Follow
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Load More */}
            <div className="sm:col-span-2 lg:col-span-3 text-center mt-4">
              <button className="px-8 py-3 border-2 border-cool-gray-300 dark:border-charcoal-600 text-charcoal-700 dark:text-cool-gray-300 rounded-lg font-semibold hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 transition-colors">
                Load More People
              </button>
            </div>
          </div>
        )}

        {/* Trending Tags Tab */}
        {activeTab === 'tags' && (
          <div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {trendingTags.map((tag, index) => (
                <Link
                  key={tag.name}
                  href={`/explore?tag=${tag.name}`}
                  className="bg-white dark:bg-charcoal-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-l-4 border-gold-600"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl font-bold text-charcoal-900 dark:text-white">#{index + 1}</span>
                    <span className="text-2xl">🔥</span>
                  </div>
                  <h3 className="text-xl font-bold text-charcoal-900 dark:text-white mb-2">#{tag.name}</h3>
                  <p className="text-charcoal-600 dark:text-cool-gray-400">
                    {tag.count.toLocaleString()} posts
                  </p>
                </Link>
              ))}
            </div>

            {/* Featured Categories */}
            <div className="mt-12">
              <h2 className="text-2xl font-bold text-charcoal-900 mb-6">Browse by Category</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {[
                  { name: 'Streetwear', emoji: '👟' },
                  { name: 'Formal', emoji: '👔' },
                  { name: 'Casual', emoji: '👕' },
                  { name: 'Athletic', emoji: '⚽' },
                  { name: 'Vintage', emoji: '📻' },
                  { name: 'Luxury', emoji: '💎' },
                  { name: 'Sustainable', emoji: '🌱' },
                  { name: 'Accessories', emoji: '👜' },
                  { name: 'Footwear', emoji: '👞' },
                  { name: 'Jewelry', emoji: '💍' },
                ].map((category) => (
                  <Link
                    key={category.name}
                    href={`/explore?category=${category.name}`}
                    className="bg-linear-to-br from-gold-500 to-gold-700 rounded-lg p-6 text-white text-center hover:scale-105 transition-transform"
                  >
                    <div className="text-4xl mb-2">{category.emoji}</div>
                    <div className="font-semibold">{category.name}</div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
