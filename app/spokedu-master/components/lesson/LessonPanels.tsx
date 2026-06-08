import { BookOpen } from 'lucide-react';
import type { ReactNode } from 'react';

const CELL_CLASS =
  'flex min-h-[88px] flex-col rounded-[14px] border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.04)]';

function LessonFactCell({ label, value, children }: { label: string; value?: string; children?: ReactNode }) {
  return (
    <div className={CELL_CLASS}>
      <p className="text-[11px] font-black uppercase tracking-[0.1em] text-indigo-500">{label}</p>
      {children ?? (
        <p className="mt-2 flex-1 text-[13px] font-black leading-5 text-slate-950">{value || '—'}</p>
      )}
    </div>
  );
}

export function LessonTitle({ title, badges }: { title: string; badges?: ReactNode }) {
  return (
    <header>
      {badges ? <div className="mb-3 flex flex-wrap items-center gap-2">{badges}</div> : null}
      <h2 className="text-2xl font-black leading-tight text-slate-950 sm:text-3xl">{title}</h2>
    </header>
  );
}

export function LessonQuadGrid({ cells }: { cells: Array<{ label: string; value: string }> }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {cells.map((cell) => (
        <LessonFactCell key={cell.label} label={cell.label} value={cell.value} />
      ))}
    </div>
  );
}

export function LessonPairGrid({ left, right }: { left: { label: string; content: ReactNode }; right: { label: string; content: ReactNode } }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <LessonFactCell label={left.label}>{left.content}</LessonFactCell>
      <LessonFactCell label={right.label}>{right.content}</LessonFactCell>
    </div>
  );
}

export function LessonBulletList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <p className="mt-2 flex-1 text-[13px] font-semibold leading-5 text-slate-400">—</p>;
  }
  return (
    <ul className="mt-2 flex-1 space-y-2">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2 text-[13px] font-bold leading-5 text-slate-700">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
          <span className="min-w-0">{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function LessonScriptText({ text }: { text: string }) {
  if (!text) {
    return <p className="mt-2 flex-1 text-[13px] font-semibold leading-6 text-slate-400">—</p>;
  }
  return <p className="mt-2 flex-1 whitespace-pre-line text-[13px] font-semibold leading-6 text-slate-700">{text}</p>;
}

export function LessonFullSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[14px] border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
      <h3 className="flex items-center gap-2 text-sm font-black text-slate-950">
        <BookOpen className="h-4 w-4 text-indigo-600" />
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function LessonNumberedList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <p className="text-[13px] font-semibold text-slate-400">—</p>;
  }
  return (
    <ol className="space-y-2">
      {items.map((step, index) => (
        <li key={`${step}-${index}`} className="grid grid-cols-[28px_1fr] gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-700">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-xs font-black text-indigo-600 ring-1 ring-slate-200">
            {index + 1}
          </span>
          <span className="min-w-0 font-semibold">{step}</span>
        </li>
      ))}
    </ol>
  );
}
