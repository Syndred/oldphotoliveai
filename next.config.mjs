import createNextIntlPlugin from 'next-intl/plugin';
import redirectsConfig from './src/config/redirects.cjs';

const { LEGACY_REDIRECTS } = redirectsConfig;

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Public migrations normalize locale + trailing slash together in one hop.
  // API middleware and file redirects retain their previous 308 behavior.
  skipTrailingSlashRedirect: true,
  serverExternalPackages: ['ffmpeg-static'],
  outputFileTracingIncludes: {
    '/api/worker/pipeline': ['./node_modules/ffmpeg-static/ffmpeg'],
  },
  async redirects() {
    return [...LEGACY_REDIRECTS];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.googleusercontent.com' },
      { protocol: 'https', hostname: '**.r2.dev' },
    ],
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/api/tasks/:taskId/status',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
        ],
      },
      {
        source: '/api/tasks/:taskId/stream',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
