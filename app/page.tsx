'use client';

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/common/Header";
import Footer from "../components/common/Footer";
import { useCart } from "../contexts/CartContext";
import { getAuthToken } from "../lib/api/auth";
import { useAuth } from "../contexts/AuthContext";
import { useLocalization } from "../contexts/LocalizationContext";

interface Post {
  _id?: string;
  id?: string;
  authorName?: string;
  authorAvatar?: string;
  images?: string[];
  caption?: string;
  likes?: number;
  comments?: number;
}

interface StoryAuthor { id: string; username: string; name: string; avatar?: string | null; }
interface Story       { id: string; mediaUrls: string[]; author: StoryAuthor; expiresAt: string; createdAt?: string; }
// StoryGroup aggregates all story docs from one author into a single tray circle
interface StoryGroup  { author: StoryAuthor; slides: { storyId: string; url: string; createdAt?: string }[]; }

// ── Story Viewer Modal ────────────────────────────────────────────────────────
function StoryViewer({ group, onClose }: { group: StoryGroup; onClose: () => void }) {
  const [idx, setIdx]       = useState(0);
  const [progress, setProgress] = useState(0);
  const [msgText, setMsgText] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [floatingEmojis, setFloatingEmojis] = useState<{ id: number; emoji: string; left: number; delay: number }[]>([]);
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });
  const slides = group.slides;
  const total  = slides.length || 1;
  const currentSlide = slides[idx];

  useEffect(() => {
    if (isPaused) return;

    const step = 20; // check interval in ms
    const duration = 5000;
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + (step / duration) * 100;
        if (next >= 100) {
          if (idx < total - 1) {
            setIdx(i => i + 1);
            return 0;
          } else {
            onClose();
            return prev;
          }
        }
        return next;
      });
    }, step);

    return () => clearInterval(interval);
  }, [idx, total, onClose, isPaused]);

  useEffect(() => {
    setProgress(0);
  }, [idx]);

  // Submit reaction / reply to vendor conversation
  const handleSendStoryAction = async (contentToSend: string) => {
    const token = getAuthToken();
    if (!token) return;
    try {
      // Find or create direct message thread with story author
      const convoRes = await fetch('/api/messages', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: group.author.id, text: contentToSend })
      });
      const convoJson = await convoRes.json();
      if (!convoRes.ok || !convoJson.success) return;

       const convoId = convoJson.data.conversationId;
      // Send story reply/reaction message inside Direct Messages thread
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
      left: Math.random() * 60 + 20,
      delay: i * 120,
    }));
    
    setFloatingEmojis(prev => [...prev, ...newFloating]);
    setTimeout(() => {
      setFloatingEmojis(prev => prev.filter(item => !newFloating.find(nf => nf.id === item.id)));
    }, 2200);
  };

  const media = currentSlide?.url;
  
  // Format story creation time dynamically
  const timeString = (() => {
    if (!currentSlide?.createdAt) return 'Just now';
    try {
      const diffMs = Date.now() - new Date(currentSlide.createdAt).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHrs = Math.floor(diffMins / 60);
      if (diffHrs < 24) return `${diffHrs}h ago`;
      return `${Math.floor(diffHrs / 24)}d ago`;
    } catch {
      return 'Just now';
    }
  })();

  return (
    <div className="fixed inset-0 z-[100] bg-charcoal-950/90 backdrop-blur-md flex items-center justify-center p-0 sm:p-4"
      onClick={onClose}>
      <div className="relative w-full max-w-2xl h-full sm:h-[90vh] sm:rounded-2xl overflow-hidden bg-black flex flex-col justify-between"
        onClick={e => e.stopPropagation()}>
        {/* Top Section overlays */}
        <div className="absolute top-0 inset-x-0 z-20 p-3 bg-gradient-to-b from-black/60 to-transparent" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}>
          {/* Progress bars */}
          <div className="flex gap-1 mb-3">
            {Array.from({ length: total }).map((_, i) => (
              <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-none"
                  style={{ width: i < idx ? '100%' : i === idx ? `${progress}%` : '0%' }} />
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-white/60">
              <div className="w-full h-full bg-charcoal-700 rounded-full overflow-hidden relative">
                {group.author.avatar ? (
                  <Image src={group.author.avatar} alt={group.author.name} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full bg-gold-600 flex items-center justify-center text-white font-bold text-xs">
                    {(group.author.name || group.author.username || '?')[0].toUpperCase()}
                  </div>
                )}
              </div>
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-none">{group.author.name || group.author.username}</p>
              <p className="text-white/60 text-xs mt-0.5">{timeString}</p>
            </div>
            <button onClick={onClose} className="ml-auto w-8 h-8 flex items-center justify-center text-white/80 hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Media Content - Scaled aspect ratio */}
        <div className="relative flex-1 w-full h-full flex items-center justify-center"
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}>
          {media ? (
            <Image src={media} alt="Story content" fill className="object-contain" priority />
          ) : (
            <div className="absolute inset-0 bg-linear-to-br from-gold-800 to-charcoal-900 flex items-center justify-center">
              <span className="text-6xl text-white">✦</span>
            </div>
          )}

          {/* Tap zones overlay */}
          <div className="absolute inset-x-0 top-24 bottom-44 flex z-10">
            <button className="w-1/3 h-full cursor-pointer" onClick={() => setIdx(i => Math.max(0, i - 1))} />
            <div className="w-1/3 h-full" />
            <button className="w-1/3 h-full cursor-pointer" onClick={() => { if (idx < total - 1) setIdx(i => i + 1); else onClose(); }} />
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

        {/* Bottom Actions Overlay */}
        <div className="p-4 bg-gradient-to-t from-black/90 to-black/30 z-20 flex flex-col gap-3" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}>
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

          {/* Reply Input */}
          <div className="flex items-center gap-2 bg-white/15 backdrop-blur-md rounded-full px-4 py-2.5 border border-white/10">
            <input
              type="text"
              placeholder="Reply to story..."
              value={msgText}
              onChange={e => setMsgText(e.target.value)}
              onFocus={() => setIsPaused(true)}
              onBlur={() => setIsPaused(false)}
              onKeyDown={e => {
                if (e.key === 'Enter' && msgText.trim()) {
                  handleSendStoryAction(`Story reply: "${msgText.trim()}"`);
                }
              }}
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

interface Vendor {
  id: string;
  name: string;
  avatar: string | null;
  banner?: string | null;
  bio: string;
  products: number;
}

interface Brand {
  id: string;
  name: string;
  avatar: string | null;
  banner?: string | null;
  bio: string;
  products: number;
}

interface Product {
  id: string;
  name: string;
  price: number;
  salePrice?: number;
  images: string[];
  rating?: number;
  salesCount?: number;
  vendorName?: string;
  category?: string;
  tags?: string[];
}

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [_selectedCategory, setSelectedCategory] = useState('');
  const router = useRouter();
  const { addItem } = useCart();
  const { user } = useAuth();
  const { t, formatPrice } = useLocalization();
  const isCustomer = user?.role === 'customer';

  const [posts,    setPosts]    = useState<Post[]>([]);
  const [vendors,  setVendors]  = useState<Vendor[]>([]);
  const [brands,   setBrands]   = useState<Brand[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stories,  setStories]  = useState<any[]>([]);
  const [activeStory, setActiveStory] = useState<StoryGroup | null>(null);

  const brandsRef = useRef<HTMLDivElement>(null);
  const productsRef = useRef<HTMLDivElement>(null);
  const vendorsRef = useRef<HTMLDivElement>(null);

  const scrollContainer = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (!ref.current) return;
    const scrollAmount = 340;
    ref.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    document.title = "Certified Luxury World | Premium Luxury Marketplace";
    // Fetch all homepage data in parallel (stories fetched separately with polling)
    Promise.all([
      fetch('/api/posts?limit=6').then(r => r.json()).catch(() => ({})),
      fetch('/api/vendors?limit=4').then(r => r.json()).catch(() => ({})),
      fetch('/api/brands?limit=6').then(r => r.json()).catch(() => ({})),
      fetch('/api/products?limit=18&sort=popular').then(r => r.json()).catch(() => ({})),
    ]).then(([postsRes, vendorsRes, brandsRes, productsRes]) => {
      if (postsRes?.data?.posts)       setPosts(postsRes.data.posts);
      if (vendorsRes?.data?.vendors)   setVendors(vendorsRes.data.vendors);
      if (brandsRes?.data?.brands)     setBrands(brandsRes.data.brands);
      if (productsRes?.data?.products) setProducts(productsRes.data.products);
    });
  }, []);

  // Stories — separate polling so new stories appear every 30s without full page reload
  const fetchStories = useCallback(() => {
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    fetch('/api/stories?limit=50', { headers })
      .then(r => r.json())
      .then(json => { if (json?.data?.stories) setStories(json.data.stories); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchStories();
    const interval = setInterval(fetchStories, 30_000);
    return () => clearInterval(interval);
  }, [fetchStories]);

  // Group stories by author — one circle per user like Instagram/WhatsApp
  const groupedStories = useMemo(() => {
    const map = new Map<string, { author: any; slides: { storyId: string; url: string; createdAt?: string }[] }>();
    for (const s of stories) {
      const key = s.author.id;
      if (!map.has(key)) map.set(key, { author: s.author, slides: [] });
      const group = map.get(key)!;
      for (const url of (s.mediaUrls || [])) {
        group.slides.push({ storyId: s.id, url, createdAt: s.createdAt });
      }
    }
    return Array.from(map.values());
  }, [stories]);

  const getCategoryImage = (catName: string): string | null => {
    const found = products.find(p => {
      const cat = p.category?.toLowerCase() || '';
      const tags = (p.tags || []).map(t => t.toLowerCase());
      const name = p.name?.toLowerCase() || '';
      if (catName === "Women's Fashion") {
        return cat === 'dresses' || cat === 'tops' || tags.includes('women') || tags.includes('womens') || name.includes('women') || name.includes('dress') || name.includes('girl');
      }
      if (catName === "Men's Fashion") {
        return tags.includes('men') || tags.includes('mens') || name.includes('men') || name.includes('man') || name.includes('pants') || name.includes('jacket');
      }
      if (catName === 'Accessories') {
        return cat === 'accessories' || cat === 'bags' || cat === 'jewelry' || tags.includes('accessory') || name.includes('bag') || name.includes('jewelry') || name.includes('bangles');
      }
      if (catName === 'Footwear') {
        return cat === 'shoes' || cat === 'footwear' || tags.includes('shoes') || tags.includes('footwear') || name.includes('shoes') || name.includes('pants') || name.includes('boot') || name.includes('sneaker');
      }
      return false;
    });
    return found?.images?.[0] || null;
  };

  const getBrandProductPreview = (brandName: string): string | null => {
    const brandProducts = products.filter(p => p.vendorName === brandName);
    return brandProducts[0]?.images?.[0] || null;
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/shop?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category);
    router.push(`/shop?category=${encodeURIComponent(category.toLowerCase())}`);
  };

  const handleProductClick = (productId: string) => {
    router.push(`/product/${productId}`);
  };

  const handleAddToCart = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    addItem({
      productId,
      name: product.name,
      price: product.salePrice ?? product.price,
      image: product.images?.[0] ?? '',
      vendor: product.vendorName ?? '',
      size: '',
      color: '',
      quantity: 1,
    });
  };

  const handleAddToWishlist = async (productId: string) => {
    const token = getAuthToken();
    if (!token) { router.push('/auth/login'); return; }
    await fetch('/api/wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ productId }),
    });
  };

  return (
    <div className="min-h-screen bg-cool-gray-50 dark:bg-charcoal-950 transition-colors duration-200">
      <Header />

      {/* Hero Section with Search */}
      <section className="relative bg-linear-to-br from-charcoal-900 via-charcoal-800 to-charcoal-700 dark:from-charcoal-950 dark:via-charcoal-900 dark:to-charcoal-800 text-white overflow-hidden">
        {/* Branded hero background */}
        <div className="absolute inset-0">
          <Image
            src="/images/brand/clw-banner1.jpg"
            alt="Certified Luxury World"
            fill
            className="object-cover object-center"
            priority
            quality={85}
          />
          <div className="absolute inset-0 bg-charcoal-950/65 dark:bg-charcoal-950/75" />
          <div className="absolute inset-0 bg-linear-to-br from-charcoal-900/40 via-transparent to-gold-900/20" />
        </div>
        
        <div className="container mx-auto px-4 py-12 sm:py-16 lg:py-20 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-3 sm:mb-4">
              <span className="inline-block px-3 py-1.5 sm:px-4 sm:py-2 bg-gold-500/20 dark:bg-gold-600/30 backdrop-blur-sm rounded-full text-gold-200 dark:text-gold-300 text-xs sm:text-sm font-medium">
                Certified Luxury World
              </span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-display font-bold mb-3 sm:mb-4 md:mb-6 animate-fade-in px-4 leading-tight">
              Experience Luxury,
              <span className="block mt-1 sm:mt-2 text-gold-300 dark:text-gold-400">Share Your Elegance</span>
            </h1>
            
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-white/90 mb-5 sm:mb-8 md:mb-10 max-w-2xl mx-auto px-6 sm:px-4 leading-relaxed">
              Shop from certified luxury vendors, share your refined style, and connect with connoisseurs worldwide
            </p>

            {/* Quick Search Bar */}
            <div className="max-w-3xl mx-auto px-4">
              <form onSubmit={handleSearch} className="bg-white dark:bg-charcoal-800 rounded-2xl sm:rounded-full shadow-2xl dark:shadow-charcoal-950/50 p-2.5 sm:p-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  placeholder="Search luxury..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-3 sm:px-6 py-2.5 sm:py-3 text-charcoal-900 dark:text-white bg-transparent focus:outline-none rounded-xl sm:rounded-full text-sm sm:text-base placeholder:text-sm sm:placeholder:text-base placeholder-cool-gray-500 dark:placeholder-cool-gray-400"
                />
                <button 
                  type="submit"
                  className="px-5 sm:px-8 py-2.5 sm:py-3 bg-charcoal-900 dark:bg-gold-600 text-white rounded-xl sm:rounded-full font-semibold hover:bg-charcoal-800 dark:hover:bg-gold-700 active:scale-95 transition-all flex items-center justify-center gap-2 min-h-11 text-sm sm:text-base"
                >
                  <span className="text-base sm:text-lg">🔍</span>
                  <span>Search</span>
                </button>
              </form>
              
              {/* Quick Categories */}
              <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 md:gap-3 mt-3 sm:mt-4 md:mt-6">
                {['Women', 'Men', 'Accessories', 'Watches', 'Jewelry'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => handleCategoryClick(cat)}
                    className="px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-white/20 dark:bg-white/10 hover:bg-white/30 dark:hover:bg-white/20 active:bg-white/40 dark:active:bg-white/30 backdrop-blur-sm rounded-full text-xs sm:text-sm font-medium transition-all min-h-8 sm:min-h-9 touch-manipulation"
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stories Section */}
      {groupedStories.length > 0 && (
        <section className="bg-white dark:bg-charcoal-900 border-b border-cool-gray-200 dark:border-charcoal-800">
          <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
            <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
              {groupedStories.map((group) => (
                <button
                  key={group.author.id}
                  onClick={() => setActiveStory(group)}
                  className="shrink-0 text-center group touch-manipulation flex flex-col items-center"
                >
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 mb-1.5 sm:mb-2">
                    <div className="absolute inset-0 rounded-full bg-linear-to-tr from-gold-400 via-gold-600 to-gold-800 p-[2.5px] group-hover:from-gold-300 group-hover:to-gold-700 transition-all duration-200">
                      <div className="w-full h-full rounded-full bg-white dark:bg-charcoal-950 p-[2px]">
                        <div className="w-full h-full rounded-full overflow-hidden relative bg-charcoal-700">
                          {group.author.avatar ? (
                            <Image src={group.author.avatar} alt={group.author.username} fill className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm bg-gold-600">
                              {(group.author.name || group.author.username || '?')[0].toUpperCase()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Story count badge */}
                    {group.slides.length > 1 && (
                      <div className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-gold-600 border-2 border-white dark:border-charcoal-900 flex items-center justify-center shadow">
                        <span className="text-white text-[9px] font-bold">{group.slides.length}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] sm:text-xs text-charcoal-700 dark:text-cool-gray-300 truncate w-16 sm:w-20 group-hover:text-gold-600 dark:group-hover:text-gold-400 transition-colors">
                    {group.author.username || group.author.name}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {activeStory && <StoryViewer group={activeStory} onClose={() => setActiveStory(null)} />}

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12 md:py-16">

        {/* 1. Fashion Feed / Community Posts (Grid) */}
        <section className="mb-14 sm:mb-16 md:mb-20">
          <div className="flex items-start sm:items-center justify-between mb-6 md:mb-8 gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-charcoal-900 dark:text-white">{t('feed')}</h2>
              <p className="text-xs sm:text-sm md:text-base text-cool-gray-500 dark:text-cool-gray-400 mt-0.5 sm:mt-1 pr-2">{t('latest_posts')}</p>
            </div>
            <Link 
              href="/feed"
              className="text-gold-650 dark:text-gold-450 hover:text-gold-700 dark:hover:text-gold-550 font-semibold flex items-center gap-1 sm:gap-2 text-sm sm:text-base whitespace-nowrap touch-manipulation transition-colors"
            >
              <span>{t('view_all')}</span>
              <span>→</span>
            </Link>
          </div>

          {posts.length === 0 ? (
            <div className="text-center py-12 text-cool-gray-400 border border-dashed border-cool-gray-200 dark:border-charcoal-800 rounded-xl">
              <p className="text-4xl mb-3">📸</p>
              <p>No posts yet. Be the first to share your style!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 sm:gap-6">
              {posts.map((post) => {
                const postId = post.id || post._id;
                return (
                  <div key={postId || Math.random().toString()} className="bg-white dark:bg-charcoal-800 rounded-2xl overflow-hidden shadow-md dark:shadow-charcoal-950/50 hover:shadow-xl dark:hover:shadow-charcoal-950/70 border border-cool-gray-200/60 dark:border-charcoal-750 transition-shadow">
                    <button
                      onClick={() => postId && router.push(`/post/${postId}`)}
                      className="relative aspect-square w-full"
                    >
                      {post.images?.[0] ? (
                        <Image src={post.images[0]} alt={post.caption || 'Post'} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full bg-charcoal-100 dark:bg-charcoal-700 flex items-center justify-center text-4xl">🖼️</div>
                      )}
                    </button>
                    <div className="p-4">
                      <div className="flex items-center gap-2.5 mb-2.5">
                        {post.authorAvatar ? (
                          <Image src={post.authorAvatar} alt={post.authorName || 'Author'} width={32} height={32} className="w-7 h-7 sm:w-8 sm:h-8 rounded-full" />
                        ) : (
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gold-100 dark:bg-charcoal-750 flex items-center justify-center text-xs font-bold text-gold-600">
                            {(post.authorName || 'U').charAt(0)}
                          </div>
                        )}
                        <span className="font-semibold text-charcoal-900 dark:text-white text-sm">{post.authorName || 'Anonymous'}</span>
                      </div>
                      {post.caption && <p className="text-charcoal-700 dark:text-cool-gray-300 mb-3 text-sm line-clamp-2 leading-relaxed">{post.caption}</p>}
                      <div className="flex items-center gap-4 text-cool-gray-500 dark:text-cool-gray-400 text-xs font-medium">
                        <span className="flex items-center gap-1">❤️ <span>{post.likes ?? 0}</span></span>
                        <span className="flex items-center gap-1">💬 <span>{post.comments ?? 0}</span></span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 2. Popular Products (Slider) */}
        <section className="mb-14 sm:mb-16 md:mb-20">
          <div className="flex items-start sm:items-center justify-between mb-6 md:mb-8 gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-charcoal-900 dark:text-white">{t('popular_products')}</h2>
              <p className="text-xs sm:text-sm md:text-base text-cool-gray-500 dark:text-cool-gray-400 mt-0.5 sm:mt-1">Handpicked luxury releases and trending essentials</p>
            </div>
            <Link 
              href="/shop"
              className="text-gold-650 dark:text-gold-450 hover:text-gold-700 dark:hover:text-gold-550 font-semibold flex items-center gap-1 sm:gap-2 text-sm sm:text-base whitespace-nowrap touch-manipulation transition-colors"
            >
              <span>Shop All</span>
              <span>→</span>
            </Link>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-12 text-cool-gray-400 border border-dashed border-cool-gray-200 dark:border-charcoal-800 rounded-xl">
              <p className="text-4xl mb-3">🛒</p>
              <p>No products listed yet.</p>
            </div>
          ) : (
            <div className="relative group/slider">
              {/* Navigation Arrows */}
              <button 
                onClick={() => scrollContainer(productsRef, 'left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 dark:bg-charcoal-800/90 backdrop-blur-md border border-cool-gray-200 dark:border-charcoal-700 shadow-md hover:bg-white dark:hover:bg-charcoal-750 flex items-center justify-center transition-all opacity-0 group-hover/slider:opacity-100 -translate-x-2 pointer-events-auto active:scale-90"
                aria-label="Scroll Left"
              >
                <span className="text-charcoal-900 dark:text-white font-bold text-base">←</span>
              </button>
              <button 
                onClick={() => scrollContainer(productsRef, 'right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 dark:bg-charcoal-800/90 backdrop-blur-md border border-cool-gray-200 dark:border-charcoal-700 shadow-md hover:bg-white dark:hover:bg-charcoal-750 flex items-center justify-center transition-all opacity-0 group-hover/slider:opacity-100 translate-x-2 pointer-events-auto active:scale-90"
                aria-label="Scroll Right"
              >
                <span className="text-charcoal-900 dark:text-white font-bold text-base">→</span>
              </button>

              <div 
                ref={productsRef}
                className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 scroll-smooth snap-x snap-mandatory scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0"
              >
                {products.map((product) => (
                  <div key={product.id} className="snap-start shrink-0 w-[180px] sm:w-[220px]">
                    <div className="bg-white dark:bg-charcoal-800 rounded-xl overflow-hidden shadow-md dark:shadow-charcoal-950/50 hover:shadow-lg dark:hover:shadow-charcoal-950/70 border border-cool-gray-200/60 dark:border-charcoal-750 transition-all duration-300">
                      <Link
                        href={`/product/${product.id}`}
                        className="group/img relative aspect-square overflow-hidden w-full cursor-pointer touch-manipulation block"
                        aria-label={`View ${product.name}`}
                      >
                        {product.images?.[0] ? (
                          <Image
                            src={product.images[0]}
                            alt={product.name}
                            fill
                            sizes="(max-width: 640px) 50vw, 220px"
                            className="object-cover object-center group-hover/img:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full bg-charcoal-100 dark:bg-charcoal-700 flex items-center justify-center text-4xl">🖼️</div>
                        )}
                        {product.salePrice && product.salePrice < product.price && (
                          <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-red-650 text-white text-[10px] font-bold rounded shadow-sm">SALE</span>
                        )}
                        <div className="absolute top-2 right-2 flex flex-col gap-1.5 opacity-100 sm:opacity-0 sm:group-hover/img:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleAddToWishlist(product.id); }}
                            className="w-7 h-7 bg-white/95 dark:bg-charcoal-700/95 rounded-full flex items-center justify-center shadow-md hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors touch-manipulation text-xs"
                            aria-label="Add to wishlist"
                          >❤️</button>
                        </div>
                      </Link>
                      <div className="p-3">
                        <p className="text-[10px] text-cool-gray-400 dark:text-cool-gray-500 mb-0.5 truncate">{product.vendorName}</p>
                        <Link href={`/product/${product.id}`} className="block">
                          <h3 className="font-semibold text-xs sm:text-sm text-charcoal-900 dark:text-white mb-1 line-clamp-2 hover:text-gold-600 dark:group-hover:text-gold-400 transition-colors leading-snug h-8 sm:h-9">{product.name}</h3>
                        </Link>
                        <div className="flex items-center gap-1 mb-1 sm:mb-1.5">
                          <span className="text-yellow-500 text-[10px]">⭐</span>
                          <span className="text-[10px] font-medium text-charcoal-700 dark:text-cool-gray-300">{(product.rating ?? 0).toFixed(1)}</span>
                          <span className="text-[10px] text-cool-gray-500 dark:text-cool-gray-500">({product.salesCount ?? 0})</span>
                        </div>
                        <div className="flex items-center gap-1.5 mb-2.5">
                          <span className="font-bold text-sm text-charcoal-900 dark:text-white">{formatPrice(product.salePrice ?? product.price)}</span>
                          {product.salePrice && product.salePrice < product.price && (
                            <span className="text-[10px] text-cool-gray-450 dark:text-cool-gray-500 line-through">{formatPrice(product.price)}</span>
                          )}
                        </div>
                        <button
                          onClick={(e) => { e.preventDefault(); handleAddToCart(product.id); }}
                          className="w-full py-1.5 min-h-8 bg-gold-600 dark:bg-gold-600 text-white rounded-lg hover:bg-gold-700 dark:hover:bg-gold-700 active:scale-95 transition-all font-semibold text-[11px] touch-manipulation"
                        >{t('add_to_cart')}</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* 3. Featured Brands (Slider) */}
        <section className="mb-14 sm:mb-16 md:mb-20">
          <div className="flex items-start sm:items-center justify-between mb-6 md:mb-8 gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-charcoal-900 dark:text-white">Featured Brands</h2>
              <p className="text-xs sm:text-sm md:text-base text-cool-gray-500 dark:text-cool-gray-400 mt-0.5 sm:mt-1">Shop from official brand stores and authorized retailers</p>
            </div>
            <Link 
              href="/brands"
              className="text-gold-650 dark:text-gold-450 hover:text-gold-700 dark:hover:text-gold-550 font-semibold flex items-center gap-1 sm:gap-2 text-sm sm:text-base whitespace-nowrap touch-manipulation transition-colors"
            >
              <span>View All</span>
              <span>→</span>
            </Link>
          </div>

          {brands.length === 0 ? (
            <div className="text-center py-12 text-cool-gray-400 border border-dashed border-cool-gray-200 dark:border-charcoal-800 rounded-xl">
              <p className="text-4xl mb-3">🏷️</p>
              <p>No brands registered yet. <Link href="/become-brand" className="text-gold-600 hover:underline">Register yours!</Link></p>
            </div>
          ) : (
            <div className="relative group/slider">
              {/* Navigation Arrows */}
              <button 
                onClick={() => scrollContainer(brandsRef, 'left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 dark:bg-charcoal-800/90 backdrop-blur-md border border-cool-gray-200 dark:border-charcoal-700 shadow-md hover:bg-white dark:hover:bg-charcoal-750 flex items-center justify-center transition-all opacity-0 group-hover/slider:opacity-100 -translate-x-2 pointer-events-auto active:scale-90"
                aria-label="Scroll Left"
              >
                <span className="text-charcoal-900 dark:text-white font-bold text-base">←</span>
              </button>
              <button 
                onClick={() => scrollContainer(brandsRef, 'right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 dark:bg-charcoal-800/90 backdrop-blur-md border border-cool-gray-200 dark:border-charcoal-700 shadow-md hover:bg-white dark:hover:bg-charcoal-750 flex items-center justify-center transition-all opacity-0 group-hover/slider:opacity-100 translate-x-2 pointer-events-auto active:scale-90"
                aria-label="Scroll Right"
              >
                <span className="text-charcoal-900 dark:text-white font-bold text-base">→</span>
              </button>

              <div 
                ref={brandsRef}
                className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 scroll-smooth snap-x snap-mandatory scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0"
              >
                {brands.map((brand) => {
                  const brandProductImage = getBrandProductPreview(brand.name);
                  const displayBanner = brand.banner || brandProductImage;
                  const displayAvatar = brand.avatar || brandProductImage;

                  return (
                    <div key={brand.id} className="snap-start shrink-0 w-[260px] sm:w-[320px]">
                      <Link
                        href={`/brand/${brand.id}`}
                        className="group block bg-white dark:bg-charcoal-800 rounded-2xl overflow-hidden shadow-md dark:shadow-charcoal-950/50 hover:shadow-xl dark:hover:shadow-charcoal-950/70 border border-cool-gray-200/60 dark:border-charcoal-750/70 hover:border-gold-500/50 dark:hover:border-gold-600/50 transition-all duration-300"
                      >
                        <div className="relative h-28 sm:h-36 bg-linear-to-br from-gold-900/20 to-charcoal-800 flex items-center justify-center overflow-hidden">
                          {displayBanner ? (
                            <>
                              <Image src={displayBanner} alt={brand.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                              <div className="absolute inset-0 bg-black/30" />
                            </>
                          ) : (
                            <div className="absolute inset-0 bg-linear-to-br from-gold-900/20 to-charcoal-800" />
                          )}
                          <div className="absolute top-3 right-3 z-10 px-2 py-0.5 bg-blue-600/90 text-white text-[10px] font-bold rounded-full flex items-center gap-1 shadow-sm">
                            <span>✓</span><span>Official</span>
                          </div>
                          {displayAvatar ? (
                            <Image src={displayAvatar} alt={brand.name} width={80} height={80} className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover border-4 border-white dark:border-charcoal-800 shadow-md relative z-10 transition-transform group-hover:scale-105" />
                          ) : (
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-white dark:bg-charcoal-700 flex items-center justify-center text-2xl sm:text-3xl font-bold text-gold-600 border-4 border-white dark:border-charcoal-700 shadow-md relative z-10">
                              {brand.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="p-4 sm:p-5">
                          <h3 className="font-display font-bold text-base text-charcoal-900 dark:text-white mb-1 group-hover:text-gold-600 dark:group-hover:text-gold-400 transition-colors truncate">{brand.name}</h3>
                          {brand.bio ? (
                            <p className="text-xs text-cool-gray-500 dark:text-cool-gray-400 mb-3 line-clamp-2 h-8 leading-relaxed">{brand.bio}</p>
                          ) : (
                            <div className="h-8" />
                          )}
                          <div className="flex items-center gap-1.5 text-xs text-cool-gray-550 dark:text-cool-gray-450 mt-1">
                            <span>📦</span>
                            <span className="font-semibold text-charcoal-900 dark:text-white">{brand.products}</span>
                            <span>products</span>
                          </div>
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* 4. Editorial Categories Grid */}
        <section className="mb-14 sm:mb-16 md:mb-20">
          <div className="mb-6 md:mb-8">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-charcoal-900 dark:text-white mb-1">Shop by Category</h2>
            <p className="text-xs sm:text-sm md:text-base text-cool-gray-500 dark:text-cool-gray-405">Discover premium collections structured for your lifestyle</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[
              { name: "Women's Fashion", icon: '👗', color: 'from-pink-500 to-rose-500' },
              { name: "Men's Fashion", icon: '👔', color: 'from-blue-500 to-indigo-500' },
              { name: 'Accessories', icon: '👜', color: 'from-purple-500 to-pink-500' },
              { name: 'Footwear', icon: '👟', color: 'from-orange-500 to-red-500' },
            ].map((category) => {
              const img = getCategoryImage(category.name);
              return (
                <Link
                  key={category.name}
                  href={`/shop?category=${category.name}`}
                  className="group relative overflow-hidden rounded-xl h-32 sm:h-40 md:h-48 flex items-center justify-center touch-manipulation shadow-md"
                >
                  {img ? (
                    <>
                      <Image
                        src={img}
                        alt={category.name}
                        fill
                        sizes="(max-width: 768px) 50vw, 25vw"
                        className="absolute inset-0 object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors duration-300" />
                    </>
                  ) : (
                    <div className={`absolute inset-0 bg-linear-to-br ${category.color} group-hover:scale-105 transition-transform duration-550`} />
                  )}
                  <div className="relative z-10 text-center text-white px-2">
                    <div className="text-3xl sm:text-4xl md:text-5xl mb-1.5 sm:mb-2">{category.icon}</div>
                    <div className="font-display font-bold text-sm sm:text-base md:text-lg leading-tight">{category.name}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* 5. Top Curated Vendors (Slider) */}
        <section className="mb-14 sm:mb-16 md:mb-20">
          <div className="flex items-start sm:items-center justify-between mb-6 md:mb-8 gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-charcoal-900 dark:text-white">{t('top_vendors')}</h2>
              <p className="text-xs sm:text-sm md:text-base text-cool-gray-500 dark:text-cool-gray-400 mt-0.5 sm:mt-1">Shop verified curators and trusted boutiques worldwide</p>
            </div>
            <Link 
              href="/vendors"
              className="text-gold-650 dark:text-gold-450 hover:text-gold-700 dark:hover:text-gold-550 font-semibold flex items-center gap-1 sm:gap-2 text-sm sm:text-base whitespace-nowrap touch-manipulation transition-colors"
            >
              <span>{t('explore_all')}</span>
              <span>→</span>
            </Link>
          </div>

          {vendors.length === 0 ? (
            <div className="text-center py-12 text-cool-gray-400 border border-dashed border-cool-gray-200 dark:border-charcoal-800 rounded-xl">
              <p className="text-4xl mb-3">🏪</p>
              <p>No vendors yet. <Link href="/become-vendor" className="text-gold-600 hover:underline">Be the first!</Link></p>
            </div>
          ) : (
            <div className="relative group/slider">
              {/* Navigation Arrows */}
              <button 
                onClick={() => scrollContainer(vendorsRef, 'left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 dark:bg-charcoal-800/90 backdrop-blur-md border border-cool-gray-200 dark:border-charcoal-700 shadow-md hover:bg-white dark:hover:bg-charcoal-750 flex items-center justify-center transition-all opacity-0 group-hover/slider:opacity-100 -translate-x-2 pointer-events-auto active:scale-90"
                aria-label="Scroll Left"
              >
                <span className="text-charcoal-900 dark:text-white font-bold text-base">←</span>
              </button>
              <button 
                onClick={() => scrollContainer(vendorsRef, 'right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 dark:bg-charcoal-800/90 backdrop-blur-md border border-cool-gray-200 dark:border-charcoal-700 shadow-md hover:bg-white dark:hover:bg-charcoal-750 flex items-center justify-center transition-all opacity-0 group-hover/slider:opacity-100 translate-x-2 pointer-events-auto active:scale-90"
                aria-label="Scroll Right"
              >
                <span className="text-charcoal-900 dark:text-white font-bold text-base">→</span>
              </button>

              <div 
                ref={vendorsRef}
                className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 scroll-smooth snap-x snap-mandatory scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0"
              >
                {vendors.map((vendor) => (
                  <div key={vendor.id} className="snap-start shrink-0 w-[220px] sm:w-[260px]">
                    <Link
                      href={`/vendors/${vendor.id}`}
                      className="group block bg-white dark:bg-charcoal-800 rounded-2xl overflow-hidden shadow-md dark:shadow-charcoal-950/50 border border-cool-gray-200/60 dark:border-charcoal-750 hover:border-gold-500/50 dark:hover:border-gold-600/50 transition-all duration-300"
                    >
                      <div className="relative h-20 bg-linear-to-br from-purple-900/20 to-charcoal-700 flex items-center justify-center overflow-hidden shrink-0">
                        {vendor.banner ? (
                          <>
                            <Image src={vendor.banner} alt={vendor.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                            <div className="absolute inset-0 bg-black/20" />
                          </>
                        ) : (
                          <div className="absolute inset-0 bg-linear-to-br from-purple-900/20 to-charcoal-700" />
                        )}
                      </div>

                      <div className="p-4 sm:p-5 flex-1 flex flex-col -mt-8 relative z-10 items-center text-center">
                        {vendor.avatar ? (
                          <Image src={vendor.avatar} alt={vendor.name} width={64} height={64} className="w-14 h-14 rounded-full shrink-0 object-cover border-2 border-white dark:border-charcoal-800 shadow-md group-hover:scale-105 transition-transform" />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-gold-100 dark:bg-charcoal-750 flex items-center justify-center text-lg font-bold text-gold-650 shrink-0 border-2 border-white dark:border-charcoal-800 shadow-md">
                            {vendor.name.charAt(0)}
                          </div>
                        )}
                        <div className="mt-2.5 mb-1 flex items-center gap-1">
                          <h3 className="font-display font-bold text-sm sm:text-base text-charcoal-900 dark:text-white truncate max-w-[140px]">{vendor.name}</h3>
                          <span className="text-blue-500 text-xs" title="Verified Vendor">✓</span>
                        </div>
                        <p className="text-[10px] sm:text-xs text-cool-gray-500 dark:text-cool-gray-400 line-clamp-1 h-4 mb-2">{vendor.bio || 'Curated luxury boutique'}</p>
                        <span className="text-[11px] font-semibold text-gold-650 dark:text-gold-450 bg-gold-500/10 dark:bg-gold-500/5 px-2.5 py-0.5 rounded-full mt-1">
                          {vendor.products} products
                        </span>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* 6. Statistics / Trust Section */}
        <section className="mb-14 sm:mb-16 md:mb-20">
          <div className="bg-linear-to-r from-gold-600 to-gold-700 dark:from-gold-700 dark:to-gold-800 rounded-2xl p-8 sm:p-12 text-white shadow-lg dark:shadow-charcoal-950/50">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 text-center">
              <div>
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1.5">2,500+</div>
                <div className="text-white/80 dark:text-white/70 text-xs sm:text-sm">Active Vendors</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1.5">50K+</div>
                <div className="text-white/80 dark:text-white/70 text-xs sm:text-sm">Fashion Products</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1.5">100K+</div>
                <div className="text-white/80 dark:text-white/70 text-xs sm:text-sm">Happy Customers</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1.5">4.8★</div>
                <div className="text-white/80 dark:text-white/70 text-xs sm:text-sm">Average Rating</div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section — hidden for authenticated users */}
        {!user && (
          <section>
            <div className="bg-white dark:bg-charcoal-800 rounded-2xl shadow-xl dark:shadow-charcoal-950/50 p-8 sm:p-12 text-center border border-cool-gray-150 dark:border-charcoal-750">
              <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-display font-bold text-charcoal-900 dark:text-white mb-3 md:mb-4 leading-tight">
                Start Your Fashion Business Today
              </h2>
              <p className="text-sm sm:text-base md:text-lg text-cool-gray-500 dark:text-cool-gray-400 mb-8 max-w-2xl mx-auto px-2">
                Join thousands of vendors selling on our platform. Easy setup, powerful tools, and reach thousands of customers.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                <Link 
                  href="/auth/signup?role=vendor"
                  className="px-6 sm:px-8 py-3.5 bg-charcoal-800 dark:bg-charcoal-700 text-white rounded-xl font-semibold hover:bg-charcoal-900 dark:hover:bg-charcoal-600 active:scale-95 transition-all shadow-md text-sm sm:text-base touch-manipulation"
                >
                  Become a Vendor
                </Link>
                <Link 
                  href="/auth/signup?role=customer"
                  className="px-6 sm:px-8 py-3.5 bg-gold-600 dark:bg-gold-600 text-white rounded-xl font-semibold hover:bg-gold-700 dark:hover:bg-gold-700 active:scale-95 transition-all shadow-md text-sm sm:text-base touch-manipulation"
                >
                  Start Shopping
                </Link>
              </div>
            </div>
          </section>
        )}
      </div>

      <Footer />
    </div>
  );
}
