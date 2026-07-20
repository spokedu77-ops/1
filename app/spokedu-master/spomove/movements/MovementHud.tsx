'use client';

import type { ResolvedMovementConfiguration } from './movementTypes';

type Props = {
  movement: ResolvedMovementConfiguration;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  compact?: boolean;
};

export function MovementHud({ movement, collapsed, onToggleCollapsed, compact }: Props) {
  return (
    <div
      className={`pointer-events-auto absolute z-30 ${
        compact ? 'bottom-3 left-3 right-3 sm:right-auto sm:max-w-[280px]' : 'bottom-5 left-5 max-w-[320px]'
      }`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="rounded-2xl border border-white/15 bg-black/55 text-white shadow-lg backdrop-blur-md">
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left"
          aria-expanded={!collapsed}
        >
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/45">오늘의 동작</p>
            <p className="mt-0.5 truncate text-[14px] font-black">{movement.displayLabel}</p>
          </div>
          <span className="shrink-0 text-[11px] font-bold text-white/55">{collapsed ? '펼치기' : '접기'}</span>
        </button>
        {!collapsed ? (
          <div className="border-t border-white/10 px-3.5 py-2.5">
            <p className="text-[13px] font-semibold leading-snug text-white/85">{movement.hudLabel}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
