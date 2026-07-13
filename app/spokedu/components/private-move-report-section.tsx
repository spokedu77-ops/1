'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { privatePage } from '../data/private-page';
import { btnPrimary, btnSecondary, koreanLineBreak } from '../lib/ui-classes';
import { LandingSectionHeading } from './landing-section-heading';

const LS_KEY = 'private.moveReport.summary';

export function PrivateMoveReportSection() {
  const [summary, setSummary] = useState('');
  const section = privatePage.moveReport;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(LS_KEY)?.trim() ?? '';
    if (stored) setSummary(stored);
  }, []);

  const persistSummary = useCallback((value: string) => {
    if (typeof window === 'undefined') return;
    const normalized = value.trim();
    if (!normalized) {
      window.localStorage.removeItem(LS_KEY);
      return;
    }
    window.localStorage.setItem(LS_KEY, normalized);
  }, []);

  const handleApply = useCallback(() => {
    persistSummary(summary);
  }, [persistSummary, summary]);

  const handleReset = useCallback(() => {
    setSummary('');
    persistSummary('');
  }, [persistSummary]);

  const contactHref =
    summary.trim().length > 0
      ? `${section.contactHref}&reportSummary=${encodeURIComponent(summary.trim())}`
      : section.contactHref;

  return (
    <section id="move-report" className="scroll-mt-20 space-y-5 sm:space-y-6">
      <LandingSectionHeading
        eyebrow={section.eyebrow}
        title={section.title}
        lead={section.lead}
        accent="teal"
      />

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start lg:gap-6">
        <div className="rounded-[1.35rem] border border-teal-200/70 bg-gradient-to-br from-teal-50/50 via-white to-stone-50/40 p-5 sm:p-6">
          <p className="text-xs font-semibold tracking-wide text-teal-800">{section.kicker}</p>
          <h3 className={`mt-2 text-base font-semibold text-slate-950 sm:text-lg ${koreanLineBreak}`}>
            {section.headline}
          </h3>
          <p className={`mt-2 text-sm leading-relaxed text-slate-600 ${koreanLineBreak}`}>{section.description}</p>
          <ol className="mt-4 space-y-2">
            {section.steps.map((step, index) => (
              <li key={step} className="flex gap-2.5 text-sm text-slate-700">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-600/10 text-[11px] font-bold text-teal-900">
                  {index + 1}
                </span>
                <span className={koreanLineBreak}>{step}</span>
              </li>
            ))}
          </ol>
          <div className="mt-5">
            <Link
              href={section.startHref}
              target="_blank"
              rel="noopener noreferrer"
              data-track="cta-move-report"
              data-track-label="private-move-report-start"
              className={`${btnPrimary} min-h-12 !w-full sm:!w-auto`}
            >
              {section.startLabel}
            </Link>
          </div>
        </div>

        <div className="rounded-[1.35rem] border border-slate-200/80 bg-white p-5 sm:p-6">
          <label htmlFor="private-move-report-summary" className="text-sm font-semibold text-slate-950">
            상담 연동용 요약
          </label>
          <textarea
            id="private-move-report-summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={6}
            placeholder="간단 진단 결과의 핵심 내용을 붙여넣어 주세요."
            className="mt-3 w-full resize-y rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-3 text-sm leading-relaxed text-slate-800 outline-none transition focus:border-teal-300 focus:bg-white focus:ring-2 focus:ring-teal-100"
          />
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={handleApply} className={`${btnSecondary} min-h-11 !w-full sm:!w-auto`}>
              요약 저장
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 sm:w-auto"
            >
              초기화
            </button>
          </div>
          <p className="mt-4">
            <Link
              href={contactHref}
              data-track="cta-contact"
              data-track-label="private-move-report-contact"
              className={`${btnPrimary} min-h-12 !w-full sm:!w-auto`}
            >
              {section.contactLabel}
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
