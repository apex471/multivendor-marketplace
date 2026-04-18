'use client';

import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';

interface Comment {
  id: string;
  user: { username: string; name: string; avatar: string; verified: boolean };
  text: string;
  likes: number;
  timestamp: string;
  replies?: Comment[];
}

interface PostData {
  id: string;
  image: string;
  caption: string;
  user: { username: string; fullName: string; avatar: string; verified: boolean };
  location: string;
  timestamp: string;
  likes: number;
  commentsCount: number;
  tags: string[];
}

export default function PostDetailPage() {
  const params = useParams();
  const postId = params.id as string;
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [post, setPost] = useState<PostData | null>(null);

  useEffect(() => {
    fetch(`/api/posts/${postId}`)
      .then(r => r.json())
      .then(json => {
        if (!json.success || !json.data?.post) return;
        const p = json.data.post;
        setPost({
          id:            p.id,
          image:         p.images?.[0] ?? 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800',
          caption:       p.content,
          user: {
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
      });
  }, [postId]);

  const handleLike = async () => {
    const token = localStorage.getItem('auth_token');
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

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    const token = localStorage.getItem('auth_token');
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
        user:      { username: c.user.username, name: c.user.name, avatar: c.user.avatar ?? '', verified: c.user.verified },
        text:      c.text,
        likes:     0,
        timestamp: 'Just now',
      }, ...prev]);
      setCommentText('');
    }
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
              <div className="flex flex-col h-[600px]">
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
                          <Image
                            src={comment.user.avatar}
                            alt={comment.user.username}
                            width={32}
                            height={32}
                            className="rounded-full"
                          />
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
                            <button className="hover:text-gold-600 transition-colors font-medium">
                              Reply
                            </button>
                          </div>
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
                                <Image
                                  src={reply.user.avatar}
                                  alt={reply.user.username}
                                  width={28}
                                  height={28}
                                  className="rounded-full"
                                />
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
                        <button className="text-2xl text-charcoal-700 hover:text-gold-600 transition-colors">
                          📤
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }, (_, i) => (
                <Link
                  key={i}
                  href={`/post/${i + 100}`}
                  className="group relative aspect-square overflow-hidden rounded-lg bg-gray-200"
                >
                  <Image
                    src={`https://images.unsplash.com/photo-${1551028719 + i}00167b16eac5?w=400`}
                    alt={`Post ${i + 1}`}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform"
                  />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
