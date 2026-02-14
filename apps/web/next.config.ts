import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@repo/core', '@repo/shared'],
};

export default nextConfig;
