import { CalendarDays } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { PageHero } from '@/components/shared/PageHero';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { getPosts, mediaUrl } from '@/lib/strapi';
import { altText, formatDate, truncate } from '@/lib/utils';

export const revalidate = 600;

export const metadata: Metadata = {
  title: 'News & Updates',
  description:
    'The latest news, offers and real estate insights from Sholem Properties.',
  alternates: { canonical: '/news' },
};

export default async function NewsPage() {
  const posts = await getPosts();

  return (
    <>
      <PageHero
        title="News & Updates"
        subtitle="Announcements, promotions and insights from the Sholem Properties team."
        crumbs={[{ label: 'Home', href: '/' }, { label: 'News' }]}
      />

      <section className="py-14 sm:py-20">
        <div className="container-page">
          {posts.length ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => {
                const cover = mediaUrl(post.coverImage?.url);
                const href = `/news/${post.slug}`;

                return (
                  <article
                    key={post.id}
                    className="group flex h-full flex-col overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-card transition-shadow duration-300 hover:shadow-card-hover"
                  >
                    <Link
                      href={href}
                      className="relative block aspect-[16/10] overflow-hidden bg-brand-100"
                    >
                      {cover ? (
                        <Image
                          src={cover}
                          alt={altText(post.coverImage, post.title)}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : null}
                    </Link>

                    <div className="flex flex-1 flex-col p-6">
                      <p className="flex items-center gap-2 text-xs text-brand-500">
                        <CalendarDays className="h-4 w-4" aria-hidden="true" />
                        <time dateTime={post.publishedAt ?? undefined}>
                          {formatDate(post.publishedAt)}
                        </time>
                      </p>

                      <h2 className="mt-3 text-lg leading-snug text-brand-950">
                        <Link href={href} className="transition-colors hover:text-accent-600">
                          {post.title}
                        </Link>
                      </h2>

                      {post.excerpt ? (
                        <p className="mt-2 flex-1 text-sm leading-relaxed text-brand-600">
                          {truncate(post.excerpt, 140)}
                        </p>
                      ) : null}

                      <Link
                        href={href}
                        className="mt-4 text-sm font-semibold text-accent-600 hover:text-accent-700"
                      >
                        Read more
                        <span className="sr-only"> about {post.title}</span>
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="No posts yet"
              description="We publish updates and offers here. Please check back soon."
              action={<Button href="/properties">Browse properties</Button>}
            />
          )}
        </div>
      </section>
    </>
  );
}
