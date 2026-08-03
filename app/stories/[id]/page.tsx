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
  const [isMuted, setIsMuted] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    fetch(`/api/stories/${resolvedParams.id}`, { headers })
      .then(r => r.json())
      .then(json => { if (json.success) setStory(json.data.story); })
      .finally(() => setIsLoading(false));
  }, [resolvedParams.id]);

  // Synchronize browser playing/pausing state on hold gesture
  useEffect(() => {
    if (!videoRef.current) return;
    if (isPaused) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {});
    }
  }, [isPaused, currentIndex]);

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

  const [msgText, setMsgText] = useState('');
  const [floatingEmojis, setFloatingEmojis] = useState<{ id: number; emoji: string; left: number; delay: number }[]>([]);
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });

  const handleSendStoryAction = async (contentToSend: string) => {
    if (!story) return;
    const token = getAuthToken();
    if (!token) return;
    try {
      const convoRes = await fetch('/api/messages', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: story.author.id, text: contentToSend })
      });
      const convoJson = await convoRes.json();
      if (!convoRes.ok || !convoJson.success) return;

      const convoId = convoJson.data.conversationId;
      await fetch(`/api/messages/${convoId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: contentToSend,
          storyId: story.id,
          storyMediaUrl: story.mediaUrls[currentIndex] || story.mediaUrls[0],
        })
      });
      setMsgText('');
      
      // Professional toast instead of alert
      setToast({ message: "Response sent to direct messages! 💬", visible: true });
      setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
    } catch (err) {
      console.error('Failed to send story response:', err);
    }
  };

  const handleReact = (emoji: string) => {
    handleSendStoryAction(emoji);
    
    // Spawn floating emojis in Facebook style
    const now = Date.now();
    const newFloating = Array.from({ length: 6 }).map((_, i) => ({
      id: now + i,
      emoji,
      left: Math.random() * 60 + 20, // percentage from left
      delay: i * 120, // staggered entrance
    }));
    
    setFloatingEmojis(prev => [...prev, ...newFloating]);
    setTimeout(() => {
      setFloatingEmojis(prev => prev.filter(item => !newFloating.find(nf => nf.id === item.id)));
    }, 2200);
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
      <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-2" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 8px)' }}>
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
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between" style={{ marginTop: 'env(safe-area-inset-top, 0px)' }}>
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
        <div className="flex items-center gap-2">
          {story.mediaTypes[currentIndex] === 'video' && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
              className="w-9 h-9 flex items-center justify-center text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              )}
            </button>
          )}
          <button onClick={() => router.back()} className="text-white text-2xl hover:scale-110 transition-transform">✕</button>
        </div>
      </div>

      {/* Story content */}
      <div
        className="relative w-full h-full max-w-lg mx-auto"
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {story.mediaTypes[currentIndex] === 'video' ? (
          <video
            src={story.mediaUrls[currentIndex]}
            className="w-full h-full object-contain"
            autoPlay
            playsInline
            muted={isMuted}
            ref={videoRef}
            key={story.mediaUrls[currentIndex]}
          />
        ) : (
          <Image src={story.mediaUrls[currentIndex]} alt="Story" fill className="object-contain" priority />
        )}
        <div className="absolute inset-x-0 top-24 bottom-44 flex">
          <div className="w-1/3 h-full cursor-pointer" onClick={handlePrevious} />
          <div className="w-1/3 h-full" />
          <div className="w-1/3 h-full cursor-pointer" onClick={handleNext} />
        </div>
      </div>

      {/* Floating Emojis */}
      <div className="absolute inset-0 z-30 pointer-events-none overflow-hidden">
        {floatingEmojis.map(fe => (
          <span
            key={fe.id}
            className="absolute bottom-28 text-4xl pointer-events-none select-none animate-float-emoji opacity-0"
            style={{
              left: `${fe.left}%`,
              animationDelay: `${fe.delay}ms`,
            }}
          >
            {fe.emoji}
          </span>
        ))}
      </div>

      {/* Custom Style Injections */}
      <style>{`
        @keyframes floatEmoji {
          0% {
            transform: translateY(0) scale(0.5) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
            transform: translateY(-20px) scale(1.25) rotate(12deg);
          }
          90% {
            opacity: 0.9;
          }
          100% {
            transform: translateY(-300px) scale(0.7) rotate(-25deg);
            opacity: 0;
          }
        }
        @keyframes slideUp {
          0% {
            transform: translate(-50%, 24px);
            opacity: 0;
          }
          100% {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }
        .animate-float-emoji {
          animation: floatEmoji 2s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
        .animate-slide-up {
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* Toast Notification */}
      {toast.visible && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-50 bg-black/85 backdrop-blur-md border border-gold-500/30 px-5 py-3 rounded-xl flex items-center gap-3 shadow-lg shadow-black/40 animate-slide-up">
          <span className="text-gold-400 text-lg">✨</span>
          <span className="text-white text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Bottom actions */}
      <div className="absolute bottom-8 left-4 right-4 z-20 flex flex-col gap-3" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {/* Luxury Reactions Bar */}
        <div className="flex justify-center gap-3">
          {['👍', '❤️', '🔥', '😮', '🙌'].map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleReact(emoji)}
              className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-gold-500/30 flex items-center justify-center text-xl hover:scale-125 active:scale-95 transition-all hover:bg-gold-500/20 hover:border-gold-400 shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Text Reply Bar */}
        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full px-4 py-2.5 border border-white/10">
          <input
            type="text"
            placeholder="Send message..."
            value={msgText}
            onChange={e => setMsgText(e.target.value)}
            onFocus={() => setIsPaused(true)}
            onBlur={() => setIsPaused(false)}
            onKeyDown={e => {
              if (e.key === 'Enter' && msgText.trim()) {
                handleSendStoryAction(`Story reply: "${msgText.trim()}"`);
              }
            }}
            className="flex-1 bg-transparent text-white placeholder-white/50 outline-none text-sm"
          />
          {msgText.trim() && (
            <button
              type="button"
              onClick={() => handleSendStoryAction(`Story reply: "${msgText.trim()}"`)}
              className="text-gold-400 hover:text-gold-300 font-medium text-sm px-2 transition-colors duration-200"
            >
              Send
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
