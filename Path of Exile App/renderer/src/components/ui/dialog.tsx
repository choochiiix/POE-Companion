import {useRef,type ComponentProps} from 'react';
import { Dialog as Primitive } from 'radix-ui';
import { cn } from '@/lib/utils';
import { CloseIcon } from '@/components/ui/icons';
export const Dialog = Primitive.Root;
export const DialogTrigger = Primitive.Trigger;
export const DialogClose = Primitive.Close;
export const DialogTitle = Primitive.Title;
export const DialogDescription = Primitive.Description;
export function DialogContent({className,children,onOpenAutoFocus,onCloseAutoFocus,onEscapeKeyDown,...props}: ComponentProps<typeof Primitive.Content>) {
 const opener=useRef<HTMLElement|null>(null);
 const character=!className?.includes('settings-dialog')&&(location.hash==='#character'||!location.hash);
 return <Primitive.Portal>
  <Primitive.Overlay className="dialog-overlay"/>
  <Primitive.Content
   onEscapeKeyDown={event=>{onEscapeKeyDown?.(event);if(!event.defaultPrevented&&document.querySelector('.spring-dropdown select[aria-expanded="true"]'))event.preventDefault();}}
   onCloseAutoFocus={event=>{onCloseAutoFocus?.(event);if(!event.defaultPrevented&&opener.current?.isConnected){event.preventDefault();opener.current.focus();}}}
   onOpenAutoFocus={event=>{const node=event.target as HTMLElement,trigger=document.activeElement;if(trigger instanceof HTMLElement){opener.current=trigger;const d=node.getBoundingClientRect(),b=trigger.getBoundingClientRect();node.style.transformOrigin=`${Math.max(0,Math.min(d.width,b.left+b.width/2-d.left))}px ${Math.max(0,Math.min(d.height,b.top+b.height/2-d.top))}px`;}onOpenAutoFocus?.(event);}}
   className={cn('dialog-content',character&&'character-design-dialog',className)}
   {...props}
  >
   {children}
   <Primitive.Close className="dialog-dismiss" aria-label="Close dialog"><CloseIcon size={16} strokeWidth={1.8} aria-hidden="true"/></Primitive.Close>
  </Primitive.Content>
 </Primitive.Portal>;
}
export function DialogHeader(props: ComponentProps<'header'>) { return <header className="dialog-header" {...props}/>; }
export function DialogFooter(props: ComponentProps<'footer'>) { return <footer className="dialog-footer" {...props}/>; }


