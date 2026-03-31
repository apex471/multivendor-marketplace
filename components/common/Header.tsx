'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
// import { useCart } from '../../contexts/CartContext';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  
  // Temporary mock data - replace with useCart() when ready
  const cartItemsCount = 3;
  const hasNotifications = true;
  const isLoggedIn = !!user;

  const navigation = [
    { name: 'Shop', href: '/shop' },
    { name: 'Brands', href: '/brands' },
    { name: 'Vendors', href: '/vendors' },
    { name: 'Feed', href: '/feed' },
    { name: 'Explore', href: '/explore' },
  ];

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

  const handleNotificationClick = () => {
    setNotificationsOpen(!notificationsOpen);
  };

  const mockNotifications = [
    { id: 1, text: 'Your order has been shipped', time: '2h ago', read: false },
    { id: 2, text: 'New vendor nearby: Luxury Boutique', time: '5h ago', read: false },
    { id: 3, text: 'Sale: 30% off watches', time: '1d ago', read: true },
  ];

  return (
    <header className="bg-white dark:bg-charcoal-900 shadow-sm dark:shadow-charcoal-950/50 sticky top-0 z-50 transition-colors duration-200">
      <nav className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-charcoal-800 to-charcoal-900 dark:from-gold-600 dark:to-gold-700 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-gold-300 dark:text-charcoal-900 font-bold text-xs sm:text-sm">CLW</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs sm:text-sm font-display font-bold text-charcoal-900 dark:text-white leading-tight">
                CLW
              </span>
              <span className="text-[9px] sm:text-[10px] text-cool-gray-500 dark:text-cool-gray-400 leading-tight hidden xs:block">
                Certified Luxury
              </span>
            </div>
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
                    {mockNotifications.map((notif) => (
                      <button
                        key={notif.id}
                        onClick={() => setNotificationsOpen(false)}
                        className={`w-full text-left p-4 hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 transition-colors border-b border-cool-gray-100 dark:border-charcoal-700 ${
                          !notif.read ? 'bg-gold-50 dark:bg-charcoal-700/50' : ''
                        }`}
                      >
                        <p className="text-sm text-charcoal-900 dark:text-white">{notif.text}</p>
                        <p className="text-xs text-cool-gray-500 dark:text-cool-gray-400 mt-1">{notif.time}</p>
                      </button>
                    ))}
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
                {user?.role === 'vendor' && (
                  <Link
                    href="/logistics/providers"
                    className="p-1.5 sm:p-2 text-charcoal-700 dark:text-cool-gray-300 hover:text-gold-600 dark:hover:text-gold-400 transition-colors touch-manipulation"
                    title="Logistics Providers"
                  >
                    <span className="text-lg sm:text-xl">🚚</span>
                  </Link>
                )}
                {user?.role === 'brand' && (
                  <Link
                    href="/logistics/providers"
                    className="p-1.5 sm:p-2 text-charcoal-700 dark:text-cool-gray-300 hover:text-gold-600 dark:hover:text-gold-400 transition-colors touch-manipulation"
                    title="Logistics Providers"
                  >
                    <span className="text-lg sm:text-xl">🚚</span>
                  </Link>
                )}
                <Link
                  href={user?.role === 'customer' ? '/dashboard/customer' : user?.role === 'vendor' ? '/dashboard/vendor' : user?.role === 'brand' ? '/dashboard/brand' : '/dashboard/customer'}
                  className="p-1.5 sm:p-2 text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-gold-400 transition-colors touch-manipulation"
                  aria-label="Dashboard"
                >
                  <span className="text-lg sm:text-xl">👤</span>
                </Link>
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
            {!isLoggedIn && (
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
