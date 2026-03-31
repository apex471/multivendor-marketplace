/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prevent webpack from bundling server-only Node.js modules.
  // mongoose and bcryptjs use native bindings that must run in Node, not in
  // the browser/edge bundle. Without this the build fails on Netlify.
  serverExternalPackages: ['mongoose', 'bcryptjs'],

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    unoptimized: true,
  },
};

module.exports = nextConfig;
