import path from 'node:path';
import type { NextConfig } from 'next';
import { STATIC_SECURITY_HEADERS } from './lib/security-headers';

const config: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(process.cwd(), '../..'),
  poweredByHeader: false,
  reactStrictMode: true,
  transpilePackages: ['@carnet/contracts'],
  headers: () => Promise.resolve([{ source: '/:path*', headers: STATIC_SECURITY_HEADERS }]),
};

export default config;
