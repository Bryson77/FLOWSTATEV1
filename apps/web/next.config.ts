import type { NextConfig } from 'next';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  outputFileTracingRoot: path.resolve(__dirname, '../../'),
  transpilePackages: [
    '@saktus/ui',
    '@saktus/shared',
    '@saktus/study-engine',
  ],
};

export default nextConfig;
