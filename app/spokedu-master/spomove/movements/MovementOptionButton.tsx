'use client';

import type { MovementPresentation } from './movementPresentation';

export function MovementOptionButton({
  presentation,
  selected,
  isOfficialRecommended,
  onSelect,
}: {
  presentation: MovementPresentation;
  selected: boolean;
  isOfficialRecommended: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`relative rounded-xl px-2.5 py-2.5 text-left transition ${
        selected
          ? 'bg-[var(--spm-acc)] text-white shadow-[0_8px_20px_rgba(0,0,0,0.28)]'
          : 'border border-white/15 bg-black/30 text-white/80 hover:border-white/35 hover:text-white'
      }`}
    >
      <span className="block text-[13px] font-black leading-snug">{presentation.shortLabel}</span>
      <span className={`mt-1 block text-[10px] font-bold ${selected ? 'text-white/80' : 'text-white/45'}`}>
        {presentation.impactLabel}
      </span>
      {isOfficialRecommended ? (
        <span
          className={`absolute -top-1.5 right-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-black ${
            selected ? 'bg-white/20 text-white' : 'bg-[var(--spm-acc)] text-white'
          }`}
        >
          추천
        </span>
      ) : null}
    </button>
  );
}
