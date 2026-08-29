import type { ReactNode } from 'react';

import { SPM_EMPTY_PANEL, SPM_STATE_PANEL } from '../../lib/masterUiClasses';

type MasterStatePanelProps = {
  kind: 'loading' | 'empty' | 'error' | 'attention';
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
};

const TONE = {
  loading: 'border-slate-200 bg-white text-slate-600',
  empty: 'border-slate-200 bg-white text-slate-600',
  error: 'border-rose-200 bg-rose-50 text-rose-800',
  attention: 'border-amber-200 bg-amber-50 text-amber-900',
} as const;

export function MasterStatePanel({ kind, title, description, action, icon, className = '' }: MasterStatePanelProps) {
  const base = kind === 'empty' ? SPM_EMPTY_PANEL : SPM_STATE_PANEL;
  return (
    <section
      role={kind === 'error' ? 'alert' : kind === 'loading' ? 'status' : undefined}
      aria-live={kind === 'error' || kind === 'loading' ? 'polite' : undefined}
      className={`${base} ${TONE[kind]}${className ? ` ${className}` : ''}`}
      data-master-state={kind}
    >
      {icon ? <div className="mx-auto mb-2 flex w-fit text-slate-400">{icon}</div> : null}
      <p className="font-semibold text-current">{title}</p>
      {description ? <p className="mt-1 text-xs font-normal leading-5 opacity-80">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </section>
  );
}
