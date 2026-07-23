import { fineHover, koreanLineBreak } from '../lib/ui-classes';

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600';

export type LandingProcessOnePagerData = {
  eyebrow: string;
  title: string;
  lead: string;
  flow: readonly { label: string; detail: string }[];
  checklist: { title: string; items: readonly string[] };
  formats: { title: string; items: readonly string[] };
  cta: { label: string; href: string };
};

/** 퍼널 공통 — 문의→운영 한 장 요약 + 체크리스트 */
export function LandingProcessOnePager({ data }: { data: LandingProcessOnePagerData }) {
  const { eyebrow, title, lead, flow, checklist, formats, cta } = data;

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-stone-200/80 bg-white shadow-[0_18px_50px_-36px_rgba(15,23,42,0.45)]">
      <div className="border-b border-stone-100 bg-[#FAFAF8] px-5 py-5 sm:px-6 sm:py-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-teal-800">{eyebrow}</p>
        <h3 className={`mt-1.5 text-lg font-bold tracking-tight text-slate-950 sm:text-xl ${koreanLineBreak}`}>
          {title}
        </h3>
        <p className={`mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-600 ${koreanLineBreak}`}>{lead}</p>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
          <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {flow.map((step, index) => (
              <li key={step.label} className="rounded-xl border border-stone-200/80 bg-stone-50/70 px-3.5 py-3.5">
                <span className="text-[10px] font-semibold tracking-[0.08em] text-teal-700">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <p className={`mt-1 text-sm font-bold text-slate-950 ${koreanLineBreak}`}>{step.label}</p>
                <p className={`mt-1 text-xs leading-relaxed text-slate-600 ${koreanLineBreak}`}>{step.detail}</p>
              </li>
            ))}
          </ol>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-teal-800">{formats.title}</p>
            <ul className="mt-2.5 flex flex-wrap gap-2">
              {formats.items.map((item) => (
                <li
                  key={item}
                  className="rounded-lg border border-teal-100 bg-teal-50/70 px-3 py-1.5 text-xs font-semibold text-teal-900"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-stone-100 bg-stone-50/50 px-5 py-5 sm:px-6 sm:py-6 lg:border-l lg:border-t-0">
          <p className={`text-sm font-bold text-slate-950 ${koreanLineBreak}`}>{checklist.title}</p>
          <ul className="mt-3 space-y-2">
            {checklist.items.map((item) => (
              <li
                key={item}
                className={`flex gap-2 rounded-lg border border-stone-200/70 bg-white px-3 py-2 text-sm leading-snug text-slate-700 ${koreanLineBreak}`}
              >
                <span className="mt-0.5 shrink-0 text-teal-700" aria-hidden>
                  ✓
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <a
            href={cta.href}
            className={`mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-[#0F1C1A] px-4 text-sm font-bold text-white ${fineHover}hover:bg-teal-950 ${focusRing}`}
          >
            {cta.label}
          </a>
        </div>
      </div>
    </div>
  );
}
