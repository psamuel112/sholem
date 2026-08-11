import type { Metadata } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';

import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { WhatsAppFloat } from '@/components/layout/WhatsAppFloat';
import { getGlobal, getServices, mediaUrl } from '@/lib/strapi';
import { absoluteUrl } from '@/lib/utils';

import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

/**
 * Site-wide metadata, seeded from Strapi's Global single type so editors
 * control titles and descriptions without a redeploy.
 */
export async function generateMetadata(): Promise<Metadata> {
  const global = await getGlobal();

  const siteName = global?.siteName ?? 'TPI Homes';
  const title = global?.defaultSeo?.metaTitle ?? `${siteName} | ${global?.tagline ?? 'Real Estate'}`;
  const description =
    global?.defaultSeo?.metaDescription ??
    global?.description ??
    'Real estate development, property sales and facility management in Lagos, Nigeria.';
  const shareImage = mediaUrl(global?.defaultSeo?.shareImage?.url ?? global?.logo?.url);

  return {
    metadataBase: new URL(absoluteUrl()),
    title: {
      default: title,
      // Page-level titles get the brand appended automatically.
      template: `%s | ${siteName}`,
    },
    description,
    keywords: global?.defaultSeo?.keywords?.split(',').map((k) => k.trim()),
    alternates: { canonical: '/' },
    openGraph: {
      type: 'website',
      siteName,
      title,
      description,
      url: absoluteUrl(),
      locale: 'en_NG',
      ...(shareImage ? { images: [{ url: shareImage, width: 1200, height: 630, alt: siteName }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(shareImage ? { images: [shareImage] } : {}),
    },
    robots: { index: true, follow: true },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Header and footer need the same global data on every route; fetching in
  // parallel keeps the layout render cost flat.
  const [global, services] = await Promise.all([getGlobal(), getServices()]);
  const logoUrl = mediaUrl(global?.logo?.url);

  return (
    <html lang="en" className={`${inter.variable} ${plusJakarta.variable}`}>
      <body className="flex min-h-screen flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-brand-900 focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to main content
        </a>

        <Header global={global} logoUrl={logoUrl} logo={global?.logo ?? null} />

        <main id="main" className="flex-1">
          {children}
        </main>

        <Footer
          global={global}
          logoUrl={logoUrl}
          logo={global?.logo ?? null}
          services={services.slice(0, 6)}
        />

        <WhatsAppFloat global={global} />
      </body>
    </html>
  );
}
