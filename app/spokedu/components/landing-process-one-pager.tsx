import { koreanLineBreak, siteBtnPrimary } from '../lib/ui-classes';

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#245DFF]';

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
      <div className="border-b border-[#DBE6FB] bg-[#F5F7FB] px-5 py-5 sm:px-6 sm:py-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#245DFF]">{eyebrow}</p>
        <h3 className={`mt-1.5 text-lg font-bold tracking-tight text-[#0B1F46] sm:text-xl ${koreanLineBreak}`}>
          {title}
        </h3>
        <p className={`mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-600 ${koreanLineBreak}`}>{lead}</p>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
          <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {flow.map((step, index) => (
              <li key={step.label} className="rounded-xl border border-[#DCE3EE] bg-[#F7F9FD] px-3.5 py-3.5">
                <span className="text-[10px] font-semibold tracking-[0.08em] text-[#245DFF]">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <p className={`mt-1 text-sm font-bold text-[#0B1F46] ${koreanLineBreak}`}>{step.label}</p>
                <p className={`mt-1 text-xs leading-relaxed text-slate-600 ${koreanLineBreak}`}>{step.detail}</p>
              </li>
            ))}
          </ol>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#245DFF]">{formats.title}</p>
            <ul className="mt-2.5 flex flex-wrap gap-2">
              {formats.items.map((item) => (
                <li
                  key={item}
                  className="rounded-lg border border-[#D6E3FF] bg-[#EEF4FF] px-3 py-1.5 text-xs font-semibold text-[#0B1F46]"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-[#EDF0F5] bg-[#F7F9FD] px-5 py-5 sm:px-6 sm:py-6 lg:border-l lg:border-t-0">
          <p className={`text-sm font-bold text-[#0B1F46] ${koreanLineBreak}`}>{checklist.title}</p>
          <ul className="mt-3 space-y-2">
            {checklist.items.map((item) => (
              <li
                key={item}
                className={`flex gap-2 rounded-lg border border-[#DCE3EE] bg-white px-3 py-2 text-sm leading-snug text-slate-700 ${koreanLineBreak}`}
              >
                <span className="mt-0.5 shrink-0 text-[#245DFF]" aria-hidden>
                  ✓
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <a href={cta.href} className={`mt-4 w-full ${siteBtnPrimary} ${focusRing}`}>
            {cta.label}
          </a>
        </div>
      </div>
    </div>
  );
}
