import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@flowstate/ui', '@flowstate/shared', '@flowstate/study-engine'],
};

export default nextConfig;
