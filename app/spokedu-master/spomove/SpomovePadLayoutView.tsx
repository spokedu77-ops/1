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
    const size = compact ? 'h-32 w-32' : 'h-40 w-40';
    const padClass = compact ? 'h-14 w-14 text-xs' : 'h-16 w-16 text-sm';

    return (
      <div className={`rounded-2xl border p-4 ${borderClass}`}>
        <p className={`text-sm font-black ${titleClass}`}>스포무브 매트 배치 방법</p>
        <p className={`mt-1 text-xs font-semibold ${dark ? 'text-white/55' : 'text-slate-500'}`}>
          다이아몬드: 빨강(위) · 노랑(왼) · 초록(오) · 파랑(아래)
        </p>
        <div className="mt-4 flex justify-center">
          <div
            className={`relative ${size}`}
            aria-label="다이아몬드 패드 배치: 빨강 위, 노랑 왼쪽, 초록 오른쪽, 파랑 아래"
          >
            <div className={`absolute left-1/2 top-0 -translate-x-1/2 rounded-xl font-black text-white shadow-sm ${padClass} grid place-items-center`} style={{ background: red }}>빨</div>
            <div className={`absolute left-0 top-1/2 -translate-y-1/2 rounded-xl font-black text-white shadow-sm ${padClass} grid place-items-center`} style={{ background: yellow }}>노</div>
            <div className={`absolute right-0 top-1/2 -translate-y-1/2 rounded-xl font-black text-white shadow-sm ${padClass} grid place-items-center`} style={{ background: green }}>초</div>
            <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 rounded-xl font-black text-white shadow-sm ${padClass} grid place-items-center`} style={{ background: blue }}>파</div>
          </div>
        </div>
      </div>
    );
  }

  const cellClass = compact ? 'min-h-12 text-xs' : 'min-h-14 text-sm';

  return (
    <div className={`rounded-2xl border p-3 ${borderClass}`}>
      <p className={`text-sm font-black ${titleClass}`}>스포무브 매트 배치 방법</p>
        <p className={`mt-1 text-xs font-semibold ${dark ? 'text-white/55' : 'text-slate-500'}`}>
          정사각형: 빨강 · 노랑 · 초록 · 파랑
      </p>
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
