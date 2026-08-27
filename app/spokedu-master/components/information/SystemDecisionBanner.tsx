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
  description?: string;
  meta?: string;
  href: string;
  actionLabel: string;
  tone?: 'brand' | 'attention';
}) {
  const attention = tone === 'attention';
  return (
    <section
      data-system-decision
      className={`rounded-[14px] border px-3 py-2.5 ${attention ? 'border-amber-200/80 bg-amber-50/65' : 'border-emerald-200 bg-emerald-50/75'}`}
    >
      <div className="flex items-center gap-2.5">
        <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white ring-1 ${attention ? 'text-amber-700 ring-amber-200' : 'text-emerald-700 ring-emerald-200'}`}>
          <Sparkles aria-hidden className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className={`text-[9px] font-black uppercase tracking-[0.14em] ${attention ? 'text-amber-700' : 'text-emerald-700'}`}>{eyebrow}</p>
            {meta ? <span className={`text-[11px] font-black ${attention ? 'text-amber-800' : 'text-emerald-800'}`}>{meta}</span> : null}
          </div>
          <h2 className={`mt-0.5 text-sm font-black ${attention ? 'text-amber-950' : 'text-emerald-950'}`}>{title}</h2>
          {description ? <p className={`mt-0.5 text-xs font-semibold leading-5 ${attention ? 'text-amber-900/70' : 'text-emerald-900/70'}`}>{description}</p> : null}
        </div>
        <Link
          href={href}
          className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-1 rounded-lg bg-white px-3 text-xs font-black ring-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${attention ? 'text-amber-950 ring-amber-200 focus-visible:outline-amber-700' : 'text-emerald-950 ring-emerald-200 focus-visible:outline-emerald-700'}`}
        >
          {actionLabel}<ArrowRight aria-hidden className="h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  );
}
