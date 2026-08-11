/**
 * Shapes returned by the Strapi 5 content API.
 *
 * Strapi 5 flattens attributes onto the entity itself (no more `.attributes`),
 * so these mirror the JSON one-for-one.
 */

export interface StrapiPagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface StrapiCollection<T> {
  data: T[];
  meta: { pagination: StrapiPagination };
}

export interface StrapiSingle<T> {
  data: T;
  meta: Record<string, unknown>;
}

export interface StrapiMedia {
  id: number;
  documentId: string;
  name: string;
  alternativeText: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  url: string;
  formats: Record<string, { url: string; width: number; height: number }> | null;
}

interface Entity {
  id: number;
  documentId: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

/* ----------------------------------------------------------------- components */

export interface Seo {
  metaTitle: string | null;
  metaDescription: string | null;
  keywords?: string | null;
  shareImage?: StrapiMedia | null;
  noIndex?: boolean;
}

export interface Cta {
  label: string;
  href: string;
  style?: 'primary' | 'secondary' | 'outline' | 'link';
}

export interface Stat {
  value: string;
  label: string;
}

export interface FeatureItem {
  title: string;
  description: string | null;
  icon?: string | null;
}

export interface SpecItem {
  label: string;
  value: string;
}

export interface SocialLink {
  platform: string;
  url: string;
}

export interface Hero {
  eyebrow?: string | null;
  title: string;
  subtitle?: string | null;
  backgroundImage?: StrapiMedia | null;
  primaryCta?: Cta | null;
  secondaryCta?: Cta | null;
}

/* --------------------------------------------------------------- collections */

export interface Taxonomy extends Entity {
  name: string;
  slug: string;
  description: string | null;
}

export interface City extends Taxonomy {
  image?: StrapiMedia | null;
  featured?: boolean;
}

export type PropertyType = Taxonomy;
export type OfferType = Taxonomy;
export type Feature = Taxonomy;

export interface Property extends Entity {
  title: string;
  slug: string;
  price: number | string | null;
  excerpt: string | null;
  description: string | null;
  featuredImage?: StrapiMedia | null;
  gallery?: StrapiMedia[];
  bedrooms: number | null;
  bathrooms: number | null;
  toilets: number | null;
  plotSize: string | null;
  address: string | null;
  featured?: boolean;
  status?: 'available' | 'sold-out' | 'coming-soon';
  latitude?: number | null;
  longitude?: number | null;
  landmarks?: SpecItem[];
  extraSpecs?: SpecItem[];
  propertyTypes?: PropertyType[];
  offerTypes?: OfferType[];
  cities?: City[];
  features?: Feature[];
  seo?: Seo | null;
}

export interface Service extends Entity {
  title: string;
  slug: string;
  summary: string | null;
  description: string | null;
  icon: string | null;
  image?: StrapiMedia | null;
  order: number | null;
  featured?: boolean;
  highlights?: FeatureItem[];
  cta?: Cta | null;
  seo?: Seo | null;
}

export interface Post extends Entity {
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  coverImage?: StrapiMedia | null;
  author: string | null;
  seo?: Seo | null;
}

/* -------------------------------------------------------------- single types */

export interface Global extends Entity {
  siteName: string;
  legalName: string | null;
  rcNumber: string | null;
  tagline: string | null;
  description: string | null;
  logo?: StrapiMedia | null;
  phonePrimary: string | null;
  phoneSecondary: string | null;
  email: string | null;
  whatsappNumber: string | null;
  officeAddress: string | null;
  mapEmbedUrl: string | null;
  officeHours: string | null;
  footerAbout: string | null;
  socials?: SocialLink[];
  defaultSeo?: Seo | null;
}

export interface Homepage extends Entity {
  hero?: Hero | null;
  introTitle: string | null;
  introBody: string | null;
  stats?: Stat[];
  featuredPropertiesTitle: string | null;
  featuredPropertiesSubtitle: string | null;
  servicesTitle: string | null;
  servicesSubtitle: string | null;
  locationsTitle: string | null;
  locationsSubtitle: string | null;
  whyChooseTitle: string | null;
  whyChooseSubtitle: string | null;
  whyChooseItems?: FeatureItem[];
  ctaTitle: string | null;
  ctaBody: string | null;
  ctaButton?: Cta | null;
  ctaBackground?: StrapiMedia | null;
  featuredProperties?: Property[];
  featuredServices?: Service[];
  featuredCities?: City[];
  seo?: Seo | null;
}

export interface AboutPage extends Entity {
  title: string | null;
  subtitle: string | null;
  heroImage?: StrapiMedia | null;
  storyTitle: string | null;
  story: string | null;
  visionTitle: string | null;
  vision: string | null;
  missionTitle: string | null;
  mission: string | null;
  valuesTitle: string | null;
  values?: FeatureItem[];
  stats?: Stat[];
  founderName: string | null;
  founderRole: string | null;
  founderBio: string | null;
  founderImage?: StrapiMedia | null;
  seo?: Seo | null;
}
