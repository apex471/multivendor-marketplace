'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// useSearchParams() must live in a child component wrapped by <Suspense>
// otherwise Next.js static generation crashes at build time (Netlify deploy fails).
function VerifyEmailRedirector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const role = searchParams.get('role') || 'vendor';

  useEffect(() => {
    const dest = email
      ? `/auth/verify-email/pending?email=${encodeURIComponent(email)}&role=${role}`
      : '/auth/vendor/login';
    router.replace(dest);
  }, [router, email, role]);

  return (
    <div className="text-white text-center">
      <div className="text-4xl mb-3 animate-pulse">🔄</div>
      <p className="text-purple-200">Redirecting…</p>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-linear-to-br from-purple-900 via-purple-800 to-purple-900 flex items-center justify-center">
      <Suspense
        fallback={
          <div className="text-white text-center">
            <div className="text-4xl mb-3 animate-pulse">🔄</div>
            <p className="text-purple-200">Loading…</p>
          </div>
        }
      >
        <VerifyEmailRedirector />
      </Suspense>
    </div>
  );
}

