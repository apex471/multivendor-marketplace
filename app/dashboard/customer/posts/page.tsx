'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Header from '../../../../components/common/Header';
import Footer from '../../../../components/common/Footer';
import { getAuthToken } from '@/lib/api/auth';

interface PublishedPost {
  id: string;
  caption: string;
  images: string[];
  hashtags: string[];
  productTags: string[];
  createdAt: string;
  lastModified: string;
  likes: number;
  comments: number;
}

export default function SavedPostsPage() {
  const [activeTab, setActiveTab] = useState<'published' | 'scheduled'>('published');
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);
  const [posts, setPosts] = useState<PublishedPost[]>([]);
  const [_loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) { return; }
    fetch('/api/posts?limit=50', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data?.posts) {
          const mapped: PublishedPost[] = json.data.posts.map((p: {
            _id: string; content: string; images?: string[];
            createdAt: string; likes?: number; comments?: number;
            product?: { name: string };
          }) => ({
            id:           String(p._id),
            caption:      p.content,
            images:       p.images ?? [],
            hashtags:     [],
            productTags:  p.product ? [p.product.name] : [],
            createdAt:    p.createdAt,
            lastModified: p.createdAt,
            likes:        p.likes ?? 0,
            comments:     p.comments ?? 0,
          }));
          setPosts(mapped);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleSelectPost = (id: string) => {
    setSelectedPosts((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedPosts.length === posts.length) {
      setSelectedPosts([]);
    } else {
      setSelectedPosts(posts.map((p) => p.id));
    }
  };

  const handleDeleteSelected = async () => {
    if (!confirm(`Delete ${selectedPosts.length} post(s)?`)) return;
    const token = getAuthToken();
    if (!token) return;
    await Promise.all(
      selectedPosts.map(id =>
        fetch(`/api/posts/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      )
    );
    setPosts(prev => prev.filter(p => !selectedPosts.includes(p.id)));
    setSelectedPosts([]);
  };

  const handleDeletePost = async (id: string) => {
    if (!confirm('Delete this post?')) return;
    const token = getAuthToken();
    if (!token) return;
    await fetch(`/api/posts/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    setPosts(prev => prev.filter(p => p.id !== id));
  };


  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      <Header />

      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-charcoal-900 dark:text-white mb-2">My Posts</h1>
          <p className="text-charcoal-600 dark:text-cool-gray-400">Manage your published posts and content</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-cool-gray-300 dark:border-charcoal-700 mb-6">
          <div className="flex gap-6">
            {[
              { id: 'published', label: 'Published', count: posts.length },
              { id: 'scheduled', label: 'Scheduled', count: 0 },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'published' | 'scheduled')}
                className={`pb-4 font-semibold transition-colors relative ${
                  activeTab === tab.id
                    ? 'text-gold-600 border-b-2 border-gold-600'
                    : 'text-charcoal-600 dark:text-cool-gray-400 hover:text-charcoal-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-gold-100 dark:bg-gold-900/30 text-gold-800 dark:text-gold-400 text-xs rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Published Tab */}
        {activeTab === 'published' && (
          <>
            {posts.length > 0 ? (
              <>
                {selectedPosts.length > 0 && (
                  <div className="bg-gold-50 dark:bg-gold-900/10 border border-gold-200 dark:border-gold-800 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-between">
                      <p className="text-charcoal-900 dark:text-white font-semibold">
                        {selectedPosts.length} post(s) selected
                      </p>
                      <button onClick={handleDeleteSelected} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold">
                        🗑️ Delete Selected
                      </button>
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <button onClick={handleSelectAll} className="text-sm text-gold-600 hover:text-gold-700 font-semibold">
                    {selectedPosts.length === posts.length ? '✓ Deselect All' : 'Select All'}
                  </button>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {posts.map((post) => (
                    <div key={post.id} className={`bg-white dark:bg-charcoal-800 rounded-lg border-2 transition-all ${selectedPosts.includes(post.id) ? 'border-gold-600' : 'border-cool-gray-300 dark:border-charcoal-700'}`}>
                      <div className="relative aspect-square bg-cool-gray-200 dark:bg-charcoal-700 rounded-t-lg overflow-hidden">
                        {post.images.length > 0 ? (
                          <>
                            <Image src={post.images[0]} alt="Post preview" fill className="object-cover" />
                            {post.images.length > 1 && (
                              <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-semibold">+{post.images.length - 1}</div>
                            )}
                          </>
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <span className="text-4xl text-cool-gray-400">📝</span>
                          </div>
                        )}
                        <div className="absolute top-2 left-2">
                          <input
                            type="checkbox"
                            checked={selectedPosts.includes(post.id)}
                            onChange={() => handleSelectPost(post.id)}
                            className="w-5 h-5 rounded border-2 border-white cursor-pointer"
                          />
                        </div>
                      </div>
                      <div className="p-4">
                        <p className="text-charcoal-900 dark:text-white mb-3 line-clamp-3">{post.caption}</p>
                        {post.productTags.length > 0 && (
                          <p className="text-xs text-charcoal-600 dark:text-cool-gray-400 mb-2">🏷️ {post.productTags.length} product(s) tagged</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-charcoal-600 dark:text-cool-gray-400 mb-3">
                          <span>❤️ {post.likes}</span>
                          <span>💬 {post.comments}</span>
                          <span>{formatDate(post.createdAt)}</span>
                        </div>
                        <div className="flex gap-2">
                          <Link href={`/post/${post.id}`} className="flex-1 px-4 py-2 bg-gold-600 text-white rounded-lg hover:bg-gold-700 transition-colors font-semibold text-center">
                            👁️ View
                          </Link>
                          <button onClick={() => handleDeletePost(post.id)} className="px-4 py-2 border border-red-300 dark:border-red-700 text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-semibold">
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">📱</div>
                <h3 className="text-xl font-bold text-charcoal-900 dark:text-white mb-2">No posts yet</h3>
                <p className="text-charcoal-600 dark:text-cool-gray-400 mb-6">Share your style with the community</p>
                <Link href="/post/create" className="inline-block px-6 py-3 bg-gold-600 text-white rounded-lg hover:bg-gold-700 transition-colors font-semibold">
                  ✏️ Create Post
                </Link>
              </div>
            )}
          </>
        )}

        {/* Scheduled Tab */}
        {activeTab === 'scheduled' && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-xl font-bold text-charcoal-900 dark:text-white mb-2">No scheduled posts</h3>
            <p className="text-charcoal-600 dark:text-cool-gray-400">Schedule posts to be published automatically at a later time</p>
          </div>
        )}
      </div>

      <Footer />
    </div>  );
}