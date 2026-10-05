'use client';

import { X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useId } from 'react';

interface SidePanelProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function SidePanel({ open, title, description, onClose, children }: SidePanelProps): React.JSX.Element {
  const reduceMotion = useReducedMotion() === true;
  const titleId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50">
          <motion.button
            type="button"
            aria-label="Cerrar panel"
            onClick={onClose}
            className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="absolute inset-y-0 right-0 flex w-full max-w-lg flex-col bg-white shadow-[-24px_0_60px_-30px_rgba(11,79,111,0.5)]"
            initial={reduceMotion ? { opacity: 0 } : { x: '100%' }}
            animate={reduceMotion ? { opacity: 1 } : { x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { x: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 36 }}
          >
            <header className="flex items-start justify-between gap-4 border-b border-line px-6 pb-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
              <div className="min-w-0">
                <h2 id={titleId} className="text-xl font-semibold">
                  {title}
                </h2>
                {description === undefined ? null : <p className="mt-1 text-sm text-muted">{description}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar panel"
                autoFocus
                className="grid size-10 shrink-0 place-items-center rounded-[10px] text-muted hover:bg-celeste-50 hover:text-ink"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto px-6 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">{children}</div>
          </motion.section>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
