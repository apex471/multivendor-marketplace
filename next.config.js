/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prevent webpack from trying to bundle server-only Node.js packages.
  // These packages either use native bindings, dynamic requires, or built-in
  // Node modules that webpack cannot resolve in a browser/edge bundle context.
  // Without this setting the build will fail on Netlify with MODULE_NOT_FOUND
  // or "Critical dependency: the request of a CommonJS require is an expression".
  serverExternalPackages: [
    'mongoose',        // native bindings (bson C++ addon)
    'bcryptjs',        // native crypto fallback
    'nodemailer',      // dynamic require() for transports
    'google-auth-library', // uses fs, crypto, net built-ins directly
  ],

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
