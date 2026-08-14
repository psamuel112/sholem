import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import type { Metadata } from 'next';

import { PageHero } from '@/components/shared/PageHero';
import { InquiryForm } from '@/components/shared/InquiryForm';
import { SocialIcon } from '@/components/ui/SocialIcon';
import { getGlobal } from '@/lib/strapi';
import { telLink, whatsappLink } from '@/lib/utils';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Contact Us',
  description:
    'Get in touch with Sholem Properties. Call, email, message us on WhatsApp or visit our office.',
  alternates: { canonical: '/contact' },
};

export default async function ContactPage() {
  const global = await getGlobal();

  const phones = [global?.phonePrimary, global?.phoneSecondary].filter(Boolean) as string[];

  return (
    <>
      <PageHero
        title="Contact Us"
        subtitle="We would love to hear from you. Reach out and our team will respond promptly."
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Contact' }]}
      />

      <section className="py-14 sm:py-20">
        <div className="container-page">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.15fr]">
            {/* ---------- Details ---------- */}
            <div>
              <h2 className="text-2xl text-brand-950">Get in touch</h2>
              <p className="mt-3 leading-relaxed text-brand-600">
                Whether you are buying, selling or need advice, our consultants are available to
                help.
              </p>

              <ul className="mt-8 space-y-6">
                {phones.length ? (
                  <ContactRow icon={<Phone className="h-5 w-5" />} label="Phone">
                    {phones.map((phone) => (
                      <a
                        key={phone}
                        href={telLink(phone)}
                        className="block text-brand-700 transition-colors hover:text-accent-600"
                      >
                        {phone}
                      </a>
                    ))}
                  </ContactRow>
                ) : null}

                {global?.email ? (
                  <ContactRow icon={<Mail className="h-5 w-5" />} label="Email">
                    <a
                      href={`mailto:${global.email}`}
                      className="break-all text-brand-700 transition-colors hover:text-accent-600"
                    >
                      {global.email}
                    </a>
                  </ContactRow>
                ) : null}

                {global?.whatsappNumber ? (
                  <ContactRow icon={<MessageCircle className="h-5 w-5" />} label="WhatsApp">
                    <a
                      href={whatsappLink(global, 'Hello Sholem Properties, I have an enquiry.')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-700 transition-colors hover:text-accent-600"
                    >
                      Start a chat
                    </a>
                  </ContactRow>
                ) : null}

                {global?.officeAddress ? (
                  <ContactRow icon={<MapPin className="h-5 w-5" />} label="Office">
                    <p className="text-brand-700">{global.officeAddress}</p>
                  </ContactRow>
                ) : null}

                {global?.officeHours ? (
                  <ContactRow icon={<Clock className="h-5 w-5" />} label="Opening hours">
                    <p className="text-brand-700">{global.officeHours}</p>
                  </ContactRow>
                ) : null}
              </ul>

              {global?.socials?.length ? (
                <div className="mt-10">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-500">
                    Follow us
                  </h3>
                  <ul className="mt-4 flex flex-wrap gap-3">
                    {global.socials.map((social) => (
                      <li key={social.url}>
                        <a
                          href={social.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={social.platform}
                          className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 text-brand-700 transition-colors hover:bg-accent-500 hover:text-brand-950"
                        >
                          <SocialIcon platform={social.platform} className="h-5 w-5" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            {/* ---------- Form ---------- */}
            <div className="rounded-2xl border border-brand-100 bg-white p-6 shadow-card sm:p-8">
              <h2 className="text-2xl text-brand-950">Send us a message</h2>
              <p className="mt-2 text-sm text-brand-600">
                Fill in the form and we will get back to you as soon as possible.
              </p>
              <div className="mt-6">
                <InquiryForm type="general" global={global} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Map ---------- */}
      {global?.mapEmbedUrl ? (
        <section aria-label="Office location map" className="border-t border-brand-100">
          <iframe
            title="Sholem Properties office location"
            src={global.mapEmbedUrl}
            className="h-[420px] w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </section>
      ) : null}
    </>
  );
}

function ContactRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-100 text-accent-700">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-500">{label}</p>
        <div className="mt-1">{children}</div>
      </div>
    </li>
  );
}
