import { BookOpen, Check } from 'lucide-react';
import type { ReactNode } from 'react';

const CELL_CLASS =
  'flex min-h-[88px] flex-col rounded-[14px] border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.04)]';

const COMPACT_CELL_CLASS =
  'flex min-h-0 flex-col rounded-[10px] border border-slate-200 bg-white px-2.5 py-2 shadow-[0_4px_14px_rgba(15,23,42,0.03)]';

function LessonFactCell({
  label,
  value,
  children,
  compact = false,
}: {
  label: string;
  value?: string;
  children?: ReactNode;
  compact?: boolean;
}) {
  const boxClass = compact ? COMPACT_CELL_CLASS : CELL_CLASS;
  const labelClass = compact
    ? 'text-[9px] font-black uppercase tracking-[0.08em] text-[var(--spm-acc)]'
    : 'text-[11px] font-black uppercase tracking-[0.1em] text-[var(--spm-acc)]';
  const valueClass = compact
    ? 'mt-1 line-clamp-2 break-keep text-[11px] font-black leading-4 text-slate-950'
    : 'mt-2 line-clamp-3 flex-1 break-keep text-[13px] font-black leading-5 text-slate-950';

  return (
    <div className={boxClass}>
      <p className={labelClass}>{label}</p>
      {children ?? <p className={valueClass}>{value || '정보 없음'}</p>}
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

export function LessonQuadGrid({ cells, compact = false }: { cells: Array<{ label: string; value: string }>; compact?: boolean }) {
  return (
    <div className={`grid grid-cols-2 ${compact ? 'gap-2' : 'gap-3'}`}>
      {cells.map((cell) => (
        <LessonFactCell key={cell.label} label={cell.label} value={cell.value} compact={compact} />
      ))}
    </div>
  );
}

export function LessonMetaGrid({ cells }: { cells: Array<{ label: string; value: string }> }) {
  return (
    <div className="grid grid-cols-2 gap-2 min-[400px]:grid-cols-3">
      {cells.map((cell) => (
        <LessonFactCell key={cell.label} label={cell.label} value={cell.value} compact />
      ))}
    </div>
  );
}

export function LessonPairGrid({
  left,
  right,
  compact = false,
}: {
  left: { label: string; content: ReactNode };
  right: { label: string; content: ReactNode };
  compact?: boolean;
}) {
  return (
    <div className={`grid grid-cols-2 ${compact ? 'gap-2' : 'gap-3'}`}>
      <LessonFactCell label={left.label} compact={compact}>{left.content}</LessonFactCell>
      <LessonFactCell label={right.label} compact={compact}>{right.content}</LessonFactCell>
    </div>
  );
}

export function LessonBulletList({ items, compact = false }: { items: string[]; compact?: boolean }) {
  if (items.length === 0) {
    return <p className={`${compact ? 'mt-1' : 'mt-2'} flex-1 text-[13px] font-semibold leading-5 text-slate-400`}>등록된 항목이 없습니다.</p>;
  }
  return (
    <ul className={`${compact ? 'mt-1 space-y-1' : 'mt-2 space-y-2'} flex-1`}>
      {items.map((item) => (
        <li key={item} className={`flex items-start gap-2 ${compact ? 'text-[12px] leading-5' : 'text-[13px] leading-5'} font-bold text-slate-700`}>
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--spm-grn)]" />
          <span className="min-w-0">{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function LessonScriptText({ text }: { text: string }) {
  if (!text) {
    return <p className="mt-2 flex-1 text-[13px] font-semibold leading-6 text-slate-400">등록된 설명이 없습니다.</p>;
  }
  return <p className="mt-2 flex-1 whitespace-pre-line text-[13px] font-semibold leading-6 text-slate-700">{text}</p>;
}

const NUMBERED_VARIATION_TITLE = /^(\d+\.)\s*(.+)$/;

export function LessonVariationText({ text }: { text: string }) {
  if (!text) {
    return <p className="mt-2 text-[13px] font-semibold leading-8 tracking-[0.03em] text-slate-400">등록된 변형 방법이 없습니다.</p>;
  }

  const lines = text.split('\n');

  return (
    <div className="mt-2 space-y-1.5 tracking-[0.03em]">
      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return null;

        const match = trimmed.match(NUMBERED_VARIATION_TITLE);
        if (match) {
          return (
            <p key={`${index}-${trimmed}`} className="text-[13px] font-semibold leading-[1.95] text-slate-700">
              <span>{match[1]} </span>
              <span className="text-[15.5px] font-black">{match[2]}</span>
            </p>
          );
        }

        return (
          <p key={`${index}-${trimmed}`} className="text-[13px] font-semibold leading-[1.95] text-slate-700">
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}

export function LessonCoachScript({ text, prominent = false }: { text: string; prominent?: boolean }) {
  if (!text) {
    return <p className="mt-2 text-[13px] font-semibold leading-6 text-slate-400">등록된 스크립트가 없습니다.</p>;
  }
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  const openQuoteClass = prominent ? 'text-4xl' : 'text-lg';
  const closeQuoteClass = prominent ? 'text-2xl' : 'text-[color-mix(in_srgb,var(--spm-acc)_55%,white)]';

  return (
    <div className="mt-2 space-y-2">
      {lines.map((line, index) => {
        const body = line.replace(/^["“”'‘’「『]+|["“”'‘’」』]+$/g, '').trim();
        return (
          <blockquote
            key={`${line}-${index}`}
            className="relative rounded-[10px] border border-[color-mix(in_srgb,var(--spm-acc)_22%,transparent)] bg-[var(--spm-acc-glow)] px-3 py-2.5 pl-4"
          >
            <span aria-hidden className={`absolute left-1.5 top-0.5 font-black leading-none text-[color-mix(in_srgb,var(--spm-acc)_55%,white)] ${openQuoteClass}`}>
              "
            </span>
            <p className={`pl-3 font-semibold italic leading-6 tracking-[0.01em] text-slate-700 ${prominent ? 'text-[14px]' : 'text-[13px]'}`}>
              {body}
              <span className={`font-black text-[color-mix(in_srgb,var(--spm-acc)_55%,white)] ${closeQuoteClass}`}>"</span>
            </p>
          </blockquote>
        );
      })}
    </div>
  );
}

export function LessonEquipmentChecklist({ items, compact = false }: { items: string[]; compact?: boolean }) {
  if (items.length === 0) {
    return <p className={`${compact ? 'text-[11px]' : 'text-[13px]'} font-semibold text-slate-400`}>준비물 없음</p>;
  }

  return (
    <div className={`flex flex-wrap ${compact ? 'gap-1.5' : 'gap-2'}`}>
      {items.map((item) => (
        <span
          key={item}
          className={`inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 font-bold text-emerald-800 ${
            compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]'
          }`}
        >
          <Check className={compact ? 'h-3 w-3 shrink-0' : 'h-3.5 w-3.5 shrink-0'} strokeWidth={3} />
          <span className="min-w-0">{item}</span>
        </span>
      ))}
    </div>
  );
}

export function LessonChecklistCard({
  label,
  accent = 'slate',
  children,
}: {
  label: string;
  accent?: 'emerald' | 'indigo' | 'slate';
  children: ReactNode;
}) {
  const accentClass =
    accent === 'emerald'
      ? 'text-[var(--spm-grn)]'
      : accent === 'indigo'
        ? 'text-[var(--spm-acc)]'
        : 'text-slate-600';

  return (
    <div className="rounded-[12px] border border-slate-200 bg-slate-50 p-3">
      <p className={`text-[10px] font-black uppercase tracking-[0.1em] ${accentClass}`}>{label}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

export function LessonFullSection({
  title,
  children,
  className = '',
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-[14px] border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.04)] ${className}`}>
      <h3 className="flex items-center gap-2 text-sm font-black text-slate-950">
        <BookOpen className="h-4 w-4 text-[var(--spm-acc)]" />
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function LessonNumberedList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <p className="text-[13px] font-semibold text-slate-400">등록된 단계가 없습니다.</p>;
  }
  return (
    <ol className="space-y-2">
      {items.map((step, index) => (
        <li key={`${step}-${index}`} className="grid grid-cols-[28px_1fr] gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-700">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-xs font-black text-[var(--spm-acc)] ring-1 ring-slate-200">
            {index + 1}
          </span>
          <span className="min-w-0 font-semibold">{step}</span>
        </li>
      ))}
    </ol>
  );
}
