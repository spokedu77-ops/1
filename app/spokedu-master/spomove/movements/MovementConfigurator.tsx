'use client';

import { getMovementPresentation, groupMovementPresentations } from './movementPresentation';
import { MovementInstructionPanel } from './MovementInstructionPanel';
import { MovementOptionButton } from './MovementOptionButton';
import { SpomatMovementDiagram } from './SpomatMovementDiagram';
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
};

/**
 * Controlled only — Resolver / storage / URL / usage 는 부모(session) 책임.
 * profile·family props는 계약·접근성 맥락용이며 내부에서 추론하지 않는다.
 */
export function MovementConfigurator({
  profile,
  family,
  value,
  officialRecommended,
  allowedPicks,
  onChange,
}: MovementConfiguratorProps) {
  const groups = groupMovementPresentations(allowedPicks);

  return (
    <div
      className="space-y-4"
      data-spm-movement-configurator="1"
      data-spm-profile={profile.id}
      data-spm-family={family.id}
    >
      <section className="rounded-[22px] border border-white/10 bg-black/25 p-4 sm:p-5">
        <p className="text-[12px] font-black tracking-[0.08em] text-white/55">오늘의 매트</p>
        <p className="mt-1 text-[15px] font-black text-white">매트 1장 · 화면 앞 정방향</p>
        <div className="mt-3">
          <SpomatMovementDiagram limbRule="free" />
        </div>
      </section>

      <section className="rounded-[22px] border border-white/10 bg-black/25 p-4 sm:p-5">
        <p className="text-[12px] font-black tracking-[0.08em] text-white/55">오늘의 움직임</p>
        <p className="mt-1 text-[13px] font-semibold text-white/50">
          허용된 동작만 표시됩니다. 같은 화면을 다른 몸으로 사용하세요.
        </p>
        <div className="mt-4 space-y-4">
          {groups.map(({ group, groupLabel, items }) => (
            <div key={group}>
              <p className="text-[11px] font-black text-white/45">{groupLabel}</p>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {items.map((presentation) => {
                  const selected = movementPicksEqual(presentation.pick, value);
                  const isOfficial = movementPicksEqual(presentation.pick, officialRecommended);
                  return (
                    <MovementOptionButton
                      key={`${presentation.pick.baseMovement}:${presentation.pick.limbRule}`}
                      presentation={presentation}
                      selected={selected}
                      isOfficialRecommended={isOfficial}
                      onSelect={() => onChange(presentation.pick)}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <MovementInstructionPanel value={value} officialRecommended={officialRecommended} />
    </div>
  );
}

/** fixed — 선택기 없이 고정 동작 요약 */
export function FixedMovementSummary({
  value,
  officialRecommended,
}: {
  value: MovementPick;
  officialRecommended: MovementPick;
}) {
  const presentation = getMovementPresentation(value);
  const fixedTitle =
    value.baseMovement === 'footTap' ? '발 터치' : presentation.label;
  return (
    <div className="space-y-4">
      <section className="rounded-[22px] border border-white/10 bg-black/25 p-4 sm:p-5">
        <p className="text-[12px] font-black tracking-[0.08em] text-white/55">오늘의 움직임</p>
        <h3 className="mt-2 text-[20px] font-black text-white">
          {fixedTitle}
          <span className="mt-1 block text-[14px] font-bold text-white/55">화면 지정 방식</span>
        </h3>
        <p className="mt-3 text-[14px] font-semibold leading-6 text-white/75">
          이 활동은 화면에 표시된 발로 색 위치를 터치합니다. 동작은 고정되어 선택할 수 없습니다.
        </p>
      </section>
      <MovementInstructionPanel value={value} officialRecommended={officialRecommended} />
    </div>
  );
}

/** disabled — bodyCueBuiltIn 안내. diveBuiltIn은 null (기존 DIVE 설명만) */
export function BuiltInMovementNotice({ profile }: { profile: MovementProfile }) {
  if (profile.id === 'diveBuiltIn') return null;
  if (profile.id !== 'bodyCueBuiltIn') return null;

  return (
    <section className="rounded-[22px] border border-white/10 bg-black/25 p-4 sm:p-5">
      <p className="text-[12px] font-black tracking-[0.08em] text-white/55">신체 안내</p>
      <h3 className="mt-2 text-[18px] font-black text-white">화면이 손·발을 직접 지정합니다</h3>
      <p className="mt-2 text-[14px] font-semibold leading-6 text-white/75">
        이 활동은 화면이 손과 발을 직접 지정합니다. 화면 지시에 따라 수행하세요. 일반 스포매트 움직임
        선택기는 사용하지 않습니다.
      </p>
    </section>
  );
}
