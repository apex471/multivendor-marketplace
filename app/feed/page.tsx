'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import { useRouter } from 'next/navigation';
import { useCart } from '../../contexts/CartContext';
import { useLocalization } from '@/contexts/LocalizationContext';
import { getAuthToken } from '@/lib/api/auth';

// ── Types ─────────────────────────────────────────────────────────────────────
interface StoryAuthor { id: string; username: string; name: string; avatar?: string | null; }
interface Story       { id: string; mediaUrls: string[]; author: StoryAuthor; expiresAt: string; createdAt?: string; mediaTypes?: string[]; viewed?: boolean; }
// StoryGroup aggregates all story docs from one author into a single circle
interface StoryGroup  { author: StoryAuthor; slides: { storyId: string; url: string; type: string; createdAt?: string; viewed?: boolean }[]; hasUnviewed: boolean; }
interface PostProduct { id: string; name: string; price: number; image: string; vendor: string; vendorId: string; }
interface Post {
  id: string; authorId: string;
  author: { name: string; avatar: string | null; verified: boolean; isVendor: boolean; };
  content: string; images: string[]; videos?: string[]; likes: number; comments: number; shares: number;
  timestamp: string; liked: boolean; saved: boolean; product?: PostProduct;
}
interface CurrentUser { id: string; name: string; avatar: string | null; role: string; }

// ── Avatar Component ──────────────────────────────────────────────────────────
function Avatar({ src, name, size = 40 }: { src: string | null; name: string; size?: number }) {
  const initials = name ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?';
  if (src) {
    return (
      <Image src={src} alt={name} width={size} height={size}
        className="rounded-full object-cover w-full h-full" />
    );
  }
  return (
    <div className="w-full h-full rounded-full bg-linear-to-br from-gold-500 to-gold-800 flex items-center justify-center text-white font-bold"
      style={{ fontSize: size * 0.34 }}>
      {initials}
    </div>
  );
}

// ── Story Viewer Modal ────────────────────────────────────────────────────────
// Props: full ordered list of story groups + which group to start at
function StoryViewer({
  groups,
  initialGroupIndex,
  onClose,
}: {
  groups: StoryGroup[];
  initialGroupIndex: number;
  onClose: () => void;
}) {
  const [groupIdx, setGroupIdx]   = useState(initialGroupIndex);
  const [slideIdx, setSlideIdx]   = useState(0);
  const [progress, setProgress]   = useState(0);
  const [msgText, setMsgText]     = useState('');
  const [isPaused, setIsPaused]   = useState(false);
  const [isMuted, setIsMuted]     = useState(true);
  const [floatingEmojis, setFloatingEmojis] = useState<{ id: number; emoji: string; left: number; delay: number }[]>([]);
  const [toast, setToast]         = useState<{ message: string; visible: boolean }>({ message: '', visible: false });
  // Track which storyIds we've already sent a view ping for this session
  const viewedRef = useRef<Set<string>>(new Set());
  const videoRef = useRef<HTMLVideoElement>(null);

  const group        = groups[groupIdx];
  const slides       = group?.slides ?? [];
  const total        = slides.length || 1;
  const currentSlide = slides[slideIdx];

  // Synchronize browser playing/pausing state on hold gesture
  useEffect(() => {
    if (!videoRef.current) return;
    if (isPaused) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {});
    }
  }, [isPaused]);

  // On group change: jump to first unviewed slide (Instagram behaviour)
  useEffect(() => {
    const g = groups[groupIdx];
    if (!g) return;
    const firstUnviewed = g.slides.findIndex(s => !s.viewed);
    setSlideIdx(firstUnviewed >= 0 ? firstUnviewed : 0);
    setProgress(0);
  }, [groupIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mark current slide as viewed via API (fire-and-forget, once per session)
  useEffect(() => {
    if (!currentSlide) return;
    const key = currentSlide.storyId;
    if (viewedRef.current.has(key)) return;
    viewedRef.current.add(key);
    const token = getAuthToken();
    if (!token) return;
    // Calling GET /api/stories/[id] marks it viewed server-side
    fetch(`/api/stories/${key}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }, [currentSlide]);

  // Auto-advance timer
  useEffect(() => {
    if (isPaused) return;
    const step = 20;
    const duration = 5000;
    const interval = setInterval(() => {
      setProgress(prev => {
        const next = prev + (step / duration) * 100;
        if (next >= 100) {
          // Try to go to next slide in current group
          if (slideIdx < total - 1) {
            setSlideIdx(i => i + 1);
            return 0;
          }
          // Try to go to next group
          if (groupIdx < groups.length - 1) {
            setGroupIdx(g => g + 1);
            // slideIdx & progress reset handled by the groupIdx useEffect
            return 0;
          }
          // All groups exhausted
          onClose();
          return prev;
        }
        return next;
      });
    }, step);
    return () => clearInterval(interval);
  }, [slideIdx, groupIdx, total, groups.length, onClose, isPaused]);

  // Reset progress when slide index changes
  useEffect(() => {
    setProgress(0);
  }, [slideIdx]);

  // ── Navigate to previous group ──
  const goToPrevGroup = () => {
    if (groupIdx > 0) {
      setGroupIdx(g => g - 1);
    }
  };

  // ── Navigate to next group ──
  const goToNextGroup = () => {
    if (groupIdx < groups.length - 1) {
      setGroupIdx(g => g + 1);
    } else {
      onClose();
    }
  };

  // Submit reaction / reply to vendor conversation
  const handleSendStoryAction = async (contentToSend: string) => {
    const token = getAuthToken();
    if (!token) return;
    try {
      const convoRes = await fetch('/api/messages', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: group.author.id, text: contentToSend })
      });
      const convoJson = await convoRes.json();
      if (!convoRes.ok || !convoJson.success) return;

      const convoId = convoJson.data.conversationId;
      await fetch(`/api/messages/${convoId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: contentToSend,
          storyId: currentSlide.storyId,
          storyMediaUrl: currentSlide.url,
        })
      });
      setMsgText('');
      setToast({ message: "Response sent to direct messages! 💬", visible: true });
      setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
    } catch (err) {
      console.error('Failed to send story response:', err);
    }
  };

  const handleReact = (emoji: string) => {
    handleSendStoryAction(emoji);
    const now = Date.now();
    const newFloating = Array.from({ length: 6 }).map((_, i) => ({
      id: now + i, emoji,
      left: Math.random() * 60 + 20,
      delay: i * 120,
    }));
    setFloatingEmojis(prev => [...prev, ...newFloating]);
    setTimeout(() => {
      setFloatingEmojis(prev => prev.filter(item => !newFloating.find(nf => nf.id === item.id)));
    }, 2200);
  };

  const media = currentSlide?.url;

  const timeString = (() => {
    if (!currentSlide?.createdAt) return 'Just now';
    try {
      const diffMs   = Date.now() - new Date(currentSlide.createdAt).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1)  return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHrs  = Math.floor(diffMins / 60);
      if (diffHrs < 24)  return `${diffHrs}h ago`;
      return `${Math.floor(diffHrs / 24)}d ago`;
    } catch { return 'Just now'; }
  })();

  if (!group) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
      onClick={onClose}>

      {/* ── Prev User Arrow (left edge) ── */}
      {groupIdx > 0 && (
        <button
          onClick={e => { e.stopPropagation(); goToPrevGroup(); }}
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-[110] w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-black/70 transition-all shadow-lg"
          aria-label="Previous story"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* ── Next User Arrow (right edge) ── */}
      {groupIdx < groups.length - 1 && (
        <button
          onClick={e => { e.stopPropagation(); goToNextGroup(); }}
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-[110] w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-black/70 transition-all shadow-lg"
          aria-label="Next story"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* ── Story Card ── */}
      <div className="relative w-full max-w-md h-full sm:h-[92vh] sm:rounded-2xl overflow-hidden bg-black flex flex-col justify-between shadow-2xl"
        onClick={e => e.stopPropagation()}>

        {/* Top overlay */}
        <div className="absolute top-0 inset-x-0 z-20 p-3 bg-gradient-to-b from-black/70 to-transparent"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}>

          {/* Progress bars — one per slide in this group */}
          <div className="flex gap-1 mb-3">
            {slides.map((_, i) => (
              <div key={i} className="flex-1 h-[3px] bg-white/30 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-none"
                  style={{ width: i < slideIdx ? '100%' : i === slideIdx ? `${progress}%` : '0%' }} />
              </div>
            ))}
          </div>

          {/* Author row */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-white/60">
              <Avatar src={group.author.avatar ?? null} name={group.author.name || group.author.username} size={36} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm leading-none truncate">{group.author.name || group.author.username}</p>
              <p className="text-white/60 text-xs mt-0.5">{timeString}</p>
            </div>
            {/* Group indicator e.g. "2 / 5" */}
            <span className="text-white/50 text-xs mr-1">{groupIdx + 1}&thinsp;/&thinsp;{groups.length}</span>
            {currentSlide?.type === 'video' && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white flex-shrink-0 mr-1 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? (
                  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                ) : (
                  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                )}
              </button>
            )}
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Media */}
        <div className="relative flex-1 w-full h-full flex items-center justify-center"
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}>
          {media ? (
            currentSlide?.type === 'video' ? (
              <video
                src={media}
                className="w-full h-full object-contain"
                autoPlay
                playsInline
                muted={isMuted}
                ref={videoRef}
                key={media}
              />
            ) : (
              <Image src={media} alt="Story" fill className="object-contain" priority />
            )
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-gold-800 to-charcoal-900 flex items-center justify-center">
              <span className="text-6xl text-white">✦</span>
            </div>
          )}

          {/* Tap zones: left third = prev slide/group, right third = next slide/group */}
          <div className="absolute inset-x-0 top-20 bottom-44 flex z-10">
            <button className="w-1/3 h-full cursor-pointer" onClick={() => {
              if (slideIdx > 0) { setSlideIdx(i => i - 1); }
              else { goToPrevGroup(); }
            }} />
            <div className="w-1/3 h-full" />
            <button className="w-1/3 h-full cursor-pointer" onClick={() => {
              if (slideIdx < total - 1) { setSlideIdx(i => i + 1); }
              else { goToNextGroup(); }
            }} />
          </div>
        </div>

        {/* Floating Emojis */}
        <div className="absolute inset-0 z-30 pointer-events-none overflow-hidden">
          {floatingEmojis.map(fe => (
            <span
              key={fe.id}
              className="absolute bottom-28 text-4xl pointer-events-none select-none animate-float-emoji opacity-0"
              style={{ left: `${fe.left}%`, animationDelay: `${fe.delay}ms` }}
            >
              {fe.emoji}
            </span>
          ))}
        </div>

        <style>{`
          @keyframes floatEmoji {
            0%   { transform: translateY(0) scale(0.5) rotate(0deg); opacity: 0; }
            10%  { opacity: 1; transform: translateY(-20px) scale(1.25) rotate(12deg); }
            90%  { opacity: 0.9; }
            100% { transform: translateY(-300px) scale(0.7) rotate(-25deg); opacity: 0; }
          }
          @keyframes slideUp {
            0%   { transform: translate(-50%, 24px); opacity: 0; }
            100% { transform: translate(-50%, 0); opacity: 1; }
          }
          .animate-float-emoji { animation: floatEmoji 2s cubic-bezier(0.25, 1, 0.5, 1) forwards; }
          .animate-slide-up    { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        `}</style>

        {/* Toast */}
        {toast.visible && (
          <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-50 bg-black/85 backdrop-blur-md border border-gold-500/30 px-5 py-3 rounded-xl flex items-center gap-3 shadow-lg animate-slide-up">
            <span className="text-gold-400 text-lg">✨</span>
            <span className="text-white text-sm font-medium">{toast.message}</span>
          </div>
        )}

        {/* Bottom actions */}
        <div className="p-4 bg-gradient-to-t from-black/90 to-black/30 z-20 flex flex-col gap-3"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}>
          <div className="flex justify-center gap-3">
            {['👍', '❤️', '🔥', '😮', '🙌'].map(emoji => (
              <button key={emoji} type="button" onClick={() => handleReact(emoji)}
                className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-gold-500/30 flex items-center justify-center text-xl hover:scale-125 active:scale-95 transition-all hover:bg-gold-500/20 hover:border-gold-400 shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
                {emoji}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 bg-white/15 backdrop-blur-md rounded-full px-4 py-2.5 border border-white/10">
            <input
              type="text" placeholder="Reply to story..."
              value={msgText} onChange={e => setMsgText(e.target.value)}
              onFocus={() => setIsPaused(true)}
              onBlur={() => setIsPaused(false)}
              onKeyDown={e => { if (e.key === 'Enter' && msgText.trim()) handleSendStoryAction(`Story reply: "${msgText.trim()}"`); }}
              className="flex-1 bg-transparent text-white text-sm placeholder-white/50 outline-none"
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
    </div>
  );
}

// ── Main Feed Component ───────────────────────────────────────────────────────
export default function FeedPage() {
  const router   = useRouter();
  const { addItem } = useCart();
  const { formatPrice } = useLocalization();

  const [currentUser,       setCurrentUser]       = useState<CurrentUser | null>(null);
  const [posts,             setPosts]             = useState<Post[]>([]);
  const [stories,           setStories]           = useState<Story[]>([]);
  const [newPostContent,    setNewPostContent]    = useState('');
  const [isLoadingFeed,     setIsLoadingFeed]     = useState(true);
  const [page,              setPage]              = useState(1);
  const [hasMore,           setHasMore]           = useState(false);
  const [isLoadingMore,     setIsLoadingMore]     = useState(false);
  const [commentOpen,       setCommentOpen]       = useState<Record<string, boolean>>({});
  const [commentTexts,      setCommentTexts]      = useState<Record<string, string>>({});
  const [shareModal,        setShareModal]        = useState<string | null>(null);
  const [isCreatingPost,    setIsCreatingPost]    = useState(false);
  const [newPostsAvailable, setNewPostsAvailable] = useState(false);
  const [activeGroupIndex, setActiveGroupIndex] = useState<number | null>(null);
  const [activeImageIndexes, setActiveImageIndexes] = useState<Record<string, number>>({});
  const latestPostIdRef = useRef<string | null>(null);
  const didFetch        = useRef(false);
  const storiesRef      = useRef<HTMLDivElement>(null);

  // Set tab title
  useEffect(() => {
    document.title = "Social Feed | Certified Luxury World";
  }, []);

  // Current user
  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data?.user) {
          const u = json.data.user;
          setCurrentUser({ id: String(u.id), name: `${u.firstName} ${u.lastName ?? ''}`.trim(), avatar: u.avatar ?? null, role: u.role });
        }
      }).catch(() => {});
  }, []);

  // Stories — fetch once + poll every 30s so new stories appear without a page refresh
  const fetchStories = useCallback(() => {
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    fetch('/api/stories?limit=50', { headers })
      .then(r => r.json())
      .then(json => { if (json.success) setStories(json.data.stories ?? []); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchStories();
    const interval = setInterval(fetchStories, 30_000);
    return () => clearInterval(interval);
  }, [fetchStories]);

  // Group stories by author — one circle per user, all their slides inside
  const groupedStories = useMemo<StoryGroup[]>(() => {
    const map = new Map<string, StoryGroup>();
    for (const s of stories) {
      const key = s.author.id;
      if (!map.has(key)) {
        map.set(key, { author: s.author, slides: [], hasUnviewed: false });
      }
      const group = map.get(key)!;
      const mediaUrls = s.mediaUrls || [];
      const mediaTypes = s.mediaTypes || [];
      for (let i = 0; i < mediaUrls.length; i++) {
        const slide = {
          storyId: s.id,
          url: mediaUrls[i],
          type: mediaTypes[i] || 'image',
          createdAt: s.createdAt,
          viewed: s.viewed ?? false
        };
        group.slides.push(slide);
        if (!slide.viewed) group.hasUnviewed = true;
      }
    }
    return Array.from(map.values());
  }, [stories]);

  const fetchPosts = useCallback((pageNum: number, append: boolean) => {
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return fetch(`/api/posts?limit=10&page=${pageNum}`, { headers })
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data?.posts) {
          const livePosts: Post[] = json.data.posts.map((p: {
            id?: string; _id?: string;  // API returns 'id' via docToObject(); _id is legacy fallback
            authorId: string; authorName: string; authorAvatar?: string | null;
            authorRole: string; content: string; images: string[]; videos?: string[]; product?: PostProduct;
            likes: number; comments: number; shares: number; createdAt: string; liked?: boolean;
          }) => ({
            id: String(p.id ?? p._id ?? ''),  // prefer 'id' (Firestore docToObject), fallback to _id
            authorId: String(p.authorId),
            author: { name: p.authorName, avatar: p.authorAvatar ?? null, verified: p.authorRole !== 'customer', isVendor: ['vendor','brand'].includes(p.authorRole) },
            content: p.content, images: p.images ?? [], videos: p.videos ?? [], product: p.product,
            likes: p.likes, comments: p.comments, shares: p.shares,
            timestamp: p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'Recently',
            liked: p.liked ?? false, saved: false,
          }));
          if (append) setPosts(prev => [...prev, ...livePosts]);
          else setPosts(livePosts);
          setHasMore(json.data.pagination?.hasNext ?? false);
        }
      });
  }, []);

  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;
    fetchPosts(1, false).then(() => {
      setPosts(prev => { if (prev.length > 0) latestPostIdRef.current = prev[0].id; return prev; });
    }).catch(() => {}).finally(() => setIsLoadingFeed(false));
  }, [fetchPosts]);

  // Poll for new posts
  useEffect(() => {
    const interval = setInterval(async () => {
      const token = getAuthToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      try {
        const res  = await fetch('/api/posts?limit=1&page=1', { headers });
        const json = await res.json();
        if (json.success && json.data?.posts?.length > 0) {
          const newest = json.data.posts[0];
          const newestId = String(newest.id ?? newest._id ?? '');
          if (latestPostIdRef.current && newestId && newestId !== latestPostIdRef.current) setNewPostsAvailable(true);
        }
      } catch { /* silent */ }
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  const handleLike = async (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const token = getAuthToken();
    if (!token) { router.push('/auth/login'); return; }
    const action = post.liked ? 'unlike' : 'like';
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p));
    const res = await fetch(`/api/posts/${postId}/like`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    }).catch(() => null);
    if (!res?.ok) setPosts(prev => prev.map(p => p.id === postId ? { ...p, liked: post.liked, likes: post.likes } : p));
  };

  const handleSave     = (postId: string) => setPosts(posts.map(p => p.id === postId ? { ...p, saved: !p.saved } : p));
  const handleBuyNow   = (product: PostProduct) => { addItem({ productId: product.id, name: product.name || 'Product', price: Number(product.price || 0), image: product.image, vendor: product.vendor, size: 'One Size', color: 'Default', quantity: 1 }); router.push('/checkout/review'); };

  const handleCreatePost = async () => {
    const text = newPostContent.trim();
    if (!text) { router.push('/post/create'); return; }
    const token = getAuthToken();
    if (!token) { router.push('/auth/login?redirect=/feed'); return; }
    setIsCreatingPost(true);
    try {
      const res  = await fetch('/api/posts', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ content: text, privacy: 'public', status: 'published' }) });
      const json = await res.json();
      if (json.success) {
        setNewPostContent('');
        const p = json.data?.post;
        setPosts(prev => [{ id: String(p?._id ?? Date.now()), authorId: currentUser?.id ?? '', author: { name: currentUser?.name ?? 'You', avatar: currentUser?.avatar ?? null, verified: false, isVendor: ['vendor','brand'].includes(currentUser?.role ?? '') }, content: text, images: [], likes: 0, comments: 0, shares: 0, timestamp: 'Just now', liked: false, saved: false }, ...prev]);
      } else router.push('/post/create');
    } catch { router.push('/post/create'); }
    finally { setIsCreatingPost(false); }
  };

  const handleCommentSubmit = async (postId: string) => {
    const text = (commentTexts[postId] ?? '').trim();
    if (!text) return;
    const token = getAuthToken();
    if (!token) { router.push('/auth/login'); return; }
    try {
      const res  = await fetch(`/api/posts/${postId}/comment`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
      const json = await res.json();
      if (json.success) { setCommentTexts(prev => ({ ...prev, [postId]: '' })); setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: p.comments + 1 } : p)); }
    } catch { /* ignore */ }
  };

  const handleShare = async (postId: string) => {
    setShareModal(postId);
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, shares: p.shares + 1 } : p));
    const token = getAuthToken();
    if (token) await fetch(`/api/posts/${postId}/share`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
  };

  return (
    <div className="min-h-screen bg-cool-gray-50 dark:bg-charcoal-950">
      {activeGroupIndex !== null && (
        <StoryViewer
          groups={groupedStories}
          initialGroupIndex={activeGroupIndex}
          onClose={() => setActiveGroupIndex(null)}
        />
      )}
      <Header />

      <div className="max-w-2xl mx-auto px-0 sm:px-4 py-4 sm:py-8">

        {/* ── Stories Bar ───────────────────────────────────────────── */}
        <div className="bg-white dark:bg-charcoal-900 sm:rounded-2xl border-y sm:border border-cool-gray-200 dark:border-charcoal-800 mb-3 shadow-sm">
          <div ref={storiesRef} className="flex gap-4 overflow-x-auto px-4 py-4 scrollbar-hide">

            {/* Add Story */}
            {currentUser && (
              <button onClick={() => router.push('/stories/create')}
                className="shrink-0 flex flex-col items-center gap-1.5 group">
                <div className="relative w-16 h-16 sm:w-[70px] sm:h-[70px]">
                  <div className="w-full h-full rounded-full overflow-hidden ring-2 ring-cool-gray-200 dark:ring-charcoal-700">
                    <Avatar src={currentUser.avatar} name={currentUser.name} size={70} />
                  </div>
                  {/* Plus badge */}
                  <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-gold-600 border-2 border-white dark:border-charcoal-900 flex items-center justify-center shadow-md">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                </div>
                <p className="text-[11px] text-cool-gray-500 dark:text-cool-gray-400 font-medium truncate w-16 sm:w-[70px] text-center">Your Story</p>
              </button>
            )}

            {/* Story Bubbles — one per author, accumulates all their slides */}
            {groupedStories.map((group, gIdx) => (
              <button key={group.author.id} onClick={() => setActiveGroupIndex(gIdx)}
                className="shrink-0 flex flex-col items-center gap-1.5 group">
                <div className="relative w-16 h-16 sm:w-[70px] sm:h-[70px]">
                  {/* Gold ring = has story */}
                  <div className="absolute inset-0 rounded-full bg-linear-to-tr from-gold-400 via-gold-600 to-gold-800 p-[2px]">
                    <div className="w-full h-full rounded-full bg-white dark:bg-charcoal-900 p-[2px]">
                      <div className="w-full h-full rounded-full overflow-hidden">
                        <Avatar src={group.author.avatar ?? null} name={group.author.name || group.author.username} size={66} />
                      </div>
                    </div>
                  </div>
                  {/* Story count badge when > 1 slide */}
                  {group.slides.length > 1 && (
                    <div className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-gold-600 border-2 border-white dark:border-charcoal-900 flex items-center justify-center shadow">
                      <span className="text-white text-[9px] font-bold">{group.slides.length}</span>
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-charcoal-700 dark:text-cool-gray-300 truncate w-16 sm:w-[70px] text-center font-medium">
                  {group.author.username || group.author.name}
                </p>
              </button>
            ))}

            {/* Empty state if no stories and no user */}
            {!currentUser && groupedStories.length === 0 && (
              <div className="flex items-center gap-3 py-2 text-sm text-cool-gray-400 dark:text-cool-gray-500">
                <div className="w-14 h-14 rounded-full bg-cool-gray-100 dark:bg-charcoal-800 flex items-center justify-center">
                  <svg className="w-6 h-6 text-cool-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <span>No stories yet — be the first!</span>
              </div>
            )}
          </div>
        </div>

        {/* ── New Posts Banner ───────────────────────────────────────── */}
        {newPostsAvailable && (
          <button onClick={async () => {
            setNewPostsAvailable(false); setIsLoadingFeed(true); setPage(1);
            await fetchPosts(1, false).catch(() => {});
            setIsLoadingFeed(false);
            setPosts(prev => { if (prev.length > 0) latestPostIdRef.current = prev[0].id; return prev; });
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }} className="w-full mb-3 py-3 bg-gold-600 hover:bg-gold-700 text-white sm:rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 shadow-md">
            <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            New posts — tap to refresh
          </button>
        )}

        {/* ── Create Post ────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-charcoal-900 sm:rounded-2xl border-y sm:border border-cool-gray-200 dark:border-charcoal-800 p-4 mb-3 shadow-sm">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 ring-2 ring-cool-gray-100 dark:ring-charcoal-800">
              <Avatar src={currentUser?.avatar ?? null} name={currentUser?.name ?? 'You'} size={40} />
            </div>
            <div className="flex-1">
              <textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="Share your fashion moment…"
                className="w-full px-4 py-3 rounded-xl border border-cool-gray-200 dark:border-charcoal-700 bg-cool-gray-50 dark:bg-charcoal-800 text-charcoal-900 dark:text-white placeholder-cool-gray-400 focus:outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20 resize-none text-sm transition-all"
                rows={3}
              />
              <div className="flex items-center justify-between mt-2.5">
                <div className="flex gap-1">
                  {[
                    { icon: '📷', label: 'Photo', href: '/post/create' },
                    { icon: '🏷️', label: 'Tag',   href: '/post/create' },
                  ].map(item => (
                    <button key={item.label} onClick={() => router.push(item.href)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-cool-gray-100 dark:hover:bg-charcoal-800 text-cool-gray-500 dark:text-cool-gray-400 hover:text-charcoal-900 dark:hover:text-white transition-colors text-xs font-medium">
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
                <button onClick={handleCreatePost} disabled={isCreatingPost}
                  className="px-5 py-2 bg-gold-600 hover:bg-gold-700 active:scale-95 text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-50 shadow-md shadow-gold-600/20">
                  {isCreatingPost ? (
                    <span className="flex items-center gap-2">
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Posting…
                    </span>
                  ) : 'Post'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Loading State ──────────────────────────────────────────── */}
        {isLoadingFeed && posts.length === 0 && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white dark:bg-charcoal-900 sm:rounded-2xl border-y sm:border border-cool-gray-200 dark:border-charcoal-800 p-5 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-full bg-cool-gray-100 dark:bg-charcoal-800" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-cool-gray-100 dark:bg-charcoal-800 rounded-full w-32" />
                    <div className="h-2 bg-cool-gray-100 dark:bg-charcoal-800 rounded-full w-20" />
                  </div>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="h-3 bg-cool-gray-100 dark:bg-charcoal-800 rounded-full" />
                  <div className="h-3 bg-cool-gray-100 dark:bg-charcoal-800 rounded-full w-4/5" />
                </div>
                <div className="aspect-video bg-cool-gray-100 dark:bg-charcoal-800 rounded-xl" />
              </div>
            ))}
          </div>
        )}

        {/* ── Empty State ────────────────────────────────────────────── */}
        {!isLoadingFeed && posts.length === 0 && (
          <div className="bg-white dark:bg-charcoal-900 sm:rounded-2xl border-y sm:border border-cool-gray-200 dark:border-charcoal-800 py-16 text-center shadow-sm">
            <div className="w-20 h-20 rounded-full bg-gold-50 dark:bg-gold-900/20 flex items-center justify-center mx-auto mb-5">
              <span className="text-3xl">✦</span>
            </div>
            <h3 className="text-xl font-bold text-charcoal-900 dark:text-white mb-2">No posts yet</h3>
            <p className="text-cool-gray-500 dark:text-cool-gray-400 text-sm mb-6 max-w-xs mx-auto">
              Be the first to share a fashion moment with the community.
            </p>
            <Link href="/post/create"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gold-600 hover:bg-gold-700 text-white rounded-xl font-semibold text-sm transition-colors shadow-md shadow-gold-600/20">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create First Post
            </Link>
          </div>
        )}

        {/* ── Posts ──────────────────────────────────────────────────── */}
        <div className="space-y-3">
          {posts.map(post => (
            <article key={post.id}
              className="bg-white dark:bg-charcoal-900 sm:rounded-2xl border-y sm:border border-cool-gray-200 dark:border-charcoal-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">

              {/* Post Header */}
              <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                <Link href={`/profile/${post.author.name.toLowerCase().replace(/\s+/g,'')}`}
                  className="w-11 h-11 rounded-full overflow-hidden shrink-0 ring-2 ring-cool-gray-100 dark:ring-charcoal-800 hover:ring-gold-400 transition-all">
                  <Avatar src={post.author.avatar} name={post.author.name} size={44} />
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Link href={`/profile/${post.author.name.toLowerCase().replace(/\s+/g,'')}`}
                      className="font-bold text-sm text-charcoal-900 dark:text-white hover:text-gold-600 dark:hover:text-gold-400 transition-colors truncate">
                      {post.author.name}
                    </Link>
                    {post.author.verified && (
                      <svg className="w-4 h-4 text-gold-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                    {post.author.isVendor && (
                      <span className="px-1.5 py-0.5 bg-gold-100 dark:bg-gold-900/30 text-gold-700 dark:text-gold-400 text-[9px] font-bold rounded tracking-wider uppercase">
                        Brand
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-cool-gray-400 dark:text-cool-gray-500 mt-0.5">{post.timestamp}</p>
                </div>
                <Link href={`/post/${post.id}`}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-cool-gray-100 dark:hover:bg-charcoal-800 text-cool-gray-400 transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
                  </svg>
                </Link>
              </div>

              {/* Post Content */}
              {post.content && (
                <Link href={`/post/${post.id}`} className="block px-4 pb-3">
                  <p className="text-sm text-charcoal-800 dark:text-cool-gray-200 leading-relaxed whitespace-pre-line">
                    {post.content}
                  </p>
                </Link>
              )}

              {/* Post Video and/or Images Gallery */}
              {(() => {
                const mediaItems = [
                  ...(post.videos || []).map(v => ({ type: 'video' as const, url: v })),
                  ...(post.images || []).map(img => ({ type: 'image' as const, url: img }))
                ];

                if (mediaItems.length === 0) return null;

                const activeIdx = activeImageIndexes[post.id] ?? 0;
                const currentItem = mediaItems[activeIdx] || mediaItems[0];

                return (
                  <div className="relative group px-4 pb-3">
                    <div className="relative rounded-xl overflow-hidden aspect-4/3 bg-charcoal-950">
                      {currentItem.type === 'video' ? (
                        <div className="w-full h-full relative">
                          <video
                            src={currentItem.url}
                            className="w-full h-full object-cover"
                            controls
                            playsInline
                            preload="metadata"
                            key={currentItem.url}
                          />
                        </div>
                      ) : (
                        <div className="w-full h-full relative">
                          <Image
                            src={currentItem.url}
                            alt="Post media"
                            fill
                            className="object-cover"
                          />
                          <Link href={`/post/${post.id}`} className="absolute inset-0 z-0" />
                        </div>
                      )}

                      {/* Navigation buttons */}
                      {mediaItems.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const prevIdx = (activeIdx - 1 + mediaItems.length) % mediaItems.length;
                              setActiveImageIndexes(prev => ({ ...prev, [post.id]: prevIdx }));
                            }}
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white text-lg font-bold shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
                          >
                            ‹
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const nextIdx = (activeIdx + 1) % mediaItems.length;
                              setActiveImageIndexes(prev => ({ ...prev, [post.id]: nextIdx }));
                            }}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white text-lg font-bold shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
                          >
                            ›
                          </button>

                          {/* Dot indicators */}
                          <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5 z-10">
                            {mediaItems.map((_, dotIdx) => (
                              <button
                                key={dotIdx}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveImageIndexes(prev => ({ ...prev, [post.id]: dotIdx }));
                                }}
                                className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
                                  activeIdx === dotIdx ? 'bg-gold-500 scale-125' : 'bg-white/50'
                                }`}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Tagged Product Card */}
              {post.product && (
                <div className="mx-4 my-3 rounded-2xl overflow-hidden border border-gold-200 dark:border-gold-800/60 bg-gold-50 dark:bg-gold-900/10">
                  <div className="flex items-center gap-3 p-3">
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 ring-1 ring-gold-200 dark:ring-gold-800">
                      <Image src={post.product.image} alt={post.product.name} fill className="object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-charcoal-900 dark:text-white truncate">{post.product.name || 'Tagged Product'}</p>
                      <p className="text-gold-600 dark:text-gold-400 font-bold text-base">
                        {formatPrice(typeof post.product.price === 'number' ? post.product.price : Number(post.product.price || 0))}
                      </p>
                      {post.product.vendor && (
                        <p className="text-xs text-cool-gray-500 truncate">by {post.product.vendor}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex border-t border-gold-200 dark:border-gold-800/60 divide-x divide-gold-200 dark:divide-gold-800/60">
                    <Link href={`/product/${post.product.id}`}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-charcoal-700 dark:text-cool-gray-300 hover:bg-gold-100 dark:hover:bg-gold-900/30 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View
                    </Link>
                    <button onClick={() => handleBuyNow(post.product!)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold bg-gold-600 hover:bg-gold-700 text-white transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                      Buy Now
                    </button>
                  </div>
                </div>
              )}

              {/* Engagement Stats */}
              <div className="flex items-center justify-between px-4 py-2 text-xs text-cool-gray-400 dark:text-cool-gray-500 border-t border-cool-gray-100 dark:border-charcoal-800">
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 text-gold-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>
                  {post.likes.toLocaleString()} likes
                </span>
                <div className="flex gap-3">
                  <button onClick={() => setCommentOpen(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                    className="hover:text-gold-600 transition-colors">
                    {post.comments} comments
                  </button>
                  <span>{post.shares} shares</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center divide-x divide-cool-gray-100 dark:divide-charcoal-800 border-t border-cool-gray-100 dark:border-charcoal-800">
                {[
                  {
                    label: 'Like',
                    icon: post.liked
                      ? <svg className="w-4 h-4 text-gold-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>
                      : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>,
                    active: post.liked,
                    activeClass: 'text-gold-500',
                    onClick: () => handleLike(post.id),
                  },
                  {
                    label: 'Comment',
                    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>,
                    active: commentOpen[post.id],
                    activeClass: 'text-gold-600',
                    onClick: () => setCommentOpen(prev => ({ ...prev, [post.id]: !prev[post.id] })),
                  },
                  {
                    label: 'Share',
                    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>,
                    active: false,
                    activeClass: '',
                    onClick: () => handleShare(post.id),
                  },
                  {
                    label: 'Save',
                    icon: post.saved
                      ? <svg className="w-4 h-4 text-gold-600" fill="currentColor" viewBox="0 0 20 20"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" /></svg>
                      : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>,
                    active: post.saved,
                    activeClass: 'text-gold-600',
                    onClick: () => handleSave(post.id),
                  },
                ].map(action => (
                  <button key={action.label} onClick={action.onClick}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors hover:bg-cool-gray-50 dark:hover:bg-charcoal-800 ${
                      action.active ? action.activeClass : 'text-cool-gray-500 dark:text-cool-gray-400'
                    }`}>
                    {action.icon}
                    <span className="hidden sm:inline">{action.label}</span>
                  </button>
                ))}
              </div>

              {/* Comment Form */}
              {commentOpen[post.id] && (
                <div className="px-4 pb-4 pt-1 border-t border-cool-gray-100 dark:border-charcoal-800">
                  <div className="flex gap-2 items-center mt-2">
                    <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 ring-1 ring-cool-gray-100 dark:ring-charcoal-800">
                      <Avatar src={currentUser?.avatar ?? null} name={currentUser?.name ?? ''} size={32} />
                    </div>
                    <div className="flex-1 flex items-center gap-2 bg-cool-gray-50 dark:bg-charcoal-800 rounded-full px-4 border border-cool-gray-200 dark:border-charcoal-700 focus-within:border-gold-500 focus-within:ring-2 focus-within:ring-gold-500/20 transition-all">
                      <input type="text"
                        value={commentTexts[post.id] ?? ''}
                        onChange={e => setCommentTexts(prev => ({ ...prev, [post.id]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && handleCommentSubmit(post.id)}
                        placeholder="Add a comment…"
                        className="flex-1 py-2.5 bg-transparent text-sm text-charcoal-900 dark:text-white placeholder-cool-gray-400 outline-none" />
                      <button onClick={() => handleCommentSubmit(post.id)}
                        disabled={!(commentTexts[post.id] ?? '').trim()}
                        className="text-gold-600 font-bold text-sm disabled:opacity-30 hover:text-gold-700 transition-colors py-2">
                        Post
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>

        {/* Load More */}
        {hasMore && (
          <div className="text-center mt-6">
            <button onClick={async () => {
              const next = page + 1; setIsLoadingMore(true); setPage(next);
              await fetchPosts(next, true).catch(() => {}); setIsLoadingMore(false);
            }} disabled={isLoadingMore}
              className="px-8 py-3 bg-white dark:bg-charcoal-900 border border-cool-gray-200 dark:border-charcoal-700 text-charcoal-700 dark:text-cool-gray-300 rounded-xl font-semibold text-sm hover:border-gold-500 hover:text-gold-600 transition-all disabled:opacity-50 shadow-sm">
              {isLoadingMore ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Loading…
                </span>
              ) : 'Load More Posts'}
            </button>
          </div>
        )}
      </div>

      {/* ── Share Modal ────────────────────────────────────────────────── */}
      {shareModal && (() => {
        const sharedPost = posts.find(p => p.id === shareModal);
        const postUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/post/${shareModal}`;
        return (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-charcoal-950/70 backdrop-blur-sm"
            onClick={() => setShareModal(null)}>
            <div className="bg-white dark:bg-charcoal-900 w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-6 border border-cool-gray-200 dark:border-charcoal-700"
              onClick={e => e.stopPropagation()}>
              <div className="w-10 h-1 rounded-full bg-cool-gray-200 dark:bg-charcoal-700 mx-auto mb-5 sm:hidden" />
              <h3 className="text-lg font-bold text-charcoal-900 dark:text-white mb-1">Share Post</h3>
              {sharedPost && <p className="text-sm text-cool-gray-500 mb-5 line-clamp-2">{sharedPost.content}</p>}
              <div className="space-y-2">
                {[
                  { icon: '🔗', label: 'Copy Link', sub: 'Copy post URL to clipboard', onClick: () => { navigator.clipboard.writeText(postUrl); setShareModal(null); } },
                ].map(item => (
                  <button key={item.label} onClick={item.onClick}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-cool-gray-200 dark:border-charcoal-700 hover:bg-cool-gray-50 dark:hover:bg-charcoal-800 hover:border-gold-400 transition-all text-left">
                    <span className="text-2xl">{item.icon}</span>
                    <div>
                      <p className="font-semibold text-charcoal-900 dark:text-white text-sm">{item.label}</p>
                      <p className="text-xs text-cool-gray-400">{item.sub}</p>
                    </div>
                  </button>
                ))}
                <Link href={`/messages?share=${shareModal}`} onClick={() => setShareModal(null)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-cool-gray-200 dark:border-charcoal-700 hover:bg-cool-gray-50 dark:hover:bg-charcoal-800 hover:border-gold-400 transition-all">
                  <span className="text-2xl">💬</span>
                  <div>
                    <p className="font-semibold text-charcoal-900 dark:text-white text-sm">Send via DM</p>
                    <p className="text-xs text-cool-gray-400">Share in a direct message</p>
                  </div>
                </Link>
              </div>
              <button onClick={() => setShareModal(null)}
                className="mt-4 w-full py-3 text-cool-gray-500 dark:text-cool-gray-400 font-semibold text-sm hover:text-charcoal-900 dark:hover:text-white transition-colors">
                Cancel
              </button>
            </div>
          </div>
        );
      })()}

      {/* ── Floating Action Buttons ────────────────────────────────────── */}
      <div className="fixed bottom-6 right-4 sm:right-6 z-40 flex flex-col gap-3">
        <Link href="/stories/create"
          className="w-12 h-12 sm:w-14 sm:h-14 bg-charcoal-900 dark:bg-charcoal-700 hover:bg-gold-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95 border border-charcoal-700 dark:border-charcoal-600"
          title="Create Story">
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </Link>
        <Link href="/post/create"
          className="w-12 h-12 sm:w-14 sm:h-14 bg-gold-600 hover:bg-gold-700 text-white rounded-full shadow-lg shadow-gold-600/30 flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          title="Create Post">
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </Link>
      </div>

      <Footer />
    </div>
  );
}
