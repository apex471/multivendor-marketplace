'use client';

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";

export default function Home() {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    document.title = "Certified Luxury World | The Digital Capital of Luxury";
    
    // Set target date to 30 days from now for demonstration
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 30);
    
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const difference = targetDate.getTime() - now;
      
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);
      
      if (difference < 0) {
        clearInterval(interval);
      } else {
        setTimeLeft({ days, hours, minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-charcoal-950 text-white font-sans selection:bg-gold-500/30 flex flex-col justify-between relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gold-900/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-charcoal-900/40 rounded-full blur-[150px] pointer-events-none" />
      
      {/* Header */}
      <header className="relative z-10 border-b border-charcoal-900 bg-charcoal-950/40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
          <div className="flex items-center">
            <Image
              src="/images/brand/clw-logo.png"
              alt="Certified Luxury World"
              width={220}
              height={150}
              className="h-14 w-auto object-contain"
              priority
            />
          </div>
          <Link
            href="/waitlist"
            className="hidden sm:inline-flex px-6 py-2.5 border border-gold-500/30 rounded-full text-xs font-semibold uppercase tracking-wider text-gold-400 hover:text-charcoal-950 hover:bg-gold-500 hover:border-gold-500 transition-all duration-300"
          >
            Request Invite
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-grow flex items-center justify-center py-16 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-gold-950/20 border border-gold-500/20 text-gold-400 px-5 py-2 rounded-full text-xs font-medium uppercase tracking-widest animate-fade-in">
            <span className="w-1.5 h-1.5 rounded-full bg-gold-500 animate-pulse" />
            The Digital Capital of Luxury — Coming Soon
          </div>

          {/* Heading */}
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-bold tracking-tight leading-tight">
              Elegance Redefined.<br />
              <span className="bg-linear-to-r from-gold-300 via-gold-500 to-gold-600 bg-clip-text text-transparent">
                Exclusivity Guaranteed.
              </span>
            </h1>
            <p className="text-cool-gray-400 text-base sm:text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
              Certified Luxury World is the premier destination for verified boutique vendors and official designer brands. We are meticulously crafting an ecosystem built on authenticity, elegance, and global reach.
            </p>
          </div>

          {/* Countdown Clock */}
          <div className="grid grid-cols-4 gap-3 sm:gap-6 max-w-xl mx-auto py-4">
            {[
              { label: 'Days', value: timeLeft.days },
              { label: 'Hours', value: timeLeft.hours },
              { label: 'Minutes', value: timeLeft.minutes },
              { label: 'Seconds', value: timeLeft.seconds }
            ].map((item, index) => (
              <div 
                key={index}
                className="bg-charcoal-900/60 border border-charcoal-800/80 rounded-2xl p-3 sm:p-5 flex flex-col items-center backdrop-blur-xs hover:border-gold-500/20 transition-all duration-300"
              >
                <span className="text-2xl sm:text-4xl md:text-5xl font-bold font-display text-gold-400">
                  {String(item.value).padStart(2, '0')}
                </span>
                <span className="text-[10px] sm:text-xs font-medium uppercase tracking-widest text-cool-gray-500 mt-1 sm:mt-2">
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="space-y-4">
            <p className="text-sm text-cool-gray-400">
              Join the elite circle. Secure your placement before our global launch.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/waitlist"
                className="w-full sm:w-auto px-10 py-4.5 bg-linear-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-charcoal-950 font-bold uppercase tracking-widest text-xs rounded-full transition-all duration-300 shadow-[0_4px_20px_rgba(198,164,94,0.25)] hover:shadow-[0_4px_30px_rgba(198,164,94,0.4)] transform hover:-translate-y-0.5 text-center"
              >
                Reserve Your Spot
              </Link>
              <Link
                href="/waitlist"
                className="w-full sm:w-auto px-10 py-4.5 border border-charcoal-800 hover:border-gold-500/30 text-white font-medium uppercase tracking-widest text-xs rounded-full transition-all duration-300 text-center"
              >
                Learn More
              </Link>
            </div>
          </div>

          {/* Core Pillars */}
          <div className="grid md:grid-cols-3 gap-6 pt-12 border-t border-charcoal-900 max-w-3xl mx-auto">
            <div className="space-y-2">
              <span className="text-gold-500 text-xl">🛡️</span>
              <h4 className="font-semibold text-sm uppercase tracking-wider">100% Certified</h4>
              <p className="text-xs text-cool-gray-500">Every single vendor and brand undergoes rigorous multi-layer verification to guarantee product authenticity.</p>
            </div>
            <div className="space-y-2">
              <span className="text-gold-500 text-xl">✨</span>
              <h4 className="font-semibold text-sm uppercase tracking-wider">VIP Onboarding</h4>
              <p className="text-xs text-cool-gray-500">Launch partners receive custom storefront designs, dedicated account specialists, and launch marketing support.</p>
            </div>
            <div className="space-y-2">
              <span className="text-gold-500 text-xl">🌐</span>
              <h4 className="font-semibold text-sm uppercase tracking-wider">Global Reach</h4>
              <p className="text-xs text-cool-gray-500">Connect with high-intent luxury buyers and collectors across major international hubs.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-charcoal-900 bg-charcoal-950/20 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-cool-gray-500">
          <p>© {new Date().getFullYear()} Certified Luxury World. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/terms" className="hover:text-gold-400 transition">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-gold-400 transition">Privacy Policy</Link>
            <a href="mailto:concierge@certifiedluxuryworld.com" className="hover:text-gold-400 transition">Contact Concierge</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

