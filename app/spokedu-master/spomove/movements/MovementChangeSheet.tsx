'use client';

import { X } from 'lucide-react';

import { MOVEMENT_REGISTRY } from './movementRegistry';
import { movementDisplayLabel } from './movementLabels';
import type { ActivityFamilyDefinition, MovementPick, MovementProfile } from './movementTypes';
import { listAllowedMovementPicks } from './movementResolve';

type Props = {
  open: boolean;
  profile: MovementProfile;
  family?: ActivityFamilyDefinition | null;
  selected: MovementPick;
  onSelect: (pick: MovementPick) => void;
  onClose: () => void;
  onConfirmStart?: (pick: MovementPick) => void;
};

export function MovementChangeSheet({
  open,
  profile,
  family,
  selected,
  onSelect,
  onClose,
  onConfirmStart,
}: Props) {
  if (!open) return null;

  const picks = listAllowedMovementPicks(profile, family);

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 p-3 sm:items-center">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="닫기" onClick={onClose} />
      <div className="relative z-[1] max-h-[80vh] w-full max-w-md overflow-auto rounded-3xl bg-white p-4 shadow-2xl">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[17px] font-black text-slate-950">동작 바꾸기</h3>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-600"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1 text-[12px] font-medium text-slate-500">이 활동에 허용된 동작만 표시됩니다.</p>
        <ul className="mt-4 space-y-2">
          {picks.map((pick) => {
            const active = pick.baseMovement === selected.baseMovement && pick.limbRule === selected.limbRule;
            const def = MOVEMENT_REGISTRY[pick.baseMovement];
            return (
              <li key={`${pick.baseMovement}:${pick.limbRule}`}>
                <button
                  type="button"
                  onClick={() => onSelect(pick)}
                  className={`w-full rounded-2xl border px-3.5 py-3 text-left transition ${
                    active
                      ? 'border-[var(--spm-acc)] bg-[var(--spm-acc)]/8'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <p className="text-[14px] font-black text-slate-950">{movementDisplayLabel(pick)}</p>
                  <p className="mt-1 text-[11px] font-semibold text-slate-500">
                    {def.impactLevel === 'low' ? '낮은 강도' : def.impactLevel === 'medium' ? '중간 강도' : '높은 강도'}
                    {' · '}
                    {def.jumpFree ? '점프 없음' : '점프 포함'}
                    {' · '}
                    {def.defaultStartPosition === 'behindMat' ? '매트 밖 시작' : '매트 위 시작'}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
        {onConfirmStart ? (
          <button
            type="button"
            onClick={() => onConfirmStart(selected)}
            className="mt-4 flex h-11 w-full items-center justify-center rounded-[10px] bg-[var(--spm-acc)] text-[13px] font-black text-white"
          >
            이 동작으로 시작
          </button>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="mt-4 flex h-11 w-full items-center justify-center rounded-[10px] bg-[var(--spm-acc)] text-[13px] font-black text-white"
          >
            적용
          </button>
        )}
      </div>
    </div>
  );
}
