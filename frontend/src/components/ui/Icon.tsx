import * as icons from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import type { ComponentType } from 'react';

/** Convert a kebab-case icon name from Strapi into lucide's PascalCase export. */
function toPascalCase(name: string): string {
  return name
    .split(/[-_\s]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/** `name` is redeclared to allow the nullable values Strapi returns. */
interface IconProps extends Omit<LucideProps, 'name'> {
  /** Icon name as stored in Strapi, e.g. "shield-check". */
  name?: string | null;
  /** Used when the name is missing or unknown to lucide. */
  fallback?: string;
}

/**
 * Renders a lucide icon chosen by name at runtime.
 *
 * Content editors pick icon names in Strapi, so the lookup has to happen at
 * render time rather than through static imports.
 */
export function Icon({ name, fallback = 'Circle', ...props }: IconProps) {
  const registry = icons as unknown as Record<string, ComponentType<LucideProps>>;
  const key = name ? toPascalCase(name) : '';
  const Component = registry[key] ?? registry[fallback] ?? icons.Circle;

  return <Component aria-hidden="true" {...props} />;
}
