import type { Metadata } from 'next';

import { Button } from '@/components/ui/Button';

export const metadata: Metadata = {
  title: 'Page Not Found',
  description: 'The page you are looking for does not exist or has been moved.',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <section className="flex min-h-[60vh] items-center py-20">
      <div className="container-page text-center">
        <p className="font-display text-7xl font-bold text-accent-500 sm:text-8xl">404</p>

        <h1 className="mt-4 text-3xl text-brand-950 sm:text-4xl">Page not found</h1>

        <p className="mx-auto mt-4 max-w-md text-brand-600">
          The page you are looking for does not exist, or it may have been moved. Try one of the
          links below.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Button href="/" size="lg">
            Back to home
          </Button>
          <Button href="/properties" variant="secondary" size="lg">
            Browse properties
          </Button>
          <Button href="/contact" variant="secondary" size="lg">
            Contact us
          </Button>
        </div>
      </div>
    </section>
  );
}
