'use client';

import type { LimbRule } from './movementTypes';
import {
  buildSpomatMovementDiagramModel,
  diagramCellLabel,
  type LimbMarker,
  SPOMAT_DIAGRAM_COLOR_ORDER,
} from './spomatMovementDiagramModel';
import type { SpomatColor } from './movementTypes';

const CELL_BG: Record<SpomatColor, string> = {
  red: 'bg-red-500',
  yellow: 'bg-amber-400',
  green: 'bg-emerald-500',
  blue: 'bg-blue-500',
};

function MarkerBadge({ marker }: { marker: LimbMarker }) {
  return (
    <span className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-md bg-black/45 px-1 text-[10px] font-black text-white">
      {marker}
    </span>
  );
}

export function SpomatMovementDiagram({
  limbRule = 'free',
  variant = 'dark',
  caption = '매트 1장 · 화면 앞 정방향',
}: {
  limbRule?: LimbRule;
  variant?: 'dark' | 'light';
  caption?: string;
}) {
  const model = buildSpomatMovementDiagramModel(limbRule);
  const shell =
    variant === 'light'
      ? 'rounded-2xl border border-slate-200 bg-white p-4'
      : 'rounded-2xl border border-white/10 bg-black/25 p-4';
  const titleClass =
    variant === 'light' ? 'text-[11px] font-black text-slate-500' : 'text-[11px] font-black text-white/45';
  const noteClass =
    variant === 'light'
      ? 'mt-3 text-[12px] font-semibold leading-5 text-slate-600'
      : 'mt-3 text-[12px] font-semibold leading-5 text-white/55';

  return (
    <div className={shell}>
      <p className={titleClass}>화면 방향 ↑ · {caption}</p>
      <div className="mx-auto mt-3 grid max-w-[200px] grid-cols-2 gap-1.5">
        {SPOMAT_DIAGRAM_COLOR_ORDER.flat().map((color) => {
          const marker = model.colors[color];
          return (
            <div
              key={color}
              className={`relative flex aspect-square items-center justify-center rounded-lg text-[11px] font-black text-white ${CELL_BG[color]}`}
            >
              {diagramCellLabel(color)}
              {marker ? <MarkerBadge marker={marker} /> : null}
            </div>
          );
        })}
      </div>
      <p className={noteClass}>
        실물 매트에는 중앙 대기 구역이 없습니다. 색 한 칸은 양발 점프 기본 착지점이 아닙니다.
      </p>
    </div>
  );
}
