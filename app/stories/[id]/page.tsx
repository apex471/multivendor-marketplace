'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { getAuthToken } from '@/lib/api/auth';

interface Story {
  id: string;
  author: { id: string; username: string; name: string; avatar?: string };
  mediaUrls: string[];
  mediaTypes: string[];
  filter?: string;
  duration: number;
  createdAt: string;
}

export default function StoryViewerPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [story, setStory] = useState<Story | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    fetch(`/api/stories/${resolvedParams.id}`, { headers })
      .then(r => r.json())
      .then(json => { if (json.success) setStory(json.data.story); })
      .finally(() => setIsLoading(false));
  }, [resolvedParams.id]);

  const STORY_DURATION = (story?.duration ?? 5) * 1000;

  useEffect(() => {
    if (isPaused || !story) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (currentIndex < story.mediaUrls.length - 1) {
            setCurrentIndex(currentIndex + 1);
            return 0;
          } else {
            router.back();
            return prev;
          }
        }
        return prev + (100 / (STORY_DURATION / 100));
      });
    }, 100);

    return () => clearInterval(interval);
  }, [currentIndex, isPaused, story, STORY_DURATION, router]);

  const handlePrevious = () => {
    if (currentIndex > 0) { setCurrentIndex(currentIndex - 1); setProgress(0); }
    else router.back();
  };

  const handleNext = () => {
    if (story && currentIndex < story.mediaUrls.length - 1) { setCurrentIndex(currentIndex + 1); setProgress(0); }
    else router.back();
  };

  if (isLoading) {
    return <div className="fixed inset-0 bg-black flex items-center justify-center text-white text-xl">Loading...</div>;
  }

  if (!story) {
    return <div className="fixed inset-0 bg-black flex items-center justify-center text-white text-xl">Story not found</div>;
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-2">
        {story.mediaUrls.map((_, index) => (
          <div key={index} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-100"
              style={{
                width: index === currentIndex ? `${progress}%` : index < currentIndex ? '100%' : '0%'
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {story.author.avatar ? (
            <Image src={story.author.avatar} alt={story.author.username} width={40} height={40} className="rounded-full border-2 border-white" />
          ) : (
            <div className="w-10 h-10 rounded-full border-2 border-white bg-gold-600 flex items-center justify-center text-white font-bold">
              {story.author.name?.[0]?.toUpperCase() ?? '?'}
            </div>
          )}
          <div>
            <div className="text-white font-semibold">{story.author.username}</div>
            <div className="text-white/70 text-sm">{new Date(story.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>
        <button onClick={() => router.back()} className="text-white text-2xl hover:scale-110 transition-transform">✕</button>
      </div>

      {/* Story content */}
      <div
        className="relative w-full h-full max-w-lg mx-auto"
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        <Image src={story.mediaUrls[currentIndex]} alt="Story" fill className="object-contain" priority />
        <div className="absolute inset-0 flex">
          <div className="w-1/3 h-full cursor-pointer" onClick={handlePrevious} />
          <div className="w-1/3 h-full" />
          <div className="w-1/3 h-full cursor-pointer" onClick={handleNext} />
        </div>
      </div>

      {/* Bottom actions */}
      <div className="absolute bottom-8 left-4 right-4 z-20">
        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full px-4 py-3">
          <input
            type="text"
            placeholder="Send message"
            className="flex-1 bg-transparent text-white placeholder-white/50 outline-none"
            onFocus={() => setIsPaused(true)}
            onBlur={() => setIsPaused(false)}
          />
          <button className="text-white text-xl">❤️</button>
          <button className="text-white text-xl">📤</button>
        </div>
      </div>
    </div>
  );
}
