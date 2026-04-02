import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-charcoal-950 px-4 text-center">
      <div className="max-w-md">
        {/* 404 Number */}
        <h1 className="text-8xl font-bold text-charcoal-200 dark:text-charcoal-700 select-none mb-2">
          404
        </h1>

        {/* Icon */}
        <div className="text-6xl mb-6">🔍</div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-charcoal-900 dark:text-white mb-3">
          Page not found
        </h2>

        {/* Description */}
        <p className="text-cool-gray-500 dark:text-cool-gray-400 mb-8 leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          Check the URL or head back home.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="px-6 py-3 bg-charcoal-900 dark:bg-white text-white dark:text-charcoal-900 rounded-xl font-semibold hover:bg-charcoal-800 dark:hover:bg-charcoal-100 transition-colors"
          >
            Go home
          </Link>
          <Link
            href="/shop"
            className="px-6 py-3 border border-charcoal-200 dark:border-charcoal-700 text-charcoal-700 dark:text-charcoal-300 rounded-xl font-semibold hover:bg-charcoal-50 dark:hover:bg-charcoal-800 transition-colors"
          >
            Browse shop
          </Link>
        </div>
      </div>
    </div>
  );
}
