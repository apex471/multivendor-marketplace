'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';

interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'order' | 'product';
  user?: {
    username: string;
    avatar: string;
  };
  text: string;
  timestamp: string;
  isRead: boolean;
  link?: string;
  image?: string;
}

export default function NotificationsPage() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'like',
      user: {
        username: 'fashion_lover',
        avatar: 'https://i.pravatar.cc/150?u=lover',
      },
      text: 'liked your post',
      timestamp: '5 minutes ago',
      isRead: false,
      link: '/post/123',
      image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=200',
    },
    {
      id: '2',
      type: 'comment',
      user: {
        username: 'trendsetter_jane',
        avatar: 'https://i.pravatar.cc/150?u=jane',
      },
      text: 'commented on your post: "Love this outfit! 😍"',
      timestamp: '1 hour ago',
      isRead: false,
      link: '/post/123',
      image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=200',
    },
    {
      id: '3',
      type: 'follow',
      user: {
        username: 'style_maven',
        avatar: 'https://i.pravatar.cc/150?u=maven',
      },
      text: 'started following you',
      timestamp: '2 hours ago',
      isRead: false,
      link: '/profile/style_maven',
    },
    {
      id: '4',
      type: 'order',
      text: 'Your order #ORD-12345 has been shipped! Track your package now.',
      timestamp: '3 hours ago',
      isRead: true,
      link: '/order/ORD-12345',
    },
    {
      id: '5',
      type: 'mention',
      user: {
        username: 'fashion_guru',
        avatar: 'https://i.pravatar.cc/150?u=guru',
      },
      text: 'mentioned you in a comment',
      timestamp: '5 hours ago',
      isRead: true,
      link: '/post/456',
      image: 'https://images.unsplash.com/photo-1551028720-00167b16eac5?w=200',
    },
    {
      id: '6',
      type: 'product',
      text: '🔥 Flash Sale Alert! Get 50% off on selected items. Sale ends in 6 hours!',
      timestamp: '6 hours ago',
      isRead: true,
      link: '/shop?sale=true',
    },
    {
      id: '7',
      type: 'like',
      user: {
        username: 'chic_boutique',
        avatar: 'https://i.pravatar.cc/150?u=chic',
      },
      text: 'and 47 others liked your post',
      timestamp: '1 day ago',
      isRead: true,
      link: '/post/789',
      image: 'https://images.unsplash.com/photo-1551028721-00167b16eac5?w=200',
    },
    {
      id: '8',
      type: 'order',
      text: 'Your order #ORD-12344 has been delivered! Rate your experience.',
      timestamp: '2 days ago',
      isRead: true,
      link: '/order/ORD-12344',
    },
  ]);

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.isRead)
    : notifications;

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, isRead: true } : n
    ));
    console.log('Marked notification as read:', id);
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    console.log('Marked all notifications as read');
  };

  const deleteNotification = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id));
    console.log('Deleted notification:', id);
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'like':
        return '❤️';
      case 'comment':
        return '💬';
      case 'follow':
        return '👤';
      case 'mention':
        return '@';
      case 'order':
        return '📦';
      case 'product':
        return '🛍️';
      default:
        return '🔔';
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      <Header />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-charcoal-900">Notifications</h1>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-gold-600 hover:text-gold-700 font-semibold text-sm"
                >
                  Mark all as read
                </button>
              )}
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  filter === 'all'
                    ? 'bg-gold-600 text-white'
                    : 'bg-gray-100 text-charcoal-700 hover:bg-gray-200'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  filter === 'unread'
                    ? 'bg-gold-600 text-white'
                    : 'bg-gray-100 text-charcoal-700 hover:bg-gray-200'
                }`}
              >
                Unread ({unreadCount})
              </button>
            </div>
          </div>

          {/* Notifications List */}
          {filteredNotifications.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <div className="text-6xl mb-4">🔔</div>
              <h3 className="text-xl font-bold text-charcoal-900 mb-2">
                {filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
              </h3>
              <p className="text-charcoal-600 mb-6">
                {filter === 'unread' 
                  ? "You've read all your notifications"
                  : "When you get notifications, they'll show up here"}
              </p>
              {filter === 'unread' && (
                <button
                  onClick={() => setFilter('all')}
                  className="px-6 py-2 bg-gold-600 text-white rounded-lg font-semibold hover:bg-gold-700 transition-colors"
                >
                  View All Notifications
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md divide-y divide-gray-200">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 transition-colors ${
                    !notification.isRead ? 'bg-blue-50/50' : ''
                  }`}
                >
                  <div className="flex gap-4">
                    {/* Icon or Avatar */}
                    <div className="flex-shrink-0">
                      {notification.user ? (
                        <Link href={`/profile/${notification.user.username}`}>
                          <div className="relative">
                            <Image
                              src={notification.user.avatar}
                              alt={notification.user.username}
                              width={48}
                              height={48}
                              className="rounded-full"
                            />
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center text-sm">
                              {getNotificationIcon(notification.type)}
                            </div>
                          </div>
                        </Link>
                      ) : (
                        <div className="w-12 h-12 bg-linear-to-br from-gold-500 to-gold-700 rounded-full flex items-center justify-center text-2xl">
                          {getNotificationIcon(notification.type)}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          {notification.link ? (
                            <Link
                              href={notification.link}
                              onClick={() => markAsRead(notification.id)}
                              className="hover:text-gold-600"
                            >
                              <p className="text-charcoal-900">
                                {notification.user && (
                                  <span className="font-semibold">{notification.user.username} </span>
                                )}
                                {notification.text}
                              </p>
                            </Link>
                          ) : (
                            <p className="text-charcoal-900">
                              {notification.user && (
                                <span className="font-semibold">{notification.user.username} </span>
                              )}
                              {notification.text}
                            </p>
                          )}
                          <p className="text-sm text-charcoal-600 mt-1">{notification.timestamp}</p>
                        </div>

                        {/* Post Thumbnail */}
                        {notification.image && (
                          <Link href={notification.link || '#'}>
                            <Image
                              src={notification.image}
                              alt="Post"
                              width={60}
                              height={60}
                              className="rounded object-cover"
                            />
                          </Link>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-4 mt-2">
                        {!notification.isRead && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="text-sm text-gold-600 hover:text-gold-700 font-medium"
                          >
                            Mark as read
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(notification.id)}
                          className="text-sm text-charcoal-600 hover:text-red-600 font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Load More */}
          {filteredNotifications.length > 0 && (
            <div className="mt-6 text-center">
              <button className="px-6 py-2 border-2 border-gray-300 text-charcoal-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors">
                Load More Notifications
              </button>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
