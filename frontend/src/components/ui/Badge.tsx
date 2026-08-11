import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

const TONES = {
  accent: 'bg-accent-100 text-accent-800',
  brand: 'bg-brand-100 text-brand-800',
  success: 'bg-emerald-100 text-emerald-800',
  muted: 'bg-brand-50 text-brand-600',
  overlay: 'bg-brand-950/80 text-white backdrop-blur-sm',
} as const;

interface BadgeProps {
  children: ReactNode;
  tone?: keyof typeof TONES;
  className?: string;
}

export function Badge({ children, tone = 'accent', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
        TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
