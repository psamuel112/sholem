import Image from 'next/image';

import { Breadcrumbs, type Crumb } from '@/components/ui/Breadcrumbs';

interface PageHeroProps {
  title: string;
  subtitle?: string | null;
  image?: string | null;
  imageAlt?: string;
  crumbs?: Crumb[];
}

/** Banner shown at the top of every interior page. */
export function PageHero({ title, subtitle, image, imageAlt, crumbs }: PageHeroProps) {
  return (
    <>
      <section className="relative isolate overflow-hidden bg-brand-900 py-16 sm:py-20 lg:py-24">
        {image ? (
          <>
            <Image
              src={image}
              alt={imageAlt ?? ''}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
            <div
              className="absolute inset-0 bg-gradient-to-r from-brand-950/90 to-brand-900/70"
              aria-hidden="true"
            />
          </>
        ) : null}

        <div className="container-page relative">
          <h1 className="max-w-3xl text-3xl text-white sm:text-4xl lg:text-5xl">{title}</h1>
          {subtitle ? (
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-brand-100 sm:text-lg">
              {subtitle}
            </p>
          ) : null}
        </div>
      </section>

      {crumbs?.length ? (
        <div className="border-b border-brand-100 bg-brand-50">
          <div className="container-page py-4">
            <Breadcrumbs items={crumbs} />
          </div>
        </div>
      ) : null}
    </>
  );
}
