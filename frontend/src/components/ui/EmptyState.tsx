import { SearchX } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}

/** Shown when a listing or search returns nothing. */
export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-brand-200 bg-brand-50/50 px-6 py-16 text-center">
      <div className="mb-4 text-brand-300">
        {icon ?? <SearchX className="h-12 w-12" aria-hidden="true" />}
      </div>
      <h3 className="text-lg text-brand-900">{title}</h3>
      {description ? <p className="mt-2 max-w-md text-sm text-brand-600">{description}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
