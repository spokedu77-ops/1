'use client';

import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
      className="fixed inset-0 m-0 h-dvh max-h-dvh w-screen max-w-none overflow-hidden border-0 bg-white p-0 backdrop:bg-slate-900/50 sm:m-auto sm:h-fit sm:max-h-[92dvh] sm:w-[min(720px,94vw)] sm:rounded-xl sm:shadow-2xl"
      onCancel={(event) => { event.preventDefault(); close(); }}
      onClick={(event) => { if (event.target === dialog.current) { const rect = dialog.current!.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close(); } }}>
      <div className="flex h-full max-h-dvh min-w-0 flex-col sm:h-auto sm:max-h-[92dvh]">
        <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          <CenterDetailClient id={id} onClose={close} onSaved={onSaved} onDeleted={onDeleted} registerCloseGuard={registerCloseGuard} />
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 bg-white px-4 py-3">
          <button type="button" onClick={close} aria-label="센터 상세 닫기" className="min-h-10 rounded-md border border-slate-200 px-4 text-sm text-slate-600">닫기</button>
          <a href="/admin/master/reports?tab=sheet" onClick={(event) => { if (!guard.current()) event.preventDefault(); }} className="inline-flex min-h-10 items-center rounded-md border border-indigo-200 px-3 text-sm font-medium text-indigo-600">정산 시트 열기</a>
        </div>
      </div>
    </dialog>, document.body,
  );
}
