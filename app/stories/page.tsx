'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import { getAuthToken } from '@/lib/api/auth';

interface StoryAuthor { id: string; username: string; name: string; avatar?: string | null; }
interface Story { id: string; mediaUrls: string[]; author: StoryAuthor; expiresAt: string; createdAt: string; }

function Avatar({ src, name, size = 60 }: { src?: string | null; name: string; size?: number }) {
  const initials = name ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?';
  if (src) {
    return <Image src={src} alt={name} width={size} height={size} className="w-full h-full rounded-full object-cover" />;
  }
  return (
    <div className="w-full h-full rounded-full bg-linear-to-br from-gold-500 to-gold-800 flex items-center justify-center text-white font-bold"
      style={{ fontSize: size * 0.33 }}>
      {initials}
    </div>
  );
}

export default function StoriesPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    fetch('/api/stories?limit=50', { headers })
      .then(r => r.json())
      .then(json => { if (json.success) setStories(json.data?.stories ?? []); })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-cool-gray-50 dark:bg-charcoal-950">
      <Header />

      {/* Hero */}
      <div className="bg-charcoal-900 text-white py-10 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-6 h-px bg-gold-500" />
            <span className="text-gold-400 text-xs font-semibold tracking-widest uppercase">Certified Luxury World</span>
            <div className="w-6 h-px bg-gold-500" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold mb-3">
            Fashion <span className="text-gold-400">Stories</span>
          </h1>
          <p className="text-cool-gray-400 text-sm sm:text-base max-w-md mx-auto">
            Discover style moments from our community of luxury brands and fashion lovers.
          </p>
          <Link href="/stories/create"
            className="inline-flex items-center gap-2 mt-5 px-6 py-2.5 bg-gold-600 hover:bg-gold-700 text-white rounded-xl font-semibold text-sm transition-colors shadow-md shadow-gold-600/20">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Your Story
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2 animate-pulse">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-cool-gray-200 dark:bg-charcoal-800" />
                <div className="h-2 w-14 bg-cool-gray-200 dark:bg-charcoal-800 rounded-full" />
              </div>
            ))}
          </div>
        )}

        {/* Stories Grid */}
        {!isLoading && stories.length > 0 && (
          <>
            <h2 className="text-sm font-bold uppercase tracking-widest text-cool-gray-400 dark:text-cool-gray-500 mb-5">
              {stories.length} active {stories.length === 1 ? 'story' : 'stories'}
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 sm:gap-5">
              {stories.map(story => (
                <Link key={story.id} href={`/stories/${story.id}`}
                  className="flex flex-col items-center gap-2 group">
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20">
                    {/* Gold ring */}
                    <div className="absolute inset-0 rounded-full bg-linear-to-tr from-gold-400 via-gold-600 to-gold-800 p-[2.5px] group-hover:from-gold-300 group-hover:to-gold-700 transition-all duration-200">
                      <div className="w-full h-full rounded-full bg-cool-gray-50 dark:bg-charcoal-950 p-[2px]">
                        <div className="w-full h-full rounded-full overflow-hidden">
                          <Avatar
                            src={story.mediaUrls[0] ?? story.author.avatar}
                            name={story.author.name || story.author.username}
                            size={76}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] sm:text-xs text-charcoal-700 dark:text-cool-gray-300 font-medium truncate w-16 sm:w-20 text-center group-hover:text-gold-600 transition-colors">
                    {story.author.username || story.author.name}
                  </p>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* Empty state */}
        {!isLoading && stories.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full bg-gold-50 dark:bg-gold-900/20 flex items-center justify-center mx-auto mb-5">
              <svg className="w-9 h-9 text-gold-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-charcoal-900 dark:text-white mb-2">No stories yet</h3>
            <p className="text-cool-gray-500 dark:text-cool-gray-400 text-sm mb-6 max-w-xs mx-auto">
              Be the first to share a fashion moment with the community.
            </p>
            <Link href="/stories/create"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gold-600 hover:bg-gold-700 text-white rounded-xl font-semibold text-sm transition-colors shadow-md shadow-gold-600/20">
              Create Story
            </Link>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
