import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { LiquidGlassLayer } from '@/components/ui/LiquidGlassLayer';
import './library.css';

interface LibraryLayoutProps {
  categories: ReactNode;
  children: ReactNode;
  inspector: ReactNode;
  title: string;
  tools?: ReactNode;
}

export function LibraryLayout({ categories, children, inspector, title, tools }: LibraryLayoutProps) {
  const [visible, setVisible] = useState(true);
  const show = useRef<HTMLButtonElement>(null);
  const hide = useRef<HTMLButtonElement>(null);

  function openInspector() {
    setVisible(true);
    requestAnimationFrame(() => hide.current?.focus());
  }

  useEffect(() => {
    const open = (event: Event) => {
      if ((event as CustomEvent).detail === title) openInspector();
    };
    document.addEventListener('inspector:open', open);
    return () => document.removeEventListener('inspector:open', open);
  }, [title]);

  return (
    <>
      {!visible && (
        <Button ref={show} variant="outline" size="sm" onClick={openInspector}>
          Show inspector
        </Button>
      )}
      <div className={`library-workspace${visible ? '' : ' inspector-hidden'}`}>
        <nav className="library-categories workspace-glass" aria-label={`${title} categories`}>
          <LiquidGlassLayer />
          {categories}
        </nav>
        <div className="library-results">{children}</div>
        {visible && (
          <aside className="library-inspector workspace-glass" aria-label={title}>
            <LiquidGlassLayer />
            <div className="library-inspector-scroll">
              <header className="panel-heading">
                <h2>{title}</h2>
                <div className="inspector-tools">
                  {tools}
                  <Button
                    ref={hide}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setVisible(false);
                      requestAnimationFrame(() => show.current?.focus());
                    }}
                  >
                    Hide inspector
                  </Button>
                </div>
              </header>
              <div className="library-inspector-content">{inspector}</div>
            </div>
          </aside>
        )}
      </div>
    </>
  );
}

export function revealInspector(title: string) {
  document.dispatchEvent(new CustomEvent('inspector:open', { detail: title }));
}
