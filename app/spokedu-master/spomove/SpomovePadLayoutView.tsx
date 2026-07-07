import { SPOMOVE_PAD_GRID_HEX, SPOMOVE_PAD_LAYOUT_LABELS } from './spomovePadDisplay';
import type { SpomovePadLayoutVariant } from './spomovePadLayout';

type SpomovePadLayoutViewProps = {
  variant: SpomovePadLayoutVariant;
  compact?: boolean;
  dark?: boolean;
};

export function SpomovePadLayoutView({ variant, compact = false, dark = false }: SpomovePadLayoutViewProps) {
  const [red, yellow, green, blue] = SPOMOVE_PAD_GRID_HEX;
  const borderClass = dark ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50';
  const titleClass = dark ? 'text-white' : 'text-slate-950';

  if (variant === 'compass') {
    const size = compact ? 'h-20 w-20' : 'h-28 w-28';

    return (
      <div className={`rounded-2xl border p-4 ${borderClass}`}>
        <p className={`text-sm font-black ${titleClass}`}>다이아 패드 배치</p>
        <div className="mt-4 flex justify-center">
          <div
            className={`${size} rotate-45 overflow-hidden rounded-md shadow-sm`}
            aria-label="패드 배치: 상 빨강, 우 노랑, 하 초록, 좌 파랑"
          >
            <div className="grid h-full w-full grid-cols-2 grid-rows-2">
              <div style={{ background: red }} />
              <div style={{ background: yellow }} />
              <div style={{ background: green }} />
              <div style={{ background: blue }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const cellClass = compact ? 'min-h-12 text-xs' : 'min-h-14 text-sm';

  return (
    <div className={`rounded-2xl border p-3 ${borderClass}`}>
      <p className={`text-sm font-black ${titleClass}`}>기본 2×2 패드 배치</p>
      <div className="mt-3 grid grid-cols-2 gap-2" aria-label="패드 배치: 빨강, 노랑, 초록, 파랑">
        {SPOMOVE_PAD_LAYOUT_LABELS.map((label, index) => (
          <div
            key={label}
            className={`flex items-center justify-center rounded-xl font-black text-white shadow-sm ${cellClass}`}
            style={{ background: SPOMOVE_PAD_GRID_HEX[index] }}
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
