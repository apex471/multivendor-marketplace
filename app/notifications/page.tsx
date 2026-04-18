'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';

interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'order' | 'product' | 'system';
  actor?: {
    name: string;
    avatar: string;
  };
  text: string;
  createdAt: string;
  isRead: boolean;
  link?: string;
  image?: string;
}

export default function NotificationsPage() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [_isLoading, setIsLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) { setIsLoading(false); return; }
    const res = await fetch('/api/notifications', { headers: { Authorization: `Bearer ${token}` } });
    const json = await res.json();
    if (json.success) {
      setNotifications(json.data.notifications ?? []);
      setUnreadCount(json.data.unreadCount ?? 0);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchNotifications();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.isRead)
    : notifications;

  const markAsRead = async (id: string) => {
    const token = localStorage.getItem('auth_token');
    if (token) await fetch(`/api/notifications/${id}`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    const token = localStorage.getItem('auth_token');
    if (token) await fetch('/api/notifications', { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const deleteNotification = async (id: string) => {
    const token = localStorage.getItem('auth_token');
    if (token) await fetch(`/api/notifications/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    setNotifications(prev => prev.filter(n => n.id !== id));
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
          <div className="bg-white dark:bg-charcoal-800 rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-charcoal-900 dark:text-white">Notifications</h1>
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
                    : 'bg-gray-100 dark:bg-charcoal-700 text-charcoal-700 dark:text-cool-gray-300 hover:bg-gray-200 dark:hover:bg-charcoal-600'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  filter === 'unread'
                    ? 'bg-gold-600 text-white'
                    : 'bg-gray-100 dark:bg-charcoal-700 text-charcoal-700 dark:text-cool-gray-300 hover:bg-gray-200 dark:hover:bg-charcoal-600'
                }`}
              >
                Unread ({unreadCount})
              </button>
            </div>
          </div>

          {/* Notifications List */}
          {filteredNotifications.length === 0 ? (
            <div className="bg-white dark:bg-charcoal-800 rounded-lg shadow-md p-12 text-center">
              <div className="text-6xl mb-4">🔔</div>
              <h3 className="text-xl font-bold text-charcoal-900 dark:text-white mb-2">
                {filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
              </h3>
              <p className="text-charcoal-600 dark:text-cool-gray-400 mb-6">
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
            <div className="bg-white dark:bg-charcoal-800 rounded-lg shadow-md divide-y divide-gray-200 dark:divide-charcoal-700">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 dark:hover:bg-charcoal-700 transition-colors ${
                    !notification.isRead ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                  }`}
                >
                  <div className="flex gap-4">
                    {/* Icon or Avatar */}
                    <div className="flex-shrink-0">
                      {notification.actor ? (
                        <Link href={`/profile/${notification.actor?.name ?? ""}`}>
                          <div className="relative">
                            <Image
                              src={notification.actor?.avatar ?? ""}
                              alt={notification.actor?.name ?? ""}
                              width={48}
                              height={48}
                              className="rounded-full"
                            />
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white dark:bg-charcoal-800 rounded-full flex items-center justify-center text-sm">
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
                              <p className="text-charcoal-900 dark:text-cool-gray-100">
                                {notification.actor && (
                                  <span className="font-semibold">{notification.actor?.name ?? ""} </span>
                                )}
                                {notification.text}
                              </p>
                            </Link>
                          ) : (
                            <p className="text-charcoal-900 dark:text-cool-gray-100">
                              {notification.actor && (
                                <span className="font-semibold">{notification.actor?.name ?? ""} </span>
                              )}
                              {notification.text}
                            </p>
                          )}
                          <p className="text-sm text-charcoal-600 dark:text-cool-gray-400 mt-1">{notification.createdAt ? new Date(notification.createdAt).toLocaleDateString() : ""}</p>
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
                          className="text-sm text-charcoal-600 dark:text-cool-gray-400 hover:text-red-600 font-medium"
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
              <button className="px-6 py-2 border-2 border-gray-300 dark:border-charcoal-600 text-charcoal-700 dark:text-cool-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-charcoal-700 transition-colors">
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
