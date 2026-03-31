'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface Story {
  id: string;
  username: string;
  avatar: string;
  media: string[];
  timestamp: string;
  viewed: boolean;
}

export default function StoryViewerPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Mock story data
  const story: Story = {
    id: resolvedParams.id,
    username: 'fashionista_jane',
    avatar: 'https://i.pravatar.cc/150?img=1',
    media: [
      'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800',
      'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800',
      'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800',
    ],
    timestamp: '2h ago',
    viewed: false
  };

  const STORY_DURATION = 5000; // 5 seconds per story

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          // Move to next story segment
          if (currentIndex < story.media.length - 1) {
            setCurrentIndex(currentIndex + 1);
            return 0;
          } else {
            // Story finished, go back
            router.back();
            return prev;
          }
        }
        return prev + (100 / (STORY_DURATION / 100));
      });
    }, 100);

    return () => clearInterval(interval);
  }, [currentIndex, isPaused, story.media.length, router]);

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
    } else {
      router.back();
    }
  };

  const handleNext = () => {
    if (currentIndex < story.media.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
    } else {
      router.back();
    }
  };

  const handleClose = () => {
    router.back();
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-2">
        {story.media.map((_, index) => (
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
          <Image
            src={story.avatar}
            alt={story.username}
            width={40}
            height={40}
            className="rounded-full border-2 border-white"
          />
          <div>
            <div className="text-white font-semibold">{story.username}</div>
            <div className="text-white/70 text-sm">{story.timestamp}</div>
          </div>
        </div>
        <button
          onClick={handleClose}
          className="text-white text-2xl hover:scale-110 transition-transform"
        >
          ✕
        </button>
      </div>

      {/* Story content */}
      <div
        className="relative w-full h-full max-w-lg mx-auto"
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        <Image
          src={story.media[currentIndex]}
          alt="Story"
          fill
          className="object-contain"
          priority
        />

        {/* Navigation areas */}
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
