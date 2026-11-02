'use client';

import Script from 'next/script';
import { useEffect, useMemo, useRef, useState } from 'react';
import { STITCH_DATA_PATH_HREF } from './stitch-data-path-routes';
import { WebsiteChrome } from '../../components/website-chrome';
import './stitch-c0-base.css';

const STITCH_BASE_LAYER = `@layer base{html,body{margin:0;padding:0;}body{overscroll-behavior:none;}main>:first-child{margin-top:0!important;}main>:last-child{margin-bottom:0!important;}}::-webkit-scrollbar{display:none;}`;

type Props = {
  bodyHtml: string;
  bodyClass: string;
  tailwindConfigScript: string;
};

function wireStitchDataPathLinks(root: HTMLElement) {
  root.querySelectorAll('[data-path]').forEach((node) => {
    if (!(node instanceof HTMLAnchorElement)) return;
    const key = node.getAttribute('data-path');
    if (!key) return;
    const href = STITCH_DATA_PATH_HREF[key];
    if (href) {
      const type = ({ '/education': 'dispatch', '/private': 'private', '/spomove': 'spomove' } as Record<string, string>)[window.location.pathname];
      node.setAttribute('href', key === 'inquiry' && type && node.closest('main') ? `${href}?type=${type}` : href);
    }
  });
}

/** Reproduce the source records filter without executing injected HTML scripts. */
function wireStitchRecordFilters(root: HTMLElement) {
  const onClick = (event: MouseEvent) => {
    const button = event.target instanceof Element
      ? event.target.closest<HTMLButtonElement>('button.filter-btn[data-filter]')
      : null;
    if (!button || !root.contains(button)) return;
    const filter = button.dataset.filter;
    root.querySelectorAll<HTMLButtonElement>('button.filter-btn[data-filter]').forEach((item) => {
      const active = item === button;
      item.classList.toggle('bg-primary-container', active);
      item.classList.toggle('text-on-primary', active);
      item.classList.toggle('shadow-sm', active);
      item.classList.toggle('text-on-surface-variant', !active);
      item.setAttribute('aria-pressed', String(active));
    });
    root.querySelectorAll<HTMLElement>('.record-card[data-category]').forEach((card) => {
      const categories = card.dataset.category?.split(/\s+/) ?? [];
      card.style.display = filter === 'all' || (filter && categories.includes(filter)) ? 'flex' : 'none';
    });
  };
  root.addEventListener('click', onClick);
  return () => root.removeEventListener('click', onClick);
}

declare global {
  interface Window {
    tailwind?: { refresh?: () => void };
  }
}

export function StitchC0Shell({ bodyHtml, bodyClass, tailwindConfigScript }: Props) {
  const rootClass = useMemo(() => `stitch-c0-root ${bodyClass}`.trim(), [bodyClass]);
  const rootRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root = rootRef.current;
    if (!root) return;
    root.innerHTML = bodyHtml;
    root.dataset.stitchPage = window.location.pathname;
    root.querySelector(':scope > header')?.remove();
    root.querySelector(':scope > footer')?.remove();
    wireStitchDataPathLinks(root);
    const disposeRecordFilters = wireStitchRecordFilters(root);
    const refresh = () => window.tailwind?.refresh?.();
    refresh();
    const t = window.setTimeout(refresh, 150);
    const t2 = window.setTimeout(refresh, 600);
    return () => {
      disposeRecordFilters();
      window.clearTimeout(t);
      window.clearTimeout(t2);
    };
  }, [mounted, bodyHtml]);

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&display=swap"
        rel="stylesheet"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
        rel="stylesheet"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        rel="stylesheet"
      />
      <style dangerouslySetInnerHTML={{ __html: STITCH_BASE_LAYER }} />
      <Script src="https://cdn.tailwindcss.com" strategy="beforeInteractive" />
      <Script
        id="stitch-tailwind-config"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: tailwindConfigScript }}
      />
      <WebsiteChrome><div ref={rootRef} className={rootClass} suppressHydrationWarning /></WebsiteChrome>
    </>
  );
}
