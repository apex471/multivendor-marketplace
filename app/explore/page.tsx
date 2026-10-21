'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import { getAuthToken } from '@/lib/api/auth';

interface TrendingPost {
  id: string;
  image: string | null;
  video: string | null;
  likes: number;
  comments: number;
  user: {
    username: string;
    avatar: string | null;
  };
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
  const [trendingTags, setTrendingTags] = useState<{ name: string; count: number; likes: number }[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [categories, setCategories] = useState<{ name: string; count: number; icon: string }[]>([]);

  const postsSentinelRef = useRef<HTMLDivElement>(null);
  const usersSentinelRef = useRef<HTMLDivElement>(null);

  // Dedicated refs to prevent race conditions, duplicate loads, and focus-loss scroll jumps
  const isFetchingPostsRef = useRef(false);
  const isFetchingUsersRef = useRef(false);
  const postsPageRef = useRef(1);
  const usersPageRef = useRef(1);
  const isInitialUsersLoadRef = useRef(true);

  useEffect(() => {
    document.title = "Explore Trends & Style | Certified Luxury World";
  }, []);

  // Parse tag parameter from URL on client mount without causing route re-renders
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tagParam = params.get('tag');
      if (tagParam) {
        setSearchQuery(`#${tagParam.replace(/^#/, '')}`);
        setActiveTab('posts');
      }
    }
  }, []);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounce(searchQuery), 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const fetchPosts = useCallback(async (page: number, append = false) => {
    if (isFetchingPostsRef.current && append) return;
    isFetchingPostsRef.current = true;
    setPostsLoading(true);

    try {
      const token = getAuthToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`/api/posts?page=${page}&limit=24`, { headers });
      const json = await res.json();
      if (!json.success || !Array.isArray(json.data?.posts)) return;

      const mapped: TrendingPost[] = (json.data.posts ?? []).map((p: {
        id?: string; _id?: string; images?: string[]; videos?: string[]; likes: number; comments: number;
        authorName?: string; authorAvatar?: string;
      }) => ({
        id:       String(p.id ?? p._id ?? ''),
        image:    p.images?.[0] ?? null,
        video:    p.videos?.[0] ?? null,
        likes:    p.likes ?? 0,
        comments: p.comments ?? 0,
        user: {
          username: p.authorName ?? 'user',
          avatar:   p.authorAvatar ?? null,
        },
      }));

      setTrendingPosts(prev => {
        if (!append) return mapped;
        // Deduplicate by ID to prevent duplicate React keys & layout jumps
        const existingIds = new Set(prev.map(p => p.id));
        const unique = mapped.filter(p => p.id && !existingIds.has(p.id));
        return [...prev, ...unique];
      });

      setPostsHasMore(Boolean(json.data.pagination?.hasNext));
    } catch (err) {
      console.error('[Explore] fetchPosts error:', err);
    } finally {
      setPostsLoading(false);
      isFetchingPostsRef.current = false;
    }
  }, []);

  const fetchUsers = useCallback(async (page: number, q: string, append = false) => {
    if (isFetchingUsersRef.current && append) return;
    isFetchingUsersRef.current = true;
    setUsersLoading(true);

    try {
      const token = getAuthToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const qParam = q ? `&q=${encodeURIComponent(q)}` : '';
      const res = await fetch(`/api/users?page=${page}&limit=15${qParam}`, { headers });
      const json = await res.json();
      if (!json.success || !Array.isArray(json.data?.users)) return;

      setSuggestedUsers(prev => {
        if (!append) return json.data.users;
        const existingIds = new Set(prev.map(u => u.id));
        const unique = (json.data.users as SuggestedUser[]).filter(u => u.id && !existingIds.has(u.id));
        return [...prev, ...unique];
      });

      setUsersHasMore(Boolean(json.data.pagination?.hasNext));
    } catch (err) {
      console.error('[Explore] fetchUsers error:', err);
    } finally {
      setUsersLoading(false);
      isFetchingUsersRef.current = false;
    }
  }, []);

  const fetchTags = useCallback(async () => {
    setTagsLoading(true);
    try {
      const res = await fetch('/api/posts/trending-tags?limit=20&days=7');
      const json = await res.json();
      if (json.success && Array.isArray(json.data.tags)) {
        setTrendingTags(json.data.tags);
      }
    } catch (err) {
      console.error('[Explore] fetchTags error:', err);
    } finally {
      setTagsLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/products/categories');
      const json = await res.json();
      if (json.success && Array.isArray(json.data.categories)) {
        setCategories(json.data.categories.map((c: { name: string; count: number; icon: string }) => ({
          name:  c.name,
          count: c.count,
          icon:  c.icon,
        })));
      }
    } catch { /* silent */ }
  }, []);

  // Initial load
  useEffect(() => {
    postsPageRef.current = 1;
    fetchPosts(1, false);
  }, [fetchPosts]);

  useEffect(() => {
    usersPageRef.current = 1;
    fetchUsers(1, '', false);
  }, [fetchUsers]);

  useEffect(() => { fetchTags(); }, [fetchTags]);
  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  // Periodic tag updates (every 2 minutes) without resetting user scroll or posts
  useEffect(() => {
    const tagInterval = setInterval(() => {
      fetchTags();
    }, 120_000);
    return () => clearInterval(tagInterval);
  }, [fetchTags]);

  // Re-fetch users on search debounce (skip initial mount to avoid duplicate fetch)
  useEffect(() => {
    if (isInitialUsersLoadRef.current) {
      isInitialUsersLoadRef.current = false;
      return;
    }
    usersPageRef.current = 1;
    setUsersPage(1);
    fetchUsers(1, searchDebounce, false);
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
    try {
      const res = await fetch(url, opts);
      const json = await res.json();
      if (json.success) {
        setSuggestedUsers(prev => prev.map(u =>
          u.id === userId
            ? { ...u, isFollowing: !currently, followers: json.data.followerCount ?? u.followers }
            : u
        ));
      }
    } catch (err) {
      console.error('[Explore] handleFollowUser error:', err);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const handleLoadMorePosts = useCallback((e?: React.MouseEvent<HTMLButtonElement>) => {
    if (e) {
      e.preventDefault();
      // Crucial: blur button before it can be disabled by React re-render.
      // In browsers, when a focused element becomes disabled, focus falls back to document.body,
      // which triggers an automatic scroll reset back to (0, 0).
      (e.currentTarget as HTMLElement)?.blur();
    }

    if (isFetchingPostsRef.current || postsLoading || !postsHasMore) return;

    // Snapshot current scroll position to guarantee stability
    const currentScrollY = typeof window !== 'undefined' ? window.scrollY : 0;

    const next = postsPageRef.current + 1;
    postsPageRef.current = next;
    setPostsPage(next);
    fetchPosts(next, true);

    // Safeguard against any browser-level scroll reset
    if (typeof window !== 'undefined' && currentScrollY > 0) {
      requestAnimationFrame(() => {
        if (window.scrollY === 0 && currentScrollY > 0) {
          window.scrollTo({ top: currentScrollY, behavior: 'instant' });
        }
      });
    }
  }, [postsLoading, postsHasMore, fetchPosts]);

  const handleLoadMoreUsers = useCallback((e?: React.MouseEvent<HTMLButtonElement>) => {
    if (e) {
      e.preventDefault();
      (e.currentTarget as HTMLElement)?.blur();
    }

    if (isFetchingUsersRef.current || usersLoading || !usersHasMore) return;

    const currentScrollY = typeof window !== 'undefined' ? window.scrollY : 0;

    const next = usersPageRef.current + 1;
    usersPageRef.current = next;
    setUsersPage(next);
    fetchUsers(next, searchDebounce, true);

    if (typeof window !== 'undefined' && currentScrollY > 0) {
      requestAnimationFrame(() => {
        if (window.scrollY === 0 && currentScrollY > 0) {
          window.scrollTo({ top: currentScrollY, behavior: 'instant' });
        }
      });
    }
  }, [usersLoading, usersHasMore, searchDebounce, fetchUsers]);

  // Infinite Scroll Observer for Trending Posts
  useEffect(() => {
    if (activeTab !== 'posts' || !postsHasMore || postsLoading) return;
    const sentinel = postsSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !postsLoading && !isFetchingPostsRef.current && postsHasMore) {
        handleLoadMorePosts();
      }
    }, { rootMargin: '200px' });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [activeTab, postsHasMore, postsLoading, handleLoadMorePosts]);

  // Infinite Scroll Observer for Suggested People
  useEffect(() => {
    if (activeTab !== 'people' || !usersHasMore || usersLoading) return;
    const sentinel = usersSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !usersLoading && !isFetchingUsersRef.current && usersHasMore) {
        handleLoadMoreUsers();
      }
    }, { rootMargin: '200px' });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [activeTab, usersHasMore, usersLoading, handleLoadMoreUsers]);

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
              type="button"
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
              type="button"
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
              type="button"
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
              {trendingPosts.map((post, idx) => (
                <Link
                  key={post.id ? `${post.id}-${idx}` : `post-${idx}`}
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
                  ) : post.video ? (
                    <div className="w-full h-full relative bg-charcoal-950 flex items-center justify-center">
                      <video src={post.video} className="w-full h-full object-cover" muted playsInline loop autoPlay />
                      <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md rounded px-1.5 py-0.5 text-[9px] text-white font-bold flex items-center gap-1">
                        <span>📹</span> <span>Video</span>
                      </div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-4xl">📷</div>
                  )}
                  {/* User Avatar Overlay */}
                  <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {post.user.avatar ? (
                      <Image
                        src={post.user.avatar}
                        alt={post.user.username}
                        width={32}
                        height={32}
                        className="rounded-full border-2 border-white object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full border-2 border-white bg-gold-600 flex items-center justify-center text-white text-xs font-bold">
                        {post.user.username.slice(0, 2).toUpperCase()}
                      </div>
                    )}
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

            {/* Infinite Scroll Sentinel & Load More */}
            <div ref={postsSentinelRef} className="h-6 w-full pointer-events-none" />
            {postsHasMore && (
              <div className="mt-6 mb-8 text-center">
                <button
                  type="button"
                  onClick={handleLoadMorePosts}
                  disabled={postsLoading}
                  aria-busy={postsLoading}
                  className="px-8 py-3.5 border-2 border-cool-gray-300 dark:border-charcoal-600 text-charcoal-700 dark:text-cool-gray-300 rounded-lg font-semibold hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 mx-auto"
                >
                  {postsLoading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin text-gold-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span>Loading more posts…</span>
                    </>
                  ) : (
                    <>
                      <span>View More Posts</span>
                      <span>↓</span>
                    </>
                  )}
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
              {suggestedUsers.map((user, idx) => (
                <div key={user.id ? `${user.id}-${idx}` : `user-${idx}`} className="bg-white dark:bg-charcoal-800 rounded-lg shadow-md p-6">
                  <div className="flex flex-col items-center text-center">
                    <Link href={`/profile/${user.username}`} className="mb-4">
                      <div className="relative w-20 h-20">
                        {user.avatar ? (
                          <Image
                            src={user.avatar}
                            alt={user.fullName}
                            width={80}
                            height={80}
                            className="w-20 h-20 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-full bg-linear-to-br from-gold-400 to-gold-600 flex items-center justify-center text-white font-bold text-2xl">
                            {user.fullName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                        )}
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
                        type="button"
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

            {/* Infinite Scroll Sentinel & Load More */}
            <div ref={usersSentinelRef} className="h-6 w-full pointer-events-none" />
            {usersHasMore && (
              <div className="mt-6 mb-8 text-center">
                <button
                  type="button"
                  onClick={handleLoadMoreUsers}
                  disabled={usersLoading}
                  aria-busy={usersLoading}
                  className="px-8 py-3.5 border-2 border-cool-gray-300 dark:border-charcoal-600 text-charcoal-700 dark:text-cool-gray-300 rounded-lg font-semibold hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 mx-auto"
                >
                  {usersLoading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin text-gold-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span>Loading more people…</span>
                    </>
                  ) : (
                    <>
                      <span>View More People</span>
                      <span>↓</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Trending Tags Tab */}
        {activeTab === 'tags' && (
          <div>
            {tagsLoading && trendingTags.length === 0 && (
              <div className="py-16 text-center text-charcoal-500 dark:text-cool-gray-400">Loading trending tags…</div>
            )}
            {!tagsLoading && trendingTags.length === 0 && (
              <div className="py-16 text-center text-charcoal-500 dark:text-cool-gray-400">No trending tags yet. Start posting with hashtags!</div>
            )}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {trendingTags.map((tag, index) => (
                <button
                  type="button"
                  key={tag.name}
                  onClick={() => {
                    setSearchQuery(`#${tag.name.replace(/^#/, '')}`);
                    setActiveTab('posts');
                    if (typeof window !== 'undefined') {
                      window.history.pushState(null, '', `/explore?tag=${encodeURIComponent(tag.name)}`);
                    }
                  }}
                  className="text-left bg-white dark:bg-charcoal-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-l-4 border-gold-600 cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl font-bold text-charcoal-900 dark:text-white">#{index + 1}</span>
                    <span className="text-2xl group-hover:scale-110 transition-transform">🔥</span>
                  </div>
                  <h3 className="text-xl font-bold text-charcoal-900 dark:text-white mb-2">#{tag.name}</h3>
                  <p className="text-charcoal-600 dark:text-cool-gray-400">
                    {tag.count.toLocaleString()} posts
                  </p>
                </button>
              ))}
            </div>

            {/* Browse by Category — fetched from real product data */}
            <div className="mt-12">
              <h2 className="text-2xl font-bold text-charcoal-900 dark:text-white mb-6">Browse by Category</h2>
              {categories.length === 0 ? (
                <p className="text-charcoal-500 dark:text-cool-gray-400 text-sm">No categories found yet.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  {categories.map((category) => (
                    <Link
                      key={category.name}
                      href={`/shop?category=${encodeURIComponent(category.name)}`}
                      className="bg-linear-to-br from-gold-500 to-gold-700 rounded-lg p-6 text-white text-center hover:scale-105 transition-transform"
                    >
                      <div className="text-4xl mb-2">{category.icon}</div>
                      <div className="font-semibold">{category.name}</div>
                      <div className="text-xs opacity-80 mt-1">{category.count} products</div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
