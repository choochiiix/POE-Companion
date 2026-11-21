import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';
import { LiquidGlassLayer } from './LiquidGlassLayer';

type PanelProps = ComponentProps<'section'> & { description?: string };

export function Panel({ title, description, className, children, ...props }: PanelProps) {
  return (
    <section className={cn('ui-panel workspace-glass', className)} {...props}>
      <LiquidGlassLayer />
      {title && (
        <header className="panel-heading">
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </header>
      )}
      {children}
    </section>
  );
}
