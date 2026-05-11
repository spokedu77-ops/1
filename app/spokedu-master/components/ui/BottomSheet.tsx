'use client';

import type { ReactNode } from 'react';
import { X } from 'lucide-react';

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
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex justify-center bg-black/70">
      <button type="button" aria-label="닫기" className="absolute inset-0" onClick={onClose} />
      <div className="absolute bottom-0 w-full max-w-[390px] rounded-t-[24px] p-5" style={{ background: 'var(--spm-s1)', border: '1px solid var(--spm-br2)' }}>
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-[18px] font-black tracking-[-0.03em]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-[10px]"
            style={{ background: 'var(--spm-s3)' }}
            aria-label="닫기"
          >
            <X size={17} color="var(--spm-t2)" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
