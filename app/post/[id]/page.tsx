'use client';

import { getAuthToken } from '@/lib/api/auth';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';

interface Comment {
  id: string;
  user: { username: string; name: string; avatar: string | null; verified: boolean };
  text: string;
  likes: number;
  timestamp: string;
  replies?: Comment[];
}

interface PostData {
  id: string;
  image: string;
  caption: string;
  user: { id: string; username: string; fullName: string; avatar: string; verified: boolean };
  location: string;
  timestamp: string;
  likes: number;
  commentsCount: number;
  tags: string[];
}

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [post, setPost] = useState<PostData | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});

  useEffect(() => {
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    fetch(`/api/posts/${postId}`, { headers })
      .then(r => r.json())
      .then(json => {
        if (!json.success || !json.data?.post) return;
        const p = json.data.post;
        setPost({
          id:            p.id,
          image:         p.images?.[0] ?? 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800',
          caption:       p.content,
          user: {
            id:       String(p.author.id),
            username:  p.author.username,
            fullName:  p.author.name,
            avatar:    p.author.avatar ?? `https://i.pravatar.cc/150?u=${p.author.id}`,
            verified:  p.author.verified,
          },
          location:      '',
          timestamp:     new Date(p.createdAt).toLocaleDateString(),
          likes:         p.likes,
          commentsCount: p.comments,
          tags:          p.hashtags ?? [],
        });
        setLikesCount(p.likes);
        setIsLiked(p.liked ?? false);
      });

    // Load persisted comments from API
    fetch(`/api/posts/${postId}/comment?limit=20`, { headers })
      .then(r => r.json())
      .then(json => {
        if (!json.success) return;
        setComments((json.data.comments ?? []).map((c: {
          id: string; authorName: string; authorAvatar: string | null;
          text: string; likes: number; createdAt: string;
        }) => ({
          id:        c.id,
          user: {
            username: c.authorName.toLowerCase().replace(/\s/g, ''),
            name:     c.authorName,
            avatar:   c.authorAvatar ?? null,
            verified: false,
          },
          text:      c.text,
          likes:     c.likes,
          timestamp: new Date(c.createdAt).toLocaleDateString(),
        })));
      })
      .catch(() => {});
  }, [postId]);

  const handleLike = async () => {
    const token = getAuthToken();
    if (!token) { alert('Please log in to like posts'); return; }
    const action = isLiked ? 'unlike' : 'like';
    const res = await fetch(`/api/posts/${postId}/like`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    const json = await res.json();
    if (json.success) { setIsLiked(!isLiked); setLikesCount(json.data.likes); }
  };

  const handleSave = () => {
    setIsSaved(!isSaved);
  };

  const handleSharePost = async () => {
    setShowShareModal(true);
    const token = getAuthToken();
    if (token) {
      await fetch(`/api/posts/${postId}/share`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
  };

  const handleDMAuthor = async () => {
    const token = getAuthToken();
    if (!token) { router.push('/auth/login'); return; }
    if (!post) return;
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: post.user.id }),
      });
      const json = await res.json();
      if (json.success) router.push('/messages');
    } catch { router.push('/messages'); }
  };

  const handleReplySubmit = async (commentId: string) => {
    const text = (replyTexts[commentId] ?? '').trim();
    if (!text) return;
    const token = getAuthToken();
    if (!token) { router.push('/auth/login'); return; }
    await fetch(`/api/posts/${postId}/comment`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    }).catch(() => {});
    setReplyTexts(prev => ({ ...prev, [commentId]: '' }));
    setReplyingTo(null);
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    const token = getAuthToken();
    if (!token) { alert('Please log in to comment'); return; }
    const res = await fetch(`/api/posts/${postId}/comment`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: commentText }),
    });
    const json = await res.json();
    if (json.success) {
      const c = json.data;
      setComments(prev => [{
        id:        c.id,
        user:      {
          username: c.authorName?.toLowerCase().replace(/\s/g, '') ?? 'user',
          name:     c.authorName ?? 'User',
          avatar:   c.authorAvatar ?? null,
          verified: false,
        },
        text:      c.text,
        likes:     0,
        timestamp: 'Just now',
      }, ...prev]);
      setCommentText('');
    }
  };

  // Avatar helper — real image or gradient initials fallback
  const CommentAvatar = ({ src, name, size = 32 }: { src: string | null; name: string; size?: number }) => {
    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    if (src) return <Image src={src} alt={name} width={size} height={size} className="rounded-full object-cover" unoptimized />;
    return (
      <div style={{ width: size, height: size, fontSize: size * 0.38 }} className="rounded-full bg-linear-to-br from-gold-400 to-gold-600 flex items-center justify-center text-white font-semibold shrink-0">
        {initials}
      </div>
    );
  };

  if (!post) {
    return (
      <div className="min-h-screen bg-white dark:bg-charcoal-900 flex items-center justify-center">
        <p className="text-charcoal-600 dark:text-cool-gray-400">Loading post...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      <Header />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="grid lg:grid-cols-2">
              {/* Image Section */}
              <div className="relative bg-charcoal-900 aspect-square lg:aspect-auto">
                <Image
                  src={post.image}
                  alt={post.caption}
                  fill
                  className="object-cover"
                  priority
                />
              </div>

              {/* Content Section */}
              <div className="flex flex-col h-150">
                {/* Post Header */}
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <Link href={`/profile/${post.user.username}`} className="flex items-center gap-3 hover:opacity-80">
                      <Image
                        src={post.user.avatar}
                        alt={post.user.fullName}
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-charcoal-900">{post.user.username}</span>
                          {post.user.verified && (
                            <span className="text-blue-600">✓</span>
                          )}
                        </div>
                        {post.location && (
                          <p className="text-sm text-charcoal-600">📍 {post.location}</p>
                        )}
                      </div>
                    </Link>
                    <button className="text-charcoal-700 hover:text-gold-600 transition-colors text-2xl">
                      •••
                    </button>
                  </div>
                </div>

                {/* Comments Section - Scrollable */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Caption as first comment */}
                  <div className="flex gap-3">
                    <Link href={`/profile/${post.user.username}`}>
                      <Image
                        src={post.user.avatar}
                        alt={post.user.fullName}
                        width={32}
                        height={32}
                        className="rounded-full"
                      />
                    </Link>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Link href={`/profile/${post.user.username}`} className="font-semibold text-charcoal-900 hover:text-gold-600">
                          {post.user.username}
                        </Link>
                        <span className="text-sm text-charcoal-600">{post.timestamp}</span>
                      </div>
                      <p className="text-charcoal-900 mb-2">{post.caption}</p>
                      {post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {post.tags.map((tag) => (
                            <Link
                              key={tag}
                              href={`/explore?tag=${tag}`}
                              className="text-gold-600 hover:text-gold-700 font-medium"
                            >
                              #{tag}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Comments */}
                  {comments.map((comment) => (
                    <div key={comment.id}>
                      <div className="flex gap-3">
                        <Link href={`/profile/${comment.user.username}`}>
                          <CommentAvatar src={comment.user.avatar} name={comment.user.name} size={32} />
                        </Link>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Link href={`/profile/${comment.user.username}`} className="font-semibold text-charcoal-900 hover:text-gold-600">
                              {comment.user.username}
                            </Link>
                            {comment.user.verified && (
                              <span className="text-blue-600">✓</span>
                            )}
                            <span className="text-sm text-charcoal-600">{comment.timestamp}</span>
                          </div>
                          <p className="text-charcoal-900 mb-2">{comment.text}</p>
                          <div className="flex items-center gap-4 text-sm text-charcoal-600">
                            <button className="hover:text-gold-600 transition-colors font-medium">
                              {comment.likes > 0 && `${comment.likes} likes`}
                            </button>
                            <button
                              onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                              className="hover:text-gold-600 transition-colors font-medium"
                            >
                              Reply
                            </button>
                          </div>
                          {replyingTo === comment.id && (
                            <div className="flex gap-2 mt-2">
                              <input
                                type="text"
                                value={replyTexts[comment.id] ?? ''}
                                onChange={e => setReplyTexts(prev => ({ ...prev, [comment.id]: e.target.value }))}
                                onKeyDown={e => e.key === 'Enter' && handleReplySubmit(comment.id)}
                                placeholder={`Reply to ${comment.user.username}...`}
                                className="flex-1 text-sm px-3 py-1.5 border border-cool-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gold-600"
                              />
                              <button
                                onClick={() => handleReplySubmit(comment.id)}
                                disabled={!(replyTexts[comment.id] ?? '').trim()}
                                className="px-3 py-1.5 bg-gold-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                              >
                                Post
                              </button>
                            </div>
                          )}
                        </div>
                        <button className="text-charcoal-600 hover:text-red-600 transition-colors">
                          ❤️
                        </button>
                      </div>

                      {/* Replies */}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="ml-11 mt-3 space-y-3">
                          {comment.replies.map((reply) => (
                            <div key={reply.id} className="flex gap-3">
                              <Link href={`/profile/${reply.user.username}`}>
                                <CommentAvatar src={reply.user.avatar} name={reply.user.name} size={28} />
                              </Link>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Link href={`/profile/${reply.user.username}`} className="font-semibold text-sm text-charcoal-900 hover:text-gold-600">
                                    {reply.user.username}
                                  </Link>
                                  <span className="text-xs text-charcoal-600">{reply.timestamp}</span>
                                </div>
                                <p className="text-sm text-charcoal-900">{reply.text}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="border-t border-gray-200">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={handleLike}
                          className={`text-2xl transition-transform hover:scale-110 ${
                            isLiked ? 'text-red-600' : 'text-charcoal-700 hover:text-red-600'
                          }`}
                        >
                          {isLiked ? '❤️' : '🤍'}
                        </button>
                        <button className="text-2xl text-charcoal-700 hover:text-gold-600 transition-colors">
                          💬
                        </button>
                        <button onClick={handleSharePost} className="text-2xl text-charcoal-700 hover:text-gold-600 transition-colors">
                          🔁
                        </button>
                        <button onClick={handleDMAuthor} className="text-2xl text-charcoal-700 hover:text-blue-600 transition-colors" title="Send DM">
                          ✉️
                        </button>
                      </div>
                      <button
                        onClick={handleSave}
                        className={`text-2xl transition-transform hover:scale-110 ${
                          isSaved ? 'text-gold-600' : 'text-charcoal-700 hover:text-gold-600'
                        }`}
                      >
                        {isSaved ? '🔖' : '📑'}
                      </button>
                    </div>
                    <p className="font-semibold text-charcoal-900 mb-2">{likesCount.toLocaleString()} likes</p>
                  </div>

                  {/* Add Comment */}
                  <form onSubmit={handleComment} className="border-t border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Add a comment..."
                        className="flex-1 outline-none text-charcoal-900 placeholder:text-charcoal-400"
                      />
                      <button
                        type="submit"
                        disabled={!commentText.trim()}
                        className={`font-semibold ${
                          commentText.trim()
                            ? 'text-gold-600 hover:text-gold-700'
                            : 'text-charcoal-400 cursor-not-allowed'
                        }`}
                      >
                        Post
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>

          {/* Related Posts */}
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-charcoal-900 mb-6">More from {post.user.username}</h2>
            <p className="text-charcoal-600 text-sm">Visit their <Link href={`/profile/${post.user.username}`} className="text-gold-600 hover:underline">profile</Link> to see more posts.</p>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={() => setShowShareModal(false)}>
          <div className="bg-white dark:bg-charcoal-800 w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-charcoal-900 dark:text-white mb-2">Share Post</h3>
            <p className="text-sm text-charcoal-600 dark:text-cool-gray-400 mb-4 line-clamp-2">{post.caption}</p>
            <div className="space-y-3">
              <button
                onClick={() => { navigator.clipboard.writeText(window.location.href); setShowShareModal(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-cool-gray-200 dark:border-charcoal-700 hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 transition-colors"
              >
                <span className="text-2xl">🔗</span>
                <div className="text-left">
                  <p className="font-semibold text-charcoal-900 dark:text-white text-sm">Copy Link</p>
                  <p className="text-xs text-charcoal-500 dark:text-cool-gray-400">Copy post URL to clipboard</p>
                </div>
              </button>
              <button
                onClick={handleDMAuthor}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-cool-gray-200 dark:border-charcoal-700 hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 transition-colors"
              >
                <span className="text-2xl">💬</span>
                <div className="text-left">
                  <p className="font-semibold text-charcoal-900 dark:text-white text-sm">Send DM to Author</p>
                  <p className="text-xs text-charcoal-500 dark:text-cool-gray-400">Open a direct message</p>
                </div>
              </button>
            </div>
            <button onClick={() => setShowShareModal(false)} className="mt-4 w-full py-3 text-charcoal-600 dark:text-cool-gray-400 font-semibold text-sm hover:text-charcoal-900 dark:hover:text-white">Cancel</button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
