'use client';

import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useId } from 'react';

export function BottomSheet({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/70 px-3 sm:items-center sm:px-6" role="presentation">
      <button type="button" aria-label="닫기" className="absolute inset-0" onClick={onClose} />
      <div
        className="relative max-h-[88dvh] w-full max-w-[720px] overflow-y-auto rounded-t-[24px] p-5 shadow-2xl outline-none sm:rounded-[24px] sm:p-6"
        style={{ background: 'var(--spm-s1)', border: '1px solid var(--spm-br2)' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 id={titleId} className="text-[18px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>
            {title}
          </h2>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-[10px]" style={{ background: 'var(--spm-s3)' }} aria-label="닫기">
            <X size={17} color="var(--spm-t2)" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
