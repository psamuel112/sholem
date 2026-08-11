import type {
  AboutPage,
  City,
  Global,
  Homepage,
  OfferType,
  Post,
  Property,
  PropertyType,
  Service,
  StrapiCollection,
  StrapiSingle,
} from '@/types/strapi';

const API_URL = process.env.NEXT_PUBLIC_STRAPI_URL ?? 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN;

/** How long fetched content stays fresh, in seconds. */
const REVALIDATE = Number(process.env.NEXT_PUBLIC_REVALIDATE ?? 60);

export class StrapiError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = 'StrapiError';
  }
}

type Query = Record<string, unknown>;

/**
 * Serialise a nested object into Strapi's bracketed query syntax,
 * e.g. { filters: { slug: { $eq: 'a' } } } -> filters[slug][$eq]=a
 */
function toQueryString(query: Query, prefix = ''): string {
  const parts: string[] = [];

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    const path = prefix ? `${prefix}[${key}]` : key;

    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (typeof item === 'object' && item !== null) {
          parts.push(toQueryString(item as Query, `${path}[${index}]`));
        } else {
          parts.push(`${encodeURIComponent(`${path}[${index}]`)}=${encodeURIComponent(String(item))}`);
        }
      });
    } else if (typeof value === 'object') {
      parts.push(toQueryString(value as Query, path));
    } else {
      parts.push(`${encodeURIComponent(path)}=${encodeURIComponent(String(value))}`);
    }
  }

  return parts.filter(Boolean).join('&');
}

/**
 * Fetch JSON from the Strapi content API.
 *
 * Throws StrapiError on failure so callers can decide between a 404 page and
 * an error boundary; see `fetchOptional` for a null-returning variant.
 */
export async function fetchApi<T>(path: string, query: Query = {}): Promise<T> {
  const qs = toQueryString(query);
  const url = `${API_URL}/api/${path}${qs ? `?${qs}` : ''}`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {}),
      },
      next: { revalidate: REVALIDATE },
    });
  } catch (cause) {
    throw new StrapiError(
      `Cannot reach Strapi at ${API_URL}. Is the backend running?`
    );
  }

  if (!response.ok) {
    throw new StrapiError(`Strapi responded ${response.status} for /${path}`, response.status);
  }

  return response.json() as Promise<T>;
}

/** Like `fetchApi`, but resolves to null instead of throwing. */
async function fetchOptional<T>(path: string, query: Query = {}): Promise<T | null> {
  try {
    return await fetchApi<T>(path, query);
  } catch (error) {
    if (error instanceof StrapiError) {
      console.error(`[strapi] ${error.message}`);
      return null;
    }
    throw error;
  }
}

/** Absolute URL for a media path returned by Strapi. */
export function mediaUrl(path?: string | null): string | null {
  if (!path) return null;
  return path.startsWith('http') ? path : `${API_URL}${path}`;
}

/* ------------------------------------------------------------------ populate */

/** Everything a property card needs — kept lean for list views. */
const PROPERTY_CARD_POPULATE = {
  featuredImage: true,
  cities: { fields: ['name', 'slug'] },
  propertyTypes: { fields: ['name', 'slug'] },
  offerTypes: { fields: ['name', 'slug'] },
};

const PROPERTY_DETAIL_POPULATE = {
  ...PROPERTY_CARD_POPULATE,
  gallery: true,
  features: { fields: ['name', 'slug'] },
  landmarks: true,
  extraSpecs: true,
  seo: { populate: 'shareImage' },
};

/* ----------------------------------------------------------------- singletons */

export function getGlobal() {
  return fetchOptional<StrapiSingle<Global>>('global', {
    populate: { logo: true, socials: true, defaultSeo: { populate: 'shareImage' } },
  }).then((res) => res?.data ?? null);
}

export function getHomepage() {
  return fetchOptional<StrapiSingle<Homepage>>('homepage', {
    populate: {
      hero: { populate: ['backgroundImage', 'primaryCta', 'secondaryCta'] },
      stats: true,
      whyChooseItems: true,
      ctaButton: true,
      ctaBackground: true,
      seo: { populate: 'shareImage' },
      featuredProperties: { populate: PROPERTY_CARD_POPULATE },
      featuredServices: { populate: 'image' },
      featuredCities: { populate: 'image' },
    },
  }).then((res) => res?.data ?? null);
}

export function getAboutPage() {
  return fetchOptional<StrapiSingle<AboutPage>>('about-page', {
    populate: {
      heroImage: true,
      founderImage: true,
      values: true,
      stats: true,
      seo: { populate: 'shareImage' },
    },
  }).then((res) => res?.data ?? null);
}

/* ----------------------------------------------------------------- properties */

export interface PropertyFilters {
  page?: number;
  pageSize?: number;
  city?: string;
  propertyType?: string;
  offerType?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
}

/** Translate UI filters into a Strapi `filters` object. */
function buildPropertyFilters(filters: PropertyFilters) {
  const where: Record<string, unknown> = {};

  if (filters.city) where.cities = { slug: { $eq: filters.city } };
  if (filters.propertyType) where.propertyTypes = { slug: { $eq: filters.propertyType } };
  if (filters.offerType) where.offerTypes = { slug: { $eq: filters.offerType } };
  if (filters.search) {
    where.$or = [
      { title: { $containsi: filters.search } },
      { excerpt: { $containsi: filters.search } },
      { address: { $containsi: filters.search } },
    ];
  }
  if (filters.minPrice || filters.maxPrice) {
    where.price = {
      ...(filters.minPrice ? { $gte: filters.minPrice } : {}),
      ...(filters.maxPrice ? { $lte: filters.maxPrice } : {}),
    };
  }

  return where;
}

export async function getProperties(filters: PropertyFilters = {}) {
  const result = await fetchOptional<StrapiCollection<Property>>('properties', {
    populate: PROPERTY_CARD_POPULATE,
    filters: buildPropertyFilters(filters),
    sort: [filters.sort || 'publishedAt:desc'],
    pagination: {
      page: filters.page ?? 1,
      pageSize: filters.pageSize ?? 12,
    },
  });

  return {
    properties: result?.data ?? [],
    pagination: result?.meta?.pagination ?? { page: 1, pageSize: 12, pageCount: 0, total: 0 },
  };
}

export async function getProperty(slug: string) {
  const result = await fetchOptional<StrapiCollection<Property>>('properties', {
    filters: { slug: { $eq: slug } },
    populate: PROPERTY_DETAIL_POPULATE,
    pagination: { pageSize: 1 },
  });
  return result?.data?.[0] ?? null;
}

/** Other listings in the same city, excluding the one being viewed. */
export async function getRelatedProperties(property: Property, limit = 3) {
  const citySlug = property.cities?.[0]?.slug;
  const result = await fetchOptional<StrapiCollection<Property>>('properties', {
    populate: PROPERTY_CARD_POPULATE,
    filters: {
      slug: { $ne: property.slug },
      ...(citySlug ? { cities: { slug: { $eq: citySlug } } } : {}),
    },
    pagination: { pageSize: limit },
    sort: ['publishedAt:desc'],
  });

  // Fall back to newest listings when the city has nothing else.
  if (!result?.data?.length && citySlug) {
    const fallback = await fetchOptional<StrapiCollection<Property>>('properties', {
      populate: PROPERTY_CARD_POPULATE,
      filters: { slug: { $ne: property.slug } },
      pagination: { pageSize: limit },
      sort: ['publishedAt:desc'],
    });
    return fallback?.data ?? [];
  }

  return result?.data ?? [];
}

export async function getAllPropertySlugs() {
  const result = await fetchOptional<StrapiCollection<Pick<Property, 'slug' | 'updatedAt'>>>(
    'properties',
    { fields: ['slug', 'updatedAt'], pagination: { pageSize: 200 } }
  );
  return result?.data ?? [];
}

/* ----------------------------------------------------------------- taxonomies */

export async function getCities({ featuredOnly = false } = {}) {
  const result = await fetchOptional<StrapiCollection<City>>('cities', {
    populate: 'image',
    filters: featuredOnly ? { featured: { $eq: true } } : {},
    sort: ['name:asc'],
    pagination: { pageSize: 100 },
  });
  return result?.data ?? [];
}

export async function getPropertyTypes() {
  const result = await fetchOptional<StrapiCollection<PropertyType>>('property-types', {
    sort: ['name:asc'],
    pagination: { pageSize: 100 },
  });
  return result?.data ?? [];
}

export async function getOfferTypes() {
  const result = await fetchOptional<StrapiCollection<OfferType>>('offer-types', {
    sort: ['name:asc'],
    pagination: { pageSize: 100 },
  });
  return result?.data ?? [];
}

/* ------------------------------------------------------------------- services */

export async function getServices() {
  const result = await fetchOptional<StrapiCollection<Service>>('services', {
    populate: { image: true, highlights: true, cta: true },
    sort: ['order:asc'],
    pagination: { pageSize: 50 },
  });
  return result?.data ?? [];
}

export async function getService(slug: string) {
  const result = await fetchOptional<StrapiCollection<Service>>('services', {
    filters: { slug: { $eq: slug } },
    populate: { image: true, highlights: true, cta: true, seo: { populate: 'shareImage' } },
    pagination: { pageSize: 1 },
  });
  return result?.data?.[0] ?? null;
}

/* ---------------------------------------------------------------------- posts */

export async function getPosts(limit = 12) {
  const result = await fetchOptional<StrapiCollection<Post>>('posts', {
    populate: 'coverImage',
    sort: ['publishedAt:desc'],
    pagination: { pageSize: limit },
  });
  return result?.data ?? [];
}

export async function getPost(slug: string) {
  const result = await fetchOptional<StrapiCollection<Post>>('posts', {
    filters: { slug: { $eq: slug } },
    populate: { coverImage: true, seo: { populate: 'shareImage' } },
    pagination: { pageSize: 1 },
  });
  return result?.data?.[0] ?? null;
}

/* ------------------------------------------------------------------ inquiries */

export interface InquiryPayload {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  type?: 'general' | 'property' | 'service' | 'property-request';
  budget?: string;
  preferredLocation?: string;
  property?: string;
  service?: string;
}

/** Posts an inquiry. Errors bubble up so the form can show a retry message. */
export async function submitInquiry(payload: InquiryPayload) {
  const response = await fetch(`${API_URL}/api/inquiries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: payload }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new StrapiError(
      body?.error?.message ?? 'Your message could not be sent. Please try again.',
      response.status
    );
  }

  return response.json();
}
