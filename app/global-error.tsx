'use client';

// global-error.tsx MUST include its own <html> and <body> tags
// because it replaces the entire root layout when a critical error occurs.
// This is the last-resort fallback for errors thrown by the root layout itself.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          background: '#0a0a0a',
          color: '#fff',
          textAlign: 'center',
          padding: '1rem',
        }}
      >
        <div style={{ maxWidth: 400 }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>💥</div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.75rem', fontWeight: 700 }}>
            Critical error
          </h1>
          <p style={{ color: '#8a8a8a', marginBottom: '0.5rem', lineHeight: 1.6 }}>
            A critical error occurred. Please reload the page.
          </p>
          {error.digest && (
            <p style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#525252', marginBottom: '1.5rem' }}>
              ID: {error.digest}
            </p>
          )}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={reset}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#fff',
                color: '#111',
                border: 'none',
                borderRadius: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                padding: '0.75rem 1.5rem',
                border: '1px solid #262626',
                color: '#d4d4d4',
                borderRadius: '0.75rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Go home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
