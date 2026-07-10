'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CookieConsent() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if user has already accepted or declined cookies
    const consent = localStorage.getItem('clw_cookies_accepted');
    if (!consent) {
      // Small delay for natural premium feel
      const timer = setTimeout(() => setIsOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('clw_cookies_accepted', 'true');
    setIsOpen(false);
  };

  const handleDecline = () => {
    localStorage.setItem('clw_cookies_accepted', 'false');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-6 left-6 right-6 md:left-auto md:right-8 md:max-w-md z-100 animate-fade-in-up">
      <div className="bg-charcoal-900/95 dark:bg-charcoal-900/95 border border-gold-500/30 backdrop-blur-md rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex items-start gap-3">
          <div className="text-3xl">🍪</div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-white tracking-wide">Cookie Preferences</h4>
            <p className="text-xs text-cool-gray-300 mt-1 leading-relaxed">
              We use cookies to personalize your shopping experience, serve relevant ads, and analyze platform traffic in accordance with the NDPA. 
              Read our{' '}
              <Link href="/privacy" className="text-gold-500 hover:text-gold-400 font-semibold underline">
                Privacy Policy
              </Link>{' '}
              for details.
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <button
            onClick={handleAccept}
            className="flex-1 px-4 py-2.5 bg-gold-600 hover:bg-gold-500 text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-98"
          >
            Accept All
          </button>
          <button
            onClick={handleDecline}
            className="px-4 py-2.5 bg-charcoal-800 hover:bg-charcoal-700/80 text-cool-gray-400 hover:text-white text-xs font-semibold rounded-xl border border-charcoal-700 transition-all active:scale-98"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}
