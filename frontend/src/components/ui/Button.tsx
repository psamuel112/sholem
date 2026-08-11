import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'white' | 'whatsapp';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent-500 text-brand-950 hover:bg-accent-400 shadow-sm',
  secondary: 'bg-brand-800 text-white hover:bg-brand-700 shadow-sm',
  outline: 'border-2 border-current text-current hover:bg-current/10',
  ghost: 'text-brand-800 hover:bg-brand-50',
  white: 'bg-white text-brand-900 hover:bg-brand-50 shadow-sm',
  whatsapp: 'bg-[#25D366] text-white hover:bg-[#1fb855] shadow-sm',
};

const SIZES: Record<Size, string> = {
  sm: 'px-4 py-2 text-sm gap-1.5',
  md: 'px-6 py-3 text-sm gap-2',
  lg: 'px-8 py-4 text-base gap-2.5',
};

const BASE =
  'inline-flex items-center justify-center rounded-lg font-semibold transition-colors duration-200 ' +
  'disabled:pointer-events-none disabled:opacity-60';

interface CommonProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}

type ButtonAsLink = CommonProps & {
  href: string;
  external?: boolean;
} & Omit<ComponentProps<'a'>, 'href' | 'className' | 'children'>;

type ButtonAsButton = CommonProps &
  Omit<ComponentProps<'button'>, 'className' | 'children'> & { href?: never };

/**
 * Renders an `<a>` when `href` is supplied and a `<button>` otherwise, so
 * calls-to-action coming from Strapi can be dropped in without branching.
 */
export function Button(props: ButtonAsLink | ButtonAsButton) {
  const { variant = 'primary', size = 'md', className, children } = props;
  const classes = cn(BASE, VARIANTS[variant], SIZES[size], className);

  if ('href' in props && props.href) {
    const { href, external, variant: _v, size: _s, className: _c, children: _ch, ...rest } = props;
    const isExternal = external ?? /^(https?:|mailto:|tel:)/.test(href);

    if (isExternal) {
      return (
        <a
          href={href}
          className={classes}
          {...(href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          {...rest}
        >
          {children}
        </a>
      );
    }

    return (
      <Link href={href} className={classes} {...rest}>
        {children}
      </Link>
    );
  }

  const { variant: _v, size: _s, className: _c, children: _ch, ...rest } = props as ButtonAsButton;
  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}
