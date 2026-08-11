import { Bath, BedDouble, MapPin, Maximize } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { Badge } from '@/components/ui/Badge';
import { mediaUrl } from '@/lib/strapi';
import { altText, formatPrice, truncate } from '@/lib/utils';
import type { Property } from '@/types/strapi';

const STATUS_LABELS: Record<string, { label: string; tone: 'success' | 'muted' | 'accent' }> = {
  available: { label: 'Available', tone: 'success' },
  'sold-out': { label: 'Sold Out', tone: 'muted' },
  'coming-soon': { label: 'Coming Soon', tone: 'accent' },
};

interface PropertyCardProps {
  property: Property;
  /** Eager-load images that sit above the fold. */
  priority?: boolean;
}

export function PropertyCard({ property, priority = false }: PropertyCardProps) {
  const image = mediaUrl(property.featuredImage?.url);
  const city = property.cities?.[0]?.name;
  const type = property.propertyTypes?.[0]?.name;
  const status = property.status ? STATUS_LABELS[property.status] : null;
  const href = `/properties/${property.slug}`;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-card transition-shadow duration-300 hover:shadow-card-hover">
      <Link href={href} className="relative block aspect-[4/3] overflow-hidden bg-brand-50">
        {image ? (
          <Image
            src={image}
            alt={altText(property.featuredImage, property.title)}
            fill
            priority={priority}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-brand-300">
            No image available
          </div>
        )}

        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {type ? <Badge tone="overlay">{type}</Badge> : null}
          {status ? <Badge tone={status.tone}>{status.label}</Badge> : null}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        {city ? (
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-brand-500">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-accent-500" aria-hidden="true" />
            {city}
          </p>
        ) : null}

        <h3 className="text-lg leading-snug">
          <Link href={href} className="line-clamp-2 transition-colors hover:text-accent-600">
            {property.title}
          </Link>
        </h3>

        {property.excerpt ? (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-brand-600">
            {truncate(property.excerpt, 110)}
          </p>
        ) : null}

        {/* Specs only render when the listing actually has them (land has none). */}
        {property.bedrooms || property.bathrooms || property.plotSize ? (
          <ul className="mt-4 flex flex-wrap items-center gap-4 text-xs text-brand-600">
            {property.bedrooms ? (
              <li className="flex items-center gap-1.5">
                <BedDouble className="h-4 w-4 text-brand-400" aria-hidden="true" />
                {property.bedrooms} Beds
              </li>
            ) : null}
            {property.bathrooms ? (
              <li className="flex items-center gap-1.5">
                <Bath className="h-4 w-4 text-brand-400" aria-hidden="true" />
                {property.bathrooms} Baths
              </li>
            ) : null}
            {property.plotSize ? (
              <li className="flex items-center gap-1.5">
                <Maximize className="h-4 w-4 text-brand-400" aria-hidden="true" />
                {property.plotSize}
              </li>
            ) : null}
          </ul>
        ) : null}

        <div className="mt-auto flex items-end justify-between gap-3 border-t border-brand-100 pt-4">
          <p className="font-display text-lg font-bold text-brand-900">
            {formatPrice(property.price)}
          </p>
          <Link
            href={href}
            className="text-sm font-semibold text-accent-600 transition-colors hover:text-accent-700"
          >
            View details
            <span className="sr-only"> for {property.title}</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
