/** @type {import('next').NextConfig} */

// ── Backend base URL ─────────────────────────────────────────────────────────
// Change this to your actual backend URL/port.
// Common ports: 3001, 4000, 5000, 8000, 8080
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },

  // Proxy all /artisan/* requests to the backend so relative fetch URLs work.
  async rewrites() {
    return [
      // Proxy frontend `/api/*` to backend during development so cookies
      // are treated same-site by the browser (avoids cross-site cookie issues).
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/:path*`,
      },
      {
        source: '/artisan/:path*',
        destination: `${BACKEND_URL}/artisan/:path*`,
      },
    ];
  },
};

export default nextConfig;
