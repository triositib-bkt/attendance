/** @type {import('next').NextConfig} */
const nextConfig = {
  // Server actions are available by default in Next.js 14
  
  // Generate ETag headers for better cache control
  generateEtags: true,
  
  // Disable x-powered-by header
  poweredByHeader: false,
  
  // Configure headers for cache control
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
