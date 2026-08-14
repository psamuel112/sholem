import { Mail, MapPin, Phone } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { SocialIcon } from '@/components/ui/SocialIcon';
import { telLink } from '@/lib/utils';
import type { Global, Service, StrapiMedia } from '@/types/strapi';

const QUICK_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'About Us', href: '/about' },
  { label: 'Properties', href: '/properties' },
  { label: 'Services', href: '/services' },
  { label: 'News & Insights', href: '/news' },
  { label: 'Contact Us', href: '/contact' },
];

interface FooterProps {
  global: Global | null;
  logoUrl: string | null;
  logo: StrapiMedia | null;
  services: Service[];
}

export function Footer({ global, logoUrl, logo, services }: FooterProps) {
  const siteName = global?.siteName ?? 'Sholem Properties';
  const year = new Date().getFullYear();

  return (
    <footer className="bg-brand-950 text-brand-200">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4 lg:py-16">
        {/* Company */}
        <div className="sm:col-span-2 lg:col-span-1">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={logo?.alternativeText || `${siteName} logo`}
              width={180}
              height={56}
              className="mb-5 h-11 w-auto object-contain brightness-0 invert"
            />
          ) : (
            <p className="mb-5 font-display text-xl font-bold text-white">{siteName}</p>
          )}

          <p className="text-sm leading-relaxed">
            {global?.footerAbout ?? global?.description ?? ''}
          </p>

          {global?.socials?.length ? (
            <ul className="mt-6 flex gap-3">
              {global.socials.map((social) => (
                <li key={social.url}>
                  <a
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${siteName} on ${social.platform}`}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-accent-500 hover:text-brand-950"
                  >
                    <SocialIcon platform={social.platform} className="h-4 w-4" />
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {/* Quick links */}
        <nav aria-labelledby="footer-links">
          <h2 id="footer-links" className="mb-5 text-base text-white">
            Quick Links
          </h2>
          <ul className="space-y-3 text-sm">
            {QUICK_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="transition-colors hover:text-accent-400">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Services */}
        <nav aria-labelledby="footer-services">
          <h2 id="footer-services" className="mb-5 text-base text-white">
            Our Services
          </h2>
          <ul className="space-y-3 text-sm">
            {services.length > 0 ? (
              services.map((service) => (
                <li key={service.slug}>
                  <Link
                    href={`/services/${service.slug}`}
                    className="transition-colors hover:text-accent-400"
                  >
                    {service.title}
                  </Link>
                </li>
              ))
            ) : (
              <li>
                <Link href="/services" className="transition-colors hover:text-accent-400">
                  View all services
                </Link>
              </li>
            )}
          </ul>
        </nav>

        {/* Contact */}
        <div>
          <h2 className="mb-5 text-base text-white">Get In Touch</h2>
          <ul className="space-y-4 text-sm">
            {global?.officeAddress ? (
              <li className="flex gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent-400" aria-hidden="true" />
                <span>{global.officeAddress}</span>
              </li>
            ) : null}

            {global?.phonePrimary ? (
              <li className="flex gap-3">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-accent-400" aria-hidden="true" />
                <span className="flex flex-col gap-1">
                  <a href={telLink(global.phonePrimary)} className="hover:text-accent-400">
                    {global.phonePrimary}
                  </a>
                  {global.phoneSecondary ? (
                    <a href={telLink(global.phoneSecondary)} className="hover:text-accent-400">
                      {global.phoneSecondary}
                    </a>
                  ) : null}
                </span>
              </li>
            ) : null}

            {global?.email ? (
              <li className="flex gap-3">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-accent-400" aria-hidden="true" />
                <a href={`mailto:${global.email}`} className="break-all hover:text-accent-400">
                  {global.email}
                </a>
              </li>
            ) : null}
          </ul>

          {global?.officeHours ? (
            <p className="mt-5 text-xs text-brand-400">{global.officeHours}</p>
          ) : null}
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-6 text-xs text-brand-400 sm:flex-row">
          <p>
            © {year} {global?.legalName ?? siteName}
            {global?.rcNumber ? ` [${global.rcNumber}]` : ''}. All rights reserved.
          </p>
          <div className="flex gap-5">
            <Link href="/privacy-policy" className="hover:text-accent-400">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-accent-400">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
