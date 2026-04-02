'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to an error reporting service in production
    console.error('[Page Error]', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-charcoal-950 px-4 text-center">
      <div className="max-w-md">
        {/* Icon */}
        <div className="text-6xl mb-6">⚠️</div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-charcoal-900 dark:text-white mb-3">
          Something went wrong
        </h2>

        {/* Description */}
        <p className="text-cool-gray-500 dark:text-cool-gray-400 mb-2 leading-relaxed">
          An unexpected error occurred while loading this page.
        </p>

        {/* Digest (helps with Netlify log lookup) */}
        {error.digest && (
          <p className="text-xs text-cool-gray-400 dark:text-cool-gray-600 font-mono mb-6">
            Error ID: {error.digest}
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 bg-charcoal-900 dark:bg-white text-white dark:text-charcoal-900 rounded-xl font-semibold hover:bg-charcoal-800 dark:hover:bg-charcoal-100 transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-6 py-3 border border-charcoal-200 dark:border-charcoal-700 text-charcoal-700 dark:text-charcoal-300 rounded-xl font-semibold hover:bg-charcoal-50 dark:hover:bg-charcoal-800 transition-colors"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
