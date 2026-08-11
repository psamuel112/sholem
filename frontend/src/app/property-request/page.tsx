import { ClipboardList, Handshake, Search } from 'lucide-react';
import type { Metadata } from 'next';

import { InquiryForm } from '@/components/shared/InquiryForm';
import { PageHero } from '@/components/shared/PageHero';
import { getGlobal } from '@/lib/strapi';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Request a Property',
  description:
    'Tell us the property you are looking for — location, type and budget — and our team will source matching options for you.',
  alternates: { canonical: '/property-request' },
};

const STEPS = [
  {
    icon: ClipboardList,
    title: 'Share your brief',
    description: 'Tell us the location, property type and budget you have in mind.',
  },
  {
    icon: Search,
    title: 'We source options',
    description: 'Our team searches our portfolio and verified partner listings.',
  },
  {
    icon: Handshake,
    title: 'Inspect and close',
    description: 'We arrange inspections and guide you through documentation.',
  },
];

export default async function PropertyRequestPage() {
  const global = await getGlobal();

  return (
    <>
      <PageHero
        title="Request a Property"
        subtitle="Cannot find what you are looking for? Send us your requirements and we will do the searching."
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Request a Property' }]}
      />

      <section className="py-14 sm:py-20">
        <div className="container-page">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <h2 className="text-2xl text-brand-950">How it works</h2>
              <ol className="mt-8 space-y-8">
                {STEPS.map((step, index) => (
                  <li key={step.title} className="flex gap-4">
                    <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-100 text-accent-700">
                      <step.icon className="h-6 w-6" aria-hidden="true" />
                      <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-950 text-[11px] font-bold text-white">
                        {index + 1}
                      </span>
                    </span>
                    <div>
                      <h3 className="text-lg text-brand-950">{step.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-brand-600">
                        {step.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-2xl border border-brand-100 bg-white p-6 shadow-card sm:p-8">
              <h2 className="text-2xl text-brand-950">Your requirements</h2>
              <p className="mt-2 text-sm text-brand-600">
                The more detail you give, the better we can match you.
              </p>
              <div className="mt-6">
                <InquiryForm type="property-request" showBudgetFields global={global} />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
