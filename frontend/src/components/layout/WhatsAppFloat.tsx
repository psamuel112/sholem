import { WhatsApp } from '@/components/ui/SocialIcon';
import { whatsappLink } from '@/lib/utils';
import type { Global } from '@/types/strapi';

/** Persistent click-to-chat button, pinned bottom-right on every page. */
export function WhatsAppFloat({ global }: { global: Global | null }) {
  const number = global?.whatsappNumber ?? global?.phonePrimary;
  if (!number) return null;

  const href = whatsappLink(
    number,
    `Hello ${global?.siteName ?? 'TPI Homes'}, I'd like to make an enquiry about a property.`
  );

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform duration-200 hover:scale-105 hover:bg-[#1fb855]"
    >
      <WhatsApp className="h-7 w-7" />
    </a>
  );
}
