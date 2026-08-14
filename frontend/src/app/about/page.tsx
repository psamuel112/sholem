import { ArrowRight, Compass, Target } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';

import { PageHero } from '@/components/shared/PageHero';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Section, SectionHeading } from '@/components/ui/Section';
import { getAboutPage, getGlobal, mediaUrl } from '@/lib/strapi';
import { altText, paragraphs } from '@/lib/utils';

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const about = await getAboutPage();

  const title = about?.seo?.metaTitle || about?.title || 'About Us';
  const description =
    about?.seo?.metaDescription ||
    about?.subtitle ||
    'Learn about Sholem Properties — our story, mission, vision and values.';

  return {
    title,
    description,
    alternates: { canonical: '/about' },
    openGraph: { title, description, url: '/about' },
  };
}

export default async function AboutPage() {
  const [about, global] = await Promise.all([getAboutPage(), getGlobal()]);

  const heroImage = mediaUrl(about?.heroImage?.url);
  const founderImage = mediaUrl(about?.founderImage?.url);

  return (
    <>
      <PageHero
        title={about?.title ?? 'About Sholem Properties'}
        subtitle={about?.subtitle}
        image={heroImage}
        imageAlt={altText(about?.heroImage, 'Sholem Properties office')}
        crumbs={[{ label: 'Home', href: '/' }, { label: 'About Us' }]}
      />

      {/* ---------- Story ---------- */}
      {about?.story ? (
        <Section>
          <div className="mx-auto max-w-3xl">
            <SectionHeading
              eyebrow="Our Story"
              title={about.storyTitle ?? 'Who We Are'}
              align="left"
            />
            <div className="mt-6 space-y-4 leading-relaxed text-brand-700">
              {paragraphs(about.story).map((text, index) => (
                <p key={index}>{text}</p>
              ))}
            </div>
          </div>
        </Section>
      ) : null}

      {/* ---------- Stats ---------- */}
      {about?.stats?.length ? (
        <Section className="bg-brand-900 py-14">
          <dl className="grid grid-cols-2 gap-8 lg:grid-cols-4">
            {about.stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <dt className="sr-only">{stat.label}</dt>
                <dd>
                  <span className="block font-display text-4xl font-bold text-accent-400">
                    {stat.value}
                  </span>
                  <span className="mt-2 block text-sm text-brand-200">{stat.label}</span>
                </dd>
              </div>
            ))}
          </dl>
        </Section>
      ) : null}

      {/* ---------- Mission & vision ---------- */}
      {about?.mission || about?.vision ? (
        <Section className="bg-brand-50">
          <div className="grid gap-6 lg:grid-cols-2">
            {about?.mission ? (
              <article className="rounded-2xl border border-brand-100 bg-white p-8 shadow-card">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-100 text-accent-700">
                  <Target className="h-6 w-6" aria-hidden="true" />
                </span>
                <h2 className="mt-5 text-2xl text-brand-950">
                  {about.missionTitle ?? 'Our Mission'}
                </h2>
                <div className="mt-3 space-y-3 leading-relaxed text-brand-700">
                  {paragraphs(about.mission).map((text, index) => (
                    <p key={index}>{text}</p>
                  ))}
                </div>
              </article>
            ) : null}

            {about?.vision ? (
              <article className="rounded-2xl border border-brand-100 bg-white p-8 shadow-card">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-100 text-accent-700">
                  <Compass className="h-6 w-6" aria-hidden="true" />
                </span>
                <h2 className="mt-5 text-2xl text-brand-950">
                  {about.visionTitle ?? 'Our Vision'}
                </h2>
                <div className="mt-3 space-y-3 leading-relaxed text-brand-700">
                  {paragraphs(about.vision).map((text, index) => (
                    <p key={index}>{text}</p>
                  ))}
                </div>
              </article>
            ) : null}
          </div>
        </Section>
      ) : null}

      {/* ---------- Core values ---------- */}
      {about?.values?.length ? (
        <Section>
          <SectionHeading eyebrow="What Drives Us" title={about.valuesTitle ?? 'Our Core Values'} />
          <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {about.values.map((value) => (
              <li
                key={value.title}
                className="rounded-2xl border border-brand-100 bg-white p-6 shadow-card"
              >
                <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-100 text-accent-700">
                  <Icon name={value.icon} className="h-6 w-6" />
                </span>
                <h3 className="text-lg text-brand-950">{value.title}</h3>
                {value.description ? (
                  <p className="mt-2 text-sm leading-relaxed text-brand-600">{value.description}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {/* ---------- Founder ---------- */}
      {about?.founderName ? (
        <Section className="bg-brand-50">
          <div className="grid items-center gap-10 lg:grid-cols-[320px_1fr]">
            {founderImage ? (
              <div className="relative mx-auto aspect-[4/5] w-full max-w-[320px] overflow-hidden rounded-2xl">
                <Image
                  src={founderImage}
                  alt={altText(about.founderImage, about.founderName)}
                  fill
                  sizes="(max-width: 1024px) 320px, 320px"
                  className="object-cover"
                />
              </div>
            ) : null}

            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-accent-600">
                Leadership
              </p>
              <h2 className="mt-2 text-3xl text-brand-950">{about.founderName}</h2>
              {about.founderRole ? (
                <p className="mt-1 text-brand-600">{about.founderRole}</p>
              ) : null}
              {about.founderBio ? (
                <div className="mt-5 space-y-4 leading-relaxed text-brand-700">
                  {paragraphs(about.founderBio).map((text, index) => (
                    <p key={index}>{text}</p>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </Section>
      ) : null}

      {/* ---------- CTA ---------- */}
      <section className="bg-brand-950 py-16">
        <div className="container-page text-center">
          <h2 className="text-3xl text-white">Let&rsquo;s find your next property</h2>
          <p className="mx-auto mt-3 max-w-xl text-brand-200">
            {global?.tagline ?? 'Talk to our team about buying, selling or managing property.'}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button href="/properties" size="lg">
              Browse properties
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button href="/contact" variant="white" size="lg">
              Contact us
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
