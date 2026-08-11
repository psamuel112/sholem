import { ArrowRight, MapPin } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { PropertyCard } from '@/components/property/PropertyCard';
import { ServiceCard } from '@/components/service/ServiceCard';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { Section, SectionHeading } from '@/components/ui/Section';
import {
  getCities,
  getGlobal,
  getHomepage,
  getProperties,
  getServices,
  mediaUrl,
} from '@/lib/strapi';
import { altText, whatsappLink } from '@/lib/utils';
import type { Property } from '@/types/strapi';

// Homepage content changes rarely; revalidate hourly so CMS edits appear
// without a redeploy.
export const revalidate = 3600;

export default async function HomePage() {
  const [home, global, services, cities, propertyResult] = await Promise.all([
    getHomepage(),
    getGlobal(),
    getServices(),
    getCities({ featuredOnly: true }),
    getProperties({ pageSize: 6, sort: 'publishedAt:desc' }),
  ]);

  // Editors can hand-pick featured properties; otherwise show the newest.
  const featuredProperties = home?.featuredProperties?.length
    ? home.featuredProperties
    : propertyResult.properties;

  const featuredServices = home?.featuredServices?.length
    ? home.featuredServices
    : services.slice(0, 6);

  const hero = home?.hero;
  const heroImage = mediaUrl(hero?.backgroundImage?.url);
  const ctaBackground = mediaUrl(home?.ctaBackground?.url);

  return (
    <>
      {/* ---------- Hero ---------- */}
      <section className="relative isolate flex min-h-[560px] items-center overflow-hidden bg-brand-950 lg:min-h-[680px]">
        {heroImage ? (
          <Image
            src={heroImage}
            alt={altText(hero?.backgroundImage, 'TPI Homes property')}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : null}
        <div
          className="absolute inset-0 bg-gradient-to-r from-brand-950/95 via-brand-950/80 to-brand-950/40"
          aria-hidden="true"
        />

        <div className="container-page relative py-20 lg:py-28">
          <div className="max-w-2xl">
            {hero?.eyebrow ? (
              <p className="mb-4 inline-flex rounded-full bg-accent-500/15 px-4 py-1.5 text-sm font-semibold text-accent-300">
                {hero.eyebrow}
              </p>
            ) : null}

            <h1 className="text-4xl text-white sm:text-5xl lg:text-6xl">
              {hero?.title ?? 'Your Trusted Partner in Real Estate'}
            </h1>

            {hero?.subtitle ? (
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-brand-100">
                {hero.subtitle}
              </p>
            ) : null}

            <div className="mt-8 flex flex-wrap gap-4">
              <Button href={hero?.primaryCta?.href ?? '/properties'} size="lg">
                {hero?.primaryCta?.label ?? 'Browse Properties'}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button href={hero?.secondaryCta?.href ?? '/contact'} variant="white" size="lg">
                {hero?.secondaryCta?.label ?? 'Talk to an Agent'}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Intro + stats ---------- */}
      {home?.introTitle || home?.stats?.length ? (
        <Section>
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <SectionHeading
                eyebrow="About TPI Homes"
                title={home?.introTitle ?? 'Become A Property Owner Today'}
                subtitle={home?.introBody}
                align="left"
              />
              <Button href="/about" variant="secondary" className="mt-8">
                Learn more about us
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>

            {home?.stats?.length ? (
              <dl className="grid grid-cols-2 gap-4 sm:gap-6">
                {home.stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-brand-100 bg-white p-6 text-center shadow-card"
                  >
                    <dt className="sr-only">{stat.label}</dt>
                    <dd>
                      <span className="block font-display text-3xl font-bold text-accent-600 sm:text-4xl">
                        {stat.value}
                      </span>
                      <span className="mt-2 block text-sm text-brand-600">{stat.label}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        </Section>
      ) : null}

      {/* ---------- Featured properties ---------- */}
      <Section className="bg-brand-50">
        <SectionHeading
          eyebrow="Our Listings"
          title={home?.featuredPropertiesTitle ?? 'Featured Properties'}
          subtitle={home?.featuredPropertiesSubtitle}
        />

        {featuredProperties.length ? (
          <>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featuredProperties.slice(0, 6).map((property: Property, index: number) => (
                <PropertyCard key={property.id} property={property} priority={index < 3} />
              ))}
            </div>
            <div className="mt-12 text-center">
              <Button href="/properties" size="lg">
                View all properties
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </>
        ) : (
          <div className="mt-12">
            <EmptyState
              title="No properties listed yet"
              description="New listings are added regularly. Please check back soon or contact us for off-market options."
              action={<Button href="/contact">Contact us</Button>}
            />
          </div>
        )}
      </Section>

      {/* ---------- Services ---------- */}
      <Section>
        <SectionHeading
          eyebrow="Our Services"
          title={home?.servicesTitle ?? 'What We Do'}
          subtitle={home?.servicesSubtitle}
        />

        {featuredServices.length ? (
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredServices.slice(0, 6).map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        ) : (
          <div className="mt-12">
            <EmptyState title="Services coming soon" />
          </div>
        )}
      </Section>

      {/* ---------- Why choose us ---------- */}
      {home?.whyChooseItems?.length ? (
        <Section className="bg-brand-900">
          <SectionHeading
            eyebrow="Why Choose Us"
            title={home.whyChooseTitle ?? 'Why Choose TPI Homes'}
            subtitle={home.whyChooseSubtitle}
            tone="light"
          />

          <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {home.whyChooseItems.map((item) => (
              <li
                key={item.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
              >
                <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-500/15 text-accent-400">
                  <Icon name={item.icon} className="h-6 w-6" />
                </span>
                <h3 className="text-lg text-white">{item.title}</h3>
                {item.description ? (
                  <p className="mt-2 text-sm leading-relaxed text-brand-200">{item.description}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {/* ---------- Locations ---------- */}
      {cities.length ? (
        <Section className="bg-brand-50">
          <SectionHeading
            eyebrow="Where We Operate"
            title={home?.locationsTitle ?? 'Top Locations'}
            subtitle={home?.locationsSubtitle}
          />

          <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {cities.map((city) => {
              const cityImage = mediaUrl(city.image?.url);
              return (
                <li key={city.id}>
                  <Link
                    href={`/properties?city=${city.slug}`}
                    className="group relative flex aspect-[4/5] items-end overflow-hidden rounded-2xl bg-brand-900"
                  >
                    {cityImage ? (
                      <Image
                        src={cityImage}
                        alt={altText(city.image, city.name)}
                        fill
                        sizes="(max-width: 640px) 100vw, 25vw"
                        className="object-cover opacity-70 transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : null}
                    <div
                      className="absolute inset-0 bg-gradient-to-t from-brand-950 to-transparent"
                      aria-hidden="true"
                    />
                    <div className="relative p-5">
                      <p className="flex items-center gap-1.5 text-lg font-semibold text-white">
                        <MapPin className="h-4 w-4 text-accent-400" aria-hidden="true" />
                        {city.name}
                      </p>
                      <p className="mt-1 text-sm text-brand-200">View properties</p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Section>
      ) : null}

      {/* ---------- Closing CTA ---------- */}
      <section className="relative isolate overflow-hidden bg-brand-950 py-20">
        {ctaBackground ? (
          <>
            <Image src={ctaBackground} alt="" fill sizes="100vw" className="object-cover" />
            <div className="absolute inset-0 bg-brand-950/85" aria-hidden="true" />
          </>
        ) : null}

        <div className="container-page relative text-center">
          <h2 className="mx-auto max-w-2xl text-3xl text-white sm:text-4xl">
            {home?.ctaTitle ?? 'Ready to own your dream property?'}
          </h2>
          {home?.ctaBody ? (
            <p className="mx-auto mt-4 max-w-2xl text-brand-200">{home.ctaBody}</p>
          ) : null}

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button href={home?.ctaButton?.href ?? '/contact'} size="lg">
              {home?.ctaButton?.label ?? 'Get in touch'}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
            {global?.whatsappNumber || global?.phonePrimary ? (
              <Button
                href={whatsappLink(global, 'Hello TPI Homes, I would like to make an enquiry.')}
                variant="whatsapp"
                size="lg"
                external
              >
                Chat on WhatsApp
              </Button>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}
