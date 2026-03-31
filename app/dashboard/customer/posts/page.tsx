'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Header from '../../../../components/common/Header';
import Footer from '../../../../components/common/Footer';

interface Draft {
  id: string;
  caption: string;
  images: string[];
  hashtags: string[];
  productTags: string[];
  createdAt: string;
  lastModified: string;
}

export default function SavedPostsPage() {
  const [activeTab, setActiveTab] = useState<'drafts' | 'published' | 'scheduled'>('drafts');
  const [selectedDrafts, setSelectedDrafts] = useState<string[]>([]);

  // Mock drafts data
  const drafts: Draft[] = [
    {
      id: '1',
      caption: 'Loving this new dress from @luxefashion! Perfect for spring 🌸 #OOTD #SpringFashion',
      images: ['https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=400'],
      hashtags: ['OOTD', 'SpringFashion', 'LuxeStyle'],
      productTags: ['Designer Silk Dress'],
      createdAt: '2024-01-15T10:30:00',
      lastModified: '2024-01-15T14:22:00',
    },
    {
      id: '2',
      caption: 'Weekend vibes with my favorite accessories ✨',
      images: [
        'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400',
        'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400',
      ],
      hashtags: ['WeekendVibes', 'Accessories', 'FashionInspo'],
      productTags: ['Luxury Handbag', 'Designer Sunglasses'],
      createdAt: '2024-01-14T16:45:00',
      lastModified: '2024-01-14T16:45:00',
    },
    {
      id: '3',
      caption: 'Can\'t decide which pair to wear today! Help me choose 👇',
      images: [
        'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400',
        'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400',
      ],
      hashtags: ['ShoeLove', 'FashionDilemma', 'WDYWT'],
      productTags: [],
      createdAt: '2024-01-13T09:15:00',
      lastModified: '2024-01-13T12:30:00',
    },
  ];

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

  const handleSelectDraft = (id: string) => {
    setSelectedDrafts((prev) =>
      prev.includes(id) ? prev.filter((draftId) => draftId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedDrafts.length === drafts.length) {
      setSelectedDrafts([]);
    } else {
      setSelectedDrafts(drafts.map((d) => d.id));
    }
  };

  const handleDeleteSelected = () => {
    if (confirm(`Delete ${selectedDrafts.length} draft(s)?`)) {
      // Handle delete
      setSelectedDrafts([]);
      alert('Drafts deleted successfully!');
    }
  };

  const handlePublishDraft = (id: string) => {
    alert(`Publishing draft ${id}...`);
    // Redirect to post create with pre-filled data
  };

  const handleDeleteDraft = (id: string) => {
    if (confirm('Delete this draft?')) {
      alert(`Draft ${id} deleted!`);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      <Header />

      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-charcoal-900 dark:text-white mb-2">
            My Posts
          </h1>
          <p className="text-charcoal-600 dark:text-cool-gray-400">
            Manage your posts, drafts, and scheduled content
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-cool-gray-300 dark:border-charcoal-700 mb-6">
          <div className="flex gap-6">
            {[
              { id: 'drafts', label: 'Drafts', count: drafts.length },
              { id: 'published', label: 'Published', count: 0 },
              { id: 'scheduled', label: 'Scheduled', count: 0 },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
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

        {/* Drafts Tab */}
        {activeTab === 'drafts' && (
          <>
            {drafts.length > 0 ? (
              <>
                {/* Bulk Actions */}
                {selectedDrafts.length > 0 && (
                  <div className="bg-gold-50 dark:bg-gold-900/10 border border-gold-200 dark:border-gold-800 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-between">
                      <p className="text-charcoal-900 dark:text-white font-semibold">
                        {selectedDrafts.length} draft(s) selected
                      </p>
                      <div className="flex gap-3">
                        <button
                          onClick={handleDeleteSelected}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
                        >
                          🗑️ Delete Selected
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Select All */}
                <div className="mb-4">
                  <button
                    onClick={handleSelectAll}
                    className="text-sm text-gold-600 hover:text-gold-700 font-semibold"
                  >
                    {selectedDrafts.length === drafts.length ? '✓ Deselect All' : 'Select All'}
                  </button>
                </div>

                {/* Drafts Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {drafts.map((draft) => (
                    <div
                      key={draft.id}
                      className={`bg-white dark:bg-charcoal-800 rounded-lg border-2 transition-all ${
                        selectedDrafts.includes(draft.id)
                          ? 'border-gold-600'
                          : 'border-cool-gray-300 dark:border-charcoal-700'
                      }`}
                    >
                      {/* Image Preview */}
                      <div className="relative aspect-square bg-cool-gray-200 dark:bg-charcoal-700 rounded-t-lg overflow-hidden">
                        {draft.images.length > 0 ? (
                          <>
                            <Image
                              src={draft.images[0]}
                              alt="Draft preview"
                              fill
                              className="object-cover"
                            />
                            {draft.images.length > 1 && (
                              <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-semibold">
                                +{draft.images.length - 1}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <span className="text-4xl text-cool-gray-400">📝</span>
                          </div>
                        )}
                        
                        {/* Checkbox */}
                        <div className="absolute top-2 left-2">
                          <input
                            type="checkbox"
                            checked={selectedDrafts.includes(draft.id)}
                            onChange={() => handleSelectDraft(draft.id)}
                            className="w-5 h-5 rounded border-2 border-white cursor-pointer"
                          />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4">
                        <p className="text-charcoal-900 dark:text-white mb-3 line-clamp-3">
                          {draft.caption}
                        </p>

                        {/* Tags */}
                        {draft.hashtags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {draft.hashtags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="text-xs bg-cool-gray-100 dark:bg-charcoal-700 text-charcoal-700 dark:text-cool-gray-300 px-2 py-1 rounded"
                              >
                                #{tag}
                              </span>
                            ))}
                            {draft.hashtags.length > 3 && (
                              <span className="text-xs text-charcoal-600 dark:text-cool-gray-400">
                                +{draft.hashtags.length - 3}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Product Tags */}
                        {draft.productTags.length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs text-charcoal-600 dark:text-cool-gray-400 mb-1">
                              🏷️ {draft.productTags.length} product(s) tagged
                            </p>
                          </div>
                        )}

                        {/* Meta Info */}
                        <div className="text-xs text-charcoal-600 dark:text-cool-gray-400 mb-4">
                          <p>Created: {formatDate(draft.createdAt)}</p>
                          <p>Modified: {formatDate(draft.lastModified)}</p>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <Link
                            href={`/post/create?draft=${draft.id}`}
                            className="flex-1 px-4 py-2 bg-gold-600 text-white rounded-lg hover:bg-gold-700 transition-colors font-semibold text-center"
                          >
                            ✏️ Edit
                          </Link>
                          <button
                            onClick={() => handlePublishDraft(draft.id)}
                            className="flex-1 px-4 py-2 border border-cool-gray-300 dark:border-charcoal-700 rounded-lg hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 transition-colors font-semibold"
                          >
                            📤 Publish
                          </button>
                          <button
                            onClick={() => handleDeleteDraft(draft.id)}
                            className="px-4 py-2 border border-red-300 dark:border-red-700 text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-semibold"
                          >
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
                <div className="text-6xl mb-4">📝</div>
                <h3 className="text-xl font-bold text-charcoal-900 dark:text-white mb-2">
                  No drafts yet
                </h3>
                <p className="text-charcoal-600 dark:text-cool-gray-400 mb-6">
                  Start creating posts and save them as drafts to work on later
                </p>
                <Link
                  href="/post/create"
                  className="inline-block px-6 py-3 bg-gold-600 text-white rounded-lg hover:bg-gold-700 transition-colors font-semibold"
                >
                  ✏️ Create Post
                </Link>
              </div>
            )}
          </>
        )}

        {/* Published Tab */}
        {activeTab === 'published' && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📱</div>
            <h3 className="text-xl font-bold text-charcoal-900 dark:text-white mb-2">
              No published posts
            </h3>
            <p className="text-charcoal-600 dark:text-cool-gray-400">
              Your published posts will appear here
            </p>
          </div>
        )}

        {/* Scheduled Tab */}
        {activeTab === 'scheduled' && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-xl font-bold text-charcoal-900 dark:text-white mb-2">
              No scheduled posts
            </h3>
            <p className="text-charcoal-600 dark:text-cool-gray-400">
              Schedule posts to be published automatically at a later time
            </p>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
