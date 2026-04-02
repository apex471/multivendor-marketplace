export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-charcoal-950">
      <div className="flex flex-col items-center gap-4">
        {/* Spinner */}
        <div className="w-10 h-10 border-4 border-charcoal-200 dark:border-charcoal-700 border-t-charcoal-900 dark:border-t-white rounded-full animate-spin" />
        <p className="text-sm text-cool-gray-400 dark:text-cool-gray-500">Loading…</p>
      </div>
    </div>
  );
}
