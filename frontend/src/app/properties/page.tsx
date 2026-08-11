import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

import { PropertyCard } from '@/components/property/PropertyCard';
import { PropertyFilters } from '@/components/property/PropertyFilters';
import { PageHero } from '@/components/shared/PageHero';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { getCities, getOfferTypes, getProperties, getPropertyTypes } from '@/lib/strapi';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Properties for Sale',
  description:
    'Browse verified land, estates and homes for sale across Lagos and Nigeria. Filter by location, property type and price.',
  alternates: { canonical: '/properties' },
};

// Listings change as the sales team publishes; keep them fresh.
export const revalidate = 300;

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PropertiesPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const page = Number(first(params.page)) || 1;
  const city = first(params.city);
  const propertyType = first(params.type);
  const offerType = first(params.offer);
  const search = first(params.search);
  const sort = first(params.sort);

  const [{ properties, pagination }, cities, propertyTypes, offerTypes] = await Promise.all([
    getProperties({ page, pageSize: 12, city, propertyType, offerType, search, sort }),
    getCities(),
    getPropertyTypes(),
    getOfferTypes(),
  ]);

  const activeCity = cities.find((c) => c.slug === city);
  const hasFilters = Boolean(city || propertyType || offerType || search);

  return (
    <>
      <PageHero
        title={activeCity ? `Properties in ${activeCity.name}` : 'Our Properties'}
        subtitle="Verified titles, prime locations and strong capital appreciation. Find the property that fits your goals."
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Properties' }]}
      />

      <section className="py-12 sm:py-16">
        <div className="container-page">
          <Suspense fallback={<div className="h-24 rounded-2xl bg-brand-50" />}>
            <PropertyFilters cities={cities} propertyTypes={propertyTypes} offerTypes={offerTypes} />
          </Suspense>

          <p className="mt-6 text-sm text-brand-600" aria-live="polite">
            {pagination.total > 0
              ? `Showing ${properties.length} of ${pagination.total} propert${pagination.total === 1 ? 'y' : 'ies'}`
              : 'No properties found'}
          </p>

          {properties.length ? (
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {properties.map((property, index) => (
                <PropertyCard key={property.id} property={property} priority={index < 3} />
              ))}
            </div>
          ) : (
            <div className="mt-6">
              <EmptyState
                title={hasFilters ? 'No properties match your filters' : 'No properties listed yet'}
                description={
                  hasFilters
                    ? 'Try widening your search, or contact us and we will source options for you.'
                    : 'New listings are added regularly. Please check back soon.'
                }
                action={
                  <div className="flex flex-wrap justify-center gap-3">
                    {hasFilters ? (
                      <Button href="/properties" variant="secondary">
                        Clear filters
                      </Button>
                    ) : null}
                    <Button href="/contact">Request a property</Button>
                  </div>
                }
              />
            </div>
          )}

          {pagination.pageCount > 1 ? (
            <Pagination
              currentPage={pagination.page}
              pageCount={pagination.pageCount}
              params={params}
            />
          ) : null}
        </div>
      </section>
    </>
  );
}

interface PaginationProps {
  currentPage: number;
  pageCount: number;
  params: Record<string, string | string[] | undefined>;
}

/** Server-rendered pagination that preserves the active filters. */
function Pagination({ currentPage, pageCount, params }: PaginationProps) {
  const hrefFor = (page: number) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      const single = Array.isArray(value) ? value[0] : value;
      if (single && key !== 'page') query.set(key, single);
    }
    if (page > 1) query.set('page', String(page));
    const qs = query.toString();
    return qs ? `/properties?${qs}` : '/properties';
  };

  const pages = Array.from({ length: pageCount }, (_, i) => i + 1);

  return (
    <nav aria-label="Pagination" className="mt-12 flex justify-center">
      <ul className="flex flex-wrap items-center gap-2">
        <li>
          <PageLink
            href={hrefFor(currentPage - 1)}
            disabled={currentPage <= 1}
            label="Previous page"
          >
            Previous
          </PageLink>
        </li>

        {pages.map((page) => (
          <li key={page}>
            <Link
              href={hrefFor(page)}
              aria-current={page === currentPage ? 'page' : undefined}
              aria-label={`Page ${page}`}
              className={cn(
                'flex h-10 min-w-10 items-center justify-center rounded-lg px-3 text-sm font-semibold transition-colors',
                page === currentPage
                  ? 'bg-accent-500 text-brand-950'
                  : 'border border-brand-200 text-brand-700 hover:bg-brand-50'
              )}
            >
              {page}
            </Link>
          </li>
        ))}

        <li>
          <PageLink
            href={hrefFor(currentPage + 1)}
            disabled={currentPage >= pageCount}
            label="Next page"
          >
            Next
          </PageLink>
        </li>
      </ul>
    </nav>
  );
}

function PageLink({
  href,
  disabled,
  label,
  children,
}: {
  href: string;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  const classes =
    'flex h-10 items-center justify-center rounded-lg border border-brand-200 px-4 text-sm font-semibold';

  if (disabled) {
    return (
      <span aria-disabled="true" className={cn(classes, 'cursor-not-allowed text-brand-300')}>
        {children}
      </span>
    );
  }

  return (
    <Link href={href} aria-label={label} className={cn(classes, 'text-brand-700 hover:bg-brand-50')}>
      {children}
    </Link>
  );
}
