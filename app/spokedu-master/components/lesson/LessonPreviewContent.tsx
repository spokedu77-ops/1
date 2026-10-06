'use client';

import { AlertTriangle, MessageSquareQuote, Package } from 'lucide-react';
import type { ReactNode } from 'react';

import { isLessonPlaceholder } from '../../lib/lessonDisplay';
import { buildLessonDisplayModel } from '../../lib/lessonDisplayModel';
import type { Program } from '../../types';
import { LessonPreviewMedia } from './LessonPreviewMedia';
import { LessonTitle } from './LessonPanels';

function firstUsableLine(values: string[]) {
  return values.map((value) => value.trim()).find((value) => value && !isLessonPlaceholder(value)) ?? '';
}

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
  showHeading = true,
  onPlaybackStarted,
}: {
  program: Program;
  badges?: ReactNode;
  footer?: ReactNode;
  autoplayVideo?: boolean;
  locked?: boolean;
  showHeading?: boolean;
  onPlaybackStarted?: () => void;
}) {
  const model = buildLessonDisplayModel(program);
  const previewEquipment = locked ? [] : model.equipment.slice(0, 3);
  const previewRules = locked ? [] : model.activityMethod.slice(0, 3);
  const previewScript = locked ? '' : model.previewCoachScript;
  const previewSafety = locked ? '' : firstUsableLine(model.safetyNotes);
  const hasSummaryContent =
    !locked &&
    (previewEquipment.length > 0 ||
      Boolean(previewScript) ||
      previewRules.length > 0 ||
      Boolean(previewSafety));
  const meta = [model.target, model.space].filter(Boolean).slice(0, 3);

  if (locked) {
    return (
      <div data-preview-locked="" className="flex flex-col gap-3">
        {showHeading ? (
          <div>
            <LessonTitle title={model.title} badges={badges} />
            {meta.length > 0 ? (
              <p className="mt-1 truncate text-[12px] font-bold text-slate-500">{meta.join(' · ')}</p>
            ) : null}
          </div>
        ) : badges ? (
          <div className="flex flex-wrap items-center gap-2">{badges}</div>
        ) : null}

        <aside className="min-w-0 rounded-[14px] border border-amber-200 bg-amber-50/80 p-4">
          <p className="text-[13px] font-semibold leading-6 text-amber-950">
            Lite에서 전체 수업 자료를 이용할 수 있습니다.
          </p>
        </aside>

        {footer ? <div className="shrink-0">{footer}</div> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {showHeading ? (
        <div>
          <LessonTitle title={model.title} badges={badges} />
          {meta.length > 0 ? (
            <p className="mt-1 truncate text-[12px] font-bold text-slate-500">{meta.join(' · ')}</p>
          ) : null}
        </div>
      ) : badges ? (
        <div className="flex flex-wrap items-center gap-2">{badges}</div>
      ) : null}

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
            className="min-w-0 rounded-[14px] border border-slate-200 bg-white p-4"
            tabIndex={0}
          >
            <div className="space-y-5">
              {previewEquipment.length > 0 ? (
                <section>
                  <p className="sr-only">핵심 준비물</p>
                  <h3 className="text-[13px] font-bold leading-[18px] tracking-[-0.01em] text-emerald-700">대표 준비물</h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {previewEquipment.map((item) => (
                      <span
                        key={item}
                        className="inline-flex min-h-7 max-w-full items-center gap-1.5 rounded-[9px] border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[13px] font-semibold leading-[18px] tracking-normal text-emerald-900"
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
                  <h3 className="inline-flex items-center gap-1.5 text-[13px] font-bold leading-[18px] tracking-[-0.01em] text-[var(--spm-acc)]">
                    <MessageSquareQuote className="h-3.5 w-3.5" />
                    수업 스크립트
                  </h3>
                  <p className="mt-2 whitespace-pre-line text-[14px] font-semibold leading-[1.6] tracking-[-0.005em] text-slate-700">
                    {quoteScript(previewScript)}
                  </p>
                </section>
              ) : null}

              {previewRules.length > 0 ? (
                <section className="border-t border-slate-100 pt-4">
                  <p className="sr-only">주요 활동 순서 요약</p>
                  <h3 className="text-[13px] font-bold leading-[18px] tracking-[-0.01em] text-slate-700">활동 방법</h3>
                  <ol className="relative mt-3 space-y-0">
                    {previewRules.map((rule, index) => (
                      <li key={`${rule}-${index}`} className="relative grid grid-cols-[2rem_minmax(0,1fr)] gap-2.5 pb-3 last:pb-0">
                        <span className="relative z-10 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--spm-acc)_14%,white)] text-[11px] font-bold tabular-nums text-[var(--spm-acc)] ring-1 ring-[color-mix(in_srgb,var(--spm-acc)_28%,transparent)]">
                          {index + 1}
                        </span>
                        <span className="min-w-0 pt-1 text-[14px] font-semibold leading-[1.55] tracking-[-0.005em] text-slate-700">
                          {rule}
                        </span>
                      </li>
                    ))}
                  </ol>
                </section>
              ) : null}

              {previewSafety ? (
                <section className="border-t border-slate-100 pt-4">
                  <h3 className="inline-flex items-center gap-1.5 text-[13px] font-bold leading-[18px] tracking-[-0.01em] text-amber-700">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    핵심 안전사항
                  </h3>
                  <p className="mt-2 text-[14px] font-semibold leading-[1.6] tracking-[-0.005em] text-slate-700">{previewSafety}</p>
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
