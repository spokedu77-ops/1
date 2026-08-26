'use client';

import { ArrowRight, History } from 'lucide-react';
import Link from 'next/link';

export function PersonalizedNote({
  label,
  date,
  context,
  preview,
  href,
  actionLabel,
}: {
  label: string;
  date: string;
  context: string;
  preview: string;
  href: string;
  actionLabel: string;
}) {
  return (
    <aside
      data-personalized-note
      className="relative overflow-hidden rounded-2xl border border-blue-100 bg-blue-50/65 px-4 py-4 text-left before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-blue-500 sm:px-5"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-blue-700 ring-1 ring-blue-100">
          <History aria-hidden className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black text-blue-800">{label}</p>
          <p className="mt-1 truncate text-[11px] font-semibold text-slate-500">{date} · {context}</p>
          <p className="mt-2 line-clamp-3 whitespace-pre-wrap break-words text-[13px] font-bold leading-6 text-slate-700">
            {preview}
          </p>
          <Link
            href={href}
            className="mt-2 inline-flex min-h-11 items-center gap-1 text-xs font-black text-blue-700 underline decoration-blue-300 underline-offset-4 transition-colors hover:text-blue-900 focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            {actionLabel}
            <ArrowRight aria-hidden className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
