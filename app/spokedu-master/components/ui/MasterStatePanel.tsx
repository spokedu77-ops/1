import type { ReactNode } from 'react';

type MasterStatePanelProps = {
  kind: 'loading' | 'empty' | 'error' | 'attention';
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
};

const TONE = {
  loading: 'text-slate-600',
  empty: 'text-slate-600',
  error: 'rounded-xl bg-rose-50 px-4 text-rose-800',
  attention: 'rounded-xl bg-amber-50 px-4 text-amber-900',
} as const;

export function MasterStatePanel({ kind, title, description, action, icon, className = '' }: MasterStatePanelProps) {
  return (
    <section
      role={kind === 'error' ? 'alert' : kind === 'loading' ? 'status' : undefined}
      aria-live={kind === 'error' || kind === 'loading' ? 'polite' : undefined}
      className={`py-4 text-sm leading-6 ${TONE[kind]}${className ? ` ${className}` : ''}`}
      data-master-state={kind}
    >
      {icon ? <div className="mb-2 flex w-fit text-slate-400">{icon}</div> : null}
      <p className="font-semibold text-current">{title}</p>
      {description ? <p className="mt-1 text-xs font-normal leading-5 opacity-80">{description}</p> : null}
      {action ? <div className="mt-3 flex">{action}</div> : null}
    </section>
  );
}

/** Foundation v3 semantic export; retained panel name keeps existing callers stable. */
export const MasterState = MasterStatePanel;
