'use client';

import { RefreshCw } from 'lucide-react';
import { useEffect } from 'react';

import { Button } from '@/components/ui/Button';

/**
 * Route-level error boundary.
 *
 * Most failures here come from Strapi being unreachable, so the copy points at
 * retrying rather than implying the page is gone for good.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="flex min-h-[60vh] items-center py-20">
      <div className="container-page text-center">
        <h1 className="text-3xl text-brand-950 sm:text-4xl">Something went wrong</h1>

        <p className="mx-auto mt-4 max-w-md text-brand-600">
          We could not load this page. Please try again — if the problem persists, contact us and we
          will help.
        </p>

        {error.digest ? (
          <p className="mt-3 text-xs text-brand-400">Reference: {error.digest}</p>
        ) : null}

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Button onClick={reset} size="lg">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Try again
          </Button>
          <Button href="/" variant="secondary" size="lg">
            Back to home
          </Button>
        </div>
      </div>
    </section>
  );
}
