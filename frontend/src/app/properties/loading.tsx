import { PropertyGridSkeleton } from '@/components/ui/Skeleton';

/** Shown while the listing fetches from Strapi (filters trigger a refetch). */
export default function Loading() {
  return (
    <>
      <div className="bg-brand-900 py-16 sm:py-20 lg:py-24">
        <div className="container-page">
          <div className="h-10 w-2/3 max-w-md animate-pulse rounded-lg bg-white/10" />
          <div className="mt-4 h-5 w-full max-w-2xl animate-pulse rounded bg-white/10" />
        </div>
      </div>

      <section className="py-12 sm:py-16">
        <div className="container-page">
          <div className="h-24 animate-pulse rounded-2xl bg-brand-50" />
          <div className="mt-8">
            <PropertyGridSkeleton count={6} />
          </div>
        </div>
      </section>
    </>
  );
}
