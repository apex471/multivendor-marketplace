import Image from 'next/image';
import Link from 'next/link';
import type { Post } from '../../types';

interface PostCardProps {
  post: Post;
  onLike?: (postId: string) => void;
  onComment?: (postId: string) => void;
  onShare?: (postId: string) => void;
}

export default function PostCard({ post, onLike, onComment, onShare }: PostCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden mb-4">
      {/* Post Header */}
      <div className="p-4 flex items-center justify-between">
        <Link href={`/profile/${post.authorId}`} className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
            {post.author.avatar ? (
              <Image
                src={post.author.avatar}
                alt={post.author.username}
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-lg">
                👤
              </div>
            )}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{post.author.username}</p>
            <p className="text-xs text-gray-500">
              {new Date(post.createdAt).toLocaleDateString()}
            </p>
          </div>
        </Link>
        <button className="text-gray-600 hover:text-gray-900">
          ⋯
        </button>
      </div>

      {/* Post Images */}
      {post.images.length > 0 && (
        <div className="relative aspect-square bg-gray-100">
          <Image
            src={post.images[0]}
            alt="Post image"
            fill
            className="object-cover"
          />
          {post.images.length > 1 && (
            <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 text-white text-xs rounded">
              1/{post.images.length}
            </div>
          )}
        </div>
      )}

      {/* Post Actions */}
      <div className="p-4">
        <div className="flex items-center gap-4 mb-3">
          <button
            onClick={() => onLike?.(post.id)}
            className={`flex items-center gap-1 transition-colors ${
              post.isLiked ? 'text-red-600' : 'text-gray-700 hover:text-red-600'
            }`}
          >
            <span className="text-2xl">{post.isLiked ? '❤️' : '🤍'}</span>
            <span className="font-semibold">{post.likes}</span>
          </button>
          <button
            onClick={() => onComment?.(post.id)}
            className="flex items-center gap-1 text-gray-700 hover:text-primary-600 transition-colors"
          >
            <span className="text-2xl">💬</span>
            <span className="font-semibold">{post.comments}</span>
          </button>
          <button
            onClick={() => onShare?.(post.id)}
            className="flex items-center gap-1 text-gray-700 hover:text-primary-600 transition-colors"
          >
            <span className="text-2xl">📤</span>
            <span className="font-semibold">{post.shares}</span>
          </button>
          <button
            className={`ml-auto text-2xl transition-colors ${
              post.isSaved ? 'text-primary-600' : 'text-gray-700 hover:text-primary-600'
            }`}
          >
            {post.isSaved ? '🔖' : '🏷️'}
          </button>
        </div>

        {/* Caption */}
        <div className="mb-2">
          <p className="text-gray-900">
            <Link href={`/profile/${post.authorId}`} className="font-semibold hover:underline">
              {post.author.username}
            </Link>{' '}
            <span className="text-gray-700">{post.caption}</span>
          </p>
        </div>

        {/* Hashtags */}
        {post.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {post.hashtags.map((hashtag: string, index: number) => (
              <Link
                key={index}
                href={`/explore/tags/${hashtag}`}
                className="text-primary-600 hover:underline text-sm"
              >
                #{hashtag}
              </Link>
            ))}
          </div>
        )}

        {/* Tagged Products */}
        {post.taggedProducts && post.taggedProducts.length > 0 && (
          <button className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1">
            <span>🏷️</span>
            <span>View products in this post</span>
          </button>
        )}
      </div>
    </div>
  );
}
