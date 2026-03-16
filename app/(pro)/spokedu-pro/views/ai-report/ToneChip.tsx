'use client';

import type { Tone } from './types';

export default function ToneChip({
  value,
  current,
  label,
  emoji,
  onClick,
}: {
  value: Tone;
  current: Tone;
  label: string;
  emoji: string;
  onClick: () => void;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all border ${
        active
          ? 'bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-500/20'
          : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-300'
      }`}
    >
      <span className="mr-1">{emoji}</span>
      {label}
    </button>
  );
}
