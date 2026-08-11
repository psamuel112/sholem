import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';

import { ServiceCard } from '@/components/service/ServiceCard';
import { PageHero } from '@/components/shared/PageHero';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { getGlobal, getServices } from '@/lib/strapi';
import { whatsappLink } from '@/lib/utils';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Our Services',
  description:
    'Property sales, brokerage, real estate consultancy, facility management and property development services from TPI Homes.',
  alternates: { canonical: '/services' },
};

export default async function ServicesPage() {
  const [services, global] = await Promise.all([getServices(), getGlobal()]);

  return (
    <>
      <PageHero
        title="Our Services"
        subtitle="End-to-end real estate solutions — from finding the right property to managing it for the long term."
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Services' }]}
      />

      <section className="py-14 sm:py-20">
        <div className="container-page">
          {services.length ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Services coming soon"
              description="We are updating our service catalogue. Please contact us in the meantime."
              action={<Button href="/contact">Contact us</Button>}
            />
          )}
        </div>
      </section>

      <section className="bg-brand-950 py-16">
        <div className="container-page text-center">
          <h2 className="text-3xl text-white">Not sure which service you need?</h2>
          <p className="mx-auto mt-3 max-w-xl text-brand-200">
            Tell us your goal and our consultants will recommend the right approach.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button href="/contact" size="lg">
              Talk to a consultant
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              href={whatsappLink(global, 'Hello TPI Homes, I would like to discuss your services.')}
              variant="whatsapp"
              size="lg"
              external
            >
              Chat on WhatsApp
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
