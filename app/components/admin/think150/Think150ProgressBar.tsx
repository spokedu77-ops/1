'use client';

const SEGMENTS = [
  { phase: 'intro', label: 'Intro', start: 0, end: 6 },
  { phase: 'ready', label: 'Ready', start: 6, end: 10 },
  { phase: 'stageA', label: 'A', start: 10, end: 34 },
  { phase: 'rest1', label: 'R1', start: 34, end: 40 },
  { phase: 'stageB', label: 'B', start: 40, end: 70 },
  { phase: 'rest2', label: 'R2', start: 70, end: 76 },
  { phase: 'stageC', label: 'C', start: 76, end: 136 },
  { phase: 'rest3', label: 'R3', start: 136, end: 142 },
  { phase: 'outro', label: 'Outro', start: 142, end: 150 },
];

interface Think150ProgressBarProps {
  currentMs: number;
  totalMs?: number;
}

export function Think150ProgressBar({ currentMs, totalMs = 150000 }: Think150ProgressBarProps) {
  const progress = Math.min(1, currentMs / totalMs);
  const currentSec = currentMs / 1000;

  return (
    <div className="w-full space-y-1">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
        <div
          className="h-full bg-blue-500 transition-all duration-100"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-neutral-500">
        {SEGMENTS.map((s) => (
          <span
            key={s.phase}
            className={currentSec >= s.start && currentSec < s.end ? 'font-bold text-blue-400' : ''}
          >
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
