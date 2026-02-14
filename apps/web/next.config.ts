import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@repo/core', '@repo/shared', 'api'],
};

export default nextConfig;
