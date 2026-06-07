'use client';

import { useCallback, useEffect, useState } from 'react';
import { privatePage } from '../data/private-page';
import { koreanLineBreak, landingCardShell } from '../lib/ui-classes';
import { LandingSectionHeading } from './landing-section-heading';

type ZoomedImage = { src: string; alt: string; title: string };

export function PrivateCurriculumSection() {
  const section = privatePage.curriculumPrograms;
  const [zoomed, setZoomed] = useState<ZoomedImage | null>(null);

  const closeZoom = useCallback(() => setZoomed(null), []);

  useEffect(() => {
    if (!zoomed) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeZoom();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [zoomed, closeZoom]);

  return (
    <>
      <div className="space-y-5 sm:space-y-6">
        <LandingSectionHeading
          eyebrow={section.eyebrow}
          title={section.title}
          lead={section.lead}
          accent="violet"
        />
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
          {section.items.map((item) => (
            <article
              key={item.title}
              className={`overflow-hidden transition hover:border-violet-200/80 ${landingCardShell}`}
            >
              <button
                type="button"
                className="group flex w-full cursor-zoom-in flex-col items-stretch border-0 bg-slate-50/80 p-2 sm:p-2.5"
                onClick={() => setZoomed({ src: item.img, alt: item.alt, title: item.title })}
                aria-label={`${item.title} 이미지 확대`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.img}
                  alt={item.alt}
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className="mx-auto h-auto w-full max-h-[min(42vw,220px)] object-contain object-center transition duration-200 group-hover:opacity-95 sm:max-h-[200px]"
                />
              </button>
              <div className="border-t border-slate-100 p-3 sm:p-3.5">
                <h3 className="text-sm font-semibold text-slate-950">{item.title}</h3>
                <p className={`mt-1 text-xs leading-snug text-slate-600 ${koreanLineBreak}`}>{item.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>

      {zoomed ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/85 p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`${zoomed.title} 이미지 확대`}
          onClick={closeZoom}
        >
          <div className="w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white">{zoomed.title}</p>
              <button
                type="button"
                onClick={closeZoom}
                className="shrink-0 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
              >
                닫기
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={zoomed.src}
              alt={zoomed.alt}
              decoding="async"
              referrerPolicy="no-referrer"
              className="mx-auto max-h-[calc(100vh-7rem)] w-auto max-w-full rounded-xl object-contain"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
