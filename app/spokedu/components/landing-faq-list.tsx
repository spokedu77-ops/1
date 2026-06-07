import { koreanLineBreak } from '../lib/ui-classes';

const accentOpen = {
  violet: 'bg-violet-50 text-violet-700',
  sky: 'bg-sky-50 text-sky-700',
} as const;

type FaqItem = { q: string; a: string };

type LandingFaqListProps = {
  items: readonly FaqItem[];
  accent?: keyof typeof accentOpen;
};

export function LandingFaqList({ items, accent = 'violet' }: LandingFaqListProps) {
  return (
    <div className="space-y-2.5">
      {items.map((item) => (
        <details
          key={item.q}
          className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white"
        >
          <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-3.5 sm:items-center sm:px-5 sm:py-4 [&::-webkit-details-marker]:hidden">
            <span className={`min-w-0 flex-1 text-sm font-semibold leading-snug text-slate-950 ${koreanLineBreak}`}>
              {item.q}
            </span>
            <span
              className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold transition group-open:rotate-45 sm:mt-0 ${accentOpen[accent]}`}
              aria-hidden
            >
              +
            </span>
          </summary>
          <div className="border-t border-slate-100 px-4 pb-4 pt-3 sm:px-5 sm:pb-4">
            <p className={`text-sm leading-relaxed text-slate-600 ${koreanLineBreak}`}>{item.a}</p>
          </div>
        </details>
      ))}
    </div>
  );
}
