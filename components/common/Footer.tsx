'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLocalization } from '@/contexts/LocalizationContext';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const pathname = usePathname();
  const { user } = useAuth();
  const isCustomer = user?.role === 'customer';
  const { language, currency, setLanguage, setCurrency, t } = useLocalization();

  // ── All footer link groups ───────────────────────────────────────────────
  // Only include links that have actual pages. No 404s.
  const shopLinks = [
    { href: '/shop',          label: t('shop') },
    { href: '/shop/new',      label: 'New Arrivals' },
    { href: '/shop/featured', label: 'Featured' },
    { href: '/vendors',       label: 'Find Vendors' },
    { href: '/brands',        label: 'Brands' },
    { href: '/size-guide',    label: 'Size Guide' },
  ];

  const communityLinks = [
    { href: '/feed',    label: t('feed') },
    { href: '/stories', label: 'Stories' },
    { href: '/explore', label: t('explore') },
    { href: '/about',   label: t('about_us') },
  ];

  const supportLinks = [
    { href: '/help',           label: t('help') },
    { href: '/contact',        label: 'Contact Us' },
    { href: 'https://forms.gle/EwU8X8z7UQNYPP1F8', label: 'Submit Feedback' },
    { href: '/shipping',       label: 'Shipping Info' },
    { href: '/return-policy',  label: 'Return Policy' },
    { href: '/terms',          label: 'Terms of Service' },
    { href: '/privacy',        label: 'Privacy Policy' },
  ];

  // ── Social links — only include real profiles; no placeholder hrefs ──────
  const socialLinks: { label: string; href: string; icon: React.ReactNode }[] = [
    {
      label: 'Instagram',
      href:  'https://instagram.com/certifiedluxuryworld',
      icon:  (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      ),
    },
    {
      label: 'X (Twitter)',
      href:  'https://twitter.com/certifiedluxury',
      icon:  (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
    {
      label: 'Facebook',
      href:  'https://facebook.com/certifiedluxuryworld',
      icon:  (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    },
  ];

  return (
    <footer className="bg-charcoal-900 text-white" role="contentinfo">
      <div className="container mx-auto px-4 py-10 sm:py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">

          {/* ── Brand Column ─────────────────────────────────────────────── */}
          <div className="col-span-2 md:col-span-1">
            <div className="mb-4">
              <Image
                src="/images/brand/clw-logo.png"
                alt="Certified Luxury World"
                width={231}
                height={160}
                className="h-12 w-auto object-contain"
              />
            </div>
            <p className="text-sm text-cool-gray-400 leading-relaxed max-w-xs">
              Your premier destination for certified luxury products and refined style.
            </p>

            {/* Social Icons */}
            <div className="flex items-center gap-3 mt-5">
              {socialLinks.map(s => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                  aria-label={s.label}
                  className="w-8 h-8 rounded-full bg-charcoal-800 hover:bg-gold-600 flex items-center justify-center text-cool-gray-400 hover:text-white transition-all duration-200">
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* ── Shop Links ────────────────────────────────────────────────── */}
          <div>
            <h3 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">{t('shop')}</h3>
            <ul className="space-y-2.5">
              {shopLinks.map(link => (
                <li key={link.href}>
                  <Link href={link.href}
                    className="text-sm text-cool-gray-400 hover:text-gold-400 transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Community Links ───────────────────────────────────────────── */}
          <div>
            <h3 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">Community</h3>
            <ul className="space-y-2.5">
              {communityLinks.map(link => (
                <li key={link.href}>
                  <Link href={link.href}
                    className="text-sm text-cool-gray-400 hover:text-gold-400 transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Support Links ────────────────────────────────────────────── */}
          <div>
            <h3 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">Support</h3>
            <ul className="space-y-2.5">
              {supportLinks.map(link => {
                const isExternal = link.href.startsWith('http');
                return (
                  <li key={link.href}>
                    {isExternal ? (
                      <a href={link.href} target="_blank" rel="noopener noreferrer"
                        className="text-sm text-cool-gray-400 hover:text-gold-400 transition-colors flex items-center gap-1">
                        {link.label}
                        <svg className="w-3.5 h-3.5 inline opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    ) : (
                      <Link href={link.href}
                        className="text-sm text-cool-gray-400 hover:text-gold-400 transition-colors">
                        {link.label}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* ── Brand Owner CTA — only shown on homepage for unauthenticated visitors ── */}
        {!user && pathname === '/' && (
          <div className="border-t border-charcoal-800 mt-10 pt-8">
            <div className="bg-linear-to-r from-gold-700 to-gold-600 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Own a Fashion Brand?</h3>
                <p className="text-sm text-white/80">
                  Partner with us — expand your reach through the CLW luxury network.
                </p>
              </div>
              <Link
                href="/become-brand"
                className="shrink-0 px-6 py-2.5 bg-charcoal-900 hover:bg-charcoal-800 text-white rounded-xl font-semibold text-sm transition-all shadow-lg hover:shadow-xl whitespace-nowrap">
                Become a Brand Owner
              </Link>
            </div>
          </div>
        )}

        {/* ── Bottom Bar ───────────────────────────────────────────────── */}
        <div className="border-t border-charcoal-800 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-cool-gray-500">
          <p>© {currentYear} Certified Luxury World. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              className="bg-transparent border-0 text-cool-gray-400 focus:ring-0 cursor-pointer outline-none hover:text-gold-400"
              aria-label="Select Language"
            >
              <option value="en" className="bg-charcoal-900 text-white">English</option>
              <option value="es" className="bg-charcoal-900 text-white">Español</option>
              <option value="fr" className="bg-charcoal-900 text-white">Français</option>
              <option value="de" className="bg-charcoal-900 text-white">Deutsch</option>
              <option value="zh" className="bg-charcoal-900 text-white">中文</option>
            </select>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as any)}
              className="bg-transparent border-0 text-cool-gray-400 focus:ring-0 cursor-pointer outline-none hover:text-gold-400"
              aria-label="Select Currency"
            >
              <option value="USD" className="bg-charcoal-900 text-white">USD ($)</option>
              <option value="EUR" className="bg-charcoal-900 text-white">EUR (€)</option>
              <option value="GBP" className="bg-charcoal-900 text-white">GBP (£)</option>
              <option value="NGN" className="bg-charcoal-900 text-white">NGN (₦)</option>
              <option value="CNY" className="bg-charcoal-900 text-white">CNY (¥)</option>
            </select>
            <Link href="/terms"   className="hover:text-gold-400 transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-gold-400 transition-colors">Privacy</Link>
            <Link href="/contact" className="hover:text-gold-400 transition-colors">Contact</Link>
            <a
              href="https://forms.gle/EwU8X8z7UQNYPP1F8"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-gold-600 hover:bg-gold-500 text-white font-medium rounded-md transition-colors shadow-xs hover:shadow-md"
            >
              <span>Feedback</span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>

        {/* ── Powered by watermark ───────────────────────────────────────── */}
        <div className="border-t border-charcoal-800/60 mt-4 pt-4 flex items-center justify-center gap-2">
          <span className="text-[10px] text-cool-gray-600 uppercase tracking-[0.2em] select-none">Powered by</span>
          <span className="text-[11px] font-bold tracking-[0.15em] uppercase bg-gradient-to-r from-gold-500 via-gold-300 to-gold-500 bg-clip-text text-transparent select-none">
            CLUXURIOUS WORLD
          </span>
          <span className="text-gold-600 text-xs select-none">✦</span>
        </div>
      </div>
    </footer>
  );
}
