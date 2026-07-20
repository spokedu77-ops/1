'use client';

import { getMovementPresentation } from './movementPresentation';
import { SpomatMovementDiagram } from './SpomatMovementDiagram';
import type { MovementPick } from './movementTypes';
import { movementPicksEqual } from './movementResolve';

export function MovementInstructionPanel({
  value,
  officialRecommended,
}: {
  value: MovementPick;
  officialRecommended: MovementPick;
}) {
  const presentation = getMovementPresentation(value);
  const isOfficial = movementPicksEqual(value, officialRecommended);
  const showLimbDiagram = value.limbRule === 'sameSide' || value.limbRule === 'oppositeSide';

  return (
    <div className="rounded-[22px] border border-white/10 bg-black/25 p-4 sm:p-5">
      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-white/45">선택 동작 안내</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <h3 className="text-[20px] font-black text-white">{presentation.label}</h3>
        {isOfficial ? (
          <span className="rounded-full bg-[var(--spm-acc)] px-2 py-0.5 text-[10px] font-black text-white">
            공식 추천
          </span>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {[
          presentation.bodyFocusLabel,
          presentation.impactLabel,
          presentation.jumpLabel,
          presentation.startLabel,
          presentation.returnLabel,
        ].map((chip) => (
          <span
            key={chip}
            className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[11px] font-bold text-white/70"
          >
            {chip}
          </span>
        ))}
      </div>
      <div className="mt-4">
        <p className="text-[12px] font-black tracking-[0.08em] text-white/45">수행 방법</p>
        <p className="mt-1.5 text-[14px] font-semibold leading-6 text-white/80">{presentation.instruction}</p>
      </div>
      {presentation.safetyNote ? (
        <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2.5">
          <p className="text-[11px] font-black text-amber-200/90">안전</p>
          <p className="mt-1 text-[13px] font-semibold leading-5 text-amber-50/90">{presentation.safetyNote}</p>
        </div>
      ) : null}
      {showLimbDiagram ? (
        <div className="mt-4">
          <p className="mb-2 text-[12px] font-black tracking-[0.08em] text-white/45">손·발 배치</p>
          <SpomatMovementDiagram limbRule={value.limbRule} caption="같은 색 쪽 손발 규칙" />
        </div>
      ) : null}
    </div>
  );
}
