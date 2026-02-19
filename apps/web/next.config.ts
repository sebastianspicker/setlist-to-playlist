import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@repo/core', '@repo/shared', 'api'],
  // Next 16+: set cacheComponents: true for PPR and use cache; see docs/tech/cache-components.md
};

export default nextConfig;
