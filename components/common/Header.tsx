'use client';

import Link from 'next/link';
import NextImage from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { getAuthToken } from '@/lib/api/auth';

interface AppNotification {
  id: string;
  text: string;
  time: string;
  read: boolean;
  link?: string | null;
}

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const loadNotifications = () => {
    const token = getAuthToken();
    if (!token) return;
    fetch('/api/notifications?limit=10', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(json => {
        if (!json.success) return;
        setNotifications((json.data.notifications ?? []).map((n: Record<string, unknown>) => ({
          id:   String(n.id),
          text: (n.text ?? n.message ?? '') as string,
          time: new Date((n.createdAt as string) ?? Date.now()).toLocaleDateString(),
          read: (n.isRead ?? false) as boolean,
          link: (n.link ?? null) as string | null,
        })));
      })
      .catch(() => { /* non-critical */ });
  };

  useEffect(() => {
    loadNotifications();
  }, []); // mount-only — intentional

  const handleNotificationClick = () => {
    setNotificationsOpen(prev => {
      if (!prev) loadNotifications();
      return !prev;
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/shop?search=${encodeURIComponent(searchQuery)}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  const handleNavigation = (href: string) => {
    router.push(href);
  };

  const handleCartClick = () => {
    router.push('/cart');
  };

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    }
    if (profileMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileMenuOpen]);

  const handleLogout = () => {
    logout();
    setProfileMenuOpen(false);
    setMobileMenuOpen(false);
    router.push('/');
  };

  const { items: cartItems } = useCart();
  const cartItemsCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);
  const hasNotifications = notifications.some(n => !n.read);
  const isLoggedIn = !!user;

  const navigation = [
    { name: 'Shop', href: '/shop' },
    { name: 'Brands', href: '/brands' },
    { name: 'Vendors', href: '/vendors' },
    { name: 'Feed', href: '/feed' },
    { name: 'Explore', href: '/explore' },
  ];

  return (
    <header className="bg-white dark:bg-charcoal-900 shadow-sm dark:shadow-charcoal-950/50 sticky top-0 z-50 transition-colors duration-200">
      <nav className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <NextImage
              src="/images/brand/clw-logo.png"
              alt="Certified Luxury World"
              width={231}
              height={160}
              className="h-10 sm:h-12 w-auto object-contain"
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navigation.map((item) => (
              <button
                key={item.name}
                onClick={() => handleNavigation(item.href)}
                className={`font-medium transition-colors ${
                  pathname === item.href
                    ? 'text-gold-600 dark:text-gold-400'
                    : 'text-charcoal-700 dark:text-cool-gray-300 hover:text-gold-600 dark:hover:text-gold-400'
                }`}
              >
                {item.name}
              </button>
            ))}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-1 sm:gap-2 md:gap-4">
            {/* Search */}
            <button 
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-1.5 sm:p-2 text-charcoal-700 dark:text-cool-gray-300 hover:text-gold-600 dark:hover:text-gold-400 transition-colors touch-manipulation"
              aria-label="Search"
            >
              <span className="text-lg sm:text-xl">🔍</span>
            </button>

            {/* Cart */}
            <button
              onClick={handleCartClick}
              className="p-1.5 sm:p-2 text-charcoal-700 dark:text-cool-gray-300 hover:text-gold-600 dark:hover:text-gold-400 transition-colors relative touch-manipulation"
              aria-label={`Shopping cart with ${cartItemsCount} items`}
            >
              <span className="text-lg sm:text-xl">🛒</span>
              {cartItemsCount > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 sm:w-5 sm:h-5 bg-red-600 text-white text-[10px] sm:text-xs flex items-center justify-center rounded-full font-semibold">
                  {cartItemsCount}
                </span>
              )}
            </button>

            {/* Notifications - Hide on small mobile */}
            <div className="relative hidden xs:block">
              <button 
                onClick={handleNotificationClick}
                className="p-1.5 sm:p-2 text-charcoal-700 dark:text-cool-gray-300 hover:text-gold-600 dark:hover:text-gold-400 transition-colors relative touch-manipulation"
                aria-label="Notifications"
              >
                <span className="text-lg sm:text-xl">🔔</span>
                {hasNotifications && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-600 rounded-full"></span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-charcoal-800 rounded-lg shadow-xl border border-cool-gray-200 dark:border-charcoal-700 z-50">
                  <div className="p-4 border-b border-cool-gray-200 dark:border-charcoal-700">
                    <h3 className="font-semibold text-charcoal-900 dark:text-white">Notifications</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="p-4 text-sm text-charcoal-500 dark:text-cool-gray-400 text-center">No notifications yet</p>
                    ) : (
                      notifications.map((notif) => (
                        <button
                          key={notif.id}
                          onClick={() => { setNotificationsOpen(false); if (notif.link) router.push(notif.link); }}
                          className={`w-full text-left p-4 hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 transition-colors border-b border-cool-gray-100 dark:border-charcoal-700 ${
                            !notif.read ? 'bg-gold-50 dark:bg-charcoal-700/50' : ''
                          }`}
                        >
                          <p className="text-sm text-charcoal-900 dark:text-white">{notif.text}</p>
                          <p className="text-xs text-cool-gray-500 dark:text-cool-gray-400 mt-1">{notif.time}</p>
                        </button>
                      ))
                    )}
                  </div>
                  <div className="p-3 border-t border-cool-gray-200 dark:border-charcoal-700">
                    <button className="text-sm text-gold-600 dark:text-gold-400 hover:text-gold-700 dark:hover:text-gold-500 font-semibold">
                      View all notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Profile - Hide on mobile, show only hamburger */}
            {isLoggedIn ? (
              <div className="hidden sm:flex items-center gap-2">
                {(user?.role === 'vendor' || user?.role === 'brand') && (
                  <Link
                    href="/logistics/providers"
                    className="p-1.5 sm:p-2 text-charcoal-700 dark:text-cool-gray-300 hover:text-gold-600 dark:hover:text-gold-400 transition-colors touch-manipulation"
                    title="Logistics Providers"
                  >
                    <span className="text-lg sm:text-xl">🚚</span>
                  </Link>
                )}
                {/* Profile dropdown */}
                <div className="relative" ref={profileMenuRef}>
                  <button
                    onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                    className="flex items-center gap-1.5 p-1.5 sm:p-2 text-charcoal-700 dark:text-cool-gray-300 hover:text-gold-600 dark:hover:text-gold-400 transition-colors touch-manipulation"
                    aria-label="Profile menu"
                    aria-expanded={profileMenuOpen}
                  >
                    <span className="text-lg sm:text-xl">👤</span>
                    <span className="hidden lg:block text-xs font-medium max-w-20 truncate">
                      {user?.firstName || user?.fullName?.split(' ')[0] || 'Account'}
                    </span>
                    <span className="text-xs opacity-60">{profileMenuOpen ? '▲' : '▼'}</span>
                  </button>

                  {profileMenuOpen && (
                    <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-charcoal-800 rounded-xl shadow-xl border border-cool-gray-200 dark:border-charcoal-700 z-50 overflow-hidden">
                      {/* User info */}
                      <div className="px-4 py-3 border-b border-cool-gray-100 dark:border-charcoal-700">
                        <p className="text-sm font-semibold text-charcoal-900 dark:text-white truncate">
                          {user?.fullName || `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'Account'}
                        </p>
                        <p className="text-xs text-cool-gray-500 dark:text-cool-gray-400 truncate">{user?.email}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 bg-gold-100 dark:bg-gold-900/30 text-gold-700 dark:text-gold-400 text-[10px] font-semibold rounded-full capitalize">
                          {user?.role}
                        </span>
                      </div>

                      {/* Dashboard */}
                      <Link
                        href={
                          user?.role === 'vendor' ? '/dashboard/vendor' :
                          user?.role === 'brand'  ? '/dashboard/brand'  :
                          user?.role === 'admin'  ? '/admin/dashboard'  :
                          '/dashboard/customer'
                        }
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-charcoal-700 dark:text-cool-gray-300 hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 transition-colors"
                      >
                        <span>📊</span> Dashboard
                      </Link>

                      {/* Settings */}
                      <Link
                        href="/settings"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-charcoal-700 dark:text-cool-gray-300 hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 transition-colors"
                      >
                        <span>⚙️</span> Settings
                      </Link>

                      {/* Divider */}
                      <div className="border-t border-cool-gray-100 dark:border-charcoal-700" />

                      {/* Logout */}
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <span>🚪</span> Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <Link
                href="/auth/login"
                className="hidden md:block px-3 py-1.5 sm:px-4 sm:py-2 bg-charcoal-900 dark:bg-gold-600 text-white rounded-lg hover:bg-charcoal-800 dark:hover:bg-gold-700 transition-colors font-semibold text-xs sm:text-sm"
              >
                Login
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-1.5 text-charcoal-700 dark:text-cool-gray-300 touch-manipulation ml-1"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Menu"
            >
              <span className="text-xl sm:text-2xl">{mobileMenuOpen ? '✕' : '☰'}</span>
            </button>
          </div>
        </div>

        {/* Search Bar (Expandable) */}
        {searchOpen && (
          <div className="py-3 sm:py-4 border-t border-cool-gray-200 dark:border-charcoal-700">
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                placeholder="Search luxury products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base border border-cool-gray-300 dark:border-charcoal-700 bg-white dark:bg-charcoal-800 text-charcoal-900 dark:text-white placeholder-cool-gray-500 dark:placeholder-cool-gray-400 rounded-lg focus:ring-2 focus:ring-gold-500 dark:focus:ring-gold-600 focus:border-transparent transition-colors"
                autoFocus
              />
              <button
                type="submit"
                className="px-4 sm:px-6 py-2 bg-charcoal-900 dark:bg-gold-600 text-white rounded-lg hover:bg-charcoal-800 dark:hover:bg-gold-700 transition-colors font-semibold text-sm sm:text-base whitespace-nowrap"
              >
                Search
              </button>
            </form>
          </div>
        )}

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-cool-gray-200 dark:border-charcoal-700">
            {navigation.map((item) => (
              <button
                key={item.name}
                onClick={() => {
                  handleNavigation(item.href);
                  setMobileMenuOpen(false);
                }}
                className={`block w-full text-left py-2 font-medium ${
                  pathname === item.href
                    ? 'text-gold-600 dark:text-gold-400'
                    : 'text-charcoal-700 dark:text-cool-gray-300'
                }`}
              >
                {item.name}
              </button>
            ))}
            {/* Logistics link — only for vendors and brand owners */}
            {isLoggedIn && (user?.role === 'vendor' || user?.role === 'brand') && (
              <button
                onClick={() => {
                  handleNavigation('/logistics/providers');
                  setMobileMenuOpen(false);
                }}
                className={`block w-full text-left py-2 font-medium ${
                  pathname === '/logistics/providers'
                    ? 'text-gold-600 dark:text-gold-400'
                    : 'text-charcoal-700 dark:text-cool-gray-300'
                }`}
              >
                🚚 Logistics Providers
              </button>
            )}
            {isLoggedIn ? (
              <>
                <div className="mt-3 pt-3 border-t border-cool-gray-200 dark:border-charcoal-700">
                  <div className="px-1 py-2">
                    <p className="text-sm font-semibold text-charcoal-900 dark:text-white truncate">
                      {user?.fullName || `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim()}
                    </p>
                    <p className="text-xs text-cool-gray-500 dark:text-cool-gray-400 truncate">{user?.email}</p>
                  </div>
                  <button
                    onClick={() => { handleNavigation(
                      user?.role === 'vendor' ? '/dashboard/vendor' :
                      user?.role === 'brand'  ? '/dashboard/brand'  :
                      user?.role === 'admin'  ? '/admin/dashboard'  :
                      '/dashboard/customer'
                    ); setMobileMenuOpen(false); }}
                    className="block w-full text-left py-2 font-medium text-charcoal-700 dark:text-cool-gray-300"
                  >
                    📊 Dashboard
                  </button>
                  <button
                    onClick={() => { handleNavigation('/settings'); setMobileMenuOpen(false); }}
                    className="block w-full text-left py-2 font-medium text-charcoal-700 dark:text-cool-gray-300"
                  >
                    ⚙️ Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left py-2 font-medium text-red-600 dark:text-red-400"
                  >
                    🚪 Sign Out
                  </button>
                </div>
              </>
            ) : (
              <Link
                href="/auth/login"
                className="block mt-4 px-4 py-2 bg-charcoal-900 dark:bg-gold-600 text-white rounded-lg text-center font-semibold"
                onClick={() => setMobileMenuOpen(false)}
              >
                Login
              </Link>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}
