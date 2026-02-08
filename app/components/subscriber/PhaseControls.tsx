'use client';

export type PlayMode = 'full' | 'play' | 'think' | 'flow';

export interface PhaseControlsProps {
  onStart: (mode: PlayMode) => void;
  disabled?: boolean;
}

const PHASES = [
  {
    mode: 'full' as const,
    label: '전체 재생',
    sub: 'Challenge → Think → Flow',
    className:
      'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-blue-500',
  },
  {
    mode: 'play' as const,
    label: 'Challenge',
    sub: '리듬 워밍업',
    className:
      'bg-neutral-800/80 text-neutral-100 border border-neutral-700 hover:bg-neutral-700/80 hover:border-cyan-500/50',
  },
  {
    mode: 'think' as const,
    label: 'Think',
    sub: '인지하기',
    className:
      'bg-neutral-800/80 text-neutral-100 border border-neutral-700 hover:bg-neutral-700/80 hover:border-violet-500/50',
  },
  {
    mode: 'flow' as const,
    label: 'Flow',
    sub: '몰입하기',
    className:
      'bg-neutral-800/80 text-neutral-100 border border-neutral-700 hover:bg-neutral-700/80 hover:border-blue-500/50',
  },
] as const;

export function PhaseControls({ onStart, disabled }: PhaseControlsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {PHASES.map(({ mode, label, sub, className }) => (
        <button
          key={mode}
          type="button"
          className={`flex flex-col items-start rounded-2xl px-5 py-4 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
          onClick={() => onStart(mode)}
          disabled={disabled}
        >
          <span className="font-bold">{label}</span>
          <span className="mt-0.5 text-xs opacity-80">{sub}</span>
        </button>
      ))}
    </div>
  );
}
