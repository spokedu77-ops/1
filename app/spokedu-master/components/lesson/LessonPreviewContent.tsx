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
  locked = false,
  onPlaybackStarted,
}: {
  program: Program;
  badges?: ReactNode;
  footer?: ReactNode;
  autoplayVideo?: boolean;
  locked?: boolean;
  onPlaybackStarted?: () => void;
}) {
  const model = buildLessonDisplayModel(program);
  const previewEquipment = locked ? [] : model.equipment.slice(0, 3);
  const previewRules = locked ? [] : model.activityMethod.slice(0, 3);
  const previewScript = locked ? '' : model.previewCoachScript;
  const hasSummaryContent =
    !locked &&
    (previewEquipment.length > 0 ||
      Boolean(previewScript) ||
      previewRules.length > 0);
  const meta = [model.target, model.space].filter(Boolean).slice(0, 3);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <LessonTitle title={model.title} badges={badges} />
        {meta.length > 0 ? (
          <p className="mt-1 truncate text-[12px] font-bold text-slate-500">{meta.join(' · ')}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.62fr)_minmax(320px,0.88fr)] lg:items-start">
        <div data-preview-column="media" className="min-w-0">
          <LessonPreviewMedia
            program={program}
            layout="preview"
            autoplay={locked ? false : autoplayVideo}
            onPlaybackStarted={onPlaybackStarted}
          />
        </div>

        {locked ? (
          <aside
            data-preview-column="content"
            className="min-w-0 rounded-[14px] border border-amber-200 bg-amber-50/80 p-4"
          >
            <p className="text-[11px] font-black uppercase tracking-[0.08em] text-amber-800">프리미엄 전용</p>
            <p className="mt-2 text-[13px] font-semibold leading-6 text-amber-950">
              준비물, 코치 스크립트, 활동 방법, 참고 영상은 프리미엄 이용권에서 확인할 수 있습니다.
            </p>
          </aside>
        ) : null}

        {!locked && hasSummaryContent ? (
          <aside
            data-preview-column="content"
            data-preview-summary
            className="min-w-0 rounded-[14px] border border-slate-200 bg-white p-4 [scrollbar-width:thin] lg:max-h-[min(620px,calc(100dvh-260px))] lg:overflow-y-auto"
            tabIndex={0}
          >
            <div className="space-y-5">
              {previewEquipment.length > 0 ? (
                <section>
                  <p className="sr-only">핵심 준비물</p>
                  <h3 className="text-[11px] font-black uppercase tracking-[0.08em] text-emerald-700">대표 준비물</h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {previewEquipment.map((item) => (
                      <span
                        key={item}
                        className="inline-flex min-h-7 max-w-full items-center gap-1.5 rounded-[9px] border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[12px] font-bold leading-4 text-emerald-900"
                      >
                        <Package className="h-3.5 w-3.5 shrink-0 text-[var(--spm-grn)]" />
                        <span className="min-w-0 break-words">{item}</span>
                      </span>
                    ))}
                  </div>
                </section>
              ) : null}

              {previewScript ? (
                <section className="rounded-[12px] border border-[color-mix(in_srgb,var(--spm-acc)_22%,transparent)] bg-[var(--spm-acc-glow)] p-3">
                  <p className="sr-only">수업 목표</p>
                  <h3 className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-[var(--spm-acc)]">
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
                        <span className="relative z-10 grid h-7 w-7 place-items-center rounded-full border border-slate-200 bg-white text-[11px] font-black text-[var(--spm-acc)]">
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
