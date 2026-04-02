import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-charcoal-900 text-white">
      <div className="container mx-auto px-4 py-8 sm:py-10 md:py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-7 md:gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4">
              <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-linear-to-br from-gold-500 to-gold-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-xs sm:text-sm">CLW</span>
              </div>
              <div className="flex flex-col">
                <span className="text-base sm:text-lg font-display font-bold text-white">
                  CLW
                </span>
                <span className="text-[9px] sm:text-[10px] text-gold-400">
                  Certified Luxury World
                </span>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-gray-300 pr-4 md:pr-0">
              Your premier destination for certified luxury products and refined style.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-white mb-3 sm:mb-4 text-sm sm:text-base">Shop</h3>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-300">
              <li>
                <Link href="/shop" className="hover:text-gold-400 transition-colors touch-manipulation inline-block py-0.5">
                  All Products
                </Link>
              </li>
              <li>
                <Link href="/shop/new" className="hover:text-gold-400 transition-colors touch-manipulation inline-block py-0.5">
                  New Arrivals
                </Link>
              </li>
              <li>
                <Link href="/shop/featured" className="hover:text-gold-400 transition-colors touch-manipulation inline-block py-0.5">
                  Featured
                </Link>
              </li>
              <li>
                <Link href="/vendors" className="hover:text-gold-400 transition-colors touch-manipulation inline-block py-0.5">
                  Find Vendors
                </Link>
              </li>
            </ul>
          </div>

          {/* Community */}
          <div>
            <h3 className="font-semibold text-white mb-3 sm:mb-4 text-sm sm:text-base">Community</h3>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-300">
              <li>
                <Link href="/feed" className="hover:text-gold-400 transition-colors touch-manipulation inline-block py-0.5">
                  Fashion Feed
                </Link>
              </li>
              <li>
                <Link href="/explore" className="hover:text-gold-400 transition-colors touch-manipulation inline-block py-0.5">
                  Explore
                </Link>
              </li>
              <li>
                <Link href="/stories" className="hover:text-gold-400 transition-colors touch-manipulation inline-block py-0.5">
                  Stories
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold text-white mb-3 sm:mb-4 text-sm sm:text-base">Support</h3>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-300">
              <li>
                <Link href="/help" className="hover:text-gold-400 transition-colors touch-manipulation inline-block py-0.5">
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-gold-400 transition-colors touch-manipulation inline-block py-0.5">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-gold-400 transition-colors touch-manipulation inline-block py-0.5">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-gold-400 transition-colors touch-manipulation inline-block py-0.5">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Brand Owner CTA */}
        <div className="border-t border-charcoal-800 mt-6 sm:mt-7 md:mt-8 pt-6 sm:pt-7 md:pt-8">
          <div className="bg-linear-to-r from-gold-600 to-gold-700 rounded-lg sm:rounded-xl p-4 sm:p-6 text-center">
            <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Own a Fashion Brand?</h3>
            <p className="text-sm sm:text-base text-white/90 mb-4">
              Partner with top vendors through our affiliate program. Expand your reach and grow your brand.
            </p>
            <Link 
              href="/auth/signup?role=brand"
              className="inline-block px-6 sm:px-8 py-2.5 sm:py-3 bg-charcoal-900 text-white rounded-lg font-semibold hover:bg-charcoal-800 transition-all shadow-lg hover:shadow-xl text-sm sm:text-base touch-manipulation"
            >
              Become a Brand Owner
            </Link>
          </div>
        </div>

        <div className="border-t border-charcoal-800 mt-6 sm:mt-7 md:mt-8 pt-6 sm:pt-7 md:pt-8 text-center text-xs sm:text-sm text-gray-400">
          <p>© {currentYear} CLW. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
