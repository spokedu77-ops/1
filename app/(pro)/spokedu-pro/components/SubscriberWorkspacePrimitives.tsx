'use client';

import type { ElementType, ReactNode } from 'react';

type TileTone = 'cyan' | 'emerald' | 'violet' | 'slate';

const toneStyles: Record<
  TileTone,
  {
    card: string;
    icon: string;
    title: string;
    meta: string;
    button: string;
    active: string;
  }
> = {
  cyan: {
    card: 'border-cyan-500/25 bg-cyan-950/20',
    icon: 'bg-cyan-300 text-slate-950',
    title: 'text-cyan-100',
    meta: 'text-cyan-300',
    button: 'border border-cyan-400/35 bg-cyan-950/60 text-cyan-50 hover:bg-cyan-900/70',
    active: 'border-cyan-300/80 bg-cyan-300/12 text-white shadow-[0_16px_36px_-28px_rgba(34,211,238,0.85)]',
  },
  emerald: {
    card: 'border-emerald-500/20 bg-emerald-950/20',
    icon: 'bg-emerald-300 text-slate-950',
    title: 'text-emerald-100',
    meta: 'text-emerald-300',
    button: 'bg-emerald-600 text-white hover:bg-emerald-500',
    active: 'border-emerald-300/80 bg-emerald-300/12 text-white',
  },
  violet: {
    card: 'border-violet-500/25 bg-violet-950/20',
    icon: 'bg-violet-300 text-slate-950',
    title: 'text-violet-100',
    meta: 'text-violet-300',
    button: 'bg-violet-600 text-white hover:bg-violet-500',
    active: 'border-violet-300/80 bg-violet-300/12 text-white',
  },
  slate: {
    card: 'border-slate-700/70 bg-slate-900/72',
    icon: 'bg-slate-800 text-slate-100',
    title: 'text-slate-100',
    meta: 'text-slate-300',
    button: 'border border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700',
    active: 'border-slate-300/70 bg-slate-300/10 text-white',
  },
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function SubscriberButton({
  tone = 'emerald',
  size = 'default',
  wide = false,
  disabled = false,
  className,
  icon,
  children,
  onClick,
}: {
  tone?: TileTone | 'amber' | 'blue' | 'purple' | 'sky' | 'red';
  size?: 'sm' | 'default';
  wide?: boolean;
  disabled?: boolean;
  className?: string;
  icon?: ReactNode;
  children: ReactNode;
  onClick: () => void;
}) {
  const toneClass: Record<string, string> = {
    cyan: 'border border-cyan-400/35 bg-cyan-950/60 text-cyan-50 hover:bg-cyan-900/70',
    emerald: 'bg-emerald-600 text-white hover:bg-emerald-500',
    violet: 'bg-violet-600 text-white hover:bg-violet-500',
    slate: 'border border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700',
    amber: 'bg-amber-500 text-slate-950 hover:bg-amber-400',
    blue: 'bg-blue-600 text-white hover:bg-blue-500',
    purple: 'bg-purple-600 text-white hover:bg-purple-500',
    sky: 'bg-sky-600 text-white hover:bg-sky-500',
    red: 'bg-red-600 text-white hover:bg-red-500',
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-black transition-colors',
        size === 'sm' ? 'px-3 py-2 text-xs' : 'px-5 py-3 text-sm',
        wide ? 'w-full sm:w-auto' : '',
        toneClass[tone],
        disabled ? 'cursor-not-allowed bg-slate-800 text-slate-500 hover:bg-slate-800' : '',
        className
      )}
    >
      {icon}
      {children}
    </button>
  );
}

export function SubscriberBadge({
  children,
  tone = 'slate',
}: {
  children: ReactNode;
  tone?: TileTone | 'amber' | 'sky';
}) {
  const toneClass: Record<string, string> = {
    cyan: 'border-cyan-400/35 bg-cyan-950/60 text-cyan-100',
    emerald: 'border-emerald-400/35 bg-emerald-950/55 text-emerald-100',
    violet: 'border-violet-400/35 bg-violet-950/55 text-violet-100',
    slate: 'border-slate-500/50 bg-slate-950/80 text-slate-400',
    amber: 'border-amber-400/50 bg-black/50 text-amber-100',
    sky: 'border-sky-500/30 bg-slate-900/80 text-sky-100',
  };

  return (
    <span className={cx('inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black', toneClass[tone])}>
      {children}
    </span>
  );
}

export function SubscriberFilterPill({
  label,
  meta,
  onClick,
}: {
  label: string;
  meta?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[72px] flex-col rounded-xl border border-slate-600/60 bg-slate-900/60 px-3 py-3 text-left text-xs font-bold text-slate-100 transition-colors hover:border-emerald-500/40 hover:bg-slate-800/80 md:text-[13px]"
    >
      <span className="line-clamp-2 pr-1">{label}</span>
      {meta ? <span className="mt-1 text-[10px] font-semibold tabular-nums text-slate-500">{meta}</span> : null}
    </button>
  );
}

export function SubscriberActionTile({
  label,
  caption,
  meta,
  icon: Icon,
  tone = 'cyan',
  active = false,
  compact = false,
  action,
  onClick,
}: {
  label: string;
  caption?: string;
  meta?: string;
  icon?: ElementType;
  tone?: TileTone;
  active?: boolean;
  compact?: boolean;
  action?: string;
  onClick: () => void;
}) {
  const styles = toneStyles[tone];

  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cx(
          'group grid min-h-[72px] w-[148px] shrink-0 grid-cols-[34px_1fr] items-center gap-2 rounded-2xl border px-3 text-left transition',
          active ? styles.active : 'border-slate-700/70 bg-slate-900/72 text-slate-300 hover:border-slate-500 hover:bg-slate-800/80'
        )}
      >
        {Icon ? (
          <span className={cx('grid h-9 w-9 place-items-center rounded-xl', active ? styles.icon : 'bg-slate-800 text-slate-100')}>
            <Icon className="h-4.5 w-4.5" />
          </span>
        ) : null}
        <span className="min-w-0">
          <span className="block truncate text-sm font-black">{label}</span>
          {caption ? <span className="block truncate text-[11px] font-semibold text-slate-400">{caption}</span> : null}
          {meta ? <span className={cx('mt-1 block truncate text-[11px] font-black', styles.meta)}>{meta}</span> : null}
        </span>
      </button>
    );
  }

  return (
    <div className={cx('flex min-h-[168px] flex-col rounded-2xl border p-4 shadow-lg shadow-black/20 md:p-5', styles.card)}>
      <div className="flex items-start gap-3">
        {Icon ? (
          <span className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-xl', styles.icon)}>
            <Icon className="h-4.5 w-4.5" />
          </span>
        ) : null}
        <div className="min-w-0">
          <h3 className={cx('text-base font-black md:text-lg', styles.title)}>{label}</h3>
          {caption ? <p className="mt-1 text-xs font-bold text-slate-500">{caption}</p> : null}
        </div>
      </div>
      {meta ? <p className="mt-3 flex-1 text-xs leading-relaxed text-slate-400 md:text-sm">{meta}</p> : null}
      {action ? (
        <button type="button" onClick={onClick} className={cx('mt-4 w-full rounded-xl py-2.5 text-center text-xs font-black transition md:text-sm', styles.button)}>
          {action}
        </button>
      ) : null}
    </div>
  );
}
