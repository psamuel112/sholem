'use client';

import { Search, SlidersHorizontal, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';

import { cn } from '@/lib/utils';
import type { City, OfferType, PropertyType } from '@/types/strapi';

interface PropertyFiltersProps {
  cities: City[];
  propertyTypes: PropertyType[];
  offerTypes: OfferType[];
}

const SORT_OPTIONS = [
  { label: 'Newest first', value: 'publishedAt:desc' },
  { label: 'Price: low to high', value: 'price:asc' },
  { label: 'Price: high to low', value: 'price:desc' },
  { label: 'Title A–Z', value: 'title:asc' },
];

/**
 * Filter bar for the properties listing.
 *
 * State lives in the URL so results are shareable, bookmarkable and
 * server-rendered; `useTransition` keeps the UI responsive during refetches.
 */
export function PropertyFilters({ cities, propertyTypes, offerTypes }: PropertyFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);

  const currentSearch = searchParams.get('search') ?? '';

  /** Merge a param change into the URL, resetting pagination. */
  const applyFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete('page');

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  const activeCount = ['city', 'type', 'offer', 'search', 'minPrice', 'maxPrice'].filter((key) =>
    searchParams.get(key)
  ).length;

  const clearAll = () => {
    startTransition(() => {
      router.push(pathname, { scroll: false });
    });
  };

  return (
    <div className="rounded-2xl border border-brand-100 bg-white p-4 shadow-card sm:p-5">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          applyFilter('search', String(data.get('search') ?? ''));
        }}
        className="flex flex-col gap-3 sm:flex-row"
      >
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-400"
            aria-hidden="true"
          />
          <input
            type="search"
            name="search"
            defaultValue={currentSearch}
            placeholder="Search by title, location or keyword"
            aria-label="Search properties"
            className="w-full rounded-lg border border-brand-200 py-2.5 pl-9 pr-3 text-sm placeholder:text-brand-400 focus:border-accent-500 focus:outline-none"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            className="flex-1 rounded-lg bg-accent-500 px-5 py-2.5 text-sm font-semibold text-brand-950 transition-colors hover:bg-accent-400 sm:flex-none"
          >
            Search
          </button>

          <button
            type="button"
            onClick={() => setExpanded((open) => !open)}
            aria-expanded={expanded}
            className="inline-flex items-center gap-2 rounded-lg border border-brand-200 px-4 py-2.5 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50 lg:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            Filters
            {activeCount > 0 ? (
              <span className="rounded-full bg-accent-500 px-1.5 text-xs text-brand-950">
                {activeCount}
              </span>
            ) : null}
          </button>
        </div>
      </form>

      <div className={cn('mt-4 gap-3 lg:grid lg:grid-cols-4', expanded ? 'grid' : 'hidden')}>
        <Select
          label="Location"
          value={searchParams.get('city') ?? ''}
          onChange={(value) => applyFilter('city', value)}
          options={cities.map((city) => ({ label: city.name, value: city.slug }))}
          placeholder="All locations"
        />
        <Select
          label="Property type"
          value={searchParams.get('type') ?? ''}
          onChange={(value) => applyFilter('type', value)}
          options={propertyTypes.map((type) => ({ label: type.name, value: type.slug }))}
          placeholder="All types"
        />
        <Select
          label="Offer"
          value={searchParams.get('offer') ?? ''}
          onChange={(value) => applyFilter('offer', value)}
          options={offerTypes.map((offer) => ({ label: offer.name, value: offer.slug }))}
          placeholder="Any offer"
        />
        <Select
          label="Sort by"
          value={searchParams.get('sort') ?? ''}
          onChange={(value) => applyFilter('sort', value)}
          options={SORT_OPTIONS}
          placeholder="Newest first"
        />
      </div>

      {activeCount > 0 ? (
        <div className="mt-4 flex items-center justify-between border-t border-brand-100 pt-3">
          <p className="text-xs text-brand-500" aria-live="polite">
            {isPending ? 'Updating results…' : `${activeCount} filter${activeCount > 1 ? 's' : ''} applied`}
          </p>
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-1 text-xs font-semibold text-accent-600 hover:text-accent-700"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Clear all
          </button>
        </div>
      ) : null}
    </div>
  );
}

interface SelectProps {
  label: string;
  value: string;
  placeholder: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
}

function Select({ label, value, placeholder, options, onChange }: SelectProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-brand-600">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-brand-200 bg-white px-3 py-2.5 text-sm text-brand-800 focus:border-accent-500 focus:outline-none"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
