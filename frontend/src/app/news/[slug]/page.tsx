import { CalendarDays, UserRound } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';

import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/Button';
import { getPost, getPosts, mediaUrl } from '@/lib/strapi';
import { absoluteUrl, altText, formatDate, paragraphs } from '@/lib/utils';

export const revalidate = 600;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const posts = await getPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) return { title: 'Post not found' };

  const title = post.seo?.metaTitle || post.title;
  const description = post.seo?.metaDescription || post.excerpt || post.title;
  const image = mediaUrl(post.seo?.shareImage?.url ?? post.coverImage?.url);

  return {
    title,
    description,
    alternates: { canonical: `/news/${post.slug}` },
    openGraph: {
      title,
      description,
      type: 'article',
      url: absoluteUrl(`/news/${post.slug}`),
      publishedTime: post.publishedAt ?? undefined,
      images: image ? [{ url: image, alt: post.title }] : undefined,
    },
  };
}

export default async function PostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) notFound();

  const cover = mediaUrl(post.coverImage?.url);

  return (
    <>
      <div className="border-b border-brand-100 bg-brand-50">
        <div className="container-page py-4">
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: 'News', href: '/news' },
              { label: post.title },
            ]}
          />
        </div>
      </div>

      <article className="py-12 sm:py-16">
        <div className="container-page">
          <div className="mx-auto max-w-3xl">
            <header>
              <h1 className="text-3xl leading-tight text-brand-950 sm:text-4xl">{post.title}</h1>

              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-brand-500">
                <p className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" aria-hidden="true" />
                  <time dateTime={post.publishedAt ?? undefined}>
                    {formatDate(post.publishedAt)}
                  </time>
                </p>
                {post.author ? (
                  <p className="flex items-center gap-2">
                    <UserRound className="h-4 w-4" aria-hidden="true" />
                    {post.author}
                  </p>
                ) : null}
              </div>
            </header>

            {cover ? (
              <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-2xl bg-brand-100">
                <Image
                  src={cover}
                  alt={altText(post.coverImage, post.title)}
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 768px"
                  className="object-cover"
                />
              </div>
            ) : null}

            {post.content ? (
              <div className="mt-8 space-y-4 leading-relaxed text-brand-700">
                {paragraphs(post.content).map((text, index) => (
                  <p key={index}>{text}</p>
                ))}
              </div>
            ) : null}

            <div className="mt-12 flex flex-wrap gap-4 border-t border-brand-100 pt-8">
              <Button href="/properties">Browse properties</Button>
              <Button href="/news" variant="secondary">
                Back to news
              </Button>
            </div>
          </div>
        </div>
      </article>
    </>
  );
}
