'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function ScrollRevealInitializer() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Feature detect native CSS scroll-timeline. If supported, native CSS handles it.
    if (window.CSS && CSS.supports('(animation-timeline: view()) and (animation-range: entry)')) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal-visible');
          }
        });
      },
      { 
        threshold: 0.05,
        rootMargin: '0px 0px -40px 0px' // Trigger slightly before element enters view for better visual transition
      }
    );

    const observeElements = () => {
      document.querySelectorAll('.scroll-reveal').forEach((el) => {
        observer.observe(el);
      });
    };

    // Run observation on mount / pathname change
    observeElements();

    // Re-run observation when DOM tree changes (for dynamic AJAX contents)
    const mutationObserver = new MutationObserver(() => {
      observeElements();
    });

    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, [pathname]);

  return null;
}
