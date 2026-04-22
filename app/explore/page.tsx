'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import { getAuthToken } from '@/lib/api/auth';

interface TrendingPost {
  id: string;
  image: string | null;
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
  id: string;
  username: string;
  fullName: string;
  avatar: string | null;
  followers: number;
  verified: boolean;
  isFollowing: boolean;
}

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

export default function ExplorePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'posts' | 'people' | 'tags'>('posts');
  const [searchQuery, setSearchQuery] = useState('');
  const [trendingPosts, setTrendingPosts] = useState<TrendingPost[]>([]);
  const [postsPage, setPostsPage] = useState(1);
  const [postsHasMore, setPostsHasMore] = useState(false);
  const [postsLoading, setPostsLoading] = useState(false);
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersHasMore, setUsersHasMore] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [searchDebounce, setSearchDebounce] = useState('');

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounce(searchQuery), 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const fetchPosts = useCallback(async (page: number, append = false) => {
    setPostsLoading(true);
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`/api/posts?page=${page}&limit=24`, { headers });
      const json = await res.json();
      if (!json.success) return;
      const mapped: TrendingPost[] = (json.data.posts ?? []).map((p: {
        _id: string; images?: string[]; likes: number; comments: number;
        authorName?: string; authorAvatar?: string;
      }) => ({
        id:       String(p._id),
        image:    p.images?.[0] ?? null,
        likes:    p.likes,
        comments: p.comments,
        user: {
          username: p.authorName ?? 'user',
          avatar:   p.authorAvatar ?? `https://i.pravatar.cc/40?u=${p._id}`,
        },
      }));
      setTrendingPosts(prev => append ? [...prev, ...mapped] : mapped);
      setPostsHasMore(json.data.pagination?.hasNext ?? false);
    } finally {
      setPostsLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async (page: number, q: string, append = false) => {
    setUsersLoading(true);
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const qParam = q ? `&q=${encodeURIComponent(q)}` : '';
      const res = await fetch(`/api/users?page=${page}&limit=15${qParam}`, { headers });
      const json = await res.json();
      if (!json.success) return;
      setSuggestedUsers(prev => append ? [...prev, ...json.data.users] : json.data.users);
      setUsersHasMore(json.data.pagination?.hasNext ?? false);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => { fetchPosts(1); }, [fetchPosts]);
  useEffect(() => { fetchUsers(1, ''); }, [fetchUsers]);

  // Re-fetch users on search debounce
  useEffect(() => {
    setUsersPage(1);
    fetchUsers(1, searchDebounce);
  }, [searchDebounce, fetchUsers]);

  const handleFollowUser = async (userId: string, currently: boolean) => {
    const token = getAuthToken();
    if (!token) { router.push('/auth/login'); return; }
    const method = currently ? 'DELETE' : 'POST';
    const url = currently ? `/api/follow?followingId=${userId}` : '/api/follow';
    const opts: RequestInit = {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    };
    if (!currently) opts.body = JSON.stringify({ followingId: userId });
    const res = await fetch(url, opts);
    const json = await res.json();
    if (json.success) {
      setSuggestedUsers(prev => prev.map(u =>
        u.id === userId
          ? { ...u, isFollowing: !currently, followers: json.data.followerCount ?? u.followers }
          : u
      ));
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // search is handled via debounce + fetchUsers
  };

  const handleLoadMorePosts = () => {
    const next = postsPage + 1;
    setPostsPage(next);
    fetchPosts(next, true);
  };

  const handleLoadMoreUsers = () => {
    const next = usersPage + 1;
    setUsersPage(next);
    fetchUsers(next, searchDebounce, true);
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
            {postsLoading && trendingPosts.length === 0 && (
              <div className="py-16 text-center text-charcoal-500 dark:text-cool-gray-400">Loading posts…</div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
              {trendingPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/post/${post.id}`}
                  className="group relative aspect-square overflow-hidden rounded-lg bg-gray-200"
                >
                  {post.image ? (
                    <Image
                      src={post.image as string}
                      alt={`Post ${post.id}`}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-4xl">📷</div>
                  )}
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
            {postsHasMore && (
              <div className="mt-8 text-center">
                <button
                  onClick={handleLoadMorePosts}
                  disabled={postsLoading}
                  className="px-8 py-3 border-2 border-cool-gray-300 dark:border-charcoal-600 text-charcoal-700 dark:text-cool-gray-300 rounded-lg font-semibold hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 transition-colors disabled:opacity-50"
                >
                  {postsLoading ? 'Loading…' : 'Load More Posts'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Suggested People Tab */}
        {activeTab === 'people' && (
          <div>
            {usersLoading && suggestedUsers.length === 0 && (
              <div className="py-16 text-center text-charcoal-500 dark:text-cool-gray-400">Loading people…</div>
            )}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {suggestedUsers.map((user) => (
                <div key={user.id} className="bg-white dark:bg-charcoal-800 rounded-lg shadow-md p-6">
                  <div className="flex flex-col items-center text-center">
                    <Link href={`/profile/${user.username}`} className="mb-4">
                      <div className="relative">
                        <Image
                          src={(user.avatar ?? `https://i.pravatar.cc/80?u=${user.id}`) as string}
                          alt={user.fullName}
                          width={80}
                          height={80}
                          className="rounded-full object-cover"
                        />
                        {user.verified && (
                          <div className="absolute bottom-0 right-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center border-2 border-white">
                            <span className="text-white text-xs">✓</span>
                          </div>
                        )}
                      </div>
                    </Link>

                    <Link href={`/profile/${user.username}`} className="hover:text-gold-600">
                      <h3 className="font-bold text-lg text-charcoal-900 dark:text-white mb-1">{user.fullName}</h3>
                  </Link>
                  <p className="text-charcoal-600 dark:text-cool-gray-400 mb-4 text-sm">
                      {user.followers.toLocaleString()} followers
                    </p>

                    <div className="flex gap-2 w-full">
                      <Link
                        href={`/profile/${user.username}`}
                        className="flex-1 px-4 py-2 bg-gold-600 text-white rounded-lg font-semibold hover:bg-gold-700 transition-colors text-center"
                      >
                        View Profile
                      </Link>
                      <button
                        onClick={() => handleFollowUser(user.id, user.isFollowing)}
                        className={`px-4 py-2 border-2 rounded-lg font-semibold transition-colors ${
                          user.isFollowing
                            ? 'border-gray-300 text-charcoal-700 dark:text-cool-gray-300 hover:bg-gray-50 dark:hover:bg-charcoal-700'
                            : 'border-gold-600 text-gold-600 hover:bg-gold-50 dark:hover:bg-charcoal-700'
                        }`}
                      >
                        {user.isFollowing ? 'Following' : 'Follow'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Load More */}
            {usersHasMore && (
              <div className="mt-8 text-center">
                <button
                  onClick={handleLoadMoreUsers}
                  disabled={usersLoading}
                  className="px-8 py-3 border-2 border-cool-gray-300 dark:border-charcoal-600 text-charcoal-700 dark:text-cool-gray-300 rounded-lg font-semibold hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 transition-colors disabled:opacity-50"
                >
                  {usersLoading ? 'Loading…' : 'Load More People'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Trending Tags Tab */}
        {activeTab === 'tags' && (
          <div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {TRENDING_TAGS.map((tag, index) => (
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
              <h2 className="text-2xl font-bold text-charcoal-900 dark:text-white mb-6">Browse by Category</h2>
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
