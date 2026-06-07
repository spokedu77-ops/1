import { dispatchPage } from '../data/dispatch-page';
import { koreanLineBreak } from '../lib/ui-classes';
import { LandingSectionHeading } from './landing-section-heading';

function CheckIcon() {
  return (
    <svg className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function DispatchComparisonSection() {
  const section = dispatchPage.comparison;

  return (
    <div className="space-y-5 sm:space-y-6">
      <LandingSectionHeading
        id={section.id}
        eyebrow={section.eyebrow}
        title={section.title}
        lead={section.lead}
        accent="sky"
      />

      {/* 모바일·태블릿: 카드형 비교 */}
      <div className="space-y-3 lg:hidden">
        {section.rows.map((row) => (
          <article
            key={row.label}
            className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.02]"
          >
            <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-900">{row.label}</h3>
            </div>
            <div className="divide-y divide-slate-100">
              <div className="flex gap-3 bg-sky-50/40 px-4 py-3.5">
                <CheckIcon />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-sky-800">SPOKEDU</p>
                  <p className={`mt-1 text-sm leading-relaxed text-slate-700 ${koreanLineBreak}`}>{row.spokedu}</p>
                </div>
              </div>
              <div className="flex gap-3 px-4 py-3.5">
                <XIcon />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">일반 업체</p>
                  <p className={`mt-1 text-sm leading-relaxed text-slate-500 ${koreanLineBreak}`}>{row.basic}</p>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* 데스크톱: 표 */}
      <div className="hidden overflow-hidden rounded-[1.35rem] border border-slate-200/80 bg-white lg:block">
        <div className="grid grid-cols-[minmax(0,0.85fr)_1fr_1fr] border-b border-slate-100 bg-slate-50/90">
          <div className="px-5 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-500">비교 항목</div>
          <div className="border-l border-slate-100 px-5 py-3.5">
            <span className="text-xs font-bold text-sky-800">SPOKEDU</span>
            <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700">PREMIUM</span>
          </div>
          <div className="border-l border-slate-100 px-5 py-3.5 text-xs font-bold text-slate-500">일반 업체</div>
        </div>
        {section.rows.map((row, index) => (
          <div
            key={row.label}
            className={`grid grid-cols-[minmax(0,0.85fr)_1fr_1fr] border-t border-slate-100 ${
              index % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'
            }`}
          >
            <div className="px-5 py-4 text-sm font-semibold text-slate-900">{row.label}</div>
            <div className="flex gap-2.5 border-l border-slate-100 bg-sky-50/30 px-5 py-4">
              <CheckIcon />
              <p className={`text-sm leading-relaxed text-slate-700 ${koreanLineBreak}`}>{row.spokedu}</p>
            </div>
            <div className="flex gap-2.5 border-l border-slate-100 px-5 py-4">
              <XIcon />
              <p className={`text-sm leading-relaxed text-slate-500 ${koreanLineBreak}`}>{row.basic}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
