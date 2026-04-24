'use client';

import { getAuthToken } from '@/lib/api/auth';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';

interface Post {
  id: string;
  image: string | null;
  likes: number;
  comments: number;
}

interface UserData {
  username: string;
  fullName: string;
  avatar: string | null;
  bio: string;
  location: string;
  website: string;
  joinedDate: string;
  stats: { posts: number; followers: number; following: number };
  isVerified: boolean;
  isFollowing: boolean;
  userId: string;
}

interface FollowUser {
  id: string;
  username: string;
  fullName: string;
  avatar: string | null;
  verified: boolean;
  isFollowing: boolean;
}

export default function ProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('posts');
  const [isFollowing, setIsFollowing] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [followModal, setFollowModal] = useState<'followers' | 'following' | null>(null);
  const [followList, setFollowList] = useState<FollowUser[]>([]);
  const [followListLoading, setFollowListLoading] = useState(false);

  useEffect(() => {
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    fetch(`/api/users/${username}`, { headers })
      .then(r => r.json())
      .then(json => {
        if (!json.success || !json.data?.user) return;
        const u = json.data.user;
        setUser({
          userId:      String(u.id),
          username:    u.username,
          fullName:    u.fullName,
          avatar:      u.avatar ?? null,
          bio:         u.bio ?? '',
          location:    '',
          website:     '',
          joinedDate:  new Date(u.joinedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          stats:       { posts: u.stats.posts, followers: u.stats.followers, following: u.stats.following },
          isVerified:  u.verified,
          isFollowing: u.isFollowing,
        });
        setIsFollowing(u.isFollowing);
        setPosts((json.data.posts ?? []).map((p: { _id: string; images?: string[]; likes: number; comments: number }) => ({
          id:       String(p._id),
          image:    p.images?.[0] ?? null,
          likes:    p.likes,
          comments: p.comments,
        })));
      });
  }, [username]);

  const openFollowModal = useCallback(async (type: 'followers' | 'following') => {
    if (!user) return;
    setFollowModal(type);
    setFollowListLoading(true);
    setFollowList([]);
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    try {
      const res = await fetch(`/api/follow?userId=${user.userId}&type=${type}&limit=50`, { headers });
      const json = await res.json();
      if (json.success) setFollowList(json.data.users ?? []);
    } finally {
      setFollowListLoading(false);
    }
  }, [user]);

  const handleFollowInModal = useCallback(async (targetId: string, currently: boolean) => {
    const token = getAuthToken();
    if (!token) { router.push('/auth/login'); return; }
    const method = currently ? 'DELETE' : 'POST';
    const url = currently ? `/api/follow?followingId=${targetId}` : '/api/follow';
    const opts: RequestInit = {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    };
    if (!currently) opts.body = JSON.stringify({ followingId: targetId });
    await fetch(url, opts);
    setFollowList(prev => prev.map(u => u.id === targetId ? { ...u, isFollowing: !currently } : u));
  }, [router]);

  const handleFollow = async () => {
    const token = getAuthToken();
    if (!token || !user) { router.push('/auth/login'); return; }
    const method = isFollowing ? 'DELETE' : 'POST';
    const url = isFollowing ? `/api/follow?followingId=${user.userId}` : '/api/follow';
    const opts: RequestInit = {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    };
    if (!isFollowing) opts.body = JSON.stringify({ followingId: user.userId });
    const res = await fetch(url, opts);
    const json = await res.json();
    const newFollowing = !isFollowing;
    setIsFollowing(newFollowing);
    setUser(prev => prev ? {
      ...prev,
      stats: {
        ...prev.stats,
        followers: json.data?.followerCount ?? prev.stats.followers + (newFollowing ? 1 : -1),
      },
    } : prev);
  };

  const handleMessage = async () => {
    const token = getAuthToken();
    if (!token || !user) { router.push('/auth/login'); return; }
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ recipientId: user.userId }),
      });
      const data = await res.json();
      if (data.success) {
        router.push('/messages');
      } else {
        alert(data.message || 'Could not start conversation');
      }
    } catch {
      alert('Failed to send message. Please try again.');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-white dark:bg-charcoal-900 flex items-center justify-center">
        <p className="text-charcoal-600 dark:text-cool-gray-400">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      <Header />

      <div className="container mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Avatar */}
            <div className="shrink-0">
              <div className="relative w-32 h-32 sm:w-40 sm:h-40 mx-auto sm:mx-0">
                {user.avatar ? (
                  <Image
                    src={user.avatar}
                    alt={user.fullName}
                    fill
                    className="rounded-full object-cover border-4 border-gold-200"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-gold-100 dark:bg-charcoal-700 border-4 border-gold-200 flex items-center justify-center text-4xl font-bold text-gold-600">
                    {user.fullName.charAt(0).toUpperCase()}
                  </div>
                )}
                {user.isVerified && (
                  <div className="absolute bottom-2 right-2 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center border-2 border-white">
                    <span className="text-white text-sm">✓</span>
                  </div>
                )}
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h1 className="text-2xl font-bold text-charcoal-900">{user.fullName}</h1>
                    {user.isVerified && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                        Verified
                      </span>
                    )}
                  </div>
                  <p className="text-charcoal-600 mb-1">@{user.username}</p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={handleFollow}
                    className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                      isFollowing
                        ? 'bg-gray-200 text-charcoal-700 hover:bg-gray-300'
                        : 'bg-gold-600 text-white hover:bg-gold-700'
                    }`}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                  <button
                    onClick={handleMessage}
                    className="px-6 py-2 border-2 border-gray-300 text-charcoal-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Message
                  </button>
                  <button className="px-4 py-2 border-2 border-gray-300 text-charcoal-700 rounded-lg hover:bg-gray-50 transition-colors">
                    •••
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="flex gap-8 mb-4">
                <div className="text-center">
                  <div className="font-bold text-lg text-charcoal-900">{user.stats.posts}</div>
                  <div className="text-sm text-charcoal-600">Posts</div>
                </div>
                <button
                  onClick={() => openFollowModal('followers')}
                  className="text-center hover:text-gold-600 transition-colors"
                >
                  <div className="font-bold text-lg text-charcoal-900">{user.stats.followers.toLocaleString()}</div>
                  <div className="text-sm text-charcoal-600">Followers</div>
                </button>
                <button
                  onClick={() => openFollowModal('following')}
                  className="text-center hover:text-gold-600 transition-colors"
                >
                  <div className="font-bold text-lg text-charcoal-900">{user.stats.following.toLocaleString()}</div>
                  <div className="text-sm text-charcoal-600">Following</div>
                </button>
              </div>

              {/* Bio */}
              <div className="mb-4">
                <p className="text-charcoal-900 whitespace-pre-line">{user.bio}</p>
                {user.website && (
                  <a
                    href={user.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gold-600 hover:text-gold-700 font-medium"
                  >
                    {user.website}
                  </a>
                )}
              </div>

              {/* Joined Date */}
              <p className="text-sm text-charcoal-600">
                📅 Joined {user.joinedDate}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('posts')}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === 'posts'
                  ? 'text-gold-600 border-b-2 border-gold-600'
                  : 'text-charcoal-600 hover:text-gold-600'
              }`}
            >
              📷 Posts
            </button>
            <button
              onClick={() => setActiveTab('saved')}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === 'saved'
                  ? 'text-gold-600 border-b-2 border-gold-600'
                  : 'text-charcoal-600 hover:text-gold-600'
              }`}
            >
              🔖 Saved
            </button>
            <button
              onClick={() => setActiveTab('tagged')}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === 'tagged'
                  ? 'text-gold-600 border-b-2 border-gold-600'
                  : 'text-charcoal-600 hover:text-gold-600'
              }`}
            >
              🏷️ Tagged
            </button>
          </div>
        </div>

        {/* Posts Grid */}
        {activeTab === 'posts' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
            {posts.length === 0 && (
              <div className="col-span-full bg-white rounded-lg shadow-md p-12 text-center">
                <div className="text-6xl mb-4">📷</div>
                <h3 className="text-xl font-bold text-charcoal-900 mb-2">No posts yet</h3>
                <p className="text-charcoal-600">Posts will appear here</p>
              </div>
            )}
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/post/${post.id}`}
                className="group relative aspect-square overflow-hidden rounded-lg bg-gray-200"
              >
                {post.image && (
                  <Image
                    src={post.image}
                    alt={`Post ${post.id}`}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform"
                  />
                )}
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6 text-white">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">❤️</span>
                    <span className="font-semibold">{post.likes}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">💬</span>
                    <span className="font-semibold">{post.comments}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {activeTab === 'saved' && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-6xl mb-4">🔖</div>
            <h3 className="text-xl font-bold text-charcoal-900 mb-2">No saved posts</h3>
            <p className="text-charcoal-600">Posts you save will appear here</p>
          </div>
        )}

        {activeTab === 'tagged' && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-6xl mb-4">🏷️</div>
            <h3 className="text-xl font-bold text-charcoal-900 mb-2">No tagged posts</h3>
            <p className="text-charcoal-600">Posts where @{user.username} is tagged will appear here</p>
          </div>
        )}
      </div>

      {/* Followers / Following Modal */}
      {followModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={() => setFollowModal(null)}
        >
          <div
            className="bg-white dark:bg-charcoal-800 rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-charcoal-700">
              <h2 className="font-bold text-lg text-charcoal-900 dark:text-white capitalize">{followModal}</h2>
              <button
                onClick={() => setFollowModal(null)}
                className="text-charcoal-500 hover:text-charcoal-900 dark:text-cool-gray-400 dark:hover:text-white text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 px-4 py-2">
              {followListLoading && (
                <div className="py-12 text-center text-charcoal-500 dark:text-cool-gray-400">Loading…</div>
              )}
              {!followListLoading && followList.length === 0 && (
                <div className="py-12 text-center text-charcoal-500 dark:text-cool-gray-400">
                  No {followModal} yet
                </div>
              )}
              {followList.map(fu => (
                <div key={fu.id} className="flex items-center gap-3 py-3 border-b border-gray-100 dark:border-charcoal-700 last:border-0">
                  <Link href={`/profile/${fu.username}`} onClick={() => setFollowModal(null)}>
                    <Image
                      src={fu.avatar ?? ''}
                      alt={fu.fullName}
                      width={44}
                      height={44}
                      className="rounded-full object-cover border border-gray-200"
                    />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/profile/${fu.username}`}
                      onClick={() => setFollowModal(null)}
                      className="font-semibold text-charcoal-900 dark:text-white hover:text-gold-600 block truncate"
                    >
                      {fu.fullName}
                      {fu.verified && <span className="ml-1 text-blue-500 text-xs">✓</span>}
                    </Link>
                    <p className="text-sm text-charcoal-500 dark:text-cool-gray-400 truncate">@{fu.username}</p>
                  </div>
                  <button
                    onClick={() => handleFollowInModal(fu.id, fu.isFollowing)}
                    className={`shrink-0 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                      fu.isFollowing
                        ? 'bg-gray-200 text-charcoal-700 hover:bg-gray-300'
                        : 'bg-gold-600 text-white hover:bg-gold-700'
                    }`}
                  >
                    {fu.isFollowing ? 'Following' : 'Follow'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
