'use client';

export type PlayMode = 'full' | 'play' | 'think' | 'flow';

export interface PhaseControlsProps {
  onStart: (mode: PlayMode) => void;
  disabled?: boolean;
}

const MAIN_PHASE = {
  mode: 'full' as const,
  label: '전체 재생',
  sub: '띵크 → 챌린지 → 플로우',
};

const SUB_PHASES = [
  { mode: 'think' as const, label: '띵크', sub: '인지', accent: 'violet' },
  { mode: 'play' as const, label: '챌린지', sub: '리듬', accent: 'cyan' },
  { mode: 'flow' as const, label: '플로우', sub: '몰입', accent: 'blue' },
] as const;

export function PhaseControls({ onStart, disabled }: PhaseControlsProps) {
  return (
    <div className="space-y-4">
      {/* 메인 CTA - Nike/Peloton 스타일 */}
      <button
        type="button"
        onClick={() => onStart('full')}
        disabled={disabled}
        className="flex w-full min-h-[56px] flex-col items-center justify-center gap-0.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-4 text-white shadow-lg shadow-cyan-500/25 transition-all duration-150 hover:from-cyan-400 hover:to-blue-500 hover:shadow-cyan-500/30 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
        aria-label="전체 웜업 시작"
      >
        <span className="text-lg font-bold md:text-xl">{MAIN_PHASE.label}</span>
        <span className="text-xs opacity-90">{MAIN_PHASE.sub}</span>
      </button>

      {/* 보조: 개별 실행 칩 */}
      <div className="flex flex-col gap-2">
        <p className="text-xs text-neutral-500">또는 개별 실행</p>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {SUB_PHASES.map(({ mode, label, sub }) => (
            <button
              key={mode}
              type="button"
              onClick={() => onStart(mode)}
              disabled={disabled}
              className="flex min-h-[44px] flex-col items-center justify-center rounded-xl border border-neutral-700 bg-neutral-800/80 px-3 py-2.5 text-neutral-200 transition-all duration-150 hover:border-cyan-500/40 hover:bg-neutral-700/80 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
              aria-label={`${label}만 실행`}
            >
              <span className="text-sm font-semibold">{label}</span>
              <span className="text-[10px] opacity-80">{sub}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
