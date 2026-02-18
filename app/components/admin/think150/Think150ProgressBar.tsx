'use client';

const SEGMENTS = [
  { phase: 'intro', label: 'Intro', start: 0, end: 5 },
  { phase: 'ready', label: 'Ready', start: 5, end: 10 },
  { phase: 'stageA', label: 'A', start: 10, end: 30 },
  { phase: 'rest1', label: 'R1', start: 30, end: 35 },
  { phase: 'stageB', label: 'B', start: 35, end: 60 },
  { phase: 'rest2', label: 'R2', start: 60, end: 65 },
  { phase: 'stageC', label: 'C', start: 65, end: 100 },
  { phase: 'rest3', label: 'R3', start: 100, end: 105 },
  { phase: 'stageD', label: 'D', start: 105, end: 140 },
  { phase: 'outro', label: 'Outro', start: 140, end: 150 },
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
