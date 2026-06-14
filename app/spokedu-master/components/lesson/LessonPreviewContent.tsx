'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

import { buildLessonDisplayModel } from '../../lib/lessonDisplayModel';
import type { Program } from '../../types';
import { LessonPreviewMedia } from './LessonPreviewMedia';
import { LessonTitle } from './LessonPanels';

function getPreviewScript(script: string) {
  return script.split('\n').map((line) => line.trim()).filter(Boolean).slice(0, 4).join('\n');
}

export function LessonPreviewContent({
  program,
  badges,
  footer,
  autoplayVideo = false,
  onPlaybackStarted,
}: {
  program: Program;
  badges?: ReactNode;
  footer?: ReactNode;
  autoplayVideo?: boolean;
  onPlaybackStarted?: () => void;
}) {
  const model = buildLessonDisplayModel(program);
  const previewRules = model.activityMethod.slice(0, 3);
  const previewVariations = model.variationMethod.slice(0, 2);
  const mediaRef = useRef<HTMLDivElement | null>(null);
  const [mediaHeight, setMediaHeight] = useState<number>();
  const meta = [model.theme, model.target, model.space].filter(Boolean).slice(0, 3);

  useEffect(() => {
    const media = mediaRef.current?.querySelector<HTMLElement>('[data-preview-media]');
    if (!media) return;
    const observer = new ResizeObserver(([entry]) => {
      setMediaHeight(entry.contentRect.height);
    });
    observer.observe(media);
    return () => observer.disconnect();
  }, []);

  const summaryStyle = mediaHeight
    ? ({ '--preview-media-height': `${mediaHeight}px` } as CSSProperties)
    : undefined;

  return (
    <div className="flex flex-col gap-3">
      <div>
        <LessonTitle title={model.title} badges={badges} />
        {meta.length > 0 ? (
          <p className="mt-1 truncate text-[12px] font-bold text-slate-500">{meta.join(' · ')}</p>
        ) : null}
        {model.tags.length > 0 ? (
          <div className="mt-2 flex max-h-6 gap-1.5 overflow-hidden">
            {model.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.62fr)_minmax(320px,0.88fr)] lg:items-start">
        <div ref={mediaRef} data-preview-column="media" className="min-w-0">
          <LessonPreviewMedia
            program={program}
            layout="preview"
            autoplay={autoplayVideo}
            onPlaybackStarted={onPlaybackStarted}
          />
        </div>

        <aside
          data-preview-column="content"
          data-preview-summary
          className="min-w-0 overflow-y-auto rounded-[14px] border border-slate-200 bg-white px-4 py-1 [scrollbar-width:thin] lg:h-[var(--preview-media-height)]"
          style={summaryStyle}
          tabIndex={0}
        >
          {model.equipment.length > 0 ? (
            <section className="py-3">
              <h3 className="text-[11px] font-black uppercase tracking-[0.08em] text-emerald-700">준비물</h3>
              <p className="mt-1.5 text-[13px] font-semibold leading-5 text-slate-700">
                {model.equipment.slice(0, 6).join(' · ')}
              </p>
            </section>
          ) : null}
          {model.coachScript ? (
            <section className="border-t border-slate-100 py-3">
              <h3 className="text-[11px] font-black uppercase tracking-[0.08em] text-indigo-700">수업 스크립트</h3>
              <p className="mt-1.5 line-clamp-4 whitespace-pre-line text-[13px] font-semibold leading-5 text-slate-700">
                {getPreviewScript(model.coachScript)}
              </p>
            </section>
          ) : null}
          {previewRules.length > 0 ? (
            <section className="border-t border-slate-100 py-3">
              <h3 className="text-[11px] font-black uppercase tracking-[0.08em] text-slate-600">활동 방법</h3>
              <ol className="mt-1.5 space-y-1.5 text-[13px] font-semibold leading-5 text-slate-700">
                {previewRules.map((rule, index) => <li key={`${rule}-${index}`}>{index + 1}. {rule}</li>)}
              </ol>
            </section>
          ) : null}
          {previewVariations.length > 0 ? (
            <section className="border-t border-slate-100 py-3">
              <h3 className="text-[11px] font-black uppercase tracking-[0.08em] text-slate-600">변형 방법</h3>
              <ul className="mt-1.5 space-y-1.5 text-[13px] font-semibold leading-5 text-slate-700">
                {previewVariations.map((variation) => <li key={variation}>• {variation}</li>)}
              </ul>
            </section>
          ) : null}
        </aside>
      </div>

      {footer ? (
        <div className="shrink-0">{footer}</div>
      ) : null}
    </div>
  );
}
