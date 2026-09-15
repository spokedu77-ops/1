'use client';

import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export function BottomSheet({
  open,
  title,
  headerTitle,
  headerActions,
  children,
  footer,
  onClose,
  size = 'default',
  nested = false,
  inert = false,
  initialFocusSelector,
}: {
  open: boolean;
  title: string;
  headerTitle?: ReactNode;
  headerActions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void | boolean;
  size?: 'default' | 'document' | 'preview' | 'launch' | 'session';
  nested?: boolean;
  inert?: boolean;
  initialFocusSelector?: string;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const onCloseRef = useRef(onClose);
  const inertRef = useRef(inert);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [desktopSession, setDesktopSession] = useState(false);

  useEffect(() => {
    if (size !== 'session') return;
    const media = window.matchMedia('(min-width: 1024px)');
    const sync = () => setDesktopSession(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, [size]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    inertRef.current = inert;
  }, [inert]);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    /** 스크롤 컨테이너 위치 저장 — body overflow 잠금/포커스 복귀 시 맨 위로 튀는 현상 방지 */
    const scrollSnapshots: Array<{ el: HTMLElement; top: number; left: number }> = [];
    const seen = new Set<HTMLElement>();
    const captureScroll = (el: HTMLElement | null) => {
      let node = el;
      while (node) {
        if (!seen.has(node)) {
          const style = window.getComputedStyle(node);
          const canScrollY = /(auto|scroll|overlay)/.test(style.overflowY);
          const canScrollX = /(auto|scroll|overlay)/.test(style.overflowX);
          if ((canScrollY || canScrollX) && (node.scrollHeight > node.clientHeight || node.scrollWidth > node.clientWidth)) {
            seen.add(node);
            scrollSnapshots.push({ el: node, top: node.scrollTop, left: node.scrollLeft });
          }
        }
        node = node.parentElement;
      }
    };
    captureScroll(previousFocusRef.current);
    captureScroll(document.documentElement);
    captureScroll(document.body);
    if (document.scrollingElement instanceof HTMLElement) {
      captureScroll(document.scrollingElement);
    }
    const windowX = window.scrollX;
    const windowY = window.scrollY;

    const previousOverflow = document.body.style.overflow;
    if (nested || !desktopSession) document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      const initialFocusTarget = initialFocusSelector && dialogRef.current
        ? dialogRef.current.querySelector<HTMLElement>(initialFocusSelector)
        : null;
      (initialFocusTarget ?? closeButtonRef.current)?.focus({ preventScroll: true });
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (inertRef.current) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        if (nested) event.stopImmediatePropagation();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current || desktopSession) return;
      if (nested) event.stopImmediatePropagation();

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    };

    document.addEventListener('keydown', handleKeyDown, nested);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, nested);
      document.body.style.overflow = previousOverflow;
      if (previousFocusRef.current?.isConnected) previousFocusRef.current.focus({ preventScroll: true });
      if (nested) return;
      const restore = () => {
        for (const snapshot of scrollSnapshots) {
          snapshot.el.scrollTop = snapshot.top;
          snapshot.el.scrollLeft = snapshot.left;
        }
        window.scrollTo(windowX, windowY);
      };
      restore();
      requestAnimationFrame(restore);
    };
  }, [desktopSession, initialFocusSelector, nested, open]);

  if (!open) return null;

  const isLaunch = size === 'launch';
  const isSession = size === 'session';
  const hasDetachedFooter = Boolean(footer);

  const panelClassName =
    size === 'preview'
      ? `relative max-h-[88dvh] w-full max-w-[1160px] rounded-t-[16px] p-4 shadow-2xl outline-none sm:rounded-[16px] sm:p-5 ${hasDetachedFooter ? 'flex flex-col overflow-hidden' : 'overflow-y-auto'}`
      : isSession
        ? [
            'relative z-[1] flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[16px] border border-slate-200 bg-white px-4 pt-3 shadow-xl outline-none',
            'sm:px-5 sm:pt-4',
            'lg:h-full lg:max-h-full lg:min-h-0 lg:w-full lg:max-w-none lg:rounded-none lg:border-y-0 lg:border-r-0 lg:border-l lg:border-slate-200 lg:bg-white lg:px-5 lg:pt-4 lg:shadow-none',
          ].join(' ')
      : isLaunch
        ? [
            'relative z-[1] flex w-full max-h-[90dvh] flex-col overflow-hidden shadow-2xl outline-none',
            'rounded-t-[20px] px-4 pt-3',
            'sm:max-w-[720px] sm:rounded-[16px] sm:px-5 sm:pt-4',
          ].join(' ')
      : size === 'document'
      ? 'relative max-h-[92dvh] w-full max-w-[1360px] overflow-y-auto rounded-t-[14px] p-4 shadow-2xl outline-none sm:rounded-[14px] sm:p-6'
      : `relative max-h-[88dvh] w-full max-w-[720px] rounded-t-[22px] p-5 shadow-2xl outline-none sm:rounded-[22px] sm:p-6 ${hasDetachedFooter ? 'flex flex-col overflow-hidden' : 'overflow-y-auto'}`;

  const overlayZ = nested ? 'z-[100]' : 'z-[90]';
  const overlayClassName = isSession
    ? `fixed inset-0 ${overlayZ} flex items-end justify-center bg-slate-950/45 px-3 backdrop-blur-sm lg:static lg:z-auto lg:block lg:h-full lg:min-h-0 lg:bg-transparent lg:px-0 lg:backdrop-blur-none`
    : isLaunch
    ? `fixed inset-0 ${overlayZ} flex items-end justify-center bg-slate-950/45 backdrop-blur-sm sm:items-center sm:px-6`
    : `fixed inset-0 ${overlayZ} flex items-end justify-center bg-slate-950/45 px-3 backdrop-blur-sm sm:items-center sm:px-6`;

  const overlay = (
    <div className={overlayClassName} role="presentation" {...(inert ? { inert: true } : {})}>
      <button type="button" aria-label={`${title} 닫기`} className={`absolute inset-0 cursor-default ${isSession ? 'lg:hidden' : ''}`} onClick={onClose} />
      <div
        ref={dialogRef}
        className={`${panelClassName} ${isSession ? 'lg:pointer-events-auto' : ''}`}
        style={{
          ...(isSession ? {} : { background: '#ffffff', border: '1px solid #e2e8f0' }),
          paddingBottom: hasDetachedFooter ? 0 : 'max(16px, env(safe-area-inset-bottom))',
        }}
        role="dialog"
        aria-modal={isSession ? !desktopSession : true}
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        {isLaunch || isSession ? (
          <div className="mx-auto mb-2 h-1 w-10 shrink-0 rounded-full bg-slate-200 sm:hidden" aria-hidden />
        ) : null}
        <div
          className={`flex shrink-0 items-center justify-between gap-3 ${
            size === 'preview' || isLaunch ? 'mb-2.5' : isSession ? 'mb-4' : 'mb-5'
          }`}
        >
          {headerTitle ? (
            <div id={titleId} className="min-w-0 flex-1">
              {headerTitle}
            </div>
          ) : (
            <h2
              id={titleId}
              className={`${isSession ? 'text-[19px] font-semibold leading-6' : `font-black ${isLaunch ? 'text-[16px] sm:text-[17px]' : 'text-[18px]'}`}`}
              style={{ fontFamily: 'var(--spm-font-display)', color: '#0f172a', letterSpacing: 0 }}
            >
              {title}
            </h2>
          )}
          <div className="flex shrink-0 items-center gap-2">
            {headerActions}
            <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className={isSession
              ? 'grid h-11 w-11 place-items-center rounded-[12px] text-slate-500 outline-none hover:bg-slate-100 hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-[var(--spm-acc)]'
              : 'grid h-11 w-11 place-items-center rounded-[10px] outline-none ring-offset-2 focus-visible:ring-2'}
            style={isSession ? undefined : { background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b' }}
            aria-label={`${title} 닫기`}
          >
            <X size={17} color="currentColor" />
            </button>
          </div>
        </div>
        {isLaunch || isSession || hasDetachedFooter ? (
          <>
            <div data-sheet-scroll-owner className={`min-h-0 flex-1 touch-pan-y overflow-x-hidden overscroll-contain pb-4 sm:pb-5 ${isSession ? 'overflow-y-auto pr-0 lg:overflow-y-auto' : 'overflow-y-auto pr-3'}`} style={isSession ? { scrollbarGutter: 'stable' } : undefined}>{children}</div>
            {footer ? <div className="shrink-0 [&>div.grid]:grid-flow-col [&>div.grid]:auto-cols-fr [&>div.grid]:grid-cols-none">{footer}</div> : null}
          </>
        ) : children}
      </div>
    </div>
  );

  return nested ? createPortal(overlay, document.body) : overlay;
}
