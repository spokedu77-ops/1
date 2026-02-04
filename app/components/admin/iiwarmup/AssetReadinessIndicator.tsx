'use client';

import type { ActionKey } from '@/app/lib/admin/constants/physics';

export interface AssetReadinessIndicatorProps {
  actions: ActionKey[];
  variants: readonly string[];
  assetsActions: Record<string, Record<string, unknown>>;
}

/**
 * 선택된 동작별·variant별 에셋 준비도 표시
 * off/on 각각 off1,off2 / on1,on2 URL 존재 여부로 판단
 */
export function AssetReadinessIndicator({
  actions,
  variants,
  assetsActions,
}: AssetReadinessIndicatorProps) {
  const isReady = (action: ActionKey, variant: string): boolean => {
    const map = assetsActions[action];
    if (!map || typeof map !== 'object') return false;
    if (variant === 'off') return !!(map.off1 || map.off2);
    if (variant === 'on') return !!(map.on1 || map.on2);
    return !!map[variant];
  };

  return (
    <div className="text-sm">
      <div className="text-xs font-semibold text-slate-400 mb-1">에셋 준비도</div>
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <div
            key={action}
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-700 text-slate-300"
          >
            <span className="font-medium text-white">{action}</span>
            {variants.map((v) => (
              <span
                key={v}
                className={`text-xs ${isReady(action, v) ? 'text-emerald-400' : 'text-amber-400'}`}
                title={isReady(action, v) ? `${v} 준비됨` : `${v} 없음`}
              >
                {v}: {isReady(action, v) ? '✓' : '–'}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
