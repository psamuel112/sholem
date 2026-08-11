import { Check } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';

import { ServiceCard } from '@/components/service/ServiceCard';
import { InquiryForm } from '@/components/shared/InquiryForm';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { getGlobal, getService, getServices, mediaUrl } from '@/lib/strapi';
import { absoluteUrl, altText, paragraphs, whatsappLink } from '@/lib/utils';

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const services = await getServices();
  return services.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const service = await getService(slug);

  if (!service) return { title: 'Service not found' };

  const title = service.seo?.metaTitle || service.title;
  const description =
    service.seo?.metaDescription || service.summary || `${service.title} from TPI Homes.`;
  const image = mediaUrl(service.seo?.shareImage?.url ?? service.image?.url);

  return {
    title,
    description,
    alternates: { canonical: `/services/${service.slug}` },
    openGraph: {
      title,
      description,
      url: absoluteUrl(`/services/${service.slug}`),
      images: image ? [{ url: image, alt: service.title }] : undefined,
    },
  };
}

export default async function ServiceDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const service = await getService(slug);

  if (!service) notFound();

  const [global, allServices] = await Promise.all([getGlobal(), getServices()]);

  const image = mediaUrl(service.image?.url);
  const others = allServices.filter((item) => item.slug !== service.slug).slice(0, 3);
  const enquiryMessage = `Hello TPI Homes, I would like to know more about your ${service.title} service.`;

  return (
    <>
      <div className="border-b border-brand-100 bg-brand-50">
        <div className="container-page py-4">
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: 'Services', href: '/services' },
              { label: service.title },
            ]}
          />
        </div>
      </div>

      <article className="py-12 sm:py-16">
        <div className="container-page">
          <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
            <div className="min-w-0">
              <header>
                <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-100 text-accent-700">
                  <Icon name={service.icon} className="h-7 w-7" />
                </span>
                <h1 className="text-3xl text-brand-950 sm:text-4xl">{service.title}</h1>
                {service.summary ? (
                  <p className="mt-4 text-lg leading-relaxed text-brand-600">{service.summary}</p>
                ) : null}
              </header>

              {image ? (
                <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-2xl bg-brand-100">
                  <Image
                    src={image}
                    alt={altText(service.image, service.title)}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 60vw"
                    className="object-cover"
                  />
                </div>
              ) : null}

              {service.description ? (
                <div className="mt-10 space-y-4 leading-relaxed text-brand-700">
                  {paragraphs(service.description).map((text, index) => (
                    <p key={index}>{text}</p>
                  ))}
                </div>
              ) : null}

              {service.highlights?.length ? (
                <section className="mt-10">
                  <h2 className="text-2xl text-brand-950">What&rsquo;s included</h2>
                  <ul className="mt-5 grid gap-4 sm:grid-cols-2">
                    {service.highlights.map((highlight) => (
                      <li
                        key={highlight.title}
                        className="rounded-2xl border border-brand-100 bg-white p-5 shadow-card"
                      >
                        <h3 className="flex items-start gap-2 font-semibold text-brand-950">
                          <Check
                            className="mt-0.5 h-5 w-5 shrink-0 text-accent-600"
                            aria-hidden="true"
                          />
                          {highlight.title}
                        </h3>
                        {highlight.description ? (
                          <p className="mt-2 pl-7 text-sm leading-relaxed text-brand-600">
                            {highlight.description}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {service.cta?.label ? (
                <div className="mt-10 rounded-2xl bg-brand-900 p-8 text-center">
                  <p className="text-lg text-white">Ready to get started?</p>
                  <Button href={service.cta.href || '/contact'} size="lg" className="mt-4">
                    {service.cta.label}
                  </Button>
                </div>
              ) : null}
            </div>

            {/* ---------- Enquiry rail ---------- */}
            <aside className="lg:sticky lg:top-28 lg:self-start">
              <div className="rounded-2xl border border-brand-100 bg-white p-6 shadow-card">
                <h2 className="text-xl text-brand-950">Request this service</h2>
                <p className="mt-2 text-sm text-brand-600">
                  Send us a few details and a consultant will reach out.
                </p>

                <Button
                  href={whatsappLink(global, enquiryMessage)}
                  variant="whatsapp"
                  external
                  className="mt-5 w-full"
                >
                  Chat on WhatsApp
                </Button>

                <div className="mt-6 border-t border-brand-100 pt-6">
                  <InquiryForm
                    type="service"
                    serviceId={service.documentId}
                    subject={service.title}
                    global={global}
                  />
                </div>
              </div>
            </aside>
          </div>

          {others.length ? (
            <section className="mt-16 border-t border-brand-100 pt-12">
              <h2 className="text-2xl text-brand-950">Other services</h2>
              <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {others.map((item) => (
                  <ServiceCard key={item.id} service={item} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </article>
    </>
  );
}
