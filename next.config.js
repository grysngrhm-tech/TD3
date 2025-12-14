/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable Supabase Storage for images
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // Production optimizations
  poweredByHeader: false,
  reactStrictMode: true,
}

module.exports = nextConfig
