/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prevent webpack from trying to bundle server-only Node.js packages.
  serverExternalPackages: [
    'mongoose',
    'bcryptjs',
    'nodemailer',
    'google-auth-library',
    'cloudinary',
  ],

  images: {
    remotePatterns: [
      // Cloudinary — all CLW uploads
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      // Google user avatars (OAuth)
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      // Generic fallback for vendor/brand-supplied image URLs stored in DB
      { protocol: 'https', hostname: '**' },
    ],
    unoptimized: true,
  },

  // Security headers applied to every response
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Prevent clickjacking
          { key: 'X-Frame-Options', value: 'DENY' },
          // Prevent MIME sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Enable XSS filter in older browsers
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          // Control referrer information
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Permissions policy — disable unused browser features
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self), payment=(self)',
          },
          // HSTS — force HTTPS for 1 year (set on Netlify which handles TLS)
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
        ],
      },
      // Allow the health check endpoint to be called server-to-server without credentials
      {
        source: '/api/health',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
    ];
  },

  // Required: declare empty turbopack config so Next.js 16 knows Turbopack
  // is intentional.
  turbopack: {},
};

module.exports = nextConfig;

