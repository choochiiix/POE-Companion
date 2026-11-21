import { useRef, type ComponentProps } from 'react';
import { Dialog as Primitive } from 'radix-ui';
import { cn } from '@/lib/utils';
import { CloseIcon } from './icons';
import { LiquidGlassLayer } from './LiquidGlassLayer';

export const Dialog = Primitive.Root;
export const DialogTrigger = Primitive.Trigger;
export const DialogClose = Primitive.Close;
export const DialogTitle = Primitive.Title;
export const DialogDescription = Primitive.Description;

type DialogContentProps = ComponentProps<typeof Primitive.Content> & {
  variant?: 'workspace' | 'character' | 'settings';
};

export function DialogContent({
  variant = 'workspace', className, children,
  onOpenAutoFocus, onCloseAutoFocus, onEscapeKeyDown, ...props
}: DialogContentProps) {
  const opener = useRef<HTMLElement | null>(null);
  return (
    <Primitive.Portal>
      <Primitive.Overlay className="dialog-overlay" />
      <Primitive.Content
        className={cn('dialog-content', variant === 'character' && 'character-design-dialog',
          variant === 'workspace' && 'workspace-dialog', className)}
        onEscapeKeyDown={event => {
          onEscapeKeyDown?.(event);
          if (document.querySelector('.spring-dropdown select[aria-expanded="true"]')) {
            event.preventDefault();
          }
        }}
        onOpenAutoFocus={event => {
          const node = event.target as HTMLElement;
          const trigger = document.activeElement;
          if (trigger instanceof HTMLElement) {
            opener.current = trigger;
            const dialog = node.getBoundingClientRect();
            const button = trigger.getBoundingClientRect();
            const x = Math.max(0, Math.min(dialog.width, button.left + button.width / 2 - dialog.left));
            const y = Math.max(0, Math.min(dialog.height, button.top + button.height / 2 - dialog.top));
            node.style.transformOrigin = `${x}px ${y}px`;
          }
          onOpenAutoFocus?.(event);
        }}
        onCloseAutoFocus={event => {
          onCloseAutoFocus?.(event);
          if (!event.defaultPrevented && opener.current?.isConnected) {
            event.preventDefault();
            opener.current.focus();
          }
        }}
        {...props}
      >
        {variant === 'workspace' && <LiquidGlassLayer />}
        {children}
        <Primitive.Close className="dialog-dismiss" aria-label="Close dialog">
          <CloseIcon size={16} strokeWidth={1.8} aria-hidden="true" />
        </Primitive.Close>
      </Primitive.Content>
    </Primitive.Portal>
  );
}

export function DialogHeader(props: ComponentProps<'header'>) {
  return <header className="dialog-header" {...props} />;
}
export function DialogFooter(props: ComponentProps<'footer'>) {
  return <footer className="dialog-footer" {...props} />;
}
