'use client';

import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';

interface Post {
  id: string;
  image: string;
  likes: number;
  comments: number;
}

export default function ProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const [activeTab, setActiveTab] = useState('posts');
  const [isFollowing, setIsFollowing] = useState(false);

  // Mock user data
  const user = {
    username: username,
    fullName: 'John Doe',
    avatar: 'https://i.pravatar.cc/300?u=' + username,
    bio: 'Fashion enthusiast | Style curator | NYC 🗽\nLiving life one outfit at a time ✨',
    location: 'New York, NY',
    website: 'https://johndoe.com',
    joinedDate: 'January 2024',
    stats: {
      posts: 127,
      followers: 2345,
      following: 892,
    },
    isVerified: true,
  };

  // Mock posts
  const posts: Post[] = Array.from({ length: 12 }, (_, i) => ({
    id: String(i + 1),
    image: `https://images.unsplash.com/photo-${1551028719 + i}00167b16eac5?w=400`,
    likes: Math.floor(Math.random() * 1000) + 100,
    comments: Math.floor(Math.random() * 100) + 10,
  }));

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
    console.log(isFollowing ? 'Unfollowed' : 'Followed', username);
  };

  const handleMessage = () => {
    console.log('Message user:', username);
    alert('Messaging feature coming soon!');
  };

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      <Header />

      <div className="container mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className="relative w-32 h-32 sm:w-40 sm:h-40 mx-auto sm:mx-0">
                <Image
                  src={user.avatar}
                  alt={user.fullName}
                  fill
                  className="rounded-full object-cover border-4 border-gold-200"
                />
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
                  <p className="text-sm text-charcoal-600">📍 {user.location}</p>
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
                <button className="text-center hover:text-gold-600 transition-colors">
                  <div className="font-bold text-lg text-charcoal-900">{user.stats.posts}</div>
                  <div className="text-sm text-charcoal-600">Posts</div>
                </button>
                <button className="text-center hover:text-gold-600 transition-colors">
                  <div className="font-bold text-lg text-charcoal-900">{user.stats.followers.toLocaleString()}</div>
                  <div className="text-sm text-charcoal-600">Followers</div>
                </button>
                <button className="text-center hover:text-gold-600 transition-colors">
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
            {posts.map((post) => (
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

      <Footer />
    </div>
  );
}
