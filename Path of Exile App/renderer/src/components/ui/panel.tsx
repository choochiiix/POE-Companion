import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';
export function Panel({ title, description, className, children, ...props }: ComponentProps<'section'> & { description?: string }) { return <section className={cn('ui-panel',className)} {...props}>{title && <header className="panel-heading"><h2>{title}</h2>{description && <p>{description}</p>}</header>}{children}</section>; }
