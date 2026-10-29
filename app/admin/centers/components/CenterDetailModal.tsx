'use client';

import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { CenterDetailClient } from '../[id]/CenterDetailClient';
import type { Center } from '@/app/lib/centers/types';

export default function CenterDetailModal({ id, onClose, onSaved, onDeleted }: {
  id: string; onClose: () => void; onSaved: (center: Center) => void; onDeleted: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const guard = useRef<() => boolean>(() => true);
  const registerCloseGuard = useCallback((check: () => boolean) => { guard.current = check; }, []);
  const close = () => { if (guard.current()) onClose(); };

  useEffect(() => {
    const element = dialog.current!;
    const focused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    element.showModal();
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      focused?.focus({ preventScroll: true });
    };
  }, []);

  return createPortal(
    <dialog ref={dialog} aria-label="센터 상세정보"
      className="fixed inset-0 m-0 h-dvh max-h-dvh w-screen max-w-none overflow-hidden border-0 bg-slate-50 p-0 backdrop:bg-slate-900/50 sm:m-auto sm:h-[92dvh] sm:max-h-[92dvh] sm:w-[min(960px,94vw)] sm:rounded-2xl sm:shadow-2xl"
      onCancel={(event) => { event.preventDefault(); close(); }}
      onClick={(event) => { if (event.target === dialog.current) { const rect = dialog.current!.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close(); } }}>
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 items-center justify-between border-b bg-white px-4 py-2">
          <span className="font-semibold text-slate-900">센터 상세정보</span>
          <button type="button" onClick={close} aria-label="센터 상세 닫기" className="rounded-full p-3 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <CenterDetailClient id={id} onClose={close} onSaved={onSaved} onDeleted={onDeleted} registerCloseGuard={registerCloseGuard} />
        </div>
      </div>
    </dialog>, document.body,
  );
}
