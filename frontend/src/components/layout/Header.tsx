'use client';

import { Menu, Phone, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { cn, telLink } from '@/lib/utils';
import type { Global, StrapiMedia } from '@/types/strapi';

const NAV_ITEMS = [
  { label: 'Home', href: '/' },
  { label: 'About Us', href: '/about' },
  { label: 'Properties', href: '/properties' },
  { label: 'Services', href: '/services' },
  { label: 'News', href: '/news' },
  { label: 'Contact', href: '/contact' },
] as const;

interface HeaderProps {
  global: Global | null;
  logoUrl: string | null;
  logo: StrapiMedia | null;
}

export function Header({ global, logoUrl, logo }: HeaderProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Close the mobile menu whenever the route changes. Adjusting during render
  // (rather than in an effect) avoids a second pass with the drawer still open.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setMenuOpen(false);
  }


  // Solid background once the user scrolls past the hero edge.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Prevent background scrolling while the mobile drawer is open.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  const siteName = global?.siteName ?? 'TPI Homes';

  return (
    <header
      className={cn(
        'sticky top-0 z-50 transition-shadow duration-200',
        scrolled ? 'bg-white shadow-md' : 'bg-white shadow-sm'
      )}
    >
      {/* Contact strip — hidden on small screens to save vertical space. */}
      <div className="hidden bg-brand-900 text-white lg:block">
        <div className="container-page flex h-10 items-center justify-between text-xs">
          <p>{global?.tagline ?? 'Your Trusted Real Estate Partner in Lagos, Nigeria'}</p>
          <div className="flex items-center gap-6">
            {global?.phonePrimary ? (
              <a
                href={telLink(global.phonePrimary)}
                className="flex items-center gap-1.5 transition-colors hover:text-accent-300"
              >
                <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                {global.phonePrimary}
              </a>
            ) : null}
            {global?.email ? (
              <a
                href={`mailto:${global.email}`}
                className="transition-colors hover:text-accent-300"
              >
                {global.email}
              </a>
            ) : null}
          </div>
        </div>
      </div>

      <div className="container-page flex h-16 items-center justify-between lg:h-20">
        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label={`${siteName} home`}>
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={logo?.alternativeText || `${siteName} logo`}
              width={180}
              height={56}
              priority
              className="h-10 w-auto object-contain lg:h-12"
            />
          ) : (
            <span className="font-display text-xl font-bold text-brand-900">{siteName}</span>
          )}
        </Link>

        <nav aria-label="Main navigation" className="hidden items-center gap-1 lg:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? 'page' : undefined}
              className={cn(
                'rounded-md px-3 py-2 text-sm font-semibold transition-colors',
                isActive(item.href)
                  ? 'text-accent-600'
                  : 'text-brand-800 hover:bg-brand-50 hover:text-accent-600'
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:block">
          <Button href="/property-request" size="sm">
            Request A Property
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="-mr-2 inline-flex items-center justify-center rounded-md p-2 text-brand-800 lg:hidden"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile drawer */}
      <div
        id="mobile-menu"
        hidden={!menuOpen}
        className="border-t border-brand-100 bg-white lg:hidden"
      >
        <nav aria-label="Mobile navigation" className="container-page flex flex-col py-4">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? 'page' : undefined}
              className={cn(
                'rounded-lg px-3 py-3 text-base font-semibold transition-colors',
                isActive(item.href)
                  ? 'bg-accent-50 text-accent-700'
                  : 'text-brand-800 hover:bg-brand-50'
              )}
            >
              {item.label}
            </Link>
          ))}

          <div className="mt-4 space-y-3 border-t border-brand-100 pt-4">
            <Button href="/property-request" className="w-full">
              Request A Property
            </Button>
            {global?.phonePrimary ? (
              <a
                href={telLink(global.phonePrimary)}
                className="flex items-center justify-center gap-2 py-2 text-sm font-semibold text-brand-700"
              >
                <Phone className="h-4 w-4" aria-hidden="true" />
                {global.phonePrimary}
              </a>
            ) : null}
          </div>
        </nav>
      </div>
    </header>
  );
}
