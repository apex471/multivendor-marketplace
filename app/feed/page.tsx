'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import { useRouter } from 'next/navigation';
import { useCart } from '../../contexts/CartContext';
import { getAuthToken } from '@/lib/api/auth';

interface StoryAuthor {
  id: string;
  username: string;
  name: string;
  avatar?: string | null;
}

interface Story {
  id: string;
  mediaUrls: string[];
  author: StoryAuthor;
  expiresAt: string;
}

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
  authorId: string;
  author: {
    name: string;
    avatar: string | null;
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

interface CurrentUser {
  id: string;
  name: string;
  avatar: string | null;
  role: string;
}

export default function FeedPage() {
  const router = useRouter();
  const { addItem } = useCart();

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [commentOpen, setCommentOpen] = useState<Record<string, boolean>>({});
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});
  const [shareModal, setShareModal] = useState<string | null>(null);
  const [isCreatingPost, setIsCreatingPost] = useState(false);

  // Track if initial fetch is done to avoid double-fetch
  const didFetch = useRef(false);

  // Fetch current logged-in user
  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data?.user) {
          const u = json.data.user;
          setCurrentUser({
            id:     String(u.id),
            name:   `${u.firstName} ${u.lastName ?? ''}`.trim(),
            avatar: u.avatar ?? null,
            role:   u.role,
          });
        }
      })
      .catch(() => {});
  }, []);

  // Fetch active stories
  useEffect(() => {
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    fetch('/api/stories?limit=20', { headers })
      .then(r => r.json())
      .then(json => { if (json.success) setStories(json.data.stories ?? []); })
      .catch(() => {});
  }, []);

  const fetchPosts = useCallback((pageNum: number, append: boolean) => {
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return fetch(`/api/posts?limit=10&page=${pageNum}`, { headers })
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data?.posts) {
          const livePosts: Post[] = json.data.posts.map((p: {
            _id: string; authorId: string; authorName: string; authorAvatar?: string | null;
            authorRole: string; content: string; images: string[]; product?: PostProduct;
            likes: number; comments: number; shares: number;
            createdAt: string; liked?: boolean;
          }) => ({
            id:       String(p._id),
            authorId: String(p.authorId),
            author: {
              name:     p.authorName,
              avatar:   p.authorAvatar ?? null,
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
            liked:     p.liked ?? false,
            saved:     false,
          }));
          if (append) {
            setPosts(prev => [...prev, ...livePosts]);
          } else {
            setPosts(livePosts);
          }
          setHasMore(json.data.pagination?.hasNext ?? false);
        }
      });
  }, [setPosts, setHasMore]);

  // Fetch live posts from API
  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;
    fetchPosts(1, false)
      .catch(() => {})
      .finally(() => setIsLoadingFeed(false));
  }, [fetchPosts]);

  const handleLike = async (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const token = getAuthToken();
    if (!token) { router.push('/auth/login'); return; }
    const action = post.liked ? 'unlike' : 'like';
    // Optimistic update
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p
    ));
    const res = await fetch(`/api/posts/${postId}/like`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    }).catch(() => null);
    if (!res?.ok) {
      // Revert on failure
      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, liked: post.liked, likes: post.likes } : p
      ));
    }
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

  const handleCreatePost = async () => {
    const text = newPostContent.trim();
    if (!text) { router.push('/post/create'); return; }
    const token = getAuthToken();
    if (!token) { router.push('/auth/login?redirect=/feed'); return; }
    setIsCreatingPost(true);
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text, privacy: 'public', status: 'published' }),
      });
      const json = await res.json();
      if (json.success) {
        setNewPostContent('');
        const p = json.data?.post;
        const newPost: Post = {
          id:       String(p?._id ?? Date.now()),
          authorId: currentUser?.id ?? '',
          author: {
            name:     currentUser?.name ?? 'You',
            avatar:   currentUser?.avatar ?? null,
            verified: false,
            isVendor: currentUser?.role === 'vendor' || currentUser?.role === 'brand',
          },
          content: text, images: [], likes: 0, comments: 0, shares: 0,
          timestamp: 'Just now', liked: false, saved: false,
        };
        setPosts(prev => [newPost, ...prev]);
      } else {
        alert(json.message || 'Could not create post. You may need vendor/brand access.');
        router.push('/post/create');
      }
    } catch { router.push('/post/create'); }
    finally { setIsCreatingPost(false); }
  };

  const handleCommentSubmit = async (postId: string) => {
    const text = (commentTexts[postId] ?? '').trim();
    if (!text) return;
    const token = getAuthToken();
    if (!token) { router.push('/auth/login'); return; }
    try {
      const res = await fetch(`/api/posts/${postId}/comment`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const json = await res.json();
      if (json.success) {
        setCommentTexts(prev => ({ ...prev, [postId]: '' }));
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: p.comments + 1 } : p));
      }
    } catch { /* ignore */ }
  };

  const handleShare = async (postId: string) => {
    setShareModal(postId);
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, shares: p.shares + 1 } : p));
    const token = getAuthToken();
    if (token) {
      await fetch(`/api/posts/${postId}/share`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
  };

  // Avatar helper — renders real image or initials fallback
  const Avatar = ({ src, name, size = 40 }: { src: string | null; name: string; size?: number }) => {
    const initials = name ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?';
    if (src) {
      return (
        <Image
          src={src}
          alt={name}
          width={size}
          height={size}
          className="rounded-full object-cover w-full h-full"
        />
      );
    }
    return (
      <div className="w-full h-full rounded-full bg-linear-to-br from-gold-500 to-gold-700 flex items-center justify-center text-white font-bold text-sm">
        {initials}
      </div>
    );
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

          {/* Stories Carousel — always visible so users can start the first story */}
          {(currentUser || stories.length > 0) && (
            <div className="bg-white dark:bg-charcoal-800 rounded-lg sm:rounded-xl shadow-md p-4 mb-6">
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {/* Add Your Story card */}
                {currentUser && (
                  <button
                    onClick={() => router.push('/stories/create')}
                    className="shrink-0 text-center"
                  >
                    <div className="relative w-16 h-16 mb-1">
                      <div className="w-full h-full rounded-full overflow-hidden bg-gray-200">
                        <Avatar src={currentUser.avatar ?? null} name={currentUser.name} size={60} />
                      </div>
                      <div className="absolute bottom-0 right-0 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white">
                        <span className="text-white text-xs font-bold leading-none">+</span>
                      </div>
                    </div>
                    <p className="text-xs text-charcoal-700 dark:text-cool-gray-300 truncate w-16">Your Story</p>
                  </button>
                )}
                {stories.map(story => (
                  <button
                    key={story.id}
                    onClick={() => router.push(`/stories/${story.id}`)}
                    className="shrink-0 text-center"
                  >
                    <div className="relative w-16 h-16 mb-1">
                      <div className="absolute inset-0 rounded-full bg-linear-to-tr from-yellow-400 via-red-500 to-purple-500 p-0.5">
                        <div className="w-full h-full rounded-full bg-white p-0.5">
                          <div className="w-full h-full rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                            <Avatar src={story.author.avatar ?? null} name={story.author.name || story.author.username} size={60} />
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-charcoal-700 dark:text-cool-gray-300 truncate w-16">{story.author.username}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Create Post */}
          <div className="bg-white dark:bg-charcoal-800 rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-md mb-6">
            <div className="flex gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden shrink-0">
                <Avatar src={currentUser?.avatar ?? null} name={currentUser?.name ?? ''} size={48} />
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
                    <button
                      onClick={() => router.push('/post/create')}
                      className="p-2 hover:bg-cool-gray-100 dark:hover:bg-charcoal-700 rounded-lg transition-colors touch-manipulation" title="Add photo"
                    >
                      <span className="text-lg sm:text-xl">📷</span>
                    </button>
                    <button className="p-2 hover:bg-cool-gray-100 dark:hover:bg-charcoal-700 rounded-lg transition-colors touch-manipulation" title="Add emoji">
                      <span className="text-lg sm:text-xl">😊</span>
                    </button>
                    <button
                      onClick={() => router.push('/post/create')}
                      className="p-2 hover:bg-cool-gray-100 dark:hover:bg-charcoal-700 rounded-lg transition-colors touch-manipulation" title="Tag product"
                    >
                      <span className="text-lg sm:text-xl">🏷️</span>
                    </button>
                  </div>
                  <button
                    onClick={handleCreatePost}
                    disabled={isCreatingPost}
                    className="px-4 sm:px-6 py-2 min-h-9 bg-gold-600 text-white rounded-lg font-semibold hover:bg-gold-700 active:scale-95 transition-all text-xs sm:text-sm touch-manipulation disabled:opacity-50"
                  >
                    {isCreatingPost ? 'Posting...' : 'Post'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Loading state */}
          {isLoadingFeed && posts.length === 0 && (
            <div className="py-16 text-center text-charcoal-500 dark:text-cool-gray-400">Loading feed…</div>
          )}

          {/* Empty state */}
          {!isLoadingFeed && posts.length === 0 && (
            <div className="bg-white dark:bg-charcoal-800 rounded-xl shadow-md p-12 text-center">
              <div className="text-6xl mb-4">👗</div>
              <h3 className="text-xl font-bold text-charcoal-900 dark:text-white mb-2">No posts yet</h3>
              <p className="text-charcoal-600 dark:text-cool-gray-400 mb-6">Be the first to share a fashion moment</p>
              <Link href="/post/create" className="px-6 py-3 bg-gold-600 text-white rounded-lg font-semibold hover:bg-gold-700 transition-colors">
                Create a Post
              </Link>
            </div>
          )}

          {/* Posts */}
          <div className="space-y-6">
            {posts.map(post => (
              <div key={post.id} className="bg-white dark:bg-charcoal-800 rounded-lg sm:rounded-xl shadow-md overflow-hidden">
                {/* Post Header */}
                <div className="p-4 sm:p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Link href={`/profile/${post.author.name.toLowerCase().replace(/\s+/g, '')}`} className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden shrink-0">
                      <Avatar src={post.author.avatar} name={post.author.name} size={48} />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/profile/${post.author.name.toLowerCase().replace(/\s+/g, '')}`}
                          className="font-semibold text-sm sm:text-base text-charcoal-900 dark:text-white truncate hover:text-gold-600 transition-colors"
                        >
                          {post.author.name}
                        </Link>
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
                    <Link href={`/post/${post.id}`} className="p-1.5 hover:bg-cool-gray-100 dark:hover:bg-charcoal-700 rounded-lg transition-colors touch-manipulation">
                      <span className="text-lg sm:text-xl">⋯</span>
                    </Link>
                  </div>

                  {/* Post Content */}
                  <Link href={`/post/${post.id}`} className="block">
                    <p className="text-sm sm:text-base text-charcoal-800 dark:text-cool-gray-300 mb-4 whitespace-pre-line">
                      {post.content}
                    </p>
                  </Link>
                </div>

                {/* Post Images */}
                {post.images.length > 0 && (
                  <Link href={`/post/${post.id}`} className={`grid ${post.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-1`}>
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
                        {post.images.length > 4 && index === 3 && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-2xl font-bold">
                            +{post.images.length - 4}
                          </div>
                        )}
                      </div>
                    ))}
                  </Link>
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
                      <button
                        onClick={() => setCommentOpen(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                        className="hover:text-gold-600 transition-colors"
                      >
                        {post.comments} comments
                      </button>
                      <span>{post.shares} shares</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 pt-4 border-t border-gray-200 dark:border-charcoal-700">
                    <button
                      onClick={() => handleLike(post.id)}
                      className={`flex-1 flex items-center justify-center gap-1 py-2 sm:py-3 rounded-lg font-semibold transition-all text-xs sm:text-sm touch-manipulation min-h-9 ${
                        post.liked
                          ? 'text-red-600 bg-red-50 dark:bg-red-900/30'
                          : 'text-charcoal-700 dark:text-cool-gray-300 hover:bg-cool-gray-100 dark:hover:bg-charcoal-700'
                      }`}
                    >
                      <span className="text-sm sm:text-base">{post.liked ? '❤️' : '🤍'}</span>
                      <span>Like</span>
                    </button>
                    <button
                      onClick={() => setCommentOpen(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                      className={`flex-1 flex items-center justify-center gap-1 py-2 sm:py-3 rounded-lg font-semibold transition-all text-xs sm:text-sm touch-manipulation min-h-9 ${
                        commentOpen[post.id]
                          ? 'text-gold-600 bg-gold-50 dark:bg-gold-900/30'
                          : 'text-charcoal-700 dark:text-cool-gray-300 hover:bg-cool-gray-100 dark:hover:bg-charcoal-700'
                      }`}
                    >
                      <span className="text-sm sm:text-base">💬</span>
                      <span>Comment</span>
                    </button>
                    <button
                      onClick={() => handleShare(post.id)}
                      className="flex-1 flex items-center justify-center gap-1 py-2 sm:py-3 rounded-lg font-semibold text-charcoal-700 dark:text-cool-gray-300 hover:bg-cool-gray-100 dark:hover:bg-charcoal-700 transition-all text-xs sm:text-sm touch-manipulation min-h-9"
                    >
                      <span className="text-sm sm:text-base">🔁</span>
                      <span>Share</span>
                    </button>
                    <button
                      onClick={() => handleSave(post.id)}
                      className={`flex-1 flex items-center justify-center gap-1 py-2 sm:py-3 rounded-lg font-semibold transition-all text-xs sm:text-sm touch-manipulation min-h-9 ${
                        post.saved
                          ? 'text-gold-600 bg-gold-50 dark:bg-gold-900/30'
                          : 'text-charcoal-700 dark:text-cool-gray-300 hover:bg-cool-gray-100 dark:hover:bg-charcoal-700'
                      }`}
                    >
                      <span className="text-sm sm:text-base">{post.saved ? '🔖' : '📑'}</span>
                      <span>Save</span>
                    </button>
                  </div>

                  {/* Inline comment form */}
                  {commentOpen[post.id] && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-charcoal-700">
                      <div className="flex gap-2 items-center">
                        <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
                          <Avatar src={currentUser?.avatar ?? null} name={currentUser?.name ?? ''} size={32} />
                        </div>
                        <input
                          type="text"
                          value={commentTexts[post.id] ?? ''}
                          onChange={e => setCommentTexts(prev => ({ ...prev, [post.id]: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && handleCommentSubmit(post.id)}
                          placeholder="Write a comment..."
                          className="flex-1 px-3 py-2 text-sm rounded-lg border border-cool-gray-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-600"
                        />
                        <button
                          onClick={() => handleCommentSubmit(post.id)}
                          disabled={!(commentTexts[post.id] ?? '').trim()}
                          className="px-4 py-2 bg-gold-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50 hover:bg-gold-700 transition-colors"
                        >
                          Post
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="text-center mt-8">
              <button
                onClick={async () => {
                  const nextPage = page + 1;
                  setIsLoadingMore(true);
                  setPage(nextPage);
                  await fetchPosts(nextPage, true).catch(() => {});
                  setIsLoadingMore(false);
                }}
                disabled={isLoadingMore}
                className="px-6 py-3 bg-white dark:bg-charcoal-800 text-charcoal-700 dark:text-cool-gray-300 border-2 border-cool-gray-300 dark:border-charcoal-600 rounded-lg font-semibold hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 transition-colors text-sm sm:text-base touch-manipulation min-h-11 disabled:opacity-50"
              >
                {isLoadingMore ? 'Loading...' : 'Load More Posts'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Share Modal */}
      {shareModal && (() => {
        const sharedPost = posts.find(p => p.id === shareModal);
        const postUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/post/${shareModal}`;
        return (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={() => setShareModal(null)}>
            <div className="bg-white dark:bg-charcoal-800 w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-6" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-charcoal-900 dark:text-white mb-4">Share Post</h3>
              {sharedPost && (
                <p className="text-sm text-charcoal-600 dark:text-cool-gray-400 mb-4 line-clamp-2">{sharedPost.content}</p>
              )}
              <div className="space-y-3">
                <button
                  onClick={() => { navigator.clipboard.writeText(postUrl); setShareModal(null); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-cool-gray-200 dark:border-charcoal-700 hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 transition-colors"
                >
                  <span className="text-2xl">🔗</span>
                  <div className="text-left">
                    <p className="font-semibold text-charcoal-900 dark:text-white text-sm">Copy Link</p>
                    <p className="text-xs text-charcoal-500 dark:text-cool-gray-400">Copy post URL to clipboard</p>
                  </div>
                </button>
                <Link
                  href={`/messages?share=${shareModal}`}
                  onClick={() => setShareModal(null)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-cool-gray-200 dark:border-charcoal-700 hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 transition-colors"
                >
                  <span className="text-2xl">💬</span>
                  <div className="text-left">
                    <p className="font-semibold text-charcoal-900 dark:text-white text-sm">Send via DM</p>
                    <p className="text-xs text-charcoal-500 dark:text-cool-gray-400">Share in a direct message</p>
                  </div>
                </Link>
                <Link
                  href={`/post/${shareModal}`}
                  onClick={() => setShareModal(null)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-cool-gray-200 dark:border-charcoal-700 hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 transition-colors"
                >
                  <span className="text-2xl">👁️</span>
                  <div className="text-left">
                    <p className="font-semibold text-charcoal-900 dark:text-white text-sm">View Full Post</p>
                    <p className="text-xs text-charcoal-500 dark:text-cool-gray-400">Open post detail page</p>
                  </div>
                </Link>
              </div>
              <button onClick={() => setShareModal(null)} className="mt-4 w-full py-3 text-charcoal-600 dark:text-cool-gray-400 font-semibold text-sm hover:text-charcoal-900 dark:hover:text-white">Cancel</button>
            </div>
          </div>
        );
      })()}

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
