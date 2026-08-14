import { Bath, BedDouble, Check, MapPin, Maximize, Phone, Toilet } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { PropertyCard } from '@/components/property/PropertyCard';
import { PropertyGallery } from '@/components/property/PropertyGallery';
import { InquiryForm } from '@/components/shared/InquiryForm';
import { Badge } from '@/components/ui/Badge';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/Button';
import {
  getAllPropertySlugs,
  getGlobal,
  getProperty,
  getRelatedProperties,
  mediaUrl,
} from '@/lib/strapi';
import { absoluteUrl, altText, formatPrice, paragraphs, telLink, whatsappLink } from '@/lib/utils';
import type { Property } from '@/types/strapi';

export const revalidate = 300;

interface PageProps {
  params: Promise<{ slug: string }>;
}

/** Pre-render known listings; new ones are generated on first request. */
export async function generateStaticParams() {
  const entries = await getAllPropertySlugs();
  return entries.map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const property = await getProperty(slug);

  if (!property) {
    return { title: 'Property not found' };
  }

  const title = property.seo?.metaTitle || property.title;
  const description =
    property.seo?.metaDescription || property.excerpt || `${property.title} — available through Sholem Properties.`;
  const image = mediaUrl(property.seo?.shareImage?.url ?? property.featuredImage?.url);

  return {
    title,
    description,
    alternates: { canonical: `/properties/${property.slug}` },
    openGraph: {
      title,
      description,
      type: 'article',
      url: absoluteUrl(`/properties/${property.slug}`),
      images: image ? [{ url: image, alt: property.title }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

const STATUS_LABELS: Record<string, { label: string; tone: 'success' | 'muted' | 'accent' }> = {
  available: { label: 'Available', tone: 'success' },
  'sold-out': { label: 'Sold Out', tone: 'muted' },
  'coming-soon': { label: 'Coming Soon', tone: 'accent' },
};

export default async function PropertyDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const property = await getProperty(slug);

  if (!property) notFound();

  const [global, related] = await Promise.all([
    getGlobal(),
    getRelatedProperties(property, 3),
  ]);

  const images = buildGalleryImages(property);
  const status = property.status ? STATUS_LABELS[property.status] : undefined;
  const location = [property.address, property.cities?.[0]?.name].filter(Boolean).join(', ');
  const enquiryMessage = `Hello Sholem Properties, I am interested in ${property.title}.`;

  const specs = [
    property.bedrooms ? { icon: BedDouble, label: 'Bedrooms', value: property.bedrooms } : null,
    property.bathrooms ? { icon: Bath, label: 'Bathrooms', value: property.bathrooms } : null,
    property.toilets ? { icon: Toilet, label: 'Toilets', value: property.toilets } : null,
    property.plotSize ? { icon: Maximize, label: 'Plot size', value: property.plotSize } : null,
  ].filter(Boolean) as Array<{ icon: typeof BedDouble; label: string; value: string | number }>;

  return (
    <>
      {/* Rich result for the listing. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd(property, images[0]?.url)) }}
      />

      <div className="border-b border-brand-100 bg-brand-50">
        <div className="container-page py-4">
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: 'Properties', href: '/properties' },
              { label: property.title },
            ]}
          />
        </div>
      </div>

      <article className="py-10 sm:py-14">
        <div className="container-page">
          <header className="mb-8">
            <div className="flex flex-wrap items-center gap-2">
              {status ? <Badge tone={status.tone}>{status.label}</Badge> : null}
              {property.offerTypes?.map((offer) => (
                <Badge key={offer.id} tone="brand">
                  {offer.name}
                </Badge>
              ))}
              {property.propertyTypes?.map((type) => (
                <Badge key={type.id} tone="brand">
                  {type.name}
                </Badge>
              ))}
            </div>

            <h1 className="mt-4 text-3xl text-brand-950 sm:text-4xl">{property.title}</h1>

            {location ? (
              <p className="mt-3 flex items-center gap-2 text-brand-600">
                <MapPin className="h-4 w-4 shrink-0 text-accent-600" aria-hidden="true" />
                {location}
              </p>
            ) : null}

            <p className="mt-4 font-display text-3xl font-bold text-accent-600">
              {formatPrice(property.price)}
            </p>
          </header>

          {images.length ? <PropertyGallery images={images} title={property.title} /> : null}

          <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_380px]">
            {/* ---------- Main column ---------- */}
            <div className="min-w-0">
              {specs.length ? (
                <dl className="grid grid-cols-2 gap-4 rounded-2xl border border-brand-100 bg-white p-6 shadow-card sm:grid-cols-4">
                  {specs.map(({ icon: SpecIcon, label, value }) => (
                    <div key={label} className="text-center">
                      <SpecIcon className="mx-auto h-6 w-6 text-accent-600" aria-hidden="true" />
                      <dd className="mt-2 font-display text-xl font-bold text-brand-950">{value}</dd>
                      <dt className="text-xs text-brand-500">{label}</dt>
                    </div>
                  ))}
                </dl>
              ) : null}

              {property.description ? (
                <section className="mt-10">
                  <h2 className="text-2xl text-brand-950">About this property</h2>
                  <div className="mt-4 space-y-4 leading-relaxed text-brand-700">
                    {paragraphs(property.description).map((text, index) => (
                      <p key={index}>{text}</p>
                    ))}
                  </div>
                </section>
              ) : null}

              {property.features?.length ? (
                <section className="mt-10">
                  <h2 className="text-2xl text-brand-950">Features &amp; amenities</h2>
                  <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                    {property.features.map((feature) => (
                      <li key={feature.id} className="flex items-start gap-2 text-brand-700">
                        <Check
                          className="mt-0.5 h-5 w-5 shrink-0 text-accent-600"
                          aria-hidden="true"
                        />
                        {feature.name}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {property.extraSpecs?.length ? (
                <section className="mt-10">
                  <h2 className="text-2xl text-brand-950">Specifications</h2>
                  <dl className="mt-4 divide-y divide-brand-100 overflow-hidden rounded-2xl border border-brand-100">
                    {property.extraSpecs.map((spec) => (
                      <div key={spec.label} className="flex justify-between gap-4 bg-white px-5 py-3">
                        <dt className="text-sm font-medium text-brand-600">{spec.label}</dt>
                        <dd className="text-sm font-semibold text-brand-950">{spec.value}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ) : null}

              {property.landmarks?.length ? (
                <section className="mt-10">
                  <h2 className="text-2xl text-brand-950">Nearby landmarks</h2>
                  <dl className="mt-4 divide-y divide-brand-100 overflow-hidden rounded-2xl border border-brand-100">
                    {property.landmarks.map((landmark) => (
                      <div
                        key={landmark.label}
                        className="flex justify-between gap-4 bg-white px-5 py-3"
                      >
                        <dt className="text-sm font-medium text-brand-600">{landmark.label}</dt>
                        <dd className="text-sm font-semibold text-brand-950">{landmark.value}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ) : null}

              {property.latitude && property.longitude ? (
                <section className="mt-10">
                  <h2 className="text-2xl text-brand-950">Location</h2>
                  <div className="mt-4 overflow-hidden rounded-2xl border border-brand-100">
                    <iframe
                      title={`Map showing ${property.title}`}
                      src={`https://maps.google.com/maps?q=${property.latitude},${property.longitude}&z=15&output=embed`}
                      className="h-[360px] w-full border-0"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                </section>
              ) : null}
            </div>

            {/* ---------- Sticky enquiry rail ---------- */}
            <aside className="lg:sticky lg:top-28 lg:self-start">
              <div className="rounded-2xl border border-brand-100 bg-white p-6 shadow-card">
                <h2 className="text-xl text-brand-950">Enquire about this property</h2>
                <p className="mt-2 text-sm text-brand-600">
                  Speak with our team for pricing, inspection dates and payment plans.
                </p>

                <div className="mt-5 flex flex-col gap-3">
                  <Button
                    href={whatsappLink(global, enquiryMessage)}
                    variant="whatsapp"
                    external
                    className="w-full"
                  >
                    Chat on WhatsApp
                  </Button>
                  {global?.phonePrimary ? (
                    <Button
                      href={telLink(global.phonePrimary)}
                      variant="secondary"
                      className="w-full"
                    >
                      <Phone className="h-4 w-4" aria-hidden="true" />
                      {global.phonePrimary}
                    </Button>
                  ) : null}
                </div>

                <div className="mt-6 border-t border-brand-100 pt-6">
                  <InquiryForm
                    type="property"
                    propertyId={property.documentId}
                    subject={property.title}
                    global={global}
                  />
                </div>
              </div>
            </aside>
          </div>

          {related.length ? (
            <section className="mt-16 border-t border-brand-100 pt-12">
              <h2 className="text-2xl text-brand-950">Similar properties</h2>
              <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((item) => (
                  <PropertyCard key={item.id} property={item} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </article>
    </>
  );
}

/** Featured image first, then the gallery, skipping anything without a URL. */
function buildGalleryImages(property: Property) {
  const media = [property.featuredImage, ...(property.gallery ?? [])];
  const seen = new Set<string>();

  return media.flatMap((item) => {
    const url = mediaUrl(item?.url);
    if (!url || seen.has(url)) return [];
    seen.add(url);
    return [{ url, alt: altText(item, property.title) }];
  });
}

function buildJsonLd(property: Property, image?: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: property.title,
    description: property.excerpt ?? undefined,
    url: absoluteUrl(`/properties/${property.slug}`),
    image: image ? [image] : undefined,
    ...(property.price
      ? {
          offers: {
            '@type': 'Offer',
            price: property.price,
            priceCurrency: 'NGN',
            availability:
              property.status === 'sold-out'
                ? 'https://schema.org/SoldOut'
                : 'https://schema.org/InStock',
          },
        }
      : {}),
    ...(property.address || property.cities?.[0]
      ? {
          address: {
            '@type': 'PostalAddress',
            streetAddress: property.address ?? undefined,
            addressLocality: property.cities?.[0]?.name,
            addressCountry: 'NG',
          },
        }
      : {}),
    ...(property.latitude && property.longitude
      ? {
          geo: {
            '@type': 'GeoCoordinates',
            latitude: property.latitude,
            longitude: property.longitude,
          },
        }
      : {}),
  };
}
