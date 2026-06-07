import type { ReactNode } from 'react';
import { koreanLineBreak } from '../lib/ui-classes';

export type LandingStepItem = {
  num?: string;
  label: string;
  detail: string;
  duration?: string;
};

const shellTone = {
  violet: 'border-violet-200/60 bg-gradient-to-br from-violet-50/80 via-white to-indigo-50/50',
  sky: 'border-sky-200/60 bg-gradient-to-br from-sky-50/80 via-white to-indigo-50/50',
} as const;

const cardTone = {
  violet: 'border-violet-100',
  sky: 'border-sky-100',
} as const;

const labelTone = {
  violet: 'text-violet-600',
  sky: 'text-sky-600',
} as const;

const durationTone = {
  violet: 'text-violet-700',
  sky: 'text-sky-700',
} as const;

type LandingStepGridProps = {
  steps: readonly LandingStepItem[];
  accent?: keyof typeof shellTone;
  columns?: '2' | '4' | '5';
};

const columnClass = {
  '2': 'sm:grid-cols-2',
  '4': 'sm:grid-cols-2 lg:grid-cols-4',
  '5': 'sm:grid-cols-2 lg:grid-cols-5',
} as const;

export function LandingStepGrid({ steps, accent = 'violet', columns = '4' }: LandingStepGridProps) {
  return (
    <ol className={`grid grid-cols-1 gap-2.5 ${columnClass[columns]}`}>
      {steps.map((step, index) => (
        <li
          key={step.label}
          className={`flex flex-col rounded-xl border bg-white px-3.5 py-3.5 sm:px-4 sm:py-4 ${cardTone[accent]}`}
        >
          <span className={`text-[10px] font-semibold tracking-[0.08em] ${labelTone[accent]}`}>
            {step.num ?? `${index + 1}단계`}
          </span>
          <span className={`mt-1 text-sm font-semibold text-slate-900 ${koreanLineBreak}`}>{step.label}</span>
          <span className={`mt-1.5 text-xs leading-relaxed text-slate-600 ${koreanLineBreak}`}>{step.detail}</span>
          {step.duration ? (
            <span className={`mt-2 text-[11px] font-medium ${durationTone[accent]}`}>{step.duration}</span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

export function LandingStepPanel({
  steps,
  accent = 'violet',
  columns = '4',
  children,
}: LandingStepGridProps & { children?: ReactNode }) {
  return (
    <div
      className={`overflow-hidden rounded-[1.75rem] border px-4 py-6 sm:rounded-[2rem] sm:px-6 sm:py-8 lg:px-8 ${shellTone[accent]}`}
    >
      {children}
      <div className={children ? 'mt-5' : ''}>
        <LandingStepGrid steps={steps} accent={accent} columns={columns} />
      </div>
    </div>
  );
}
