'use client';

import { getMovementPresentation, groupMovementPresentations, compactMovementInstruction } from './movementPresentation';
import { MovementOptionButton } from './MovementOptionButton';
import { movementPicksEqual } from './movementResolve';
import type {
  ActivityFamilyDefinition,
  MovementPick,
  MovementProfile,
} from './movementTypes';

export type MovementConfiguratorProps = {
  profile: MovementProfile;
  family: ActivityFamilyDefinition;
  value: MovementPick;
  officialRecommended: MovementPick;
  allowedPicks: MovementPick[];
  onChange: (pick: MovementPick) => void;
  /** Phase 0: compact = 그룹 버튼 + 한 줄 안내만 */
  variant?: 'full' | 'compact';
  /** 부모 섹션이 이미 제목을 가질 때 내부 chrome 숨김 */
  hideChrome?: boolean;
};

/**
 * Controlled only — Resolver / storage / URL / usage 는 부모(session) 책임.
 */
export function MovementConfigurator({
  profile,
  family,
  value,
  officialRecommended,
  allowedPicks,
  onChange,
  variant = 'compact',
  hideChrome = false,
}: MovementConfiguratorProps) {
  const groups = groupMovementPresentations(allowedPicks);
  const compact = variant === 'compact';

  const body = (
    <>
      <div className="space-y-4">
        {groups.map(({ group, groupLabel, items }) => (
          <div key={group}>
            <p className="text-[11px] font-black text-white/45">{groupLabel}</p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {items.map((presentation) => {
                const isSelected = movementPicksEqual(presentation.pick, value);
                const isOfficial = movementPicksEqual(presentation.pick, officialRecommended);
                return (
                  <MovementOptionButton
                    key={`${presentation.pick.baseMovement}:${presentation.pick.limbRule}`}
                    presentation={presentation}
                    selected={isSelected}
                    isOfficialRecommended={isOfficial}
                    onSelect={() => onChange(presentation.pick)}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {compact && !hideChrome ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
          <p className="text-[11px] font-black text-white/45">선택 안내</p>
          <p className="mt-1 line-clamp-2 text-[13px] font-semibold leading-5 text-white/80">
            {compactMovementInstruction(value)}
          </p>
        </div>
      ) : null}
    </>
  );

  return (
    <div
      className="space-y-3"
      data-spm-movement-configurator="1"
      data-spm-movement-variant={variant}
      data-spm-profile={profile.id}
      data-spm-family={family.id}
    >
      {hideChrome ? (
        body
      ) : (
        <section className="rounded-[22px] border border-white/10 bg-black/25 p-4 sm:p-5">
          <p className="text-[12px] font-black tracking-[0.08em] text-white/55">움직임</p>
          <div className="mt-3">{body}</div>
        </section>
      )}
    </div>
  );
}

/** fixed — 선택기 없이 고정 동작 요약 */
export function FixedMovementSummary({
  value,
  variant = 'compact',
}: {
  value: MovementPick;
  officialRecommended?: MovementPick;
  variant?: 'full' | 'compact';
}) {
  void variant;
  const presentation = getMovementPresentation(value);
  const fixedTitle = value.baseMovement === 'footTap' ? '발 터치' : presentation.label;
  return (
    <section className="rounded-[22px] border border-white/10 bg-black/25 p-4 sm:p-5">
      <p className="text-[12px] font-black tracking-[0.08em] text-white/55">움직임</p>
      <h3 className="mt-2 text-[18px] font-black text-white">
        {fixedTitle}
        <span className="mt-1 block text-[13px] font-bold text-white/55">화면 지정 방식</span>
      </h3>
      <p className="mt-2 line-clamp-2 text-[13px] font-semibold leading-5 text-white/70">
        이 활동은 동작이 고정되어 있습니다. 화면에 표시된 발로 색 위치를 터치합니다.
      </p>
    </section>
  );
}

/** disabled — bodyCueBuiltIn 안내. diveBuiltIn은 null */
export function BuiltInMovementNotice({ profile }: { profile: MovementProfile }) {
  if (profile.id === 'diveBuiltIn') return null;
  if (profile.id !== 'bodyCueBuiltIn') return null;

  return (
    <section className="rounded-[22px] border border-white/10 bg-black/25 p-4 sm:p-5">
      <p className="text-[12px] font-black tracking-[0.08em] text-white/55">신체 반응</p>
      <h3 className="mt-2 text-[16px] font-black text-white">화면이 사용할 손과 발을 직접 안내합니다</h3>
      <p className="mt-2 line-clamp-2 text-[13px] font-semibold leading-5 text-white/70">
        화면 지시에 따라 수행하세요. 일반 스포매트 움직임 선택기는 사용하지 않습니다.
      </p>
    </section>
  );
}
