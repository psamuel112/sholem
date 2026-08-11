import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface SectionHeadingProps {
  eyebrow?: string | null;
  title: string;
  subtitle?: string | null;
  align?: 'left' | 'center';
  tone?: 'dark' | 'light';
  className?: string;
}

/** Consistent section header used across every page. */
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = 'center',
  tone = 'dark',
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        'max-w-3xl',
        align === 'center' ? 'mx-auto text-center' : 'text-left',
        className
      )}
    >
      {eyebrow ? (
        <p
          className={cn(
            'mb-3 text-sm font-semibold uppercase tracking-wider',
            tone === 'dark' ? 'text-accent-600' : 'text-accent-400'
          )}
        >
          {eyebrow}
        </p>
      ) : null}

      <h2 className={cn('text-3xl sm:text-4xl', tone === 'dark' ? 'text-brand-900' : 'text-white')}>
        {title}
      </h2>

      {subtitle ? (
        <p
          className={cn(
            'mt-4 text-base leading-relaxed sm:text-lg',
            tone === 'dark' ? 'text-brand-600' : 'text-brand-100'
          )}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

interface SectionProps {
  children: ReactNode;
  className?: string;
  id?: string;
}

/** Vertical rhythm wrapper with the shared page gutter. */
export function Section({ children, className, id }: SectionProps) {
  return (
    <section id={id} className={cn('py-16 sm:py-20 lg:py-24', className)}>
      <div className="container-page">{children}</div>
    </section>
  );
}
