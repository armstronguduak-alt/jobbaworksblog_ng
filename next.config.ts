import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'klidnyqyjvbvzmplwdfl.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: '*.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  // Enable experimental features for server actions
  experimental: {
    // Optimize package imports to reduce bundle size
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
};

export default nextConfig;
