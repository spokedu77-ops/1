import { spomatPage } from '../data/spomat-page';

/** SPOMAT 2×2 — 빨강·노랑 / 초록·파랑 (`spomatPage.structure.cells` SSOT) */
export function SpomoveSignalGrid({
  compact = false,
  className = '',
}: {
  compact?: boolean;
  className?: string;
}) {
  const cells = spomatPage.structure.cells;
  return (
    <div
      className={`grid grid-cols-2 gap-3 rounded-2xl bg-slate-900 p-4 ${className}`.trim()}
      aria-hidden
    >
      {cells.map((cell, i) => (
        <div
          key={cell.name}
          style={{ backgroundColor: cell.hex }}
          className={`flex items-center justify-center rounded-xl ${
            compact ? 'aspect-square' : 'aspect-[1.5]'
          } ${i === 0 ? 'shadow-[0_0_24px_rgba(239,68,68,0.45)]' : ''}`}
        >
          <span className={`font-black text-black/70 ${compact ? 'text-xl' : 'text-2xl'}`}>{i + 1}</span>
        </div>
      ))}
    </div>
  );
}
