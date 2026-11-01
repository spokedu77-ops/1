'use client';

import Script from 'next/script';
import { useMemo } from 'react';
import './stitch-c0-base.css';

const STITCH_BASE_LAYER = `@layer base{html,body{margin:0;padding:0;}body{overscroll-behavior:none;}main>:first-child{margin-top:0!important;}main>:last-child{margin-bottom:0!important;}}::-webkit-scrollbar{display:none;}`;

type Props = {
  bodyHtml: string;
  bodyClass: string;
  tailwindConfigScript: string;
};

export function StitchC0Shell({ bodyHtml, bodyClass, tailwindConfigScript }: Props) {
  const rootClass = useMemo(() => `stitch-c0-root ${bodyClass}`.trim(), [bodyClass]);

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
      <div className={rootClass} dangerouslySetInnerHTML={{ __html: bodyHtml }} suppressHydrationWarning />
    </>
  );
}
