import { ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';

export function SystemDecisionBanner({
  eyebrow,
  title,
  description,
  meta,
  href,
  actionLabel,
  tone = 'brand',
}: {
  eyebrow: string;
  title: string;
  description: string;
  meta?: string;
  href: string;
  actionLabel: string;
  tone?: 'brand' | 'attention';
}) {
  const attention = tone === 'attention';
  return (
    <section
      data-system-decision
      className={`rounded-2xl border p-4 sm:p-5 ${attention ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50/75'}`}
    >
      <div className="flex items-start gap-3">
        <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white ring-1 ${attention ? 'text-amber-700 ring-amber-200' : 'text-emerald-700 ring-emerald-200'}`}>
          <Sparkles aria-hidden className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className={`text-[10px] font-black uppercase tracking-[0.14em] ${attention ? 'text-amber-700' : 'text-emerald-700'}`}>{eyebrow}</p>
            {meta ? <span className={`text-xs font-black ${attention ? 'text-amber-800' : 'text-emerald-800'}`}>{meta}</span> : null}
          </div>
          <h2 className={`mt-1 text-base font-black sm:text-lg ${attention ? 'text-amber-950' : 'text-emerald-950'}`}>{title}</h2>
          <p className={`mt-1 text-sm font-semibold leading-6 ${attention ? 'text-amber-900/75' : 'text-emerald-900/75'}`}>{description}</p>
          <Link
            href={href}
            className={`mt-3 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-white px-4 text-sm font-black ring-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${attention ? 'text-amber-950 ring-amber-200 focus-visible:outline-amber-700' : 'text-emerald-950 ring-emerald-200 focus-visible:outline-emerald-700'}`}
          >
            {actionLabel}<ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
