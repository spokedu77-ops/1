'use client';

import { MessageSquareQuote, Package } from 'lucide-react';
import type { ReactNode } from 'react';

import { buildLessonDisplayModel } from '../../lib/lessonDisplayModel';
import type { Program } from '../../types';
import { LessonPreviewMedia } from './LessonPreviewMedia';
import { LessonTitle } from './LessonPanels';

function quoteScript(script: string) {
  const trimmed = script.trim();
  if (!trimmed) return '';
  if (/^["“”'‘’「『]/.test(trimmed) && /["“”'‘’」』]$/.test(trimmed)) return trimmed;
  return `"${trimmed}"`;
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
  const previewEquipment = model.equipment.slice(0, 6);
  const previewRules = model.activityMethod.slice(0, 3);
  const previewScript = model.previewCoachScript;
  const quality = model.quality;
  const hasSummaryContent =
    previewEquipment.length > 0 ||
    Boolean(previewScript) ||
    previewRules.length > 0;
  const meta = [model.target, program.duration ? `${program.duration}분` : null, model.space].filter(Boolean).slice(0, 3);

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
        {quality.status !== 'READY' ? (
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold text-amber-800">
            {quality.status} · 부족: {quality.missing.slice(0, 3).join(', ')}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.62fr)_minmax(320px,0.88fr)] lg:items-start">
        <div data-preview-column="media" className="min-w-0">
          <LessonPreviewMedia
            program={program}
            layout="preview"
            autoplay={autoplayVideo}
            onPlaybackStarted={onPlaybackStarted}
          />
        </div>

        {hasSummaryContent ? (
          <aside
            data-preview-column="content"
            data-preview-summary
            className="min-w-0 rounded-[14px] border border-slate-200 bg-white p-4 [scrollbar-width:thin] lg:max-h-[min(620px,calc(100vh-260px))] lg:overflow-y-auto"
            tabIndex={0}
          >
            <div className="space-y-5">
              {previewEquipment.length > 0 ? (
                <section>
                  <p className="sr-only">핵심 준비물</p>
                  <h3 className="text-[11px] font-black uppercase tracking-[0.08em] text-emerald-700">준비물</h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {previewEquipment.map((item) => (
                      <span
                        key={item}
                        className="inline-flex min-h-7 max-w-full items-center gap-1.5 rounded-[9px] border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[12px] font-bold leading-4 text-emerald-900"
                      >
                        <Package className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        <span className="min-w-0 break-words">{item}</span>
                      </span>
                    ))}
                  </div>
                </section>
              ) : null}

              {previewScript ? (
                <section className="rounded-[12px] border border-indigo-100 bg-indigo-50/70 p-3">
                  <p className="sr-only">수업 목표</p>
                  <h3 className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-indigo-700">
                    <MessageSquareQuote className="h-3.5 w-3.5" />
                    수업 스크립트
                  </h3>
                  <p className="mt-2 whitespace-pre-line text-[13.5px] font-semibold leading-[1.6] text-slate-700">
                    {quoteScript(previewScript)}
                  </p>
                </section>
              ) : null}

              {previewRules.length > 0 ? (
                <section className="border-t border-slate-100 pt-4">
                  <p className="sr-only">주요 활동 순서 요약</p>
                  <h3 className="text-[11px] font-black uppercase tracking-[0.08em] text-slate-600">활동 방법</h3>
                  <ol className="mt-3 space-y-3">
                    {previewRules.map((rule, index) => (
                      <li key={`${rule}-${index}`} className="relative grid grid-cols-[28px_minmax(0,1fr)] gap-2.5">
                        {index < previewRules.length - 1 ? (
                          <span aria-hidden className="absolute left-[13px] top-7 h-[calc(100%+4px)] w-px bg-slate-200" />
                        ) : null}
                        <span className="relative z-10 grid h-7 w-7 place-items-center rounded-full border border-slate-200 bg-white text-[11px] font-black text-indigo-600">
                          {index + 1}
                        </span>
                        <span className="min-w-0 pt-0.5 text-[13px] font-semibold leading-6 text-slate-700">
                          {rule}
                        </span>
                      </li>
                    ))}
                  </ol>
                </section>
              ) : null}
            </div>
          </aside>
        ) : null}
      </div>

      {footer ? (
        <div className="shrink-0">{footer}</div>
      ) : null}
    </div>
  );
}
