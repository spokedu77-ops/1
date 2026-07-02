'use client';

import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useId, useRef } from 'react';

export function BottomSheet({
  open,
  title,
  children,
  onClose,
  size = 'default',
  initialFocusSelector,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  size?: 'default' | 'document' | 'preview';
  initialFocusSelector?: string;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const onCloseRef = useRef(onClose);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      const initialFocusTarget = initialFocusSelector && dialogRef.current
        ? dialogRef.current.querySelector<HTMLElement>(initialFocusSelector)
        : null;
      (initialFocusTarget ?? closeButtonRef.current)?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, [initialFocusSelector, open]);

  if (!open) return null;

  const panelClassName =
    size === 'preview'
      ? 'relative max-h-[88dvh] w-full max-w-[1160px] overflow-y-auto rounded-t-[16px] p-4 shadow-2xl outline-none sm:rounded-[16px] sm:p-5'
      : size === 'document'
      ? 'relative max-h-[92dvh] w-full max-w-[1360px] overflow-y-auto rounded-t-[14px] p-4 shadow-2xl outline-none sm:rounded-[14px] sm:p-6'
      : 'relative max-h-[88dvh] w-full max-w-[720px] overflow-y-auto rounded-t-[22px] p-5 shadow-2xl outline-none sm:rounded-[22px] sm:p-6';

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/45 px-3 backdrop-blur-sm sm:items-center sm:px-6" role="presentation">
      <button type="button" aria-label={`${title} 닫기`} className="absolute inset-0 cursor-default" onClick={onClose} />
      <div
        ref={dialogRef}
        className={panelClassName}
        style={{ background: '#ffffff', border: '1px solid #e2e8f0', paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className={size === 'preview' ? 'mb-3 flex items-center justify-between gap-3' : 'mb-5 flex items-center justify-between gap-3'}>
          <h2 id={titleId} className="text-[18px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: '#0f172a', letterSpacing: 0 }}>
            {title}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="grid h-11 w-11 place-items-center rounded-[10px] outline-none ring-offset-2 focus-visible:ring-2"
            style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b' }}
            aria-label={`${title} 닫기`}
          >
            <X size={17} color="currentColor" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
