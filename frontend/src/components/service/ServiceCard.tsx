import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { Icon } from '@/components/ui/Icon';
import { mediaUrl } from '@/lib/strapi';
import { altText, truncate } from '@/lib/utils';
import type { Service } from '@/types/strapi';

/**
 * Service teaser. Falls back to an icon tile when no image is uploaded, so a
 * half-filled CMS entry still renders cleanly.
 */
export function ServiceCard({ service }: { service: Service }) {
  const image = mediaUrl(service.image?.url);
  const href = `/services/${service.slug}`;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-card transition-shadow duration-300 hover:shadow-card-hover">
      <Link href={href} className="relative block aspect-[16/10] overflow-hidden bg-brand-900">
        {image ? (
          <Image
            src={image}
            alt={altText(service.image, service.title)}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover opacity-90 transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Icon name={service.icon} className="h-14 w-14 text-accent-400" strokeWidth={1.5} />
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-6">
        <div className="mb-3 flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-50 text-accent-600">
            <Icon name={service.icon} className="h-5 w-5" />
          </span>
          <h3 className="text-lg leading-snug">
            <Link href={href} className="transition-colors hover:text-accent-600">
              {service.title}
            </Link>
          </h3>
        </div>

        {service.summary ? (
          <p className="line-clamp-3 text-sm leading-relaxed text-brand-600">
            {truncate(service.summary, 150)}
          </p>
        ) : null}

        <Link
          href={href}
          className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-semibold text-accent-600 transition-colors hover:text-accent-700"
        >
          Learn more
          <span className="sr-only"> about {service.title}</span>
          <ArrowRight
            className="h-4 w-4 transition-transform group-hover:translate-x-1"
            aria-hidden="true"
          />
        </Link>
      </div>
    </article>
  );
}
