import type { MetadataRoute } from 'next';

import { getAllPropertySlugs, getPosts, getServices } from '@/lib/strapi';
import { absoluteUrl } from '@/lib/utils';

// Rebuild the sitemap hourly so new listings appear without a redeploy.
export const revalidate = 3600;

const STATIC_ROUTES: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
  priority: number;
}> = [
  { path: '/', changeFrequency: 'weekly', priority: 1 },
  { path: '/properties', changeFrequency: 'daily', priority: 0.9 },
  { path: '/services', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/about', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/contact', changeFrequency: 'yearly', priority: 0.6 },
  { path: '/property-request', changeFrequency: 'yearly', priority: 0.6 },
  { path: '/news', changeFrequency: 'weekly', priority: 0.5 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [properties, services, posts] = await Promise.all([
    getAllPropertySlugs(),
    getServices(),
    getPosts(),
  ]);

  const now = new Date();

  return [
    ...STATIC_ROUTES.map((route) => ({
      url: absoluteUrl(route.path),
      lastModified: now,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),

    ...properties.map((property) => ({
      url: absoluteUrl(`/properties/${property.slug}`),
      lastModified: property.updatedAt ? new Date(property.updatedAt) : now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),

    ...services.map((service) => ({
      url: absoluteUrl(`/services/${service.slug}`),
      lastModified: service.updatedAt ? new Date(service.updatedAt) : now,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),

    ...posts.map((post) => ({
      url: absoluteUrl(`/news/${post.slug}`),
      lastModified: post.updatedAt ? new Date(post.updatedAt) : now,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    })),
  ];
}
