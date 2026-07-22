'use client';

import type { OperationProfile } from './operationTypes';
import type {
  ActivityOperationConfig,
  ActivityTimingPattern,
  ParticipationFormat,
  ParticipantScale,
  StartZone,
} from './operationTypes';

const START_LABEL: Record<StartZone, string> = {
  onMat: '매트 위',
  adjacentToMat: '매트 바로 밖',
  externalSpot: '외부 스팟',
};

const SCALE_LABEL: Record<ParticipantScale, string> = {
  individual: '개인',
  pair: '짝',
  smallGroup: '소집단',
  team: '팀',
};

const FORMAT_LABEL: Record<ParticipationFormat, string> = {
  independent: '독립',
  synchronized: '동시',
  alternating: '교대',
  cooperative: '협동',
  competitive: '대결',
};

const TIMING_LABEL: Record<ActivityTimingPattern, string> = {
  continuous: '연속 반응',
  responseWindow: '충분 반응',
  interval: '인터벌',
  shuttle: '왕복',
  sequence: '순차',
  builtIn: '내장',
};

export function operationSummaryLine(operation: ActivityOperationConfig): string {
  const parts = [
    START_LABEL[operation.startZone],
    SCALE_LABEL[operation.participantScale],
    TIMING_LABEL[operation.timing.pattern],
  ];
  if (operation.equipment.mode !== 'none') {
    parts.splice(2, 0, '교구');
  }
  if (operation.participationFormat !== 'independent') {
    parts.push(FORMAT_LABEL[operation.participationFormat]);
  }
  return parts.join(' · ');
}

type Props = {
  profile: OperationProfile;
  value: ActivityOperationConfig;
  onChange: (next: ActivityOperationConfig) => void;
  /** Engine capability — hide unsupported timing patterns */
  allowedTimingPatterns?: ActivityTimingPattern[];
};

/**
 * Session settings: Engine에 실제로 연결되는 timing만 노출.
 * continuous / interval — responseWindow는 권장 cue로 흡수 (사용자 선택지 제외).
 * 인원·참여·출발·교구는 Class Set으로 제공 (일반 설정 비노출).
 */
export function SessionTimingConfigurator({
  profile,
  value,
  onChange,
  allowedTimingPatterns,
}: Props) {
  if (profile.exposure === 'legacyDisabled') return null;

  const timingOptions = profile.allowed.timingPatterns.filter((pattern) => {
    if (pattern !== 'continuous' && pattern !== 'interval') return false;
    if (allowedTimingPatterns && !allowedTimingPatterns.includes(pattern)) return false;
    return true;
  });

  if (timingOptions.length < 2) return null;

  const selected =
    value.timing.pattern === 'interval'
      ? 'interval'
      : timingOptions.includes('continuous')
        ? 'continuous'
        : timingOptions[0]!;

  return (
    <div className="rounded-[22px] border border-white/10 bg-black/25 p-4 sm:p-5" data-spm-session-timing="">
      <p className="text-[12px] font-black tracking-[0.08em] text-white/55">진행 방식</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {timingOptions.map((pattern) => {
          const active = selected === pattern;
          return (
            <button
              key={pattern}
              type="button"
              onClick={() => {
                if (pattern === 'interval') {
                  onChange({
                    ...value,
                    timing: { pattern: 'interval', workSeconds: 20, restSeconds: 10, sets: 3 },
                  });
                } else {
                  onChange({ ...value, timing: { pattern: 'continuous' } });
                }
              }}
              className={`rounded-xl px-3.5 py-2.5 text-[13px] font-black transition ${
                active
                  ? 'bg-[var(--spm-acc)] text-white'
                  : 'border border-white/15 bg-black/30 text-white/80 hover:border-white/35'
              }`}
            >
              {TIMING_LABEL[pattern]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Session Settings 진입점 — 전체 5축 UI가 아님 */
export function OperationConfigurator(props: Props) {
  return <SessionTimingConfigurator {...props} />;
}
