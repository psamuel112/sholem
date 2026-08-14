import type { NextConfig } from 'next';

/** Host that serves Strapi media, derived from the API URL. */
const strapiUrl = new URL(process.env.NEXT_PUBLIC_STRAPI_URL ?? 'http://localhost:1337');
const isLoopbackStrapi = ['localhost', '127.0.0.1', '::1'].includes(strapiUrl.hostname);

const nextConfig: NextConfig = {
  images: {
    // Next.js 16 blocks private-IP image origins by default. Permit them only
    // for an explicitly local Strapi URL used during local development.
    dangerouslyAllowLocalIP: isLoopbackStrapi,
    remotePatterns: [
      {
        protocol: strapiUrl.protocol.replace(':', '') as 'http' | 'https',
        hostname: strapiUrl.hostname,
        port: strapiUrl.port || undefined,
        pathname: '/uploads/**',
      },
      // Media served from object storage in production.
      { protocol: 'https', hostname: '**.amazonaws.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  poweredByHeader: false,
  compress: true,
};

export default nextConfig;
