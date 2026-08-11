import type { Global, StrapiMedia } from '@/types/strapi';

/** Join class names, dropping falsy values. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Format a Naira price for display.
 *
 * Strapi returns decimals as strings, and some listings have no price
 * ("Price on request"), so both cases are handled here.
 */
export function formatPrice(price: number | string | null | undefined): string {
  if (price === null || price === undefined || price === '') return 'Price on request';

  const value = typeof price === 'string' ? Number(price) : price;
  if (!Number.isFinite(value) || value <= 0) return 'Price on request';

  return `₦${new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 }).format(value)}`;
}

/** Shorten large prices for tight spaces: 91,000,000 -> ₦91M. */
export function formatPriceCompact(price: number | string | null | undefined): string {
  if (price === null || price === undefined || price === '') return 'On request';
  const value = typeof price === 'string' ? Number(price) : price;
  if (!Number.isFinite(value) || value <= 0) return 'On request';

  if (value >= 1_000_000_000) return `₦${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
  if (value >= 1_000_000) return `₦${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (value >= 1_000) return `₦${Math.round(value / 1_000)}K`;
  return `₦${value}`;
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** Best available alt text for a Strapi image. */
export function altText(media: StrapiMedia | null | undefined, fallback: string): string {
  return media?.alternativeText?.trim() || fallback;
}

/** Truncate at a word boundary. */
export function truncate(text: string | null | undefined, max = 160): string {
  if (!text) return '';
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, clean.lastIndexOf(' ', max))}…`;
}

/** Split a plain-text field from Strapi into paragraphs. */
export function paragraphs(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split(/\n{2,}|\r\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * Build a WhatsApp click-to-chat link with a prefilled message.
 * Falls back to the bare number when no message is supplied.
 */
export function whatsappLink(
  numberOrGlobal: string | Global | null | undefined,
  message?: string
): string {
  const raw =
    typeof numberOrGlobal === 'string'
      ? numberOrGlobal
      : (numberOrGlobal?.whatsappNumber ?? numberOrGlobal?.phonePrimary ?? '');

  const digits = raw.replace(/\D/g, '');
  if (!digits) return '#';

  const base = `https://wa.me/${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/** `tel:` href from a display phone number. */
export function telLink(phone: string | null | undefined): string {
  const digits = (phone ?? '').replace(/[^\d+]/g, '');
  return digits ? `tel:${digits}` : '#';
}

/** Absolute URL for canonical tags and OG metadata. */
export function absoluteUrl(path = ''): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
